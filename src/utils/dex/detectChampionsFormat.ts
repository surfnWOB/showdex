import { formatId } from '@showdex/utils/core';

export const ChampionsFormatRegex = /^gen9champions/i;

/**
 * Single source of truth predicate that returns `true` for any `gen9champions*` format.
 *
 * @since 1.4.0
 */
export const detectChampionsFormat = (
  format?: string,
): boolean => {
  if (typeof format !== 'string' || !format) {
    return false;
  }

  return ChampionsFormatRegex.test(formatId(format));
};
