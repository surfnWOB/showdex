import { type Generation, Generations } from '@smogon/calc';
import { type CalcdexPokemon } from '@showdex/interfaces/calc';

/**
 * Champions OU's level is locked at 50 across the format.
 *
 * @since 1.4.0
 */
export const ChampionsLevel = 50;

export interface ChampionsCalcArgs {
  level: number;
  ivs: Showdown.StatsTable;
  evs: Showdown.StatsTable;
  gen: Generation;
}

/**
 * Pure mapper that converts a `CalcdexPokemon` into the args `@smogon/calc` expects in gen 0
 * (the Champions sentinel).
 *
 * * Stat Points (SPs) are passed in via the `evs` slot, since the gen-0 mechanic interprets
 *   the `ev` argument as `sp` (see `@smogon/calc`'s `calcStatChampions`).
 *
 * @since 1.4.0
 */
export const championsCalcMapper = (
  pokemon: CalcdexPokemon,
): ChampionsCalcArgs => ({
  level: ChampionsLevel,
  ivs: {},
  evs: { ...(pokemon?.evs || {}) },
  gen: Generations.get(0),
});
