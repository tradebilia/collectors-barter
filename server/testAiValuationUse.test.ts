import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: '' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('Stage 5 fixtures must not invoke a provider'); }) }));
import { createServerFinalIdentityApproval, getVerifiedIdentityApproval, sealCanonicalObservation } from './testAiCanonicalObservation';
import { buildVisualTargetMetadata, type VisualSourceReview } from './testAiVisualSourceFilter';
import { normalizeAnalysisMarketSale, normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { buildMarketProfile, scoreComparable, selectBalancedComparableSales, type MarketSale, type MarketProfile, type ComparableTarget } from './testAiComparableEngine';
import { buildAnalysisSnapshot, buildCashAwareTradeTerms } from './testAiAnalysisSnapshot';
import { issueGuideAnchor } from './testAiGuideEvidence';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { selectHistoricalTrendRecords } from './historicalTrendContext';
import type { FinalUseReport, FinalDisplayCorrelation } from '../shared/testAiValuationUse';

const now = new Date('2026-09-28T12:00:00.000Z');
const signingKey = 'synthetic-stage5-final-use-key';
const image = 'https://synthetic.invalid/item-a.jpg';
const target: ComparableTarget = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards',
  itemType: 'individual_card', grade: '10', certificationCompany: 'PSA', approvalTargetImageReference: image,
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
const evidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
  gradeMatches: true, rawOrLooseVisible: false, identityMatches: true };
function correlation(index: number, side: 'item_a' | 'item_b' = 'item_a'): FinalDisplayCorrelation {
  return { version: 'stage5-display-v1', side, sourceId: 'ebay_sold_comps', runId: 'source-run',
    occurrenceKey: `source:occ:${index}`, requestOccurrenceRef: `request:${side}:${index}` };
}
function raw(index: number, overrides: Partial<MarketSale> = {}): MarketSale {
  return { title: target.title, price: 1000 + index, currency: 'USD', date: '2026-09-01T00:00:00.000Z',
    marketplace: index % 2 ? 'Heritage' : 'eBay', originMarketplace: index % 2 ? 'Heritage' : 'eBay',
    sourceId: 'sold_comps', saleId: `sale-${index}`, url: `https://www.ebay.com/itm/${index}`,
    saleStatus: 'completed', priceBasis: 'sold', evidenceDisposition: 'valuation_eligible', visualRequirement: 'not_required',
    // These are known clean synthetic final amounts; contrary controls override this.
    buyerPremium: index % 2 ? 'included' : 'unknown',
    displayCorrelation: correlation(index), ...overrides };
}
function signed(index: number, overrides: Partial<MarketSale> = {}, approved = false): MarketSale {
  // Approval positives must be ordinary eBay rows, not the mixed-origin raw population.
  // Apply caller overrides last so restrictive/contrary fixture facts still fail closed.
  const sale = raw(index, { ...(approved ? { marketplace: 'eBay', originMarketplace: 'eBay',
    visualRequirement: 'required', visualReviewStatus: 'match' } : {}), ...overrides });
  let handle = null;
  if (approved) {
    const review: VisualSourceReview = { candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'Synthetic final pictured identity confirmed.',
      visualEvidence: evidence, visualAudit: { imageCount: 1, initialVerdict: 'match', initialConfidence: 'high', initialRationale: 'Synthetic final pictured identity confirmed.',
        retryStatus: 'not_needed', finalPass: 'initial', initialEvidence: evidence, finalEvidence: evidence } };
    handle = createServerFinalIdentityApproval({ sale, review, target, reviewedTarget: target,
      targetImageReference: image, expectedImageReference: image, targetMetadata: buildVisualTargetMetadata(target), acquiredAt: now });
    expect(handle).not.toBeNull();
  }
  const sealed = sealCanonicalObservation('sold_comps', sale, { acquiredAt: now, signingKey, identityApproval: handle });
  return { ...sale, provenanceToken: sealed.provenanceToken, provenance: sealed.provenance };
}
function normalized(sales: MarketSale[], effectiveTarget = target, side: 'item_a' | 'item_b' = 'item_a') {
  return normalizeAnalysisMarketSales(sales, now, { signingKey, target: effectiveTarget, category: effectiveTarget.category, side, analysisRunId: 'analysis-run' });
}
function population(report: FinalUseReport | undefined, id: string) {
  const found = report?.populations.find((row) => row.population === id);
  expect(found, id).toBeDefined();
  return found!;
}
function financial(profile: MarketProfile) {
  const { finalUseReport: _report, comparables, ...rest } = profile;
  return { ...rest, comparables: comparables.map(({ valuationUse: _use, identityAdmission: _identity, visualExecution: _execution,
    metadataRanking: _ranking, metadataOriginOccurrenceKey: _origin, metadataUnknownFields: _unknown,
    metadataScoreAwards: _awards, metadataMatchLabel: _label, ...row }) => row) };
}
function assertMembers(profile: MarketProfile) {
  const report = profile.finalUseReport!;
  const rows = profile.comparables.map((row) => row.valuationUse!);
  expect(new Set(rows.map((row) => row.auditRef.intakeRef)).size).toBe(rows.length);
  for (const [id, predicate] of [
    ['selected_pre_iqr', (row: typeof rows[number]) => row.selection === 'selected_pre_outlier'],
    ['post_policy_sale_diagnostics', (row: typeof rows[number]) => row.use.postPolicySaleDiagnostics],
    ['current_sale_median_diagnostics', (row: typeof rows[number]) => row.use.currentSaleMedianDiagnostics],
    ['primary_market_sales', (row: typeof rows[number]) => row.use.primaryMarketSales],
  ] as const) {
    const members = rows.filter(predicate).map((row) => row.auditRef.intakeRef).sort();
    expect(population(report, id).memberRefs.slice().sort()).toEqual(members);
    expect(population(report, id).count).toBe(members.length);
    expect(population(report, id).coverage).toBe('submitted_intake_only');
  }
  expect(population(report, 'financial_unique').count! + population(report, 'suppressed_duplicates').count!).toBe(rows.length);
  expect(population(report, 'direct_identity_admitted').count).toBe(profile.selectionDiagnostics.acceptedIdentity);
  expect(population(report, 'selected_pre_iqr').count).toBe(profile.selectionDiagnostics.selectedForValuation);
  expect(population(report, 'post_policy_sale_diagnostics').count).toBe(profile.authoritativeSaleCount);
  expect(population(report, 'current_sale_median_diagnostics').count).toBe(profile.currentWindowSaleCount);
}

