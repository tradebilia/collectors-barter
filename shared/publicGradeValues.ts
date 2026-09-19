/**
 * Formats numeric grades for every public surface without modifying the stored
 * listing value. A collectible grade is displayed with at most one decimal
 * place, so "9.80" becomes "9.8" and "10.0" becomes "10".
 */
export function formatPublicGradeValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "ungraded") return "";

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) return normalized;
  if (numericValue <= 0) return "";

  return (Math.round((numericValue + Number.EPSILON) * 10) / 10).toString();
}
