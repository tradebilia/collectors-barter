function parseValidDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function deriveShippingDeadline(
  shippingDeadline?: string | Date | null,
  shippingStartedAt?: string | Date | null,
): Date | null {
  const explicitDeadline = parseValidDate(shippingDeadline);
  if (explicitDeadline) return explicitDeadline;
  const startedAt = parseValidDate(shippingStartedAt);
  if (!startedAt) return null;
  startedAt.setUTCDate(startedAt.getUTCDate() + 3);
  return startedAt;
}
