/**
 * @file `CalcdexBootstrappable.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.2.6
 */

/* eslint-disable max-classes-per-file */

import { hellodexSlice } from '@showdex/redux/store';
import { formatId } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import { BootdexBootstrappable } from '../Bootdex/BootdexBootstrappable';

export type CalcdexBootstrappableLike =
  & Omit<typeof CalcdexBootstrappable, 'constructor'>
  & (new (battleId: string) => CalcdexBootstrappable);

const l = logger('@showdex/pages/Calcdex/CalcdexBootstrappable');

/* eslint-disable @typescript-eslint/indent */

/**
 * putting the *java* in *java*script
 *
 * * note-to-self: all this complex js fukery is just multi-inheritence that js just like java doesn't have
 *   - (... maybe for the better tbh LOL)
 *
 * @example
 * ```ts
 * // serving suggestions:
 * class ClassicBootstrapper extends MixinCalcdexBootstrappable(BootdexClassicBootstrappable) { ... }
 * class PreactBootstrapper extends MixinCalcdexBootstrappable(BootdexPreactBootstrappable) { ... }
 *
 * // functional (but JavaScript-ly illegal) equivalents:
 * class ClassicBootstrapper extends CalcdexBootstrappable, BootdexClassicBootstrappble { ... }
 * class PreactBootstrapper extends CalcdexBootstrappable, BootdexPreactBootstrappble { ... }
 * // where:
 * abstract class CalcdexBootstrappble extends BootdexBootstrappable { ... }
 * abstract class BootdexClassicBootstrapple extends BootdexBootstrappable { ... }
 * abstract class BootdexPreactBootstrapple extends BootdexBootstrappable { ... }
 * abstract class BootdexBootstrappable { ... }
 * ```
 * @since 1.2.6
 */
export const MixinCalcdexBootstrappable = <
  TBootstrappable extends typeof BootdexBootstrappable,
>(
  Bootstrappable: TBootstrappable,
) => {
  // abstract class CalcdexBootstrappableMixin extends (Bootstrappable as (new (...args) => TBootstrappable)) {
  abstract class CalcdexBootstrappableMixin extends (Bootstrappable as typeof BootdexBootstrappable & InstanceType<TBootstrappable>) {
    protected readonly battleId: string;

    public constructor(battleId: string) {
      super();

      this.battleId = battleId;
    }

    protected abstract get battle(): Showdown.Battle;

    protected get battleState() {
      return CalcdexBootstrappableMixin.Adapter?.rootState?.calcdex?.[this.battle?.id];
    }

    /**
     * Determines if the auth user has won/loss, then increments the win/loss counter.
     *
     * * Specify the `forceResult` argument when you know the `battle` object might not be available.
     *   - `battle` wouldn't be typically available in a `ForfeitPopup` used in the `'classic'` Showdown client, for instance.
     *
     * @since 1.0.6
     */
    protected updateBattleRecord(forceResult?: 'win' | 'loss'): void {
      const { authUsername, store } = CalcdexBootstrappableMixin.Adapter || {};

      if (
        !authUsername
          || (!this.battle?.id && !forceResult)
          || typeof store?.dispatch !== 'function'
      ) {
        return;
      }

      const playerNames = [
        this.battle?.p1?.name,
        this.battle?.p2?.name,
        this.battle?.p3?.name,
        this.battle?.p4?.name,
      ].filter(Boolean);

      const winStep = this.battle?.stepQueue?.find((s) => s?.startsWith('|win|'));
      const winUser = winStep?.replace?.('|win|', ''); // e.g., '|win|sumfuk' -> 'sumfuk'

      if ((playerNames.length && !playerNames.includes(authUsername)) || (!winUser && !forceResult)) {
        return;
      }

      const didWin = forceResult === 'win' || (forceResult !== 'loss' && formatId(winUser) === formatId(authUsername));
      const reducerName = didWin ? 'recordWin' : 'recordLoss';

      store.dispatch(hellodexSlice.actions[reducerName]());
    }

    /**
     * Opens an existing Calcdex tab (or battle if overlayed) or creates a new one.
     *
     * * Extracted from the Hellodex bootstrapper in v1.2.0.
     *
     * @since 1.0.3
     */
    public abstract open(): void;

    /**
     * Closes the Calcdex (& its associated client battle room, if applicable).
     *
     * @since 1.2.6
     */
    public abstract close(): void;

    /**
     * Removes all traces of (& also `close()`'s) the Calcdex.
     *
     * @since 1.2.6
     */
    public abstract destroy(): void;
  }

  return CalcdexBootstrappableMixin;
};

/* eslint-enable @typescript-eslint/indent */

export abstract class CalcdexBootstrappable extends MixinCalcdexBootstrappable(BootdexBootstrappable) {
  public static override readonly scope = l.scope;
}
