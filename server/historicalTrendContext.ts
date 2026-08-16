export type HistoricalTrendSale = {
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  date?: string | null;
  marketplace?: string | null;
  recency?: 'recent' | 'historical' | 'undated' | null;
};

export function formatHistoricalTrendContext(label: string, sales: HistoricalTrendSale[] | undefined): string {
  const records = (sales ?? []).slice(0, 10).filter((sale) => sale && typeof sale === 'object');
  if (!records.length) return `${label}: No 130point historical-sale records were selected.`;
  const lines = records.map((sale) => {
    const bucket = sale.recency === 'recent' ? 'recent (≤12 months)' : sale.recency === 'historical' ? 'historical (>12 months)' : 'undated';
    const amount = sale.price == null ? 'price unavailable' : `${sale.currency || 'USD'} ${sale.price}`;
    return `- [${bucket}] ${sale.date || 'date unavailable'} | ${amount} | ${sale.marketplace || 'marketplace unavailable'} | ${sale.title || 'untitled sale'}`;
  });
  return `${label} 130POINT QUALITATIVE TREND CONTEXT ONLY:\n${lines.join('\n')}\nDo not use these prices to calculate a current value, the value gap, trade fairness, or a negotiation amount. Use dated records only to discuss direction, market interest, volatility, and whether recency limits confidence.`;
}
