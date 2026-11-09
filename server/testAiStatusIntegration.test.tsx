import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: '' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('Synthetic render fixtures never invoke models'); }) }));
import { sealCanonicalObservation } from './testAiCanonicalObservation';
import { normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { buildAnalysisSnapshot } from './testAiAnalysisSnapshot';
import { issueGuideAnchor } from './testAiGuideEvidence';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { selectHistoricalTrendRecords, formatHistoricalTrendContext } from './historicalTrendContext';
import type { ComparableTarget, MarketSale } from './testAiComparableEngine';
import { TestAiFinalLedgerRow, TestAiFinalUseSummary } from '../client/src/components/TestAiCandidateStatus';

const now = new Date('2026-09-28T12:00:00.000Z');
const signingKey = 'synthetic-stage5-status-integration-key';
const coin: ComparableTarget = { title: '1903 Morgan Dollar', category: 'coins', grade: 'MS65', certificationCompany: 'PCGS',
  itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', variety: 'Morgan Dollar' }) };
function verifiedSales(count: number, historical = false) {
  const inputs: MarketSale[] = Array.from({ length: count }, (_, index) => {
    const sourceId = historical && index % 2 ? 'pcgs_auction_results' : 'sold_comps';
    const sale: MarketSale = { title: '1903 $1 Morgan Dollar PCGS MS65', price: 100 + index, currency: 'USD',
      date: historical ? `2024-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z` : '2026-09-01T00:00:00.000Z',
      marketplace: index % 2 ? 'Heritage' : 'eBay', originMarketplace: index % 2 ? 'Heritage' : 'eBay',
      sourceId, saleId: `render-${index}`, url: `https://synthetic.invalid/transaction/${index}`,
      saleStatus: 'completed', priceBasis: 'sold', evidenceDisposition: 'valuation_eligible', visualRequirement: 'not_required' };
    const sealed = sealCanonicalObservation(sourceId, sale, { acquiredAt: now, signingKey });
    return { ...sale, provenanceToken: sealed.provenanceToken, provenance: sealed.provenance };
  });
  return normalizeAnalysisMarketSales(inputs, now, { signingKey, target: coin, category: coin.category, side: 'item_a', analysisRunId: 'render-final-run' });
}

describe('Stage 5 real issuer/normalizer/snapshot to rendered final-use facts', () => {
  it('renders a verified guide as the primary basis while an actual recent sale is diagnostic only', () => {
    const issued = issueGuideAnchor({ sourceId: 'pricecharting', sourceLabel: 'PriceCharting', grade: 'MS65', selectedGrade: 'MS65',
      matchType: 'exact', value: 1200, recordedSales: null, lastSaleDate: null, totalRecordedSales: null }, coin,
      { sourceId: 'pricecharting', sourceQuery: 'Synthetic 1903 Morgan Dollar', sourceRecordId: 'synthetic-render-guide', currency: 'USD',
        providerIdentity: { title: coin.title, country: 'United States', denomination: '1 Dollar', year: '1903', mintMark: '', variety: 'Morgan Dollar', form: 'single_coin' } }, { now, signingKey });
    expect(issued.warnings).toEqual([]);
    const summary = normalizeTestAiEvidence(coin, []);
    summary.guideAnchors = [JSON.parse(JSON.stringify(issued.guideAnchor))];
    const snapshot = buildAnalysisSnapshot({ target: coin, sales: verifiedSales(1), now, evidenceSummary: summary,
      side: 'item_a', analysisRunId: 'render-final-run', historicalPromptSales: [] }, { signingKey });
    expect(snapshot.profile.valuationBasis).toBe('guide_fallback');
    expect(snapshot.profile.primaryValue).toBe(1200);
    expect(snapshot.profile.comparables[0].valuationUse?.use.currentSaleMedianDiagnostics).toBe(true);
    expect(snapshot.profile.comparables[0].valuationUse?.use.primaryMarketSales).toBe(false);
    const html = renderToStaticMarkup(<><TestAiFinalLedgerRow comparable={snapshot.profile.comparables[0]} /><TestAiFinalUseSummary report={snapshot.finalUseReport} /></>);
    expect(html).toContain('guide fallback');
    expect(html).toContain('Current-sales diagnostics only');
    expect(html).toContain('primary sales: no');
    expect(html).not.toContain('Used to support primary sales valuation');
  });
  it('renders actual first-ten historical prompt membership without treating all historical rows as included or priced', () => {
    const sales = verifiedSales(12, true);
    const actualPromptRows = selectHistoricalTrendRecords(sales);
    const text = formatHistoricalTrendContext('ITEM A', sales);
    expect(actualPromptRows).toHaveLength(10);
    expect(new Set(actualPromptRows.map((row) => row.sourceId))).toEqual(new Set(['sold_comps', 'pcgs_auction_results']));
    expect(text).toContain('PCGS');
    expect(text).toContain('eBay');
    const snapshot = buildAnalysisSnapshot({ target: coin, sales, now, side: 'item_a', analysisRunId: 'render-final-run',
      historicalPromptSales: actualPromptRows }, { signingKey });
    const included = snapshot.profile.comparables.filter((row) => row.valuationUse?.use.historicalPromptIncluded);
    const omitted = snapshot.profile.comparables.filter((row) => row.valuationUse?.use.historicalPromptIncluded === false);
    expect(included).toHaveLength(10); expect(omitted).toHaveLength(2);
    expect(snapshot.finalUseReport.populations.find((row) => row.population === 'historical_prompt')?.count).toBe(10);
    const inHtml = renderToStaticMarkup(<TestAiFinalLedgerRow comparable={included[0]} />);
    const outHtml = renderToStaticMarkup(<TestAiFinalLedgerRow comparable={omitted[0]} />);
    expect(inHtml).toContain('historical prompt: included');
    expect(outHtml).toContain('historical prompt: not included');
    expect(inHtml).toContain('primary sales: no'); expect(outHtml).toContain('primary sales: no');
    expect(inHtml).not.toContain('Used to support primary sales valuation');
  });
});

describe('Stage 5 verified-source hard disposition controls', () => {
  it('preserves a signed genuine objective hold but does not manufacture a hard claim from no-hard-conflict prose', () => {
    for (const hard of [true, false]) {
      const raw: MarketSale = { title: '1903 $1 Morgan Dollar PCGS MS65', price: 100, currency: 'USD',
        date: '2026-09-01T00:00:00.000Z', marketplace: 'eBay', originMarketplace: 'eBay',
        sourceId: 'sold_comps', saleId: hard ? 'signed-hard' : 'signed-no-hard', saleStatus: 'completed', priceBasis: 'sold',
        visualRequirement: 'not_required', evidenceDisposition: hard ? 'rejected_objective_conflict' : 'valuation_eligible',
        evidenceReasons: hard ? ['Synthetic source objective hold'] : ['No hard identity conflict'] };
      const proof = sealCanonicalObservation('sold_comps', raw, { acquiredAt: now, signingKey });
      const sales = normalizeAnalysisMarketSales([{ ...raw, provenanceToken: proof.provenanceToken }], now,
        { signingKey, target: coin, category: coin.category, side: 'item_a', analysisRunId: 'verified-hold-run' });
      const snapshot = buildAnalysisSnapshot({ target: coin, sales, now, side: 'item_a', analysisRunId: 'verified-hold-run' }, { signingKey });
      const row = snapshot.profile.comparables[0];
      expect(row.valuationUse?.sourceAdmission.verification).toBe('verified');
      const html = renderToStaticMarkup(<TestAiFinalLedgerRow comparable={row} />);
      if (hard) {
        expect(row.valuationUse?.use.code).toBe('FINAL_HARD_EXCLUDED');
        expect(html).toContain('Hard exclusion:');
      } else {
        expect(row.valuationUse?.use.code).not.toBe('FINAL_HARD_EXCLUDED');
        expect(html).not.toContain('Hard exclusion:');
      }
    }
  });
});
