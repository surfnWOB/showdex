import { type AbilityName, type ItemName, type MoveName } from '@smogon/calc';
import { type CalcdexPokemonPreset, type CalcdexPokemonPresetSpread } from '@showdex/interfaces/calc';
import { calcPresetCalcdexId } from '@showdex/utils/calc/calcCalcdexId';

/**
 * Bundle ID of the curated Champions OU set dump baked from `SETDEX_CHAMPIONS`.
 *
 * @since 1.4.0
 */
export const ChampionsBundleId = 'champions-ou-curated';

/**
 * Display name of the curated Champions OU bundle.
 *
 * @since 1.4.0
 */
export const ChampionsBundleName = 'Champions OU (curated)';

/**
 * Champions OU genless format string (used as `preset.format` for curated bundle entries).
 *
 * @since 1.4.0
 */
export const ChampionsBundleFormat = 'championsou';

/**
 * Champions formats are evaluated as gen 9 from Showdex's perspective.
 *
 * @since 1.4.0
 */
export const ChampionsBundleGen = 9;

/**
 * Per-stat cap for Stat Points (SPs).
 *
 * @since 1.4.0
 */
export const ChampionsSpCap = 32;

/**
 * Maps the upstream `sps` short keys to Showdown's full `StatName` keys.
 *
 * * `at`, `df`, `sa`, `sd`, `sp` follow the upstream `damage-calc` convention &
 *   are translated to Showdown's `atk`, `def`, `spa`, `spd`, `spe` respectively.
 * * `hp` passes through as-is.
 *
 * @since 1.4.0
 */
export const ChampionsSpsKeyMap: Record<string, Showdown.StatName> = {
  hp: 'hp',
  at: 'atk',
  df: 'def',
  sa: 'spa',
  sd: 'spd',
  sp: 'spe',
};

/**
 * Known Champions origin format tokens, ordered longest-first within each gen prefix so the longest
 * matching token wins (e.g. `"Doubles OU"` is matched before `"OU"`).
 *
 * @since 1.4.0
 */
const ChampionsOriginFormatTokens: string[] = [
  'Anything Goes',
  'Almost Any Ability',
  'Battle Spot Singles',
  'Battle Spot Doubles',
  'BSS Reg M-A',
  'BSS',
  'CAP',
  'Doubles OU',
  'Doubles UU',
  'Monotype',
  'National Dex',
  'NU',
  'OU',
  'PU',
  'RU',
  'Ubers UU',
  'Ubers',
  'UU',
  'VGC 2018',
  'VGC 2019',
  'VGC 2020',
  'VGC 2021',
  'VGC 2022',
  'VGC 2023',
  'VGC 2024',
  'VGC 2025',
  'VGC 2026',
  'ZU',
  '1v1',
];

const ChampionsGenPrefixes: string[] = [
  'GS',
  'RS',
  'DP',
  'HGSS',
  'BW',
  'XY',
  'ORAS',
  'USUM',
  'USM',
  'SM',
  'SS',
  'SV',
];

/**
 * Single Pokemon set as it appears in `SETDEX_CHAMPIONS`.
 *
 * @since 1.4.0
 */
export interface ChampionsSetdexEntry {
  ability?: string;
  item?: string;
  nature?: Showdown.NatureName;
  moves?: string[];
  sps?: Partial<Record<keyof typeof ChampionsSpsKeyMap, number>>;
  teraTypes?: string | string[];
  teratypes?: string | string[];
  level?: number;
}

/**
 * Top-level shape of the upstream `SETDEX_CHAMPIONS` constant.
 *
 * @since 1.4.0
 */
export type ChampionsSetdex = Record<string, Record<string, ChampionsSetdexEntry>>;

/**
 * Configures `championsPresetConverter()`.
 *
 * @since 1.4.0
 */
export interface ChampionsPresetConverterOptions {
  /**
   * Bundle ID stamped onto every output preset.
   *
   * @since 1.4.0
   */
  bundleId: string;

  /**
   * Bundle name stamped onto every output preset.
   *
   * @since 1.4.0
   */
  bundleName: string;
}

/**
 * Parses the leading origin format tag (e.g. `"SM OU"`, `"SV Monotype"`) out of a Champions set name.
 *
 * * Returns the matched tag, or `null` when no known prefix is recognized.
 *
 * @since 1.4.0
 */
