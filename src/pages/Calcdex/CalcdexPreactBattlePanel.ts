/**
 * @file `CalcdexPreactBattlePanel.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

/* eslint-disable max-classes-per-file */

import type * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import cx from 'classnames';
import { calcdexSlice } from '@showdex/redux/store';
import { tRef } from '@showdex/utils/app';
import { logger } from '@showdex/utils/debug';
import { detectPreactHost } from '@showdex/utils/host';
// import { BootdexManager as Manager } from '../Bootdex/BootdexManager';
import { BootdexPreactAdapter as Adapter } from '../Bootdex/BootdexPreactAdapter';
import { preact } from '../Bootdex/BootdexPreactBootstrappable';
import { CalcdexPreactBattle } from './CalcdexPreactBattle';
import styles from './Calcdex.module.scss';

const PSBattleRoom = detectPreactHost(window) ? window.BattleRoom : null;
const PSBattlePanel = detectPreactHost(window) ? window.BattlePanel : null;

const l = logger('@showdex/pages/Calcdex/CalcdexPreactBattlePanel');

// make this a util, maybe? o_O
const findNamedIndex = (
  children: Showdown.Preact.ComponentChildren,
  name: string,
): number => preact?.toChildArray(children).findIndex((c) => (
  typeof c === 'string'
    ? c === name
    : typeof c?.type === 'string'
      ? c.type === name
      : c?.type?.name === name
));

export class CalcdexPreactBattleRoom extends PSBattleRoom {
  public static readonly scope = l.scope;

  public declare battle: CalcdexPreactBattle;

  public constructor(props: ConstructorParameters<typeof PSBattleRoom>[0]) {
    super(props);

    this.clientCommands = {
      ...this.clientCommands,
      ...this.parseClientCommands({
        calcdex(argv: string) {
          const [target, command] = argv.split('\x20');

          l.debug(
            'RECV', '/calcdex', argv,
            '\n', 'argv', '(target)', target, '(command)', command,
            '\n', 'battle.id', this.battle?.id,
          );

          // i.e., '/calcdex overlay toggle', where argv = 'overlay toggle'.split('\x20') -> ['overlay', 'toggle']
          if (
            !this.battle?.id
              || this.calcdexState?.renderMode !== 'overlay'
              || (target !== 'overlay' && command !== 'toggle')
          ) {
            return;
          }

          const visible = !this.calcdexState?.overlayVisible;

          Adapter.store.dispatch(calcdexSlice.actions.update({
            scope: `${l.scope}:CalcdexPreactBattleRoom:clientCommands.calcdex()`,
            battleId: this.battle.id,
            // overlayVisible: !this.calcdexState?.overlayVisible,
            overlayVisible: visible,
          }));

          /* if (visible) {
            this.battle.calcdexReactRenderer?.();
          } */

          this.update(null);
        },
      }),
    };
  }

  public get calcdexState() {
    return Adapter.rootState?.calcdex?.[this.battle?.id];
  }

  protected get calcdexSettings() { // eslint-disable-line class-methods-use-this
    return Adapter?.rootState?.showdex?.settings?.calcdex;
  }

  public override receiveLine(args: Showdown.Args): void {
    switch (args[0]) {
      // e.g., '|win|showdex_testee' -> args = ['win', 'showdex_testee']
      case 'win': {
        if (!args[1]) {
          break;
        }

        this.battle.calcdexWinHandler?.(args[1]);

        break;
      }

      default: {
        break;
      }
    }

    super.receiveLine(args);

    /* if (
      !this.battle?.id
        || this.battle.calcdexInit
        || !this.battle.p1?.pokemon?.length
        || !this.battle.p2?.pokemon?.length
    ) {
      return;
    }

    Manager.runCalcdex(this.battle.id); */
  }

  public override destroy(): void {
    if (!detectPreactHost(window)) {
      return void super.destroy();
    }

    if (this.battle.calcdexStateInit) {
      l.debug('destroy()', 'calcdexSettings.closeOn', this.calcdexSettings?.closeOn, 'this.battle.calcdexRoomId', this.battle.calcdexRoomId);
      if (this.calcdexSettings?.closeOn === 'battle-tab' && this.battle.calcdexRoomId) {
        window.PS.leave(this.battle.calcdexRoomId);
      }

      this.battle.calcdexStateInit = false;
      this.battle.calcdexDestroyed = true;

      if (this.battle.calcdexAsOverlay || this.calcdexSettings?.destroyOnClose) {
        Adapter.store.dispatch(calcdexSlice.actions.destroy(this.battle.id));
      }

      this.battle.destroy();
    }

    super.destroy();
  }
}

