/**
 * @file `BootdexPreactAdapter.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.2.6
 */

import { logger } from '@showdex/utils/debug';
import { detectPreactHost } from '@showdex/utils/host';
import { BootdexAdapter } from './BootdexAdapter';

const l = logger('@showdex/pages/Bootdex/BootdexPreactAdapter');

export class BootdexPreactAdapter extends BootdexAdapter {
  public constructor() {
    super();
  }

  protected hook(): void {
    if (!detectPreactHost(window)) {
      return;
    }
  }

  protected ready(): void {
  }
}
