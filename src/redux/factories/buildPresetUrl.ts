import { env } from '@showdex/utils/core/getEnv';

/**
 * Random Battle formats whose pkmn-compatible data is served by the embedded
 * Showdown client instead of pkmn's public feed.
 *
 * * surfnWOB (keep-ours on upstream rebase): `gen3megarandombattle` is a
 *   fork-only format, so it can never exist in pkmn/randbats' upstream feed.
 * * Both its options and stats files are copied from our server fork into the
 *   client at `/randbats/data/` during the client image build.
 */
const LocalRandomsFormats = new Set([
  'gen3megarandombattle',
]);

/**
 * Builds the final pkmn preset URL, using the current client origin for
 * fork-owned Random Battle data.
 */
export const buildPresetUrl = (
  path: string,
  endpoint: string,
): string => {
  const normalizedPath = `${path}/${endpoint}`.replace(/\/{2,}/g, '/');
  const localRandoms = path.startsWith('/randbats/data')
    && LocalRandomsFormats.has(endpoint);
  const clientBaseUrl = localRandoms && typeof window !== 'undefined'
    ? window.Dex?.resourcePrefix?.replace(/\/+$/, '') || ''
    : '';

  return (localRandoms ? clientBaseUrl : env('pkmn-presets-base-url'))
    + normalizedPath
    + env('pkmn-presets-endpoint-suffix');
};
