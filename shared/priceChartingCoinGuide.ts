export type PriceChartingCoinGuide = {
  /** Canonical listing grade and PriceCharting price key matched exactly. */
  grade: string;
  selectedGrade: string;
  matchType: 'exact';
  value: number;
};

function normalizedText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s._/-]+/g, '');
}

function isGradedCoinCategory(category: unknown): boolean {
  return String(category ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_') === 'coins';
}

/**
 * Selects only an exact certified-grade PriceCharting coin value. Numeric-only
 * and approximate labels are deliberately rejected: a value such as `ms65`
 * must match the listing's declared `MS65` exactly after harmless formatting
 * is removed. This is an aggregated sale-derived guide value, not one dated
 * transaction, so downstream analyzer use is capped separately.
 */
export function selectExactPriceChartingCoinGuide(input: {
  category: string;
  grade?: string | null;
  prices?: unknown;
}): PriceChartingCoinGuide | null {
  if (!isGradedCoinCategory(input.category) || !input.prices || typeof input.prices !== 'object' || Array.isArray(input.prices)) return null;

  const targetGrade = normalizedText(input.grade);
  // Require an explicit coin-grade prefix. Bare numeric grades are ambiguous
  // between different grading scales and therefore cannot create a guide anchor.
  if (!/^(?:MS|PR|PF|SP|AU|XF|VF|F|VG|G|FR|PO)\d{1,3}(?:[A-Z]+)?$/.test(targetGrade)) return null;

  for (const [rawGrade, rawValue] of Object.entries(input.prices as Record<string, unknown>)) {
    if (normalizedText(rawGrade) !== targetGrade) continue;
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null;
    return { grade: targetGrade, selectedGrade: targetGrade, matchType: 'exact', value: Math.round(value * 100) / 100 };
  }
  return null;
}
