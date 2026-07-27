import { formatId } from '@showdex/utils/core';
import { detectGenFromFormat } from './detectGenFromFormat';

/**
 * Minimal species fields needed for format-level base-stat mods that depend on
 * tier / identity (Tier Shift). Callers typically pass the Dex species object.
 */
export interface ModifyBaseStatsSpecies {
  id?: string;
  tier?: string;
}

/**
 * Gen 3 Tier Shift boost ladder — NOT the modern/gen8+ table.
 *
 * Must stay in sync with `data/mods/gen3/rulesets.ts` `tiershiftmod` and the
 * client teambuilder's gen-3 branch of `getStatBoost` / `tierShiftBoost`.
 * If gen3 inherited the root `tiershiftmod`, UU would be +15 (not +10), ZU
 * +30 (not +35), and UUBL / SU would be missing entirely.
 */
const Gen3TierShiftBoosts: Record<string, number> = {
  uubl: 5,
  uu: 10,
  rubl: 10,
  ru: 15,
  nubl: 15,
  nu: 20,
  publ: 20,
  pu: 30,
  zubl: 30,
  zu: 35,
  su: 40,
  nfe: 40,
  lc: 40,
};

/**
 * Modern (gen 8+/root) Tier Shift boost ladder. Mirrors `data/rulesets.ts`
 * `tiershiftmod`. Never used for `gen3tiershift`.
 */
const ModernTierShiftBoosts: Record<string, number> = {
  uu: 15,
  rubl: 15,
  ru: 20,
  nubl: 20,
  nu: 25,
  publ: 25,
  pu: 30,
  zubl: 30,
  zu: 30,
  nfe: 30,
  lc: 30,
};

/**
 * Per-species overrides that apply only to Gen 3 Tier Shift's boost ladder
 * (Glalie sits at UU/+10 here, not its standard-gen3 NUBL/+15).
 */
const Gen3TierShiftOverrides: Record<string, string> = {
  glalie: 'uu',
};

/**
 * True for the Gen 3 Tier Shift format (and only that gen's ladder).
 * Prefers an explicit `gen3…tiershift` format id so a missing/wrong gen parse
 * cannot silently fall through to the modern boost table.
 */
const isGen3TierShift = (
  format: string,
): boolean => {
  const formatKey = formatId(format);

  if (!formatKey.includes('tiershift')) {
    return false;
  }

  if (formatKey.startsWith('gen3')) {
    return true;
  }

  return detectGenFromFormat(format) === 3;
};

/**
 * Resolve the Gen 3 Tier Shift boost rung for a species.
 *
 * Evaluation order mirrors the server callback exactly:
 *   1. per-species `tierOverrides` (Glalie → uu)
 *   2. SU from `BattleTeambuilderTable.gen3subzu.overrideTier` (not Dex.mod)
 *   3. raw `"(OU)"` by technicality → uubl
 *   4. `toID(species.tier)` against the Gen 3 ladder
 */
const resolveGen3TierShiftBoost = (
  species: ModifyBaseStatsSpecies,
): number => {
  const speciesId = formatId(species.id || '');

  // 1. per-species overrides
  if (speciesId && speciesId in Gen3TierShiftOverrides) {
    return Gen3TierShiftBoosts[Gen3TierShiftOverrides[speciesId]] || 0;
  }

  // 2. SU via gen3subzu teambuilder table (Dex.mod('gen3subzu') crashes on client)
  const subzuTable = (
    typeof BattleTeambuilderTable !== 'undefined'
    && BattleTeambuilderTable
    && 'gen3subzu' in BattleTeambuilderTable
  )
    ? (BattleTeambuilderTable as Record<string, Showdown.BattleTeambuilderGenTable>).gen3subzu
    : null;

  if (subzuTable?.overrideTier?.[speciesId] === 'SU') {
    return Gen3TierShiftBoosts.su;
  }

  // 3. "(OU)" by technicality — Regice, Porygon2 — before toID (which collapses to "ou")
  if (species.tier === '(OU)') {
    return Gen3TierShiftBoosts.uubl;
  }

  // 4. standard gen3 tier id
  return Gen3TierShiftBoosts[formatId(species.tier || '')] || 0;
};

/**
 * Flat per-tier boost for Tier Shift formats. Returns 0 for OU/Uber and any
 * unrecognized rung. Gen 3 uses its dedicated ladder; every other gen uses the
 * modern root table.
 */
export const getTierShiftBoost = (
  format: string | number,
  species?: ModifyBaseStatsSpecies | null,
): number => {
  if (typeof format !== 'string' || !formatId(format).includes('tiershift') || !species) {
    return 0;
  }

  if (isGen3TierShift(format)) {
    return resolveGen3TierShiftBoost(species);
  }

  return ModernTierShiftBoosts[formatId(species.tier || '')] || 0;
};

/**
 * Applies format-level base-stat changes that are implemented as server rules
 * rather than a client Dex mod.
 *
 * * **Bad 'n Boosted** — doubles each individual base stat at or below 70,
 *   capped at the simulator's 255 base-stat limit (HP included).
 * * **Tier Shift** — adds a rung-specific flat boost to every non-HP stat,
 *   capped at 255. `gen3tiershift` uses the Gen 3 ladder (incl. SU via
 *   gen3subzu table + Glalie / "(OU)" overrides); other gens use the modern
 *   ladder. These are deliberately different — do not share a boost table.
 *
 * Keep these in sync with the side server's `badnboostedmod` /
 * gen3 `tiershiftmod` rules and the client teambuilder's `getShownBaseStat`.
 */
export const modifyBaseStatsForFormat = (
  baseStats: Showdown.StatsTable,
  format?: string | number,
  species?: ModifyBaseStatsSpecies | null,
): Showdown.StatsTable => {
  const output = { ...baseStats };

  if (typeof format !== 'string') {
    return output;
  }

  const formatKey = formatId(format);

  if (formatKey.includes('badnboosted')) {
    (Object.keys(output) as Showdown.StatName[]).forEach((stat) => {
      if (output[stat] <= 70) {
        output[stat] = Math.min(255, output[stat] * 2);
      }
    });

    return output;
  }

  if (formatKey.includes('tiershift')) {
    const boost = getTierShiftBoost(format, species);

    if (!boost) {
      return output;
    }

    (Object.keys(output) as Showdown.StatName[]).forEach((stat) => {
      if (stat === 'hp') {
        return;
      }

      output[stat] = Math.min(255, (output[stat] || 0) + boost);
    });

    return output;
  }

  return output;
};
