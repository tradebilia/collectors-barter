import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TestAiPricingSummary, pricingBasisLabel } from '../client/src/components/TestAiPricingSummary';
import { buildMarketProfile, type MarketProfile } from './testAiComparableEngine';

const empty = buildMarketProfile({ title: 'Renderer fixture', category: 'coins' }, [], null, new Date('2026-11-09T01:00:00Z'));
function render(profiles: MarketProfile[]): string {
  return renderToStaticMarkup(createElement(TestAiPricingSummary, { items: profiles.map((profile, index) => ({
    label: index === 0 ? 'Item A' : 'Item B', item: { title: `Renderer fixture ${index}` }, profile,
  })) }));
}

// Renderer-only profile states: pricing admission is covered by real engine/provenance tests.
describe('Stage 2 actual pricing-summary rendered presentation', () => {
  it('labels the same-page sales and guide estimates independently without blending', () => {
    const sales: MarketProfile = { ...empty, valuationBasis: 'market_sales', primaryValue: 105, currentWindowSaleCount: 5,
      valuationBasisReason: 'Sufficient current sales; use sales alone.', marketRange: { low: 100, mid: 105, high: 110, supported: true }, evidenceQuality: 'medium' };
    const guide: MarketProfile = { ...empty, valuationBasis: 'guide_fallback', primaryValue: 1200, guideAnchorValue: 1200,
      guideAnchorSourceLabel: 'PriceCharting', guideAnchorGrade: 'MS65', guideAnchorMatchType: 'exact', guideProvisional: true,
      valuationBasisReason: 'Guide fallback selected because market evidence is limited.' };
    const html = render([sales, guide]);
    expect(html).toContain('Item A');
    expect(html).toContain('Item B');
    expect(html).toContain('Recent comparable sales');
    expect(html).toContain('Guide fallback — limited market evidence');
    expect(html).toContain('Guide fallback estimate');
    expect(html).toContain('$105');
    expect(html).toContain('$1,200');
    expect(html).toContain('Grade MS65');
    expect(html).toContain('Cash guidance is withheld');
    expect(html).not.toMatch(/75%|25%|blended/);
  });

  it('renders insufficient evidence without disguising a missing value as zero or an active-market price', () => {
    const html = render([empty]);
    expect(html).toContain('Insufficient evidence');
    expect(html).toContain('Not verified');
    expect(html).not.toContain('$0');
    expect(html).not.toContain('Active market evidence supports');
  });

  it('distinguishes a preliminary observed range from an unsupported guide-based estimate', () => {
    const html = render([{ ...empty, valuationBasis: 'guide_fallback', primaryValue: 2000, guideAnchorValue: 2000,
      guideAnchorSourceLabel: 'Numista Coin Catalog', guideAnchorGrade: 'UNC', guideAnchorMatchType: 'mapped',
      marketRange: { low: 100, mid: 101, high: 102, supported: true }, currentWindowSaleCount: 3,
      valuationBasisReason: 'Three observed sales are below this category floor.' }]);
    expect(html).toContain('preliminary evidence only');
    expect(html).toContain('documented grade band');
    expect(html).toContain('Three observed sales are below this category floor.');
    expect(html).toContain('A guide estimate does not establish a supported market range.');
  });

  it('keeps a verified guide reference visibly separate when sales are sufficient', () => {
    const html = render([{ ...empty, valuationBasis: 'market_sales', primaryValue: 105, guideAnchorValue: 2000,
      guideAnchorSourceLabel: 'Numista Coin Catalog', guideAnchorGrade: 'UNC', guideAnchorMatchType: 'mapped',
      valuationBasisReason: 'Sales are sufficient.' }]);
    expect(html).toContain('Guide reference');
    expect(html).toContain('No guide contribution to the sale-based value.');
    expect(html).toContain('$105');
    expect(html).toContain('$2,000');
  });

  it('never infers pricing basis from candidate counts or unknown legacy state', () => {
    expect(pricingBasisLabel(undefined)).toBe('Insufficient evidence');
    expect(pricingBasisLabel('market_sales')).toBe('Recent comparable sales');
    expect(pricingBasisLabel('guide_fallback')).toBe('Guide fallback — limited market evidence');
  });
});
