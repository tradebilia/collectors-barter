import { describe, expect, it } from 'vitest';
import type { ComparableTarget } from './testAiComparableEngine';
import { guideAnchorFields, normalizeGuideGrade, normalizeTestAiEvidence, selectPreferredGuideAnchor, type GuideValueAnchor } from '../shared/testAiEvidenceNormalization';
import { sealCanonicalObservation, verifyCanonicalObservation } from './testAiCanonicalObservation';
import { GUIDE_TOKEN_MAX_AGE_MS, isVerifiedGuideAnchor, issueGuideAnchor, numistaCoinGuideQuote, priceChartingCoinGuideQuote, verifyGuideAnchors, type GuideAcquisition } from './testAiGuideEvidence';
import type { NumistaLookup } from './numistaMetadata';

const NOW = new Date('2026-11-08T20:00:00.000Z');
const OPTIONS = { signingKey: 'synthetic-stage2-guide-key-never-production', now: NOW };
const DETAILS = { country: 'United States', denomination: '$1', year: '1903', mintMark: 'S', variety: 'Morgan Dollar' };
const TARGET: ComparableTarget = { title: '1903-S Morgan Dollar', category: 'coins', itemType: 'single_coin', grade: 'MS65', certificationCompany: 'PCGS', itemDetails: JSON.stringify(DETAILS) };
const BASE: GuideValueAnchor = { sourceId: 'pricecharting', sourceLabel: 'PriceCharting Coin Guide', grade: 'MS65', selectedGrade: 'MS65', matchType: 'exact', value: 1250, recordedSales: null, lastSaleDate: null, totalRecordedSales: null };
const ACQUISITION: GuideAcquisition = { sourceId: 'pricecharting', sourceQuery: '1903 S Morgan Dollar', sourceRecordId: 'https://pricecharting.com/coin/1903-s-morgan-dollar', currency: 'USD', providerIdentity: { title: '1903-S Morgan Dollar', country: 'United States', denomination: '1 Dollar', year: '1903', mintMark: 'S', variety: 'Morgan Dollar', form: 'single_coin' } };
function issue(anchor = BASE, target = TARGET, acquisition = ACQUISITION): GuideValueAnchor {
  const result = issueGuideAnchor(anchor, target, acquisition, OPTIONS);
  expect(result.warnings).toEqual([]);
  expect(result.guideAnchor).not.toBeNull();
  return result.guideAnchor!;
}
function wire(anchor: GuideValueAnchor): GuideValueAnchor { return JSON.parse(JSON.stringify(anchor)) as GuideValueAnchor; }
function changedTarget(details: Record<string, unknown>): ComparableTarget { return { ...TARGET, itemDetails: JSON.stringify({ ...DETAILS, ...details }) }; }

