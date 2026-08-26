import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey) : null;
}

/**
 * Registers before express.json() so Stripe signature verification receives the
 * original request bytes. The endpoint is deliberately test-only at this stage:
 * it verifies signed events but never changes membership access or billing state.
 */
export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), (req: Request, res: Response) => {
    const stripe = getStripeClient();
    const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"];

    if (!stripe || !signingSecret || typeof signature !== "string") {
      return res.status(503).json({ error: "Stripe test webhook is not configured." });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, signature, signingSecret);
    } catch (error) {
      console.warn("[StripeWebhook] Signature verification failed", error instanceof Error ? error.message : "unknown error");
      return res.status(400).json({ error: "Invalid Stripe signature." });
    }

    // Stripe Dashboard's verification probe must receive this exact response.
    if (event.id.startsWith("evt_test_")) {
      console.info("[StripeWebhook] Test event verified", { type: event.type, id: event.id });
      return res.json({ verified: true });
    }

    // Live payment handling remains intentionally inactive until Rich approves
    // a separate activation stage. Do not store raw payloads or card data.
    console.info("[StripeWebhook] Verified event received while enforcement is inactive", {
      type: event.type,
      id: event.id,
      created: event.created,
    });
    return res.json({ received: true });
  });
}
