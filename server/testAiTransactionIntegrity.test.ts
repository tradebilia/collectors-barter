import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: '' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('Stage 6 transaction controls forbid model/provider access'); }) }));
import { createServerFinalIdentityApproval, getVerifiedIdentityApproval, sealCanonicalObservation, verifyCanonicalObservation } from './testAiCanonicalObservation';
import { buildVisualTargetMetadata, type VisualSourceReview } from './testAiVisualSourceFilter';
import { buildMarketProfile, deduplicateMarketSales, scoreComparable, selectBalancedComparableSales, type ComparableTarget, type MarketSale } from './testAiComparableEngine';
import { normalizeAnalysisMarketSale, normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { hasMeaningfulTransactionIdentity, transactionIdentity } from './testAiEconomicIntegrity';
// ONLY in the reviewed isolated importer: router/provider/DB bindings retain
// the existing throwing virtual denylist. No source acquisition is called here.
import { sealSandboxEvidence, sealSoldCompsEvidence, sealSoldCompsFinalVisualListings } from './testAIRouter';
import { readServerNormalizationReport, type FinalUseReport } from '../shared/testAiValuationUse';

const now = new Date('2026-09-28T12:00:00.000Z');
const signingKey = 'synthetic-stage6-transaction-integrity-key';
const image = 'https://synthetic.invalid/stage6-transaction-target.jpg';
const target: ComparableTarget = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards',
  itemType: 'individual_card', grade: '10', certificationCompany: 'PSA', approvalTargetImageReference: image,
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
function signed(overrides: Partial<MarketSale> = {}, approved = false): MarketSale {
  const sale: MarketSale = { title: target.title, price: 1000, currency: 'USD', date: '2026-09-01T00:00:00.000Z',
    sourceId: 'sold_comps', saleId: 'transaction-100', originMarketplace: 'eBay',
    saleStatus: 'completed', priceBasis: 'sold', evidenceDisposition: 'valuation_eligible',
    visualRequirement: approved ? 'required' : 'not_required', visualReviewStatus: approved ? 'match' : 'not_reviewed', ...overrides };
  let handle = null;
  if (approved) {
    const evidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
      gradeMatches: true, rawOrLooseVisible: false, identityMatches: true };
    const review: VisualSourceReview = { candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'Synthetic exact pictured identity.',
      visualEvidence: evidence, visualAudit: { imageCount: 1, initialVerdict: 'match', initialConfidence: 'high',
        initialRationale: 'Synthetic exact pictured identity.', retryStatus: 'not_needed', finalPass: 'initial', initialEvidence: evidence, finalEvidence: evidence } };
    handle = createServerFinalIdentityApproval({ sale, review, target, reviewedTarget: target,
      targetImageReference: image, expectedImageReference: image, targetMetadata: buildVisualTargetMetadata(target), acquiredAt: now });
    expect(handle).not.toBeNull();
  }
  const seal = sealCanonicalObservation('sold_comps', sale, { acquiredAt: now, signingKey, identityApproval: handle });
  return JSON.parse(JSON.stringify({ ...sale, provenanceToken: seal.provenanceToken }));
}
function normalized(inputs: MarketSale[]) {
  return normalizeAnalysisMarketSales(inputs, now, { signingKey, target, category: target.category,
    side: 'item_a', analysisRunId: 'stage6-transactions' });
}
function population(report: FinalUseReport | undefined, name: string) {
  const result = report?.populations.find((row) => row.population === name);
  expect(result, name).toBeDefined();
  return result!;
}
function assertIntake(profile: ReturnType<typeof buildMarketProfile>, expected: number) {
  const report = profile.finalUseReport;
  expect(population(report, 'submitted_intake').count).toBe(expected);
  expect(population(report, 'financial_unique').count! + population(report, 'suppressed_duplicates').count!).toBe(expected);
  expect(new Set(profile.comparables.map((row) => row.valuationUse?.auditRef.intakeRef)).size).toBe(expected);
  expect(population(report, 'current_sale_median_diagnostics').count).toBe(profile.currentWindowSaleCount);
}

