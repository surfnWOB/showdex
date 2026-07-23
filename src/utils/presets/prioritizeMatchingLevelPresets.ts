import { type CalcdexPokemonPreset } from '@showdex/interfaces/calc';

/**
 * Narrows Random Battle presets to the publicly visible level when possible.
 *
 * If no preset has that level, the original pool is returned. This keeps
 * custom Adjust Level battles and deceptive displayed levels usable.
 */
export const prioritizeMatchingLevelPresets = (
  presets: CalcdexPokemonPreset[],
  level?: number,
): CalcdexPokemonPreset[] => {
  if (!presets?.length || !level) {
    return presets || [];
  }

  const matching = presets.filter((preset) => preset.level === level);
  return matching.length ? matching : presets;
};
