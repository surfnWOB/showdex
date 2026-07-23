import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { guessTableFormatKey } from './guessTableFormatKey';
import { guessTableFormatSlice } from './guessTableFormatSlice';

describe('[Gen 4] Megas teambuilder table routing', () => {
  beforeEach(() => {
    vi.stubGlobal('BattleTeambuilderTable', {
      gen4: {},
      gen4mega: {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes the sole OU format to the dedicated table and OU slice', () => {
    expect(guessTableFormatKey('gen4megas')).toBe('gen4mega');
    expect(guessTableFormatSlice('gen4megas')).toEqual(['OU']);
  });
});
