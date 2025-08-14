/**
 * @file `CalcdexClassicBootstrapper.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.2.6
 */

import * as ReactDOM from 'react-dom/client';
import { type GenerationNum } from '@smogon/calc';
import { NIL as NIL_UUID } from 'uuid';
import {
  type CalcdexPlayer,
  type CalcdexPlayerKey,
  type CalcdexPokemon,
  CalcdexPlayerKeys as AllPlayerKeys,
} from '@showdex/interfaces/calc';
import { syncBattle } from '@showdex/redux/actions';
import { calcdexSlice } from '@showdex/redux/store';
import { tRef } from '@showdex/utils/app';
import {
  clonePlayerSideConditions,
  detectAuthPlayerKeyFromBattle,
  sanitizePlayerSide,
  similarPokemon,
  usedDynamax,
  usedTerastallization,
} from '@showdex/utils/battle';
import { calcBattleCalcdexNonce } from '@showdex/utils/calc';
import { clamp, formatId, nonEmptyObject } from '@showdex/utils/core';
import { logger, wtf } from '@showdex/utils/debug';
import { detectGenFromFormat } from '@showdex/utils/dex';
import { detectClassicHost } from '@showdex/utils/host';
import { type BootdexClassicAdapter } from '../Bootdex/BootdexClassicAdapter';
import { BootdexClassicBootstrappable } from '../Bootdex/BootdexClassicBootstrappable';
import { MixinCalcdexBootstrappable } from './CalcdexBootstrappable';
import { CalcdexDomRenderer } from './CalcdexRenderer';
import styles from './Calcdex.module.scss';

/**
 * Object containing the function's `name` & its binded `native()` function.
 *
 * * Probably could've been typed better, but not trying to wrangle TypeScript rn lol.
 *
 * @since 1.0.3
 */
interface BattleRoomOverride<
  TFunc extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown,
> {
  name: FunctionPropertyNames<Showdown.ClientBattleRoom>;
  native: TFunc;
}

const l = logger('@showdex/pages/Calcdex/CalcdexClassicBootstrapper');

export class CalcdexClassicBootstrapper extends MixinCalcdexBootstrappable(BootdexClassicBootstrappable) {
  public static override readonly scope = l.scope;

  public static getCalcdexRoomId(battleId: string): `view-calcdex-${string}` {
    return `view-calcdex-${formatId(battleId)}`;
  }

  /**
   * Creates a `Showdown.ClientHtmlRoom` via the `BootdexClassicBootstrappable`'s `createHtmlRoom()` that's specially made
   * to house a `Calcdex`.
   *
   * * Essentially exists to keep all the properties like the room name & icon consistent.
   * * ~~Provide the optional Redux `store` argument to supply the room's `requestLeave()` handler,
   *   which will update the corresponding `Showdown.ClientBattleRoom` & `CalcdexBattleState`, if any,
   *   when the user leaves the room.~~
   * * As of v1.1.5, this will create a `ReactDOM.Root` from the `Showdown.ClientHtmlRoom`'s `el` (`HTMLDivElement`),
   *   accessible under the `reactRoot` property.
   *   - When this room's `requestLeave()` is called (typically by `app.leaveRoom()` or the user closing the tab),
   *     `reactRoot.unmount()` will be automatically called.
   * * As of v1.2.6, this is now inside the `CalcdexClassicBootstrapper` to keep logic separate from those used for the
   *   rewritten `'preact'` Showdown client.
   *   - As a result, the Redux `store` is no longer a function argument.
   *
   * @since 1.0.3
   */
  public static createCalcdexRoom(
    battleId: string,
    focus?: boolean,
  ): Showdown.ClientHtmlRoom {
    if (!detectClassicHost(window) || !battleId) {
      return null;
    }

    const { rootState, store } = this.Adapter || {};
    const settings = rootState?.showdex?.settings?.calcdex;

    // if the openOnPanel setting is falsy, default to the 'showdown' behavior
    const side = settings?.openOnPanel === 'right' || (
      (!settings?.openOnPanel || settings.openOnPanel === 'showdown')
        && !window.Dex?.prefs('rightpanelbattles')
    );

    const calcdexRoomId = this.getCalcdexRoomId(battleId);
    const calcdexRoom = (this as unknown as typeof BootdexClassicBootstrappable).createHtmlRoom(calcdexRoomId, 'Calcdex', {
      side,
      icon: 'calculator',
      focus,
      maxWidth: 650,
    });

    if (!calcdexRoom?.el) {
      return calcdexRoom;
    }

    calcdexRoom.reactRoot = ReactDOM.createRoot(calcdexRoom.el);
    calcdexRoom.requestLeave = () => {
      // check if there's a corresponding ClientBattleRoom for this Calcdex room
      // (app should be available here; otherwise, createHtmlRoom() would've returned null)
      const battle = (window.app.rooms?.[battleId] as Showdown.ClientBattleRoom)?.battle;

      if (battle?.id) {
        delete battle.calcdexRoom;
      }

      // unmount the reactRoot we created earlier
      // (if destroyOnClose is false, the reactRoot will be recreated when the user selects the
      // battle in the Hellodex instances list [via openCalcdexInstance() -> createCalcdexRoom()])
      calcdexRoom.reactRoot?.unmount?.();

      // we need to grab a fresher version of the state when this function runs
      // (i.e., do NOT use calcdexSettings here! it may contain a stale version of the settings)
      const freshSettings = rootState?.showdex?.settings?.calcdex;

      if (freshSettings?.destroyOnClose) {
        // clean up allocated memory from Redux for this Calcdex instance
        store.dispatch(calcdexSlice.actions.destroy(battleId));

        if (battle?.id) {
          // technically calcdexReactRoot would only exist for battle-overlayed Calcdexes,
          // but calling it here just in case I screwed something up LOL
          battle.calcdexReactRoot?.unmount?.();
          battle.calcdexDestroyed = true;
        }
      }

      // actually leave the room
      return true;
    };

    return calcdexRoom;
  }

  protected get battleRoom() {
    if (
      !detectClassicHost(window)
        || !nonEmptyObject(window.app?.rooms)
        || !this.battleId?.startsWith?.('battle-')
    ) {
      return null;
    }

    return window.app.rooms[this.battleId] as Showdown.ClientBattleRoom;
  }

