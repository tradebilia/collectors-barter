/**
 * Formats numeric grades for every public surface without modifying the stored
 * listing value. A collectible grade is displayed with at most one decimal
 * place, so "9.80" becomes "9.8" and "10.0" becomes "10".
 */
export function formatPublicGradeValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "ungraded") return "";

  // PCGS coin labels are stored in their API/search form (for example MS65)
  // but are easier to read publicly with a separator (MS-65). Keep values
  // that already contain whitespace, such as "AFA 85", unchanged.
  const compactSheldonLabel = normalized.match(/^([A-Za-z]{1,8})(\d{1,3})(\+)?$/);
  if (compactSheldonLabel) {
    return `${compactSheldonLabel[1].toUpperCase()}-${compactSheldonLabel[2]}${compactSheldonLabel[3] ?? ""}`;
  }

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) return normalized;
  if (numericValue <= 0) return "";

  return (Math.round((numericValue + Number.EPSILON) * 10) / 10).toString();
}
