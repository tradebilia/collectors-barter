import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildApprovalTargetImageInput,
  buildApprovalTargetInput,
  buildEffectiveApprovalTarget,
  buildSoldCompsAnalysisSales,
  buildSoldCompsApprovalInput,
  normalizeApprovalTargetImageReference,
  normalizeVisualTargetImageReference,
  resolveApprovalTargetImageReference,
} from '../shared/testAiSoldCompsTransport';

const photo = 'https://synthetic.invalid/target-primary.jpg';
const target = {
  title: '1996 Kobe Bryant Topps #138 PSA 7',
  category: 'Sports Cards',
  itemType: 'single_card',
  grade: '7',
  condition: 'Graded',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ player: 'Kobe Bryant', manufacturer: 'Topps', cardNumber: '138', year: '1996' }),
  primaryPhotoUrl: photo,
};
const listing = {
  title: '1996 Kobe Bryant PSA 7',
  price: 120,
  currency: 'USD',
  endedAt: '2026-11-01T00:00:00Z',
  saleId: 'synthetic-transaction-a',
  itemUrl: 'https://synthetic.invalid/sold/a',
  itemWebUrl: 'https://synthetic.invalid/provider/a',
  sourceId: 'sold_comps',
  sourceAdapter: 'sold_comps',
  sourceLabel: 'eBay Sold-Comps',
  marketplace: 'eBay Sold-Comps',
  originMarketplace: 'ebay',
  saleStatus: 'completed' as const,
  completedStatusBasis: 'Sold-Comps completed-sale endpoint',
  priceBasis: 'sold' as const,
  visualRequirement: 'required' as const,
  visualReviewStatus: 'match' as const,
  visualReviewRationale: 'Synthetic deciding confirmation.',
  evidenceDisposition: 'valuation_eligible' as const,
  evidenceReasons: ['Synthetic source-owned annotation.'],
  buyerPremium: 'included' as const,
  shipping: 'excluded' as const,
  tax: 'unknown' as const,
  saleForm: 'single',
  lotQuantity: 1,
  provenanceToken: 'FAKE-TRANSPORT-TOKEN-A.NOT-A-SIGNATURE',
  provenance: { adapterId: 'sold_comps', payloadHash: 'fake-payload-a', acquiredAt: '2026-11-08T23:00:00Z' },
  identityApproval: { version: 'identity-approval-v1', sourceRecordId: 'synthetic-transaction-a', match: 'match', decidingPass: 'synthetic-final' },
  visualEvidence: { grade: '7', gradingCompany: 'PSA', cardNumber: '138' },
  visualAudit: { finalResult: 'match', requiredConfirmationCompleted: true, evidence: { labelReadable: true } },
  visualDifferences: [{ field: 'title.cardNumber', targetObservation: '138', candidateObservation: 'not in title', impact: 'diagnostic' }],
  metadataFieldComparisons: [{ targetField: 'player', targetValue: 'Kobe Bryant', candidateField: 'player', candidateValue: 'Kobe Bryant', status: 'match' }],
  metadataMatchScore: 80,
  metadataMatchRank: 2,
  metadataMatchReasons: ['Synthetic player alignment.'],
  displayRank: 3,
  soldCompsMetadata: { player: 'Kobe Bryant', cardNumber: '138', manufacturer: 'Topps' },
  retrievalQuery: 'synthetic-query',
  validationErrors: [],
  providerExtension: { arbitrarySuppliedFact: 'keep me' },
};

