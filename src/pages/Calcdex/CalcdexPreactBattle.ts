/**
 * @file `CalcdexPreactBattle.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

import type * as ReactDOM from 'react-dom/client';
import { NIL as NIL_UUID } from 'uuid';
import { calcdexSlice } from '@showdex/redux/store';
import { detectAuthPlayerKeyFromBattle } from '@showdex/utils/battle';
import { calcBattleCalcdexNonce } from '@showdex/utils/calc';
import { logger } from '@showdex/utils/debug';
import { detectPreactHost } from '@showdex/utils/host';
import { BootdexManager as Manager } from '../Bootdex/BootdexManager';
import { BootdexPreactAdapter as Adapter } from '../Bootdex/BootdexPreactAdapter';
import { BootdexPreactBootstrappable } from '../Bootdex/BootdexPreactBootstrappable';
import { type CalcdexBootstrappable } from './CalcdexBootstrappable';
// import { CalcdexPreactBattleSide } from './CalcdexPreactBattleSide';

const l = logger('@showdex/pages/Calcdex/CalcdexPreactBattle');

// note: same Showdown.Battle class is used on both 'classic' & 'preact' __SHOWDEX_HOST's
const { Battle } = window;

/**
 * *hell ... it's about time* (... that Showdex properly `extends` the `Showdown.Battle` class instead of directly poking at it LOL.)
 *
 * * Note that we store some Calcdex values in the `Showdown.Battle` itself since the `CalcdexBootstrappable`'s are frequently
 *   recreated (e.g., `new`'d once for some function), so any non-`static` prop values won't be presered obvi (hence we store them here!).
 *   - Otherwise this is just a vanilla `Showdown.Battle` class.
 *
 * @todo technically has no dependency on `'preact'` `__SHOWDEX_HOST`'s, but opting to keep this separate from the `'classic'`
 *   `__SHOWDEX_HOST` for now (as of v1.3.0) in case this breaks everything ... *again* hehe
 * @todo remove the injected `calcdex*` props definitions (& rename `nonce`) in the `battle.d.ts` after refactoring this
 *   into `CalcdexHostBattle`.
 * @since 1.3.0
 */
export class CalcdexPreactBattle extends Battle {
  public static readonly scope = l.scope;

  /** `RoomID` of the `CalcdexPreactPanel`, only used when the `calcdexAsOverlay` is `false` (i.e., `'panel'` mode). */
  public calcdexRoomId?: Showdown.RoomID = null;
  /** Populated by the `CalcdexPreactBattlePanel` when the `calcdexAsOverlay` is `true` (i.e., `'overlay'` mode). */
  public calcdexReactRoot?: ReactDOM.Root = null;
  /** Also populated by the `CalcdexPreactBattlePanel` when the `calcdexAsOverlay` is `true` (i.e., `'overlay'` mode). */
  public calcdexReactRef?: React.RefObject<HTMLDivElement> = { current: null };
  /** Also also populated by the `CalcdexPreactBattlePanel` when the `calcdexAsOverlay` is `true` (i.e., `'overlay'` mode). */
  public calcdexReactRenderer?: () => void = null;
  public calcdexAsOverlay = false;
  /** Whether the Calcdex shouldn't initialize (like AT ALL!) for this battle :o */
  public calcdexDisabled = false;
  /** Whether the `CalcdexBootstrappable` did its " *t h i n g* " o_O */
  public calcdexInit = false;
  /** Whether the `CalcdexSliceState` for this battle is `init()`'d in Redux & ready to *Stealth Rock* & *Rollout*. */
  public calcdexStateInit = false;
  /** Whether the `CalcdexBootstrappable`'s `patchCalcdexIdentifier()` patch has been applied to this here `Showdown.Battle`. */
  public calcdexIdPatched = false;
  /**
   * Whether the Calcdex along w/ all of its Redux slice data & rendered DOM elements are yeeted from memory
   * (& if `true`, should disregard any other `calcdex*` prop!).
   */
  public calcdexDestroyed = false;
  public calcdexSheetsAccepted = false;

  /** Populated by the `CalcdexPreactBootstrapper`'s `patchCalcdexIdentifier()` & invoked by the `CalcdexPreactBattleSide`'s `addPokemon()`. */
  public calcdexClientIdPatcher?: CalcdexBootstrappable['patchClientCalcdexIdentifier'] = null;
  public calcdexWinHandler?: (winner?: string) => void = null;

  /* public static fromBattle(
    battle: Showdown.Battle,
    battleRoom?: Showdown.BattleRoom,
  ) {
    if (!battle?.id) {
      return null;
    }

    const calcdexBattle = new this({
      ...battle, // note: this only copies *some* props from the `battle`, e.g., id, autoresize, isReplay, etc.
      $frame: battle.scene.$frame,
      $logFrame: $(battle.scene.log.elem),
      log: battleRoom?.backlog?.map((logs) => `|${logs?.join('|') || ''}`),
    });

    // ({ scene: calcdexBattle.scene } = battle);

    return calcdexBattle;
  } */