  protected get battle() {
    return this.battleRoom?.battle;
  }

  protected override startTimer(): void {
    super.startTimer(CalcdexClassicBootstrapper.scope);
  }

  protected renderCalcdex(dom: ReactDOM.Root): void {
    if (!detectClassicHost(window) || !this.battleId || !dom) {
      return;
    }

    CalcdexDomRenderer(dom, {
      store: CalcdexClassicBootstrapper.Adapter?.store,
      battleId: this.battleId,
      onUserPopup: (u) => void (CalcdexClassicBootstrapper as unknown as typeof BootdexClassicBootstrappable).openUserPopup?.(u),
      onRequestHellodex: () => void CalcdexClassicBootstrapper.Manager?.openHellodex(),
      onRequestHonkdex: (id) => void CalcdexClassicBootstrapper.Manager?.openHonkdex(id),
      onCloseOverlay: () => void this.battleRoom?.toggleCalcdexOverlay?.(),
    });
  }

  public open(): void {
    if (!detectClassicHost(window) || !this.battleState?.battleId) {
      return;
    }

    const { store } = CalcdexClassicBootstrapper.Adapter || {};

    // check if the Calcdex is rendered as an overlay for this battle
    if (this.battleState.renderMode === 'overlay') {
      // if we're not even in the battleRoom anymore, destroy the state
      if (!window.app.rooms?.[this.battleId]?.id) {
        return void store.dispatch(calcdexSlice.actions.destroy(this.battleId));
      }

      const shouldFocus = !window.app.curRoom?.id || window.app.curRoom.id !== this.battleId;

      if (shouldFocus) {
        window.app.focusRoom(this.battleId);
      }

      // we'll toggle it both ways here (only if we didn't have to focus the room),
      // for use as an "emergency exit" (hehe) should the "Close Calcdex" go missing...
      // but it shouldn't tho, think I covered all the bases... hopefully :o
      if (!shouldFocus || !this.battleState.overlayVisible) {
        this.battleRoom.toggleCalcdexOverlay?.();
      }

      // for overlays, this is all we'll do since the Calcdex is rendered inside the battle frame
      // (entirely possible to do more like reopen as a tab later, but for v1.0.3, nah)
      return;
    }

    // check if the Calcdex tab is already open
    const calcdexRoomId = CalcdexClassicBootstrapper.getCalcdexRoomId(this.battleId);

    if (calcdexRoomId in window.app.rooms) {
      // no need to call app.topbar.updateTabbar() since app.focusRoomRight() will call it for us
      // (app.focusRoomRight() -> app.updateLayout() -> app.topbar.updateTabbar())
      window.app.focusRoomRight(calcdexRoomId);
    } else {
      // at this point, we need to recreate the room
      // (we should also be in the 'panel' renderMode now)
      const calcdexRoom = CalcdexClassicBootstrapper.createCalcdexRoom(this.battleId, true);

      this.renderCalcdex(calcdexRoom.reactRoot);

      // if the battleRoom exists, attach the created room to the battle object
      if (this.battleRoom?.battle?.id) {
        this.battleRoom.battle.calcdexDestroyed = false; // just in case
        this.battleRoom.battle.calcdexRoom = calcdexRoom;
      }
    }

    // refocus the battleRoom that the tabbed Calcdex pertains to, if still joined
    if ((!window.app.curRoom?.id || window.app.curRoom.id !== this.battleId) && this.battleId in window.app.rooms) {
      window.app.focusRoom(this.battleId);
    }
  }

  public close(): void {
    if (!detectClassicHost(window) || !this.battleId || !nonEmptyObject(window.app?.rooms)) {
      return;
    }

    const calcdexRoomId = CalcdexClassicBootstrapper.getCalcdexRoomId(this.battleId);

    if (calcdexRoomId in window.app.rooms) {
      window.app.leaveRoom(calcdexRoomId);
    }

    if (this.battleId in window.app.rooms) {
      window.app.leaveRoom(this.battleId);
    }
  }

  public destroy(): void {
    if (!detectClassicHost(window) || !this.battleId) {
      return;
    }

    const { Adapter } = CalcdexClassicBootstrapper;

    this.close();
    (Adapter as typeof BootdexClassicAdapter).removeReceiver(this.battleId);
    Adapter.store.dispatch(calcdexSlice.actions.destroy(this.battleId));
  }

