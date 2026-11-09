import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { annotateSoldComparableCandidate, sealSoldCompsFinalVisualListings } from './testAIRouter';
import { buildVisualTargetMetadata, conservativeGradedVisualReviews, applyVisualSourceReviews, type VisualSourceReview } from './testAiVisualSourceFilter';
import { getVerifiedIdentityApproval, sealCanonicalObservation, verifyCanonicalObservation } from './testAiCanonicalObservation';
import { normalizeAnalysisMarketSale, normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { buildMarketProfile, scoreComparable, type ComparableTarget, type MarketSale } from './testAiComparableEngine';
import { buildAnalysisSnapshot } from './testAiAnalysisSnapshot';
import { buildSoldCompsAnalysisSales } from '../shared/testAiSoldCompsTransport';

const now = new Date('2026-11-09T02:00:00.000Z');
const signingKey = 'stage3-synthetic-chain-key-never-a-service-credential';
const image = 'https://example.test/target-primary.jpg';
const evidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
  gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true };
const kobe: ComparableTarget = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards',
  itemType: 'single_card', grade: '10', certificationCompany: 'PSA', approvalTargetImageReference: image,
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
const zelda: ComparableTarget = { title: 'The Legend of Zelda NES PSA 7.50', category: 'video_games',
  itemType: 'game', grade: '7.50', certificationCompany: 'PSA', approvalTargetImageReference: image,
  itemDetails: JSON.stringify({ gameTitle: 'The Legend of Zelda', platform: 'NES', releaseYear: '1987', completeInBox: 'Yes', sealed: 'No' }) };

function review(patch: Partial<VisualSourceReview> = {}): VisualSourceReview {
  return { candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'Both images independently confirm the same item, graded holder, grader and numeric grade.',
    visualEvidence: evidence, visualAudit: { imageCount: 1, initialVerdict: 'match', initialConfidence: 'high',
      initialRationale: 'The primary image confirms identity and grading.', decidingRationale: 'Both images confirm identity and grading.',
      initialEvidence: evidence, finalEvidence: evidence, retryStatus: 'not_needed', finalPass: 'initial', adjudicationStatus: 'confirmed' }, ...patch };
}

function sourceRow(target: ComparableTarget, overrides: Record<string, unknown> = {}, decidingReview = review()) {
  const candidate = { title: target.title, soldPrice: '1000', soldCurrency: 'USD', endedAt: '2026-11-01T00:00:00.000Z',
    id: 'fixture-138', saleId: 'fixture-138', url: 'https://www.ebay.com/itm/fixture-138', sourceId: 'sold_comps',
    imageUrl: 'https://example.test/candidate.jpg', thumbnailUrl: 'https://example.test/candidate.jpg', ...overrides };
  const metadata = buildVisualTargetMetadata(target);
  const normalizedReview = conservativeGradedVisualReviews([decidingReview], [candidate], metadata)[0];
  const applied = applyVisualSourceReviews([candidate], [normalizedReview], 1, { targetMetadata: metadata }).listings[0];
  const annotation = annotateSoldComparableCandidate({ ...applied, visualRequirement: 'required' }, {
    category: target.category, targetItemType: target.itemType ?? '', certificationCompany: target.certificationCompany ?? '',
    targetGrade: Number(target.grade), targetNumber: target.category === 'sports_cards' ? '138' : null,
    targetPlayer: target.category === 'sports_cards' ? 'Kobe Bryant' : null, visualReviewRequired: true, targetMetadata: metadata,
  });
  const sale = { ...annotation, sourceId: 'sold_comps', price: Number(annotation.soldPrice), currency: candidate.soldCurrency,
    date: candidate.endedAt, saleId: candidate.saleId, url: candidate.url, saleStatus: 'completed' as const,
    completedStatusBasis: 'Sold-Comps completed-sale endpoint', priceBasis: 'sold' as const,
    saleForm: target.category === 'video_games' ? 'complete_in_box' : 'single_card', lotQuantity: 1,
    ...overrides } as MarketSale;
  return { sale, metadata };
}

