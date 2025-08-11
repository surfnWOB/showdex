/**
 * @file `BootdexBootstrappable.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.2.6
 */

import { logger, runtimer } from '@showdex/utils/debug';
import { BootdexAdapter } from './BootdexAdapter';
import { BootdexManager } from './BootdexManager';

export type BootdexBootstrappableLike =
  & Omit<typeof BootdexBootstrappable, 'constructor'>
  & (new () => BootdexBootstrappable);

const l = logger('@showdex/pages/Bootdex/BootdexBootstrappable');

export abstract class BootdexBootstrappable {
  public static readonly scope = l.scope;
  public static readonly Adapter = BootdexAdapter;
  public static readonly Manager = BootdexManager;

  protected endTimer?: ReturnType<typeof runtimer> = null;

  protected startTimer(): void {
    this.endTimer = runtimer(BootdexBootstrappable.scope, l);
  }

  public abstract open(): void;
  public abstract close(): void;
  public abstract run(): void;
  public abstract destroy(): void;
}
