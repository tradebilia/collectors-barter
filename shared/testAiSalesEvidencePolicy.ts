/**
 * Sandbox testing policy: one valid selected sold comparable is enough to
 * establish a provisional market-sales value while Rich validates matching
 * and source retrieval. The UI continues to label the evidence as sparse and
 * the stricter production floor can be restored here after live testing.
 */
export type CategoryEvidenceThresholds = {
  category: string;
  minimumSelectedSales: number;
  minimumIndependentMarketplaces: number;
  /** @deprecated Legacy response compatibility only; price spread never vetoes valuation. */
  maximumSpreadPct: number;
  rationale: string;
};

type EvidenceThresholdValues = Readonly<Omit<CategoryEvidenceThresholds, 'category'>>;

const CATEGORY_EVIDENCE_THRESHOLDS: Readonly<Record<string, EvidenceThresholdValues>> = Object.freeze({
  comics: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 75, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  sports_cards: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 75, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  pokemon: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 75, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  coins: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  stamps: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  video_games: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  music: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  movies: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  vintage_toys: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  disney_pins: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
  autographs: Object.freeze({ minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' }),
});

const UNKNOWN_CATEGORY_EVIDENCE_THRESHOLDS: EvidenceThresholdValues = Object.freeze({
  minimumSelectedSales: 1,
  minimumIndependentMarketplaces: 1,
  maximumSpreadPct: 75,
  rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.',
});

/** Returns a fresh, mutable snapshot, preserving the existing server getter contract. */
export function getCategoryEvidenceThresholds(category: string): CategoryEvidenceThresholds {
  const normalized = String(category ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const thresholds = Object.prototype.hasOwnProperty.call(CATEGORY_EVIDENCE_THRESHOLDS, normalized)
    ? CATEGORY_EVIDENCE_THRESHOLDS[normalized]!
    : UNKNOWN_CATEGORY_EVIDENCE_THRESHOLDS;
  return { category: normalized || 'unknown', ...thresholds };
}

const SINGLE_MARKETPLACE_EXTRA_SALES = 2;
const SOLD_REVIEW_BUFFER = 2;
const MAXIMUM_SOLD_REVIEW_CANDIDATES = 30;

export type SoldReviewBudget = {
  sourceRole: 'sold_source';
  normalizedCategory: string;
  minimumSelectedSales: number;
  singleMarketplaceSalesRequirement: number;
  reviewBuffer: 2;
  requestedSelectionBudget: number;
  eligibleImageBearingCount: number;
  selectedCount: number;
  /** Unfilled requested review slots, not a financial/admitted-sales deficit. */
  opportunityShortfall: number;
  admittedCurrentSalesCount: null;
  verifiedCurrentSalesDeficit: null;
  deficitBasis: 'no_server_verified_admitted_context';
};

/** No coercion or rounding: malformed, negative, fractional or unsafe counts become zero. */
function nonNegativeSafeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/**
 * Pure sold-source review opportunity; never admission, active-source credit, or pricing.
 * The unchanged single-marketplace requirement is minimumSelectedSales + 2; review
 * adds a separate two-slot buffer. A valid higher existing score-band cap is retained.
 * Numeric arguments must be non-negative safe integers. Invalid existing caps become
 * zero (no inflation); invalid availability or approved maxima select nothing. An
 * omitted/undefined maximum uses 30, while explicit zero allows none. The approved
 * maximum is always capped at 30. Requested demand remains visible before clamping.
 */
export function buildSoldReviewBudget(
  category: string,
  existingScoreBandCap: number,
  eligibleImageBearingCount: number,
  maximumCandidates: number = 30,
): SoldReviewBudget {
  const thresholds = getCategoryEvidenceThresholds(category);
  const singleMarketplaceSalesRequirement = thresholds.minimumSelectedSales + SINGLE_MARKETPLACE_EXTRA_SALES;
  const requestedSelectionBudget = Math.max(
    nonNegativeSafeInteger(existingScoreBandCap),
    singleMarketplaceSalesRequirement + SOLD_REVIEW_BUFFER,
  );
  const available = nonNegativeSafeInteger(eligibleImageBearingCount);
  const approvedMaximum = Math.min(nonNegativeSafeInteger(maximumCandidates), MAXIMUM_SOLD_REVIEW_CANDIDATES);
  const selectedCount = Math.min(requestedSelectionBudget, available, approvedMaximum);
  return {
    sourceRole: 'sold_source',
    normalizedCategory: thresholds.category,
    minimumSelectedSales: thresholds.minimumSelectedSales,
    singleMarketplaceSalesRequirement,
    reviewBuffer: SOLD_REVIEW_BUFFER,
    requestedSelectionBudget,
    eligibleImageBearingCount: available,
    selectedCount,
    opportunityShortfall: requestedSelectionBudget - selectedCount,
    admittedCurrentSalesCount: null,
    verifiedCurrentSalesDeficit: null,
    deficitBasis: 'no_server_verified_admitted_context',
  };
}
