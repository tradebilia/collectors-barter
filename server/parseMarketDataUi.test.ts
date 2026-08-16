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
    expect(testAiSource).toContain('Read-only completed trading-card sales across multiple marketplaces');
  });
});
