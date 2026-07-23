import {
  calculate,
  Field,
  Generations,
  Move,
  Pokemon,
  type AbilityName,
  type MoveName,
} from '@smogon/calc';
import { describe, expect, it, vi } from 'vitest';
import { calcMoveBasePower } from './calcMoveBasePower';

vi.mock('@showdex/utils/dex', () => ({
  detectGenFromFormat: () => 3,
  detectLegacyGen: () => false,
  getDexForFormat: () => ({
    moves: {
      get: (name: MoveName) => ({
        exists: true,
        name,
        type: 'Normal',
        basePower: name === 'Weather Ball' ? 50 : 120,
        isZ: false,
      }),
    },
  }),
}));

const gen = Generations.get(3);
const balancedStats = {
  hp: 341,
  atk: 236,
  def: 236,
  spa: 236,
  spd: 236,
  spe: 236,
};

const makePokemon = (
  ability: string,
  types: string[] = ['Normal'],
  rawStats = balancedStats,
) => new Pokemon(gen, 'Mew', {
  ability: ability as AbilityName,
  rawStats,
  overrides: { types: types as never },
});

const calculateMove = (
  ability: string,
  moveName: string,
  field = new Field(),
) => calculate(
  gen,
  makePokemon(ability),
  makePokemon('Pressure'),
  new Move(gen, moveName, { ability: ability as AbilityName }),
  field,
);

