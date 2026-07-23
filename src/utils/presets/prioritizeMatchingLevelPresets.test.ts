import { type CalcdexPokemonPreset } from '@showdex/interfaces/calc';
import { describe, expect, it } from 'vitest';
import { prioritizeMatchingLevelPresets } from './prioritizeMatchingLevelPresets';

const preset = (
  speciesForme: string,
  level: number,
): CalcdexPokemonPreset => ({
  speciesForme,
  level,
} as CalcdexPokemonPreset);

describe('prioritizeMatchingLevelPresets()', () => {
  const base = preset('Absol', 87);
  const mega = preset('Absol-Mega', 79);

  it('uses the visible level to distinguish a Mega Random Battle candidate', () => {
    expect(prioritizeMatchingLevelPresets([base, mega], 79)).toEqual([mega]);
  });

  it('preserves the pool when a custom level has no matching preset', () => {
    expect(prioritizeMatchingLevelPresets([base, mega], 77)).toEqual([base, mega]);
  });
});
