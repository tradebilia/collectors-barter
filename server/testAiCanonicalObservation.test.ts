import { describe, expect, it, vi } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: '' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('Synthetic core tests must not invoke a provider'); }) }));
import { attachCanonicalProvenance, createServerFinalIdentityApproval, getVerifiedIdentityApproval, transferVerifiedIdentityApproval, sealCanonicalObservation, verifyCanonicalObservation, type ServerFinalIdentityApproval } from './testAiCanonicalObservation';
import { buildVisualTargetMetadata, type VisualSourceReview } from './testAiVisualSourceFilter';
import type { MarketSale } from './testAiComparableEngine';

const signingKey = 'canonical-observation-test-key';
const acquiredAt = new Date('2026-09-28T12:00:00.000Z');

function completedSale(overrides: Record<string, unknown> = {}) {
  return {
    title: '1996 Topps Kobe Bryant #138 PSA 10',
    price: 1000,
    currency: 'USD',
    date: '2026-09-02T00:00:00.000Z',
    sourceId: 'sold_comps',
    saleId: 'ebay-123',
    url: 'https://www.ebay.com/itm/123?utm_source=test',
    saleStatus: 'completed' as const,
    priceBasis: 'sold' as const,
    ...overrides,
  };
}

describe('canonical server observation provenance', () => {
  it('seals only normalized provider facts and verifies them with a canonical URL', () => {
    const sealed = sealCanonicalObservation('sold_comps', completedSale(), { signingKey, acquiredAt, query: '1996 Topps Kobe Bryant 138 PSA 10' });
    expect(sealed.provenanceToken).toBeTruthy();
    expect(sealed.provenance?.canonicalTransactionId).toBe('url:ebay.com/itm/123');
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    expect(verified.verified).toBe(true);
    if (!verified.verified) return;
    expect(verified.sale).toMatchObject({
      sourceId: 'sold_comps',
      sourceAdapter: 'sold_comps',
      originMarketplace: 'ebay',
      saleStatus: 'completed',
      priceBasis: 'sold',
      canonicalTransactionId: 'url:ebay.com/itm/123',
    });
  });

  it('binds a server-owned row reference when an adapter provides no provider ID or URL', () => {
    const row = completedSale({ saleId: null, url: null });
    const [attached] = attachCanonicalProvenance('sold_comps', [row], { signingKey, acquiredAt, serverOwnedIdentity: true });
    expect(attached.provenanceToken).toBeTruthy();
    expect(attached.validationErrors).toEqual([]);
    expect(attached.provenance?.canonicalTransactionId).toMatch(/^record:sold_comps:server_row_[a-f0-9]{32}$/);
    const verified = verifyCanonicalObservation({ provenanceToken: attached.provenanceToken }, { signingKey, now: acquiredAt });
    expect(verified.verified).toBe(true);
    if (verified.verified) expect(verified.sale.saleId).toMatch(/^server-row:[a-f0-9]{32}$/);
  });

  it('rejects browser tampering with a signed observation token', () => {
    const sealed = sealCanonicalObservation('sold_comps', completedSale(), { signingKey, acquiredAt });
    const verified = verifyCanonicalObservation({
      ...completedSale({ price: 999_999 }),
      provenanceToken: sealed.provenanceToken,
    }, { signingKey, now: acquiredAt });
    expect(verified.verified).toBe(true);
    if (!verified.verified) return;
    expect(verified.sale.price).toBe(1000);
  });

  it('rejects expired and malformed provenance tokens while retaining context facts', () => {
    const sealed = sealCanonicalObservation('sold_comps', completedSale(), { signingKey, acquiredAt });
    const expired = verifyCanonicalObservation({ ...completedSale(), provenanceToken: sealed.provenanceToken }, {
      signingKey,
      now: new Date(acquiredAt.getTime() + 21 * 60 * 1_000),
    });
    expect(expired.verified).toBe(false);
    expect(expired.reasons.join(' ')).toContain('expired');

    const malformed = verifyCanonicalObservation({ ...completedSale(), provenanceToken: 'not.a.valid.token' }, { signingKey, now: acquiredAt });
    expect(malformed.verified).toBe(false);
    expect(malformed.sale.evidenceDisposition).toBe('context_only');
  });
});

const imageReference = 'https://synthetic.invalid/primary-picture.jpg';
const target = {
  title: '1996 Topps Kobe Bryant #138', category: 'sports_cards', itemType: 'individual_card', grade: '10', certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ player: 'Kobe Bryant', manufacturer: 'Topps', cardNumber: '138', year: '1996' }),
};
const gradingEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
  gradeMatches: true, rawOrLooseVisible: false, identityMatches: true };