describe('Stage 5 actual final-use reporting — real synthetic pipeline', () => {
  it('reports actual current primary sets, A/B refs and bounded Stage 4 diagnostics without changing financial outputs', () => {
    const inputs = Array.from({ length: 8 }, (_, i) => signed(i));
    inputs[0].metadataRanking = { populationId: 'source-run', sourceId: 'ebay_sold_comps', occurrenceKey: 'source:occ:0',
      ordinal: 0, populationSize: 8, scorerRole: 'exact_comparable', score: 100, rank: 1 };
    inputs[0].metadataScoreAwards = [{ field: 'player', points: 10 }];
    const sales = normalized(inputs);
    const snapshot = buildAnalysisSnapshot({ target, sales, now, side: 'item_a', analysisRunId: 'analysis-run' }, { signingKey });
    const profile = snapshot.profile;
    expect(profile.valuationBasis).toBe('market_sales');
    expect(profile.primaryValue).toBe(profile.saleMedianValue);
    expect(profile.guideAnchorWeightPct).toBe(0);
    expect(snapshot.finalUseReport).toBe(profile.finalUseReport);
    assertMembers(profile);
    expect(population(profile.finalUseReport, 'primary_market_sales').count).toBe(8);
    expect(population(profile.finalUseReport, 'historical_prompt').count).toBeNull();
    expect(snapshot.evidence.visualReviewPopulation.provesExecutionOrIdentityApproval).toBe(false);
    expect(financial(profile)).toEqual(financial(buildMarketProfile(target, sales, null, now, undefined, undefined,
      { side: 'item_b', analysisRunId: 'different-report-run', historicalPromptSales: [] })));
    expect(profile.comparables[0].valuationUse?.auditRef).toMatchObject({ side: 'item_a', intakeOrdinal: 0,
      intakeRef: 'final:analysis-run:item_a:occ:0', displayCorrelation: { requestOccurrenceRef: 'request:item_a:0' },
      sourceCorrelation: { metadataRanking: { occurrenceKey: 'source:occ:0', rank: 1 } } });
    expect(profile.comparables[0].valuationUse?.auditRef.verifiedObservationId).toBe(sales[0].observationId);
    const undecorated = normalized(inputs.map(({ displayCorrelation: _display, metadataRanking: _rank, metadataScoreAwards: _awards, ...sale }) => sale));
    expect(financial(profile)).toEqual(financial(buildMarketProfile(target, undecorated, null, now)));
    const right = buildAnalysisSnapshot({ target, sales: normalized(inputs, target, 'item_b'), now, side: 'item_b', analysisRunId: 'analysis-run' }, { signingKey });
    expect(right.profile.comparables[0].valuationUse?.auditRef.intakeRef).not.toBe(profile.comparables[0].valuationUse?.auditRef.intakeRef);
    expect(buildCashAwareTradeTerms(profile, right.profile).termsStatus).toBe('not_provided');
  });

  it('keeps approved identity after proven duplicate suppression and retains distinct known sale identities', () => {
    const original = signed(20, { title: 'Kobe Bryant PSA 10' }, true);
    const second = { ...original, displayCorrelation: correlation(21) };
    const sales = normalized([original, second]);
    expect(getVerifiedIdentityApproval(sales[1], target, image)).not.toBeNull();
    const profile = buildMarketProfile(target, sales, null, now);
    const duplicate = profile.comparables.find((row) => row.duplicateOf)!;
    expect(duplicate.valuationUse?.use.code).toBe('EXACT_DUPLICATE');
    expect(duplicate.valuationUse?.identityAdmission).toMatchObject({ accepted: true, basis: 'server_final_visual', serverFinalApprovalVerified: true });
    expect(duplicate.valuationUse?.selection).toBe('not_selected');
    expect(duplicate.valuationUse?.use.primaryMarketSales).toBe(false);
    expect(getVerifiedIdentityApproval({ ...sales[1], duplicateStatus: 'exact_duplicate' }, target, image)).toBeNull();
    expect(duplicate.valuationUse?.auditRef.intakeRef).not.toBe(profile.comparables[0].valuationUse?.auditRef.intakeRef);
    assertMembers(profile);
    const probable = buildMarketProfile(target, normalized([signed(22, { marketplace: 'eBay', originMarketplace: 'eBay', price: 1000 }),
      signed(23, { marketplace: 'eBay', originMarketplace: 'eBay', price: 1000 })]), null, now);
    expect(probable.comparables.some((row) => row.valuationUse?.use.code === 'PROBABLE_DUPLICATE')).toBe(false);
    expect(probable.authoritativeSaleCount).toBe(2);
    expect(probable.comparables.some((row) => row.valuationUse?.use.possibleDuplicateWarning)).toBe(true);
    assertMembers(probable);
    const possible = buildMarketProfile(target, normalized([signed(24, { marketplace: 'eBay', originMarketplace: 'eBay', price: 1000 }),
      signed(25, { marketplace: 'eBay', originMarketplace: 'eBay', price: 1001 })]), null, now);
    expect(possible.authoritativeSaleCount).toBe(2);
    expect(possible.comparables.find((row) => row.duplicateStatus === 'possible_duplicate')?.valuationUse?.use).toMatchObject({
      possibleDuplicateWarning: true, postPolicySaleDiagnostics: true });
  });

  it('preserves exact 48-cap priority and raw identity of cap omissions; reporting never refills slots', () => {
    const sales = normalized(Array.from({ length: 55 }, (_, i) => signed(100 + i)));
    const selection = selectBalancedComparableSales(target, sales, now);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.selectionDiagnostics).toEqual(selection.diagnostics);
    expect(profile.selectionDiagnostics.selectedForValuation).toBe(48);
    expect(profile.selectionDiagnostics.omittedByCap).toBe(7);
    const omitted = profile.comparables.filter((row) => row.valuationUse?.use.code === 'OMITTED_BY_CAP');
    expect(omitted).toHaveLength(7);
    expect(omitted.every((row) => row.valuationUse?.identityAdmission.accepted && !row.valuationUse?.use.postPolicySaleDiagnostics)).toBe(true);
    assertMembers(profile);
  });

  it('excludes the actual N=10 IQR tail, but flags and retains N=5..9 tails', () => {
    const profile = buildMarketProfile(target, normalized([100, 102, 103, 105, 106, 108, 109, 110, 112, 10000]
      .map((price, i) => signed(200 + i, { price }, i === 9))), null, now);
    expect(profile.outlierPolicy).toBe('iqr_applied');
    expect(profile.outlierExcludedCount).toBe(1);
    expect(profile.authoritativeSaleCount).toBe(9);
    const outlier = profile.comparables.find((row) => row.price === 10000)!;
    expect(outlier.valuationUse).toMatchObject({ selection: 'selected_pre_outlier', identityAdmission: { accepted: true, serverFinalApprovalVerified: true },
      use: { code: 'OUTLIER_EXCLUDED', postPolicySaleDiagnostics: false, currentSaleMedianDiagnostics: false, primaryMarketSales: false } });
    expect(profile.selectionDiagnostics.selectedForValuation).toBe(10);
    assertMembers(profile);
    for (const n of [5, 6, 7, 8, 9]) {
      const small = buildMarketProfile(target, normalized(Array.from({ length: n }, (_, i) => signed(300 + i, { price: i === n - 1 ? 10000 : 100 + i }))), null, now);
      expect(small.outlierExcludedCount).toBe(0);
      expect(small.authoritativeSaleCount).toBe(n);
      expect(small.comparables.find((row) => row.price === 10000)?.valuationUse?.use).toMatchObject({ smallSampleOutlierWarning: true,
        postPolicySaleDiagnostics: true, currentSaleMedianDiagnostics: true, primaryMarketSales: false, code: 'CURRENT_SALES_DIAGNOSTIC_ONLY' });
      assertMembers(small);
    }
  });

  it('retains selected current diagnostics during material hold and few-sale insufficient support', () => {
    const sales = normalized(Array.from({ length: 8 }, (_, i) => signed(400 + i)));
    const held = buildAnalysisSnapshot({ target, sales, now, identityGate: { materialReviewRequired: true, sourceAlignmentStatus: 'conflicted' } }, { signingKey }).profile;
    expect(held.valuationBasis).toBe('insufficient_evidence');
    expect(held.primaryValue).toBeNull();
    expect(held.saleMedianValue).not.toBeNull();
    expect(held.comparables.every((row) => row.valuationUse?.use.code === 'CURRENT_SALES_DIAGNOSTIC_ONLY')).toBe(true);
    expect(held.finalUseReport?.primaryPricingReasonCodes).toEqual(['MATERIAL_IDENTITY_HOLD']);
    expect(population(held.finalUseReport, 'primary_market_sales').count).toBe(0);
    assertMembers(held);
    const few = buildMarketProfile(target, sales.slice(0, 2), null, now);
    expect(few.primaryValue).toBeNull();
    expect(population(few.finalUseReport, 'current_sale_median_diagnostics').count).toBe(2);
    expect(population(few.finalUseReport, 'primary_market_sales').count).toBe(0);
    expect(buildCashAwareTradeTerms(held, few).termsStatus).toBe('insufficient_evidence');
  });

  it('reports verified guide fallback alone while actual current sales stay diagnostic', () => {
    const coin: ComparableTarget = { title: '1903 Morgan Dollar', category: 'coins', grade: 'MS65', certificationCompany: 'PCGS',
      itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', variety: 'Morgan Dollar' }) };
    const issued = issueGuideAnchor({ sourceId: 'pricecharting', sourceLabel: 'PriceCharting', grade: 'MS65', selectedGrade: 'MS65',
      matchType: 'exact', value: 1200, recordedSales: null, lastSaleDate: null, totalRecordedSales: null }, coin,
      { sourceId: 'pricecharting', sourceQuery: 'Synthetic 1903 Morgan Dollar', sourceRecordId: 'synthetic-guide', currency: 'USD',
        providerIdentity: { title: coin.title, country: 'United States', denomination: '1 Dollar', year: '1903', mintMark: '', variety: 'Morgan Dollar', form: 'single_coin' } }, { now, signingKey });
    expect(issued.warnings).toEqual([]);
    const summary = normalizeTestAiEvidence(coin, []);
    summary.guideAnchors = [JSON.parse(JSON.stringify(issued.guideAnchor))];
    const snapshot = buildAnalysisSnapshot({ target: coin, sales: normalized([signed(500, { title: '1903 $1 Morgan Dollar PCGS MS65', price: 100 })], coin),
      now, evidenceSummary: summary }, { signingKey });
    expect(snapshot.profile).toMatchObject({ valuationBasis: 'guide_fallback', primaryValue: 1200, guideAnchorWeightPct: 100, saleMedianValue: 100, authoritativeSaleCount: 1 });
    expect(snapshot.profile.comparables[0].valuationUse?.use.code).toBe('CURRENT_SALES_DIAGNOSTIC_ONLY');
    expect(population(snapshot.finalUseReport, 'primary_market_sales').count).toBe(0);
    assertMembers(snapshot.profile);
  });

  it('reports exact actual first-ten historical prompt refs separately from historical classification and extension statistics', () => {
    const inputs = Array.from({ length: 12 }, (_, i) => signed(600 + i, { date: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` }));
    const sales = normalized(inputs);
    const promptSales = selectHistoricalTrendRecords(sales);
    const snapshot = buildAnalysisSnapshot({ target, sales, now, historicalPromptSales: promptSales }, { signingKey });
    expect(population(snapshot.finalUseReport, 'historical_prompt').count).toBe(10);
    expect(population(snapshot.finalUseReport, 'post_policy_sale_diagnostics').count).toBe(0);
    expect(snapshot.profile.comparables.filter((row) => row.valuationUse?.use.historicalPromptIncluded)).toHaveLength(10);
    const serializedPrompt = JSON.parse(JSON.stringify(promptSales));
    const notActual = buildAnalysisSnapshot({ target, sales, now, historicalPromptSales: serializedPrompt }, { signingKey });
    expect(population(notActual.finalUseReport, 'historical_prompt').count).toBe(0);
    const movie: ComparableTarget = { title: 'Star Wars VHS 1977', category: 'movies', itemDetails: JSON.stringify({ movieTitle: 'Star Wars', releaseYear: '1977', format: 'VHS' }) };
    const extension = normalizeAnalysisMarketSales([signed(650, { title: movie.title, date: '2025-03-01T00:00:00.000Z' })], now,
      { signingKey, target: movie, category: movie.category, side: 'item_a', analysisRunId: 'analysis-run' });
    expect(extension[0].recency).toBe('extended');
    const extensionProfile = buildMarketProfile(movie, extension, null, now);
    expect(scoreComparable(movie, extension[0]).accepted).toBe(true);
    expect(extensionProfile.comparables[0].valuationUse?.use).toMatchObject({ code: 'HISTORICAL_DIAGNOSTIC_ONLY',
      postPolicySaleDiagnostics: true, currentSaleMedianDiagnostics: false, primaryMarketSales: false });
    expect(population(extensionProfile.finalUseReport, 'primary_market_sales').count).toBe(0);
  });

  it('emits normalizer blocker codes from actual Boolean terms, not rationale, preserving every submitted failure', () => {
    const cases: Array<[Partial<MarketSale>, string]> = [
      [{ currency: 'CAD' }, 'UNSUPPORTED_CURRENCY'], [{ currency: null }, 'UNKNOWN_CURRENCY'], [{ price: 0 }, 'INVALID_PRICE'],
      [{ date: 'invalid' }, 'INVALID_DATE'], [{ date: '2027-01-01' }, 'INVALID_DATE'], [{ saleStatus: 'active' }, 'NOT_COMPLETED'],
      [{ priceBasis: 'unknown' }, 'UNKNOWN_PRICE_BASIS'], [{ priceBasis: 'realized', buyerPremium: 'excluded' }, 'PREMIUM_NOT_INCLUDED'],
      [{ visualRequirement: 'required', visualReviewStatus: 'match' }, 'REQUIRED_APPROVAL_MISSING'],
      [{ evidenceDisposition: 'context_only' }, 'SOURCE_DISPOSITION_RESTRICTIVE'],
    ];
    const sales = normalized(cases.map(([override], i) => signed(700 + i, override)));
    sales.forEach((sale, index) => {
      expect(sale.analysisIntake?.sourceAdmission.blockerCodes).toContain(cases[index][1]);
      expect(sale.analysisIntake?.sourceAdmission.normalizationEligible).toBe(false);
    });
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.comparables).toHaveLength(cases.length);
    expect(population(profile.finalUseReport, 'submitted_intake').count).toBe(cases.length);
    expect(population(profile.finalUseReport, 'primary_market_sales').count).toBe(0);
    const noHard = normalizeAnalysisMarketSale(signed(720, { evidenceReasons: ['No hard identity conflict; unsupported currency is not present.'] }), now, { signingKey, target });
    expect(noHard.valuationEligible).toBe(true);
    expect(noHard.sale.analysisIntake?.sourceAdmission.blockerCodes).toEqual([]);
    const missingTitle = normalizeAnalysisMarketSale(signed(721, { title: '' }), now, { signingKey, target });
    expect(missingTitle.valuationEligible).toBe(true);
    expect(missingTitle.sale.analysisIntake?.sourceAdmission.warningCodes).toContain('MISSING_TITLE');
  });

  it('retains raw hard identity and secondary results before context wrapping, with truthful PCGS premium exception reporting', () => {
    const sales = normalized([
      signed(740, { title: '1996 Topps Kobe Bryant #139 PSA 10', date: '2024-01-01' }),
      signed(741, { title: '1996 Topps Kobe Bryant #138 PSA 9' }),
      signed(742, { evidenceDisposition: 'context_only' }),
    ]);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.comparables.find((row) => row.saleId === 'sale-740')?.valuationUse).toMatchObject({
      identityAdmission: { classification: 'rejected', identityRelationship: 'conflict' }, use: { code: 'FINAL_HARD_EXCLUDED' } });
    expect(profile.comparables.find((row) => row.saleId === 'sale-741')?.valuationUse?.use.code).toBe('SECONDARY_ONLY');
    expect(profile.comparables.find((row) => row.saleId === 'sale-742')?.valuationUse?.use.code).toBe('CONTEXT_ONLY');
    const pcgsRaw = raw(743, { sourceId: 'pcgs_auction_results', priceBasis: 'realized', buyerPremium: 'unknown' });
    const pcgsSeal = sealCanonicalObservation('pcgs_auction_results', pcgsRaw, { acquiredAt: now, signingKey });
    const pcgs = normalizeAnalysisMarketSale({ ...pcgsRaw, provenanceToken: pcgsSeal.provenanceToken }, now, { signingKey, category: 'coins' });
    expect(pcgs.valuationEligible).toBe(true);
    expect(pcgs.sale.analysisIntake?.sourceAdmission.blockerCodes).not.toContain('PREMIUM_NOT_INCLUDED');
    expect(pcgs.sale.analysisIntake?.sourceAdmission.warningCodes).toContain('PCGS_PREMIUM_AS_REPORTED');
    const original = signed(744, { evidenceDisposition: 'context_only' });
    const alteredDiagnostic = normalized([{ ...original, evidenceDisposition: 'rejected_objective_conflict' }])[0];
    const alteredProfile = buildMarketProfile(target, [alteredDiagnostic], null, now);
    expect(alteredProfile.comparables[0].valuationUse?.sourceAdmission).toMatchObject({ reportedDisposition: 'rejected_objective_conflict', verifiedSourceDisposition: 'context_only' });
    expect(alteredProfile.comparables[0].valuationUse?.use.code).toBe('CONTEXT_ONLY');
  });

  it('replaces browser final self-attestation and forged/copy authority with server receipts', () => {
    const legitimate = normalized([signed(800)])[0];
    const forged: MarketSale = { ...raw(801), provenanceToken: null, observationId: 'browser-observation', canonicalTransactionId: 'browser-transaction',
      analysisIntake: legitimate.analysisIntake, valuationUse: buildMarketProfile(target, [legitimate], null, now).comparables[0].valuationUse,
      visualReviewStatus: 'match', visualRequirement: 'required', identityApproval: { origin: 'server_final_visual', verdict: 'match' } };
    const sale = normalized([forged])[0];
    expect(sale.analysisIntake?.sourceAdmission).toMatchObject({ verification: 'unverified', normalizationEligible: false });
    expect(sale.analysisIntake?.auditRef.verifiedObservationId).toBeNull();
    expect(sale.analysisIntake?.auditRef.verifiedCanonicalTransactionId).toBeNull();
    expect(sale.analysisIntake?.auditRef.intakeRef).toBe('final:analysis-run:item_a:occ:0');
    const profile = buildMarketProfile(target, [sale], null, now);
    expect(profile.comparables[0].valuationUse?.identityAdmission.serverFinalApprovalVerified).toBe(false);
    expect(profile.comparables[0].valuationUse?.use.code).toBe('REVIEW_REQUIRED');
    expect(profile.primaryValue).toBeNull();
    const copied = JSON.parse(JSON.stringify(legitimate));
    const directCopy = buildMarketProfile(target, [copied], null, now);
    expect(directCopy.comparables[0].valuationUse?.sourceAdmission.normalizationEligible).toBeNull();
    expect(directCopy.comparables[0].valuationUse?.auditRef.verifiedObservationId).toBeNull();
    for (const provenanceToken of ['invalid.token', signed(802).provenanceToken]) {
      const expiredNow = new Date(now.getTime() + 21 * 60 * 1000);
      const failed = normalizeAnalysisMarketSale({ ...raw(802), provenanceToken }, expiredNow, { signingKey, target });
      expect(failed.valuationEligible).toBe(false);
      expect(failed.sale.analysisIntake?.sourceAdmission.blockerCodes).toContain('PROVENANCE_UNVERIFIED');
    }
    const wrongTarget = normalized([signed(803, {}, true)], { ...target, grade: '9' });
    expect(wrongTarget[0].analysisIntake?.sourceAdmission.blockerCodes).toContain('REQUIRED_APPROVAL_MISSING');
    const wrongImage = normalized([signed(804, {}, true)], { ...target, approvalTargetImageReference: 'https://synthetic.invalid/wrong.jpg' });
    expect(wrongImage[0].analysisIntake?.sourceAdmission.blockerCodes).toContain('REQUIRED_APPROVAL_MISSING');
    const encoded = signed(805).provenanceToken!;
    const tampered = normalizeAnalysisMarketSale({ ...raw(805), provenanceToken: `broken${encoded}` }, now, { signingKey, target });
    expect(tampered.sale.analysisIntake?.sourceAdmission.blockerCodes).toContain('PROVENANCE_UNVERIFIED');
  });

  it('adds only ledger coverage for direct raw non-USD input with unchanged financial fields and explicit unmeasured normalization', () => {
    const good = raw(900);
    const cad = raw(901, { currency: 'CAD', price: 1400 });
    const profile = buildMarketProfile(target, [good, cad], null, now);
    const baseline = buildMarketProfile(target, [good], null, now);
    expect(profile.authoritativeSaleCount).toBe(baseline.authoritativeSaleCount);
    expect(profile.saleMedianValue).toBe(baseline.saleMedianValue);
    expect(profile.weightedValue).toBe(baseline.weightedValue);
    expect(profile.marketRange).toEqual(baseline.marketRange);
    expect(profile.rejectedComparableCount).toBe(baseline.rejectedComparableCount);
    expect(profile.contextualComparableCount).toBe(baseline.contextualComparableCount);
    expect(profile.comparables).toHaveLength(2);
    expect(profile.finalUseReport?.coverage.ledgerOnlyFallbackCount).toBe(1);
    expect(profile.comparables.find((row) => row.currency === 'CAD')?.valuationUse).toMatchObject({ sourceAdmission: { normalizationEligible: null },
      selection: 'not_selected', use: { code: 'UNSUPPORTED_CURRENCY', postPolicySaleDiagnostics: false, primaryMarketSales: false } });
    expect(population(profile.finalUseReport, 'normalization_eligible').count).toBeNull();
    expect(profile.finalUseReport?.priceGroups.every((group) => group.currency === 'USD')).toBe(true);
    expect(profile.finalUseReport?.coverage).toMatchObject({ availableSourceIngress: 'unmeasured', retrievedObservations: 'unmeasured', notAllRetrievedReachIntake: true });
  });
});