  public constructor(options: ConstructorParameters<typeof Battle>[0] = {}) {
    super(options);

    // note: other instance props like calcdexReady 'n such will be directly mutated from the outside
    const { calcdex: calcdexSettings } = Adapter.rootState?.showdex?.settings || {};
    const { hasSinglePanel } = BootdexPreactBootstrappable;

    this.calcdexDisabled = calcdexSettings?.openOnStart === 'never'
      || (calcdexSettings?.openOnStart === 'playing' && !this.calcdexAuthPlayerKey)
      || (calcdexSettings?.openOnStart === 'spectating' && !!this.calcdexAuthPlayerKey);

    if (this.calcdexDisabled) {
      return;
    }

    /* this.p1 = new CalcdexPreactBattleSide(this, 1);
    this.p2 = new CalcdexPreactBattleSide(this, 2);
    this.sides = [this.p1, this.p2];
    this.p2.foe = this.p1;
    this.p1.foe = this.p2;
    this.nearSide = this.p1;
    this.mySide = this.p1;
    this.farSide = this.p2;
    this.resetStep(); */

    this.calcdexAsOverlay = calcdexSettings?.openAs === 'overlay'
      || (calcdexSettings?.openAs !== 'showdown' && hasSinglePanel());

    // this.runCalcdex();

    if (this.calcdexAsOverlay) {
      return;
    }

    // note: this is for 'panel' renderMode's only!!
    this.calcdexRoomId = `calcdex-${this.id}` as Showdown.RoomID;
  }

  public get calcdexNonce() {
    return this.id && !this.calcdexDisabled /* && (this.calcdexInit || this.calcdexStateInit) */
      ? calcBattleCalcdexNonce(this) || NIL_UUID
      : null;
  }

  public get calcdexAuthPlayerKey() {
    return detectAuthPlayerKeyFromBattle(this);
  }

  public get calcdexState() {
    return Adapter.rootState?.calcdex?.[this.id];
  }

  public runCalcdex() {
    l.debug('runCalcdex()', this.id, '(init)', this.calcdexInit, '(state)', this.calcdexStateInit);

    if (
      !detectPreactHost(window)
        || !this.id
        || this.calcdexInit
        || typeof this.subscription !== 'function'
        // || !this.p1?.pokemon?.length
        // || !this.p2?.pokemon?.length
        // || (
        //   !this.p1?.pokemon?.length
        //     && !this.p2?.pokemon?.length
        //     && !this.myPokemon?.length
        // )
    ) {
      return;
    }

    Manager.runCalcdex(this.id);
  }

  public override run(str: string, preempt?: boolean): void {
    super.run(str, preempt);

    if (this.calcdexDisabled || this.calcdexInit) {
      return;
    }

    this.runCalcdex();
  }

  /* public override runMajor(
    args: Showdown.Args,
    kwArgs: Showdown.KwArgs,
    preempt?: boolean,
  ): void {
    if (!detectPreactHost(window)) {
      return super.runMajor(args, kwArgs, preempt);
    }

    const hadP3 = !!this.p3?.sideid;
    const hadP4 = !!this.p4?.sideid;

    super.runMajor(args, kwArgs, preempt);

    if (!hadP3 && !!this.p3?.sideid) {
      this.p3 = new CalcdexPreactBattleSide(this, 3);
    }

    if (!hadP4 && !!this.p4?.sideid) {
      this.p4 = new CalcdexPreactBattleSide(this, 4);
    }

    // this.runCalcdex();
  } */

  public destroyCalcdexDom() {
    if (!detectPreactHost(window) || typeof this.calcdexReactRoot?.unmount !== 'function') {
      return;
    }

    this.calcdexReactRoot.unmount();
    this.calcdexReactRoot = null;
    this.calcdexReactRef = { current: null };
    this.calcdexReactRenderer = null;
  }

  public destroyCalcdexState() {
    if (!detectPreactHost(window) || !this.id || !this.calcdexStateInit) {
      return;
    }

    Adapter.store.dispatch(calcdexSlice.actions.destroy(this.id));
    this.calcdexStateInit = false;
  }

  public override destroy(): void {
    if (!detectPreactHost(window) || !this.calcdexDestroyed) {
      return void super.destroy();
    }

    l.debug(
      'destroy()', 'called for the CalcdexPreactBattle of id', this.id,
      '\n', 'battle', this,
    );

    this.destroyCalcdexDom();
    this.destroyCalcdexState();
    this.calcdexDestroyed = true;

    // this basically calls destroy() on this.sprite (if it exists), then nulls both that & this.side
    super.destroy();
  }
}
