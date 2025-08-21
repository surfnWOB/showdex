/**
 * @file `CalcdexPreactPanel.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

/* eslint-disable max-classes-per-file */

import * as ReactDOM from 'react-dom/client';
import cx from 'classnames';
import { calcdexSlice } from '@showdex/redux/store';
import { detectPreactHost } from '@showdex/utils/host';
import {
  BootdexPreactBootstrappable,
  preact,
  PSPanelWrapper,
  PSRoom,
  PSRoomPanel,
} from '../Bootdex/BootdexPreactBootstrappable';
import { type CalcdexPreactBattleRoom } from './CalcdexPreactBattlePanel';
import { CalcdexDomRenderer } from './CalcdexRenderer';

export class CalcdexPreactRoom extends PSRoom {
  public override title = 'Calcdex';
  public override type = 'calcdex';
  public override readonly classType = 'calcdex';
  public override location = 'right' as const;
  public override noURL = true;

  public override destroy() {
    if (!detectPreactHost(window)) {
      return void super.destroy();
    }

    const { Adapter } = BootdexPreactBootstrappable;
    const { calcdex: calcdexSettings } = Adapter.rootState?.showdex?.settings || {};
    const battleId = this.id.replace('calcdex-', '');
    const battleRoom = window.PS.rooms[battleId as Showdown.RoomID] as CalcdexPreactBattleRoom;

    if (calcdexSettings?.destroyOnClose && battleId) {
      if (battleRoom?.battle?.calcdexStateInit) {
        battleRoom.battle.calcdexStateInit = false;
        battleRoom.battle.calcdexDestroyed = true;
      }

      Adapter.store.dispatch(calcdexSlice.actions.destroy(battleId));
    }

    super.destroy();
  }
}

export class CalcdexPreactPanel extends PSRoomPanel<CalcdexPreactRoom> {
  public static readonly id = 'calcdex';
  public static readonly routes = ['calcdex', 'calcdex-*'];
  public static readonly Model = CalcdexPreactRoom;
  public static readonly location = 'right' as const;
  public static readonly icon = preact?.h('i', { class: cx('fa', 'fa-calculator'), 'aria-hidden': true });
  public static readonly title = 'Calcdex';

  // see Hellodex for more info on these shenanigans
  private readonly __calcdexRef = preact?.createRef<HTMLDivElement>();
  private __reactRoot?: ReactDOM.Root = null;

  public override componentDidMount() {
    super.componentDidMount();

    if (!detectPreactHost(window) || !this.__calcdexRef?.current || this.__reactRoot) {
      return;
    }

    const { room } = this.props;
    const { Adapter, Manager, openUserPopup } = BootdexPreactBootstrappable;

    this.__reactRoot = ReactDOM.createRoot(this.__calcdexRef.current);

    CalcdexDomRenderer(this.__reactRoot, {
      store: Adapter.store,
      battleId: room.id?.split('-').slice(1).join('-'),
      onUserPopup: openUserPopup,
      onRequestHellodex: () => void Manager?.openHellodex(),
      onRequestHonkdex: (id) => void Manager?.openHonkdex(id),
      // onCloseOverlay: () => void 0, // note: unused when the calcdexSettings.openAs is 'panel' (i.e., this) duh
    });
  }

  public override componentWillUnmount() {
    if (this.__reactRoot) {
      this.__reactRoot.unmount();
      this.__reactRoot = null;
    }

    super.componentWillUnmount();
  }

  public override render(): Showdown.Preact.VNode {
    const { room } = this.props;

    if (!detectPreactHost(window)) {
      return null;
    }

    return preact.h(PSPanelWrapper, { room }, preact.h('div', {
      ref: this.__calcdexRef,
      'data-showdex': 'calcdex',
      'data-calcdex': 'panel',
    }));
  }
}
