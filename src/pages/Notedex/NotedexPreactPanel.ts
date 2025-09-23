/**
 * @file `NotedexPreactPanel.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

/* eslint-disable max-classes-per-file */

import * as ReactDOM from 'react-dom/client';
import cx from 'classnames';
import { detectPreactHost } from '@showdex/utils/host';
import {
  BootdexPreactBootstrappable,
  preact,
  PSPanelWrapper,
  PSRoom,
  PSRoomPanel,
} from '../Bootdex/BootdexPreactBootstrappable';
import { NotedexDomRenderer } from './NotedexRenderer';

export class NotedexPreactRoom extends PSRoom {
  public override title = 'Notedex';
  public override type = 'notedex';
  public override readonly classType = 'notedex';
  public override location = 'right' as const;
  public override noURL = true;
}

export class NotedexPreactPanel extends PSRoomPanel<NotedexPreactRoom> {
  public static readonly id = 'notedex';
  public static readonly routes = ['notedex', 'notedex-*'];
  public static readonly Model = NotedexPreactRoom;
  public static readonly location = 'right' as const;
  public static readonly icon = preact?.h('i', { class: cx('fa', 'fa-sticky-note'), 'aria-hidden': true });
  public static readonly title = 'Notedex';

  private readonly __notedexRef = preact?.createRef<HTMLDivElement>();
  private __reactRoot?: ReactDOM.Root = null;

  public override componentDidMount() {
    super.componentDidMount();

    if (!detectPreactHost(window) || !this.__notedexRef?.current || this.__reactRoot) {
      return;
    }

    const { room } = this.props;
    const { Adapter } = BootdexPreactBootstrappable;

    this.__reactRoot = ReactDOM.createRoot(this.__notedexRef.current);

    NotedexDomRenderer(this.__reactRoot, {
      store: Adapter.store,
      instanceId: room.id?.split('-').slice(1).join('-'),
      onLeaveRoom: () => void window.PS.leave(room.id),
    });
  }

  public override componentWillUnmount() {
    super.componentWillUnmount();

    if (!detectPreactHost(window) || !this.__reactRoot) {
      return;
    }

    this.__reactRoot.unmount();
    this.__reactRoot = null;
  }

  public override render(): Showdown.Preact.VNode {
    const { room } = this.props;

    return preact?.h(PSPanelWrapper, { room }, preact?.h('div', {
      ref: this.__notedexRef,
      'data-showdex': 'notedex',
    }));
  }
}
