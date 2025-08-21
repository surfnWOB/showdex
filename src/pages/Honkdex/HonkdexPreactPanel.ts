/**
 * @file `HonkdexPreactPanel.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

/* eslint-disable max-classes-per-file */

import * as ReactDOM from 'react-dom/client';
import cx from 'classnames';
import {
  BootdexPreactBootstrappable,
  preact,
  PSPanelWrapper,
  PSRoom,
  PSRoomPanel,
} from '../Bootdex/BootdexPreactBootstrappable';
import { HonkdexDomRenderer } from './HonkdexRenderer';

export class HonkdexPreactRoom extends PSRoom {
  public override title = 'Honkdex';
  public override type = 'honkdex';
  public override readonly classType = 'honkdex';
  public override location = 'right' as const;
  public override noURL = true;
}

export class HonkdexPreactPanel extends PSRoomPanel<HonkdexPreactRoom> {
  public static readonly id = 'honkdex';
  public static readonly routes = ['honkdex', 'honkdex-*'];
  public static readonly Model = HonkdexPreactRoom;
  public static readonly location = 'right' as const;
  public static readonly icon = preact?.h('i', { class: cx('fa', 'fa-car'), 'aria-hidden': true });
  public static readonly title = 'Honkdex';

  // see Hellodex for more info on these shenanigans
  private readonly __honkdexRef = preact?.createRef<HTMLDivElement>();
  private __reactRoot?: ReactDOM.Root = null;

  public override componentDidMount() {
    super.componentDidMount();

    if (!this.__honkdexRef?.current || this.__reactRoot) {
      return;
    }

    const { room } = this.props;
    const { Adapter, Manager } = BootdexPreactBootstrappable;

    this.__reactRoot = ReactDOM.createRoot(this.__honkdexRef.current);

    HonkdexDomRenderer(this.__reactRoot, {
      store: Adapter.store,
      instanceId: room.id?.split('-').slice(1).join('-'),
      onRequestHellodex: () => void Manager?.openHellodex(),
      onRequestHonkdex: (...argv) => void Manager?.openHonkdex(...argv),
      onLeaveRoom: () => void window.PS.leave(room.id),
    });
  }

  public override componentWillUnmount() {
    super.componentWillUnmount();

    if (!this.__reactRoot) {
      return;
    }

    this.__reactRoot.unmount();
    this.__reactRoot = null;
  }

  public override render(): Showdown.Preact.VNode {
    const { room } = this.props;

    return preact?.h(PSPanelWrapper, { room }, preact?.h('div', {
      ref: this.__honkdexRef,
      'data-showdex': 'honkdex',
    }));
  }
}
