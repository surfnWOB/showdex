/**
 * @file `loadI18nextLocales.test.ts` -- surfnWOB (keep-ours on upstream rebase)
 *
 * Regression tests for the "Showdex suddenly in French" incident (2026-07-13): a deploy-window 502
 * on `i18n.en.json` silently dropped `en` from `supportedLngs`, i18next resolved & the
 * LanguageDetector *cached* `fr` in `localStorage.i18nextLng`, so an English browser stayed French
 * forever afterwards.
 *
 * @since 1.4.0
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const runtimeFetch = vi.fn();

// mock the barrels: the real `@showdex/utils/core` index drags in DOM-only deps (e.g., file-saver)
// that can't load in the node test environment; only what `loadI18nextLocales` consumes is stubbed
vi.mock('@showdex/utils/core', () => ({
  env: (_key: string, defaultValue?: string) => defaultValue,
  getResourceUrl: (fileName: string) => `/showdex/${fileName}`,
  nonEmptyObject: (value: unknown) => !!value && typeof value === 'object' && !!Object.keys(value).length,
  runtimeFetch: (...args: unknown[]) => runtimeFetch(...args) as unknown,
}));

vi.mock('@showdex/consts/app', () => ({
  ShowdexLocaleBundles: ['en', 'fr'].map((locale) => ({
    id: `i18n.${locale}`,
    ext: 'json',
    ntt: 'locale',
    locale,
  })),
}));

// minimal browser shims for the node test environment (LanguageDetector touches all of these)
const localStore = new Map<string, string>();

const installBrowserGlobals = (languages: string[]) => {
  const storageShim = (backing: Map<string, string>) => ({
    getItem: (k: string) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k: string, v: string) => void backing.set(k, String(v)),
    removeItem: (k: string) => void backing.delete(k),
  });

  Object.defineProperty(globalThis, 'localStorage', { value: storageShim(localStore), configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: storageShim(new Map()), configurable: true });
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages, language: languages[0], userLanguage: languages[0] },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: { documentElement: { lang: '' }, cookie: '' },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'location', { value: { search: '', hash: '' }, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
};

const bundleJson = (locale: string): Record<string, unknown> => ({
  common: {
    '--meta': { name: 'common', locale },
    greeting: locale === 'fr' ? 'bonjour' : 'hello',
  },
});

const okResponse = (locale: string) => ({
  ok: true,
  status: 200,
  headers: {},
  text: () => JSON.stringify(bundleJson(locale)),
  json: () => bundleJson(locale),
});

const badGateway = () => ({
  ok: false,
  status: 502,
  headers: {},
  text: () => '<html>502 Bad Gateway</html>',
  json: () => null,
});

/** `runtimeFetch` impl: per-locale queues of responses; last entry repeats. */
const respondWith = (queues: Record<string, Array<() => unknown>>) => {
  runtimeFetch.mockImplementation((url: string) => {
    const locale = /i18n\.(\w+)\.json/.exec(url)?.[1];
    const queue = queues[locale];
    if (!queue?.length) throw new Error(`unexpected fetch: ${url}`);
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return Promise.resolve(next());
  });
};

const loadFresh = async (initLocale?: string) => {
  vi.resetModules();
  const { loadI18nextLocales } = await import('./loadI18nextLocales');
  return loadI18nextLocales(initLocale);
};

describe('loadI18nextLocales()', () => {
  beforeEach(() => {
    localStore.clear();
    installBrowserGlobals(['en-US', 'en']);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    runtimeFetch.mockReset();
  });

  it('resolves English on an English browser when every bundle loads', async () => {
    respondWith({ en: [okResponse.bind(null, 'en')], fr: [okResponse.bind(null, 'fr')] });

    const i18n = await loadFresh();

    expect(i18n.language).toBe('en');
    expect(i18n.t('common:greeting')).toBe('hello');
  });

  it('retries a transient 502 on a bundle instead of silently dropping the locale', async () => {
    respondWith({
      en: [badGateway, okResponse.bind(null, 'en')], // 502 once (deploy window), then healthy
      fr: [okResponse.bind(null, 'fr')],
    });

    const pending = loadFresh();
    await vi.runAllTimersAsync(); // flush the retry backoff
    const i18n = await pending;

    expect(i18n.language).toBe('en');
    expect(i18n.options.supportedLngs).toContain('en');
  });

  it('retries when the bundle fetch throws instead of rejecting the whole loader', async () => {
    respondWith({
      en: [() => { throw new Error('connection reset'); }, okResponse.bind(null, 'en')],
      fr: [okResponse.bind(null, 'fr')],
    });

    const pending = loadFresh();
    await vi.runAllTimersAsync();
    const i18n = await pending;

    expect(i18n.language).toBe('en');
  });

  it('never persists the resolved language to localStorage (no sticky poisoning)', async () => {
    respondWith({
      en: [badGateway], // permanently down -> fr-only session (worst case)
      fr: [okResponse.bind(null, 'fr')],
    });

    const pending = loadFresh();
    await vi.runAllTimersAsync();
    const i18n = await pending;

    expect(i18n.language).toBe('fr'); // fr-only session is the best we can do...
    expect(localStore.has('i18nextLng')).toBe(false); // ...but it must NOT outlive the session
  });

  it('ignores a poisoned localStorage i18nextLng and heals back to the browser language', async () => {
    localStore.set('i18nextLng', 'fr'); // browser poisoned by a pre-fix session
    respondWith({ en: [okResponse.bind(null, 'en')], fr: [okResponse.bind(null, 'fr')] });

    const i18n = await loadFresh();

    expect(i18n.language).toBe('en');
  });

  it('pins the fallback language to en regardless of bundle load order', async () => {
    respondWith({ en: [okResponse.bind(null, 'en')], fr: [okResponse.bind(null, 'fr')] });

    const i18n = await loadFresh();

    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('still honors an explicitly configured locale from Showdex settings', async () => {
    respondWith({ en: [okResponse.bind(null, 'en')], fr: [okResponse.bind(null, 'fr')] });

    const i18n = await loadFresh('fr');

    expect(i18n.language).toBe('fr');
    expect(i18n.t('common:greeting')).toBe('bonjour');
  });
});
