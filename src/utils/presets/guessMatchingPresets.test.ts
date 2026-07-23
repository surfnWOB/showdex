import { type AbilityName, type ItemName } from '@smogon/calc';
import { type CalcdexPokemon, type CalcdexPokemonPreset } from '@showdex/interfaces/calc';
import { describe, expect, it, vi } from 'vitest';
import { guessMatchingPresets } from './guessMatchingPresets';

vi.mock('@showdex/utils/debug/logger', () => ({
  logger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
  }),
}));

const randomPreset = (
  calcdexId: string,
  speciesForme: string,
  level: number,
  config?: Partial<CalcdexPokemonPreset>,
): CalcdexPokemonPreset => ({
  calcdexId,
  id: calcdexId,
  source: 'server',
  name: speciesForme,
  gen: 3,
  format: 'gen3megarandombattle',
  speciesForme,
  level,
  ability: 'Pressure',
  item: null,
  moves: [],
  ...config,
} as CalcdexPokemonPreset);

const pokemon = (
  speciesForme: string,
  level: number,
  config?: Partial<CalcdexPokemon>,
): CalcdexPokemon => ({
  calcdexId: `test-${speciesForme}`,
  ident: `p2: ${speciesForme}`,
  speciesForme,
  level,
  revealedMoves: [],
  ...config,
} as CalcdexPokemon);

const format = 'gen3megarandombattle';
const item = (name: string) => name as ItemName;
const ability = (name: string) => name as AbilityName;

describe('guessMatchingPresets() Gen 3 Mega Random Battles', () => {
  const absol = randomPreset('absol-base', 'Absol', 87);
  const absolMega = randomPreset('absol-mega', 'Absol-Mega', 79, {
    item: item('Absolite'),
  });

  it('selects the Mega candidate from its public level before transformation', () => {
    expect(guessMatchingPresets(
      [absol, absolMega],
      pokemon('Absol', 79),
      { format },
    )).toEqual([absolMega]);
  });

  it('preserves all candidates when an adjusted level matches no generated set', () => {
    expect(guessMatchingPresets(
      [absol, absolMega],
      pokemon('Absol', 77),
      { format },
    )).toEqual([absol, absolMega]);
  });

  it('keeps the generated Mega role after the live forme and ability change', () => {
    expect(guessMatchingPresets(
      [absol, absolMega],
      pokemon('Absol-Mega', 79, {
        ability: ability('Magic Bounce'),
        item: item('Absolite'),
      }),
      { format },
    )).toEqual([absolMega]);
  });

  it('keeps same-level X/Y candidates ambiguous until their forme or stone is revealed', () => {
    const charizard = randomPreset('charizard-base', 'Charizard', 82);
    const charizardX = randomPreset('charizard-x', 'Charizard-Mega-X', 73, {
      item: item('Charizardite X'),
    });
    const charizardY = randomPreset('charizard-y', 'Charizard-Mega-Y', 73, {
      item: item('Charizardite Y'),
    });

    expect(guessMatchingPresets(
      [charizard, charizardX, charizardY],
      pokemon('Charizard', 73),
      { format },
    )).toEqual([charizardX, charizardY]);

    expect(guessMatchingPresets(
      [charizard, charizardX, charizardY],
      pokemon('Charizard', 73, { item: item('Charizardite X') }),
      { format },
    )).toEqual([charizardX]);
  });

  it('uses a revealed Primal Orb after adjusted-level fallback', () => {
    const kyogre = randomPreset('kyogre-base', 'Kyogre', 76, {
      item: item('Mystic Water'),
    });
    const kyogrePrimal = randomPreset('kyogre-primal', 'Kyogre-Primal', 70, {
      item: item('Blue Orb'),
    });

    expect(guessMatchingPresets(
      [kyogre, kyogrePrimal],
      pokemon('Kyogre-Primal', 77, { item: item('Blue Orb') }),
      { format },
    )).toEqual([kyogrePrimal]);
  });
});
