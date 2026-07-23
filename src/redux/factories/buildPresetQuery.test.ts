import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPresetUrl } from './buildPresetUrl';

describe('buildPresetUrl()', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses same-origin data for Gen 3 Mega Random Battles', () => {
    expect(buildPresetUrl('/randbats/data', 'gen3megarandombattle'))
      .toBe('/randbats/data/gen3megarandombattle.json');
    expect(buildPresetUrl('/randbats/data/stats', 'gen3megarandombattle'))
      .toBe('/randbats/data/stats/gen3megarandombattle.json');
  });

  it('uses the configured client host from standalone replay pages', () => {
    vi.stubGlobal('window', {
      Dex: { resourcePrefix: 'https://play.example.test/' },
    });

    expect(buildPresetUrl('/randbats/data', 'gen3megarandombattle'))
      .toBe('https://play.example.test/randbats/data/gen3megarandombattle.json');
  });

  it('keeps standard Random Battle data on the pkmn host', () => {
    expect(buildPresetUrl('/randbats/data', 'gen3randombattle'))
      .toBe('https://pkmn.github.io/randbats/data/gen3randombattle.json');
  });
});
