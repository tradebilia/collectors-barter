export type VisionImpactStatus =
  | 'not_run'
  | 'no_new_evidence'
  | 'identity_confirmed'
  | 'manual_review_required';

export type VisionReview = {
  label?: 'ITEM A' | 'ITEM B';
  visibleIdentifiers?: string[];
  metadataMatches?: string[];
  potentialConflicts?: string[];
  conditionObservations?: string[];
  confidence?: 'high' | 'medium' | 'low' | string;
};

export type VisionImpactTarget = {
  title: string;
  category: string;
  grade?: string;
  certificationCompany?: string | null;
  itemDetails?: string;
  imageUrl?: string;
};

export type VisionImpactReport = {
  status: VisionImpactStatus;
  baseline: string;
  imageReview: string;
  metadataClaimCount: number;
  visibleIdentifierCount: number;
  confirmedMatchCount: number;
  conflictCount: number;
  conditionObservationCount: number;
  confidence: 'high' | 'medium' | 'low' | 'not_run';
  recommendedAction: string;
  valuationTreatment: string;
};

function metadataClaimCount(item: VisionImpactTarget): number {
  let total = 0;
  if (item.title.trim()) total += 1;
  if (item.category.trim()) total += 1;
  if (item.grade?.trim()) total += 1;
  if (item.certificationCompany?.trim()) total += 1;
  if (!item.itemDetails) return total;
  try {
    const details = JSON.parse(item.itemDetails);
    if (details && typeof details === 'object' && !Array.isArray(details)) {
      total += Object.values(details).filter((value) => String(value ?? '').trim().length > 0).length;
    }
  } catch {
    // Listing detail text is untrusted and does not count as structured identity metadata.
  }
  return total;
}

function normalizedCount(values: unknown): number {
  if (!Array.isArray(values)) return 0;
  return new Set(values.map((value) => String(value).trim()).filter(Boolean)).size;
}

function meaningfulConflictCount(values: unknown): number {
  if (!Array.isArray(values)) return 0;
  const noConflict = /^(?:none|none observed|no conflicts?(?: observed)?|no material conflicts?(?: observed)?|n\/a|not applicable)[.!\s]*$/i;
  return new Set(
    values
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0 && !noConflict.test(value)),
  ).size;
}