/** @todo switch to overlay <-> panel buttons or something lol -keith (2025/08/14) */
export class CalcdexPreactBattlePanel extends PSBattlePanel<CalcdexPreactBattleRoom> {
  public static readonly scope = l.scope;
  public static readonly Model = CalcdexPreactBattleRoom;

  // only used for Calcdexes w/ the 'overlay' renderMode
  // (note: ReactDOM.Root is inside the CalcdexPreactBattle)
  private readonly __calcdexRef = preact?.createRef<HTMLDivElement>();
  // private __calcdexVNode?: Showdown.Preact.VNode = null;

  protected get renderAsOverlay() {
    const { room } = this.props;
    const { renderMode } = room?.calcdexState || {};

    return room?.battle?.calcdexAsOverlay || renderMode === 'overlay';
  }

  public override componentDidMount() {
    const { room } = this.props;

    if (!detectPreactHost(window) || !room?.id) {
      return void super.componentDidMount();
    }

    room.battle = room.battle ? CalcdexPreactBattle.fromBattle(room.battle, room) : new CalcdexPreactBattle({
      id: room.id as unknown as Showdown.ID,
      $frame: $(this.base).find('.battle'),
      $logFrame: $(this.base).find('.battle-log'),
      log: room.backlog?.map((logs) => `|${logs?.join('|') || ''}`),
    });

    // room.battle.calcdexReactRef = preact.createRef<HTMLDivElement>();

    super.componentDidMount(); // will use any existing room.battle, if defined
  }

  public override componentWillUnmount() {
    const { room } = this.props;

    if (this.renderAsOverlay && room?.battle?.calcdexStateInit) {
      this.lockMobileZoom(false);
      room.battle.destroy();
    }

    super.componentWillUnmount();
  }

  protected lockMobileZoom(forceLock?: boolean): void {
    const { room } = this.props;
    const { overlayVisible } = room?.calcdexState || {};

    if (!this.renderAsOverlay || typeof $ !== 'function') {
      return;
    }

    const $existingMeta = $('meta[data-calcdex*="no-mobile-zoom"]');
    const nextContent = [
      'width=device-width',
      ...(forceLock ?? overlayVisible ? [
        'initial-scale=1',
        'maximum-scale=1',
      ] : ['user-scalable=yes']),
    ].join(',\x20');

    if (!$existingMeta.length) {
      return void $('head').append(`
        <meta
          name="viewport"
          content="${nextContent}"
          data-calcdex="no-mobile-zoom"
        />
      `);
    }

    $existingMeta.attr('content', nextContent);
  }

