/**
 * @file `BootdexPreactAdapter.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

import { logger } from '@showdex/utils/debug';
import { detectPreactHost } from '@showdex/utils/host';
import { BootdexAdapter } from './BootdexAdapter';

const l = logger('@showdex/pages/Bootdex/BootdexPreactAdapter');

export class BootdexPreactAdapter extends BootdexAdapter {
  public static override readonly scope = l.scope;

  protected static override hook = (): void => {
    if (!detectPreactHost(window)) {
      throw new Error('BootdexPreactAdapter can only be run in the Preact Showdown client!');
    }

    this.hookUser();
    this.hookPrefs();
  };

  protected static override ready = (): void => {
    if (!detectPreactHost(window)) {
      throw new Error('BootdexPreactAdapter can only be run in the Preact Showdown client!');
    }
  };

  protected static hookUser(): void {
    if (!detectPreactHost(window)) {
      return;
    }

    l.debug('Subscribing to PS.user...');

    window.PS.user.subscribeAndRun(() => {
      const { user } = window.PS;

      if (!user?.named || !user.name) {
        return;
      }

      l.debug(
        'PS.user.update()', 'Logged in as a', user.registered?.name ? 'registered' : 'guest',
        'user', user.registered?.name || user.name || '???', '(probably)',
        '\n', 'PS.user', user,
      );

      if (!user.registered?.name) {
        return;
      }

      // note: when a registered user is logged in, user.name === user.registered.name &
      // user.userid = user.registered.userid = formatId(user.registered.name)
      BootdexPreactAdapter.authUsername = user.registered.name;
    });
  }

  protected static hookPrefs(): void {
    if (!detectPreactHost(window)) {
      return;
    }

    l.debug('Subscribing to PS.prefs...');

    window.PS.prefs.subscribeAndRun(() => {
      const { prefs } = window.PS;
      const { colorScheme: prevColorScheme } = BootdexPreactAdapter;

      if (!prefs?.theme || prevColorScheme === prefs.theme) {
        return;
      }

      l.debug(
        'PS.prefs.update()', 'Swapping colorScheme from', prevColorScheme, 'to', prefs.theme,
        '\n', 'PS.prefs', prefs,
      );

      BootdexPreactAdapter.colorScheme = prefs.theme;
    });
  }
}
