import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCoinGuideLookupInput, guideTargetInput } from '../shared/testAiGuideTarget';
import { guideAnchorFields, normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { priceChartingCoinGuideQuote } from './testAiGuideEvidence';
import { buildAnalysisSnapshot } from './testAiAnalysisSnapshot';

const now = new Date('2026-11-09T01:00:00Z');
const options = { now, signingKey: 'synthetic-stage2-client-binding-key' };
const raw = { title: '1903-S Morgan Dollar', category: 'coins', grade: 'MS65', itemType: 'single_coin', certificationCompany: 'PCGS',
  itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', mintMark: 'S', variety: 'Morgan Dollar' }) };
const augmented = { ...raw, title: '1903-S Morgan Dollar PCGS MS65' };
const provider = { status: 'success', query: '1903 S Morgan Dollar', data: { name: raw.title, year: '1903', mint: 'San Francisco',
  source: 'US coin price-guide context', url: 'https://pricecharting.com/coin/1903-s-morgan-dollar', prices: { ms65: 1250 } } };

describe('Stage 2 actual client guide-target input binding', () => {
  it('preserves original upstream search while binding the guide to the actual augmented valuation target', () => {
    const query = buildCoinGuideLookupInput(raw, augmented);
    expect({ year: query.year, variety: query.variety, mintMark: query.mintMark }).toEqual({ year: '1903', variety: 'Morgan Dollar', mintMark: 'S' });
    expect(query.guideTarget.title).toBe(augmented.title);
    const quote = priceChartingCoinGuideQuote(provider, query.guideTarget, query, options);
    expect(quote.guideWarnings).toEqual([]);
    const summary = normalizeTestAiEvidence(augmented, [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'success', fields: guideAnchorFields(quote.guideAnchor) }]);
    const snapshot = buildAnalysisSnapshot({ target: augmented, evidenceSummary: summary, now }, options);
    expect(snapshot.profile.valuationBasis).toBe('guide_fallback');
    expect(snapshot.profile.primaryValue).toBe(1250);
    expect(buildAnalysisSnapshot({ target: raw, evidenceSummary: summary, now }, options).profile.primaryValue).toBeNull();
  });

  it('does not borrow Item A proof for a differently identified Item B', () => {
    const query = buildCoinGuideLookupInput(raw, augmented);
    const quote = priceChartingCoinGuideQuote(provider, query.guideTarget, query, options).guideAnchor;
    const summary = normalizeTestAiEvidence(augmented, [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'success', fields: guideAnchorFields(quote) }]);
    const other = { ...augmented, title: '1904-S Morgan Dollar PCGS MS65', itemDetails: JSON.stringify({ ...JSON.parse(raw.itemDetails), year: '1904' }) };
    expect(buildAnalysisSnapshot({ target: other, evidenceSummary: summary, now }, options).profile.primaryValue).toBeNull();
  });

  it('passes the effective Numista target without browser value or authority fields', () => {
    const input = guideTargetInput({ ...augmented, value: 1_000_000, trusted: true } as typeof augmented);
    expect(input.title).toBe(augmented.title);
    expect(input).not.toHaveProperty('value');
    expect(input).not.toHaveProperty('trusted');
    expect(input.certificationCompany).toBe('PCGS');
  });

  it('wires the same tested effective-target input into both actual page guide hooks', () => {
    const page = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');
    expect(page).toContain('buildPriceChartingCoinInput(item, marketItem)');
    expect(page).toContain('...guideTargetInput(marketItem)');
    expect(page).toContain('return buildCoinGuideLookupInput(item, valuationTarget)');
  });
});
