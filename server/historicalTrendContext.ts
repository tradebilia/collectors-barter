export type HistoricalTrendSale = {
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  date?: string | null;
  marketplace?: string | null;
  originMarketplace?: string | null;
  sourceLabel?: string | null;
  sourceId?: string | null;
  recency?: 'recent' | 'extended' | 'historical' | 'undated' | null;
};

/** The actual qualitative prompt population, preserving the existing first-ten boundary. */
export function selectHistoricalTrendRecords<T extends HistoricalTrendSale>(sales: T[] | undefined): T[] {
  return (sales ?? []).slice(0, 10).filter((sale) => sale && typeof sale === 'object');
}

export function formatHistoricalTrendContext(label: string, sales: HistoricalTrendSale[] | undefined): string {
  const records = selectHistoricalTrendRecords(sales);
  if (!records.length) return `${label}: No historical-sale records were selected.`;
  const lines = records.map((sale) => {
    const bucket = sale.recency === 'recent' ? 'recent (≤12 months)' : sale.recency === 'extended' ? 'illiquid-market extension (12–24 months)' : sale.recency === 'historical' ? 'historical (>12 months)' : 'undated';
    const currency = typeof sale.currency === 'string' && sale.currency.trim() ? sale.currency.trim() : 'currency unavailable';
    const amount = sale.price == null ? 'price unavailable' : `${currency} ${sale.price}`;
    const source = [...new Set([sale.sourceLabel || sale.sourceId, sale.originMarketplace || sale.marketplace].filter(Boolean))].join(' / ') || 'marketplace unavailable';
    return `- [${bucket}] ${sale.date || 'date unavailable'} | ${amount} | ${source} | ${sale.title || 'untitled sale'}`;
  });
  return `${label} QUALITATIVE HISTORICAL TREND CONTEXT ONLY:\n${lines.join('\n')}\nDo not use these prices to calculate a current value, the value gap, trade fairness, or a negotiation amount. Use dated records only to discuss direction, market interest, volatility, and whether recency limits confidence.`;
}
