/**
 * Server adapter boundary only, before canonical sealing. Never call this on
 * browser claims to authorize money. Contract: https://sold-comps.com/docs
 * Unhydrated bestOfferAccepted soldPrice is the asking-price upper bound.
 */
export const SOLD_COMPS_OFFER_AMOUNT_UNVERIFIED = 'The seller accepted a Best Offer, but Sold-Comps did not verify the accepted amount; the displayed price is an asking-price upper bound, not a confirmed sale price.';
export const SOLD_COMPS_OFFER_AMOUNT_VERIFIED = 'Best Offer accepted amount was verified by Sold-Comps price hydration.';
const positive = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string' || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const currency = (value: unknown) => typeof value === 'string' ? value.trim().toUpperCase() : '';
export function applyAutographSoldCompsOfferPricePolicy<T extends Record<string, any>>(row: T): T {
  if (row.bestOfferAccepted !== true) return row;
  const accepted = positive(row.boaAcceptedPrice);
  const reported = positive(row.soldPrice ?? row.price);
  // Provider performs the replacement only in matching currency. Do not
  // substitute/convert a mismatched amount or add shipping, tax, or fees.
  const verified = row.boaHydrated === true && accepted !== null && reported === accepted
    && /^[A-Z]{3}$/.test(currency(row.soldCurrency ?? row.currency))
    && currency(row.boaAcceptedCurrency) === currency(row.soldCurrency ?? row.currency);
  const reasons = Array.isArray(row.evidenceReasons) ? row.evidenceReasons : [];
  return { ...row,
    ...(!verified ? { valuationEligible: false, evidenceDisposition: 'context_only' } : {}),
    evidenceReasons: [...reasons, verified ? SOLD_COMPS_OFFER_AMOUNT_VERIFIED : SOLD_COMPS_OFFER_AMOUNT_UNVERIFIED],
  };
}
