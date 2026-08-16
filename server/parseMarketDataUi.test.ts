import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const testAiSource = readFileSync(resolve(process.cwd(), 'client/src/pages/TestAI.tsx'), 'utf8');

describe('Test AI Parse provider controls', () => {
  it('lists SGC, PriceCharting, and 130point as live Parse data sources', () => {
    expect(testAiSource).toContain("id: 'sgc'");
    expect(testAiSource).toContain("id: 'pricecharting'");
    expect(testAiSource).toContain("id: 'one_thirty_point'");
    expect(testAiSource).toContain("status: 'live' as const");
  });

  it('renders each live Parse result panel when its source is selected', () => {
    expect(testAiSource).toContain("enabledSources.has('sgc') && <SgcSection");
    expect(testAiSource).toContain("enabledSources.has('pricecharting') && <PriceChartingSection");
    expect(testAiSource).toContain("enabledSources.has('one_thirty_point') && <OneThirtyPointSection");
  });

  it('keeps all three provider panels explicitly read-only', () => {
    expect(testAiSource).toContain('Read-only cert details, grade, designation, and population data');
    expect(testAiSource).toContain('Read-only Pokémon card market prices by grade');
    expect(testAiSource).toContain('Read-only historical completed-sale context across eBay, Goldin, Heritage and more — not a current value');
  });

  it('separates recent 130point comparables from older historical context without calculating a current value', () => {
    expect(testAiSource).toContain('Recent comparable sales · last 12 months');
    expect(testAiSource).toContain('Historical context · over 12 months old');
    expect(testAiSource).toContain('No current average or valuation is calculated.');
    expect(testAiSource).toContain('not current-value comparables');
  });

  it('passes selected 130point sales to the analyzer only as separated trend context', () => {
    expect(testAiSource).toContain('left130PointSales: leftSources.has(\'one_thirty_point\')');
    expect(testAiSource).toContain('right130PointSales: rightSources.has(\'one_thirty_point\')');
  });

  it('exposes a live PWCC / Fanatics Collect panel with the same historical-context safeguards', () => {
    expect(testAiSource).toContain("label: 'PWCC / Fanatics Collect'");
    expect(testAiSource).toContain('getPwccFanaticsCollectData');
    expect(testAiSource).toContain('No current average or valuation is calculated');
    expect(testAiSource).toContain('Historical context · over 12 months old');
  });
});