describe('Stage 3 actual shared Sold-Comps transport', () => {
  it('normalizes A and B identically while preserving every supplied field and token', () => {
    const data = { listings: [listing] };
    const itemA = buildSoldCompsAnalysisSales(data, true);
    const itemB = buildSoldCompsAnalysisSales(data, true);
    expect(itemA).toStrictEqual(itemB);
    expect(itemA[0]).toStrictEqual({ ...listing, date: listing.endedAt, url: listing.itemUrl });
    for (const [field, value] of Object.entries(listing)) {
      expect(itemA[0][field]).toStrictEqual(value);
      expect(itemB[0][field]).toStrictEqual(value);
    }
    expect(itemA[0]).not.toBe(listing);
    expect(itemA[0].identityApproval).toBe(listing.identityApproval);
    expect(itemA[0].visualAudit).toBe(listing.visualAudit);
    expect(itemA[0]).not.toHaveProperty('verified');
    expect(itemA[0]).not.toHaveProperty('trusted');
    expect(listing).not.toHaveProperty('date');
    expect(listing).not.toHaveProperty('url');
  });

  it('returns empty groups for blank, missing and disabled cached source data', () => {
    expect(buildSoldCompsAnalysisSales(undefined, true)).toEqual([]);
    expect(buildSoldCompsAnalysisSales(null, true)).toEqual([]);
    expect(buildSoldCompsAnalysisSales({}, true)).toEqual([]);
    expect(buildSoldCompsAnalysisSales({ listings: null }, true)).toEqual([]);
    expect(buildSoldCompsAnalysisSales({ listings: [] }, true)).toEqual([]);
    expect(buildSoldCompsAnalysisSales({ listings: [listing] }, false)).toEqual([]);
    const cached = { listings: [listing] };
    buildSoldCompsAnalysisSales(cached, true);
    expect(buildSoldCompsAnalysisSales(cached, false)).toEqual([]);
    expect(buildSoldCompsAnalysisSales(cached, true)[0].provenanceToken).toBe(listing.provenanceToken);
  });

  it('keeps stable IDs, URLs, deciding evidence and approvals attached to their own equal-title records after reordering', () => {
    const second = {
      ...listing,
      saleId: 'synthetic-transaction-b',
      itemUrl: 'https://synthetic.invalid/sold/b',
      provenanceToken: 'FAKE-TRANSPORT-TOKEN-B.NOT-A-SIGNATURE',
      identityApproval: { ...listing.identityApproval, sourceRecordId: 'synthetic-transaction-b' },
      visualAudit: { ...listing.visualAudit, evidence: { labelReadable: false } },
      metadataMatchRank: 1,
      displayRank: 1,
    };
    const original = buildSoldCompsAnalysisSales({ listings: [listing, second] }, true);
    const reordered = buildSoldCompsAnalysisSales({ listings: [second, listing] }, true);
    expect(reordered.map((sale) => sale.saleId)).toEqual([second.saleId, listing.saleId]);
    expect(reordered).toStrictEqual([original[1], original[0]]);
    expect(reordered[0].identityApproval.sourceRecordId).toBe(second.saleId);
    expect(reordered[0].provenanceToken).toBe(second.provenanceToken);
    expect(reordered[0].url).toBe(second.itemUrl);
    expect(reordered[1].visualAudit).toStrictEqual(listing.visualAudit);
  });

  it('fills only absent aliases without replacing explicit canonical facts, nulls or unknowns', () => {
    const supplied = {
      ...listing,
      date: null,
      url: null,
      saleId: null,
      sourceId: null,
      sourceLabel: null,
      marketplace: null,
      currency: null,
      saleStatus: 'unknown',
      priceBasis: 'unknown',
      visualRequirement: null,
      visualReviewStatus: 'not_reviewed',
      evidenceDisposition: 'context_only',
      saleForm: 'lot',
      lotQuantity: 2,
    };
    expect(buildSoldCompsAnalysisSales({ listings: [supplied] }, true)[0]).toStrictEqual(supplied);
    const conflictingAliases = { ...listing, date: '2026-10-15', url: 'https://synthetic.invalid/canonical', saleId: 'canonical-a' };
    expect(buildSoldCompsAnalysisSales({ listings: [conflictingAliases] }, true)[0]).toStrictEqual(conflictingAliases);
  });

  it('preserves restrictive economics and full supplied audit reasons without coercion or truncation', () => {
    const supplied = {
      ...listing,
      price: 'not-a-price',
      currency: 'CAD',
      endedAt: 'not-a-date',
      saleStatus: 'active',
      priceBasis: 'unknown',
      evidenceDisposition: 'warning_review',
      evidenceReasons: Array.from({ length: 25 }, (_, index) => `Synthetic reason ${index}`),
      visualReviewStatus: 'mismatch',
      saleForm: 'lot',
      lotQuantity: 3,
    };
    const projected = buildSoldCompsAnalysisSales({ listings: [supplied] }, true)[0];
    expect(projected).toStrictEqual({ ...supplied, date: supplied.endedAt, url: supplied.itemUrl });
    expect(projected.evidenceReasons).toHaveLength(25);
    expect(projected.evidenceReasons).toBe(supplied.evidenceReasons);
  });

  it('does not fabricate missing currency, completion, approval, visual, price, date, quantity or form', () => {
    const projected = buildSoldCompsAnalysisSales({ listings: [{ title: 'Unreviewed synthetic record' }] }, true)[0];
    expect(projected).toStrictEqual({ title: 'Unreviewed synthetic record', sourceId: 'sold_comps', sourceLabel: 'eBay Sold-Comps', marketplace: 'eBay Sold-Comps' });
    for (const field of ['price', 'currency', 'saleStatus', 'priceBasis', 'completedStatusBasis', 'visualRequirement', 'visualReviewStatus', 'identityApproval', 'provenanceToken', 'date', 'saleId', 'url', 'saleForm', 'lotQuantity', 'buyerPremium', 'shipping', 'tax']) {
      expect(projected).not.toHaveProperty(field);
    }
  });

  it('maps provider identifiers and date/URL aliases without using title, rank or row index as identity', () => {
    const rows = [
      { title: 'Same title', sourceRecordId: 'record-id', itemUrl: 'https://synthetic.invalid/record' },
      { title: 'Same title', itemId: 'item-id', itemWebUrl: 'https://synthetic.invalid/item' },
      { title: 'Same title', lotId: 'lot-id', endedAt: '2026-11-01' },
      { title: 'Same title', id: 'provider-id' },
      { title: 'Same title', itemWebUrl: 'https://synthetic.invalid/url-only' },
    ];
    const projected = buildSoldCompsAnalysisSales({ listings: rows }, true);
    expect(projected.map((row) => row.saleId)).toEqual(['record-id', 'item-id', 'lot-id', 'provider-id', rows[4].itemWebUrl]);
    expect(projected[1].url).toBe(rows[1].itemWebUrl);
    expect(projected[2].date).toBe(rows[2].endedAt);
    expect(projected.map((row) => row.title)).toEqual(rows.map((row) => row.title));
  });

  it('does not cap or reorder the individual source; the existing balanced page handoff owns the 120 limit', () => {
    const rows = Array.from({ length: 125 }, (_, index) => ({ ...listing, saleId: `synthetic-${index}`, metadataMatchRank: 125 - index }));
    const projected = buildSoldCompsAnalysisSales({ listings: rows }, true);
    expect(projected).toHaveLength(125);
    expect(projected.map((row) => row.saleId)).toEqual(rows.map((row) => row.saleId));
  });

  it('does not turn serialized browser approval flags into a new authority field', () => {
    const injected = { ...listing, identityApproval: { ...listing.identityApproval, verified: true }, browserStatus: 'approved' };
    const projected = buildSoldCompsAnalysisSales({ listings: [injected] }, true)[0];
    expect(projected.identityApproval).toStrictEqual(injected.identityApproval);
    expect(projected.provenanceToken).toBe(listing.provenanceToken);
    expect(projected).not.toHaveProperty('verified');
    expect(projected).not.toHaveProperty('trustedIdentityApproval');
  });
});

