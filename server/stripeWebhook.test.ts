import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const directory = dirname(fileURLToPath(import.meta.url));
const webhookSource = readFileSync(resolve(directory, "stripeWebhook.ts"), "utf8");
const serverSource = readFileSync(resolve(directory, "_core/index.ts"), "utf8");

describe("Stripe test webhook contract", () => {
  it("registers the raw verified webhook before JSON parsing", () => {
    expect(webhookSource).toContain('express.raw({ type: "application/json" })');
    expect(webhookSource).toContain("stripe.webhooks.constructEvent");
    expect(webhookSource).toContain('event.id.startsWith("evt_test_")');
    expect(webhookSource).toContain("return res.json({ verified: true })");
    expect(serverSource.indexOf("registerStripeWebhook(app)")).toBeLessThan(serverSource.indexOf("app.use(express.json"));
  });

  it("does not enable payment enforcement from the webhook endpoint", () => {
    expect(webhookSource).toContain("enforcement is inactive");
    expect(webhookSource).not.toContain("payment_method");
  });
});
