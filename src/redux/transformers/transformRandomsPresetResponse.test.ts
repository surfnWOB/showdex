import { type PkmnApiSmogonRandomsPresetResponse } from '@showdex/interfaces/api';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { transformRandomsPresetResponse as TransformRandomsPresetResponse } from './transformRandomsPresetResponse';

let transformRandomsPresetResponse: typeof TransformRandomsPresetResponse;

vi.mock('@showdex/utils/calc/calcCalcdexId', () => ({
  calcPresetCalcdexId: (preset: { name?: string }) => `randoms-preset-${preset.name}`,
}));

beforeAll(async () => {
  ({ transformRandomsPresetResponse } = await import('./transformRandomsPresetResponse'));
});

describe('transformRandomsPresetResponse()', () => {
  it('keeps role-specific Gen 3 EVs', () => {
    const response = {
      'Starmie-Mega': {
        level: 72,
        abilities: ['Natural Cure'],
        items: ['Starminite'],
        roles: {
          'Special Attacker': {
            abilities: ['Natural Cure'],
            items: ['Starminite'],
            moves: ['Hydro Pump', 'Ice Beam', 'Psychic', 'Thunderbolt'],
            evs: { atk: 0 },
            ivs: { spe: 30 },
          },
          'Mixed Attacker': {
            abilities: ['Natural Cure'],
            items: ['Starminite'],
            moves: ['Hydro Pump', 'Psychic', 'Shadow Ball', 'Thunderbolt'],
            evs: { atk: 85 },
            ivs: { spe: 31 },
          },
        },
      },
    } as unknown as PkmnApiSmogonRandomsPresetResponse;

    const presets = transformRandomsPresetResponse(response, null, {
      gen: 3,
      format: 'gen3megarandombattle',
    });
    const special = presets.find((preset) => preset.name === 'Special Attacker');
    const mixed = presets.find((preset) => preset.name === 'Mixed Attacker');

    expect(special?.format).toBe('megarandombattle');
    expect(special?.evs?.atk).toBe(0);
    expect(special?.ivs?.spe).toBe(30);
    expect(mixed?.evs?.atk).toBe(85);
    expect(mixed?.ivs?.spe).toBe(31);
  });
});