describe('server-only Coin guide provenance', () => {
  it('does not warn or resolve signing configuration when no guide observations exist', () => {
    expect(verifyGuideAnchors([], { title: 'Card', category: 'sports_cards' }, { now: NOW, signingKey: '' })).toEqual({ trustedAnchors: [], warnings: [] });
    expect(guideAnchorFields(null)).toEqual({});
  });

  it('round-trips authenticated exact PriceCharting and documented Numista USD guides without inventing sales', () => {
    const pc = issue();
    const numista = issue({ ...BASE, sourceId: 'numista', grade: 'UNC', matchType: 'mapped', value: 430 }, TARGET, { ...ACQUISITION, sourceId: 'numista' });
    expect(Object.isFrozen(pc)).toBe(true);
    expect(isVerifiedGuideAnchor(pc, TARGET, NOW)).toBe(true);
    expect(isVerifiedGuideAnchor(wire(pc), TARGET, NOW)).toBe(false);
    const verified = verifyGuideAnchors([wire(numista), wire(pc)], TARGET, OPTIONS);
    expect(verified.warnings).toEqual([]);
    expect(verified.trustedAnchors).toHaveLength(2);
    expect(selectPreferredGuideAnchor(verified.trustedAnchors)?.sourceId).toBe('pricecharting');
    expect(verified.trustedAnchors.every((anchor) => isVerifiedGuideAnchor(anchor, TARGET, NOW))).toBe(true);
    expect(verified.trustedAnchors.every((anchor) => anchor.recordedSales === null && anchor.lastSaleDate === null)).toBe(true);
  });

  it.each([
    ['source', { sourceId: 'numista' }], ['amount', { value: 1_000_000 }],
    ['currency', { currency: 'EUR' }], ['grade', { grade: 'MS64' }],
    ['selected grade', { selectedGrade: 'MS65+' }], ['form', { form: 'coin_set' }],
    ['retrieval', { retrievedAt: '2026-11-08T19:59:00Z' }], ['expiry', { expiresAt: '2030-01-01T00:00:00Z' }],
    ['source query', { sourceQuery: 'different coin' }], ['record identity', { sourceRecordId: 'different-record' }],
    ['label', { sourceLabel: 'Comic Book Realm' }], ['recorded-sales count', { recordedSales: 100 }],
  ])('rejects browser alteration of %s', (_label, fields) => {
    const result = verifyGuideAnchors([{ ...wire(issue()), ...fields }], TARGET, OPTIONS);
    expect(result.trustedAnchors).toEqual([]);
    expect(result.warnings.join(' ')).toContain('altered');
  });

  it.each([
    ['category', { ...TARGET, category: 'pokemon' }],
    ['grade', { ...TARGET, grade: 'MS64' }], ['meaningful plus', { ...TARGET, grade: 'MS65+' }],
    ['grader', { ...TARGET, certificationCompany: 'NGC' }], ['title', { ...TARGET, title: 'Different coin' }],
    ['form', { ...TARGET, itemType: 'coin_set' }], ['country', changedTarget({ country: 'Mexico' })],
    ['year', changedTarget({ year: '1904' })], ['mint', changedTarget({ mintMark: 'O' })],
    ['denomination', changedTarget({ denomination: '1 Dime' })], ['variety', changedTarget({ variety: 'Peace Dollar' })],
    ['strike', changedTarget({ strike: 'proof' })], ['designation', changedTarget({ designation: 'DMPL' })],
  ])('rejects stale proof reused for a different target %s', (_label, target) => {
    const anchor = issue();
    expect(verifyGuideAnchors([wire(anchor)], target, OPTIONS).trustedAnchors).toEqual([]);
    expect(isVerifiedGuideAnchor(anchor, target, NOW)).toBe(false);
  });

  it('expires at the exact TTL boundary and rejects future acquisition', () => {
    const anchor = issue();
    const expiry = new Date(NOW.getTime() + GUIDE_TOKEN_MAX_AGE_MS);
    expect(verifyGuideAnchors([wire(anchor)], TARGET, { ...OPTIONS, now: new Date(expiry.getTime() - 1) }).trustedAnchors).toHaveLength(1);
    expect(verifyGuideAnchors([wire(anchor)], TARGET, { ...OPTIONS, now: expiry }).trustedAnchors).toEqual([]);
    expect(isVerifiedGuideAnchor(anchor, TARGET, expiry)).toBe(false);
    expect(issueGuideAnchor(BASE, TARGET, { ...ACQUISITION, acquiredAt: new Date(NOW.getTime() + 1) }, OPTIONS).guideAnchor).toBeNull();
  });

  it('rejects missing proof, Boolean trust, other keys, corrupted payloads and canonical sale-token confusion', () => {
    expect(verifyGuideAnchors([{ ...BASE, trusted: true } as GuideValueAnchor], TARGET, OPTIONS).trustedAnchors).toEqual([]);
    const anchor = wire(issue());
    expect(verifyGuideAnchors([anchor], TARGET, { ...OPTIONS, signingKey: 'wrong-synthetic-key' }).trustedAnchors).toEqual([]);
    expect(verifyGuideAnchors([anchor], TARGET, { ...OPTIONS, signingKey: '' }).trustedAnchors).toEqual([]);
    const payload = anchor.provenanceToken!.split('.')[0];
    anchor.provenanceToken = `${payload.slice(0, -1)}x.${anchor.provenanceToken!.split('.')[1]}`;
    expect(verifyGuideAnchors([anchor], TARGET, OPTIONS).trustedAnchors).toEqual([]);
    const saleProof = sealCanonicalObservation('pcgs_auction_results', { title: TARGET.title, price: 1250, currency: 'USD', date: NOW.toISOString(), saleId: 'synthetic-sale', saleStatus: 'completed', priceBasis: 'realized' }, { signingKey: OPTIONS.signingKey, acquiredAt: NOW });
    expect(verifyGuideAnchors([{ ...BASE, provenanceToken: saleProof.provenanceToken }], TARGET, OPTIONS).trustedAnchors).toEqual([]);
    expect(verifyCanonicalObservation({ title: TARGET.title, price: 1250, provenanceToken: issue().provenanceToken }, OPTIONS).verified).toBe(false);
  });

  it.each([
    ['context source', { ...BASE, sourceId: 'comic_book_realm' }, TARGET, ACQUISITION],
    ['wrong acquisition source', BASE, TARGET, { ...ACQUISITION, sourceId: 'numista' }],
    ['wrong category', BASE, { ...TARGET, category: 'comics' }, ACQUISITION],
    ['negative price', { ...BASE, value: -1 }, TARGET, ACQUISITION],
    ['nonfinite price', { ...BASE, value: Number.POSITIVE_INFINITY }, TARGET, ACQUISITION],
    ['wrong currency', BASE, TARGET, { ...ACQUISITION, currency: 'CAD' }],
    ['provider mismatch', BASE, TARGET, { ...ACQUISITION, providerIdentity: { ...ACQUISITION.providerIdentity, year: '1904' } }],
    ['unsupported provider form', BASE, TARGET, { ...ACQUISITION, providerIdentity: { ...ACQUISITION.providerIdentity, form: 'coin_set' } }],
    ['missing identity', BASE, { ...TARGET, itemDetails: '{}' }, ACQUISITION],
    ['qualified Numista mapping', { ...BASE, sourceId: 'numista', selectedGrade: 'MS65+', grade: 'UNC', matchType: 'mapped' as const }, { ...TARGET, grade: 'MS65+' }, { ...ACQUISITION, sourceId: 'numista' }],
  ])('does not issue proof for %s', (_label, anchor, target, acquisition) => {
    expect(issueGuideAnchor(anchor, target, acquisition as GuideAcquisition, OPTIONS).guideAnchor).toBeNull();
  });

  it('normalizes decimal formatting while preserving meaningful coin plus and qualifiers', () => {
    expect(normalizeGuideGrade('7.50')).toBe(normalizeGuideGrade('7.5'));
    expect(normalizeGuideGrade('MS-65')).toBe('MS65');
    expect(normalizeGuideGrade('MS65+')).not.toBe(normalizeGuideGrade('MS65'));
    expect(normalizeGuideGrade('MS65 DMPL')).not.toBe(normalizeGuideGrade('MS65 PL'));
    const target = { ...TARGET, grade: '7.50' };
    const numeric = issue({ ...BASE, sourceId: 'numista', grade: '7.5', selectedGrade: '7.50' }, target, { ...ACQUISITION, sourceId: 'numista' });
    expect(verifyGuideAnchors([wire(numeric)], { ...target, grade: '7.5' }, OPTIONS).trustedAnchors).toHaveLength(1);
    const plusTarget = { ...TARGET, grade: 'MS65+' };
    const plus = issue({ ...BASE, grade: 'MS65+', selectedGrade: 'MS65+' }, plusTarget);
    expect(isVerifiedGuideAnchor(plus, plusTarget, NOW)).toBe(true);
    expect(verifyGuideAnchors([wire(plus)], TARGET, OPTIONS).trustedAnchors).toEqual([]);
  });

  it('ignores detail ordering and specimen tracking but binds selectors and freezes verified observations', () => {
    const anchor = wire(issue());
    const target = { ...TARGET, itemDetails: JSON.stringify({ certNumber: 'other-specimen', variety: 'Morgan Dollar', mintMark: 'San Francisco', year: '1903', denomination: '1 Dollar', country: 'USA' }) };
    const verified = verifyGuideAnchors([anchor], target, OPTIONS).trustedAnchors[0];
    expect(verified).toBeDefined();
    expect(Object.isFrozen(verified)).toBe(true);
    expect(isVerifiedGuideAnchor({ ...verified }, target, NOW)).toBe(false);
    expect(isVerifiedGuideAnchor(verified, target, NOW)).toBe(true);
  });
});