function finalReview(overrides: Partial<VisualSourceReview> = {}): VisualSourceReview {
  return { candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'Final pictured identity and grade confirmed.',
    visualEvidence: { ...gradingEvidence }, visualAudit: { imageCount: 1, initialVerdict: 'match', initialConfidence: 'high',
      initialRationale: 'Final pictured identity and grade confirmed.', retryStatus: 'not_needed', finalPass: 'initial',
      initialEvidence: { ...gradingEvidence }, finalEvidence: { ...gradingEvidence } }, ...overrides };
}
function approvalSale(overrides: Record<string, unknown> = {}): MarketSale {
  return completedSale({ visualRequirement: 'required', visualReviewStatus: 'match', evidenceDisposition: 'valuation_eligible',
    visualReviewRationale: 'Final pictured identity and grade confirmed.', ...overrides });
}
function mint(sale = approvalSale(), review = finalReview(), effectiveTarget = target, reviewedTarget = target) {
  return createServerFinalIdentityApproval({ sale, review, target: effectiveTarget, reviewedTarget,
    targetImageReference: imageReference, expectedImageReference: imageReference,
    targetMetadata: buildVisualTargetMetadata(reviewedTarget), acquiredAt });
}
function approved(sale = approvalSale(), review = finalReview()) {
  const handle = mint(sale, review);
  expect(handle).not.toBeNull();
  const sealed = sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt, identityApproval: handle });
  expect(sealed.identityApproval).toBeDefined();
  return { sale, handle, sealed };
}
function decode(token: string): Record<string, any> { return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')); }
function resign(payload: Record<string, any>, updateHash = true): string {
  if (updateHash) {
    const input = { adapterId: payload.provenance.adapterId, facts: payload.facts, acquiredAt: payload.provenance.acquiredAt };
    payload.provenance.payloadHash = createHash('sha256').update(JSON.stringify(Object.prototype.hasOwnProperty.call(payload, 'identityApproval')
      ? { ...input, identityApproval: payload.identityApproval } : input)).digest('hex');
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${createHmac('sha256', signingKey).update(encoded).digest('base64url')}`;
}

describe('identity-approval-v1 server authority', () => {
  it('signs an independently versioned approval and requires target plus independent image binding', () => {
    const { sealed } = approved(approvalSale({ title: 'Kobe Bryant PSA 10' }));
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    expect(verified.verified).toBe(true);
    if (!verified.verified) return;
    const approval = getVerifiedIdentityApproval(verified.sale, target, imageReference);
    expect(approval).toMatchObject({ version: 'identity-approval-v1', adapterId: 'sold_comps', origin: 'server_final_visual',
      verdict: 'match', decidingPass: 'initial', decidingEvidence: gradingEvidence });
    expect(Object.isFrozen(approval)).toBe(true);
    expect(Object.isFrozen(approval?.decidingEvidence)).toBe(true);
    expect(getVerifiedIdentityApproval(verified.sale, { ...target, approvalTargetImageReference: imageReference })).toBe(approval);
    expect(getVerifiedIdentityApproval(verified.sale, target)).toBeNull();
    expect(getVerifiedIdentityApproval(verified.sale, target, `${imageReference}?revision=2`)).toBeNull();
    expect(getVerifiedIdentityApproval(verified.sale, { ...target, grade: '9' }, imageReference)).toBeNull();
    expect(getVerifiedIdentityApproval(verified.sale, { ...target, itemDetails: JSON.stringify({ ...JSON.parse(target.itemDetails), cardNumber: '139' }) }, imageReference)).toBeNull();
  });

  it('does not grant authority to copied or serialized flags and deliberately transfers only a bound successor', () => {
    const { sealed } = approved();
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    if (!verified.verified) throw new Error('synthetic approval did not verify');
    const copy = { ...verified.sale, verified: true };
    const serialized: MarketSale = JSON.parse(JSON.stringify(verified.sale));
    expect(getVerifiedIdentityApproval(copy, target, imageReference)).toBeNull();
    expect(getVerifiedIdentityApproval(serialized, target, imageReference)).toBeNull();
    expect(transferVerifiedIdentityApproval(serialized, copy)).toBe(false);
    expect(transferVerifiedIdentityApproval(verified.sale, copy)).toBe(true);
    expect(getVerifiedIdentityApproval(copy, target, imageReference)).not.toBeNull();
    expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale, price: 2000 })).toBe(false);
    expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale, saleId: 'other-record' })).toBe(false);
    expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale, lotQuantity: 2 })).toBe(false);
    expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale, evidenceDisposition: 'context_only' })).toBe(false);
    copy.price = 2000;
    expect(getVerifiedIdentityApproval(copy, target, imageReference)).toBeNull();
  });

  it('cannot infer approval from browser match/audit or a forged/copied mint handle', () => {
    const sale = approvalSale();
    const handle = mint(sale)!;
    const generic = sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt });
    expect(decode(generic.provenanceToken!).identityApproval).toBeUndefined();
    const fake = { kind: 'server-final-identity-approval' } as ServerFinalIdentityApproval;
    for (const forged of [fake, { ...handle }, JSON.parse(JSON.stringify(handle))]) {
      expect(sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt, identityApproval: forged }).identityApproval).toBeUndefined();
    }
    expect(sealCanonicalObservation('sold_comps', { ...sale }, { signingKey, acquiredAt, identityApproval: handle }).identityApproval).toBeUndefined();
    expect(sealCanonicalObservation('the_card_api', sale, { signingKey, acquiredAt, identityApproval: handle }).identityApproval).toBeUndefined();
    expect(sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt, identityApproval: handle, lotQuantity: 2 }).identityApproval).toBeUndefined();
    sale.price = 999;
    expect(sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt, identityApproval: handle }).identityApproval).toBeUndefined();
  });

  it('binds acquisition and exact equal-title source rows without reusing neighboring decisions', () => {
    const sale = approvalSale();
    const handle = mint(sale)!;
    expect(sealCanonicalObservation('sold_comps', sale, { signingKey, identityApproval: handle }).provenance?.acquiredAt).toBe(acquiredAt.toISOString());
    expect(sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt: new Date(acquiredAt.getTime() + 1), identityApproval: handle }).identityApproval).toBeUndefined();
    const neighbor = approvalSale({ saleId: 'ebay-456', url: 'https://www.ebay.com/itm/456' });
    expect(sealCanonicalObservation('sold_comps', neighbor, { signingKey, acquiredAt, identityApproval: handle }).identityApproval).toBeUndefined();
    expect(mint(neighbor)).not.toBeNull();
  });

  it('fails closed for rough/unreadable/low, absent/failed required review, contrary or incomplete deciding evidence', () => {
    expect(mint(approvalSale(), finalReview({ verdict: 'rough_match' }))).toBeNull();
    expect(mint(approvalSale(), finalReview({ verdict: 'unreadable' }))).toBeNull();
    expect(mint(approvalSale(), finalReview({ confidence: 'low' }))).toBeNull();
    expect(mint(approvalSale(), finalReview({ visualAudit: undefined }))).toBeNull();
    for (const key of Object.keys(gradingEvidence)) {
      const incomplete = { ...gradingEvidence } as Record<string, boolean>;
      delete incomplete[key];
      const review = finalReview();
      review.visualAudit!.finalEvidence = incomplete;
      review.visualEvidence = incomplete;
      expect(mint(approvalSale(), review)).toBeNull();
    }
    for (const contrary of [{ identityMatches: false }, { artworkMatches: false }, { gradeMatches: false }, { rawOrLooseVisible: true }]) {
      const review = finalReview();
      review.visualAudit!.finalEvidence = { ...gradingEvidence, ...contrary };
      expect(mint(approvalSale(), review)).toBeNull();
    }
    const failed = finalReview();
    failed.visualAudit = { ...failed.visualAudit!, retryStatus: 'failed', adjudicationStatus: 'unavailable' };
    expect(mint(approvalSale(), failed)).toBeNull();
  });

  it('uses only the successful final retry evidence and cannot borrow initial positives', () => {
    const retry = finalReview();
    retry.visualAudit = { ...retry.visualAudit!, initialVerdict: 'mismatch', initialEvidence: { identityMatches: false },
      retryStatus: 'performed', finalPass: 'high_resolution_retry', adjudicationStatus: undefined, retryVerdict: 'match', retryConfidence: 'high',
      retryRationale: 'Final retry identity and grade confirmed.', finalEvidence: { ...gradingEvidence } };
    const { sealed } = approved(approvalSale(), retry);
    expect(sealed.identityApproval?.decidingEvidence).toEqual(gradingEvidence);
    expect(sealed.identityApproval).toMatchObject({ requiredAdjudication: true, adjudicationCompleted: true });
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    expect(verified.verified).toBe(true);
    expect(getVerifiedIdentityApproval(verified.sale, target, imageReference)).not.toBeNull();
    for (const incomplete of [{ ...gradingEvidence, gradeMatches: false }, { ...gradingEvidence, identityMatches: false }]) {
      retry.visualAudit.finalEvidence = incomplete;
      expect(mint(approvalSale(), retry)).toBeNull();
    }
    retry.visualAudit.finalEvidence = { identityMatches: true };
    expect(mint(approvalSale(), retry)).toBeNull();
    delete retry.visualAudit.finalEvidence;
    expect(mint(approvalSale(), retry)).toBeNull();
    retry.visualAudit.finalEvidence = { ...gradingEvidence };
    retry.visualAudit.retryVerdict = 'mismatch';
    expect(mint(approvalSale(), retry)).toBeNull();
    retry.visualAudit.retryVerdict = 'match';
    retry.visualAudit.adjudicationStatus = 'unavailable';
    expect(mint(approvalSale(), retry)).toBeNull();
    retry.visualAudit.adjudicationStatus = undefined;
    retry.visualAudit.retryStatus = 'failed';
    expect(mint(approvalSale(), retry)).toBeNull();
    retry.visualAudit.retryStatus = 'performed';
    retry.visualAudit.retryConfidence = 'low';
    expect(mint(approvalSale(), retry)).toBeNull();
  });

  it('preserves a completed initial match when only an optional non-deciding retry failed', () => {
    const review = finalReview();
    review.visualAudit!.retryStatus = 'failed';
    review.visualAudit!.retryReason = 'Optional non-deciding retry unavailable';
    expect(mint(approvalSale(), review)).not.toBeNull();
  });

  it('rejects hard reviewed differences even with approved-looking grade booleans', () => {
    for (const [field, targetObservation, candidateObservation] of [
      ['card number', '138', '139'], ['player', 'Kobe Bryant', 'Michael Jordan'], ['grade', '10', '9'],
      ['grader', 'PSA', 'WATA'], ['form', 'sealed', 'CIB only'], ['qualifier', 'OC', 'MC'],
    ]) expect(mint(approvalSale(), finalReview({ visualDifferences: [{ field, targetObservation, candidateObservation, impact: 'hard material conflict' }] }))).toBeNull();
  });

  it('does not treat the generic visual date flag as a Movie identity gate', () => {
    const movieTarget = { title: 'Batman (1989) Laserdisc', category: 'movies', itemType: 'individual_movie',
      itemDetails: JSON.stringify({ movieTitle: 'Batman', year: '1989', format: 'LaserDisc' }) };
    const movieReview = finalReview({ visualEvidence: { identityMatches: true, artworkMatches: true, dateMatches: false } });
    movieReview.visualAudit = { ...movieReview.visualAudit!, initialEvidence: { identityMatches: true, artworkMatches: true, dateMatches: false }, finalEvidence: { identityMatches: true, artworkMatches: true, dateMatches: false } };
    expect(mint(approvalSale({ title: 'Batman (1989) Laserdisc Michael Keaton' }), movieReview, movieTarget, movieTarget)).not.toBeNull();
  });

  it('requires the actual reviewed and effective target/image references to agree', () => {
    expect(mint(approvalSale(), finalReview(), { ...target, grade: '9' })).toBeNull();
    expect(mint(approvalSale(), finalReview(), { ...target, itemDetails: JSON.stringify({ ...JSON.parse(target.itemDetails), language: 'Japanese' }) })).toBeNull();
    const options = { sale: approvalSale(), review: finalReview(), target, reviewedTarget: target,
      targetMetadata: buildVisualTargetMetadata(target), acquiredAt, targetImageReference: imageReference, expectedImageReference: 'different' };
    expect(createServerFinalIdentityApproval(options)).toBeNull();
    expect(createServerFinalIdentityApproval({ ...options, expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata({ ...target, grade: '9' }) })).toBeNull();
  });

  it('does not mint missing transaction, economics, source, visual cohort, quantity, or restrictive rows', () => {
    for (const invalid of [
      { saleId: null, url: null }, { saleId: 'unknown', url: 'https://www.ebay.com/sch/search' },
      { currency: 'CAD' }, { currency: 'unknown' }, { date: null }, { date: '2027-01-01' }, { price: 0 }, { price: Infinity },
      { saleStatus: 'active' }, { saleStatus: 'unknown' }, { priceBasis: 'unknown' }, { priceBasis: 'realized' },
      { originMarketplace: 'mercari' }, { sourceId: 'goldin' }, { sourceAdapter: 'mercari' }, { visualRequirement: 'not_required' },
      { evidenceDisposition: 'context_only' }, { evidenceDisposition: 'warning_review' }, { evidenceReasons: ['retained blocker'] },
      { lotQuantity: 2 }, { saleForm: 'bundle' }, { saleForm: 'manual-only' },
    ]) expect(mint(approvalSale(invalid))).toBeNull();
  });

  it('verifies Video Games reciprocal PSA/WATA numeric labels but not other categories/graders', () => {
    const gameTarget = { title: 'Zelda', category: 'video_games', itemType: 'video_game', grade: '7.50', certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ gameTitle: 'Zelda', platform: 'NES', sealed: 'Yes' }) };
    const sale = approvalSale({ title: 'Zelda NES WATA 7.5 Sealed' });
    const handle = createServerFinalIdentityApproval({ sale, review: finalReview(), target: gameTarget, reviewedTarget: gameTarget,
      targetImageReference: imageReference, expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata(gameTarget), acquiredAt });
    expect(handle).not.toBeNull();
    const sealed = sealCanonicalObservation('sold_comps', sale, { identityApproval: handle, signingKey, acquiredAt });
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    if (!verified.verified) throw new Error('game fixture must verify');
    expect(getVerifiedIdentityApproval(verified.sale, { ...gameTarget, grade: '7.5', certificationCompany: 'WATA' }, imageReference)).not.toBeNull();
    expect(getVerifiedIdentityApproval(verified.sale, { ...gameTarget, certificationCompany: 'VGA' }, imageReference)).toBeNull();
    expect(getVerifiedIdentityApproval(verified.sale, { ...gameTarget, category: 'sports_cards' }, imageReference)).toBeNull();
  });

  it('detects approval/fact/hash/signature tampering and rejects malformed signed approval schemas/bindings', () => {
    const { sealed } = approved();
    const original = decode(sealed.provenanceToken!);
    for (const mutate of [
      (p: any) => { p.identityApproval.version = 'identity-approval-v2'; },
      (p: any) => { p.identityApproval.policyVersion = 'browser'; },
      (p: any) => { p.identityApproval.origin = 'browser'; },
      (p: any) => { p.identityApproval.verified = true; },
      (p: any) => { p.identityApproval.adapterVersion = '99'; },
      (p: any) => { p.identityApproval.originMarketplace = 'mercari'; },
      (p: any) => { p.identityApproval.sourceRecordId = 'neighbor'; },
      (p: any) => { p.identityApproval.canonicalTransactionId = 'record:other'; },
      (p: any) => { p.identityApproval.acquiredAt = '2026-09-28T11:00:00.000Z'; },
      (p: any) => { p.identityApproval.sourceFactsHash = 'bad'; },
      (p: any) => { p.identityApproval.targetFields.cardNumber = '139'; },
      (p: any) => { p.identityApproval.decidingEvidence.gradeMatches = false; },
      (p: any) => { p.identityApproval.decidingEvidence.browserConfirmed = true; },
      (p: any) => { p.identityApproval.visualDifferences = [null]; },
      (p: any) => { p.identityApproval = null; },
      (p: any) => { p.facts.price = 99999; },
      (p: any) => { p.provenance.canonicalTransactionId = 'record:other'; },
      (p: any) => { p.provenance.adapterVersion = '99'; },
      (p: any) => { p.provenance.policyVersion = 'old'; },
    ]) {
      const payload = JSON.parse(JSON.stringify(original)); mutate(payload);
      expect(verifyCanonicalObservation({ provenanceToken: resign(payload) }, { signingKey, now: acquiredAt }).verified).toBe(false);
    }
    const badHash = JSON.parse(JSON.stringify(original)); badHash.identityApproval.confidence = 'medium';
    expect(verifyCanonicalObservation({ provenanceToken: resign(badHash, false) }, { signingKey, now: acquiredAt }).verified).toBe(false);
    const [encoded, signature] = sealed.provenanceToken!.split('.');
    expect(verifyCanonicalObservation({ provenanceToken: `${encoded}.${signature.slice(0, -1)}${signature.endsWith('x') ? 'y' : 'x'}` }, { signingKey, now: acquiredAt }).verified).toBe(false);
    expect(verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: new Date(acquiredAt.getTime() - 1) }).verified).toBe(false);
    expect(verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: new Date(acquiredAt.getTime() + 21 * 60_000) }).verified).toBe(false);
  });

  it('keeps legacy match source-only and preserves a legitimate non-visual source-only token', () => {
    const required = sealCanonicalObservation('sold_comps', approvalSale(), { signingKey, acquiredAt });
    const verified = verifyCanonicalObservation({ provenanceToken: required.provenanceToken, identityApproval: { verified: true } }, { signingKey, now: acquiredAt });
    expect(verified.verified).toBe(true);
    expect(getVerifiedIdentityApproval(verified.sale, target, imageReference)).toBeNull();
    const nonVisual = sealCanonicalObservation('the_card_api', completedSale({ visualRequirement: 'not_required' }), { signingKey, acquiredAt });
    const trusted = verifyCanonicalObservation({ provenanceToken: nonVisual.provenanceToken }, { signingKey, now: acquiredAt });
    expect(trusted.verified).toBe(true);
    expect(trusted.sale.visualRequirement).toBe('not_required');
    expect(getVerifiedIdentityApproval(trusted.sale, target, imageReference)).toBeNull();
  });

  it('preserves unchanged mixed-case canonical URL reconstruction and bound normalization but rejects changed URLs', () => {
    const { sealed } = approved(approvalSale({ url: 'https://www.ebay.com/itm/Kobe-Bryant-PSA-10/123456789012' }));
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    if (!verified.verified) throw new Error('mixed-case source fixture must verify');
    expect(verified.sale.url).toBe('ebay.com/itm/Kobe-Bryant-PSA-10/123456789012');
    expect(getVerifiedIdentityApproval(verified.sale, target, imageReference)).not.toBeNull();
    const normalized = { ...verified.sale, evidenceReasons: ['economic normalization diagnostic'] };
    expect(transferVerifiedIdentityApproval(verified.sale, normalized)).toBe(true);
    expect(getVerifiedIdentityApproval(normalized, target, imageReference)).not.toBeNull();
    expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale, url: `https://${verified.sale.url}` })).toBe(true);
    expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale, url: 'ebay.com/itm/kobe-bryant-psa-10/123456789012' })).toBe(false);
    expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale, url: 'ebay.com/itm/Kobe-Bryant-PSA-10/999999999999' })).toBe(false);
    verified.sale.url = 'ebay.com/itm/Changed/123456789012';
    expect(getVerifiedIdentityApproval(verified.sale, target, imageReference)).toBeNull();
  });

  it('retains possible-duplicate authority with diagnostics, never exact/probable duplicate authority', () => {
    const { sealed } = approved();
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    if (!verified.verified) throw new Error('duplicate fixture must verify');
    const possible: MarketSale = { ...verified.sale, duplicateStatus: 'possible_duplicate', evidenceReasons: ['possible duplicate retained with warning'] };
    expect(transferVerifiedIdentityApproval(verified.sale, possible)).toBe(true);
    expect(getVerifiedIdentityApproval(possible, target, imageReference)).not.toBeNull();
    for (const duplicateStatus of ['exact_duplicate', 'probable_duplicate'] as const) {
      expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale, duplicateStatus })).toBe(false);
      possible.duplicateStatus = duplicateStatus;
      expect(getVerifiedIdentityApproval(possible, target, imageReference)).toBeNull();
    }
  });

  it('expires retained getter/transfer authority relative to the verified clock without refreshing on transfer', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-09T03:00:00Z'));
      const { sealed } = approved();
      const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: new Date(acquiredAt.getTime() + 10 * 60_000) });
      if (!verified.verified) throw new Error('synthetic verification-relative expiry fixture must verify');
      vi.advanceTimersByTime(9 * 60_000);
      const successor = { ...verified.sale };
      expect(transferVerifiedIdentityApproval(verified.sale, successor)).toBe(true);
      expect(getVerifiedIdentityApproval(successor, target, imageReference)).not.toBeNull();
      vi.advanceTimersByTime(2 * 60_000);
      expect(getVerifiedIdentityApproval(verified.sale, target, imageReference)).toBeNull();
      expect(getVerifiedIdentityApproval(successor, target, imageReference)).toBeNull();
      expect(transferVerifiedIdentityApproval(verified.sale, { ...verified.sale })).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it('keeps Coin independent confirmed adjudication mandatory even for an otherwise complete ordinary retry', () => {
    const coinTarget = { title: '1900 Dollar', category: 'coins', grade: '65', certificationCompany: 'PCGS',
      itemDetails: JSON.stringify({ denomination: 'Dollar', year: '1900', variety: 'Morgan' }) };
    const review = finalReview();
    const evidence = { ...gradingEvidence, dateMatches: true, varietyMatches: true, denominationMatches: true };
    review.visualEvidence = evidence;
    review.visualAudit = { ...review.visualAudit!, retryStatus: 'performed', finalPass: 'high_resolution_retry', retryVerdict: 'match',
      retryConfidence: 'high', retryRationale: 'Final identity, date, variety and grade confirmed.', finalEvidence: evidence };
    const options = { sale: approvalSale({ title: '1900 Morgan Dollar PCGS 65' }), review, target: coinTarget, reviewedTarget: coinTarget,
      targetImageReference: imageReference, expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata(coinTarget), acquiredAt };
    expect(createServerFinalIdentityApproval(options)).toBeNull();
    review.visualAudit.adjudicationStatus = 'confirmed';
    expect(createServerFinalIdentityApproval(options)).not.toBeNull();
    review.visualAudit.finalEvidence = { ...evidence, gradeMatches: false };
    expect(createServerFinalIdentityApproval(options)).toBeNull();
    review.visualAudit.finalEvidence = evidence;
    review.visualAudit.adjudicationStatus = 'unavailable';
    expect(createServerFinalIdentityApproval(options)).toBeNull();
  });

  it('binds genuine Disney pin images without fabricated slab facts despite conflicting stale grading declarations', () => {
    const pinTarget = { title: 'Mickey Sorcerer Pin', category: 'disney_pins', itemType: 'individual_pin', grade: '10', certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ pinName: 'Mickey Sorcerer', character: 'Mickey', grade: '9', gradingCompany: 'BGS', isGraded: 'Yes', gradedState: 'raw' }) };
    const pinEvidence = { characterMatches: true, artworkMatches: true, silhouetteMatches: true, identityMatches: true };
    const review = finalReview({ visualEvidence: pinEvidence });
    review.visualAudit = { ...review.visualAudit!, initialEvidence: pinEvidence, finalEvidence: pinEvidence };
    const sale = approvalSale({ title: 'Mickey Sorcerer Pin' });
    const handle = createServerFinalIdentityApproval({ sale, review, target: pinTarget, reviewedTarget: pinTarget,
      targetImageReference: imageReference, expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata(pinTarget), acquiredAt,
      candidateIdentityFields: { pinName: 'Mickey Sorcerer', gradingCompany: 'CGC', isGraded: 'No' } });
    expect(handle).not.toBeNull();
    const sealed = sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt, identityApproval: handle });
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    if (!verified.verified) throw new Error('genuine non-slab pin fixture must verify');
    expect(getVerifiedIdentityApproval(verified.sale, { ...pinTarget, grade: '1', certificationCompany: 'Unknown' }, imageReference)).not.toBeNull();
    expect(sealed.identityApproval?.targetFields.gradedState).toBeUndefined();
    expect(sealed.identityApproval?.decidingEvidence.slabVisible).toBeUndefined();
    review.visualAudit.finalEvidence = { ...pinEvidence, artworkMatches: false };
    expect(createServerFinalIdentityApproval({ sale, review, target: pinTarget, reviewedTarget: pinTarget,
      targetImageReference: imageReference, expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata(pinTarget), acquiredAt })).toBeNull();
  });

  it('treats generic Disney backing-card or packaging differences as soft visual evidence', () => {
    const pinTarget = { title: 'Cinderella Glitter Portrait Pin', category: 'disney_pins', itemType: 'individual_pin',
      itemDetails: JSON.stringify({ pinName: 'Cinderella Glitter Portrait', character: 'Cinderella' }) };
    const pinEvidence = { characterMatches: true, artworkMatches: true, silhouetteMatches: true, identityMatches: true,
      backingCardMatches: false, setDesignMatches: false };
    const review = finalReview({ visualEvidence: pinEvidence, visualDifferences: [
      { field: 'backing card / packaging', targetObservation: 'generic backing card', candidateObservation: 'different generic backing card', impact: 'material visual conflict' },
    ] });
    review.visualAudit = { ...review.visualAudit!, initialEvidence: pinEvidence, finalEvidence: pinEvidence };
    const sale = approvalSale({ title: 'Cinderella Glitter Portrait Pin' });
    expect(createServerFinalIdentityApproval({ sale, review, target: pinTarget, reviewedTarget: pinTarget,
      targetImageReference: imageReference, expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata(pinTarget), acquiredAt })).not.toBeNull();
  });

  it('holds changed comic distribution and actual restoration augmentation at the getter', () => {
    const comicTarget = { title: 'Amazing Spider-Man #300', category: 'comics', itemType: 'single_comic', grade: '9.8', certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'Amazing Spider-Man', issueNumber: '300', publisher: 'Marvel', distributionType: 'Direct' }) };
    const sale = approvalSale({ title: 'Amazing Spider-Man #300 CGC 9.8' });
    const handle = createServerFinalIdentityApproval({ sale, review: finalReview(), target: comicTarget, reviewedTarget: comicTarget,
      targetImageReference: imageReference, expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata(comicTarget), acquiredAt,
      candidateIdentityFields: { distribution: 'Direct' } });
    expect(handle).not.toBeNull();
    const sealed = sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt, identityApproval: handle });
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    if (!verified.verified) throw new Error('comic binding fixture must verify');
    expect(getVerifiedIdentityApproval(verified.sale, comicTarget, imageReference)).not.toBeNull();
    for (const changed of [{ distributionType: 'Newsstand' }, { labelNotation: 'Color touch' }, { restorationDetail: 'Color touch' }]) {
      expect(getVerifiedIdentityApproval(verified.sale, { ...comicTarget,
        itemDetails: JSON.stringify({ ...JSON.parse(comicTarget.itemDetails), ...changed }) }, imageReference)).toBeNull();
    }
  });

  it('signs actual partial provider identity facts, rejects known contradictions, and retains facts through verifier/transfer', () => {
    const sale = approvalSale({ title: 'Kobe Bryant' });
    const options = { sale, review: finalReview(), target, reviewedTarget: target, targetImageReference: imageReference,
      expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata(target), acquiredAt };
    for (const candidateIdentityFields of [{ gradingCompany: 'BGS', grade: '9' }, { grade: '9' }, { isGraded: 'No' },
      { player: 'Michael Jordan' }, { cardNumber: '139' }, { itemType: 'sealed_box' }, { lotQuantity: '2' }, { saleForm: 'manual-only' }]) {
      expect(createServerFinalIdentityApproval({ ...options, candidateIdentityFields })).toBeNull();
    }
    expect(createServerFinalIdentityApproval({ ...options, candidateIdentityFields: { player: 'Unknown' } })).not.toBeNull();
    const handle = createServerFinalIdentityApproval({ ...options, candidateIdentityFields: { player: 'Kobe Bryant', gradingCompany: 'PSA', grade: '10.00', year: '1997' } });
    expect(handle).not.toBeNull();
    const sealed = sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt, identityApproval: handle });
    expect(sealed.identityApproval?.candidateIdentityFields).toEqual({ player: 'kobe bryant', certificationCompany: 'PSA', grade: '10', gradedState: 'graded', year: '1997' });
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken,
      normalizedStructuredMetadata: { player: 'Michael Jordan' } } as MarketSale, { signingKey, now: acquiredAt });
    if (!verified.verified) throw new Error('actual provider facts must verify');
    const structuredSale = verified.sale as MarketSale & { normalizedStructuredMetadata?: Record<string, string> };
    expect(structuredSale.normalizedStructuredMetadata).toEqual(sealed.identityApproval?.candidateIdentityFields);
    expect(Object.isFrozen(structuredSale.normalizedStructuredMetadata)).toBe(true);
    const successor = { ...structuredSale };
    expect(transferVerifiedIdentityApproval(structuredSale, successor)).toBe(true);
    expect(getVerifiedIdentityApproval(successor, target, imageReference)).not.toBeNull();
    successor.normalizedStructuredMetadata = { ...successor.normalizedStructuredMetadata, player: 'Michael Jordan' };
    expect(getVerifiedIdentityApproval(successor, target, imageReference)).toBeNull();
    expect(transferVerifiedIdentityApproval(structuredSale, { ...structuredSale, normalizedStructuredMetadata: undefined })).toBe(false);
    const original = decode(sealed.provenanceToken!);
    for (const value of [null, { player: 'Michael Jordan' }, { grade: 10 }, { title: 'Kobe Bryant' }, { browserApproved: 'yes' }, { grade: '10.00', gradedState: 'graded' }]) {
      const payload = JSON.parse(JSON.stringify(original)); payload.identityApproval.candidateIdentityFields = value;
      expect(verifyCanonicalObservation({ provenanceToken: resign(payload) }, { signingKey, now: acquiredAt }).verified).toBe(false);
    }
    const badHash = JSON.parse(JSON.stringify(original)); badHash.identityApproval.candidateIdentityFields.year = '1998';
    expect(verifyCanonicalObservation({ provenanceToken: resign(badHash, false) }, { signingKey, now: acquiredAt }).verified).toBe(false);
    Object.assign(sale, { normalizedStructuredMetadata: { grade: '9', gradingCompany: 'BGS' } });
    expect(sealCanonicalObservation('sold_comps', sale, { signingKey, acquiredAt, identityApproval: handle }).identityApproval).toBeUndefined();
  });

  it('requires actual candidate game/platform/form facts while retaining reciprocal identical numeric graders', () => {
    const gameTarget = { title: 'Zelda', category: 'video_games', itemType: 'video_game', grade: '7.50', certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ gameTitle: 'Zelda', platform: 'NES', sealed: 'Yes' }) };
    const options = { sale: approvalSale({ title: 'Zelda WATA 7.5 Sealed' }), review: finalReview(), target: gameTarget, reviewedTarget: gameTarget,
      targetImageReference: imageReference, expectedImageReference: imageReference, targetMetadata: buildVisualTargetMetadata(gameTarget), acquiredAt };
    expect(createServerFinalIdentityApproval({ ...options, candidateIdentityFields: { gradingCompany: 'WATA', grade: '7.5', labelDesignation: 'A++', player: 'Kobe Bryant' } })).not.toBeNull();
    for (const candidateIdentityFields of [{ gameTitle: 'Mario' }, { platform: 'SNES' }, { grade: '7.4' }, { gradingCompany: 'VGA' },
      { saleForm: 'complete_in_box' }, { sealed: 'No' }, { productForm: 'manual only' }]) {
      expect(createServerFinalIdentityApproval({ ...options, candidateIdentityFields })).toBeNull();
    }
    expect(createServerFinalIdentityApproval({ ...options, sale: { ...options.sale, saleForm: 'complete_in_box' } })).toBeNull();
    const qualified = { ...gameTarget, itemDetails: JSON.stringify({ ...JSON.parse(gameTarget.itemDetails), gradeQualifier: 'Qualified' }) };
    expect(createServerFinalIdentityApproval({ ...options, target: qualified, reviewedTarget: qualified,
      targetMetadata: buildVisualTargetMetadata(qualified), candidateIdentityFields: { gradeQualifier: 'Altered' } })).toBeNull();
  });
});