describe('Stage 3 actual client target and image binding inputs', () => {
  it('uses one effective target contract for every source and strips browser-only fields', () => {
    const search = { ...target, title: 'search wording', estimatedValue: 99, primaryPhotoUrl: photo };
    const effective = { ...target, title: 'inventory wording', trusted: true, primaryPhotoUrl: 'https://synthetic.invalid/other.jpg' };
    expect(buildEffectiveApprovalTarget(search, effective)).toStrictEqual(buildApprovalTargetInput(effective));
    expect(buildEffectiveApprovalTarget(search)).toStrictEqual(buildApprovalTargetInput(search));
    expect(buildEffectiveApprovalTarget(search, effective)).not.toHaveProperty('estimatedValue');
    expect(buildEffectiveApprovalTarget(search, effective)).not.toHaveProperty('primaryPhotoUrl');
  });

  it('keeps visual review and final approval image bindings distinct and rejects unsafe references', () => {
    const changed = 'https://synthetic.invalid/bound-primary.jpg';
    expect(resolveApprovalTargetImageReference({ imageUrl: photo, approvalTargetImageReference: changed })).toBe(changed);
    expect(resolveApprovalTargetImageReference({ imageUrl: photo })).toBe(photo);
    expect(normalizeApprovalTargetImageReference({ imageUrl: photo, approvalTargetImageReference: changed })).toBe(changed);
    expect(normalizeApprovalTargetImageReference({ imageUrl: photo, approvalTargetImageReference: undefined })).toBe(photo);
    expect(normalizeVisualTargetImageReference({ imageUrl: photo })).toBe(photo);
    expect(normalizeVisualTargetImageReference({ imageUrl: changed })).toBe(changed);
    expect(normalizeApprovalTargetImageReference({ imageUrl: photo, approvalTargetImageReference: 'javascript:alert(1)' })).toBeNull();
    expect(normalizeApprovalTargetImageReference({ imageUrl: 'not-a-url' })).toBeNull();
  });

  it('copies only the exact declared final target fields, retaining qualifiers and original details', () => {
    const supplied = { ...target, grade: '7.50', condition: 'Sealed', estimatedValue: 999_999, trusted: true, verified: true, identityApproval: { match: 'match' }, certId: 'synthetic-tracking-only' };
    expect(buildApprovalTargetInput(supplied)).toStrictEqual({
      title: supplied.title, category: supplied.category, itemType: supplied.itemType,
      grade: '7.50', condition: 'Sealed', certificationCompany: 'PSA', itemDetails: supplied.itemDetails,
    });
    expect(buildApprovalTargetInput({ title: 'Minimal', category: 'Video Games' })).toStrictEqual({
      title: 'Minimal', category: 'Video Games', itemType: undefined, grade: undefined,
      condition: undefined, certificationCompany: undefined, itemDetails: undefined,
    });
  });

  it('preserves existing query parameters/image selection while binding a distinct PCGS-augmented effective target', () => {
    const searchItem = { title: 'PCGS Cert #synthetic', category: 'coins', grade: 'MS65', itemType: 'single_coin', condition: 'Graded', certificationCompany: 'PCGS', itemDetails: '{}' };
    const effective = { ...searchItem, title: '1903-S Morgan Dollar PCGS MS65', itemDetails: JSON.stringify({ year: '1903', mintMark: 'S', denomination: '$1', variety: 'Morgan Dollar' }), primaryPhotoUrl: photo };
    const existingQuery = { ...searchItem, statedTradeValue: 1250, imageUrl: photo, visualProvider: 'manus_forge' as const };
    const query = buildSoldCompsApprovalInput(existingQuery, effective);
    const { approvalTarget, approvalTargetImageReference, ...unchangedQuery } = query;
    expect(unchangedQuery).toStrictEqual(existingQuery);
    expect(approvalTarget).toStrictEqual(buildApprovalTargetInput(effective));
    expect(approvalTarget.title).not.toBe(existingQuery.title);
    expect(approvalTarget.itemDetails).toBe(effective.itemDetails);
    expect(approvalTargetImageReference).toBe(existingQuery.imageUrl);
    expect(approvalTarget).not.toHaveProperty('estimatedValue');
    expect(approvalTarget).not.toHaveProperty('primaryPhotoUrl');
    expect(existingQuery).not.toHaveProperty('approvalTarget');
  });

  it('always binds the effective primary picture independently of final image analysis and notices changed/missing references', () => {
    const source = buildSoldCompsApprovalInput({ title: target.title, category: target.category, imageUrl: photo }, target);
    const enabled = buildApprovalTargetImageInput(target, true);
    const disabled = buildApprovalTargetImageInput(target, false);
    expect(enabled).toStrictEqual({ imageUrl: photo, approvalTargetImageReference: photo });
    expect(disabled).toStrictEqual({ imageUrl: undefined, approvalTargetImageReference: photo });
    expect(disabled.approvalTargetImageReference).toBe(source.approvalTargetImageReference);
    const changed = buildApprovalTargetImageInput({ primaryPhotoUrl: 'https://synthetic.invalid/new-primary.jpg' }, false);
    expect(changed.approvalTargetImageReference).not.toBe(source.approvalTargetImageReference);
    expect(buildApprovalTargetImageInput({}, false)).toStrictEqual({ imageUrl: undefined, approvalTargetImageReference: undefined });
    expect(buildSoldCompsApprovalInput({ title: target.title, category: target.category, imageUrl: undefined }, target).approvalTargetImageReference).toBeUndefined();
  });

  it('keeps Item A and Item B binding inputs separate even with identical search titles', () => {
    const query = { title: 'Shared search title', category: target.category, imageUrl: photo };
    const itemA = buildSoldCompsApprovalInput(query, target);
    const otherTarget = { ...target, title: '1996 Allen Iverson Topps #171 PSA 7', itemDetails: JSON.stringify({ player: 'Allen Iverson', cardNumber: '171' }), primaryPhotoUrl: 'https://synthetic.invalid/item-b.jpg' };
    const itemB = buildSoldCompsApprovalInput({ ...query, imageUrl: otherTarget.primaryPhotoUrl }, otherTarget);
    expect(itemA.title).toBe(itemB.title);
    expect(itemA.approvalTarget).not.toStrictEqual(itemB.approvalTarget);
    expect(itemA.approvalTargetImageReference).not.toBe(itemB.approvalTargetImageReference);
  });
});

