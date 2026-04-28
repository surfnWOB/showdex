import { describe, expect, it } from 'vitest';
import {
  ChampionsBundleFormat,
  ChampionsBundleGen,
  type ChampionsSetdex,
  championsPresetConverter,
  parseChampionsOriginTag,
} from './championsPresetConverter';

const bundleOptions = {
  bundleId: 'champions-ou-curated',
  bundleName: 'Champions OU (curated)',
};

const fixture: ChampionsSetdex = {
  // positive nature multiplier (Adamant, +Atk -SpA), full 32-cap sps
  Salamence: {
    'SM OU Dragon Dance': {
      ability: 'Intimidate',
      item: 'Salamencite',
      nature: 'Adamant',
      moves: ['Dragon Dance', 'Return', 'Earthquake', 'Roost'],
      sps: { hp: 32, at: 32, df: 32, sa: 32, sd: 32, sp: 32 },
    },
  },

  // negative nature multiplier (Bold, +Def -Atk), partial sps (hp/df/sd only)
  Venusaur: {
    'SM Ubers Defensive': {
      ability: 'Chlorophyll',
      item: 'Venusaurite',
      nature: 'Bold',
      moves: ['Leech Seed', 'Toxic', 'Synthesis', 'Grass Knot'],
      sps: { hp: 32, df: 23, sd: 10 },
    },
  },

  // neutral nature, Mega-eligible species
  Charizard: {
    'SM OU Drought Wallbreaker Y': {
      ability: 'Solar Power',
      item: 'Charizardite Y',
      nature: 'Hardy',
      moves: ['Fire Blast', 'Solar Beam', 'Focus Blast', 'Roost'],
      sps: { hp: 4, sa: 32, sp: 32 },
    },
    'SV Monotype Choice Scarf (Fire)': {
      ability: 'Blaze',
      item: 'Choice Scarf',
      nature: 'Timid',
      moves: ['Flamethrower', 'Air Slash', 'Focus Blast', 'Roost'],
      sps: { sa: 32, sp: 32 },
    },
  },
};

describe('championsPresetConverter()', () => {
  it('expands short-key sps to full Showdown stat keys', () => {
    const presets = championsPresetConverter(fixture, bundleOptions);
    const salamence = presets.find((p) => p.speciesForme === 'Salamence');

    expect(salamence?.evs).toEqual({
      hp: 32,
      atk: 32,
      def: 32,
      spa: 32,
      spd: 32,
      spe: 32,
    });
  });

  it('preserves the SP cap of 32', () => {
    const presets = championsPresetConverter(fixture, bundleOptions);
    const salamence = presets.find((p) => p.speciesForme === 'Salamence');

    Object.values(salamence?.evs || {}).forEach((value) => {
      expect(value).toBeLessThanOrEqual(32);
      expect(value).toBe(32);
    });
  });

  it('defaults unspecified sps to 0', () => {
    const presets = championsPresetConverter(fixture, bundleOptions);
    const venu = presets.find((p) => p.speciesForme === 'Venusaur');

    expect(venu?.evs).toEqual({
      hp: 32,
      atk: 0,
      def: 23,
      spa: 0,
      spd: 10,
      spe: 0,
    });
  });

  it('keeps the origin format tag in preset.name', () => {
    const presets = championsPresetConverter(fixture, bundleOptions);
    const names = presets.map((p) => p.name);

    expect(names).toContain('SM OU Dragon Dance');
    expect(names).toContain('SV Monotype Choice Scarf (Fire)');
  });

  it('stamps bundle metadata on every output preset', () => {
    const presets = championsPresetConverter(fixture, bundleOptions);

    expect(presets.length).toBeGreaterThan(0);
    presets.forEach((preset) => {
      expect(preset.source).toBe('bundle');
      expect(preset.bundleId).toBe(bundleOptions.bundleId);
      expect(preset.bundleName).toBe(bundleOptions.bundleName);
      expect(preset.gen).toBe(ChampionsBundleGen);
      expect(preset.format).toBe(ChampionsBundleFormat);
    });
  });

  it('preserves the Mega Stone item on a Mega-eligible species', () => {
    const presets = championsPresetConverter(fixture, bundleOptions);
    const charizardY = presets.find(
      (p) => p.speciesForme === 'Charizard' && p.name === 'SM OU Drought Wallbreaker Y',
    );

    expect(charizardY?.item).toBe('Charizardite Y');
    expect(charizardY?.speciesForme).toBe('Charizard');
  });

  it('produces deterministic calcdexIds keyed off preset content', () => {
    const a = championsPresetConverter(fixture, bundleOptions);
    const b = championsPresetConverter(fixture, bundleOptions);

    expect(a.length).toBe(b.length);
    a.forEach((preset, i) => {
      expect(preset.calcdexId).toBe(b[i].calcdexId);
      expect(preset.id).toBe(preset.calcdexId);
    });
  });

  it('returns an empty array on missing inputs', () => {
    expect(championsPresetConverter(null as unknown as ChampionsSetdex, bundleOptions)).toEqual([]);
    expect(championsPresetConverter(fixture, null as never)).toEqual([]);
    expect(championsPresetConverter(fixture, { bundleId: '', bundleName: '' })).toEqual([]);
  });
});

describe('parseChampionsOriginTag()', () => {
  const cases: [input: string, expected: string][] = [
    ['SM OU Dragon Dance', 'SM OU'],
    ['SV Monotype Choice Scarf (Rock)', 'SV Monotype'],
    ['SM 1v1 Prince Charming (Stall)', 'SM 1v1'],
    ['SM Doubles OU Bulky Attacker', 'SM Doubles OU'],
    ['SM Battle Spot Singles Defensive', 'SM Battle Spot Singles'],
    ['SM VGC 2018 Venusaurite', 'SM VGC 2018'],
    ['SV VGC 2025 Showdown Usage', 'SV VGC 2025'],
    ['SV Anything Goes Showdown Usage', 'SV Anything Goes'],
    ['Random nonsense', null],
    ['', null],
    [null as unknown as string, null],
    ['SM Definitely Not A Format', null],
  ];

  it.each(cases)('parses %s as %s', (input, expected) => {
    expect(parseChampionsOriginTag(input)).toBe(expected);
  });
});
