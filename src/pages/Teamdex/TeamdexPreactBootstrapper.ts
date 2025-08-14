/**
 * @file `TeamdexPreactBootstrapper.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.2.6
 */

import { logger } from '@showdex/utils/debug';
import { detectPreactHost } from '@showdex/utils/host';
import { BootdexPreactBootstrappable } from '../Bootdex/BootdexPreactBootstrappable';
import { MixinTeamdexBootstrappable } from './TeamdexBootstrappable';

const l = logger('@showdex/pages/Teamdex/TeamdexPreactBootstrapper');

export class TeamdexPreactBootstrapper extends MixinTeamdexBootstrappable(BootdexPreactBootstrappable) {
  public static override readonly scope = l.scope;

  protected override startTimer(): void {
    super.startTimer(TeamdexPreactBootstrapper.scope);
  }

  public open(): void { // eslint-disable-line class-methods-use-this
    l.info('coming soon to VHS !!!');
  }

  public close(): void { // eslint-disable-line class-methods-use-this
    l.info('nothing to close yet dummy');
  }

  public destroy(): void { // eslint-disable-line class-methods-use-this
    l.info('destroyed nothing cause there was nothing to destroy ... yet');
  }

  public run(): void {
    if (!detectPreactHost(window)) {
      throw new Error('TeamdexPreactBootstrapper can only be run in the preact Showdown client!');
    }

    this.startTimer();

    l.silly(
      'Teamdex bootstrapper was invoked;',
      'determining if there\'s anything to do...',
    );

    l.debug('Subscribing to PS.teams...');

    window.PS.teams.subscribeAndRun((value) => {
      if (value !== 'team') {
        return;
      }

      l.debug(
        'PS.teams.update()', 'Updating Teamdex presets due to Teambuilder', value, 'update',
        '\n', 'PS.teams', window.PS.teams,
      );

      this.updateTeambuilderPresets();
    });

    this.endTimer('(bootstrap complete)');
  }
}
