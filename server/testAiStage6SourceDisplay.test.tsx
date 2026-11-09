import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'stage6-display-explicit-synthetic-key' } }));
import { renderToStaticMarkup } from 'react-dom/server';
import { sourceVisualDisplayGroups, sourceReviewedGoldinSales, sourceRequestDisplayData, sourceRetainedDisplayGroups,
  sourceRetainedEmptyMessage, sourceEvidenceStatus, sourceEvidenceMessage } from '../shared/testAiSourceDisplay';
import { mergeCandidateDisplayGroups } from '../shared/testAiCandidateLedger';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { mapNamedSourceEconomics } from './testAiSourceEconomics';
import { selectTestAiVisualDisplayRows, TestAiCandidateStatus, TestAiProcessCompleteNotice, TestAiSourceStatusBadges } from '../client/src/components/TestAiCandidateStatus';
import { TestAiRetrievalLadder } from '../client/src/components/TestAiRetrievalLadder';
import { retrieveItemsAttempt } from '../shared/testAiRetrievalAttempt';
import { buildAnalysisSnapshot } from './testAiAnalysisSnapshot';

const target = { title: 'Metroid NES 1986', category: 'video_games', itemType: 'game', grade: undefined, certificationCompany: undefined };
const now = new Date('2026-11-09T12:00:00.000Z');
function raw(sourceId = 'goldin') {
  return { sourceId, saleId: 'observed-transaction-1', title: 'Metroid NES 1986', price: 150, currency: 'USD',
    completed: true, evidenceDisposition: 'valuation_eligible', evidenceReasons: ['source review passed'],
    metadataOriginOccurrenceKey: 'source-occurrence-1', metadataSourceRunId: 'source-run-1',
    visualExecution: { version: 1, state: 'completed', reasonCode: 'review_returned', selectedForReview: true,
      attempts: [{ stage: 'initial', outcome: 'usable_review' }],
      identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' } } };
}

describe('Stage 6 mapped source and partial-status production display chain', () => {
  it('actual mapped Goldin context beats its earlier visual copy without entering source sale intake', () => {
    const original = raw();
    const mapped = mapNamedSourceEconomics('goldin', original);
    const data = { sales: [], context: [mapped], visualReviewListings: [original], visualFilter: { listings: [original], contextListings: [] } };
    const rows = selectTestAiVisualDisplayRows(sourceVisualDisplayGroups(data));
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceEconomics).toEqual(mapped.sourceEconomics);
    expect(rows[0].evidenceDisposition).not.toBe('valuation_eligible');
    expect(sourceReviewedGoldinSales(data)).toEqual([]);
    const html = renderToStaticMarkup(<TestAiCandidateStatus listing={rows[0]} />);
    expect(html).toContain(mapped.sourceEconomics.convention.replaceAll('_', ' '));
    expect(html.toLowerCase()).toContain('context');
    expect(original.evidenceDisposition).toBe('valuation_eligible');
  });
  it('keeps genuine source values and older unmapped Goldin source predicate intact', () => {
    const original = raw();
    expect(sourceReviewedGoldinSales({ visualFilter: { listings: [original] } })).toEqual([original]);
    const mapped = mapNamedSourceEconomics('comicconnect', { ...original, saleStatus: 'completed', priceBasis: 'sold',
      buyerPremium: 'unknown', date: '2026-11-01', url: 'https://synthetic.invalid/sale/1' });
    expect(mapped.price).toBe(150); expect(mapped.currency).toBe('USD');
    expect(sourceVisualDisplayGroups({ sales: [mapped], visualReviewListings: [original] })[0][0]).toBe(mapped);
  });
  it('all-held and no-image records remain counted in the actual master groups, not called zero results', () => {
    const held = { ...raw('mercari_sold_comps'), evidenceDisposition: 'context_only', visualExecution: undefined };
    const data = { listings: [], preVisionExcludedListings: [held], visualFilter: { contextListings: [held] } };
    const retained = mergeCandidateDisplayGroups(sourceRetainedDisplayGroups(data));
    expect(retained).toHaveLength(1);
    expect(sourceRetainedEmptyMessage(data, retained.length, 'Mercari')).toContain('1 known retained Mercari candidates');
    expect(sourceRetainedEmptyMessage(data, retained.length, 'Mercari')).not.toContain('No completed');
  });
  it('real query failure packets retain known rows without printing raw errors or declaring a zero-match success', () => {
    const original = { listings: [raw()], status: 'success' };
    expect(sourceRequestDisplayData(original, false)).toBe(original);
    const failed = sourceRequestDisplayData(original, true);
    expect(failed?.listings[0]).toBe(original.listings[0]);
    expect(sourceEvidenceStatus(failed)).toBe('partial'); expect(original).not.toHaveProperty('error');
    const noResponse = sourceRequestDisplayData(undefined, true);
    expect(sourceEvidenceStatus(noResponse)).toBe('error');
    const html = renderToStaticMarkup(<><TestAiProcessCompleteNotice data={noResponse} /><TestAiProcessCompleteNotice /></>);
    expect(html).toContain('partial/error'); expect(html).toContain('No returned source response');
    expect(html).not.toContain('border-emerald'); expect(html).not.toContain('failed queries: 0');
  });
  it('actual partial request receipts keep observations and partial status through normalization and snapshot', async () => {
    const first = await retrieveItemsAttempt(async () => ({ ok: true, status: 200, json: async () => ({ items: [{ id: '1', title: 'Metroid NES 1986', price: 150 }] }) }),
      { query: 'primary', stage: 'search', attempt: 1 }, { idFields: ['id'], titleFields: ['title'], priceFields: ['price'] });
    const second = await retrieveItemsAttempt(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('synthetic invalid JSON'); } }),
      { query: 'fallback', stage: 'search', attempt: 2 }, { idFields: ['id'], titleFields: ['title'], priceFields: ['price'] });
    const data = { listings: first.items, retrievalCoverage: [first.receipt, second.receipt], error: null };
    expect(sourceEvidenceStatus(data)).toBe('partial');
    const summary = normalizeTestAiEvidence(target, [{ id: 'sold_comps', label: 'Sold-Comps', kind: 'market_completed',
      status: sourceEvidenceStatus(data), market: { returnedRecordCount: 1, completedSaleCount: 1 }, message: sourceEvidenceMessage(data) }]);
    expect(summary.sources[0].status).toBe('partial');
    expect(summary.marketEvidence.join(' ')).toContain('1');
    expect(summary.reviewFlags.some((flag) => flag.kind === 'coverage' && flag.message.includes('partial/error'))).toBe(true);
    const snapshot = buildAnalysisSnapshot({ target, sales: [], evidenceSummary: summary, now });
    expect(snapshot.evidence.sourceStatuses[0].status).toBe('partial');
    expect(snapshot.profile.primaryValue).toBeNull();
    const badges = renderToStaticMarkup(<TestAiSourceStatusBadges sources={snapshot.evidence.sourceStatuses} />);
    expect(badges).toContain('Sold-Comps: partial'); expect(badges).not.toContain('emerald');
    const html = renderToStaticMarkup(<TestAiRetrievalLadder data={data} sourceLabel="eBay Sold History" marketplace="eBay" />);
    expect(html).toContain('primary'); expect(html).toContain('fallback'); expect(html).toContain('invalid_json');
    expect(html).toContain('unmeasured');
  });
});
