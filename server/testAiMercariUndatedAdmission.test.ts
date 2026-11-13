import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: '' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('Synthetic Mercari core tests must not invoke a provider'); }) }));
import {
  createServerFinalIdentityApproval, getVerifiedIdentityApproval, hasVerifiedMercariUndatedSale,
  transferVerifiedIdentityApproval, sealCanonicalObservation, verifyCanonicalObservation,
  MERCARI_UNDATED_SALE_POLICY, MERCARI_REPORTED_SOLD_PRICE_BASIS,
  type ServerFinalIdentityApproval, type ServerFinalIdentityApprovalOptions,
} from './testAiCanonicalObservation';
import { buildVisualTargetMetadata, type VisualSourceReview } from './testAiVisualSourceFilter';
import { normalizeAnalysisMarketSale, normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { buildMarketProfile, hasDefensibleCurrentSaleValue, isCompletedSaleCandidate, scoreComparable,
  type ComparableTarget, type MarketSale } from './testAiComparableEngine';

const signingKey = 'mercari-undated-synthetic-signing-key-not-a-service-credential';
const now = new Date('2026-11-10T22:00:00.000Z');
const image = 'https://synthetic.invalid/target-primary.jpg';
const target: ComparableTarget = {
  title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', itemType: 'single_card',
  grade: '10', certificationCompany: 'PSA', approvalTargetImageReference: image,
  itemDetails: JSON.stringify({ player: 'Kobe Bryant', manufacturer: 'Topps', cardNumber: '138', year: '1996' }),
};
const evidence = {
  slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
  gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true,
};
function review(patch: Partial<VisualSourceReview> = {}): VisualSourceReview {
  return {
    candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'Pictured identity, grader and numeric grade independently confirmed.',
    visualEvidence: { ...evidence }, visualAudit: {
      imageCount: 1, initialVerdict: 'match', initialConfidence: 'high',
      initialRationale: 'Pictured identity, grader and numeric grade independently confirmed.',
      initialEvidence: { ...evidence }, finalEvidence: { ...evidence },
      retryStatus: 'not_needed', finalPass: 'initial',
    }, ...patch,
  };
}
function sale(patch: Record<string, unknown> = {}): MarketSale {
  return {
    title: target.title, price: 11, currency: 'USD', date: null, recency: 'undated',
    sourceId: 'mercari_sold_comps', sourceAdapter: 'mercari_sold_comps', originMarketplace: 'mercari', marketplace: 'mercari',
    saleId: 'm100000000001', url: 'https://www.mercari.com/us/item/m100000000001/',
    saleStatus: 'completed', completedStatusBasis: MERCARI_REPORTED_SOLD_PRICE_BASIS, priceBasis: 'sold',
    saleDatePolicy: MERCARI_UNDATED_SALE_POLICY, visualRequirement: 'required', visualReviewStatus: 'match',
    visualReviewRationale: 'Pictured identity, grader and numeric grade independently confirmed.',
    evidenceDisposition: 'valuation_eligible', evidenceReasons: [], saleForm: 'single_card', lotQuantity: 1,
    buyerPremium: 'unknown', shipping: 'unknown', tax: 'unknown', ...patch,
  } as MarketSale;
}
function mint(row: MarketSale, deciding = review(), patch: Partial<ServerFinalIdentityApprovalOptions> = {}) {
  return createServerFinalIdentityApproval({ sale: row, target, reviewedTarget: target, review: deciding,
    targetImageReference: image, expectedImageReference: image, targetMetadata: buildVisualTargetMetadata(target),
    acquiredAt: now, ...patch });
}
function wire(row = sale(), deciding = review(), withApproval = true) {
  const approval = withApproval ? mint(row, deciding) : null;
  const sealed = sealCanonicalObservation('mercari_sold_comps', row, { signingKey, acquiredAt: now, identityApproval: approval });
  const input: MarketSale = JSON.parse(JSON.stringify({ ...row, ...sealed }));
  return { row, approval, sealed, input };
}
function chain(patch: Record<string, unknown> = {}, deciding = review(), finalTarget = target) {
  const result = wire(sale(patch), deciding);
  const normalized = normalizeAnalysisMarketSale(result.input, now, { signingKey, category: finalTarget.category, target: finalTarget });
  const match = scoreComparable(finalTarget, normalized.sale);
  const profile = buildMarketProfile(finalTarget, [normalized.sale], null, now);
  return { ...result, normalized, match, profile };
}
function decode(token: string): Record<string, any> {
  return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
}
function resign(payload: Record<string, any>, rebindFacts = false, updateHash = true): string {
  if (rebindFacts && payload.identityApproval) payload.identityApproval.sourceFactsHash = createHash('sha256')
    .update(JSON.stringify(payload.facts)).digest('hex');
  if (updateHash) {
    const base = { adapterId: payload.provenance.adapterId, facts: payload.facts, acquiredAt: payload.provenance.acquiredAt };
    payload.provenance.payloadHash = createHash('sha256').update(JSON.stringify(Object.prototype.hasOwnProperty.call(payload, 'identityApproval')
      ? { ...base, identityApproval: payload.identityApproval } : base)).digest('hex');
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${createHmac('sha256', signingKey).update(encoded).digest('base64url')}`;
}
function expectExcluded(input: MarketSale, finalTarget = target, at = now) {
  const decision = normalizeAnalysisMarketSale(input, at, { signingKey, target: finalTarget, category: finalTarget.category });
  expect(decision.valuationEligible).toBe(false);
  expect(hasVerifiedMercariUndatedSale(decision.sale, finalTarget)).toBe(false);
  expect(isCompletedSaleCandidate(decision.sale, at.getTime())).toBe(false);
  const profile = buildMarketProfile(finalTarget, [decision.sale], null, at);
  expect(profile.authoritativeSaleCount).toBe(0);
  expect(profile.primaryValue).toBeNull();
  expect(profile.comparables.every(match => !match.accepted && !match.valuationUse?.use.primaryMarketSales)).toBe(true);
  return decision;
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); });

describe('Mercari signed qualified undated exception: actual canonical-normalizer-engine chain', () => {
  it('admits positive USD $11 only with final visual authority, preserving null date and unverified timing', () => {
    const result = chain();
    expect(result.approval).not.toBeNull();
    expect(result.sealed.validationErrors).toEqual([]);
    expect(result.sealed.identityApproval).toMatchObject({ adapterId: 'mercari_sold_comps', originMarketplace: 'mercari',
      policyVersion: 'sold-comps-final-visual-v1', status: 'approved', decidingEvidence: evidence });
    const verified = verifyCanonicalObservation(result.input, { signingKey, now });
    expect(verified.verified).toBe(true);
    expect(hasVerifiedMercariUndatedSale(verified.sale, target)).toBe(true);
    expect(getVerifiedIdentityApproval(verified.sale, target)).not.toBeNull();
    expect(result.normalized.valuationEligible).toBe(true);
    expect(result.normalized.sale).toMatchObject({ price: 11, currency: 'USD', date: null, recency: 'undated',
      saleDatePolicy: MERCARI_UNDATED_SALE_POLICY, originMarketplace: 'mercari', sourceAdapter: 'mercari_sold_comps',
      saleStatus: 'completed', priceBasis: 'sold', evidenceDisposition: 'valuation_eligible' });
    expect(result.normalized.sale.analysisIntake?.sourceAdmission.blockerCodes).not.toContain('INVALID_DATE');
    expect(result.normalized.sale.analysisIntake?.sourceAdmission.warningCodes).toEqual(expect.arrayContaining([
      'MERCARI_UNDATED_TIMING_UNVERIFIED', 'MERCARI_SOLD_TRUE_PRICE_AS_REPORTED',
    ]));
    expect(isCompletedSaleCandidate(result.normalized.sale, now.getTime())).toBe(true);
    expect(result.match).toMatchObject({ accepted: true, classification: 'exact', identityAdmissionBasis: 'server_final_visual' });
    expect(result.profile.authoritativeSaleCount).toBe(1);
    expect(result.profile.primaryValue).toBe(11); // Temporary sandbox floor admits one signed sold comp.
    expect(result.profile.currentWindowSaleCount).toBe(0);
    expect(result.profile.qualifiedUndatedMercariSaleCount).toBe(1);
    expect(result.profile.comparables[0].date).toBeNull();
    expect(result.profile.valuationWarnings.join(' ')).toMatch(/Unknown.*timing is unverified/);
  });

  it('admits an omitted Mercari sale date when the signed transaction identity is present', () => {
    const result = chain({ date: undefined });
    expect(result.sealed.validationErrors).toEqual([]);
    expect(result.normalized.valuationEligible).toBe(true);
    expect(result.normalized.sale.date).toBeNull();
    expect(result.normalized.sale.analysisIntake?.sourceAdmission.blockerCodes).not.toContain('INVALID_DATE');
    expect(result.match.accepted).toBe(true);
  });

  it('uses multiple distinct approved undated sales for primary median without inventing recent-sale proof or changing age-null weights', () => {
    const inputs = [8, 9, 10, 11, 12, 13, 14].map((price, index) => wire(sale({ price,
      saleId: `m10000000000${index + 1}`, url: `https://www.mercari.com/us/item/m10000000000${index + 1}/` })).input);
    const rows = normalizeAnalysisMarketSales(inputs, now, { signingKey, category: target.category, target });
    expect(rows.every(row => hasVerifiedMercariUndatedSale(row, target))).toBe(true);
    const profile = buildMarketProfile(target, rows, null, now);
    expect(profile).toMatchObject({ valuationBasis: 'market_sales', primaryValue: 11, saleMedianValue: 11,
      authoritativeSaleCount: 7, valuationEligibleSaleCount: 7, qualifiedUndatedMercariSaleCount: 7,
      currentWindowSaleCount: 0, currentWindowIndependentMarketplaceCount: 0,
      valuationEligibleIndependentMarketplaceCount: 1, recentSaleCount: 0, daysSinceLastAuthoritativeSale: null,
      oldestSaleAgeDays: null, salesVelocity: { sevenDay: 0, thirtyDay: 0, ninetyDay: 0 },
      marketRange: { low: 8, mid: 11, high: 14, supported: true }, guideAnchorWeightPct: 0 });
    expect(hasDefensibleCurrentSaleValue(profile)).toBe(true);
    expect(profile.categoryEvidenceThresholds.minimumSelectedSales).toBe(1);
    expect(profile.categoryEvidenceThresholds.minimumIndependentMarketplaces).toBe(1);
    expect(profile.evidenceCoverage.currentWindowCount).toBe(0);
    expect(profile.adapterReliabilityHistory[0].currentWindowCount).toBe(0);
    expect(profile.evidenceState).not.toBe('strong_recent_market_evidence');
    expect(profile.valuationMethod).toContain('qualified undated Mercari exception');
    expect(profile.valuationMethod).toContain('timing unverified');
    expect(profile.valuationBasisReason).toContain('0 dated within 365 days');
    expect(profile.comparables.every(match => match.date === null && match.accepted && match.identityApproval)).toBe(true);
    for (const match of profile.comparables) {
      expect(match.weight).toBeCloseTo((0.5 + match.score / 100) * 0.45);
      expect(match.valuationUse?.use.primaryMarketSales).toBe(true);
      expect(match.valuationUse?.use.currentSaleMedianDiagnostics).toBe(false);
      expect(match.valuationUse?.use.reasonCodes).toContain('MERCARI_UNDATED_QUALIFIED_EXCEPTION');
    }
    const populations = profile.finalUseReport!.populations;
    expect(populations.find(pop => pop.population === 'primary_market_sales')?.count).toBe(7);
    expect(populations.find(pop => pop.population === 'current_sale_median_diagnostics')?.count).toBe(0);
    expect(populations.find(pop => pop.population === 'qualified_undated_mercari')?.count).toBe(7);
    expect(populations.find(pop => pop.population === 'historical_diagnostics')?.count).toBe(0);
  });

  it('retains one-marketplace identity and suppresses repeated undated record credit', () => {
    const inputs = Array.from({ length: 6 }, (_, index) => wire(sale({ saleId: `m20000000000${index}`,
      url: `https://www.mercari.com/us/item/m20000000000${index}/` })).input);
    const rows = normalizeAnalysisMarketSales([...inputs, inputs[0]], now, { signingKey, target });
    const profile = buildMarketProfile(target, rows, null, now);
    expect(profile.authoritativeSaleCount).toBe(6);
    expect(profile.duplicateSaleCount).toBe(1);
    expect(profile.valuationEligibleSaleCount).toBe(6);
    expect(profile.primaryValue).toBe(11);
    expect(hasDefensibleCurrentSaleValue(profile)).toBe(true);
    const duplicate = profile.comparables.find(match => match.duplicateStatus === 'exact_duplicate');
    expect(duplicate?.accepted).toBe(false);
    expect(duplicate?.identityApproval).toBeUndefined();
    expect(duplicate?.valuationUse?.use.primaryMarketSales).toBe(false);
  });

  it('keeps original title scoring unchanged when visual approval resolves omissions', () => {
    const result = chain({ title: 'Kobe Bryant' });
    const titleOnly = scoreComparable(target, { title: 'Kobe Bryant', price: 11, visualReviewStatus: 'match' });
    expect(result.normalized.valuationEligible).toBe(true);
    expect(result.match.accepted).toBe(true);
    expect(result.match.score).toBe(titleOnly.score);
    expect(result.match.score).toBeLessThan(48);
    expect(titleOnly.accepted).toBe(false);
  });

  it('transfers private authority only to an exactly bound normalized successor, not copied flags', () => {
    const result = chain();
    const row = result.normalized.sale;
    expect(hasVerifiedMercariUndatedSale(row, target)).toBe(true);
    const successor = { ...row, evidenceReasons: [...row.evidenceReasons!, 'normalization diagnostic'] };
    expect(hasVerifiedMercariUndatedSale(successor, target)).toBe(false);
    expect(transferVerifiedIdentityApproval(row, successor)).toBe(true);
    expect(hasVerifiedMercariUndatedSale(successor, target)).toBe(true);
    expect(hasVerifiedMercariUndatedSale(JSON.parse(JSON.stringify(row)), target)).toBe(false);
    for (const patch of [
      { price: 12 }, { saleId: 'm999999999999' }, { url: 'mercari.com/us/item/m999999999999' },
      { lotQuantity: 2 }, { saleDatePolicy: null }, { date: '2026-11-01' }, { date: 'not-a-date' },
      { date: '2027-01-01' }, { recency: 'recent' }, { originMarketplace: 'ebay' },
      { sourceAdapter: 'sold_comps' }, { sourceId: 'sold_comps' }, { duplicateStatus: 'exact_duplicate' },
      { evidenceDisposition: 'context_only' },
    ]) expect(transferVerifiedIdentityApproval(row, { ...row, ...patch } as MarketSale)).toBe(false);
    successor.date = '2027-01-01';
    expect(hasVerifiedMercariUndatedSale(successor, target)).toBe(false);
    expect(isCompletedSaleCandidate(successor, now.getTime())).toBe(false);
  });

  it('expires retained undated authority without refreshing its age on normalization/transfer', () => {
    const result = chain();
    vi.advanceTimersByTime(19 * 60_000);
    const successor = { ...result.normalized.sale };
    expect(transferVerifiedIdentityApproval(result.normalized.sale, successor)).toBe(true);
    expect(hasVerifiedMercariUndatedSale(successor, target)).toBe(true);
    vi.advanceTimersByTime(2 * 60_000);
    expect(hasVerifiedMercariUndatedSale(successor, target)).toBe(false);
    expect(getVerifiedIdentityApproval(successor, target)).toBeNull();
    expect(transferVerifiedIdentityApproval(successor, { ...successor })).toBe(false);
  });
});

