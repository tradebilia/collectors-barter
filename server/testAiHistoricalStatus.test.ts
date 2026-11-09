import { describe, expect, it } from 'vitest';
import { formatHistoricalTrendContext, selectHistoricalTrendRecords } from './historicalTrendContext';

describe('Stage 5 actual qualitative historical prompt population', () => {
  it('preserves actual object membership, order and the unchanged first-ten limit', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ title: `Historical ${index}`, price: index + 10, currency: 'USD', marketplace: index % 2 ? 'PCGS' : 'eBay', recency: 'historical' as const }));
    const selected = selectHistoricalTrendRecords(rows);
    expect(selected).toEqual(rows.slice(0, 10));
    expect(selected.every((row, index) => row === rows[index])).toBe(true);
    const prompt = formatHistoricalTrendContext('ITEM A', rows);
    expect(prompt).toContain('Historical 9');
    expect(prompt).not.toContain('Historical 10');
    expect(prompt).not.toContain('Historical 11');
    expect(prompt).not.toContain('130POINT');
    expect(prompt).toContain('Do not use these prices to calculate a current value');
    expect(rows).toHaveLength(12);
  });

  it('reports actual mixed source and currency facts without treating context as USD sales', () => {
    const prompt = formatHistoricalTrendContext('ITEM B', [
      { title: 'Canadian context', price: 100, currency: 'CAD', marketplace: 'PCGS', recency: 'historical' },
      { title: 'Unknown currency', price: 80, sourceLabel: 'Auction archive', recency: 'extended' },
      { title: 'Named source', price: null, sourceId: 'archive', recency: 'undated' },
    ]);
    expect(prompt).toContain('CAD 100 | PCGS | Canadian context');
    expect(prompt).toContain('currency unavailable 80 | Auction archive | Unknown currency');
    expect(prompt).toContain('price unavailable | archive | Named source');
    expect(prompt).not.toContain('USD');
  });

  it('does not refill the first-ten window when an invalid record is encountered', () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({ title: `Row ${index}` }));
    const input = [null, ...rows] as unknown as typeof rows;
    const selected = selectHistoricalTrendRecords(input);
    expect(selected).toHaveLength(9);
    expect(selected.at(-1)).toBe(rows[8]);
    expect(formatHistoricalTrendContext('ITEM A', input)).not.toContain('Row 9');
  });

  it('retains separate context observations even when title and amount match', () => {
    const a = { title: 'Same item', price: 100, currency: 'USD', marketplace: 'eBay' };
    const b = { ...a };
    const selected = selectHistoricalTrendRecords([a, b]);
    expect(selected).toHaveLength(2);
    expect(selected[0]).toBe(a);
    expect(selected[1]).toBe(b);
  });

  it('uses a source-neutral empty-population label', () => {
    expect(selectHistoricalTrendRecords(undefined)).toEqual([]);
    expect(formatHistoricalTrendContext('ITEM A', undefined)).toBe('ITEM A: No historical-sale records were selected.');
  });
});