  public override run(data?: string): void {
    if (!detectClassicHost(window)) {
      return;
    }

    this.startTimer();

    l.silly(
      'Calcdex classic bootstrapper was invoked;',
      'determining if there\'s anything to do...',
      '\n', 'battleId', this.battleId,
    );

    if (!this.battleId?.startsWith?.('battle-')) {
      l.debug(
        'Calcdex classic bootstrap request was ignored for battleId', this.battleId,
        'since it\'s not a ClientBattleRoom',
      );

      return void this.endTimer('(wrong room)');
    }

    const { authUsername, rootState, store } = CalcdexClassicBootstrapper.Adapter || {};

    if (!this.battle?.id) {
      const { calcdex: state } = rootState || {};

      // we'd typically reach this point when the user forfeits through the popup
      if (!(this.battleId in (state || {}))) {
        l.debug(
          'Calcdex classic bootstrap request was ignored for battleId', this.battleId,
          'since no proper battle object exists within the current ClientBattleRoom',
        );

        return void this.endTimer('(no battle)');
      }

      const battleState = state[this.battleId];

      if (battleState?.active) {
        store.dispatch(calcdexSlice.actions.update({
          scope: l.scope,
          battleId: this.battleId,
          active: false,
        }));
      }

      const { calcdex: settings } = rootState?.showdex?.settings || {};
      const calcdexRoomId = CalcdexClassicBootstrapper.getCalcdexRoomId(this.battleId);

      if (
        battleState.renderMode === 'panel'
          && settings?.closeOn !== 'never'
          && calcdexRoomId in window.app.rooms
      ) {
        l.debug(
          'Leaving calcdexRoom with destroyed battle due to user settings...',
          '\n', 'calcdexRoomId', calcdexRoomId,
        );

        // this will destroy the Calcdex state if configured to, via calcdexRoom's requestLeave() handler
        window.app.leaveRoom(calcdexRoomId);

        // update (2023/02/04): did I forget a return here? ...probably cause it keeps triggering the return from
        // the typeof battle?.subscribe check
        return void this.endTimer('(calcdex destroyed)');
      }

      l.debug(
        'Calcdex for battleId', this.battleId, 'exists in state, but battle was forcibly ended, probably.',
        '\n', 'battleRoom', this.battleRoom,
        '\n', 'battleState', battleState,
      );

      // update (2023/02/04): might as well put a return here too since this is part of the !battle?.id handler
      return void this.endTimer('(battle destroyed)');
    }

    // update (2023/07/27): check for '|noinit|' or '|nonexistent|' in the `data` & if present, ignore initializing this battle,
    // e.g., '|noinit|nonexistent|The room "battle-gen1ubers-1911645170-ygxif0uoljetvrkksj6dcge3w43xx8wpw" does not exist.'
    // (typically occurs when you AFK in a BattleRoom, your computer sleeps, you come back later & select "Reconnect", refreshing the page)
    // note that we're not checking the stepQueue since it could be uninitialized/empty at this point, so we just wanna read what the client
    // received from the server in this moment (which is formatted as a single stepQueue entry in `data`)
    const stepFromData = data?.split?.('\n')[1];
    const shouldNotInit = stepFromData?.startsWith('|noinit|nonexistent|')
      // these last 2 checks may backfire on me lmao
      && stepFromData.includes('The room "')
      && stepFromData.endsWith('" does not exist.');

    if (shouldNotInit) {
      l.debug(
        'Calcdex classic bootstrap request was ignored for battleId', this.battleId,
        'since the battle is marked as nonexistent & shouldn\'t be initialized',
        '\n', 'stepFromData', stepFromData,
      );

      return void this.endTimer('(noinit battle)');
    }

    if (typeof this.battle?.subscribe !== 'function') {
      l.warn(
        'Must have some jank battle object cause battle.subscribe() is apparently type',
        wtf(this.battle?.subscribe), // eslint-disable-line @typescript-eslint/unbound-method
      );

      return void this.endTimer('(bad battle)');
    }

    // don't process this battle if we've already added (or forcibly prevented) the filth
    if (this.battle.calcdexInit) {
      // force a battle sync if we've received some data, but the active battle is just idling
      if (this.battle.calcdexStateInit && this.battle.atQueueEnd) {
        this.battle.subscription('atqueueend');
      }

      return void this.endTimer('(already filthy)');
    }

    // delaying initialization if the battle hasn't instantiated all the players yet
    // (which we can quickly determine by the existence of '|player|' steps in the stepQueue)
    if (!this.battle.stepQueue?.length || !this.battle.stepQueue.some((q) => q?.startsWith('|player|'))) {
      l.debug(
        'Ignoring Calcdex init due to uninitialized players in battle',
        '\n', 'stepQueue', this.battle.stepQueue,
        '\n', 'battleId', this.battle.id || this.battleId,
        '\n', 'battle', this.battle,
      );

      return void this.endTimer('(uninit players)');
    }

    // note: anything below here executes once per battle
    const { calcdex: calcdexSettings } = rootState?.showdex?.settings || {};

    // determine if we should even init the Calcdex based on the openOnStart setting
    // (purposefully ignoring 'always', obviously)
    if (['playing', 'spectating', 'never'].includes(calcdexSettings?.openOnStart)) {
      const authPlayer = !!detectAuthPlayerKeyFromBattle(this.battle);

      // for 'playing', checking if there's no authPlayer cause the user would be a spectator;
      // likewise for 'spectating', checking if there is an authPlayer cause the user would be a player
      const preventInit = calcdexSettings.openOnStart === 'never'
        || (calcdexSettings.openOnStart === 'playing' && !authPlayer)
        || (calcdexSettings.openOnStart === 'spectating' && authPlayer);

      if (preventInit) {
        return void this.endTimer('(calcdex denied)');
      }
    }

    // update (2023/02/01): used to be in the battle object as calcdexReactRoot, but post-refactor, we no longer
    // need to keep a reference in the battle object (Hellodex will create a new root via ReactDOM.createRoot() btw)
    // update (2023/04/22): jk, we need a reference to it now in order to call calcdexReactRoot.unmount() --
    // just in the debug logs that the React roots of already closed battles (in the same session) are still mounted!
    // the ReactDOM.Root will be stored in battle.calcdexRoom.reactRoot for panel tabs & (rather confusingly)
    // battle.calcdexReactRoot for battle overlays (potentially could rename it to calcdexOverlayReactRoot... LOL)
    // let calcdexReactRoot: ReactDOM.Root;

    const openAsPanel = !calcdexSettings?.openAs
      || calcdexSettings.openAs === 'panel'
      || (calcdexSettings.openAs === 'showdown' && !BootdexClassicBootstrappable.hasSinglePanel());

    if (openAsPanel) {
      // create the calcdexRoom if it doesn't already exist (shouldn't tho)
      // update (2023/04/22): createCalcdexRoom() will also create a ReactDOM.Root under reactRoot
      if (!this.battle.calcdexRoom) {
        this.battle.calcdexRoom = CalcdexClassicBootstrapper.createCalcdexRoom(this.battleId, true);
      }

      // handle destroying the Calcdex when leaving the battleRoom
      const requestLeave = this.battleRoom.requestLeave.bind(this.battleRoom) as Showdown.ClientBattleRoom['requestLeave'];

      this.battleRoom.requestLeave = (e) => {
        const shouldLeave = requestLeave(e);

        // ForfeitPopup probably appeared
        if (!shouldLeave) {
          // similar to the battle overlay, we'll override the submit() handler of the ForfeitPopup
          const forfeitPopup = window.app.popups.find((p) => (p as Showdown.ForfeitPopup).room === this.battleRoom);

          if (typeof forfeitPopup?.submit === 'function') {
            l.debug(
              'Overriding submit() of spawned ForfeitPopup in app.popups[]...',
              '\n', 'battleId', this.battleId,
            );

            const submitForfeit = forfeitPopup.submit.bind(forfeitPopup) as typeof forfeitPopup.submit;

            // unlike the battle overlay, we'll only close if configured to (and destroy if closing the room)
            forfeitPopup.submit = (...args) => {
              const calcdexRoomId = CalcdexClassicBootstrapper.getCalcdexRoomId(this.battleId);

              // grab the current settings
              const { calcdex: settings } = rootState?.showdex?.settings || {};

              if (settings?.closeOn !== 'never' && calcdexRoomId && calcdexRoomId in (window.app.rooms || {})) {
                // this will trigger calcdexRoom's requestLeave() handler,
                // which may destroy the state depending on the user's settings
                window.app.leaveRoom(calcdexRoomId);
              }

              this.updateBattleRecord('loss');

              // call ForfeitPopup's original submit() handler
              // (note: should be a `void` return, but `return`'ing here shouldn't hurt in case it isn't)
              return submitForfeit(...args);
            };
          }

          // don't actually leave the room, as requested by requestLeave()
          return false;
        }

        // actually leave the room
        return true;
      };
    } else { // must be opening as an overlay here
      const {
        $el,
        $chatFrame,
        $controls,
        $userList,
      } = this.battleRoom || {};

      // local helper function that will be called once the native BattleRoom controls are rendered in the `overrides` below
      // (warning: most of this logic is from trial & error tbh -- may make very little sense LOL)
      const injectToggleButton = () => {
        if (typeof $controls?.find !== 'function') {
          return;
        }

        // grab the latest overlayVisible value
        const freshState = store.getState() as typeof rootState;
        const state = freshState?.calcdex?.[this.battle?.id || this.battleId];
        const { overlayVisible: visible } = state || {};

        const toggleButtonIcon = visible ? 'close' : 'calculator';
        const toggleButtonLabel = (
          typeof tRef.value === 'function'
            && tRef.value(`calcdex:overlay.control.${visible ? '' : 'in'}activeLabel`, '')
        ) || `${visible ? 'Close' : 'Open'} Calcdex`;

        const $existingToggleButton = $controls.find('button[name*="toggleCalcdexOverlay"]');
        const hasExistingToggleButton = !!$existingToggleButton.length;

        const $toggleButton = hasExistingToggleButton ? $existingToggleButton : $(`
          <button
            class="button"
            style="float: right;"
            type="button"
            name="toggleCalcdexOverlay"
          >
            <i class="fa fa-${toggleButtonIcon}"></i>
            <span>${toggleButtonLabel}</span>
          </button>
        `);

        // update the existing $toggleButton's children
        if (hasExistingToggleButton) {
          $toggleButton.children('i.fa').attr('class', `fa fa-${toggleButtonIcon}`);
          $toggleButton.children('span').text(toggleButtonLabel);
        }

        // $floatingContainer typically contains spectator & replay controls
        // (asterisk [*] in the CSS selector [style*="<value>"] checks if style includes the <value>)
        const $floatingContainer = $controls.find('div.controls span[style*="float:"]');

        if ($floatingContainer.length) {
          $floatingContainer.css('text-align', 'right');
          $toggleButton.css('float', ''); // since the container itself floats!
        }

        // $waitingContainer typically contains the "Waiting for opponent..." message
        const $waitingContainer = $controls.find('div.controls > p:first-of-type');

        // $whatDoContainer typically contains player controls (move/Pokemon selection)
        const $whatDoContainer = $controls.find('div.controls .whatdo'); // wat it dooo ??

        // doesn't matter if $whatDoContainer is empty since it'll be checked again when
        // for $controlsTarget below (by checking $controlsContainer's length)
        const $controlsContainer = $floatingContainer.length
          ? $floatingContainer
          : $waitingContainer.length
            ? $waitingContainer
            : $whatDoContainer;

        // add some spacing between a button or the control container's right side
        $toggleButton.css('margin-right', 7);

        // only add the $toggleButton if there wasn't one to begin with, obviously
        if (hasExistingToggleButton) {
          return;
        }

        // all this positioning work, which would likely break if they ever changed the HTML... LOL
        const $controlsTarget = $controlsContainer.length
          ? $controlsContainer
          : $controls;

        // button's name could be "startTimer" or "setTimer",
        // hence why we're only matching names containing (`name*=`) "Timer" lmao
        const $timerButton = $controlsTarget.find('button[name*="Timer"]');
        const hasTimerButton = !!$timerButton.length;

        if (hasTimerButton) {
          $toggleButton.insertAfter($timerButton);
        } else {
          $controlsTarget[hasTimerButton ? 'append' : 'prepend']($toggleButton);
        }
      };

      // there are lots of different functions for rendering the controls,
      // which all need to be individually overridden :o
      const overrides: BattleRoomOverride[] = ([
        'updateControls', // p, div.controls p
        'updateControlsForPlayer', // conditionally calls one of the update*Controls() below
        'updateMoveControls', // div.controls .whatdo
        'updateSwitchControls', // div.controls .whatdo
        'updateTeamControls', // div.controls .whatdo
        'updateWaitControls', // div.controls p
      ] as FunctionPropertyNames<Showdown.ClientBattleRoom>[]).map((name) => ({
        name,
        native: typeof this.battleRoom[name] === 'function'
          ? this.battleRoom[name].bind(this.battleRoom) as Showdown.ClientBattleRoom[typeof name]
          : null,
      })).filter((o) => typeof o.native === 'function');

      // this could've been more disgusting by chaining it directly to the filter,
      // but I sense my future self will appreciate the slightly improved readability lmao
      overrides.forEach(({
        name,
        native,
      }) => {
        // sometimes you gotta do what you gotta do to get 'er done
        // (but this definitely hurts my soul lmfao)
        (this.battleRoom as unknown as Record<FunctionPropertyNames<Showdown.ClientBattleRoom>, (...args: unknown[]) => void>)[name] = (
          ...args: unknown[]
        ) => {
          // run the native function first since it modifies $controls (from battleRoom)
          native(...args);
          injectToggleButton();
        };
      });

      // $rootContainer[0] references the underlying HTMLDivElement created below,
      // which will house the React DOM root
      const $rootContainer = $(`<div class="${styles.overlayContainer}"></div>`);

      // since the Calcdex overlay is initially hidden,
      // make sure we apply the display: none; so that the chat isn't blocked by an invisible div
      $rootContainer.css('display', 'none');

      // button handler (which is the value of its name prop)
      this.battleRoom.toggleCalcdexOverlay = () => {
        // battle.calcdexOverlayVisible = !battle.calcdexOverlayVisible;

        const freshState = store.getState() as typeof rootState;
        const state = freshState?.calcdex?.[this.battle?.id || this.battleId];
        const visible = !state?.overlayVisible;

        store.dispatch(calcdexSlice.actions.update({
          scope: `${l.scope}:battleRoom.toggleCalcdexOverlay()`,
          battleId: this.battle?.id || this.battleId,
          overlayVisible: visible,
        }));

        const battleRoomStyles: React.CSSProperties = {
          display: visible ? 'block' : 'none',
          opacity: visible ? 0.3 : 1,
          visibility: visible ? 'hidden' : 'visible',
        };

        $rootContainer.css('display', battleRoomStyles.display);
        $chatFrame.css('opacity', battleRoomStyles.opacity);
        $el.find('.battle-log-add').css('opacity', battleRoomStyles.opacity);
        $userList.css('visibility', battleRoomStyles.visibility);

        // omfg didn't know $chatbox was constantly being focused, which was the source of my distress >:(
        // you won't believe how many hours I spent googling to find the source of this problem,
        // which was dropdowns would open, then immediately close. happened only when opening as a
        // Battle Overlay... & it was very inconsistent... LOL
        // (shoutout to SpiffyTheSpaceman for helping me debug this in < 5 minutes while blasted af)
        // also note that $chatbox comes & goes, so sometimes it's null, hence the check
        if (this.battleRoom.$chatbox?.length) {
          this.battleRoom.$chatbox.prop('disabled', visible);
        }

        // found another one lol (typically in spectator mode)
        if (this.battleRoom.$chatAdd?.length) {
          const $joinButton = this.battleRoom.$chatAdd.find('button');

          if ($joinButton.length) {
            $joinButton.prop('disabled', visible);
          }
        }

        // for mobile (no effect on desktops), prevent pinch-to-zoom & auto-zoom into focused <input>'s
        if (visible) {
          const $existingMeta = $('meta[data-calcdex*="no-mobile-zoom"]');

          if ($existingMeta.length) {
            $existingMeta.attr('content', 'width=device-width, initial-scale=1, maximum-scale=1');
          } else {
            $('head').append(`
              <meta
                data-calcdex="no-mobile-zoom"
                name="viewport"
                content="width=device-width, initial-scale=1, maximum-scale=1"
              />
            `);
          }
        } else {
          // allow pinch zooming again once the Calcdex is closed
          // (warning: not enough to just remove the meta tag as the browser will continue to enforce the no pinch zoom!)
          $('meta[data-calcdex*="no-mobile-zoom"]').attr('content', 'width=device-width, user-scalable=yes');
        }

        // most BattleRoom button callbacks seem to do this at the end lol
        this.battleRoom.updateControls();
      };

      // render the $rootContainer in the entire battleRoom itself
      // (couldn't get it to play nicely when injecting into $chatFrame sadge)
      // (also, $rootContainer's className is the .overlayContainer module to position it appropriately)
      $el.append($rootContainer);
      this.battle.calcdexReactRoot = ReactDOM.createRoot($rootContainer[0]);

      // handle destroying the Calcdex when leaving the battleRoom
      const requestLeave = this.battleRoom.requestLeave.bind(this.battleRoom) as Showdown.ClientBattleRoom['requestLeave'];

      this.battleRoom.requestLeave = (e) => {
        const shouldLeave = requestLeave(e);

        // ForfeitPopup probably appeared
        if (!shouldLeave) {
          // attempt to find the ForfeitPopup to override its submit() callback to destroy the Calcdex
          // (otherwise, the state will remain in the Hellodex since the battleRoom's overrides didn't fire)
          const forfeitPopup = window.app.popups.find((p) => (p as Showdown.ForfeitPopup).room === this.battleRoom);

          if (typeof forfeitPopup?.submit === 'function') {
            l.debug(
              'Overriding submit() of spawned ForfeitPopup in app.popups[]...',
              '\n', 'battleId', this.battleId,
            );

            const submitForfeit = forfeitPopup.submit.bind(forfeitPopup) as typeof forfeitPopup.submit;

            forfeitPopup.submit = (...args) => {
              // clean up allocated memory from React & Redux for this Calcdex instance
              this.battle.calcdexReactRoot?.unmount?.();
              store.dispatch(calcdexSlice.actions.destroy(this.battleId));

              // update the Hellodex W/L battle record
              this.updateBattleRecord('loss');

              // call the original function
              return submitForfeit(...args);
            };
          }

          // don't actually leave the room, as requested by requestLeave()
          return false;
        }

        const battleId = this.battle?.id || this.battleId;

        if (battleId) {
          store.dispatch(calcdexSlice.actions.destroy(battleId));

          if (this.battle?.id) {
            this.battle.calcdexReactRoot?.unmount?.();
            this.battle.calcdexDestroyed = true;
          }
        }

        // actually leave the room
        return true;
      };
    }

    // override each player's addPokemon() method to assign a calcdexId lol
    AllPlayerKeys.forEach((playerKey) => {
      if (!(playerKey in this.battle) || typeof this.battle[playerKey]?.addPokemon !== 'function') {
        return;
      }

      l.debug(
        'Overriding side.addPokemon() of player', playerKey,
        '\n', 'battleId', this.battleId,
      );

      const side = this.battle[playerKey];
      const addPokemon = side.addPokemon.bind(side) as Showdown.Side['addPokemon'];

      side.addPokemon = (name, ident, details, replaceSlot) => {
        // we'll collect potential candidates to assemble the final search list below
        const pokemonSearchCandidates: (Showdown.Pokemon | CalcdexPokemon)[] = [];

        // make sure this comes first before `pokemonState` in case `replaceSlot` is specified
        if (side.pokemon?.length) {
          pokemonSearchCandidates.push(...side.pokemon);
        }

        // retrieve any previously tagged Pokemon in the state if we don't have any candidates atm
        const battleState = rootState?.calcdex?.[this.battle?.id || this.battleId];

        // update (2024/01/03): someone encountered a strange case in Gen 9 VGC 2024 Reg F when after using Parting Shot,
        // accessing battleState.format in the similarPokemon() call below would result in a TypeError, causing their
        // Showdown to break (spitting the runMajor() stack trace into the BattleRoom chat)... which means battleState was
        // undefined for some reason o_O (apparently this doesn't happen often tho)
        if (!battleState?.battleId) {
          // we'll just let the client deal with whatever this is
          return addPokemon(name, ident, details, replaceSlot);
        }

        const pokemonState = battleState?.[playerKey]?.pokemon || [];

        if (pokemonState.length) {
          pokemonSearchCandidates.push(...pokemonState);
        }

        // don't filter this in case `replaceSlot` is specified
        const pokemonSearchList = pokemonSearchCandidates.map((p) => ({
          calcdexId: p.calcdexId,
          ident: p.ident,
          // name: p.name,
          speciesForme: p.speciesForme,
          gender: p.gender,
          details: p.details,
          searchid: p.searchid,
        }));

        // just js things uwu
        const prevPokemon = (replaceSlot > -1 && pokemonSearchList[replaceSlot])
          || pokemonSearchList.filter((p) => !!p.calcdexId).find((p) => (
            // e.g., ident = 'p1: CalcdexDemolisher' (nicknamed) or 'p1: Ditto' (unnamed default)
            // update (2023/07/30): while `ident` is mostly available, when viewing a replay (i.e., an old saved battle), it's not!
            (!ident || (
              (!!p?.ident && p.ident === ident)
                // e.g., searchid = 'p1: CalcdexDemolisher|Ditto'
                // nickname case: pass; default case: fail ('p1: CalcdexDemolisher' !== 'p1: Ditto')
                // note: not doing startsWith() since 'p1: Mewtwo|Mewtwo' will pass when given ident 'p1: Mew'
                || (!!p?.searchid?.includes('|') && p.searchid.split('|')[0] === ident)
            ))
              && similarPokemon({ details }, p, {
                format: battleState.format,
                normalizeFormes: 'wildcard',
                ignoreMega: true,
              })
          ));

        /* l.debug(
          'side.addPokemon()', 'for', ident || name || details?.split(',')?.[0], 'for player', side.sideid,
          '\n', 'ident', ident,
          '\n', 'details', details,
          '\n', 'replaceSlot', replaceSlot,
          '\n', 'prevPokemon[]', prevPokemon,
          '\n', 'pokemonSearchList[]', pokemonSearchList,
          // '\n', 'side', side,
          // '\n', 'battle', this.battle,
        ); */

        const newPokemon = addPokemon(name, ident, details, replaceSlot);

        if (prevPokemon?.calcdexId) {
          newPokemon.calcdexId = prevPokemon.calcdexId;

          l.debug(
            'Restored calcdexId', newPokemon.calcdexId,
            'from prevPokemon', prevPokemon.ident || prevPokemon.speciesForme,
            'to newPokemon', newPokemon.ident || newPokemon.speciesForme,
            'for player', side.sideid,
            '\n', 'prevPokemon[]', prevPokemon,
            '\n', 'newPokemon[]', newPokemon,
          );
        }

        return newPokemon;
      };
    });

    l.debug(
      'Overriding updateSide() of the current battleRoom',
      '\n', 'battleId', this.battleId,
    );

    const updateSide = this.battleRoom.updateSide.bind(this.battleRoom) as Showdown.ClientBattleRoom['updateSide'];

    this.battleRoom.updateSide = () => {
      // grab a copy of myPokemon[] before updateSide() unleashes valhalla on it
      const myPokemon = [...(this.battleRoom.battle?.myPokemon || [])];

      // now run the original function, which will directly mutate myPokemon[] from the battleRoom.requests.side.pokemon[]
      updateSide();

      /* l.debug(
        'updateSide()',
        '\n', 'battleId', this.battleId,
        '\n', 'myPokemon[]', '(prev)', myPokemon, '(now)', this.battle.myPokemon,
      ); */

      let didUpdate = !myPokemon?.length
        && !!this.battleRoom.battle.myPokemon?.length;

      // with each updated myPokemon[], see if we find a match to restore its calcdexId
      this.battleRoom.battle.myPokemon.forEach((pokemon) => {
        if (!pokemon?.ident || pokemon.calcdexId) {
          return;
        }

        // note (2023/07/30): leave the `ident` check as is here since viewing a replay wouldn't trigger this function
        // (there are no myPokemon[] when viewing a replay, even if you were viewing your own battle!)
        const prevMyPokemon = myPokemon.find((p) => !!p?.ident && (
          p.ident === pokemon.ident
            || p.speciesForme === pokemon.speciesForme
            || p.details === pokemon.details
            // update (2023/07/27): this check breaks when p.details is 'Mewtwo' & pokemon.speciesForme is 'Mew',
            // resulting in the Mewtwo's calcdexId being assigned to the Mew o_O
            // || p.details.includes(pokemon.speciesForme)
            // update (2023/07/30): `details` can include the gender, if applicable (e.g., 'Reuniclus, M')
            /* || p.details === [
              pokemon.speciesForme.replace('-*', ''),
              pokemon.gender !== 'N' && pokemon.gender,
            ].filter(Boolean).join(', ') */
            || similarPokemon(pokemon, p, {
              format: this.battleRoom.battle.id.split('-').find((part) => detectGenFromFormat(part)),
              normalizeFormes: 'wildcard',
              ignoreMega: true,
            })
        ));

        if (!prevMyPokemon?.calcdexId) {
          return;
        }

        pokemon.calcdexId = prevMyPokemon.calcdexId;
        didUpdate = true;

        /* l.debug(
          'Restored previous calcdexId for', pokemon.speciesForme, 'in battle.myPokemon[]',
          '\n', 'calcdexId', prevMyPokemon.calcdexId,
          '\n', 'pokemon', '(prev)', prevMyPokemon, '(now)', pokemon,
        ); */
      });

      if (didUpdate && this.battleRoom.battle.calcdexInit) {
        // const prevNonce = battleRoom.battle.nonce;

        this.battleRoom.battle.nonce = calcBattleCalcdexNonce(this.battleRoom.battle, this.battleRoom.request);

        /* l.debug(
          'Restored previous calcdexId\'s in battle.myPokemon[]',
          '\n', 'nonce', '(prev)', prevNonce, '(now)', this.battle.nonce,
          '\n', 'myPokemon[]', '(prev)', myPokemon, '(now)', this.battle.myPokemon,
        ); */

        // since myPokemon[] could be available now, forcibly fire a battle sync
        // (should we check if myPokemon is actually populated? maybe... but I'll leave it like this for now)
        this.battleRoom.battle.subscription('callback');
      }
    };

    l.debug(
      'About to inject some real filth into battle.subscribe()...',
      '\n', 'battleId', this.battleId,
      '\n', 'battle.subscription()', '(typeof)', wtf(this.battle.subscription),
      '\n', 'battle', this.battle,
    );

    const prevSubscription = this.battle.subscription?.bind?.(this.battle) as Showdown.Battle['subscription'];

    // note: battle.subscribe() internally sets its `subscription` property to the `listener` arg,
    // i.e., (in js/battle.js) battle.subscribe = function (listener) { this.subscription = listener; };
    this.battle.subscribe((state) => {
      l.debug(
        'battle.subscribe() for', this.battle?.id || this.battleId,
        '\n', 'state', state,
        '\n', 'battle', this.battle,
      );

      // call the original subscription() first, if any, so we don't break anything we don't mean to!
      prevSubscription?.(state);

      // update (2022/10/13): allowing paused battle states to trigger a re-render
      /* if (state === 'paused') {
        return void l.debug(
          'Subscription ignored cause the battle is paused or, probs more likely, ended',
          '\n', 'battleId', battleId,
        );
      } */

      if (!this.battle?.id) {
        return void l.debug(
          'No valid battle object was found',
          '\n', 'battleId', this.battleId,
          '\n', 'battle', '(typeof)', wtf(this.battle), this.battle,
        );
      }

      // don't render if we've already destroyed the battleState
      // (via calcdexRoom's requestLeave() when leaving via app.leaveRoom())
      if (this.battle.calcdexDestroyed) {
        return void l.debug(
          'Calcdex battleState has been destroyed',
          '\n', 'battleId', this.battleId,
          '\n', 'battle', '(typeof)', wtf(this.battle), this.battle,
        );
      }

      if (this.battle.id !== this.battleId) {
        return void l.debug(
          'Current battle update is not for this battleRoom',
          '\n', 'battleId', '(init)', this.battleId, '(recv)', this.battle.id,
          '\n', 'battle', '(typeof)', wtf(this.battle), this.battle,
        );
      }

      // ignore any freshly created battle objects with missing players
      if (!this.battle.p1?.id || AllPlayerKeys.slice(1).every((k) => !this.battle[k]?.id)) {
        return void l.debug(
          'Not all players exist yet in the battle!',
          '\n', 'players', AllPlayerKeys.map((k) => this.battle[k]?.id),
          '\n', 'stepQueue[]', this.battle.stepQueue,
          '\n', 'battleId', this.battle.id || this.battleId,
        );
      }

      if (!this.battle.calcdexStateInit) {
        // dispatch a Calcdex state initialization to Redux
        // (moved this out from CalcdexProvider, where React originally dispatched init/sync in early versions before Redux)
        const authUser = authUsername || rootState?.showdex?.authUsername;

        // note: using NIL_UUID as the initial nonce here since the init state could be ready by the time the nonce
        // check for syncing executes (if we used the actual nonce, the check would fail since they'd be the same!)
        // const initNonce = calcBattleCalcdexNonce(battle, battleRoom.request);
        const initNonce = NIL_UUID; // i.e., NIL_UUID = '00000000-0000-0000-0000-000000000000'

        l.debug(
          'Initializing Calcdex state for', this.battle.id,
          '\n', 'nonce', '(init)', initNonce,
          '\n', 'battle', this.battle,
        );

        store.dispatch(calcdexSlice.actions.init({
          scope: `${l.scope}:battle.subscribe()`,

          operatingMode: 'battle',
          battleId: this.battle.id,
          battleNonce: initNonce,
          gen: this.battle.gen as GenerationNum,
          // format: this.battle.id.split('-')?.[1], // update (2024/01/22): on smogtours, it's 'battle-smogtours-gen9ou-...' lmao
          format: this.battle.id.split('-').find((p) => detectGenFromFormat(p)),
          gameType: this.battle.gameType === 'doubles' ? 'Doubles' : 'Singles',
          turn: clamp(0, this.battle.turn || 0),
          active: !this.battle.ended,
          renderMode: openAsPanel ? 'panel' : 'overlay',
          switchPlayers: this.battle.viewpointSwitched ?? this.battle.sidesSwitched,

          ...AllPlayerKeys.reduce((prev, playerKey) => {
            const player = this.battle[playerKey];

            prev[playerKey] = {
              active: !!player?.id,
              name: player?.name || null,
              rating: player?.rating || null,

              autoSelect: calcdexSettings.defaultAutoSelect
                ?.[(!!authUser && player?.name === authUser && 'auth') || playerKey],

              usedMax: usedDynamax(playerKey, this.battle.stepQueue),
              usedTera: usedTerastallization(playerKey, this.battle.stepQueue),
            };

            // note: sanitizePlayerSide() needs the updated side.conditions, so we're initializing it like this here first
            prev[playerKey].side = { conditions: clonePlayerSideConditions(player?.sideConditions) };
            prev[playerKey].side = {
              conditions: prev[playerKey].side.conditions,
              ...sanitizePlayerSide(
                this.battle.gen as GenerationNum,
                prev[playerKey],
                player,
              ),
            };

            return prev;
          }, {} as Record<CalcdexPlayerKey, CalcdexPlayer>),
        }));

        this.battle.calcdexStateInit = true;

        // don't continue processing until the next subscription callback
        // update (2023/01/31): nvm, init state could be available on the store.getState() call below,
        // but since we're checking for a battleNonce before syncing, it's ok if it doesn't exist yet either
        // (if a NIL as battleNonce is present, even if NIL_UUID, then we know the state has initialized)
        // update (2023/02/06): now preventing the first battle sync if the logged-in user is also player
        // since myPokemon[] could be empty here; the callback in the overridden updateSide() should trigger
        // the battle sync once myPokemon[] is populated; but if we're just spectating here, we can continue
        // syncing after init as normal; also, checking if the battle ended since we could be watching a replay,
        // in which case the authUser check could pass without myPokemon[] being populated
        if (!this.battle.ended && AllPlayerKeys.some((k) => this.battle[k]?.name === authUser)) {
          return;
        }
      }

      // since this is inside a function, we need to grab a fresher snapshot of the Redux state
      // (i.e., don't use calcdexSettings here cause it may be stale)
      const freshState = store.getState() as typeof rootState;
      const { calcdex: settings } = freshState?.showdex?.settings || {};
      const battleState = freshState?.calcdex?.[this.battle.id];

      // make sure the battle was active on the previous sync, but now has ended
      const battleEnded = this.battle.ended
        || this.battleRoom.battleEnded
        || this.battleRoom.expired;

      if (battleState?.active && battleEnded) {
        const calcdexRoomId = this.battle.calcdexRoom?.id
          || CalcdexClassicBootstrapper.getCalcdexRoomId(this.battle.id);

        l.debug(
          'Battle ended; updating active state...',
          '\n', 'battleId', this.battle.id,
          '\n', 'calcdexRoomId', calcdexRoomId,
          '\n', 'battle', this.battle,
        );

        store.dispatch(calcdexSlice.actions.update({
          scope: `${l.scope}:battle.subscribe()`,
          battleId: this.battle.id,
          battleNonce: this.battle.nonce,
          active: false,
          paused: true,
        }));

        this.updateBattleRecord();

        // only close the calcdexRoom if configured to
        // (here, it's only on 'battle-end' since we're specifically handling that scenario rn)
        if (settings?.closeOn === 'battle-end' && calcdexRoomId && calcdexRoomId in window.app.rooms) {
          l.debug(
            'Leaving calcdexRoom due to user settings...',
            '\n', 'battleId', this.battle.id,
            '\n', 'calcdexRoomId', calcdexRoomId,
            '\n', 'battle', this.battle,
          );

          // sets battle.calcdexDestroyed to true and `delete`s the calcdexRoom property
          // update (2023/02/01): no longer `delete`s the calcdexReactRoot since it's not stored in the battle anymore
          // update (2023/04/22): overwritten calcdexRoom.requestLeave() handler (invoked by app.leaveRoom())
          // will automatically call calcdexRoom.reactRoot.unmount(); additionally, the battle's calcdexReactRoot is
          // exclusively being used for battle overlays now (as of v1.1.5)
          window.app.leaveRoom(calcdexRoomId);
        }

        return;
      }

      // note: since we're filtering the subscription callback to avoid UI spamming,
      // we get the value of battleRoom.request right before it updates on the next callback.
      // not a big deal tho, but it's usually first `null`, then becomes populated on the
      // next Calcdex render callback (i.e., here).
      this.battle.nonce = calcBattleCalcdexNonce(this.battle, this.battleRoom.request);

      // this check is to make sure the state has been initialized before attempting to sync
      // update (2023/07/24): ok this is what I get for not using 'strict' mode butt fuck it
      // (it's a good habit to always check your inputs anyways, especially cause things can go wrong during runtime!)
      if (!battleState?.battleNonce) {
        return;
      }

      // dispatch a battle sync if the nonces are different (i.e., something changed)
      if (this.battle.nonce === battleState.battleNonce) {
        /* l.debug(
          'Ignoring battle sync due to same nonce for', this.battle.id,
          '\n', 'nonce', '(prev)', battleState.battleNonce, '(now)', this.battle.nonce,
          '\n', 'battle', this.battle,
        ); */

        return;
      }

      l.debug(
        'Syncing battle for', this.battle.id,
        '\n', 'nonce', '(prev)', battleState.battleNonce, '(now)', this.battle.nonce,
        '\n', 'request', this.battleRoom.request,
        '\n', 'battle', this.battle,
        '\n', 'state', '(prev)', battleState,
      );

      // note: syncBattle() is no longer async, but since it's still wrapped in an async thunky,
      // we're keeping the `void` to keep TypeScript happy lol (`void` does nothing here btw)
      void store.dispatch(syncBattle({
        battle: this.battle,
        request: this.battleRoom.request,
      }));
    });

    // update (2023/02/01): we're now only rendering the Calcdex once since React is no longer
    // dispatching battle updates (we're dispatching them out here in the bootstrapper).
    // state mutations in Redux should trigger necessary UI re-renders within React.
    // (also probably no longer need to reference the calcdexReactRoot in the battle object now tbh)
    // update (2023/04/22): nope -- we still do! we have to call calcdexReactRoot.unmount(),
    // which obviously won't be available on subsequent bootstrapper invocations as a local var,
    // so... back in the `battle` (for overlays) or `calcdexRoom` (for tabs) you go!
    const calcdexReactRoot = this.battle.calcdexReactRoot || this.battle.calcdexRoom?.reactRoot;

    if (calcdexReactRoot) {
      /* l.debug(
        'Rendering Calcdex for', this.battle.id,
        // '\n', 'nonce', '(now)', this.battle.nonce || initNonce,
        // '\n', 'request', this.battleRoom.request,
        '\n', 'battle', this.battle,
        '\n', 'battleRoom', this.battleRoom,
      ); */

      this.renderCalcdex(calcdexReactRoot);

      // force a callback after rendering
      // update (2023/02/04): bad idea, sometimes leads to a half-initialized battle object where there's
      // only one player (which breaks the syncing); downside is that it doesn't appear to the user that the
      // Calcdex is loading that fast, but it loads with the battle frame, so it isn't the worst thing ever
      // update (2023/02/06): now checking if we're already at the queue end, which could happen if you refresh
      // the page mid-battle or join a spectating game; otherwise, the Calcdex won't appear until the players
      // do something (e.g., choose an option, turn on the timer, etc.) that triggers the subscription callback
      if (this.battle.atQueueEnd) {
        /* l.debug(
          'Forcing a battle sync via battle.subscription() since the battle is atQueueEnd',
          '\n', 'battle.atQueueEnd', this.battle.atQueueEnd,
          '\n', 'battle', this.battle,
          '\n', 'battleRoom', this.battleRoom,
        ); */

        this.battle.subscription('atqueueend');
      }
    } else {
      l.error(
        'ReactDOM root hasn\'t been initialized, despite completing the classic bootstrap;',
        'something is horribly wrong here!',
        '\n', 'battleId', this.battle.id,
        '\n', 'calcdexReactRoot', '(typeof)', wtf(calcdexReactRoot), calcdexReactRoot,
        '\n', 'battle', this.battle,
        '\n', 'battleRoom', this.battleRoom,
      );
    }

    this.battle.calcdexInit = true;
    this.endTimer('(bootstrap complete)');
  }
}
