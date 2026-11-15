import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const reviewSource = readFileSync(new URL('../client/src/components/test-ai/TestAiEvidenceReview.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');

describe('PriceCharting Video Game Run Summary card', () => {
  it('renders the six provider guide tiers from the authoritative packet', () => {
    expect(reviewSource).toContain('PriceCharting Guide Values');
    expect(reviewSource).toContain('priceChartingGuideData?.data?.detail?.prices');
    for (const label of ['Loose', 'CIB', 'New', 'Graded', 'Box Only', 'Manual Only']) {
      expect(reviewSource).toContain(`['${label}'`);
    }
  });

  it('keeps guide values outside candidate and sold-comps counts', () => {
    expect(reviewSource).toContain('Guide context only — these are not sold comps, do not increase candidate counts');
    expect(pageSource).toContain('priceChartingGuideData={runSummaryPriceChartingGuideData}');
  });
});
