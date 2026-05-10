import { describe, expect, it } from 'vitest';
import { calcPokemonStat } from './calcPokemonStat';

const FORMAT = 'gen9championsou';

describe('calcPokemonStat() Champions branch', () => {
  it('returns 1 for the HP=1 Shedinja sentinel regardless of sp', () => {
    expect(calcPokemonStat(FORMAT, 'hp', 1, 0, 0, 50)).toBe(1);
    expect(calcPokemonStat(FORMAT, 'hp', 1, 0, 32, 50)).toBe(1);
  });

  it('computes HP as base + sp + 75', () => {
    // Charizard-Mega-X HP base 78, no SP: 78 + 0 + 75 = 153
    expect(calcPokemonStat(FORMAT, 'hp', 78, 0, 0, 50)).toBe(153);

    // Corviknight HP base 98, sp 32: 98 + 32 + 75 = 205
    expect(calcPokemonStat(FORMAT, 'hp', 98, 0, 32, 50)).toBe(205);
  });

  it('computes neutral-nature non-HP as floor(base + sp + 20)', () => {
    // Corviknight DEF base 105, sp 32, Impish neutral for def's caller — but
    // here we test no nature: 105 + 32 + 20 = 157.
    expect(calcPokemonStat(FORMAT, 'def', 105, 0, 32, 50)).toBe(157);
  });

  it('applies +nature multiplier of 1.1', () => {
    // Adamant (+atk -spa), Charizard-Mega-X base atk 130, sp 32:
    // floor(1.1 * (130 + 32 + 20)) = floor(1.1 * 182) = floor(200.2) = 200
    expect(calcPokemonStat(FORMAT, 'atk', 130, 0, 32, 50, 'Adamant')).toBe(200);
  });

  it('applies -nature multiplier of 0.9', () => {
    // Adamant (-spa), Charizard-Mega-X base spa 130, sp 0:
    // floor(0.9 * (130 + 0 + 20)) = floor(0.9 * 150) = 135
    expect(calcPokemonStat(FORMAT, 'spa', 130, 0, 0, 50, 'Adamant')).toBe(135);
  });

  it('treats neutral-effect natures (Hardy/Bashful/etc) as multiplier 1', () => {
    // Hardy has []; should produce floor(1 * (100 + 0 + 20)) = 120
    expect(calcPokemonStat(FORMAT, 'spe', 100, 0, 0, 50, 'Hardy')).toBe(120);
  });

  it('ignores IVs', () => {
    // Same base/sp/nature with iv=0 vs iv=31 should produce identical result
    const ivZero = calcPokemonStat(FORMAT, 'atk', 130, 0, 32, 50, 'Adamant');
    const ivMax = calcPokemonStat(FORMAT, 'atk', 130, 31, 32, 50, 'Adamant');

    expect(ivZero).toBe(ivMax);
    expect(ivZero).toBe(200);

    // HP also ignores IVs
    expect(calcPokemonStat(FORMAT, 'hp', 78, 0, 0, 50)).toBe(
      calcPokemonStat(FORMAT, 'hp', 78, 31, 0, 50),
    );
  });

  it('ignores level', () => {
    // Level lock at 50 in the format means level should not factor in
    expect(calcPokemonStat(FORMAT, 'atk', 130, 0, 32, 50, 'Adamant')).toBe(
      calcPokemonStat(FORMAT, 'atk', 130, 0, 32, 100, 'Adamant'),
    );
    expect(calcPokemonStat(FORMAT, 'hp', 78, 0, 0, 1)).toBe(
      calcPokemonStat(FORMAT, 'hp', 78, 0, 0, 100),
    );
  });

  it('floors negative sp to 0', () => {
    // Defensive: an out-of-range negative ev should not subtract from the stat
    expect(calcPokemonStat(FORMAT, 'hp', 78, 0, -5, 50)).toBe(
      calcPokemonStat(FORMAT, 'hp', 78, 0, 0, 50),
    );
    expect(calcPokemonStat(FORMAT, 'atk', 130, 0, -5, 50, 'Adamant')).toBe(
      calcPokemonStat(FORMAT, 'atk', 130, 0, 0, 50, 'Adamant'),
    );
  });

  it('does not apply the Champions branch on non-Champions formats', () => {
    // gen9ou with the same args should run the standard EV formula and produce
    // a different number — guarding against the branch leaking.
    const champions = calcPokemonStat(FORMAT, 'atk', 130, 0, 32, 50, 'Adamant');
    const standard = calcPokemonStat('gen9ou', 'atk', 130, 31, 32, 50, 'Adamant');

    expect(champions).not.toBe(standard);
  });
});