function sealedRow(target: ComparableTarget, overrides: Record<string, unknown> = {}, decidingReview = review(), bindingTarget = target, bindingImage = image) {
  const { sale, metadata } = sourceRow(target, overrides, decidingReview);
  return sealSoldCompsFinalVisualListings([sale], { reviewedTarget: target, target: bindingTarget,
    targetMetadata: metadata, targetImageReference: image, expectedImageReference: bindingImage,
    query: target.title, acquiredAt: now, signingKey })[0];
}

function chain(target: ComparableTarget, overrides: Record<string, unknown> = {}, decidingReview = review()) {
  const sealed = sealedRow(target, overrides, decidingReview);
  const transported = buildSoldCompsAnalysisSales({ listings: [sealed] }, true);
  const wire = JSON.parse(JSON.stringify(transported[0])) as MarketSale;
  const normalized = normalizeAnalysisMarketSale(wire, now, { signingKey, category: target.category, target });
  return { sealed, wire, normalized, match: scoreComparable(target, normalized.sale) };
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); });

describe('Stage 3 actual trusted identity and pricing handoff', () => {
  it.each(['1996 Kobe Bryant #138 PSA 10', '1996 Kobe Bryant PSA 10', 'Kobe Bryant'])('preserves a completed graded visual match despite title omission: %s', (title) => {
    const result = chain(kobe, { title });
    expect(result.sealed.evidenceDisposition).toBe('valuation_eligible');
    expect(result.normalized.valuationEligible).toBe(true);
    expect(result.match).toMatchObject({ accepted: true, classification: 'exact', identityRelationship: 'exact_identity',
      valuationRelationship: 'direct_comparable', identityAdmissionBasis: 'server_final_visual' });
    expect(result.match.identityApproval).toBeTruthy();
    expect(result.match.titleCategoryIdentity?.unconfirmedFields).toContain('Manufacturer');
    expect(result.match.reasons.join(' ')).toContain('title omissions do not reopen identity');
  });

  it('keeps the original low title score instead of inventing title points for image-confirmed identity', () => {
    const result = chain(kobe, { title: 'Kobe Bryant' });
    const unapproved = scoreComparable(kobe, { title: 'Kobe Bryant', price: 1000, visualReviewStatus: 'match' });
    expect(result.match.score).toBe(unapproved.score);
    expect(result.match.score).toBeLessThan(48);
    expect(result.match.accepted).toBe(true);
    expect(unapproved.accepted).toBe(false);
  });

  it.each([['PSA', 'WATA'], ['WATA', 'PSA']])('preserves numeric equivalence and Video Games grader family: target %s / sale %s', (targetCompany, saleCompany) => {
    const target = { ...zelda, certificationCompany: targetCompany, title: `The Legend of Zelda NES ${targetCompany} 7.50` };
    const result = chain(target, { title: `1987 The Legend of Zelda NES ${saleCompany} 7.5 CIB` });
    expect(result.normalized.valuationEligible).toBe(true);
    expect(result.match.accepted).toBe(true);
    expect(result.match.identityAdmissionBasis).toBe('server_final_visual');
    expect(result.wire.title).toContain(saleCompany);
  });

  it('preserves authority through normalization and the actual dedup/selection/snapshot chain, with sale-only pricing', () => {
    const rows = [100, 101, 102, 103, 104, 105, 106].map((price, index) => sealedRow(kobe,
      { title: '1996 Kobe Bryant PSA 10', soldPrice: String(price), price, saleId: `clean-${index}`, id: `clean-${index}`, url: `https://www.ebay.com/itm/clean-${index}` }));
    const input = JSON.parse(JSON.stringify(buildSoldCompsAnalysisSales({ listings: rows }, true))) as MarketSale[];
    const sales = normalizeAnalysisMarketSales(input, now, { signingKey, category: kobe.category, target: kobe });
    const snapshot = buildAnalysisSnapshot({ target: kobe, sales, now });
    expect(snapshot.profile.authoritativeSaleCount).toBe(7);
    expect(snapshot.profile.valuationBasis).toBe('market_sales');
    expect(snapshot.profile.primaryValue).toBe(103);
    expect(snapshot.profile.minimum).toBe(100);
    expect(snapshot.profile.maximum).toBe(106);
    expect(snapshot.profile.comparables.every((match) => match.identityAdmissionBasis === 'server_final_visual')).toBe(true);
    expect(snapshot.profile.comparables.every((match) => Boolean(match.identityApproval))).toBe(true);
  });

  it('preserves only the genuinely confirmed deciding retry, not the earlier failed evidence', () => {
    const initial = { ...evidence, identityMatches: false, gradeMatches: false };
    const finalReview = review({ visualAudit: { ...review().visualAudit!, finalPass: 'high_resolution_retry', retryStatus: 'performed',
      initialVerdict: 'mismatch', initialConfidence: 'high', initialEvidence: initial, finalEvidence: evidence,
      retryVerdict: 'match', retryConfidence: 'high', retryRationale: 'Independent high-resolution image confirms the matching identity and grade.' } });
    expect(chain(kobe, {}, finalReview).match.accepted).toBe(true);
    const failed = review({ visualAudit: { ...finalReview.visualAudit!, finalEvidence: { ...evidence, gradeMatches: false }, retryVerdict: 'unreadable' } });
    expect(chain(kobe, {}, failed).normalized.valuationEligible).toBe(false);
  });

  it.each([
    ['raw candidate', { title: '1996 Topps Kobe Bryant #138 raw' }, review({ visualEvidence: { ...evidence, slabVisible: false, rawOrLooseVisible: true },
      visualAudit: { ...review().visualAudit!, finalEvidence: { ...evidence, slabVisible: false, rawOrLooseVisible: true } } })],
    ['wrong card number', { title: '1996 Topps Kobe Bryant #139 PSA 10' }, review()],
    ['wrong numeric grade', { title: '1996 Topps Kobe Bryant #138 PSA 9' }, review()],
    ['wrong grader outside permitted family', { title: '1996 Topps Kobe Bryant #138 BGS 10' }, review()],
    ['explicit lot quantity', { lotQuantity: 3 }, review()],
    ['explicit lot form', { saleForm: 'lot' }, review()],
    ['wrong currency', { currency: 'CAD', soldCurrency: 'CAD' }, review()],
    ['unknown currency', { currency: null, soldCurrency: null }, review()],
    ['nonpositive price', { price: 0, soldPrice: '0' }, review()],
    ['missing date', { date: null, endedAt: null }, review()],
    ['future date', { date: '2027-01-01', endedAt: '2027-01-01' }, review()],
    ['stale date', { date: '2023-01-01', endedAt: '2023-01-01' }, review()],
    ['active asking status', { saleStatus: 'active' }, review()],
    ['unknown price basis', { priceBasis: 'unknown' }, review()],
    ['unconfirmed realized premium', { priceBasis: 'realized', buyerPremium: 'unknown' }, review()],
    ['restrictive source disposition', { evidenceDisposition: 'omitted_by_cap' }, review()],
  ] as const)('keeps %s out of final valuation', (_label, overrides, deciding) => {
    const result = chain(kobe, { ...overrides }, deciding);
    const snapshot = buildAnalysisSnapshot({ target: kobe, sales: [result.normalized.sale], now });
    expect(snapshot.profile.authoritativeSaleCount).toBe(0);
    expect(snapshot.profile.comparables).toHaveLength(1);
    expect(snapshot.profile.comparables[0].accepted).toBe(false);
  });

  it('does not reuse approval for a changed effective target or primary image, even with final image analysis disabled', () => {
    const result = chain(kobe);
    expect(result.normalized.valuationEligible).toBe(true);
    const changedImage = { ...kobe, approvalTargetImageReference: 'https://example.test/new-primary.jpg' };
    const changedTarget = { ...kobe, itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '139' }) };
    for (const actualTarget of [changedImage, changedTarget, { ...kobe, approvalTargetImageReference: undefined }]) {
      const normalization = normalizeAnalysisMarketSale(result.wire, now, { signingKey, target: actualTarget });
      expect(normalization.valuationEligible).toBe(false);
      expect(scoreComparable(actualTarget, normalization.sale).accepted).toBe(false);
    }
    expect(getVerifiedIdentityApproval(result.normalized.sale, kobe)).toBeTruthy();
    expect(getVerifiedIdentityApproval({ ...result.normalized.sale }, kobe)).toBeNull();
    expect(scoreComparable(kobe, { ...result.normalized.sale }).accepted).toBe(false);
  });

  it('keeps old required-visual and rough matches as source-only review records without backfilling approval', () => {
    for (const status of ['match', 'rough_match', 'unreadable', 'not_reviewed'] as const) {
      const { sale } = sourceRow(kobe);
      const oldSale = { ...sale, visualReviewStatus: status };
      const sealed = sealCanonicalObservation('sold_comps', oldSale, { signingKey, acquiredAt: now });
      const wire = { ...oldSale, ...sealed };
      expect(verifyCanonicalObservation(wire, { signingKey, now }).verified).toBe(true);
      expect(normalizeAnalysisMarketSale(wire, now, { signingKey, target: kobe }).valuationEligible).toBe(false);
    }
  });

  it('retains the existing legitimate signed nonvisual source-only path', () => {
    const legacy = { title: kobe.title, price: 1000, currency: 'USD', date: '2026-11-01', saleId: 'legacy-nonvisual',
      sourceId: 'the_card_api', originMarketplace: 'ebay', url: 'https://www.ebay.com/itm/123456789012',
      saleStatus: 'completed' as const, completedStatusBasis: 'The Card API provider-confirmed final sale',
      priceBasis: 'sold' as const, buyerPremium: 'included' as const, visualRequirement: 'not_required' as const };
    const sealed = sealCanonicalObservation('the_card_api', legacy, { signingKey, acquiredAt: now });
    const wire = JSON.parse(JSON.stringify({ ...legacy, ...sealed }));
    expect(verifyCanonicalObservation(wire, { signingKey, now }).verified).toBe(true);
    const normalized = normalizeAnalysisMarketSale(wire, now, { signingKey, target: kobe });
    expect(normalized.sale).toMatchObject({ sourceAdapter: 'the_card_api', originMarketplace: 'ebay', price: 1000, priceBasis: 'sold' });
    expect(normalized.valuationEligible).toBe(true);
    expect(getVerifiedIdentityApproval(normalized.sale, kobe)).toBeNull();
    expect(scoreComparable(kobe, normalized.sale).accepted).toBe(true);
    // Signing a wrapper's completed/sold label does not supply missing origin
    // economics or turn The Card API's Goldin hammer amount into retail value.
    for (const originMarketplace of ['unknown_marketplace', 'goldin']) {
      const held = { ...legacy, originMarketplace };
      const proof = sealCanonicalObservation('the_card_api', held, { signingKey, acquiredAt: now });
      const heldWire = JSON.parse(JSON.stringify({ ...held, ...proof }));
      expect(verifyCanonicalObservation(heldWire, { signingKey, now }).verified).toBe(true);
      const decision = normalizeAnalysisMarketSale(heldWire, now, { signingKey, target: kobe });
      expect(decision.valuationEligible).toBe(false);
      // Identity may agree while the amount remains financially unusable.
      const heldProfile = buildMarketProfile(kobe, [decision.sale], null, now);
      expect(heldProfile.authoritativeSaleCount).toBe(0);
      expect(heldProfile.primaryValue).toBeNull();
      expect(heldProfile.comparables).toHaveLength(1);
      expect(heldProfile.comparables[0].accepted).toBe(false);
      expect(heldProfile.comparables[0].valuationUse?.sourceAdmission.blockerCodes).toContain('AUCTION_AMOUNT_UNRESOLVED');
      expect(heldProfile.comparables[0].valuationUse?.use.primaryMarketSales).toBe(false);
      expect(getVerifiedIdentityApproval(decision.sale, kobe)).toBeNull();
    }
  });

  it('does not let a browser status/approval/audit injection invent server authority', () => {
    const fake: MarketSale = { title: kobe.title, price: 1000, currency: 'USD', date: '2026-11-01', sourceId: 'sold_comps', saleId: 'fake',
      saleStatus: 'completed', priceBasis: 'sold', visualRequirement: 'required', visualReviewStatus: 'match',
      evidenceDisposition: 'valuation_eligible', identityApproval: { version: 'identity-approval-v1', status: 'approved', verified: true } };
    expect(normalizeAnalysisMarketSale(fake, now, { signingKey, target: kobe }).valuationEligible).toBe(false);
    expect(scoreComparable(kobe, fake).accepted).toBe(false);
  });

  it('keeps duplicate and source-balanced cap decisions independent of approval', () => {
    const sealed = sealedRow(kobe);
    const wire = JSON.parse(JSON.stringify(sealed));
    const normalized = normalizeAnalysisMarketSales([wire, wire], now, { signingKey, target: kobe });
    const profile = buildMarketProfile(kobe, normalized, null, now);
    expect(profile.authoritativeSaleCount).toBe(1);
    expect(profile.duplicateSaleCount).toBe(1);
    expect(profile.comparables.filter((match) => match.accepted)).toHaveLength(1);
    expect(profile.comparables.find((match) => match.duplicateOf)?.accepted).toBe(false);
  });
});

