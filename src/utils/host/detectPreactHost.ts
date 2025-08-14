/**
 * Detects if the provided `host` is running the rewritten Showdown Preact (i.e., Puny/Petite React.js) client.
 *
 * * Mostly for TypeScript lol.
 *
 * @example
 * ```ts
 * if (detectPreactHost(window)) {
 *   return void console.log(window.PS.user?.name); // -> 'showdex_testee'
 * }
 *
 * console.log(window.PS?.user?.name); // -> undefined
 * ```
 * @since 1.2.6
 */
export const detectPreactHost = (
  host: Window,
): host is Window & Showdown.PSGlobals => (
  (!host?.__SHOWDEX_HOST || host.__SHOWDEX_HOST === 'preact')
    && typeof host.PS?.join === 'function'
);
