import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const boundaries = vi.hoisted(() => ({ llm: vi.fn() }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'stage6-synthetic-input-signing-key', appId: 'stage6-input' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: boundaries.llm }));
import { testAIRouter } from './testAIRouter';
import { sealCanonicalObservation } from './testAiCanonicalObservation';
import { TestAiFinalLedgerRow } from '../client/src/components/TestAiCandidateStatus';
import type { MarketProfile } from './testAiComparableEngine';

const KEY = 'stage6-synthetic-input-signing-key';
const NOW = new Date('2026-11-09T13:00:00.000Z');
const coin = { title: '1903-S Morgan Dollar PCGS MS65', category: 'coins', grade: 'MS65', certificationCompany: 'PCGS', itemType: 'single_coin',
  itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', mintMark: 'S', variety: 'Morgan Dollar' }) };
const caller = () => testAIRouter.createCaller({ user: { id: 1, role: 'admin' } as any, req: { headers: {} } as any, res: {} as any });
const request = (left: Record<string, unknown>, right = left, sales: any[] = []) => ({ leftItem: left, rightItem: right,
  useImageAnalyzer: false, useVisualFieldCompletion: false, leftHistoricalTrendSales: sales, rightHistoricalTrendSales: sales,
  marketNews: { itemA: [], itemB: [], categorySummaries: [] } });
function observed() {
  return Array.from({ length: 4 }, (_, index) => {
    const facts = { title: coin.title, price: 3500 + index * 10, currency: 'USD', date: new Date(NOW.getTime() - (index + 1) * 86400000).toISOString(),
      saleId: `stage6-input-${index}`, sourceId: 'pcgs_auction_results', sourceLabel: 'PCGS Auction Prices Realized',
      originMarketplace: index % 2 ? 'Heritage Auctions' : 'eBay', marketplace: index % 2 ? 'Heritage Auctions' : 'eBay',
      saleStatus: 'completed' as const, priceBasis: index % 2 ? 'realized' as const : 'sold' as const,
      buyerPremium: 'unknown' as const, visualRequirement: 'not_required' as const };
    const proof = sealCanonicalObservation('pcgs_auction_results', facts, { acquiredAt: NOW, signingKey: KEY });
    return JSON.parse(JSON.stringify({ ...facts, provenanceToken: proof.provenanceToken }));
  });
}
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
  boundaries.llm.mockRejectedValue(new Error('Configured synthetic narrator outage'));
});
afterEach(() => vi.useRealTimers());

describe('Stage 6 actual analyzer input and final-status boundary', () => {
  it('accepts nullable certification on both real items without any configuration-source reads', async () => {
    const item = { title: 'The Legend of Zelda', category: 'video_games', itemType: 'game', estimatedValue: 0, certificationCompany: null };
    const response = await caller().analyzeTrade(request(item) as any);
    expect(response.leftAnalysisSnapshot.profile.primaryValue).toBeNull();
    expect(response.rightAnalysisSnapshot.profile.primaryValue).toBeNull();
  });
  it('keeps the existing 120-row intake ceiling and rejects 121 before any narrator invocation', async () => {
    const item = { ...coin, estimatedValue: 0 };
    const tooMany = Array.from({ length: 121 }, () => ({ title: coin.title, price: 1 }));
    await expect(caller().analyzeTrade(request(item, item, tooMany) as any)).rejects.toThrow();
    expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it('passes each existing owner estimate independently to shared economics, not identity proof or prices', async () => {
    const sales = observed();
    const response = await caller().analyzeTrade(request({ ...coin, estimatedValue: 20000 }, { ...coin, estimatedValue: 10000 }, sales) as any);
    const left = response.leftMarketProfile.comparables as MarketProfile['comparables'];
    const right = response.rightMarketProfile.comparables as MarketProfile['comparables'];
    expect(left).toHaveLength(4); expect(right).toHaveLength(4);
    expect(left.every((row) => row.valuationUse?.sourceAdmission.blockerCodes.includes('HIGH_VALUE_PRICE_TOO_LOW'))).toBe(true);
    expect(right.every((row) => !row.valuationUse?.sourceAdmission.blockerCodes.some((code) => code === 'HIGH_VALUE_PRICE_TOO_LOW' || code === 'HIGH_VALUE_PRICE_TOO_HIGH'))).toBe(true);
    expect(response.leftMarketProfile.primaryValue).toBeNull();
    expect(response.rightMarketProfile.saleMedianValue).toBe(3515);
    const html = renderToStaticMarkup(createElement(TestAiFinalLedgerRow, { comparable: left[0] }));
    expect(html).toContain('primary sales: no');
    expect(html).not.toContain('Used to support primary sales valuation');
    expect(sales.map((row) => row.price)).toEqual([3500, 3510, 3520, 3530]);
  });
});
