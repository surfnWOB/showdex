/**
 * @file `HonkdexClassicBootstrapper.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.2.6
 */

import * as ReactDOM from 'react-dom/client';
import { type GenerationNum } from '@smogon/calc';
import { nonEmptyObject } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import { detectClassicHost } from '@showdex/utils/host';
import { BootdexClassicBootstrappable } from '../Bootdex/BootdexClassicBootstrappable';
import { MixinHonkdexBootstrappable } from './HonkdexBootstrappable';
import { HonkdexDomRenderer } from './HonkdexRenderer';

const l = logger('@showdex/pages/Honkdex/HonkdexClassicBootstrapper');

export class HonkdexClassicBootstrapper extends MixinHonkdexBootstrappable(BootdexClassicBootstrappable) {
  public static override readonly scope = l.scope;

  protected readonly roomId: `view-honkdex-${string}`;

  public static getHonkdexRoomId(instanceId: string): `view-honkdex-${string}` {
    return `view-honkdex-${instanceId}`;
  }

  /**
   * Creates a `Showdown.ClientHtmlRoom` via the `BootdexClassicBootstraappable`'s `createHtmlRoom()` that's specially made
   * to house a `Honkdex`.
   *
   * * honk honk
   *
   * @since 1.2.0
   */
  public static createHonkdexRoom(
    instanceId: string,
    focus?: boolean,
  ): Showdown.ClientHtmlRoom {
    if (!detectClassicHost(window)) {
      return null;
    }

    const honkdexRoom = (this as unknown as typeof BootdexClassicBootstrappable).createHtmlRoom(this.getHonkdexRoomId(instanceId), 'Honkdex', {
      side: true,
      icon: 'car',
      focus,
    });

    if (!honkdexRoom?.el) {
      return null;
    }

    honkdexRoom.reactRoot = ReactDOM.createRoot(honkdexRoom.el);

    return honkdexRoom;
  }

  protected renderHonkdex(dom: ReactDOM.Root): void {
    if (!detectClassicHost(window) || !this.instanceId || !dom) {
      return;
    }

    HonkdexDomRenderer(dom, {
      store: HonkdexClassicBootstrapper.Adapter?.store,
      instanceId: this.instanceId,
      onRequestHellodex: () => void HonkdexClassicBootstrapper.Manager?.openHellodex(),
      onRequestHonkdex: (...argv) => void HonkdexClassicBootstrapper.Manager?.openHonkdex(...argv),
      onLeaveRoom: () => void window.app.leaveRoom(HonkdexClassicBootstrapper.getHonkdexRoomId(this.instanceId)),
    });
  }

  public constructor(instanceId?: string, gen?: GenerationNum, format?: string) {
    super(instanceId, gen, format);

    if (!this.instanceId) {
      return;
    }

    this.roomId = HonkdexClassicBootstrapper.getHonkdexRoomId(this.instanceId);
  }

  public open(): void {
    if (!detectClassicHost(window) || !this.instanceId || !this.roomId) {
      return;
    }

    if (this.roomId in window.app.rooms) {
      return void window.app.focusRoomRight(this.roomId);
    }

    const honkdexRoom = HonkdexClassicBootstrapper.createHonkdexRoom(this.instanceId, true);

    this.prepare();
    this.renderHonkdex(honkdexRoom.reactRoot);
  }

  public close(): void {
    if (!detectClassicHost(window) || !this.roomId || !nonEmptyObject(window.app?.rooms)) {
      return;
    }

    window.app.leaveRoom(this.roomId);
  }

  public run(): void { // eslint-disable-line class-methods-use-this
    if (!detectClassicHost(window)) {
      throw new Error('HonkdexClassicBootstrapper can only be run in the classic Showdown Backbone.js client!');
    }
  }
}
