import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDexForFormat } from '@showdex/utils/dex/getDexForFormat';
import { getPresetFormes } from './getPresetFormes';

vi.mock('@showdex/utils/dex/getDexForFormat', () => ({
  getDexForFormat: vi.fn(),
}));

const species = new Map<string, Partial<Showdown.Species>>([
  ['Kyogre', {
    exists: true,
    name: 'Kyogre',
    baseSpecies: 'Kyogre',
    otherFormes: ['Kyogre-Primal'],
  }],
  ['Kyogre-Primal', {
    exists: true,
    name: 'Kyogre-Primal',
    baseSpecies: 'Kyogre',
    isPrimal: true,
  }],
  ['Groudon', {
    exists: true,
    name: 'Groudon',
    baseSpecies: 'Groudon',
    otherFormes: ['Groudon-Primal'],
  }],
  ['Groudon-Primal', {
    exists: true,
    name: 'Groudon-Primal',
    baseSpecies: 'Groudon',
    isPrimal: true,
  }],
  ['Charizard', {
    exists: true,
    name: 'Charizard',
    baseSpecies: 'Charizard',
    otherFormes: ['Charizard-Mega-X', 'Charizard-Mega-Y'],
  }],
  ['Charizard-Mega-X', {
    exists: true,
    name: 'Charizard-Mega-X',
    baseSpecies: 'Charizard',
    isMega: true,
  }],
  ['Charizard-Mega-Y', {
    exists: true,
    name: 'Charizard-Mega-Y',
    baseSpecies: 'Charizard',
    isMega: true,
  }],
]);

describe('getPresetFormes()', () => {
  beforeEach(() => {
    vi.mocked(getDexForFormat).mockReturnValue({
      species: {
        get: (name: string) => species.get(name) || {
          exists: false,
          name: '',
        },
      },
    } as Showdown.ModdedDex);
  });

  it.each([
    ['Kyogre', 'Kyogre-Primal'],
    ['Groudon', 'Groudon-Primal'],
  ])('includes the Primal candidate for base %s', (base, primal) => {
    expect(getPresetFormes(base, { format: 'gen3megarandombattle' })).toContain(primal);
  });

  it.each([
    ['Kyogre-Primal', 'Kyogre'],
    ['Groudon-Primal', 'Groudon'],
  ])('includes the base species for %s', (primal, base) => {
    expect(getPresetFormes(primal, { format: 'gen3megarandombattle' })).toContain(base);
  });

  it('preserves normal Mega forme matching', () => {
    expect(getPresetFormes('Charizard', { format: 'gen3megarandombattle' })).toEqual([
      'Charizard',
      'Charizard-Mega-X',
      'Charizard-Mega-Y',
    ]);
  });
});
