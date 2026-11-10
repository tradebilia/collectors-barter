/** Financial evidence floors are unchanged; review budgets provide opportunity only. */
export type CategoryEvidenceThresholds = {
  category: string;
  minimumSelectedSales: number;
  minimumIndependentMarketplaces: number;
  maximumSpreadPct: number;
  rationale: string;
};

type EvidenceThresholdValues = Readonly<Omit<CategoryEvidenceThresholds, 'category'>>;

const CATEGORY_EVIDENCE_THRESHOLDS: Readonly<Record<string, EvidenceThresholdValues>> = Object.freeze({
  comics: Object.freeze({ minimumSelectedSales: 5, minimumIndependentMarketplaces: 2, maximumSpreadPct: 75, rationale: 'Issue, grade, variant, and slab differences can materially change comic values.' }),
  sports_cards: Object.freeze({ minimumSelectedSales: 5, minimumIndependentMarketplaces: 2, maximumSpreadPct: 75, rationale: 'Grade, parallel, and certification differences can materially change card values.' }),
  pokemon: Object.freeze({ minimumSelectedSales: 5, minimumIndependentMarketplaces: 2, maximumSpreadPct: 75, rationale: 'Set, card number, language, and grade need multiple independent confirmations.' }),
  coins: Object.freeze({ minimumSelectedSales: 4, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Mint, denomination, grade, and variety evidence is often thinner but still requires source breadth.' }),
  stamps: Object.freeze({ minimumSelectedSales: 4, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Country, catalog number, denomination, and hinge/use state can fragment the market.' }),
  video_games: Object.freeze({ minimumSelectedSales: 4, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Platform, edition, completeness, and grading state drive condition-sensitive prices.' }),
  music: Object.freeze({ minimumSelectedSales: 3, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Pressing, format, release year, and autograph state can differ across records.' }),
  movies: Object.freeze({ minimumSelectedSales: 3, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Format, release year, region, and graded/raw state must be cross-checked.' }),
  vintage_toys: Object.freeze({ minimumSelectedSales: 4, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Completeness, edition, packaging, and condition vary substantially.' }),
  disney_pins: Object.freeze({ minimumSelectedSales: 3, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Release, edition, set, and authenticity details can affect comparability.' }),
  autographs: Object.freeze({ minimumSelectedSales: 3, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Signer, item type, authentication, and inscription details require corroboration.' }),
});

const UNKNOWN_CATEGORY_EVIDENCE_THRESHOLDS: EvidenceThresholdValues = Object.freeze({
  minimumSelectedSales: 5,
  minimumIndependentMarketplaces: 2,
  maximumSpreadPct: 75,
  rationale: 'Unmapped categories use the conservative general evidence standard.',
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
