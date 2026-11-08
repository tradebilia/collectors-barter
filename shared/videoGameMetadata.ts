/**
 * Video Games form semantics.
 * A sealed game has never been opened, so it is necessarily complete in box.
 * Keep this normalization source-neutral so the inventory form, visual target
 * metadata, and valuation gates cannot disagree about the same item.
 */
export function isAffirmativeVideoGameValue(value: unknown): boolean {
  return /^(?:yes|true|1)$/i.test(String(value ?? '').trim());
}

export function normalizeVideoGameMetadata<T extends Record<string, unknown>>(details: T): T {
  const normalized = { ...details };
  const fields = normalized as Record<string, unknown>;
  if (isAffirmativeVideoGameValue(fields.sealed) || isAffirmativeVideoGameValue(fields.factorySealed)) {
    fields.sealed = 'Yes';
    fields.completeInBox = 'Yes';
  }
  return normalized;
}