describe('Gen 3 Mega damage abilities', () => {
  it.each([
    ['Tough Claws', 'Double-Edge', undefined, 156],
    ['Strong Jaw', 'Crunch', undefined, 120],
    ['Sheer Force', 'Fire Blast', undefined, 156],
    ['Sand Force', 'Earthquake', 'Sand', 130],
    ['Mega Launcher', 'Water Pulse', undefined, 90],
    ['Technician', 'Aerial Ace', undefined, 90],
  ] as const)('%s applies the server fixed-point base-power modifier', (
    ability,
    moveName,
    weather,
    expectedBasePower,
  ) => {
    const result = calculateMove(
      ability,
      moveName,
      new Field({ weather }),
    );

    expect(result.rawDesc.moveBP).toBe(expectedBasePower);
    expect(result.rawDesc.attackerAbility).toBe(ability);
  });

  it.each([
    {
      ability: 'Aerilate',
      species: 'Pinsir',
      types: ['Bug', 'Flying'],
      rawStats: { hp: 271, atk: 346, def: 276, spa: 166, spd: 216, spe: 246 },
      type: 'Flying',
      category: 'Physical',
      damage: [323, 327, 331, 335, 339, 342, 346, 350, 354, 358, 361, 365, 369, 373, 377, 381],
    },
    {
      ability: 'Refrigerate',
      species: 'Glalie',
      types: ['Ice'],
      rawStats: { hp: 301, atk: 276, def: 196, spa: 276, spd: 196, spe: 236 },
      type: 'Ice',
      category: 'Special',
      damage: [168, 170, 172, 174, 176, 178, 180, 182, 184, 186, 188, 190, 192, 194, 196, 198],
    },
    {
      ability: 'Dragonize',
      species: 'Feraligatr',
      types: ['Water', 'Dragon'],
      rawStats: { hp: 311, atk: 356, def: 286, spa: 214, spd: 222, spe: 192 },
      type: 'Dragon',
      category: 'Special',
      damage: [130, 132, 133, 135, 137, 138, 140, 141, 143, 144, 146, 147, 149, 150, 152, 154],
    },
  ] as const)('$ability retypes, reclassifies, and matches the server rolls', ({
    ability,
    species,
    types,
    rawStats,
    type,
    category,
    damage,
  }) => {
    const attacker = new Pokemon(gen, species, {
      ability: ability as AbilityName,
      rawStats,
      overrides: { types: [...types] as never },
    });
    const defender = new Pokemon(gen, 'Snorlax', {
      rawStats: { hp: 461, atk: 256, def: 166, spa: 166, spd: 256, spe: 96 },
    });
    const result = calculate(
      gen,
      attacker,
      defender,
      new Move(gen, 'Double-Edge', { ability: ability as AbilityName }),
      new Field(),
    );

    expect(result.move.type).toBe(type);
    expect(result.move.category).toBe(category);
    expect(result.rawDesc.moveBP).toBe(144);
    expect(result.damage).toStrictEqual(damage);
  });

  it('handles Showdex pre-typed skin moves without double boosting them', () => {
    const attacker = new Pokemon(gen, 'Glalie', {
      ability: 'Refrigerate',
      rawStats: { hp: 301, atk: 276, def: 196, spa: 276, spd: 196, spe: 236 },
    });
    const defender = new Pokemon(gen, 'Snorlax', {
      rawStats: { hp: 461, atk: 256, def: 166, spa: 166, spd: 256, spe: 96 },
    });
    const move = new Move(gen, 'Double-Edge', {
      ability: 'Refrigerate',
      overrides: {
        type: 'Ice',
        category: 'Physical',
        basePower: 144,
        overrideOffensiveStat: 'atk',
        overrideDefensiveStat: 'def',
      },
    });
    const result = calculate(gen, attacker, defender, move, new Field());

    expect(result.move.category).toBe('Special');
    expect(result.rawDesc.moveBP).toBe(144);
    expect(result.rawDesc.attackEVs).toBe('0 SpA');
    expect(result.rawDesc.defenseEVs).toBe('0 SpD');
    expect(result.damage).toStrictEqual(
      [168, 170, 172, 174, 176, 178, 180, 182, 184, 186, 188, 190, 192, 194, 196, 198],
    );
  });

  it('shows the 4915/4096 skin boost in Showdex move overrides', () => {
    const pokemon = (ability: AbilityName) => ({
      speciesForme: 'Mew',
      ability,
      moveOverrides: {},
      volatiles: {},
    }) as never;

    for (const ability of ['Aerilate', 'Dragonize', 'Refrigerate'] as AbilityName[]) {
      expect(calcMoveBasePower(
        'gen3megas',
        pokemon(ability),
        'Double-Edge' as MoveName,
      )).toBe(144);
    }

    expect(calcMoveBasePower(
      'gen3megas',
      pokemon('Pixilate' as AbilityName),
      'Double-Edge' as MoveName,
    )).toBe(120);
    expect(calcMoveBasePower(
      'gen3megas',
      pokemon('Aerilate' as AbilityName),
      'Weather Ball' as MoveName,
    )).toBe(50);
  });

  it('matches the server Adaptability rolls', () => {
    const attacker = new Pokemon(gen, 'Beedrill', {
      ability: 'Adaptability',
      rawStats: { hp: 271, atk: 336, def: 116, spa: 66, spd: 196, spe: 336 },
      overrides: { types: ['Bug', 'Poison'] },
    });
    const defender = new Pokemon(gen, 'Snorlax', {
      rawStats: { hp: 461, atk: 256, def: 166, spa: 166, spd: 256, spe: 96 },
    });
    const result = calculate(
      gen,
      attacker,
      defender,
      new Move(gen, 'Sludge Bomb', { ability: 'Adaptability' }),
      new Field(),
    );

    expect(result.damage).toStrictEqual(
      [263, 266, 269, 272, 275, 279, 282, 285, 288, 291, 294, 297, 300, 303, 306, 310],
    );
  });

  it('applies Filter late and lets Mold Breaker bypass it', () => {
    const attackerStats = { hp: 341, atk: 256, def: 216, spa: 206, spd: 216, spe: 156 };
    const defenderStats = { hp: 281, atk: 316, def: 496, spa: 156, spd: 196, spe: 136 };
    const defender = makePokemon('Filter', ['Steel'], defenderStats);
    const move = new Move(gen, 'Earthquake');

    const filtered = calculate(
      gen,
      makePokemon('Torrent', ['Water', 'Ground'], attackerStats),
      defender,
      move,
      new Field(),
    );
    const moldBroken = calculate(
      gen,
      makePokemon('Mold Breaker', ['Water', 'Ground'], attackerStats),
      defender,
      move,
      new Field(),
    );

    expect(filtered.damage).toStrictEqual(
      [85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100],
    );
    expect(moldBroken.damage).toStrictEqual(
      [113, 115, 116, 117, 119, 120, 121, 123, 124, 125, 127, 128, 129, 131, 132, 134],
    );
  });

  it('models both Parental Bond hits, including fixed damage', () => {
    const attacker = new Pokemon(gen, 'Kangaskhan', {
      ability: 'Parental Bond',
      rawStats: { hp: 351, atk: 286, def: 236, spa: 156, spd: 236, spe: 236 },
    });
    const defender = new Pokemon(gen, 'Snorlax', {
      rawStats: { hp: 461, atk: 256, def: 166, spa: 166, spd: 256, spe: 96 },
    });

    const result = calculate(
      gen,
      attacker,
      defender,
      new Move(gen, 'Double-Edge', { ability: 'Parental Bond' }),
      new Field(),
    );
    const fixed = calculate(
      gen,
      attacker,
      defender,
      new Move(gen, 'Seismic Toss', { ability: 'Parental Bond' }),
      new Field(),
    );

    expect(result.damage).toStrictEqual([
      [222, 225, 227, 230, 233, 235, 238, 241, 243, 246, 248, 251, 254, 256, 259, 262],
      [55, 55, 56, 57, 57, 58, 59, 59, 60, 61, 61, 62, 63, 63, 64, 65],
    ]);
    expect(fixed.damage).toStrictEqual([100, 100]);
  });
});
