import { describe, expect, it } from 'vitest';
import { type CalcdexPokemon } from '@showdex/interfaces/calc';
import { ChampionsLevel, championsCalcMapper } from './championsCalcMapper';

const pokemonWith = (overrides: Partial<CalcdexPokemon>): CalcdexPokemon => ({
  calcdexId: 'test',
  speciesForme: 'Garchomp',
  ...overrides,
} as CalcdexPokemon);

describe('championsCalcMapper()', () => {
  it('locks level to 50 regardless of input level', () => {
    expect(championsCalcMapper(pokemonWith({ level: 100 })).level).toBe(ChampionsLevel);
    expect(championsCalcMapper(pokemonWith({ level: 1 })).level).toBe(ChampionsLevel);
    expect(championsCalcMapper(pokemonWith({})).level).toBe(ChampionsLevel);
  });

  it('returns an empty ivs table regardless of input ivs', () => {
    const result = championsCalcMapper(pokemonWith({
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    }));

    expect(result.ivs).toEqual({});
  });

  it('routes to the gen-0 sentinel', () => {
    expect(championsCalcMapper(pokemonWith({})).gen.num).toBe(0);
  });

  it('passes evs through as the SP carrier', () => {
    const sps = { hp: 32, atk: 32, def: 0, spa: 16, spd: 0, spe: 32 } as Showdown.StatsTable;
    const result = championsCalcMapper(pokemonWith({ evs: sps }));

    expect(result.evs).toEqual(sps);
  });

  it('does not mutate the input evs object', () => {
    const sps = { hp: 32, atk: 32, def: 0, spa: 16, spd: 0, spe: 32 } as Showdown.StatsTable;
    const result = championsCalcMapper(pokemonWith({ evs: sps }));

    expect(result.evs).not.toBe(sps);
  });

  it('tolerates missing evs', () => {
    const result = championsCalcMapper(pokemonWith({ evs: undefined }));

    expect(result.evs).toEqual({});
  });
});
