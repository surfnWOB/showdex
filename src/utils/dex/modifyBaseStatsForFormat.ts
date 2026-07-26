import { formatId } from '@showdex/utils/core';

/**
 * Applies format-level base-stat changes that are implemented as server rules
 * rather than a client Dex mod.
 *
 * Bad 'n Boosted doubles each individual base stat at or below 70, capped at
 * the simulator's 255 base-stat limit. Keep this in sync with the side
 * server's `badnboostedmod` rule.
 */
export const modifyBaseStatsForFormat = (
  baseStats: Showdown.StatsTable,
  format?: string | number,
): Showdown.StatsTable => {
  const output = { ...baseStats };

  if (typeof format !== 'string' || !formatId(format).includes('badnboosted')) {
    return output;
  }

  (Object.keys(output) as Showdown.StatName[]).forEach((stat) => {
    if (output[stat] <= 70) {
      output[stat] = Math.min(255, output[stat] * 2);
    }
  });

  return output;
};