describe('Stage 6 transaction integrity — actual signed normalization and final selection', () => {
  it.each([
    { saleId: 'provider-id-only', url: null },
    { saleId: '0000123', url: null },
    { saleId: 'v1|123456789012|0', url: null },
    { saleId: '8fc71d4b-0d42-427c-a602-e78170b19b85', url: null },
    { saleId: 'opaque:provider/record-17', url: null },
    { saleId: 'source-record-17', url: null },
    { saleId: null, url: 'https://www.ebay.com/itm/123456789?utm_source=fixture' },
    { saleId: null, url: 'ebay.com/itm/Kobe-Bryant/123456789' },
    { saleId: null, url: 'auction.synthetic.invalid/archive/transaction-1' },
    { saleId: null, url: 'https://auction.synthetic.invalid/archive/transaction-1' },
  ])('accepts either meaningful observed provider ID or actual listing URL: %j', (identity) => {
    const decision = normalizeAnalysisMarketSale(signed(identity), now, { signingKey, target });
    expect(decision.valuationEligible).toBe(true);
    expect(hasMeaningfulTransactionIdentity(decision.sale)).toBe(true);
    expect(scoreComparable(target, decision.sale).accepted).toBe(true);
    expect(buildMarketProfile(target, [decision.sale], null, now).authoritativeSaleCount).toBe(1);
    if (!identity.saleId) expect(readServerNormalizationReport(decision.sale)?.sourceAdmission.warningCodes).toContain('LISTING_REFERENCE_EVENT_AMBIGUITY');
  });

  it.each([
    { saleId: null, url: null }, { saleId: 'unknown', url: null }, { saleId: 'none', url: null },
    { saleId: '[object Object]', url: 'javascript:bad' }, { saleId: 'false', url: 'not a URL' },
    { saleId: 'source:occ:12', url: null }, { saleId: 'final:run:item_a:occ:12', url: null },
    { saleId: null, url: 'https://ebay.com/' }, { saleId: null, url: 'https://www.ebay.com/sch/search' },
    { saleId: null, url: 'https://auction.synthetic.invalid/search?q=Kobe' },
    { saleId: 'https://www.ebay.com/sch/search', url: 'https://www.ebay.com/sch/search' },
    { saleId: 'ebay.com/itm/123456789', url: null },
    { saleId: 'https://www.ebay.com/itm/123456789', url: null },
    { saleId: 'Kobe Bryant|2026-09-01|1000', url: null },
    { saleId: `${target.title}|1000`, url: null },
    { saleId: `${target.title.replace(/\W+/g, '_')}_1000`, url: null },
    { saleId: '["provider-one"]', url: null },
    { saleId: '{"id":"provider-one"}', url: null },
    { saleId: '"provider-one"', url: null },
    { saleId: 'provider-one,provider-two', url: null },
    { saleId: true, url: null } as unknown as Partial<MarketSale>,
    { saleId: false, url: null } as unknown as Partial<MarketSale>,
    { saleId: ['provider-one', 'provider-two'], url: null } as unknown as Partial<MarketSale>,
    { saleId: { id: 'provider-one' }, url: null } as unknown as Partial<MarketSale>,
  ])('retains signed unidentifiable rows as typed pricing context: %j', (identity) => {
    const input = signed(identity);
    expect(verifyCanonicalObservation(input, { signingKey, now }).verified).toBe(true);
    const decision = normalizeAnalysisMarketSale(input, now, { signingKey, target });
    expect(decision.valuationEligible).toBe(false);
    expect(readServerNormalizationReport(decision.sale)?.sourceAdmission.blockerCodes).toContain('TRANSACTION_IDENTITY_MISSING');
    const selection = selectBalancedComparableSales(target, [decision.sale], now);
    expect(selection.deduplicated.unique).toHaveLength(1);
    expect(selection.deduplicated.duplicates).toHaveLength(0);
    expect(selection.selected).toHaveLength(0);
    const profile = buildMarketProfile(target, [decision.sale], null, now);
    expect(profile.authoritativeSaleCount).toBe(0);
    expect(profile.comparables).toHaveLength(1);
  });

  it('the pure identity helper rejects original unsupported schemes before canonical scheme loss', () => {
    expect(hasMeaningfulTransactionIdentity({ saleId: null, url: 'ftp://auction.synthetic.invalid/lot/1' })).toBe(false);
    expect(hasMeaningfulTransactionIdentity({ saleId: null, url: 'javascript:bad' })).toBe(false);
  });

  const sourceWrappers = [
    { name: 'generic source wrapper', seal: (sale: MarketSale) => sealSandboxEvidence('sold_comps', [sale], { signingKey, acquiredAt: now })[0]! },
    { name: 'ordinary nonvisual wrapper', seal: (sale: MarketSale) => sealSoldCompsEvidence([sale], { signingKey, acquiredAt: now })[0]! },
    { name: 'ordinary final-visual wrapper without required review', seal: (sale: MarketSale) => sealSoldCompsFinalVisualListings([sale], {
      signingKey, acquiredAt: now, reviewedTarget: target, targetMetadata: buildVisualTargetMetadata(target), query: 'unchanged synthetic query',
    })[0]! },
  ];
  function sourceFacts(identity: Record<string, unknown>): MarketSale {
    return { title: target.title, price: 1000, currency: 'USD', date: '2026-09-01T00:00:00.000Z', sourceId: 'sold_comps',
      originMarketplace: 'eBay', saleStatus: 'completed', priceBasis: 'sold', visualRequirement: 'not_required',
      evidenceDisposition: 'valuation_eligible', ...identity } as MarketSale;
  }
  const invalidOriginalIdentity = [
    { saleId: null, url: 'ftp://auction.synthetic.invalid/lot/1' },
    { saleId: null, url: 'https://user:password@auction.synthetic.invalid/lot/1' },
    { saleId: null, url: 'http://user@auction.synthetic.invalid/lot/1' },
    { saleId: null, url: 'https:///auction.synthetic.invalid/lot/1' },
    { saleId: null, url: 'https://auction.synthetic.invalid\\lot\\1' },
    { saleId: null, url: 'https://[malformed' },
    { saleId: 'https://www.ebay.com/sch/search', url: 'https://www.ebay.com/sch/search' },
    { saleId: 'https://www.ebay.com/itm/123456789', url: 'https://www.ebay.com/sch/search' },
    { saleId: 'ftp://auction.synthetic.invalid/lot/1', url: 'ftp://auction.synthetic.invalid/lot/1' },
    { saleId: 'Kobe Bryant|2026-09-01|1000', url: null },
    { saleId: `${target.title}|1000`, url: null },
    { saleId: ['provider-single'], url: null },
    { saleId: ['provider-one', 'provider-two'], url: null },
    { saleId: { id: 'provider-one' }, url: null },
    { saleId: true, url: null }, { saleId: false, url: null },
    { saleId: '["provider-single"]', url: null },
  ];
  describe.each(sourceWrappers)('$name checks original identity before lossy signing', ({ seal }) => {
    it.each(invalidOriginalIdentity)('restrictively seals invalid-identity-only raw facts: %j', (identity) => {
      const original = sourceFacts(identity);
      const before = JSON.stringify(original);
      const sealed = seal(original);
      expect(JSON.stringify(original)).toBe(before);
      expect(sealed.saleId).toEqual(original.saleId);
      expect(sealed.url).toEqual(original.url);
      expect(sealed.evidenceDisposition).toBe('context_only');
      expect(sealed.identityApproval).toBeUndefined();
      const wire = JSON.parse(JSON.stringify(sealed));
      const verification = verifyCanonicalObservation(wire, { signingKey, now });
      expect(verification.verified).toBe(true);
      expect(verification.sale).toMatchObject({ saleId: null, url: null, evidenceDisposition: 'context_only' });
      expect(getVerifiedIdentityApproval(verification.sale, target, image)).toBeNull();
      Object.assign(wire, { saleId: 'browser-repair', url: 'https://ebay.com/itm/123456789', evidenceDisposition: 'valuation_eligible' });
      const decision = normalizeAnalysisMarketSale(wire, now, { signingKey, target });
      expect(decision.valuationEligible).toBe(false);
      expect(readServerNormalizationReport(decision.sale)?.sourceAdmission.blockerCodes).toEqual(expect.arrayContaining([
        'TRANSACTION_IDENTITY_MISSING', 'SOURCE_DISPOSITION_RESTRICTIVE',
      ]));
      const selection = selectBalancedComparableSales(target, [decision.sale], now);
      expect(selection.selected).toHaveLength(0);
      expect(selection.deduplicated.unique).toHaveLength(1);
      const profile = buildMarketProfile(target, [decision.sale], null, now);
      expect(profile.authoritativeSaleCount).toBe(0);
      expect(profile.comparables).toHaveLength(1);
      assertIntake(profile, 1);
    });

    it.each([
      { saleId: 'provider-id-only', url: null },
      { saleId: 123456789012, url: null },
      { saleId: 'v1|123456789012|0', url: null },
      { saleId: 'opaque:provider/record-17', url: 'ftp://auction.synthetic.invalid/lot/1' },
      { saleId: 'recognized-provider-17', url: 'https://user:password@auction.synthetic.invalid/lot/1' },
      { saleId: null, url: 'http://auction.synthetic.invalid/lot/1' },
      { saleId: null, url: 'https://auction.synthetic.invalid/lot/1' },
      { saleId: null, url: 'auction.synthetic.invalid/lot/1' },
      { saleId: null, url: 'ebay.com/itm/Kobe-Bryant/123456789' },
      { saleId: 'https://www.ebay.com/itm/123456789', url: 'https://www.ebay.com/itm/123456789' },
      { saleId: ['not-an-id'], url: 'https://www.ebay.com/itm/123456789' },
    ])('preserves genuine ID-or-usable-URL observations: %j', (identity) => {
      const wire = JSON.parse(JSON.stringify(seal(sourceFacts(identity))));
      const verification = verifyCanonicalObservation(wire, { signingKey, now });
      expect(verification.verified).toBe(true);
      expect(verification.sale.evidenceDisposition).toBe('valuation_eligible');
      expect(hasMeaningfulTransactionIdentity(verification.sale)).toBe(true);
      if (typeof identity.saleId === 'number') expect(verification.sale.saleId).toBe(String(identity.saleId));
      if ((typeof identity.saleId === 'string' && identity.saleId.startsWith('https://')) || Array.isArray(identity.saleId)) {
        expect(transactionIdentity(verification.sale).providerRecordId).toBeNull();
        expect(transactionIdentity(verification.sale).listingUrl).not.toBeNull();
      }
      const decision = normalizeAnalysisMarketSale(wire, now, { signingKey, target });
      expect(decision.valuationEligible).toBe(true);
      expect(scoreComparable(target, decision.sale).accepted).toBe(true);
      expect(selectBalancedComparableSales(target, [decision.sale], now).selected).toHaveLength(1);
      const profile = buildMarketProfile(target, [decision.sale], null, now);
      expect(profile.authoritativeSaleCount).toBe(1);
      assertIntake(profile, 1);
    });

    it('uses the unchanged legacy signed bytes for already valid source facts', () => {
      const original = sourceFacts({ saleId: 'opaque-provider-17', url: 'https://ebay.com/itm/Kobe-Bryant/123456789' });
      const direct = sealCanonicalObservation('sold_comps', original, { signingKey, acquiredAt: now,
        query: seal === sourceWrappers[2]!.seal ? 'unchanged synthetic query' : undefined });
      expect(seal(original).provenanceToken).toBe(direct.provenanceToken);
    });

    it('preserves an existing restrictive partition instead of manufacturing authority', () => {
      const original = { ...sourceFacts({ saleId: null, url: 'ftp://auction.synthetic.invalid/lot/1' }),
        evidenceDisposition: 'rejected_objective_conflict' as const, evidenceReasons: ['existing objective reason'] };
      const verification = verifyCanonicalObservation(JSON.parse(JSON.stringify(seal(original))), { signingKey, now });
      expect(verification.sale.evidenceDisposition).toBe('rejected_objective_conflict');
      expect(verification.sale.evidenceReasons).toContain('existing objective reason');
    });
  });

  it('documents rather than pretends to reconstruct irrecoverable scheme/credentials in pre-wrapper legacy tokens', () => {
    const urls = ['https://auction.synthetic.invalid/lot/1', 'ftp://auction.synthetic.invalid/lot/1',
      'https://user:password@auction.synthetic.invalid/lot/1'];
    const tokens = urls.map((url) => signed({ saleId: null, url }));
    // Existing canonical signer deliberately stays untouched: these raw inputs
    // have identical signed facts. The final verifier has no original scheme.
    expect(new Set(tokens.map((sale) => sale.provenanceToken)).size).toBe(1);
    for (const token of tokens) {
      const verification = verifyCanonicalObservation(token, { signingKey, now });
      expect(verification.verified).toBe(true);
      expect(verification.sale.url).toBe('auction.synthetic.invalid/lot/1');
    }
  });

  it.each([
    { saleId: 'v1|123456789012|0', url: null, eligible: true },
    { saleId: 'recognized-provider-17', url: 'ftp://auction.synthetic.invalid/lot/1', eligible: true },
    { saleId: 'https://ebay.com/itm/123456789', url: 'https://ebay.com/itm/123456789', eligible: true },
    { saleId: null, url: 'ftp://auction.synthetic.invalid/lot/1', eligible: false },
    { saleId: null, url: 'https://user:password@auction.synthetic.invalid/lot/1', eligible: false },
  ])('ordinary actual deciding review still requires usable original identity and preserves bound approval: %j', ({ eligible, ...identity }) => {
    const evidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
      gradeMatches: true, rawOrLooseVisible: false, identityMatches: true };
    const rationale = 'Synthetic exact pictured identity and grading label.';
    const original = { ...sourceFacts(identity), visualRequirement: 'required' as const, visualReviewStatus: 'match' as const,
      visualReviewRationale: rationale, visualEvidence: evidence,
      visualAudit: { imageCount: 1, initialVerdict: 'match' as const, initialConfidence: 'high' as const,
        initialRationale: rationale, retryStatus: 'not_needed' as const, finalPass: 'initial' as const,
        initialEvidence: evidence, finalEvidence: evidence } };
    const sealed = sealSoldCompsFinalVisualListings([original], { acquiredAt: now, signingKey,
      reviewedTarget: target, target, targetMetadata: buildVisualTargetMetadata(target),
      targetImageReference: image, expectedImageReference: image, query: 'unchanged synthetic query' })[0]!;
    const wire = JSON.parse(JSON.stringify(sealed));
    wire.title = null; // Existing soft browser omission must not discard signed facts.
    const verification = verifyCanonicalObservation(wire, { signingKey, now });
    expect(verification.verified).toBe(true);
    expect(Boolean(getVerifiedIdentityApproval(verification.sale, target, image))).toBe(eligible);
    const decision = normalizeAnalysisMarketSale(wire, now, { signingKey, target });
    expect(decision.valuationEligible).toBe(eligible);
    expect(scoreComparable(target, decision.sale).accepted).toBe(eligible);
    const profile = buildMarketProfile(target, [decision.sale], null, now);
    expect(profile.authoritativeSaleCount).toBe(eligible ? 1 : 0);
    assertIntake(profile, 1);
    if (!eligible) expect(readServerNormalizationReport(decision.sale)?.sourceAdmission.blockerCodes).toContain('TRANSACTION_IDENTITY_MISSING');
  });

  it('does not replace signed missing identity with a browser ID, URL, canonical reference or fake private receipt', () => {
    const input = signed({ saleId: null, url: null });
    Object.assign(input, { saleId: 'browser-minted', url: 'https://www.ebay.com/itm/123456789', canonicalTransactionId: 'record:sold_comps:browser-minted',
      analysisIntake: { sourceAdmission: { verification: 'verified', normalizationEligible: true } } });
    const decision = normalizeAnalysisMarketSale(input, now, { signingKey, target });
    expect(decision.valuationEligible).toBe(false);
    expect(decision.sale.saleId).toBeNull();
    expect(decision.sale.canonicalTransactionId).toBeNull();
    expect(readServerNormalizationReport(decision.sale)?.sourceAdmission.blockerCodes).toContain('TRANSACTION_IDENTITY_MISSING');
  });

  it('optional title omissions after genuine approval survive JSON, identity transfer and normalization', () => {
    const input = signed({ title: 'Kobe Bryant PSA 10' }, true);
    input.title = null;
    const sale = normalized([input])[0];
    expect(sale.title).toBe('Kobe Bryant PSA 10');
    expect(sale.evidenceDisposition).toBe('valuation_eligible');
    expect(getVerifiedIdentityApproval(sale, target, image)).not.toBeNull();
    expect(scoreComparable(target, sale).identityAdmission?.basis).toBe('server_final_visual');
    expect(buildMarketProfile(target, [sale], null, now).authoritativeSaleCount).toBe(1);
  });

  it.each([false, true])('prefers the verified usable observation over restrictive/unverified copies in either order: reverse=%s', (reverse) => {
    const url = 'https://www.ebay.com/itm/123456789';
    const usable = signed({ url, title: 'Kobe Bryant PSA 10', price: 1200 }, true);
    const context = signed({ url, price: 9000, evidenceDisposition: 'context_only' });
    const unverified = { ...signed({ url, price: 1 }), provenanceToken: null };
    const inputs = reverse ? [usable, context, unverified] : [unverified, context, usable];
    const sales = normalized(inputs);
    const selection = selectBalancedComparableSales(target, sales, now);
    expect(selection.deduplicated.unique).toHaveLength(1);
    expect(selection.deduplicated.duplicates).toHaveLength(2);
    expect(selection.selected[0].sale.price).toBe(1200);
    expect(getVerifiedIdentityApproval(selection.deduplicated.unique[0], target, image)).not.toBeNull();
    expect(selection.deduplicated.duplicates.every((row) => getVerifiedIdentityApproval(row.sale, target, image) === null)).toBe(true);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(1);
    expect(profile.saleMedianValue).toBe(1200);
    expect(profile.duplicateSaleCount).toBe(2);
    assertIntake(profile, 3);
    expect(population(profile.finalUseReport, 'suppressed_duplicates').memberRefs).toHaveLength(2);
    const retained = profile.comparables.find((row) => !row.duplicateOf)!;
    expect(retained.valuationUse?.auditRef.intakeOrdinal).toBe(reverse ? 0 : 2);
  });

  it.each([false, true])('prefers actual final-target approval over economically valid but unapproved required copy: reverse=%s', (reverse) => {
    const good = signed({ title: 'Kobe Bryant PSA 10' }, true);
    const noApproval = signed({ visualRequirement: 'required', visualReviewStatus: 'match', price: 9000 });
    const sales = normalized(reverse ? [good, noApproval] : [noApproval, good]);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(1);
    expect(profile.saleMedianValue).toBe(1000);
    expect(profile.comparables.find((row) => !row.duplicateOf)?.valuationUse?.identityAdmission.basis).toBe('server_final_visual');
    assertIntake(profile, 2);
  });

  it.each([false, true])('prefers actual target-admitted title observation over wrong-grade same-transaction copy: reverse=%s', (reverse) => {
    const good = signed({ price: 1200 });
    const wrong = signed({ title: '1996 Topps Kobe Bryant #138 PSA 9', price: 5000 });
    const sales = normalized(reverse ? [good, wrong] : [wrong, good]);
    expect(sales.every((sale) => sale.evidenceDisposition === 'valuation_eligible')).toBe(true);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(1);
    expect(profile.saleMedianValue).toBe(1200);
    expect(profile.comparables.find((row) => row.duplicateOf)?.valuationUse?.identityAdmission.accepted).toBe(false);
    assertIntake(profile, 2);
  });

  it('never chooses a duplicate winner by price, keeps tie ingress and captured duplicate raw identity', () => {
    const first = signed({ title: 'Kobe Bryant PSA 10', price: 100 }, true);
    const second = signed({ title: 'Kobe Bryant PSA 10', price: 5000 }, true);
    const sales = normalized([first, second]);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.saleMedianValue).toBe(100);
    const duplicate = profile.comparables.find((row) => row.duplicateOf)!;
    expect(duplicate.valuationUse?.identityAdmission).toMatchObject({ accepted: true, serverFinalApprovalVerified: true, basis: 'server_final_visual' });
    expect(duplicate.valuationUse?.use).toMatchObject({ code: 'EXACT_DUPLICATE', primaryMarketSales: false });
    expect(getVerifiedIdentityApproval({ ...sales[1], duplicateStatus: 'exact_duplicate' }, target, image)).toBeNull();
    assertIntake(profile, 2);
    const changed = normalized([signed({ title: 'Kobe Bryant PSA 10', price: 9999 }, true), signed({ title: 'Kobe Bryant PSA 10', price: 1 }, true)]);
    expect(selectBalancedComparableSales(target, changed, now).selected[0].sale.price).toBe(9999);
  });

  it('retains distinct known IDs with identical title/date/price and even a reused listing URL', () => {
    const url = 'https://www.ebay.com/itm/123456789';
    const sales = normalized([signed({ saleId: 'distinct-one', url }), signed({ saleId: 'distinct-two', url })]);
    expect(sales[0].canonicalTransactionId).toBe(sales[1].canonicalTransactionId);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(2);
    expect(profile.duplicateSaleCount).toBe(0);
    expect(profile.possibleDuplicateCount).toBeGreaterThan(0);
    assertIntake(profile, 2);
  });

  it('origin-scopes raw IDs despite unchanged legacy canonical ID collisions', () => {
    const sales = normalized([signed({ saleId: 'shared-id', originMarketplace: 'eBay' }),
      signed({ saleId: 'shared-id', originMarketplace: 'Goldin', priceBasis: 'closed', buyerPremium: 'included' })]);
    expect(sales[0].canonicalTransactionId).toBe(sales[1].canonicalTransactionId);
    expect(transactionIdentity(sales[0]).recordKey).not.toBe(transactionIdentity(sales[1]).recordKey);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(2);
    expect(profile.duplicateSaleCount).toBe(0);
    assertIntake(profile, 2);
  });

  it('same signed ID/listing on different known dates remains explicit relisting/event ambiguity, not proven duplicate', () => {
    const url = 'https://www.ebay.com/itm/123456789';
    const sales = normalized([signed({ url, date: '2026-09-01' }), signed({ url, date: '2026-09-02' })]);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(2);
    expect(profile.duplicateSaleCount).toBe(0);
    expect(profile.possibleDuplicateCount).toBeGreaterThan(0);
    expect(sales[0].canonicalTransactionId).toBe(sales[1].canonicalTransactionId);
    assertIntake(profile, 2);
  });

  it.each([false, true])('deduplicates actual slug/no-slug listing-only mirrors across adapters: reverse=%s', (reverse) => {
    const first = signed({ saleId: null, url: 'https://www.ebay.com/itm/123456789?utm_source=a' });
    const raw: MarketSale = { title: target.title, price: 1000, currency: 'USD', date: '2026-09-01', sourceId: '130point',
      originMarketplace: 'eBay', saleStatus: 'completed', priceBasis: 'sold', saleId: null,
      url: 'https://ebay.com/itm/Kobe-Bryant/123456789?mkcid=1&var=2' };
    const seal = sealCanonicalObservation('130point', raw, { acquiredAt: now, signingKey });
    const second = JSON.parse(JSON.stringify({ ...raw, provenanceToken: seal.provenanceToken }));
    expect(verifyCanonicalObservation(second, { signingKey, now }).verified).toBe(true);
    const sales = normalized(reverse ? [second, first] : [first, second]);
    expect(sales[0].canonicalTransactionId).not.toBe(sales[1].canonicalTransactionId);
    expect(sales[0].url).not.toBe(sales[1].url);
    expect(transactionIdentity(sales[0]).urlKey).toBe(transactionIdentity(sales[1]).urlKey);
    expect(deduplicateMarketSales(sales).duplicates).toHaveLength(1);
    const selection = selectBalancedComparableSales(target, sales, now);
    expect(selection.selected).toHaveLength(1);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(1);
    expect(profile.duplicateSaleCount).toBe(1);
    assertIntake(profile, 2);
  });

  it.each([
    [{ saleId: 'known-one' }, { saleId: 'known-two' }],
    [{ saleId: null, date: '2026-09-01' }, { saleId: null, date: '2026-09-02' }],
    [{ saleId: null, originMarketplace: 'eBay' }, { saleId: null, originMarketplace: 'Goldin', buyerPremium: 'included' }],
  ] as Array<[Partial<MarketSale>, Partial<MarketSale>]>)('does not collapse slug mirrors with conflicting known IDs, dates or origins: %j', (left, right) => {
    const sales = normalized([
      signed({ url: 'https://ebay.com/itm/123456789', ...left }),
      signed({ url: 'https://ebay.com/itm/Kobe-Bryant/123456789', ...right }),
    ]);
    const profile = buildMarketProfile(target, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(2);
    expect(profile.duplicateSaleCount).toBe(0);
    assertIntake(profile, 2);
  });

  it('browser receipt/provenance/approval flags cannot beat private verified authority', () => {
    const url = 'https://www.ebay.com/itm/123456789';
    const sales = normalized([{ ...signed({ url }), provenanceToken: null }, signed({ url }, true)]);
    Object.assign(sales[0], { analysisIntake: sales[1].analysisIntake, provenance: sales[1].provenance, identityApproval: sales[1].identityApproval,
      observationId: sales[1].observationId, canonicalTransactionId: sales[1].canonicalTransactionId });
    expect(readServerNormalizationReport(sales[0])?.sourceAdmission.verification).toBe('unverified');
    const selected = selectBalancedComparableSales(target, sales, now);
    expect(selected.selected).toHaveLength(1);
    expect(selected.deduplicated.inputOrdinals.get(selected.selected[0].sale)).toBe(1);
    expect(getVerifiedIdentityApproval(selected.selected[0].sale, target, image)).not.toBeNull();
  });
});