describe('Stage 3 retains the approved Video Games hard/soft boundary', () => {
  it('keeps a suffix-only Sealed A++ versus Sealed A+ visual match approved', () => {
    const target = { ...zelda, itemDetails: JSON.stringify({ gameTitle: 'The Legend of Zelda', platform: 'NES', releaseYear: '1987', sealed: 'Yes', completeInBox: 'Yes' }) };
    const deciding = review({ visualDifferences: [{ field: 'sealed label designation', targetObservation: 'Sealed A++', candidateObservation: 'Sealed A+', impact: 'material label mismatch' }] });
    const result = chain(target, { title: '1987 The Legend of Zelda NES WATA 7.5 Sealed', saleForm: 'sealed' }, deciding);
    expect(result.normalized.valuationEligible).toBe(true);
    expect(result.match.accepted).toBe(true);
  });

  it.each([
    ['sealed versus CIB-only', '1987 The Legend of Zelda NES WATA 7.5 CIB', 'complete_in_box'],
    ['sealed versus loose', '1987 The Legend of Zelda NES WATA 7.5 loose cartridge', 'loose'],
    ['wrong platform', '1987 The Legend of Zelda SNES WATA 7.5 Sealed', 'sealed'],
    ['different grade', '1987 The Legend of Zelda NES WATA 8 Sealed', 'sealed'],
    ['outside grader family', '1987 The Legend of Zelda NES VGA 7.5 Sealed', 'sealed'],
  ])('does not let final approval override %s', (_label, title, saleForm) => {
    const target = { ...zelda, itemDetails: JSON.stringify({ gameTitle: 'The Legend of Zelda', platform: 'NES', releaseYear: '1987', sealed: 'Yes', completeInBox: 'Yes' }) };
    const result = chain(target, { title, saleForm });
    const profile = buildMarketProfile(target, [result.normalized.sale], null, now);
    expect(profile.authoritativeSaleCount).toBe(0);
    expect(profile.comparables[0].accepted).toBe(false);
  });
});