const PC_RESULT = { status: 'success', query: '1903 S Morgan Dollar', data: { name: '1903-S Morgan Dollar', year: '1903', mint: 'San Francisco', prices: { ms65: 1250, ms64: 700 }, url: ACQUISITION.sourceRecordId, source: 'US coin price-guide context' } };
const NUMISTA_RESULT: NumistaLookup = { status: 'success', data: { id: 12, title: '1903-S Morgan Dollar', sourceUrl: 'https://en.numista.com/catalogue/pieces12.html', imageUrl: null, query: 'United States 1 Dollar Morgan Dollar S · year=1903', matchNote: 'Synthetic existing issue-scoped provider match.', guideIssueId: 34, guideIssueYear: 1903, guideIssueMintMark: 'S', guideValue: 430, guideGrade: 'UNC', guideCurrency: 'USD', guideSelectedGrade: 'MS65', guideMatchType: 'mapped', facts: [{ label: 'Issuer', value: 'United States' }, { label: 'Value', value: '1 Dollar' }, { label: 'Year', value: '1878–1921' }, { label: 'Object type', value: 'Coin' }] } };

describe('pure existing Coin route return wrappers and proof transport', () => {
  it.each([
    ['MS65DMPL', 'PL', 'DMPL'],
    ['PR65DCAM', 'CAM', 'DCAM'],
  ])('does not mistake a shared suffix for the full qualifier: %s versus %s', (grade, different, matching) => {
    const source = { ...PC_RESULT, data: { ...PC_RESULT.data, prices: { [grade.toLowerCase()]: 1250 } } };
    const target = { ...TARGET, grade, title: `1903-S Morgan Dollar ${different}` };
    expect(priceChartingCoinGuideQuote(source, target, { year: '1903', variety: 'Morgan Dollar', mintMark: 'S' }, OPTIONS).guideAnchor).toBeNull();
    expect(priceChartingCoinGuideQuote(source, { ...target, title: `1903-S Morgan Dollar ${matching}` }, { year: '1903', variety: 'Morgan Dollar', mintMark: 'S' }, OPTIONS).guideAnchor?.value).toBe(1250);
    const conflicting = { ...target, title: `1903-S Morgan Dollar ${matching}`, itemDetails: JSON.stringify({ ...DETAILS, designation: different }) };
    expect(priceChartingCoinGuideQuote(source, conflicting, { year: '1903', variety: 'Morgan Dollar', mintMark: 'S' }, OPTIONS).guideAnchor).toBeNull();
  });

  it.each(['1903-O Morgan Dollar', '1903-S Peace Dollar', '1903-S Morgan Dollar DMPL', '1903-S Morgan Dime'])
  ('does not authenticate a known contradictory target title: %s', (title) => {
    const result = priceChartingCoinGuideQuote(PC_RESULT, { ...TARGET, title }, { year: '1903', variety: 'Morgan Dollar', mintMark: 'S' }, OPTIONS);
    expect(result.guideAnchor).toBeNull();
    expect(result.guideWarnings.length).toBeGreaterThan(0);
  });

  it('does not infer a blank mint from a broad catalogue title when the selected issue is S or unknown', () => {
    const target = { ...TARGET, title: '1903 Morgan Dollar', itemDetails: JSON.stringify({ ...DETAILS, mintMark: '' }) };
    const broad = { ...NUMISTA_RESULT, data: { ...NUMISTA_RESULT.data!, title: '1903 Morgan Dollar' } };
    expect(numistaCoinGuideQuote(broad, target, OPTIONS).guideAnchor).toBeNull();
    expect(numistaCoinGuideQuote({ ...broad, data: { ...broad.data, guideIssueMintMark: null } }, target, OPTIONS).guideAnchor).toBeNull();
    expect(numistaCoinGuideQuote({ ...broad, data: { ...broad.data, guideIssueMintMark: '', guideIssueYear: 1903 } }, target, OPTIONS).guideAnchor?.value).toBe(430);
  });

  it('selects server-returned exact PriceCharting value and applicable Numista issue value', () => {
    const pc = priceChartingCoinGuideQuote(PC_RESULT, TARGET, { year: '1903', variety: 'Morgan Dollar', mintMark: 'S' }, OPTIONS);
    const numista = numistaCoinGuideQuote(NUMISTA_RESULT, TARGET, OPTIONS);
    expect(pc.guideAnchor?.value).toBe(1250);
    expect(numista.guideAnchor?.value).toBe(430);
    expect(pc.guideWarnings).toEqual([]);
    expect(numista.guideWarnings).toEqual([]);
    expect(verifyGuideAnchors([wire(pc.guideAnchor!), wire(numista.guideAnchor!)], TARGET, OPTIONS).trustedAnchors).toHaveLength(2);
  });

  it('rejects exact-grade absence, provider failure, generic category and conflicting provider identity', () => {
    const search = { year: '1903', variety: 'Morgan Dollar', mintMark: 'S' };
    expect(priceChartingCoinGuideQuote({ ...PC_RESULT, status: 'error' }, TARGET, search, OPTIONS).guideAnchor).toBeNull();
    expect(priceChartingCoinGuideQuote(PC_RESULT, { ...TARGET, grade: 'MS66' }, search, OPTIONS).guideAnchor).toBeNull();
    expect(priceChartingCoinGuideQuote(PC_RESULT, { ...TARGET, category: 'pokemon' }, search, OPTIONS).guideAnchor).toBeNull();
    expect(priceChartingCoinGuideQuote({ ...PC_RESULT, data: { ...PC_RESULT.data, name: '1904-S Peace Dollar', year: '1904' } }, TARGET, search, OPTIONS).guideAnchor).toBeNull();
    expect(priceChartingCoinGuideQuote(PC_RESULT, changedTarget({ denomination: '1 Dime' }), search, OPTIONS).guideAnchor).toBeNull();
    expect(numistaCoinGuideQuote({ ...NUMISTA_RESULT, data: { ...NUMISTA_RESULT.data!, guideCurrency: 'EUR' } }, TARGET, OPTIONS).guideAnchor).toBeNull();
    expect(numistaCoinGuideQuote({ ...NUMISTA_RESULT, data: { ...NUMISTA_RESULT.data!, guideIssueId: null } }, TARGET, OPTIONS).guideAnchor).toBeNull();
    expect(numistaCoinGuideQuote({ ...NUMISTA_RESULT, data: { ...NUMISTA_RESULT.data!, title: 'Peace Dollar' } }, TARGET, OPTIONS).guideAnchor).toBeNull();
  });

  it('carries signed facts through actual shared normalization without creating browser authority or duplicate anchors', () => {
    const quote = wire(issue());
    const summary = normalizeTestAiEvidence(TARGET, [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'success', fields: { guideAnchor: quote, guideValue: 1_000_000 } }]);
    expect(summary.guideAnchors).toEqual([quote]);
    expect(isVerifiedGuideAnchor(summary.guideAnchors[0], TARGET, NOW)).toBe(false);
    expect(verifyGuideAnchors(summary.guideAnchors, TARGET, OPTIONS).trustedAnchors[0]?.value).toBe(1250);
    expect(summary.evidenceSufficiency.completedSaleCount).toBe(0);
    const flattened = normalizeTestAiEvidence(TARGET, [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'success', fields: guideAnchorFields(quote) }]);
    expect(flattened.guideAnchors).toEqual([quote]);
    expect(verifyGuideAnchors(flattened.guideAnchors, TARGET, OPTIONS).trustedAnchors[0]?.value).toBe(1250);
  });
});
