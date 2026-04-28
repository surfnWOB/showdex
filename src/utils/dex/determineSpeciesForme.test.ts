import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { type ItemName } from '@smogon/calc';
import { type CalcdexPokemon } from '@showdex/interfaces/calc';
import { determineSpeciesForme } from './determineSpeciesForme';

const item = (name: string) => name as ItemName;

type MockItem = { megaStone?: string };
type MockSpecies = { baseSpecies: string };

const itemTable: Record<string, MockItem> = {
  charizarditex: { megaStone: 'Charizard-Mega-X' },
  charizarditey: { megaStone: 'Charizard-Mega-Y' },
  gengarite: { megaStone: 'Gengar-Mega' },
  leftovers: {},
  rustedsword: {},
  choicescarf: {},
};

const speciesTable: Record<string, MockSpecies> = {
  charizard: { baseSpecies: 'Charizard' },
  charizardmegax: { baseSpecies: 'Charizard' },
  charizardmegay: { baseSpecies: 'Charizard' },
  gengar: { baseSpecies: 'Gengar' },
  gengarmega: { baseSpecies: 'Gengar' },
  garchomp: { baseSpecies: 'Garchomp' },
  zacian: { baseSpecies: 'Zacian' },
  ogerpon: { baseSpecies: 'Ogerpon' },
};

const normalize = (key: string) => (key || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

const mockDex = {
  items: { get: (name: string) => itemTable[normalize(name)] },
  species: { get: (name: string) => speciesTable[normalize(name)] },
  mod: (_id: string) => mockDex,
  forGen: (_n: number) => mockDex,
};

const pokemonWith = (overrides: Partial<CalcdexPokemon>): CalcdexPokemon => ({
  calcdexId: 'test',
  speciesForme: 'Charizard',
  ...overrides,
} as CalcdexPokemon);

beforeAll(() => {
  (globalThis as unknown as { Dex: typeof mockDex }).Dex = mockDex;
});

afterAll(() => {
  delete (globalThis as { Dex?: unknown }).Dex;
});

describe('determineSpeciesForme()', () => {
  describe('Champions Mega Stone transitions', () => {
    it('transitions Charizard -> Charizard-Mega-Y when equipping Charizardite Y', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Charizard', dirtyItem: item('Charizardite Y') }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Charizard-Mega-Y');
    });

    it('transitions Charizard -> Charizard-Mega-X when equipping Charizardite X', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Charizard', dirtyItem: item('Charizardite X') }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Charizard-Mega-X');
    });

    it('switches Mega forme when swapping Mega Stones (Mega-Y -> Mega-X)', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Charizard-Mega-Y', dirtyItem: item('Charizardite X') }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Charizard-Mega-X');
    });

    it('is idempotent when current forme already matches the Mega Stone', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Charizard-Mega-Y', dirtyItem: item('Charizardite Y') }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Charizard-Mega-Y');
    });

    it('does not cross base species (Charizardite Y on Gengar is a no-op)', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Gengar', dirtyItem: item('Charizardite Y') }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Gengar');
    });

    it('uses dirtyItem over revealed item', () => {
      const result = determineSpeciesForme(
        pokemonWith({
          speciesForme: 'Charizard',
          item: item('Leftovers'),
          dirtyItem: item('Charizardite Y'),
        }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Charizard-Mega-Y');
    });

    it('falls back to revealed item when dirtyItem is undefined', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Charizard', item: item('Charizardite Y') }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Charizard-Mega-Y');
    });

    it('does not transition when item is non-Mega', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Charizard', dirtyItem: item('Choice Scarf') }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Charizard');
    });
  });

  describe('non-Champions formats (regression guard)', () => {
    it('does not transition Charizard with Charizardite Y in gen9ou', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Charizard', dirtyItem: item('Charizardite Y') }),
        true,
        'gen9ou',
      );

      expect(result).toBe('Charizard');
    });

    it('does not transition when format is omitted', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Charizard', dirtyItem: item('Charizardite Y') }),
        true,
      );

      expect(result).toBe('Charizard');
    });
  });

  describe('existing forme transitions remain intact', () => {
    it('transitions Zacian -> Zacian-Crowned with Rusted Sword (no format)', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Zacian', dirtyItem: item('Rusted Sword') }),
        true,
      );

      expect(result).toBe('Zacian-Crowned');
    });

    it('returns null for null pokemon', () => {
      expect(determineSpeciesForme(null, true, 'gen9champions')).toBeNull();
    });

    it('returns currentForme unchanged for unrelated species without item', () => {
      const result = determineSpeciesForme(
        pokemonWith({ speciesForme: 'Garchomp' }),
        true,
        'gen9champions',
      );

      expect(result).toBe('Garchomp');
    });
  });
});
