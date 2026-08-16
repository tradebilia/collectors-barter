export type HistoricalTrendSale = {
  title: string;
  price?: number | string | null;
  currency?: string | null;
  date?: string | null;
  saleType?: string | null;
  marketplace?: string | null;
  recency: 'recent' | 'historical' | 'undated';
};

function formatSales(sales: HistoricalTrendSale[]): string {
  return sales.map((sale) => {
    const price = sale.price == null ? 'price unavailable' : `${sale.currency || 'USD'} ${sale.price}`;
    return `- ${sale.title} | ${sale.date || 'date unavailable'} | ${price} | ${sale.marketplace || 'marketplace unavailable'} | ${sale.saleType || 'sale type unavailable'}`;
  }).join('\n');
}

export function buildHistoricalTrendContext(sales?: HistoricalTrendSale[] | null): string | null {
  if (!sales?.length) return null;

  const recent = sales.filter((sale) => sale.recency === 'recent');
  const historical = sales.filter((sale) => sale.recency === 'historical');
  const undated = sales.filter((sale) => sale.recency === 'undated');
  const sections = [
    recent.length ? `RECENT RECORDS (within 12 months):\n${formatSales(recent)}` : null,
    historical.length ? `HISTORICAL RECORDS (older than 12 months):\n${formatSales(historical)}` : null,
    undated.length ? `UNDATED RECORDS:\n${formatSales(undated)}` : null,
  ].filter((section): section is string => Boolean(section));

  return [
    '130POINT COMPLETED-SALE TREND CONTEXT — QUALITATIVE ONLY',
    ...sections,
    'RULES: Use dated records only to discuss a possible long-term market direction, volatility, or collector demand. Do not calculate an average, median, price range, fair-value figure, trade-fairness result, or negotiation amount from these records. Do not treat an older, undated, different-grade, or different-variant record as a current comparable. If record matching or trend evidence is weak, mixed, or sparse, say so explicitly.',
  ].join('\n\n');
}
