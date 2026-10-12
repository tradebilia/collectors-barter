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

  it('builds PriceCharting coin requests from structured year, mint mark, and variety fields instead of the listing title', () => {
    expect(testAiSource).toContain('function buildPriceChartingCoinInput(item: SelectedItem)');
    expect(testAiSource).toContain('const priceChartingCoinQueryInput = useMemo(() => buildPriceChartingCoinInput(item), [item]);');
    expect(testAiSource).not.toContain('getPriceChartingCoinData.useQuery({ query: item.title }');
    expect(testAiSource).toContain('Coin search used:');
  });

  it('uses only exact certified-grade PriceCharting coin values as a capped analyzer guide', () => {
    expect(testAiSource).toContain("import { selectExactPriceChartingCoinGuide } from '@shared/priceChartingCoinGuide'");
    expect(testAiSource).toContain("role: priceChartingCoinGuide ? 'valuation_guide' : 'asking_price_context'");
    expect(testAiSource).toContain('guideValue: priceChartingCoinGuide?.value');
    expect(testAiSource).toContain('preferred 25% sale-derived analyzer guide anchor');
    expect(testAiSource).toContain('Selected as the single 25% analyzer guide anchor.');
  });

  it('keeps all three provider panels explicitly read-only', () => {
    expect(testAiSource).toContain('Read-only cert details, grade, designation, and population data');
    expect(testAiSource).toContain('Read-only Pokémon card market prices by grade');
    expect(testAiSource).toContain('Read-only completed sales. No current average or valuation is calculated');
  });
});
