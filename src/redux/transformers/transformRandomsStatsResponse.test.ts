import { type PkmnApiSmogonRandomsStatsResponse } from '@showdex/interfaces/api';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { transformRandomsStatsResponse as TransformRandomsStatsResponse } from './transformRandomsStatsResponse';

let transformRandomsStatsResponse: typeof TransformRandomsStatsResponse;

vi.mock('@showdex/utils/calc/calcCalcdexId', () => ({
  calcPresetCalcdexId: (preset: { name?: string }) => `randoms-stats-${preset.name}`,
}));

vi.mock('@showdex/utils/presets/processUsageAlts', () => ({
  processUsageAlts: (values: Record<string, number>) => Object.entries(values || {}),
}));

beforeAll(async () => {
  ({ transformRandomsStatsResponse } = await import('./transformRandomsStatsResponse'));
});

describe('transformRandomsStatsResponse()', () => {
  it('keeps role-specific Gen 3 EVs', () => {
    const response = {
      'Starmie-Mega': {
        level: 72,
        abilities: { 'Natural Cure': 1 },
        items: { Starminite: 1 },
        roles: {
          'Special Attacker': {
            weight: 0.5,
            abilities: { 'Natural Cure': 1 },
            items: { Starminite: 1 },
            moves: {
              'Hydro Pump': 1,
              'Ice Beam': 1,
              Psychic: 1,
              Thunderbolt: 1,
            },
            evs: { atk: 0 },
            ivs: { spe: 30 },
          },
          'Mixed Attacker': {
            weight: 0.5,
            abilities: { 'Natural Cure': 1 },
            items: { Starminite: 1 },
            moves: {
              'Hydro Pump': 1,
              Psychic: 1,
              'Shadow Ball': 1,
              Thunderbolt: 1,
            },
            evs: { atk: 85 },
            ivs: { spe: 31 },
          },
        },
      },
    } as unknown as PkmnApiSmogonRandomsStatsResponse;

    const presets = transformRandomsStatsResponse(response, null, {
      gen: 3,
      format: 'gen3megarandombattle',
    });
    const special = presets.find((preset) => preset.name === 'Special Attacker Usage');
    const mixed = presets.find((preset) => preset.name === 'Mixed Attacker Usage');

    expect(special?.format).toBe('megarandombattle');
    expect(special?.evs?.atk).toBe(0);
    expect(special?.ivs?.spe).toBe(30);
    expect(mixed?.evs?.atk).toBe(85);
    expect(mixed?.ivs?.spe).toBe(31);
  });
});
