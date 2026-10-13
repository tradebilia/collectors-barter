// The stated-value sanity range is intentionally reserved for genuinely
// high-value collectibles. It applies uniformly to every category only above
// the owner-approved $10,000 trade value, never as an identity substitute.
export const HIGH_VALUE_SOLD_COMP_TRADE_VALUE_THRESHOLD = 10_000;
export const HIGH_VALUE_SOLD_COMP_MIN_RATIO = 0.25;
export const HIGH_VALUE_SOLD_COMP_MAX_RATIO = 2.5;

export type SoldCompPriceSafetyStatus = 'inactive' | 'accepted' | 'too_low' | 'too_high' | 'invalid_price';

export type SoldCompPriceSafetyResult = {
  status: SoldCompPriceSafetyStatus;
  applies: boolean;
  statedTradeValue: number | null;
  soldPrice: number | null;
  minimumAcceptedPrice: number | null;
  maximumAcceptedPrice: number | null;
  reason: string | null;
};

function asFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/**
 * High-value protection for completed-sale evidence. It is intentionally
 * inactive at or below the threshold so ordinary lower-value items retain the
 * existing evidence behavior. When active, only 25%–250% of the stated trade
 * value can enter valuation; outliers remain visible as context evidence.
 */
export function evaluateSoldCompPriceSafety(
  statedTradeValueInput: unknown,
  soldPriceInput: unknown,
): SoldCompPriceSafetyResult {
  const statedTradeValue = asFiniteNumber(statedTradeValueInput);
  const soldPrice = asFiniteNumber(soldPriceInput);
  if (statedTradeValue === null || statedTradeValue <= HIGH_VALUE_SOLD_COMP_TRADE_VALUE_THRESHOLD) {
    return {
      status: 'inactive',
      applies: false,
      statedTradeValue,
      soldPrice,
      minimumAcceptedPrice: null,
      maximumAcceptedPrice: null,
      reason: null,
    };
  }

  const minimumAcceptedPrice = statedTradeValue * HIGH_VALUE_SOLD_COMP_MIN_RATIO;
  const maximumAcceptedPrice = statedTradeValue * HIGH_VALUE_SOLD_COMP_MAX_RATIO;
  if (soldPrice === null) {
    return {
      status: 'invalid_price',
      applies: true,
      statedTradeValue,
      soldPrice: null,
      minimumAcceptedPrice,
      maximumAcceptedPrice,
      reason: `high-value price safety gate: sold comp price is unavailable; retained as context only for a stated trade value of ${formatUsd(statedTradeValue)}`,
    };
  }
  if (soldPrice < minimumAcceptedPrice) {
    return {
      status: 'too_low',
      applies: true,
      statedTradeValue,
      soldPrice,
      minimumAcceptedPrice,
      maximumAcceptedPrice,
      reason: `high-value price safety gate: sold comp ${formatUsd(soldPrice)} is below 25% of the stated trade value ${formatUsd(statedTradeValue)} (${formatUsd(minimumAcceptedPrice)} minimum); retained as context only`,
    };
  }
  if (soldPrice > maximumAcceptedPrice) {
    return {
      status: 'too_high',
      applies: true,
      statedTradeValue,
      soldPrice,
      minimumAcceptedPrice,
      maximumAcceptedPrice,
      reason: `high-value price safety gate: sold comp ${formatUsd(soldPrice)} is above 250% of the stated trade value ${formatUsd(statedTradeValue)} (${formatUsd(maximumAcceptedPrice)} maximum); retained as context only`,
    };
  }

  return {
    status: 'accepted',
    applies: true,
    statedTradeValue,
    soldPrice,
    minimumAcceptedPrice,
    maximumAcceptedPrice,
    reason: null,
  };
}
