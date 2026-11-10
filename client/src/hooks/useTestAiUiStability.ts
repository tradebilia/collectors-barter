import { useCallback, useLayoutEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { sourceRequestDisplayData } from '@shared/testAiSourceDisplay';

/** UI equality only. Preserve array order and every field, including price and
 * provenance; do not conflate absent values, null, zero or non-finite numbers.
 * Source packets/summaries are acyclic plain records, arrays and primitives.
 * Other object types are equal only by identity (except Dates).
 */
export function testAiUiContentEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime());
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => testAiUiContentEqual(value, right[index]));
  }
  const prototype = Object.getPrototypeOf(left);
  if (prototype !== Object.getPrototypeOf(right) || (prototype !== Object.prototype && prototype !== null)) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = Object.keys(leftRecord);
  return keys.length === Object.keys(rightRecord).length && keys.every((key) =>
    Object.prototype.hasOwnProperty.call(rightRecord, key) && testAiUiContentEqual(leftRecord[key], rightRecord[key]));
}

/** Same-content reports retain the parent state object. A changed item/source
 * scope resets in the layout commit phase, before child passive reports are
 * queued. A later parent passive reset could erase the new child's first report.
 * Old-scope callbacks cannot refill it.
 */
export function useTestAiContentState<T>(initialValue: T, scope = ''): [T, Dispatch<SetStateAction<T>>] {
  const [stored, setStored] = useState(() => ({ scope, value: initialValue }));
  useLayoutEffect(() => {
    if (stored.scope !== scope) {
      setStored((current) => current.scope === scope ? current : { scope, value: initialValue });
    }
  }, [initialValue, scope, stored.scope]);
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setStored((current) => {
      if (current.scope !== scope) return current;
      const value = typeof next === 'function' ? (next as (previous: T) => T)(current.value) : next;
      return testAiUiContentEqual(current.value, value) ? current : { scope, value };
    });
  }, [scope]);
  return [stored.scope === scope ? stored.value : initialValue, setValue];
}

/** Query wrappers change independently of their data. Failed-request display
 * packets and eBay visual merges must not allocate on every parent render.
 * Keep all existing source/visual fields and the original merge precedence.
 */
export function useTestAiSourceDisplayData<T>(data: T | undefined, requestFailed: boolean, visualReview?: Record<string, unknown> | null, requestError?: unknown) {
  const displayData = useMemo(() => sourceRequestDisplayData(data, requestFailed, requestError), [data, requestFailed, requestError]);
  return useMemo(() => {
    return { data: displayData, evidenceData: visualReview ? { ...displayData, ...visualReview } : displayData };
  }, [displayData, visualReview]);
}
