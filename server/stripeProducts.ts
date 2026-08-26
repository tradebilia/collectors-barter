/**
 * Centralized references for the two future Tradebilia Membership Stripe prices.
 * Values stay undefined until the project is connected to the matching Stripe
 * test account through Settings → Payment. No checkout is enabled from here.
 */
export const stripeMembershipPrices = {
  monthly: process.env.STRIPE_MEMBERSHIP_MONTHLY_PRICE_ID,
  annual: process.env.STRIPE_MEMBERSHIP_ANNUAL_PRICE_ID,
} as const;

export function hasStripeMembershipTestConfiguration() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      stripeMembershipPrices.monthly?.startsWith("price_") &&
      stripeMembershipPrices.annual?.startsWith("price_")
  );
}
