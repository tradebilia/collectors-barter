export type TestAiSelectedItemInput = {
  title: string;
  itemDetails?: string | null;
  [key: string]: unknown;
};

function validYear(value: unknown): string {
  const candidate = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  return /^(?:18|19|20)\d{2}$/.test(candidate) ? candidate : '';
}

function firstText(...values: unknown[]): string {
  const value = values.find((candidate) => typeof candidate === 'string' || typeof candidate === 'number');
  return value == null ? '' : String(value).trim();
}

export function extractTestAiTitleYear(title: string): string {
  const match = title.match(/\b(?:18|19|20)\d{2}\b/);
  return match?.[0] ?? '';
}

export function normalizeTestAiSelectedItem<T extends TestAiSelectedItemInput>(item: T): T & { year?: string; itemDetails: string } {
  let details: Record<string, unknown> = {};
  if (typeof item.itemDetails === 'string' && item.itemDetails.trim()) {
    try {
      const parsed = JSON.parse(item.itemDetails);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) details = { ...parsed };
    } catch {
      details = {};
    }
  }

  const titleYear = extractTestAiTitleYear(item.title);
  const storedYear = validYear(details.year) || validYear(details.releaseYear) || validYear(details.manufactureYear);
  const currentYear = titleYear || storedYear;
  if (currentYear) details.year = currentYear;
  // Selected listings can carry these as top-level normalized fields while their
  // historical itemDetails JSON is incomplete. Preserve them as supplemental
  // search identity only; this never changes the stored inventory record.
  if (!firstText(details.setName, details.cardSet, details.set)) {
    const setName = firstText(item.setName, item.cardSet, item.set, item.series, item.releaseName);
    if (setName) details.setName = setName;
  }
  if (!firstText(details.cardNumber, details.cardNo, details.number)) {
    const cardNumber = firstText(item.cardNumber, item.cardNo, item.number);
    if (cardNumber) details.cardNumber = cardNumber;
  }
  if (!firstText(details.variant, details.parallel, details.printing, details.edition, details.finish)) {
    const variant = firstText(item.variant, item.parallel, item.printing, item.edition, item.finish);
    if (variant) details.variant = variant;
  }
  const certId = firstText(item.certId, item.certNumber, item.certificationNumber, item.certificateNumber, details.certId, details.certNumber, details.certificationNumber, details.certificateNumber);
  const gradingCompany = firstText(item.certificationCompany, item.gradingCompany, details.certificationCompany, details.gradingCompany, details.customGradingCompany);

  return {
    ...item,
    year: currentYear || undefined,
    certId: certId || undefined,
    certificationCompany: gradingCompany || item.certificationCompany || undefined,
    gradingCompany: gradingCompany || item.gradingCompany || undefined,
    itemDetails: JSON.stringify(details),
  } as T & { year?: string; certId?: string; certificationCompany?: string; gradingCompany?: string; itemDetails: string };
}