describe('Stage 3 reviewed consistency controls', () => {
  it('blocks an explicit different athlete rather than treating the name as missing', () => {
    const result = chain(kobe, { title: '1996 Topps Michael Jordan PSA 10' });
    expect(result.normalized.valuationEligible).toBe(false);
    expect(result.match.accepted).toBe(false);
  });

  it('does not invent a player from set/finish descriptors', () => {
    const result = chain(kobe, { title: '1996 Topps Basketball Card PSA 10' });
    expect(result.normalized.valuationEligible).toBe(true);
    expect(result.match.accepted).toBe(true);
  });

  it('blocks structured Sealed/CIB-only or loose form even when the title omits packaging', () => {
    const target = { ...zelda, itemDetails: JSON.stringify({ gameTitle: 'The Legend of Zelda', platform: 'NES', sealed: 'Yes', completeInBox: 'Yes' }) };
    for (const saleForm of ['complete_in_box', 'loose']) {
      const result = chain(target, { title: 'The Legend of Zelda NES WATA 7.5', saleForm });
      expect(result.normalized.valuationEligible).toBe(false);
      expect(result.match.accepted).toBe(false);
    }
  });

  it('keeps both possible duplicates warning-retained while a proven exact duplicate remains excluded', () => {
    const first = sealedRow(kobe, { title: '1996 Kobe Bryant PSA 10', price: 1000, soldPrice: '1000',
      id: 'possible-a', saleId: 'possible-a', url: 'https://www.ebay.com/itm/123456789012' });
    const second = sealedRow(kobe, { title: '1996 Kobe Bryant PSA 10', price: 1100, soldPrice: '1100',
      id: 'possible-b', saleId: 'possible-b', url: 'https://www.ebay.com/itm/123456789013' });
    const normalized = normalizeAnalysisMarketSales(JSON.parse(JSON.stringify([first, second, first])), now, { signingKey, target: kobe });
    const profile = buildMarketProfile(kobe, normalized, null, now);
    expect(profile.authoritativeSaleCount).toBe(2);
    expect(profile.duplicateSaleCount).toBe(1);
    expect(profile.comparables).toHaveLength(3);
    const possible = profile.comparables.filter((match) => match.duplicateStatus === 'possible_duplicate');
    expect(possible).toHaveLength(2);
    expect(possible.map((match) => match.saleId).sort()).toEqual(['possible-a', 'possible-b']);
    expect(profile.comparables.filter((match) => match.accepted)).toHaveLength(2);
    for (const match of possible) {
      expect(match.identityAdmissionBasis).toBe('server_final_visual');
      expect(match.identityApproval).toBeTruthy();
      expect(match.valuationUse?.use.possibleDuplicateWarning).toBe(true);
    }
    const exact = profile.comparables.filter((match) => match.duplicateStatus === 'exact_duplicate');
    expect(exact).toHaveLength(1);
    expect(exact[0]).toMatchObject({ accepted: false, saleId: 'possible-a', valuationUse: { use: { code: 'EXACT_DUPLICATE', primaryMarketSales: false } } });
    expect(exact[0].identityApproval).toBeFalsy();
  });

  it('preserves metadata/rank/audit diagnostics without using their browser values as authority or scoring points', () => {
    const result = chain(kobe, { metadataMatchScore: 63, metadataMatchRank: 9, metadataMatchReasons: ['gameTitle'],
      metadataFieldComparisons: [{ targetField: 'Grade', targetValue: '10', candidateField: 'Grade', candidateValue: '10', status: 'match' }] });
    expect(result.match.metadataMatchScore).toBe(63);
    expect(result.match.metadataMatchRank).toBe(9);
    expect(result.match.metadataFieldComparisons).toEqual(result.wire.metadataFieldComparisons);
    expect(result.match.visualEvidence).toMatchObject(evidence);
    const injected = { ...result.wire, metadataMatchScore: 100, metadataMatchRank: 1, visualAudit: { verified: true } };
    const normalized = normalizeAnalysisMarketSale(injected, now, { signingKey, target: kobe });
    expect(scoreComparable(kobe, normalized.sale).score).toBe(result.match.score);
    expect(scoreComparable(kobe, normalized.sale).visualEvidence).toMatchObject(evidence);
  });
});

it('holds the actual signed row when known final-target itemType becomes malformed instead of ignoring it', () => {
  const approved = chain(kobe);
  for (const itemType of [{ value: 'sealed_box' }, ['sealed_box']]) {
    const changed = { ...kobe, itemDetails: JSON.stringify({ ...JSON.parse(kobe.itemDetails as string), itemType }) };
    expect(getVerifiedIdentityApproval(approved.normalized.sale, changed)).toBeNull();
    const normalized = normalizeAnalysisMarketSale(approved.wire, now, { signingKey, target: changed });
    expect(normalized.valuationEligible).toBe(false);
    expect(scoreComparable(changed, normalized.sale).accepted).toBe(false);
  }
});
