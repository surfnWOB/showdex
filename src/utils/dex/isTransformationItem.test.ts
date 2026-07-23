import { describe, expect, it } from 'vitest';
import { isTransformationItem } from './isTransformationItem';

describe('isTransformationItem()', () => {
  it.each([
    'Absolite',
    'Charizardite X',
    'Blue Orb',
    'Red Orb',
  ])('recognizes %s', (item) => {
    expect(isTransformationItem(item)).toBe(true);
  });

  it.each([
    'Eviolite',
    'Leftovers',
    'Mystic Water',
    '',
  ])('rejects %s', (item) => {
    expect(isTransformationItem(item)).toBe(false);
  });
});
