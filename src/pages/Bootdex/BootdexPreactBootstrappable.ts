/**
 * @file `BootdexPreactBootstrappable.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.2.6
 */

import { formatId } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import { detectPreactHost } from '@showdex/utils/host';
import { BootdexBootstrappable } from './BootdexBootstrappable';
import { BootdexPreactAdapter } from './BootdexPreactAdapter';

const l = logger('@showdex/pages/Bootdex/BootdexPreactBootstrappable');

export abstract class BootdexPreactBootstrappable extends BootdexBootstrappable {
  public static override readonly scope = l.scope;
  public static override readonly Adapter = BootdexPreactAdapter;

  public static override hasSinglePanel: typeof BootdexBootstrappable.hasSinglePanel = () => detectPreactHost(window) && (
    !!window.PS.prefs.onepanel // can also be 'vertical', which is still technically one panel, hence the bang bang
  );

  public static override openUserPopup: typeof BootdexBootstrappable.openUserPopup = (username) => {
    if (!detectPreactHost(window)) {
      return;
    }

    window.PS.join(`user-${formatId(username)}` as Showdown.RoomID);
  };

  public static override openBattlesRoom: typeof BootdexBootstrappable.openBattlesRoom = () => {
    if (!detectPreactHost(window)) {
      return;
    }

    window.PS.join('battles' as Showdown.RoomID);
  };

  public static detectBattleRoom(
    room: Showdown.PSRoom,
  ): room is Showdown.BattleRoom {
    return room.classType === 'battle';
  }
}
