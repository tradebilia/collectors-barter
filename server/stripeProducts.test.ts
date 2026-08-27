import { describe, expect, it } from "vitest";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
const monthlyPriceId = process.env.STRIPE_MEMBERSHIP_MONTHLY_PRICE_ID;
const annualPriceId = process.env.STRIPE_MEMBERSHIP_ANNUAL_PRICE_ID;
const testWithStripeConfiguration = secretKey && monthlyPriceId && annualPriceId ? it : it.skip;

describe("Tradebilia Stripe test Membership prices", () => {
  testWithStripeConfiguration("retrieves the configured test prices read-only and confirms the agreed recurring terms", async () => {
    expect(secretKey).toBeTruthy();
    expect(monthlyPriceId).toMatch(/^price_/);
    expect(annualPriceId).toMatch(/^price_/);

    const stripe = new Stripe(secretKey!);
    const [monthly, annual] = await Promise.all([
      stripe.prices.retrieve(monthlyPriceId!),
      stripe.prices.retrieve(annualPriceId!),
    ]);

    expect(monthly.livemode).toBe(false);
    expect(annual.livemode).toBe(false);
    expect(monthly.unit_amount).toBe(100);
    expect(annual.unit_amount).toBe(1000);
    expect(monthly.currency).toBe("usd");
    expect(annual.currency).toBe("usd");
    expect(monthly.recurring?.interval).toBe("month");
    expect(annual.recurring?.interval).toBe("year");
  });
});
