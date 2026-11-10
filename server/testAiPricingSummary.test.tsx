import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TestAiPricingSummary, pricingBasisLabel, hasUsableTestAiPrimary, boundedTestAiSourceMessage } from '../client/src/components/TestAiPricingSummary';
import { buildMarketProfile, type MarketProfile } from './testAiComparableEngine';
import type { AnalysisSnapshot } from './testAiAnalysisSnapshot';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { sourceRequestDisplayData, sourceEvidenceStatus, sourceEvidenceMessage } from '../shared/testAiSourceDisplay';

const empty = buildMarketProfile({ title: 'Renderer fixture', category: 'coins' }, [], null, new Date('2026-11-09T01:00:00Z'));
function render(profiles: MarketProfile[], evidence: Array<AnalysisSnapshot['evidence'] | null | undefined> = []): string {
  return renderToStaticMarkup(createElement(TestAiPricingSummary, { items: profiles.map((profile, index) => ({
    label: index === 0 ? 'Item A' : 'Item B', item: { title: `Renderer fixture ${index}` }, profile, evidence: evidence[index],
  })) }));
}

function frozenEvidence(sourceStatuses: AnalysisSnapshot['evidence']['sourceStatuses'] = [], reviewFlags: string[] = []): AnalysisSnapshot['evidence'] {
  return { identityReadiness: null, sourceStatuses, reviewFlags,
    visualReview: { match: 0, roughMatch: 0, mismatch: 0, unreadable: 0, notReviewed: 0 },
    visualReviewPopulation: { population: 'normalized_submitted_attached_visual_status_observations',
      unit: 'submitted_intake_occurrence', coverage: 'submitted_intake_only', label: 'Synthetic submitted diagnostic fixture', provesExecutionOrIdentityApproval: false } };
}
function frozenSource(id: string, status: string, message: string | null = null): AnalysisSnapshot['evidence']['sourceStatuses'][number] {
  return { id, label: id, kind: 'market_completed', role: 'valuation_candidate', status, message };
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
    expect(html).toContain('Value cannot be established from the available data');
    expect(html).toContain('whitespace-normal break-words');
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

  it.each([0, 1])('keeps the independently supported opposite item when side %s has no primary value', (missingSide) => {
    const sales = { ...empty, primaryValue: 275, valuationBasis: 'market_sales' as const,
      currentWindowSaleCount: 6, valuationBasisReason: 'Six accepted current sales support sales-only value.' };
    const profiles = missingSide === 0 ? [empty, sales] : [sales, empty];
    const html = render(profiles);
    expect(html).toContain('$275');
    // The server reason may repeat the notice, so inspect the primary field itself.
    const cards = html.split('rounded-lg border border-emerald-700/50').slice(1);
    expect(cards[missingSide]).toContain('Value cannot be established from the available data</p>');
    expect(cards[1 - missingSide]).toContain('$275</p>');
    expect(cards[1 - missingSide]).not.toContain('Value cannot be established from the available data');
    expect(html).not.toContain('$0');
  });

  it.each([null, undefined, '', '100', false, 0, -1, NaN, Infinity])('rejects malformed or unusable primary %s without numeric coercion', (value) => {
    expect(hasUsableTestAiPrimary(value)).toBe(false);
    const html = render([{ ...empty, primaryValue: value as number | null }]);
    expect(html).toContain('Value cannot be established from the available data</p>');
    expect(html).not.toContain('$0');
    expect(html).not.toContain('$NaN');
    expect(html).not.toContain('$Infinity');
  });

  it('renders frozen failed, partial, idle, and rejected-guide facts together with sparse known sales', () => {
    const profile = { ...empty, currentWindowSaleCount: 2,
      valuationBasisReason: 'Two accepted current sales are below the category minimum; evidence is sparse.' };
    const evidence = frozenEvidence([
      frozenSource('Sold-Comps', 'error', 'Source request failed.'),
      frozenSource('Auction archive', 'partial', 'Two known sale rows were retained after an unreadable attempt.'),
      frozenSource('PCGS', 'idle', 'Not searched: certification prerequisites are missing.'),
      frozenSource('PriceCharting', 'not_found', 'Guide fallback not verified: exact grade quote was rejected.'),
    ], ['Numista candidate rejected: target denomination does not match.']);
    Object.freeze(evidence.sourceStatuses);
    Object.freeze(evidence);
    const html = render([profile], [evidence]);
    expect(html).toContain('Value cannot be established from the available data');
    expect(html).toContain('Two accepted current sales are below the category minimum');
    expect(html).toContain('Current accepted sales: 2');
    expect(html).toContain('could not be checked');
    expect(html).toContain('known observations are retained');
    expect(html).toContain('unreadable responses are not zero matches');
    expect(html).toContain('not searched or not completed');
    expect(html).toContain('certification prerequisites are missing');
    expect(html).toContain('exact grade quote was rejected');
    expect(html).toContain('target denomination does not match');
    expect(html).not.toMatch(/no sales exist|all sources were searched|worthless/i);
  });

  it('distinguishes unresolved selection from an empty lookup and missing coverage from a completed search', () => {
    const unresolved = render([empty], [frozenEvidence([
      frozenSource('Card identity', 'not_found', 'Unresolved review or selection; select the correct variant.'),
    ])]);
    expect(unresolved).toContain('unresolved review or selection, not a completed empty lookup');
    expect(unresolved).not.toContain('no record returned for this analysis lookup');
    const omitted = render([empty], [frozenEvidence([], ['Guide rejected because provenance was not verified.'])]);
    expect(omitted).toContain('Source coverage was not included in this analysis');
    expect(omitted).toContain('provenance was not verified');
    expect(omitted).not.toContain('reported result available');
  });

  it('uses only frozen evidence rather than a subsequent browser source summary', () => {
    const browser = normalizeTestAiEvidence({ title: 'Renderer fixture', category: 'coins' }, [{
      id: 'Sold-Comps', label: 'Sold-Comps', kind: 'market_completed', status: 'error', message: 'Frozen failed retrieval.',
    }]);
    const evidence = frozenEvidence(browser.sources.map((source) => ({ ...source, message: source.message ?? null })));
    browser.sources[0] = { ...browser.sources[0], status: 'success', message: 'New browser run completed successfully.' };
    const html = render([empty], [evidence]);
    expect(html).toContain('Frozen failed retrieval.');
    expect(html).not.toContain('New browser run completed successfully.');
    expect(html).not.toContain('reported result available');
  });

  it('retains genuine partial rows through the existing failure wrapper and frozen source summary', () => {
    const row = { saleId: 'synthetic-sale', title: 'Known fixture', price: 250 };
    const packet = sourceRequestDisplayData({ sales: [row], status: 'success' }, true)!;
    expect(packet.sales[0]).toBe(row);
    const html = render([empty], [frozenEvidence([
      frozenSource('Auction archive', sourceEvidenceStatus(packet), sourceEvidenceMessage(packet)),
    ])]);
    expect(html).toContain('partial/error retrieval');
    expect(html).toContain('known observations are retained');
    expect(html).toContain('not zero matches');
  });

  it.each(['market_sales', 'guide_fallback'] as const)('preserves an established %s value despite a separate failed source', (basis) => {
    const profile: MarketProfile = { ...empty, primaryValue: 450, valuationBasis: basis,
      currentWindowSaleCount: basis === 'market_sales' ? 6 : 1,
      guideAnchorValue: basis === 'guide_fallback' ? 450 : null, guideAnchorSourceLabel: 'PriceCharting', guideAnchorGrade: 'MS65',
      guideAnchorMatchType: 'exact', guideProvisional: basis === 'guide_fallback',
      valuationBasisReason: basis === 'market_sales' ? 'Sufficient accepted current sales.' : 'Verified applicable Coin guide fallback.' };
    const html = render([profile], [frozenEvidence([frozenSource('Other archive', 'error')])]);
    expect(html).toContain('$450');
    expect(html).toContain('Other archive: could not be checked');
    expect(html).not.toContain('Value cannot be established from the available data');
    expect(html).toContain(basis === 'market_sales' ? 'Recent comparable sales' : 'Guide fallback — limited market evidence');
  });

  it('bounds and sanitizes warning text without serializing error objects or replacing missing range endpoints', () => {
    const message = boundedTestAiSourceMessage('Guide rejected.\n<script>provider text</script> https://synthetic.invalid/?token=private', { message: 'raw error object' });
    expect(message).toContain('Guide rejected.');
    expect(message).not.toMatch(/<script>|token=private|raw error object/);
    expect(boundedTestAiSourceMessage('x'.repeat(1000))?.length).toBe(600);
    const html = render([empty], [frozenEvidence([frozenSource('Guide source', 'error', message)])]);
    expect(html).toContain('Observed current-sale range: Not verified');
    expect(html).not.toContain('Observed current-sale range: Value cannot');
  });

  it('wires both final cards to frozen snapshots and preserves the existing stable source-summary and full-intake audit seams', () => {
    const source = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');
    expect(source).toContain('evidence: result.leftAnalysisSnapshot?.evidence');
    expect(source).toContain('evidence: result.rightAnalysisSnapshot?.evidence');
    expect(source).not.toContain('profile: result.leftMarketProfile, evidenceSummary: leftEvidenceSummary');
    expect(source).not.toContain('profile: result.rightMarketProfile, evidenceSummary: rightEvidenceSummary');
    expect(source).toContain('!profile.comparables.length');
    expect(source).toContain('No submitted comparable records.');
    expect(source).not.toContain('No individual comparable records were returned.');
    expect(source).toContain('hasUsableTestAiPrimary(profile.primaryValue)');
    expect(source).toContain('const summary = useMemo(() =>');
    expect(source).toContain('useTestAiContentState<NormalizedEvidenceSummary | null>');
    expect(source).toContain('useTestAiSourceDisplayData(query.data, Boolean(query.error))');
    expect(source).toContain('useSourceOutcomeData(leftTheCardApiQuery');
    expect(source).toContain('useSourceOutcomeData(rightTheCardApiQuery');
    expect(source).toContain('useSourceOutcomeData(priceChartingCoinQuery');
    expect(source).toContain('useSourceOutcomeData(numistaQuery');
    expect(source).toContain('useTestAiSourceDisplayData(lookup.data, Boolean(lookup.error))');
    expect(source).toContain('data.guideWarnings.slice(0, 3)');
    expect(source).toContain('Not searched or not completed.');
    expect(source).not.toContain("status === 'idle' ? 'checking'");
  });

  it('never infers pricing basis from candidate counts or unknown legacy state', () => {
    expect(pricingBasisLabel(undefined)).toBe('Insufficient evidence');
    expect(pricingBasisLabel('market_sales')).toBe('Recent comparable sales');
    expect(pricingBasisLabel('guide_fallback')).toBe('Guide fallback — limited market evidence');
  });
});


describe('Step B omitted guide field regression', () => {
  it.each([undefined, null, NaN, Infinity, 0, -1])('omits the nonexistent guide reference for %s', (value) => {
    const html = render([{ ...empty, guideAnchorValue: value } as MarketProfile]);
    expect(html).not.toContain('Verified guide');
    expect(html).not.toContain('Guide reference:');
    expect(html).toContain('Value cannot be established from the available data');
  });
});
