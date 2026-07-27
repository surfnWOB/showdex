import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getTierShiftBoost,
  modifyBaseStatsForFormat,
} from './modifyBaseStatsForFormat';

const baseStats = {
  hp: 70,
  atk: 71,
  def: 50,
  spa: 255,
  spd: 60,
  spe: 69,
} as Showdown.StatsTable;

describe('modifyBaseStatsForFormat()', () => {
  it('applies the Bad n Boosted rule per stat, including the base-70 boundary', () => {
    expect(modifyBaseStatsForFormat(baseStats, 'gen3badnboosted')).toEqual({
      hp: 140,
      atk: 71,
      def: 100,
      spa: 255,
      spd: 120,
      spe: 138,
    });
  });

  it('does not mutate the Dex-owned base-stat table or alter other formats', () => {
    expect(modifyBaseStatsForFormat(baseStats, 'gen3ubers')).toEqual(baseStats);
    expect(baseStats).toEqual({ hp: 70, atk: 71, def: 50, spa: 255, spd: 60, spe: 69 });
  });
});

describe('modifyBaseStatsForFormat() — Gen 3 Tier Shift', () => {
  beforeEach(() => {
    vi.stubGlobal('BattleTeambuilderTable', {
      gen3subzu: {
        overrideTier: {
          sunflora: 'SU',
          parasect: 'SU',
          ditto: 'SU',
          // LC/NFE that are also SU in gen3subzu — boost stays +40 either way,
          // but the SU path must still resolve without throwing.
          clefairy: 'SU',
          aron: 'SU',
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // One species per boost rung — mirrors
  // official/pokemon-showdown/test/sim/othermetas/gen3tiershift.js.
  const cases: Array<{
    id: string;
    tier: string;
    boost: number;
    label: string;
  }> = [
    { id: 'mewtwo', tier: 'Uber', boost: 0, label: 'Uber' },
    { id: 'milotic', tier: 'OU', boost: 0, label: 'OU' },
    { id: 'raikou', tier: 'OU', boost: 0, label: 'OU (post-raise)' },
    { id: 'registeel', tier: 'OU', boost: 0, label: 'OU (post-raise)' },
    { id: 'regice', tier: '(OU)', boost: 5, label: '(OU) by technicality' },
    { id: 'porygon2', tier: '(OU)', boost: 5, label: '(OU) by technicality' },
    { id: 'venusaur', tier: 'UUBL', boost: 5, label: 'UUBL' },
    { id: 'blastoise', tier: 'UU', boost: 10, label: 'UU' },
    { id: 'jumpluff', tier: 'RUBL', boost: 10, label: 'RUBL' },
    { id: 'glalie', tier: 'NUBL', boost: 10, label: 'Glalie override → UU' },
    { id: 'raichu', tier: 'RU', boost: 15, label: 'RU' },
    { id: 'pidgeot', tier: 'NU', boost: 20, label: 'NU' },
    { id: 'machoke', tier: 'PUBL', boost: 20, label: 'PUBL' },
    { id: 'charmeleon', tier: 'PU', boost: 30, label: 'PU' },
    { id: 'yanma', tier: 'ZUBL', boost: 30, label: 'ZUBL' },
    { id: 'ivysaur', tier: 'ZU', boost: 35, label: 'ZU (held out of SU)' },
    { id: 'sunflora', tier: 'ZU', boost: 40, label: 'SU via gen3subzu (not ZU +35)' },
    { id: 'parasect', tier: 'ZU', boost: 40, label: 'SU via gen3subzu' },
    { id: 'ditto', tier: 'ZU', boost: 40, label: 'SU via gen3subzu' },
    { id: 'clefairy', tier: 'NFE', boost: 40, label: 'NFE / SU (+40 either path)' },
    { id: 'bulbasaur', tier: 'LC', boost: 40, label: 'LC' },
  ];

  for (const { id, tier, boost, label } of cases) {
    it(`boosts ${label} ${id} by +${boost} on every stat except HP`, () => {
      expect(getTierShiftBoost('gen3tiershift', { id, tier })).toBe(boost);

      const shifted = modifyBaseStatsForFormat(baseStats, 'gen3tiershift', { id, tier });

      expect(shifted.hp).toBe(baseStats.hp);
      expect(shifted.atk).toBe(Math.min(255, baseStats.atk + boost));
      expect(shifted.def).toBe(Math.min(255, baseStats.def + boost));
      expect(shifted.spa).toBe(Math.min(255, baseStats.spa + boost));
      expect(shifted.spd).toBe(Math.min(255, baseStats.spd + boost));
      expect(shifted.spe).toBe(Math.min(255, baseStats.spe + boost));
    });
  }

  it('does not use the modern Tier Shift ladder for gen3tiershift', () => {
    // Same tier labels, deliberately different boosts. If gen3 fell through to
    // data/rulesets.ts tiershiftmod these would all fail.
    const divergences: Array<{ tier: string; id: string; gen3: number; modern: number }> = [
      { tier: 'UUBL', id: 'venusaur', gen3: 5, modern: 0 }, // modern has no uubl key
      { tier: 'UU', id: 'blastoise', gen3: 10, modern: 15 },
      { tier: 'RU', id: 'raichu', gen3: 15, modern: 20 },
      { tier: 'NU', id: 'pidgeot', gen3: 20, modern: 25 },
      { tier: 'ZU', id: 'ivysaur', gen3: 35, modern: 30 },
      { tier: 'NFE', id: 'clefairy', gen3: 40, modern: 30 },
      { tier: 'LC', id: 'bulbasaur', gen3: 40, modern: 30 },
    ];

    for (const { tier, id, gen3, modern } of divergences) {
      expect(getTierShiftBoost('gen3tiershift', { id, tier }), `${id} gen3`).toBe(gen3);
      expect(getTierShiftBoost('gen9tiershift', { id, tier }), `${id} modern`).toBe(modern);
    }
  });

  it('still selects the Gen 3 ladder when only the format id encodes gen 3', () => {
    // Belt-and-suspenders: format id starts with gen3 → Gen 3 ladder even if a
    // caller somehow bypassed detectGenFromFormat.
    expect(getTierShiftBoost('gen3tiershift', { id: 'blastoise', tier: 'UU' })).toBe(10);
    expect(getTierShiftBoost('gen3tiershift', { id: 'ivysaur', tier: 'ZU' })).toBe(35);
  });

  it('falls back to ZU +35 for SU mons when gen3subzu table is absent', () => {
    vi.stubGlobal('BattleTeambuilderTable', {});
    // Without the SU lookup, Sunflora's standard gen3 tier (ZU) applies.
    expect(getTierShiftBoost('gen3tiershift', { id: 'sunflora', tier: 'ZU' })).toBe(35);
  });

  it('leaves non-Tier-Shift formats untouched even when a species is passed', () => {
    expect(modifyBaseStatsForFormat(baseStats, 'gen3ou', {
      id: 'sunflora',
      tier: 'ZU',
    })).toEqual(baseStats);
  });

  it('does not mutate the input table when applying a boost', () => {
    modifyBaseStatsForFormat(baseStats, 'gen3tiershift', { id: 'raichu', tier: 'RU' });
    expect(baseStats).toEqual({ hp: 70, atk: 71, def: 50, spa: 255, spd: 60, spe: 69 });
  });

  it('returns 0 boost (and unchanged stats) without a species', () => {
    expect(getTierShiftBoost('gen3tiershift')).toBe(0);
    expect(modifyBaseStatsForFormat(baseStats, 'gen3tiershift')).toEqual(baseStats);
  });
});
