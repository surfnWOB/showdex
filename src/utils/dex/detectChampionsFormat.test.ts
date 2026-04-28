import { describe, expect, it } from 'vitest';
import { detectChampionsFormat } from './detectChampionsFormat';

describe('detectChampionsFormat()', () => {
  const cases: [label: string, input: unknown, expected: boolean][] = [
    ['gen9championsou', 'gen9championsou', true],
    ['gen9championsbssregma (hypothetical)', 'gen9championsbssregma', true],
    ['gen9championsvgc2026regma (hypothetical)', 'gen9championsvgc2026regma', true],
    ['mixed-case input is normalized', 'Gen9ChampionsOU', true],
    ['format with whitespace and punctuation', '[Gen 9] Champions OU', true],
    ['gen9ou (negative)', 'gen9ou', false],
    ['gen9bdspou (negative)', 'gen9bdspou', false],
    ['gen8ou (negative)', 'gen8ou', false],
    ['empty string', '', false],
    ['undefined', undefined, false],
    ['null', null, false],
    ['number', 9, false],
    ['malformed prefix', 'championsou', false],
    ['near miss: champion (no s)', 'gen9championou', false],
  ];

  it.each(cases)('returns %s for %s', (_label, input, expected) => {
    expect(detectChampionsFormat(input as string)).toBe(expected);
  });
});