describe('Mercari exception fails closed for flags, source-only signing, dates, and identity/financial conflicts', () => {
  it('cannot enable itself using browser source/policy/completed/match/audit or a copied mint handle', () => {
    const fake = { ...sale(), identityApproval: { approved: true, verified: true, status: 'approved' },
      visualAudit: review().visualAudit, verified: true, serverFinalApprovalVerified: true };
    expectExcluded(fake);
    expect(isCompletedSaleCandidate(fake, now.getTime())).toBe(false);
    const noApproval = wire(sale(), review(), false);
    expect(verifyCanonicalObservation(noApproval.input, { signingKey, now }).verified).toBe(true);
    expectExcluded({ ...noApproval.input, identityApproval: fake.identityApproval });
    const approvedWithoutTarget = normalizeAnalysisMarketSale(wire().input, now, { signingKey });
    expect(approvedWithoutTarget.valuationEligible).toBe(false);
    expect(hasVerifiedMercariUndatedSale(approvedWithoutTarget.sale)).toBe(false);
    const row = sale();
    const handle = mint(row)!;
    for (const forged of [{ kind: 'server-final-identity-approval' }, { ...handle }, JSON.parse(JSON.stringify(handle))]) {
      const sealed = sealCanonicalObservation('mercari_sold_comps', row, { signingKey, acquiredAt: now,
        identityApproval: forged as ServerFinalIdentityApproval });
      expect(sealed.identityApproval).toBeUndefined();
      expectExcluded({ ...row, ...sealed });
    }
  });

  it.each([
    ['zero price', { price: 0 }], ['missing price', { price: null }], ['undefined price', { price: undefined }],
    ['nonfinite price', { price: Infinity }], ['non-USD', { currency: 'CAD' }], ['missing currency', { currency: null }],
    ['wrong origin', { originMarketplace: 'ebay' }], ['wrong source', { sourceId: 'sold_comps' }],
    ['wrong adapter', { sourceAdapter: 'sold_comps' }], ['wrong policy', { saleDatePolicy: 'browser' }],
    ['missing policy', { saleDatePolicy: undefined }], ['unknown basis', { priceBasis: 'unknown' }],
    ['realized rather than reported sold', { priceBasis: 'realized' }], ['wrong endpoint convention', { completedStatusBasis: 'Verified accepted offer' }],
    ['active status', { saleStatus: 'active' }], ['unknown status', { saleStatus: 'unknown' }],
    ['no visual approval', { visualReviewStatus: 'not_reviewed' }], ['rough match', { visualReviewStatus: 'rough_match' }],
    ['visual mismatch', { visualReviewStatus: 'mismatch' }], ['optional visual flag', { visualRequirement: 'not_required' }],
    ['restrictive disposition', { evidenceDisposition: 'rejected_objective_conflict' }], ['retained hard reason', { evidenceReasons: ['hard identity conflict'] }],
    ['bundle quantity', { lotQuantity: 2 }], ['bundle form', { saleForm: 'bundle' }], ['component', { saleForm: 'manual-only' }],
    ['missing transaction', { saleId: null, url: null }], ['fake transaction', { saleId: 'unknown', url: 'https://www.mercari.com/search/' }],
    ['future date', { date: '2027-01-01' }], ['historical date', { date: '2023-01-01' }],
    ['known recent date', { date: '2026-11-01' }], ['malformed date', { date: 'not-a-sale-date' }],
    ['empty non-null date', { date: '' }], ['claimed recency', { recency: 'recent' }],
  ] as const)('does not mint or price %s under the exception', (_label, patch) => {
    const row = sale(patch);
    expect(mint(row)).toBeNull();
    expectExcluded(wire(row).input);
  });

  it('cannot sign optional visual flags and a known date into Mercari source-only valuation', () => {
    const row = sale({ date: '2026-11-01', recency: 'recent', saleDatePolicy: undefined, visualRequirement: 'not_required',
      identityApproval: { status: 'approved', verified: true } });
    const input = wire(row, review(), false).input;
    expect(verifyCanonicalObservation(input, { signingKey, now }).verified).toBe(true);
    const held = expectExcluded(input);
    expect(held.sale.visualRequirement).toBe('required');
    expect(held.sale.analysisIntake?.sourceAdmission.blockerCodes).toContain('REQUIRED_APPROVAL_MISSING');
  });

  it.each([
    ['wrong numeric grade', { title: '1996 Topps Kobe Bryant #138 PSA 9' }],
    ['wrong grader', { title: '1996 Topps Kobe Bryant #138 BGS 10' }],
    ['raw instead of graded', { title: '1996 Topps Kobe Bryant #138 raw' }],
    ['wrong card number', { title: '1996 Topps Kobe Bryant #139 PSA 10' }],
    ['wrong athlete', { title: '1996 Topps Michael Jordan #138 PSA 10' }],
    ['bundle title', { title: '1996 Topps Kobe Bryant #138 PSA 10 bundle lot of 3' }],
  ] as const)('keeps %s out of final scored valuation even with match booleans', (_label, patch) => {
    const result = chain(patch);
    expect(result.profile.authoritativeSaleCount).toBe(0);
    expect(result.profile.primaryValue).toBeNull();
    expect(result.profile.comparables.every(match => !match.accepted)).toBe(true);
  });

  it('retains full deciding evidence, metadata, target/image, and raw/grade guards', () => {
    const row = sale();
    expect(mint(row, review({ visualAudit: undefined }))).toBeNull();
    expect(mint(row, review({ confidence: 'low' }))).toBeNull();
    expect(mint(row, review(), { expectedImageReference: 'https://synthetic.invalid/other.jpg' })).toBeNull();
    expect(mint(row, review(), { reviewedTarget: { ...target, grade: '9' } })).toBeNull();
    expect(mint(row, review(), { targetMetadata: buildVisualTargetMetadata({ ...target, grade: '9' }) })).toBeNull();
    for (const candidateIdentityFields of [{ grade: '9' }, { isGraded: 'No' }, { gradingCompany: 'BGS' },
      { player: 'Michael Jordan' }, { cardNumber: '139' }, { lotQuantity: '2' }, { saleForm: 'bundle' }]) {
      expect(mint(row, review(), { candidateIdentityFields })).toBeNull();
    }
    for (const badEvidence of [{ ...evidence, gradeMatches: false }, { ...evidence, identityMatches: false },
      { ...evidence, rawOrLooseVisible: true }, { identityMatches: true }]) {
      const deciding = review({ visualEvidence: badEvidence });
      deciding.visualAudit!.finalEvidence = badEvidence;
      expect(mint(row, deciding)).toBeNull();
      expectExcluded(wire(row, deciding).input);
    }
    const approved = wire().input;
    for (const changed of [{ ...target, grade: '9' }, { ...target, approvalTargetImageReference: undefined },
      { ...target, approvalTargetImageReference: 'https://synthetic.invalid/changed.jpg' },
      { ...target, itemDetails: JSON.stringify({ ...JSON.parse(target.itemDetails!), cardNumber: '139' }) }]) {
      expectExcluded(approved, changed);
    }
  });

  it('retains high-value financial safety and signed lot target holds', () => {
    const input = wire().input;
    const held = expectExcluded(input, { ...target, statedTradeValue: 20_000 });
    expect(held.sale.analysisIntake?.sourceAdmission.blockerCodes).toContain('HIGH_VALUE_PRICE_TOO_LOW');
    expectExcluded(input, { ...target, itemType: 'collection_lot' });
  });

  it('rejects expired/tampered tokens and signed malformed policy, source, transaction, or deciding-evidence bindings', () => {
    const original = wire().sealed.provenanceToken!;
    expectExcluded({ provenanceToken: original }, target, new Date(now.getTime() + 21 * 60_000));
    const [encoded, signature] = original.split('.');
    const tampered = `${encoded}.${signature.slice(0, -1)}${signature.endsWith('x') ? 'y' : 'x'}`;
    expect(verifyCanonicalObservation({ provenanceToken: tampered }, { signingKey, now }).verified).toBe(false);
    expectExcluded({ provenanceToken: tampered });
    for (const mutate of [
      (p: any) => { p.facts.saleDatePolicy = 'browser'; },
      (p: any) => { p.facts.originMarketplace = 'ebay'; },
      (p: any) => { p.facts.date = '2027-01-01'; },
      (p: any) => { p.facts.date = 'not-a-date'; },
      (p: any) => { p.facts.date = '2023-01-01'; },
      (p: any) => { p.facts.completedStatusBasis = 'Browser accepted offer'; },
      (p: any) => { p.identityApproval.adapterId = 'sold_comps'; },
      (p: any) => { p.identityApproval.originMarketplace = 'ebay'; },
      (p: any) => { p.identityApproval.sourceRecordId = 'neighbor'; },
      (p: any) => { p.provenance.canonicalTransactionId = 'record:other'; },
      (p: any) => { p.identityApproval.decidingEvidence.gradeMatches = false; },
      (p: any) => { p.identityApproval.targetFields.cardNumber = '139'; },
      (p: any) => { p.identityApproval.verified = true; },
    ]) {
      const payload = decode(original); mutate(payload);
      const token = resign(payload, true);
      expect(verifyCanonicalObservation({ provenanceToken: token }, { signingKey, now }).verified).toBe(false);
      expectExcluded({ provenanceToken: token });
    }
    const changedHash = decode(original); changedHash.facts.price = 12;
    expect(verifyCanonicalObservation({ provenanceToken: resign(changedHash, true, false) }, { signingKey, now }).verified).toBe(false);
  });

  it('does not extend any other adapter date policy or change legitimate dated eBay approval', () => {
    for (const adapter of ['sold_comps', 'the_card_api'] as const) {
      const row = sale({ sourceId: adapter, sourceAdapter: adapter, originMarketplace: 'ebay', date: null,
        visualRequirement: 'not_required', saleDatePolicy: undefined, completedStatusBasis: 'Sold-Comps completed-sale endpoint' });
      const sealed = sealCanonicalObservation(adapter, row, { signingKey, acquiredAt: now });
      const input = { ...row, ...sealed };
      expectExcluded(input);
      const forgedPolicy = sealCanonicalObservation(adapter, { ...row, saleDatePolicy: MERCARI_UNDATED_SALE_POLICY }, { signingKey, acquiredAt: now });
      expect(forgedPolicy.validationErrors.join(' ')).toContain('sale date policy is invalid');
      expectExcluded({ ...row, ...forgedPolicy });
    }
    const ebay = sale({ sourceId: 'sold_comps', sourceAdapter: 'sold_comps', originMarketplace: 'ebay', marketplace: 'ebay',
      date: '2026-11-01', recency: 'recent', saleDatePolicy: undefined, completedStatusBasis: 'Sold-Comps completed-sale endpoint',
      saleId: 'ebay-123456789012', url: 'https://www.ebay.com/itm/123456789012' });
    const handle = mint(ebay);
    expect(handle).not.toBeNull();
    const sealed = sealCanonicalObservation('sold_comps', ebay, { signingKey, acquiredAt: now, identityApproval: handle });
    expect(decode(sealed.provenanceToken!).facts).not.toHaveProperty('saleDatePolicy');
    const normalized = normalizeAnalysisMarketSale({ ...ebay, ...sealed }, now, { signingKey, target });
    expect(normalized.valuationEligible).toBe(true);
    expect(getVerifiedIdentityApproval(normalized.sale, target)?.adapterId).toBe('sold_comps');
    expect(hasVerifiedMercariUndatedSale(normalized.sale, target)).toBe(false);
    expect(isCompletedSaleCandidate(normalized.sale, now.getTime())).toBe(true);
    const profile = buildMarketProfile(target, [normalized.sale], null, now);
    expect(profile.currentWindowSaleCount).toBe(1);
    expect(profile.qualifiedUndatedMercariSaleCount).toBe(0);
  });
});
