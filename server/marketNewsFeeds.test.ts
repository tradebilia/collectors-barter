import { describe, expect, it } from 'vitest';
import { getMarketNewsFeedRegistry, matchMarketNews, summarizeCategoryMarketNews, type MarketNewsItem } from './marketNewsFeeds';

describe('market news feed registry', () => {
  it('contains the initial RSS coverage without valuation sources', () => {
    const registry = getMarketNewsFeedRegistry();
    expect(registry.length).toBeGreaterThanOrEqual(10);
    expect(registry.some((feed) => feed.category === 'Sports Cards' && feed.url.includes('sportscollectorsdaily'))).toBe(true);
    expect(registry.some((feed) => feed.category === 'Pokemon / TCG' && feed.url.includes('pokebeach'))).toBe(true);
    expect(registry.every((feed) => feed.url.startsWith('https://'))).toBe(true);
  });
});

describe('market news matching', () => {
  const article = (title: string, category: MarketNewsItem['category'], matchedTerms: string[] = []): MarketNewsItem => ({
    id: title,
    title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    source: 'Test Feed',
    sourceType: 'specialist',
    category,
    publishedAt: '2026-09-23T00:00:00.000Z',
    excerpt: title,
    relevance: 'medium',
    matchScore: 0,
    evidenceType: 'specialist_context',
    valuationImpact: 'context_only',
    matchedTerms,
    significance: '',
  });

  it('matches category and item identity terms while rejecting unrelated articles', () => {
    const matches = matchMarketNews([
      article('Michael Jordan basketball card demand rises', 'Sports Cards'),
      article('New Nintendo game announced', 'Video Games'),
    ], { title: 'Michael Jordan 1986 Fleer basketball card', category: 'Sports Cards', itemType: 'Sports Card' });
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toContain('Michael Jordan');
    expect(matches[0].valuationImpact).toBe('context_only');
    expect(matches[0].relevance).toBe('high');
    expect(matches[0].significance).toContain('Michael Jordan 1986 Fleer basketball card');
    expect(matches[0].significance).toContain('not a valuation');
  });

  it('keeps Pokémon matching distinct from generic sports-card news', () => {
    const matches = matchMarketNews([
      article('Pokémon expansion release and promo cards announced', 'Pokemon / TCG'),
      article('Baseball card auction results', 'Sports Cards'),
    ], { title: 'Charizard Pokémon card', category: 'Pokemon', itemType: 'Single Card' });
    expect(matches).toHaveLength(1);
    expect(matches[0].category).toBe('Pokemon / TCG');
  });
});

describe('category market context', () => {
  const article = (title: string, category: MarketNewsItem['category']): MarketNewsItem => ({
    id: title,
    title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    source: 'Test Feed',
    sourceType: 'specialist',
    category,
    publishedAt: '2026-09-23T00:00:00.000Z',
    excerpt: title,
    relevance: 'high',
    matchScore: 3,
    evidenceType: 'industry_news',
    valuationImpact: 'context_only',
    matchedTerms: [],
    significance: '',
  });

  it('compares category direction without treating RSS as valuation evidence', () => {
    const summaries = summarizeCategoryMarketNews([
      article('Sports card demand surges with record auction results', 'Sports Cards'),
      article('Sports card market growth remains strong and premium', 'Sports Cards'),
      article('Comic market pullback continues as demand cools', 'Comics'),
      article('Comic prices falling amid weak sales and caution', 'Comics'),
    ], ['Sports Cards', 'Comics']);
    expect(summaries[0]).toMatchObject({ category: 'Sports Cards', signal: 'improving', positiveSignals: 4, negativeSignals: 0 });
    expect(summaries[1]).toMatchObject({ category: 'Comics', signal: 'softening', positiveSignals: 0, negativeSignals: 5 });
    expect(summaries.every((summary) => summary.rationale.includes('article'))).toBe(true);
  });
});
