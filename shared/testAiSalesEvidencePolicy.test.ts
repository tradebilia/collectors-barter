import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildSoldReviewBudget,
  getCategoryEvidenceThresholds,
  type CategoryEvidenceThresholds,
} from './testAiSalesEvidencePolicy';

const EXPECTED_THRESHOLDS: CategoryEvidenceThresholds[] = [
  { category: 'comics', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 75, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'sports_cards', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 75, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'pokemon', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 75, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'coins', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'stamps', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'video_games', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'music', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'movies', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'vintage_toys', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'disney_pins', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
  { category: 'autographs', minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: 100, rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.' },
];

const EXPECTED_UNKNOWN = {
  minimumSelectedSales: 1,
  minimumIndependentMarketplaces: 1,
  maximumSpreadPct: 75,
  rationale: 'Temporary sandbox floor: one valid sale can move through valuation for matching/source testing; evidence remains sparse.',
};

// Source-only inspection deliberately avoids the engine's canonical -> visual runtime graph.
const POLICY_SOURCE = readFileSync(new URL('./testAiSalesEvidencePolicy.ts', import.meta.url), 'utf8');
const ENGINE_SOURCE = readFileSync(new URL('../server/testAiComparableEngine.ts', import.meta.url), 'utf8');

const INVALID_COUNTS: unknown[] = [
  undefined, null, NaN, Infinity, -Infinity, -1, -0.5, 0.5, 9.5,
  Number.MAX_SAFE_INTEGER + 1, Number.MAX_VALUE,
  '', '0', '30', '1000000', false, true, [], [30], {}, { value: 30 }, 30n,
  { valueOf: () => 1000000 },
];

describe('getCategoryEvidenceThresholds', () => {
  it.each(EXPECTED_THRESHOLDS)('preserves every exact financial literal for $category', (expected) => {
    expect(getCategoryEvidenceThresholds(expected.category)).toEqual(expected);
  });

  it.each(EXPECTED_THRESHOLDS)('preserves case, whitespace and hyphen normalization for $category', (expected) => {
    for (const input of [
      `  ${expected.category.toUpperCase()}  `,
      expected.category.replace(/_/g, ' '),
      expected.category.replace(/_/g, '-'),
      `\t${expected.category.toUpperCase().replace(/_/g, ' \t--  ')}\n`,
    ]) {
      expect(getCategoryEvidenceThresholds(input)).toEqual(expected);
    }
  });

  it.each([
    ['unmapped', 'unmapped'],
    ['  Future Category -- Subtype  ', 'future_category_subtype'],
    ['VIDEO.GAMES', 'video.games'],
    ['', 'unknown'],
    [' \t\n ', 'unknown'],
    ['--', '_'],
    ['constructor', 'constructor'],
    ['__proto__', '__proto__'],
    ['toString', 'tostring'],
  ])('uses the exact conservative fallback for %s', (input, normalized) => {
    expect(getCategoryEvidenceThresholds(input)).toEqual({ category: normalized, ...EXPECTED_UNKNOWN });
  });

  it('preserves existing String conversion and nullish-category behavior', () => {
    for (const input of [undefined, null]) {
      expect(getCategoryEvidenceThresholds(input as unknown as string)).toEqual({ category: 'unknown', ...EXPECTED_UNKNOWN });
    }
    expect(getCategoryEvidenceThresholds(123 as unknown as string)).toEqual({ category: '123', ...EXPECTED_UNKNOWN });
  });

  it.each([...EXPECTED_THRESHOLDS, { category: 'unknown', ...EXPECTED_UNKNOWN }])(
    'returns fresh mutable snapshots without exposing internal constants for $category', (expected) => {
      const first = getCategoryEvidenceThresholds(expected.category);
      const second = getCategoryEvidenceThresholds(expected.category);
      expect(first).not.toBe(second);
      expect(Object.isFrozen(first)).toBe(false);
      first.category = 'changed';
      first.minimumSelectedSales = 999;
      first.minimumIndependentMarketplaces = 999;
      first.maximumSpreadPct = 999;
      first.rationale = 'changed';
      expect(second).toEqual(expected);
      expect(getCategoryEvidenceThresholds(expected.category)).toEqual(expected);
    },
  );
});

describe('buildSoldReviewBudget', () => {
  it.each([
    ['comics', 1, 3, 5],
    ['sports_cards', 1, 3, 5],
    ['pokemon', 1, 3, 5],
    ['coins', 1, 3, 5],
    ['stamps', 1, 3, 5],
    ['video_games', 1, 3, 5],
    ['music', 1, 3, 5],
    ['movies', 1, 3, 5],
    ['vintage_toys', 1, 3, 5],
    ['disney_pins', 1, 3, 5],
    ['autographs', 1, 3, 5],
    ['unknown', 1, 3, 5],
  ] as const)('adds only review opportunity for %s', (category, minimum, singleMarketplace, requested) => {
    expect(buildSoldReviewBudget(category, 2, 30)).toEqual({
      sourceRole: 'sold_source',
      normalizedCategory: category,
      minimumSelectedSales: minimum,
      singleMarketplaceSalesRequirement: singleMarketplace,
      reviewBuffer: 2,
      requestedSelectionBudget: requested,
      eligibleImageBearingCount: 30,
      selectedCount: requested,
      opportunityShortfall: 0,
      admittedCurrentSalesCount: null,
      verifiedCurrentSalesDeficit: null,
      deficitBasis: 'no_server_verified_admitted_context',
    });
  });

  it('normalizes the diagnostic category through the unchanged threshold getter', () => {
    expect(buildSoldReviewBudget('  VIDEO -- GAMES  ', 6, 20)).toEqual(buildSoldReviewBudget('video_games', 6, 20));
    expect(buildSoldReviewBudget('', 0, 20).normalizedCategory).toBe('unknown');
    expect(buildSoldReviewBudget(' New -- Category ', 0, 20).normalizedCategory).toBe('new_category');
  });

  it('retains the explicit Sports cap of ten while using the one-sale floor', () => {
    expect(buildSoldReviewBudget('Sports Cards', 10, 30)).toMatchObject({
      minimumSelectedSales: 1,
      singleMarketplaceSalesRequirement: 3,
      requestedSelectionBudget: 10,
      selectedCount: 10,
      opportunityShortfall: 0,
    });
  });

  it.each([
    [12, 30, 30, 12, 12, 0],
    [48, 100, 30, 48, 30, 18],
    [48, 7, 30, 48, 7, 41],
    [48, 100, 100, 48, 30, 18],
    [48, 100, 6, 48, 6, 42],
    [6, 30, 5, 6, 5, 1],
    [6, 3, 30, 6, 3, 3],
    [6, 0, 30, 6, 0, 6],
    [6, 30, 0, 6, 0, 6],
    [30, 30, 30, 30, 30, 0],
  ])('bounds cap %s / available %s / approved max %s', (cap, available, maximum, requested, selected, shortfall) => {
    const budget = buildSoldReviewBudget('video_games', cap, available, maximum);
    expect(budget.requestedSelectionBudget).toBe(requested);
    expect(budget.eligibleImageBearingCount).toBe(available);
    expect(budget.selectedCount).toBe(selected);
    expect(budget.opportunityShortfall).toBe(shortfall);
    expect(budget.selectedCount).toBeLessThanOrEqual(available);
    expect(budget.selectedCount).toBeLessThanOrEqual(maximum);
    expect(budget.selectedCount).toBeLessThanOrEqual(30);
  });

  it('supports safe large integers without losing demand or bypassing the global cap', () => {
    const budget = buildSoldReviewBudget('video_games', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    expect(budget.requestedSelectionBudget).toBe(Number.MAX_SAFE_INTEGER);
    expect(budget.selectedCount).toBe(30);
    expect(budget.opportunityShortfall).toBe(Number.MAX_SAFE_INTEGER - 30);
    expect(Number.isSafeInteger(budget.opportunityShortfall)).toBe(true);
  });

  it('defaults an omitted or undefined maximum to thirty but honors explicit zero', () => {
    expect(buildSoldReviewBudget('pokemon', 48, 100).selectedCount).toBe(30);
    expect(buildSoldReviewBudget('pokemon', 48, 100, undefined).selectedCount).toBe(30);
    expect(buildSoldReviewBudget('pokemon', 48, 100, 0).selectedCount).toBe(0);
  });

  it('does not coerce, round or allow invalid existing caps to inflate requests', () => {
    for (const invalid of INVALID_COUNTS) {
      expect(buildSoldReviewBudget('video_games', invalid as number, 30)).toMatchObject({
        requestedSelectionBudget: 5,
        selectedCount: 5,
        opportunityShortfall: 0,
      });
    }
  });

  it('treats invalid availability as zero rather than selecting nonexistent opportunities', () => {
    for (const invalid of INVALID_COUNTS) {
      expect(buildSoldReviewBudget('video_games', 10, invalid as number)).toMatchObject({
        requestedSelectionBudget: 10,
        eligibleImageBearingCount: 0,
        selectedCount: 0,
        opportunityShortfall: 10,
      });
    }
  });

  it('treats invalid explicit maxima as zero without rounding up or defaulting to thirty', () => {
    for (const invalid of INVALID_COUNTS.filter(value => value !== undefined)) {
      expect(buildSoldReviewBudget('video_games', 10, 30, invalid as number)).toMatchObject({
        requestedSelectionBudget: 10,
        selectedCount: 0,
        opportunityShortfall: 10,
      });
    }
  });

  it.each(EXPECTED_THRESHOLDS)('does not mutate financial evidence requirements for $category', (expected) => {
    const budget = buildSoldReviewBudget(expected.category, 48, 100);
    expect(getCategoryEvidenceThresholds(expected.category)).toEqual(expected);
    expect(budget.minimumSelectedSales).toBe(expected.minimumSelectedSales);
    expect(budget.singleMarketplaceSalesRequirement).toBe(expected.minimumSelectedSales + 2);
    expect(budget.admittedCurrentSalesCount).toBeNull();
    expect(budget.verifiedCurrentSalesDeficit).toBeNull();
    expect(budget.deficitBasis).toBe('no_server_verified_admitted_context');
    expect(budget.sourceRole).toBe('sold_source');
  });
});

describe('sales-policy dependency and financial boundaries (source-only)', () => {
  it('keeps the leaf free of all runtime imports and re-export dependencies', () => {
    expect(POLICY_SOURCE).not.toMatch(/^\s*import\b/m);
    expect(POLICY_SOURCE).not.toMatch(/\b(?:import|require)\s*\(/);
    expect(POLICY_SOURCE).not.toMatch(/^\s*export\s+(?:\*|\{)[^\n]*\bfrom\b/m);
    expect(POLICY_SOURCE).not.toContain('testAiCanonicalObservation');
    expect(POLICY_SOURCE).not.toContain('testAiVisualSourceFilter');
  });

  it('freezes internal threshold entries and fallback without freezing getter output', () => {
    expect(POLICY_SOURCE).toContain('const CATEGORY_EVIDENCE_THRESHOLDS: Readonly<Record<string, EvidenceThresholdValues>> = Object.freeze({');
    expect((POLICY_SOURCE.match(/minimumSelectedSales: 1, minimumIndependentMarketplaces: 1, maximumSpreadPct: (?:75|100), rationale:/g) ?? []).length).toBe(11);
    expect((POLICY_SOURCE.match(/: Object\.freeze\(\{ minimumSelectedSales:/g) ?? []).length).toBe(11);
    expect(POLICY_SOURCE).toContain('const UNKNOWN_CATEGORY_EVIDENCE_THRESHOLDS: EvidenceThresholdValues = Object.freeze({');
    expect(POLICY_SOURCE).toContain("return { category: normalized || 'unknown', ...thresholds };");
  });

  it('preserves the public server getter/type by direct leaf re-exports without wiring review budgets into economics', () => {
    expect(ENGINE_SOURCE).toContain("import { getCategoryEvidenceThresholds, type CategoryEvidenceThresholds } from '../shared/testAiSalesEvidencePolicy';");
    expect(ENGINE_SOURCE).toContain("export { getCategoryEvidenceThresholds } from '../shared/testAiSalesEvidencePolicy';");
    expect(ENGINE_SOURCE).toContain("export type { CategoryEvidenceThresholds } from '../shared/testAiSalesEvidencePolicy';");
    expect(ENGINE_SOURCE).not.toContain('const CATEGORY_EVIDENCE_THRESHOLDS');
    expect(ENGINE_SOURCE).not.toContain('export type CategoryEvidenceThresholds =');
    expect(ENGINE_SOURCE).not.toContain('buildSoldReviewBudget');
  });

  it('preserves the temporary one-sale floor while qualifying undated Mercari separately from dated proof', () => {
    expect(ENGINE_SOURCE).toContain('const saleCount = profile.valuationEligibleSaleCount ?? profile.currentWindowSaleCount;');
    expect(ENGINE_SOURCE).toContain('const marketplaceCount = profile.valuationEligibleIndependentMarketplaceCount ?? profile.currentWindowIndependentMarketplaceCount;');
    expect(ENGINE_SOURCE).toContain(`  return Boolean(supported && low !== null && mid !== null && high !== null
    && [low, mid, high].every((value) => Number.isFinite(value) && value > 0)
    && low <= mid && mid <= high
    && saleCount >= floor.minimumSelectedSales
    // During sandbox matching validation, the shared floor is intentionally
    // one sale, so low confidence remains visible as a warning rather than
    // preventing the candidate from reaching valuation.
    && (floor.minimumSelectedSales === 1 || profile.evidenceQuality !== 'low')
    && profile.spreadPct !== null && profile.spreadPct <= floor.maximumSpreadPct
    && (marketplaceCount >= floor.minimumIndependentMarketplaces
      || saleCount >= floor.minimumSelectedSales + 2));`);
    expect(ENGINE_SOURCE).toContain('const evidenceIndependenceAdequate = independentMarketplaceCount >= categoryEvidenceThresholds.minimumIndependentMarketplaces || accepted.length >= categoryEvidenceThresholds.minimumSelectedSales + 2;');
  });
});
