export type VisualSoldMatchVerdict = 'match' | 'rough_match' | 'mismatch' | 'unreadable';

export type VisualSoldCandidateReview = {
  candidateIndex: number;
  verdict: VisualSoldMatchVerdict;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
};

export type VisualSoldFilterResult = {
  listings: any[];
  reviewedCount: number;
  removedCount: number;
  retainedUnreviewedCount: number;
  reviews: VisualSoldCandidateReview[];
  status: 'applied' | 'skipped_no_target_image' | 'skipped_no_candidate_images' | 'provider_unavailable';
  note: string;
};

export const VISUAL_SOLD_FILTER_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'visual_sold_comparable_filter',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        reviews: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              candidateIndex: { type: 'integer', minimum: 0, maximum: 20 },
              verdict: { type: 'string', enum: ['match', 'rough_match', 'mismatch', 'unreadable'] },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
              rationale: { type: 'string', maxLength: 300 },
            },
            required: ['candidateIndex', 'verdict', 'confidence', 'rationale'],
            additionalProperties: false,
          },
          maxItems: 20,
        },
      },
      required: ['reviews'],
      additionalProperties: false,
    },
  },
};

export function normalizeVisualSoldReviews(value: unknown, candidateCount: number): VisualSoldCandidateReview[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as any).reviews)) return [];
  const seen = new Set<number>();
  return (value as any).reviews.flatMap((review: any) => {
    const index = Number(review?.candidateIndex);
    const verdict = review?.verdict;
    const confidence = review?.confidence;
    if (!Number.isInteger(index) || index < 0 || index >= candidateCount || seen.has(index)) return [];
    if (!['match', 'rough_match', 'mismatch', 'unreadable'].includes(verdict)) return [];
    if (!['high', 'medium', 'low'].includes(confidence)) return [];
    seen.add(index);
    return [{ candidateIndex: index, verdict, confidence, rationale: String(review?.rationale ?? '').trim().slice(0, 300) }];
  });
}

export function isSafeVisualSoldRemoval(review: VisualSoldCandidateReview): boolean {
  return review.verdict === 'mismatch' && review.confidence === 'high';
}

export function applyVisualSoldReviews(
  listings: any[],
  reviews: VisualSoldCandidateReview[],
  reviewedLimit: number,
  options?: { preserveHighConfidenceMismatches?: boolean },
): VisualSoldFilterResult {
  const highConfidenceMismatchCount = reviews.filter(isSafeVisualSoldRemoval).length;
  const removable = new Set(
    options?.preserveHighConfidenceMismatches
      ? []
      : reviews.filter(isSafeVisualSoldRemoval).map((review) => review.candidateIndex),
  );
  const kept = listings.filter((_, index) => !removable.has(index));
  const retainedUnreviewedCount = listings.slice(0, reviewedLimit).filter((_, index) => !reviews.some((review) => review.candidateIndex === index)).length;
  return {
    listings: kept,
    reviewedCount: reviews.length,
    removedCount: listings.length - kept.length,
    retainedUnreviewedCount,
    reviews,
    status: 'applied',
    note: options?.preserveHighConfidenceMismatches && highConfidenceMismatchCount
      ? `Preserved ${highConfidenceMismatchCount} high-confidence visual flag${highConfidenceMismatchCount === 1 ? '' : 's'} because exact text identity passed; manual review remains required.`
      : removable.size
      ? `Removed ${removable.size} high-confidence visual mismatch${removable.size === 1 ? '' : 'es'}; rough, unreadable, and unreviewed candidates were retained.`
      : 'No high-confidence visual mismatches were removed; rough, unreadable, and unreviewed candidates were retained.',
  };
}

export function buildVisualSoldFilterNote(result: VisualSoldFilterResult): string {
  return `Final visual sold-comparable filter: ${result.reviewedCount} candidate image${result.reviewedCount === 1 ? '' : 's'} reviewed, ${result.removedCount} removed, ${result.retainedUnreviewedCount} reviewed-window candidate${result.retainedUnreviewedCount === 1 ? '' : 's'} retained without a decisive visual result. Only high-confidence mismatches are removed. ${result.note}`;
}

export const VISUAL_SOLD_FILTER_PROMPT_NOTE = 'Compare the target listing image with each sold candidate image as the same physical collectible type, not as identical photography. A console/system must not match a game cartridge; a card must not match a different object. Use rough_match when the same object type and identity are plausible but the photo is different. Use mismatch only when the object type or visible identity clearly conflicts. Use unreadable when the candidate image is too small, missing, or ambiguous. Never judge value, authenticity, or condition as the reason for a mismatch.';
