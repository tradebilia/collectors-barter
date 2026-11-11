export function isCurrentMarketContextSource(input: {
  sourceId?: string | null;
  role?: string | null;
  kind?: string | null;
  saleStatus?: string | null;
  priceBasis?: string | null;
}): boolean {
  return input.sourceId === 'ebay_active'
    || input.sourceId === 'ebay_active_listings'
    || input.role === 'asking_price_context'
    || input.saleStatus === 'active'
    || input.priceBasis === 'asking';
}
