import { describe, expect, it } from 'vitest';
import { buildComicConnectSearchQueries, buildComicConnectSearchUrl, classifyComicConnectTimeWindow, computeComicConnectPriceMetrics, COMICCONNECT_MAX_RESULTS, parseComicConnectSoldHtml } from './comicConnectMarketData';

const input = { title: 'Edge of the Spider-Verse #2', category: 'comics', grade: '9.8', certificationCompany: 'CGC', itemDetails: JSON.stringify({ comicTitle: 'Edge of the Spider-Verse', issueNumber: '2', publisher: 'Marvel', facsimile: 'No', distributionType: 'Direct' }) };

const html = `
<div class="itempreview details listingbox"><div class="mainimg"><a href="/item/100"><img src="/coverimages/a.jpg" /></a></div><div class="titleline">EDGE OF THE SPIDER-VERSE #2</div><div class="grade">Marvel CGC NM/M: 9.8</div><div class="comments wrap">First appearance</div><div class="endednotice">Sold on Tuesday, 01/02/2024 2:00 PM</div><div class="pricing"><span class="val prc">$125</span></div></div>
<div class="itempreview details listingbox"><div class="mainimg"><a href="/item/101"><img src="/coverimages/b.jpg" /></a></div><div class="titleline">EDGE OF THE SPIDER-VERSE #2 FACSIMILE</div><div class="grade">Marvel CGC NM/M: 9.8</div><div class="endednotice">Sold on Tuesday, 01/02/2024 2:00 PM</div><div class="pricing"><span class="val prc">$20</span></div></div>
<div class="itempreview details listingbox"><div class="titleline">EDGE OF THE SPIDER-VERSE #2</div><div class="grade">Marvel CGC NM/M: 9.4</div><div class="endednotice">Sold on Tuesday, 01/02/2024 2:00 PM</div><div class="pricing"><span class="val prc">$40</span></div></div>`;

describe('ComicConnect bounded sold adapter', () => {
  it('builds a sold-only one-page request capped at 20 records', () => {
    const request = buildComicConnectSearchUrl(input);
    expect(request.url).toContain('filtertype=Sold');
    expect(request.url).toContain('show_sold_search=1');
    expect(request.url).toContain(`perpage=${COMICCONNECT_MAX_RESULTS}`);
    expect(request.query).toBe('Edge of the Spider-Verse #2');
    expect(request.query).not.toContain('CGC');
    expect(request.query).not.toContain('9.8');
  });

  it('builds bounded fallback queries without assuming every title has the same article behavior', () => {
    expect(buildComicConnectSearchQueries({ ...input, itemDetails: JSON.stringify({ comicTitle: 'The Amazing Spider-Man', issueNumber: '238' }) })).toEqual([
      'The Amazing Spider-Man #238',
      'Amazing Spider-Man 238',
      'Amazing Spider Man 238',
    ]);
  });

  it('classifies sales into current, extended, historical, and undated windows', () => {
    const reference = new Date('2026-09-29T12:00:00Z');
    expect(classifyComicConnectTimeWindow('2026-01-01T12:00:00Z', reference)).toBe('current_12_months');
    expect(classifyComicConnectTimeWindow('2024-09-29T12:00:00Z', reference)).toBe('extended_12_to_36_months');
    expect(classifyComicConnectTimeWindow('2022-01-01T12:00:00Z', reference)).toBe('historical_over_36_months');
    expect(classifyComicConnectTimeWindow('not a date', reference)).toBe('undated');
    expect(classifyComicConnectTimeWindow(null, reference)).toBe('undated');
  });

  it('computes deterministic average, median, and min-to-max price context', () => {
    expect(computeComicConnectPriceMetrics([{ price: 125 }, { price: 40 }, { price: 75 }, { price: null }])).toEqual({ count: 3, avg: 80, median: 75, min: 40, max: 125 });
  });

  it('treats equivalent decimal grade formatting as a match', () => {
    const equivalentHtml = '<div class="itempreview"><div class="titleline">EDGE OF THE SPIDER-VERSE #2</div><div class="grade">Marvel CGC NM/M: 9.8</div><div class="endednotice">Sold on Tuesday, 01/02/2024 2:00 PM</div><div class="pricing"><span class="val prc">$125</span></div></div>';
    const result = parseComicConnectSoldHtml(equivalentHtml, { ...input, grade: '9.80' });
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0].exclusionReason).toContain('buyer-premium');
  });

  it('parses records, keeps only identity-matched completed records in sales, and preserves exclusions as context', () => {
    const result = parseComicConnectSoldHtml(html, input);
    expect(result.status).toBe('success');
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0].price).toBe(125);
    expect(result.sales[0].currency).toBe('USD');
    expect(result.sales[0].valuationEligible).toBe(false);
    expect(result.context).toHaveLength(2);
    expect(result.context.some((record) => record.title.includes('FACSIMILE'))).toBe(true);
    expect(result.context.some((record) => record.exclusionReason?.includes('Grade conflict'))).toBe(true);
    expect(result.priceMetrics).toEqual({ count: 1, avg: 125, median: 125, min: 125, max: 125 });
    expect(result.currentPriceMetrics.count).toBe(0);
  });

  it('does not apply to non-comic categories', () => {
    const result = parseComicConnectSoldHtml(html, { ...input, category: 'sports_cards' });
    expect(result.status).toBe('not_applicable');
    expect(result.sales).toHaveLength(0);
  });
});
