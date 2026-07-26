import { describe, expect, it } from 'vitest';
import { modifyBaseStatsForFormat } from './modifyBaseStatsForFormat';

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
