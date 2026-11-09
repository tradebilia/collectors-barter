import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComparableTarget } from './testAiComparableEngine';

const mocks = vi.hoisted(() => ({ pc: vi.fn(), numista: vi.fn(), recover: vi.fn() }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'synthetic-stage2-route-signing-key', appId: 'synthetic-test-app' } }));
vi.mock('./db', () => ({ requireDb: () => { throw new Error('DB forbidden in Coin guide route tests'); }, getDb: () => { throw new Error('DB forbidden in Coin guide route tests'); } }));
vi.mock('./parseMarketData', async (importOriginal) => ({ ...await importOriginal<typeof import('./parseMarketData')>(), lookupPriceChartingCoin: mocks.pc }));
vi.mock('./numistaMetadata', async (importOriginal) => ({ ...await importOriginal<typeof import('./numistaMetadata')>(), lookupNumistaCoin: mocks.numista }));
vi.mock('./testAiCoinVisualFallback', () => ({ recoverNumistaWithVisualFallback: mocks.recover }));

import { testAIRouter } from './testAIRouter';
import { verifyGuideAnchors } from './testAiGuideEvidence';
import { guideAnchorFields, normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { buildAnalysisSnapshot, buildCashAwareTradeTerms } from './testAiAnalysisSnapshot';

const TARGET: ComparableTarget = { title: '1903-S Morgan Dollar', category: 'coins', grade: 'MS65', itemType: 'single_coin', certificationCompany: 'PCGS', itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', mintMark: 'S', variety: 'Morgan Dollar' }) };
const SEARCH = { year: '1903', variety: 'Morgan Dollar', mintMark: 'S' };
const PC = { status: 'success', query: '1903 S Morgan Dollar', data: { name: '1903-S Morgan Dollar', year: '1903', mint: 'San Francisco', url: 'https://pricecharting.com/coin/1903-s-morgan-dollar', source: 'US coin price-guide context', prices: { ms65: 1250 } } };
const NUMISTA = { status: 'success', data: { id: 12, title: '1903-S Morgan Dollar', sourceUrl: 'https://en.numista.com/catalogue/pieces12.html', imageUrl: null, query: 'United States 1 Dollar Morgan Dollar S · year=1903', matchNote: 'Synthetic source note', guideValue: 430, guideCurrency: 'USD', guideGrade: 'UNC', guideSelectedGrade: 'MS65', guideMatchType: 'mapped', guideIssueId: 34, guideIssueYear: 1903, guideIssueMintMark: 'S', facts: [{ label: 'Issuer', value: 'United States' }, { label: 'Value', value: '1 Dollar' }, { label: 'Year', value: '1878–1921' }, { label: 'Object type', value: 'Coin' }] }, visualFallback: { status: 'not_needed' } };
const caller = (role = 'admin') => testAIRouter.createCaller({ user: { id: 1, role } as any, req: {} as any, res: {} as any });
const VERIFY = { signingKey: 'synthetic-stage2-route-signing-key' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pc.mockResolvedValue(PC);
  mocks.recover.mockResolvedValue(NUMISTA);
});

describe('actual existing Coin guide route contracts', () => {
  it.each([['MS65DMPL', 'PL'], ['PR65DCAM', 'CAM']])
  ('does not admit prefix/suffix-related but different qualifiers into fallback: %s versus %s', async (grade, qualifier) => {
    const target = { ...TARGET, grade, title: `1903-S Morgan Dollar ${qualifier}` };
    mocks.pc.mockResolvedValueOnce({ ...PC, data: { ...PC.data, prices: { [grade.toLowerCase()]: 1250 } } });
    const result = await caller().getPriceChartingCoinData({ ...SEARCH, guideTarget: target });
    expect(result.guideAnchor).toBeNull();
    const summary = normalizeTestAiEvidence(target, [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'success', fields: guideAnchorFields(result.guideAnchor) }]);
    expect(buildAnalysisSnapshot({ target, sales: [], evidenceSummary: summary }, VERIFY).profile.primaryValue).toBeNull();
  });

  it.each(['1903-O Morgan Dollar', '1903-S Peace Dollar', '1903-S Morgan Dollar DMPL'])
  ('blocks contradictory title through actual route, normalization, and snapshot: %s', async (title) => {
    const target = { ...TARGET, title };
    const result = await caller().getPriceChartingCoinData({ ...SEARCH, guideTarget: target });
    expect(result.guideAnchor).toBeNull();
    expect(result.guideWarnings.length).toBeGreaterThan(0);
    const summary = normalizeTestAiEvidence(target, [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'success', fields: guideAnchorFields(result.guideAnchor) }]);
    expect(buildAnalysisSnapshot({ target, sales: [], evidenceSummary: summary }, VERIFY).profile.primaryValue).toBeNull();
  });

  it('cannot use a first S-mint issue price for a blank-mint target, even with a broad year-bearing type title', async () => {
    const target = { ...TARGET, title: '1903 Morgan Dollar', itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', mintMark: '', variety: 'Morgan Dollar' }) };
    mocks.recover.mockResolvedValueOnce({ ...NUMISTA, data: { ...NUMISTA.data, title: '1903 Morgan Dollar', guideIssueMintMark: 'S' } });
    const result = await caller().getNumistaCoinData(target);
    expect(result.guideAnchor).toBeNull();
    expect(result.guideWarnings.join(' ')).toContain('selected issue');
  });

  it('preserves legacy PriceCharting calls without issuing an unbound fallback proof', async () => {
    const result = await caller().getPriceChartingCoinData(SEARCH);
    expect(mocks.pc).toHaveBeenCalledTimes(1);
    expect(mocks.pc).toHaveBeenCalledWith(SEARCH);
    expect(result.data).toEqual(PC.data);
    expect(result.guideAnchor).toBeNull();
  });

  it('binds optional target metadata without adding it to the provider query or accepting browser values', async () => {
    const result = await caller().getPriceChartingCoinData({ ...SEARCH, guideTarget: { ...TARGET, value: 1_000_000, trusted: true } as any });
    expect(mocks.pc).toHaveBeenCalledTimes(1);
    expect(mocks.pc).toHaveBeenCalledWith(SEARCH);
    expect(result.guideAnchor?.value).toBe(1250);
    expect(result.guideWarnings).toEqual([]);
    expect(verifyGuideAnchors([result.guideAnchor!], TARGET, VERIFY).trustedAnchors).toHaveLength(1);
    expect(verifyGuideAnchors([result.guideAnchor!], { ...TARGET, certificationCompany: 'NGC' }, VERIFY).trustedAnchors).toEqual([]);
  });

  it('Numista returns a top-level issue-scoped signed guide with existing acquisition behavior', async () => {
    const result = await caller().getNumistaCoinData(TARGET);
    expect(mocks.recover).toHaveBeenCalledTimes(1);
    expect(mocks.recover).toHaveBeenCalledWith(TARGET, mocks.numista);
    expect(result.guideAnchor?.value).toBe(430);
    expect(result.guideWarnings).toEqual([]);
    expect(result.data?.guideIssueId).toBe(34);
    expect(verifyGuideAnchors([result.guideAnchor!], TARGET, VERIFY).trustedAnchors).toHaveLength(1);
  });

  it('rejects wrong grade/category/provider identity and incomplete Numista targets', async () => {
    expect((await caller().getPriceChartingCoinData({ ...SEARCH, guideTarget: { ...TARGET, grade: 'MS64' } })).guideAnchor).toBeNull();
    expect((await caller().getPriceChartingCoinData({ ...SEARCH, guideTarget: { ...TARGET, category: 'pokemon' } })).guideAnchor).toBeNull();
    mocks.pc.mockResolvedValueOnce({ ...PC, data: { ...PC.data, name: '1903-S Peace Dollar' } });
    expect((await caller().getPriceChartingCoinData({ ...SEARCH, guideTarget: TARGET })).guideAnchor).toBeNull();
    expect((await caller().getNumistaCoinData({ category: 'coins', title: TARGET.title, grade: TARGET.grade })).guideAnchor).toBeNull();
  });

  it('preserves administrator-only admission and never performs acquisition for a denied caller', async () => {
    await expect(caller('user').getPriceChartingCoinData({ ...SEARCH, guideTarget: TARGET })).rejects.toThrow();
    await expect(caller('user').getNumistaCoinData(TARGET)).rejects.toThrow();
    expect(mocks.pc).not.toHaveBeenCalled();
    expect(mocks.recover).not.toHaveBeenCalled();
  });

  it('actual server route proof survives client normalization into guide-only snapshot fallback but not tamper/expiry', async () => {
    const result = await caller().getPriceChartingCoinData({ ...SEARCH, guideTarget: TARGET });
    const quote = result.guideAnchor!;
    const now = new Date(quote.retrievedAt!);
    const summary = normalizeTestAiEvidence(TARGET, [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'success', fields: guideAnchorFields(quote) }]);
    const snapshot = buildAnalysisSnapshot({ target: TARGET, sales: [], evidenceSummary: summary, now }, VERIFY);
    expect(snapshot.profile.valuationBasis).toBe('guide_fallback');
    expect(snapshot.profile.primaryValue).toBe(1250);
    expect(snapshot.profile.guideAnchorWeightPct).toBe(100);
    expect(snapshot.profile.marketRange.supported).toBe(false);
    expect(snapshot.profile.authoritativeSaleCount).toBe(0);
    expect(buildCashAwareTradeTerms(snapshot.profile, snapshot.profile).suggestedCashRange).toBeNull();
    const expired = buildAnalysisSnapshot({ target: TARGET, sales: [], evidenceSummary: summary, now: new Date(quote.expiresAt!) }, VERIFY);
    expect(expired.profile.valuationBasis).toBe('insufficient_evidence');
    expect(expired.profile.primaryValue).toBeNull();
    summary.guideAnchors[0]!.value = 1_000_000;
    const tampered = buildAnalysisSnapshot({ target: TARGET, sales: [], evidenceSummary: summary, now }, VERIFY);
    expect(tampered.profile.valuationBasis).toBe('insufficient_evidence');
    expect(tampered.profile.primaryValue).toBeNull();
  });
});