describe('Stage 3 narrow actual page wiring guards', () => {
  const page = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');

  it('calls the tested lossless projection in both eBay positions before Mercari and leaves the generic normalizer for other adapters', () => {
    expect(page).toContain('buildSoldCompsAnalysisSales(leftSoldCompsData, leftHasSoldComps),\n      buildMercariAnalysisSales(leftMercariSoldCompsData, leftHasMercari)');
    expect(page).toContain('buildSoldCompsAnalysisSales(rightSoldCompsData, rightHasSoldComps),\n      buildMercariAnalysisSales(rightMercariSoldCompsData, rightHasMercari)');
    expect(page).toContain('const normalizeComparableSale = (sale: any, defaults:');
    expect(page).toContain('for (let index = 0; balanced.length < 120; index += 1)');
    expect(page).toContain('if (candidate && balanced.length < 120)');
    expect(page).not.toContain('currency: sale.currency ?? \'USD\', date: sale.endedAt, marketplace: \'eBay Sold-Comps\'');
  });

  it('calls the tested binding builders in both source requests and both final items without changing the effective-item props', () => {
    expect(page).toContain('leftSearchItem ? buildSoldCompsApprovalInput(');
    expect(page).toContain('rightSearchItem ? buildSoldCompsApprovalInput(');
    expect(page).toContain('}, effectiveLeftItem ?? leftSearchItem)');
    expect(page).toContain('}, effectiveRightItem ?? rightSearchItem)');
    expect(page).toContain('...buildApprovalTargetImageInput(effectiveLeftItem, useImageAnalyzer)');
    expect(page).toContain('...buildApprovalTargetImageInput(effectiveRightItem, useImageAnalyzer)');
    expect(page).toContain('leftAnalysisItem={leftSearchItem}');
    expect(page).toContain('rightAnalysisItem={rightSearchItem}');
    expect(page).toContain('imageUrl: leftItem?.primaryPhotoUrl ?? leftSearchItem.primaryPhotoUrl');
    expect(page).toContain('imageUrl: rightItem?.primaryPhotoUrl ?? rightSearchItem.primaryPhotoUrl');
  });
});
