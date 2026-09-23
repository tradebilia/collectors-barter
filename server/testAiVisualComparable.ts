import type { FieldCompletionCandidate } from './testAiFieldCompletion';

export type VisualComparableQueryItem = {
  title: string;
  category: string;
  grade?: string;
  certificationCompany?: string | null;
};

export type VisualComparableQuery = {
  query: string;
  fieldsUsed: Array<Pick<FieldCompletionCandidate, 'field' | 'label' | 'value' | 'status' | 'confidence'>>;
  reason: string;
};

const QUERY_FIELD_ALLOWLIST = new Set([
  'series', 'setName', 'edition', 'editionEra', 'cardName', 'cardNumber', 'issueNumber',
  'variant', 'parallel', 'finishVariant', 'pressing', 'recordLabel', 'catalogNumber',
  'platform', 'region', 'releaseType', 'character', 'toyLine', 'signer', 'artist',
  'releaseTitle', 'publisher', 'sport', 'team', 'player', 'manufacturer', 'brand',
]);

function cleanToken(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/["\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function buildVisualComparableQuery(
  item: VisualComparableQueryItem,
  appliedFields: Array<Pick<FieldCompletionCandidate, 'field' | 'label' | 'value' | 'status' | 'confidence'>>,
): VisualComparableQuery | null {
  const fieldsUsed = appliedFields.filter((field) => QUERY_FIELD_ALLOWLIST.has(field.field));
  if (!fieldsUsed.length) return null;
  const parts = [item.title, ...fieldsUsed.map((field) => cleanToken(field.value))];
  if (item.certificationCompany) parts.push(cleanToken(item.certificationCompany));
  const parsedGrade = item.grade ? Number.parseFloat(item.grade) : NaN;
  if (Number.isFinite(parsedGrade) && parsedGrade > 0) parts.push(String(parsedGrade));
  const seen = new Set<string>();
  const query = parts.flatMap((part) => part.split(/\s+/)).filter(Boolean).filter((token) => {
    const normalized = token.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).join(' ').slice(0, 180);
  return {
    query,
    fieldsUsed,
    reason: 'High-confidence visible/OCR identity fields were appended temporarily to narrow the comparable search. Existing listing data was not changed.',
  };
}

export function buildVisualComparableContext(label: string, query: VisualComparableQuery | null, metrics?: { count: number; median: number; min: number; max: number; confidence: string } | null): string {
  if (!query) return `${label}: No eligible visual identity field was available to refine the comparable query.`;
  const metricText = metrics
    ? ` Supplemental active-listing context: ${metrics.count} results, median $${metrics.median}, range $${metrics.min}-$${metrics.max}, confidence ${metrics.confidence}.`
    : ' No refined active-listing results were returned.';
  return `${label}: refined query "${query.query}" using ${query.fieldsUsed.map((field) => `${field.label}=${field.value}`).join('; ')}.${metricText} This is asking-price context only, not completed-sale valuation evidence.`;
}

export const VISUAL_COMPARABLE_QUERY_NOTE = 'A refined query is an identity-matching aid. Completed sales remain authoritative; active asking prices never change the deterministic trade verdict.';

export function extractRefinedActiveMetrics(items: any[], compute: (items: any[]) => any): any {
  return compute(items);
}
