import { calculate, Field, Generations, Move, Pokemon, type AbilityName } from '@smogon/calc';
import { describe, expect, it } from 'vitest';

const gen = Generations.get(4);

// Receipts from gen4mega's real Battle damage pipeline: neutral Mew, level 100,
// 31 IVs, zero EVs, no items, non-critical hits, each damage roll from 85 to 100.
const receipts = [
  {
    attackAbility: 'Sharpness', defendAbility: 'Synchronize', move: 'nightslash',
    rolls: [152, 154, 156, 158, 160, 162, 162, 164, 166, 168, 170, 172, 174, 176, 178, 180],
  },
  {
    attackAbility: 'Sharpness', defendAbility: 'Synchronize', move: 'aerialace',
    rolls: [65, 66, 66, 67, 68, 69, 70, 70, 71, 72, 73, 73, 74, 75, 76, 77],
  },
  {
    attackAbility: 'Sharpness', defendAbility: 'Synchronize', move: 'shadowball',
    rolls: [116, 118, 120, 120, 122, 124, 124, 126, 128, 128, 130, 132, 132, 134, 136, 138],
  },
  {
    attackAbility: 'Synchronize', defendAbility: 'Aura Guard', move: 'tackle',
    rolls: [13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15],
  },
  {
    attackAbility: 'Synchronize', defendAbility: 'Aura Guard', move: 'earthquake',
    rolls: [73, 73, 74, 75, 76, 77, 78, 79, 79, 80, 81, 82, 83, 84, 85, 86],
  },
  {
    attackAbility: 'Synchronize', defendAbility: 'Aura Guard', move: 'grassknot',
    rolls: [7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9],
  },
  {
    attackAbility: 'Mold Breaker', defendAbility: 'Aura Guard', move: 'tackle',
    rolls: [26, 26, 26, 27, 27, 27, 28, 28, 28, 29, 29, 29, 30, 30, 30, 31],
  },
];

describe('Gen 4 Z Mega damage abilities', () => {
  it.each(receipts)('$attackAbility vs $defendAbility: $move matches the server', (receipt) => {
    const attacker = new Pokemon(gen, 'Mew', { ability: receipt.attackAbility as AbilityName });
    const defender = new Pokemon(gen, 'Mew', { ability: receipt.defendAbility as AbilityName });
    const result = calculate(gen, attacker, defender, new Move(gen, receipt.move), new Field());
    expect(result.damage).toEqual(receipt.rolls);
  });
});
