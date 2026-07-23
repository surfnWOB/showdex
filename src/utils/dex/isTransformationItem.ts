import { formatId } from '@showdex/utils/core/formatId';
import { isMegaStone } from './isMegaStone';

/**
 * Whether an item uniquely identifies a Mega or Primal battle forme.
 *
 * Random Battle item rolls are normally not reliable preset discriminators,
 * but Mega Stones and the two Primal Orbs necessarily reveal the generated
 * transformation candidate.
 */
export const isTransformationItem = (item: string): boolean => {
  const id = formatId(item);

  return isMegaStone(item) || id === 'blueorb' || id === 'redorb';
};
