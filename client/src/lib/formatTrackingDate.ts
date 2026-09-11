export function formatTrackingDate(value: string | null | undefined, locale?: string): string {
  if (!value) return "Not provided";

  const normalized = value.trim();
  if (!normalized) return "Not provided";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T12:00:00`)
    : new Date(normalized);

  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString(locale);
}

export function isValidTrackingDate(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T12:00:00`)
    : new Date(normalized);
  return !Number.isNaN(date.getTime());
}