export const parseChampionsOriginTag = (
  setName?: string,
): string => {
  if (typeof setName !== 'string' || !setName) {
    return null;
  }

  const trimmed = setName.trim();

  for (const gen of ChampionsGenPrefixes) {
    if (!trimmed.startsWith(`${gen} `)) {
      continue;
    }

    const rest = trimmed.slice(gen.length + 1);

    for (const token of ChampionsOriginFormatTokens) {
      if (rest === token || rest.startsWith(`${token} `)) {
        return `${gen} ${token}`;
      }
    }

    return null;
  }

  return null;
};

const expandSps = (
  sps: ChampionsSetdexEntry['sps'],
): Showdown.StatsTable => {
  const output: Showdown.StatsTable = {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  };

  if (!sps || typeof sps !== 'object') {
    return output;
  }

  for (const [shortKey, value] of Object.entries(sps)) {
    const fullKey = ChampionsSpsKeyMap[shortKey];

    if (!fullKey || typeof value !== 'number' || Number.isNaN(value)) {
      continue;
    }

    output[fullKey] = value;
  }

  return output;
};

const normalizeTeraTypes = (
  entry: ChampionsSetdexEntry,
): string[] => {
  const raw = entry?.teraTypes ?? entry?.teratypes;

  if (!raw) {
    return [];
  }

  return Array.isArray(raw) ? [...raw] : [raw];
};

/**
 * Pure converter that turns an upstream `SETDEX_CHAMPIONS` blob into `CalcdexPokemonPreset[]`.
 *
 * * Short-key `sps` (`at`, `df`, `sa`, `sd`, `sp`) are expanded to full Showdown stat keys & dropped onto the
 *   preset's `evs` slot — the gen-0 sentinel reads `evs` as Stat Points (see `championsCalcMapper()`).
 * * Unspecified SPs default to `0`.
 * * Origin format tags (e.g. `"SM OU"`, `"SV Monotype"`) are preserved as the leading prefix of `preset.name`
 *   so they show up in the dropdown's display label.
 * * Bundle metadata (`source: 'bundle'`, `bundleId`, `bundleName`) is stamped on every output preset.
 *
 * @since 1.4.0
 */
export const championsPresetConverter = (
  setdex: ChampionsSetdex,
  options: ChampionsPresetConverterOptions,
): CalcdexPokemonPreset[] => {
  const { bundleId, bundleName } = options || {};
  const output: CalcdexPokemonPreset[] = [];

  if (!setdex || typeof setdex !== 'object' || !bundleId || !bundleName) {
    return output;
  }

  for (const [speciesForme, setMap] of Object.entries(setdex)) {
    if (!speciesForme || !setMap || typeof setMap !== 'object') {
      continue;
    }

    let formatIndex = 0;

    for (const [setName, entry] of Object.entries(setMap)) {
      if (!setName || !entry || typeof entry !== 'object') {
        continue;
      }

      const evs = expandSps(entry.sps);
      const ivs: Showdown.StatsTable = {
        hp: 0,
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0,
      };

      const moves = (entry.moves || []).filter((m): m is string => typeof m === 'string' && !!m) as MoveName[];
      const teraTypes = normalizeTeraTypes(entry) as Showdown.TypeName[];

      const spread: CalcdexPokemonPresetSpread = {
        nature: entry.nature,
        ivs,
        evs,
      };

      const preset: CalcdexPokemonPreset = {
        calcdexId: null,
        id: null,
        source: 'bundle',
        bundleId,
        bundleName,
        name: setName,
        gen: ChampionsBundleGen,
        format: ChampionsBundleFormat,
        formatIndex: formatIndex++,
        speciesForme,
        level: 50,
        nature: entry.nature,
        ability: entry.ability as AbilityName,
        altAbilities: entry.ability ? [entry.ability as AbilityName] : [],
        item: entry.item as ItemName,
        altItems: entry.item ? [entry.item as ItemName] : [],
        moves,
        altMoves: moves,
        ivs,
        evs,
        spreads: [spread],
        ...(teraTypes.length ? { teraTypes } : {}),
      };

      preset.calcdexId = calcPresetCalcdexId(preset);
      preset.id = preset.calcdexId;

      output.push(preset);
    }
  }

  return output;
};
