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

  it('does not reuse failed coin lookups silently and exposes a bounded retry', () => {
    expect(testAiSource).toContain("retry: false, staleTime: 0, refetchOnMount: 'always'");
    expect(testAiSource).toContain('Retry PriceCharting coin lookup');
    expect(testAiSource).toContain('coinQuery.refetch()');
  });

  it('retains exact UPC lookup and enables bounded title-and-platform candidates when a video game has no UPC', () => {
    expect(testAiSource).toContain('function getPriceChartingVideoGameUpc(item: SelectedItem | null)');
    expect(testAiSource).toContain('getPriceChartingVideoGameData.useQuery(priceChartingVideoGameUpc ? { upc: priceChartingVideoGameUpc } : skipToken');
    expect(testAiSource).toContain('searchPriceChartingVideoGames.useQuery(');
    expect(testAiSource).toContain('!priceChartingVideoGameUpc && canSearchVideoGamesByTitle ? videoGameSearchInput : skipToken');
    expect(testAiSource).toContain('function getPriceChartingVideoGameSearchIdentity(item: SelectedItem | null)');
    expect(testAiSource).toContain('missingPriceChartingVideoGameIdentity');
    expect(testAiSource).toContain('!priceChartingVideoGameUpc\n                  && !priceChartingVideoGameSearchIdentity');
    expect(testAiSource).not.toContain("upc: '00000000'");
    expect(testAiSource).toContain('Add both the structured Game Title and Platform to search PriceCharting without a UPC');
    expect(testAiSource).toContain('Select the exact edition — no PriceCharting price context until selected');
    expect(testAiSource).toContain('Single exact match selected automatically');
    expect(testAiSource).toContain('PriceCharting game-price context only — it is not a completed sale and cannot enter Tradebilia valuation.');
  });


  it('makes the PriceCharting product page explicit and discloses an identity-only video-game response', () => {
    expect(testAiSource).toContain('Open full PriceCharting product page ↗');
    expect(testAiSource).toContain('Verified game identity; provider price details unavailable');
    expect(testAiSource).toContain('condition prices, sales volume, or separate Loose, CIB, New, Graded New, Box Only, and Manual Only sold-listing groups');
    expect(testAiSource).toContain('Tradebilia does not bypass PriceCharting access controls.');
    expect(testAiSource).toContain('PriceCharting identity context only — no condition-price, sales-volume, or historical-sale data was returned, and nothing can enter Tradebilia valuation.');
    expect(testAiSource).toContain('const hasPriceFields = priceEntries.length > 0;');
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
