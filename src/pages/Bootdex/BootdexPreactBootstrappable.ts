/**
 * @file `BootdexPreactBootstrappable.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
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

// exported for convenience (technically available w/out the `window`, i.e., `new PSRoom()` is gucc),
// but these make TypeScript happy
export const PSRoom = detectPreactHost(window) ? window.PSRoom : null;
export const PSRoomPanel = detectPreactHost(window) ? window.PSRoomPanel : null;
export const PSPanelWrapper = detectPreactHost(window) ? window.PSPanelWrapper : null;
// export const Icon = 'i' as React.ElementType<JSX.IntrinsicElements['i'] & { class?: string; }>;
export const preact = detectPreactHost(window) ? window.preact : null;