export function evaluateVisionImpact(item: VisionImpactTarget, review?: VisionReview | null): VisionImpactReport {
  const claims = metadataClaimCount(item);
  if (!item.imageUrl) {
    return {
      status: 'not_run',
      baseline: `Metadata-only review has ${claims} supplied identity claim${claims === 1 ? '' : 's'}; no listing image was available to verify them.`,
      imageReview: 'No image review was run.',
      metadataClaimCount: claims,
      visibleIdentifierCount: 0,
      confirmedMatchCount: 0,
      conflictCount: 0,
      conditionObservationCount: 0,
      confidence: 'not_run',
      recommendedAction: 'Request a clear front image and, for graded items, a readable certification-label image before relying on identity-sensitive comparables.',
      valuationTreatment: 'No valuation treatment changes. Image review cannot create or replace sales evidence.',
    };
  }

  if (!review) {
    return {
      status: 'not_run',
      baseline: `Metadata-only review has ${claims} supplied identity claim${claims === 1 ? '' : 's'}.`,
      imageReview: 'An image was supplied, but the visual reviewer produced no structured result.',
      metadataClaimCount: claims,
      visibleIdentifierCount: 0,
      confirmedMatchCount: 0,
      conflictCount: 0,
      conditionObservationCount: 0,
      confidence: 'not_run',
      recommendedAction: 'Treat this as metadata-only and rerun image review; do not infer an image-based confirmation.',
      valuationTreatment: 'No valuation treatment changes. Image review cannot create or replace sales evidence.',
    };
  }

  const visibleIdentifierCount = normalizedCount(review.visibleIdentifiers);
  const confirmedMatchCount = normalizedCount(review.metadataMatches);
  const conflictCount = meaningfulConflictCount(review.potentialConflicts);
  const conditionObservationCount = normalizedCount(review.conditionObservations);
  const confidence = review.confidence === 'high' || review.confidence === 'medium' || review.confidence === 'low'
    ? review.confidence
    : 'low';

  if (conflictCount > 0) {
    return {
      status: 'manual_review_required',
      baseline: `Metadata-only review has ${claims} supplied identity claim${claims === 1 ? '' : 's'} and would not detect image-to-listing conflicts.`,
      imageReview: `Vision found ${conflictCount} potential conflict${conflictCount === 1 ? '' : 's'} and ${visibleIdentifierCount} visible identifier${visibleIdentifierCount === 1 ? '' : 's'}.`,
      metadataClaimCount: claims,
      visibleIdentifierCount,
      confirmedMatchCount,
      conflictCount,
      conditionObservationCount,
      confidence,
      recommendedAction: 'Pause identity-sensitive comparable matching and manually verify the image, certification label, variant, and listing metadata before treating a market result as comparable.',
      valuationTreatment: 'Do not change the dollar estimate automatically. Downgrade identity confidence and require human review first.',
    };
  }

  if (confirmedMatchCount > 0 || visibleIdentifierCount > 0) {
    return {
      status: 'identity_confirmed',
      baseline: `Metadata-only review has ${claims} supplied identity claim${claims === 1 ? '' : 's'} but no independent visual check.`,
      imageReview: `Vision independently confirmed ${confirmedMatchCount} metadata match${confirmedMatchCount === 1 ? '' : 'es'} and read ${visibleIdentifierCount} visible identifier${visibleIdentifierCount === 1 ? '' : 's'}.`,
      metadataClaimCount: claims,
      visibleIdentifierCount,
      confirmedMatchCount,
      conflictCount,
      conditionObservationCount,
      confidence,
      recommendedAction: 'Keep the existing comparable rules, but record the image confirmation as a confidence aid. Human authentication is still required for high-value items.',
      valuationTreatment: 'No automatic price adjustment. The benefit is safer identity matching, not an image-derived valuation.',
    };
  }

  return {
    status: 'no_new_evidence',
    baseline: `Metadata-only review has ${claims} supplied identity claim${claims === 1 ? '' : 's'}.`,
    imageReview: 'Vision did not read a reliable identifier or find a conflict in the available image.',
    metadataClaimCount: claims,
    visibleIdentifierCount,
    confirmedMatchCount,
    conflictCount,
    conditionObservationCount,
    confidence,
    recommendedAction: 'Use the existing metadata and market evidence, and request a sharper or closer image if visual confirmation is important.',
    valuationTreatment: 'No valuation treatment changes. Absence of a vision finding is not evidence that the listing is correct.',
  };
}

export const VISUAL_IDENTITY_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', enum: ['ITEM A', 'ITEM B'] },
          visibleIdentifiers: { type: 'array', items: { type: 'string' } },
          metadataMatches: { type: 'array', items: { type: 'string' } },
          potentialConflicts: { type: 'array', items: { type: 'string' } },
          conditionObservations: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['label', 'visibleIdentifiers', 'metadataMatches', 'potentialConflicts', 'conditionObservations', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const;

export const VISUAL_IDENTITY_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'test_ai_visual_identity_review',
    strict: true,
    schema: VISUAL_IDENTITY_RESPONSE_SCHEMA,
  },
};

export const VISUAL_IDENTITY_EVALUATION_PROTOCOL = [
  'Freeze the exact item metadata and market-source snapshot before comparing modes.',
  'Run metadata-only and image-review modes against the same selected listing images.',
  'Score only pre-labelled identity fields and known mismatch cases; do not score prose style or price changes.',
  'Measure confirmed identifiers, correctly flagged conflicts, missed seeded conflicts, false conflicts, latency, and provider-format failures.',
  'Treat image review as a confidence and safety control; completed sales remain the sole valuation authority.',
] as const;
