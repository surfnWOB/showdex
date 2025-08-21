/**
 * @file `CalcdexPreactBattle.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

import type * as ReactDOM from 'react-dom/client';
import { NIL as NIL_UUID } from 'uuid';
import { detectAuthPlayerKeyFromBattle } from '@showdex/utils/battle';
import { calcBattleCalcdexNonce } from '@showdex/utils/calc';
import { logger } from '@showdex/utils/debug';
import { BootdexManager as Manager } from '../Bootdex/BootdexManager';
import { BootdexPreactAdapter as Adapter } from '../Bootdex/BootdexPreactAdapter';
import { BootdexPreactBootstrappable } from '../Bootdex/BootdexPreactBootstrappable';

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
  // public calcdexReactRef?: React.RefObject<HTMLDivElement> = null;
  /** Also populated by the `CalcdexPreactBattlePanel` when the `calcdexAsOverlay` is `true` (i.e., `'overlay'` mode). */
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
  public calcdexWinHandler?: (winner?: string) => void = null;

  public static fromBattle(
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
  }

  public constructor(options: ConstructorParameters<typeof Battle>[0]) {
    super(options);

    // note: other instance props like calcdexReady 'n such will be directly mutated from the outside
    const { calcdex: calcdexSettings } = Adapter.rootState?.showdex?.settings || {};
    const { hasSinglePanel } = BootdexPreactBootstrappable;

    this.calcdexDisabled = calcdexSettings?.openOnStart === 'never'
      || (calcdexSettings?.openOnStart === 'playing' && !this.calcdexAuthKey)
      || (calcdexSettings?.openOnStart === 'spectating' && !!this.calcdexAuthKey);

    if (this.calcdexDisabled) {
      return;
    }

    this.calcdexAsOverlay = calcdexSettings?.openAs === 'overlay'
      || (calcdexSettings?.openAs === 'showdown' && !hasSinglePanel());

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

  public get calcdexAuthKey() {
    return detectAuthPlayerKeyFromBattle(this);
  }

  /* public get calcdexState() {
    return Adapter.rootState?.calcdex?.[this.id];
  }

  public override run(str: string, preempt?: boolean): void {
    super.run(str, preempt);

    if (!this.id || this.calcdexInit || this.calcdexState?.battleNonce === this.calcdexNonce) {
      return;
    }

    Manager.runCalcdex(this.id);
  } */

  public override run(str: string, preempt?: boolean): void {
    super.run(str, preempt);

    if (
      !this.id
        || this.calcdexInit
        || !this.p1?.pokemon?.length
        || !this.p2?.pokemon?.length
    ) {
      return;
    }

    Manager.runCalcdex(this.id);
  }

  public override destroy(): void {
    if (this.calcdexReactRoot) {
      this.calcdexReactRoot.unmount();
      this.calcdexReactRoot = null;
      this.calcdexReactRenderer = null;
    }

    super.destroy();
  }
}