describe('approval-absent canonical 2.9.0 byte compatibility', () => {
  it('matches the fixed pre-Stage-3 guide-domain serialization, hash and HMAC seed', () => {
    // Literal legacy bytes, not a reimplementation of the new serializer.
    const factsJson = '{"title":"Test AI coin-guide signing domain v1 (not a sale)","price":null,"currency":"USD","date":null,"sourceRecordId":null,"canonicalUrl":null,"originMarketplace":"comic_book_realm","saleStatus":"unknown","completedStatusBasis":"Aggregated CGC guide estimate; never an individual completed sale","priceBasis":"unknown","visualRequirement":"not_required","visualReviewStatus":"not_reviewed","visualReviewRationale":null,"evidenceDisposition":null,"evidenceReasons":[],"buyerPremium":"unknown","shipping":"unknown","tax":"unknown","saleForm":null,"lotQuantity":null,"validationErrors":["provider record is missing a positive realized price","provider record is missing a valid sale date","provider record is missing both a provider record ID and canonical URL"]}';
    const hash = createHash('sha256').update(`{"adapterId":"comic_book_realm","facts":${factsJson},"acquiredAt":"1970-01-01T00:00:00.000Z"}`).digest('hex');
    const queryHash = createHash('sha256').update('coin-guide-v1').digest('hex');
    const legacyPayload = `{"version":"2.9.0","provenance":{"version":"2.9.0","policyVersion":"2.9.0","adapterId":"comic_book_realm","adapterVersion":"1.0.0","originMarketplace":"comic_book_realm","acquiredAt":"1970-01-01T00:00:00.000Z","queryFingerprint":"${queryHash}","payloadHash":"${hash}","canonicalTransactionId":null},"facts":${factsJson}}`;
    const encoded = Buffer.from(legacyPayload).toString('base64url');
    const domainKey = createHmac('sha256', signingKey).update(encoded).digest('base64url');
    const sealed = sealCanonicalObservation('comic_book_realm', {
      title: 'Test AI coin-guide signing domain v1 (not a sale)', currency: 'USD', saleStatus: 'unknown', priceBasis: 'unknown',
    }, { signingKey, acquiredAt: new Date(0), query: 'coin-guide-v1' });
    expect(sealed.provenanceToken).toBe(`${encoded}.${domainKey}`);
    expect(sealed.provenance?.payloadHash).toBe(hash);
    expect(Object.prototype.hasOwnProperty.call(sealed, 'identityApproval')).toBe(false);
    expect(Buffer.from(sealed.provenanceToken!.split('.')[0], 'base64url').toString('utf8')).toBe(legacyPayload);
    expect(createHmac('sha256', sealed.provenanceToken!.split('.')[1]).update('coin-guide-v1:fixed-synthetic-payload').digest('base64url'))
      .toBe(createHmac('sha256', domainKey).update('coin-guide-v1:fixed-synthetic-payload').digest('base64url'));
  });
});