  protected renderToggleButton(): Showdown.Preact.VNode {
    const { room } = this.props;
    const { overlayVisible } = room?.calcdexState || {};

    if (!this.renderAsOverlay) {
      return null;
    }

    const toggleButtonIcon = overlayVisible ? 'close' : 'calculator';
    const toggleButtonLabel = (
      typeof tRef.value === 'function'
        && tRef.value(`calcdex:overlay.control.${overlayVisible ? '' : 'in'}activeLabel`, '')
    ) || `${overlayVisible ? 'Close' : 'Open'} Calcdex`;

    // note: since I'm too lazy to figure out how to get Preact & React to play nicely in JSX-land (probably just adding 'preact' as a dep),
    // we're rendering the Preact manually via the preact.h() (alias of preact.createElement()) function
    // (equivalent to the inline injectToggleButton() helper in the prepareOverlay() method of the CalcdexClassicBootstrapper)
    return preact.h('button', {
      type: 'button',
      class: 'button',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        columnGap: '0.4em',
      },
      name: 'toggleCalcdexOverlay',
      'data-cmd': '/calcdex overlay toggle',
      disabled: !room.battle?.calcdexInit,
    }, ...[
      preact.h('i', { class: cx('fa', `fa-${toggleButtonIcon}`), 'aria-hidden': true }),
      preact.h('span', null, toggleButtonLabel),
    ]);
  }

  protected renderCalcdexOverlay(): Showdown.Preact.VNode {
    const { room } = this.props;
    const { overlayVisible } = room?.calcdexState || {};

    if (!this.renderAsOverlay) {
      return null;
    }

    // if (room?.battle?.id && !room.battle.calcdexReactRoot && this.__calcdexRef.current) {
    if (overlayVisible && room?.battle?.id && this.__calcdexRef.current) {
    // if (room?.battle?.id && !room.battle.calcdexReactRoot && room?.battle?.calcdexReactRef?.current) {
      if (!room.battle.calcdexReactRoot) {
        room.battle.calcdexReactRoot = ReactDOM.createRoot(this.__calcdexRef.current);
      }

      // room.battle.calcdexReactRoot = ReactDOM.createRoot(room.battle.calcdexReactRef.current);
      room.battle.calcdexReactRenderer?.();
    }

    /* if (!this.__calcdexVNode) {
      this.__calcdexVNode = preact.h('div', {
        ref: this.__calcdexRef,
        // ref: room?.battle?.calcdexReactRef,
        class: styles.overlayContainer,
        // ...(!overlayVisible && { style: { display: 'none' } }),
        'data-showdex': 'calcdex',
        'data-calcdex': 'overlay',
      });
    }

    this.__calcdexVNode = preact.cloneElement(this.__calcdexVNode, {
      style: overlayVisible ? {} : { display: 'none' },
    });

    return this.__calcdexVNode; */

    return preact.h('div', {
      ref: this.__calcdexRef,
      class: styles.overlayContainer,
      ...(!overlayVisible && { style: { display: 'none' } }),
      // style: overlayVisible ? {} : { display: 'none' },
      'data-showdex': 'calcdex',
      'data-calcdex': 'overlay',
    });
  }

  // in the Showdown 'preact' rewrite, there are 2 battle panel layouts: one for room.width < 700 & the other for >= 700;
  // instead of using the `float` CSS prop (as the 'classic' Backbone.js client host does), the rewrite absolutely positions
  // "floaty" buttons, including the <TimerButton>, which may not exist, such as when you're spectating; since we want
  // to position the Calcdex overlay button in a similar fashion to the 'classic' host, we'll look for these buttons,
  // wrap them in a <div> w/ the same absolute positioning & add the original buttons into it + our Calcdex button
  public override render() {
    const { room } = this.props;
    const { overlayVisible } = room?.calcdexState || {};

    const panel = super.render();
    // const panelChildren = preact.toChildArray(panel.props.children);

    // both layouts are wrapped in a <PSPanelWrapper>, which renders all of its props.children[] into a <div>
    // (also note: panel.props.children wouldn't be an array if it was only rendering a single child, which if we're expecting
    // the proper virtual DOM for this BattlePanel, wouldn't be the case! [we're expecting lots of children, i.e., an array])
    // if (!this.renderAsOverlay || !Array.isArray(panel.props.children)) {
    if (!this.renderAsOverlay) {
      return panel;
    }

    // panel.props.children.push(this.renderCalcdexOverlay());
    panel.props.children = [
      ...(Array.isArray(panel.props.children) ? panel.props.children : [panel.props.children]),
      this.renderCalcdexOverlay(),
    ].filter(Boolean);

    // both layouts also render a ChatLog, ChatTextEntry & ChatUserList; since we're unable to modify the styling of them
    // (as their rendered container `style` props aren't exposed [tho some have the `class` name prop, like ChatLog]),
    // we'll just temporarily yeet them from this render() tick hehe lolol
    // (also we're still dealing in Preact virtual DOM nodes, so we can't use some jQuery $() magic here like in 'classic')
    if (overlayVisible) {
      // note: <ChatLog> will render a <div> in a <div>
      /* const chatLogIndex = findNamedIndex(panel.props.children, 'ChatLog');
      // const chatLog = panel.props.children[chatLogIndex] as Showdown.Preact.VNode;

      if (chatLogIndex > -1) {
        panel.props.children.splice(chatLogIndex, 1);
      } */

      const chatEntryIndex = findNamedIndex(panel.props.children, 'ChatTextEntry');

      if (chatEntryIndex > -1) {
        panel.props.children.splice(chatEntryIndex, 1);
      }

      /* const chatUserIndex = findNamedIndex(panel.props.children, 'ChatUserList');

      if (chatUserIndex > -1) {
        panel.props.children.splice(chatUserIndex, 1);
      } */

      // panel.props.children.push(this.renderCalcdexOverlay());
    }

    this.lockMobileZoom();

    // for the mobile layout (i.e., room.width < 700), we'll insert the Calcdex button to the right of the "Battle options"
    // button, which sits right beneath the <BattleDiv> (i.e., <div> containing all the pretty sprites & animations)
    // (note: the <TimerButton>, if rendered, is absolutely positioned top-right-ish above the <BattleDiv>)
    if (room?.width < 700) {
      // looking for:
      // <button data-href="battleoptions" ...>Battle options</button>
      const optionsButtonIndex = panel.props.children.findIndex((c) => (
        typeof c !== 'string' // since children[] is of type (string | VNode)[]
          && c?.props?.['data-href'] === 'battleoptions'
      ));

      if (optionsButtonIndex < 0) {
        return panel;
      }

      // note: the `style` prop may or may not be hydrated into an inline CSS string from its JSX object variant,
      // depending on how it's originally defined, e.g.:
      // props = { ..., style: { position: 'absolute', right: '75px', top: this.battleHeight } } (OR)
      // props = { ..., style: 'position: absolute;right: 75px;top: 247px;' }
      // (but for now, since I'm lazy, I'm just gunna assume it's a React.CSSProperties object [i.e., the former] lol)
      const optionsButton = panel.props.children[optionsButtonIndex] as Showdown.Preact.VNode;
      const { style: optionsButtonStyle } = optionsButton.props as Record<'style', React.CSSProperties | string>;

      // we're essentially moving its inlined CSS to the parent <div> container that will take its place
      delete (optionsButton.props as Record<'style', React.CSSProperties>).style;

      panel.props.children[optionsButtonIndex] = preact.h('div', {
        style: {
          position: 'absolute',
          top: this.battleHeight,
          ...(typeof optionsButtonStyle === 'string' ? null : optionsButtonStyle),
          right: 10, // overriding the `right: 75px` lol
          display: 'flex',
          alignItems: 'center',
          columnGap: 6,
        },
        'data-calcdex': 'overlay-controls',
        'data-calcdex-target': 'battle-options',
      }, ...[
        optionsButton,
        this.renderToggleButton(),
      ]);

      return panel;
    }

    // for the desktop layout (i.e., room.width >= 700), if the <TimerButton> exists, we'll insert the Calcdex button to
    // the right of it; otherwise, we'll insert the Calcdex button where the <TimerButton> would've been
    // (note: we'll find these nested inside the panel.props.children[]'s <div class="battle-controls-container">
    // <div class="battle-controls" ...><!-- ... in here ... --></div></div>)
    const battleControlsContainer = panel.props.children.find((c) => (
      typeof c !== 'string'
        && (c?.props as Record<'class', string>)?.class === 'battle-controls-container'
    )) as Showdown.Preact.VNode;

    const battleControlsContainerChildren = preact.toChildArray(battleControlsContainer?.props?.children);

    if (!battleControlsContainerChildren?.length) {
      return panel;
    }

    const battleControls = battleControlsContainerChildren.find((c) => (
      typeof c !== 'string'
        && (c?.props as Record<'class', string>)?.class === 'battle-controls'
    )) as Showdown.Preact.VNode;

    const battleControlsChildren = preact.toChildArray(battleControls?.props?.children);

    if (!battleControlsChildren?.length) {
      return panel;
    }

    // note: timerButton will be undefined if timerButtonIndex is -1
    const timerButtonIndex = findNamedIndex(battleControlsChildren, 'TimerButton');
    const timerButton = battleControlsChildren[timerButtonIndex] as Showdown.Preact.VNode;

    if (timerButtonIndex > -1) {
      delete (timerButton.props as Record<'style', React.CSSProperties>).style;

      if (Array.isArray(battleControls.props.children)) {
        battleControls.props.children.splice(timerButtonIndex, 1);
      }
    }

    const wrappedOverlayControls = preact.h('div', {
      style: {
        position: 'absolute',
        top: 0,
        right: 10,
        display: 'flex',
        alignItems: 'center',
        columnGap: 6,
      },
      'data-calcdex': 'overlay-controls',
      'data-calcdex-target': 'battle-timer',
    }, ...[
      timerButton,
      this.renderToggleButton(),
    ].filter(Boolean));

    battleControls.props.children = [
      wrappedOverlayControls,
      ...(Array.isArray(battleControls.props.children) ? battleControls.props.children : [battleControls.props.children]),
    ];

    return panel;
  }
}
