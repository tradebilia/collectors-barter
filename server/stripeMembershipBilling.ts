import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { membershipProviderEvents, userMemberships, users } from "../drizzle/schema";
import { requireDb } from "./db";
import { stripeMembershipPrices } from "./stripeProducts";

export type MembershipBillingTerm = "monthly" | "annual";

type CheckoutInput = {
  userId: number;
  billingTerm: MembershipBillingTerm;
  origin: string;
};

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey) : null;
}

function toMysqlDateTime(unixSeconds: number | null | undefined) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString().slice(0, 19).replace("T", " ") : null;
}

function getConfiguredPriceId(billingTerm: MembershipBillingTerm) {
  return billingTerm === "monthly" ? stripeMembershipPrices.monthly : stripeMembershipPrices.annual;
}

function stripeStatusToMembershipStatus(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") return "active" as const;
  if (status === "past_due" || status === "unpaid") return "past_due" as const;
  return "cancelled" as const;
}

function findBillingTerm(subscription: Stripe.Subscription): MembershipBillingTerm | "none" {
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId === stripeMembershipPrices.monthly) return "monthly";
  if (priceId === stripeMembershipPrices.annual) return "annual";
  return "none";
}

async function assertConfiguredTestPrice(stripe: Stripe, priceId: string) {
  const price = await stripe.prices.retrieve(priceId);
  if (price.livemode || !price.recurring) {
    throw new Error("Tradebilia Membership is not configured with a Stripe test recurring price.");
  }
}

export async function createMembershipTestCheckout(input: CheckoutInput) {
  const stripe = getStripeClient();
  const priceId = getConfiguredPriceId(input.billingTerm);
  if (!stripe || !priceId) throw new Error("Stripe sandbox Membership configuration is unavailable.");

  await assertConfiguredTestPrice(stripe, priceId);
  const db = await requireDb();
  const user = (await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1))[0];
  if (!user?.email) throw new Error("A verified account email is required before starting a Membership test Checkout.");

  const membership = (await db.select({ stripeCustomerId: userMemberships.stripeCustomerId })
    .from(userMemberships)
    .where(eq(userMemberships.userId, input.userId))
    .limit(1))[0];
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(membership?.stripeCustomerId ? { customer: membership.stripeCustomerId } : { customer_email: user.email }),
    client_reference_id: String(input.userId),
    metadata: {
      environment: "test",
      user_id: String(input.userId),
      customer_email: user.email,
      customer_name: user.name ?? "",
      membership_term: input.billingTerm,
    },
    subscription_data: {
      metadata: {
        environment: "test",
        user_id: String(input.userId),
        membership_term: input.billingTerm,
      },
    },
    allow_promotion_codes: true,
    success_url: `${input.origin}/account-settings?tab=membership&stripe_test=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/account-settings?tab=membership&stripe_test=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a test Checkout link.");
  return { url: session.url };
}

export async function createMembershipTestPortal(userId: number, origin: string) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe sandbox configuration is unavailable.");
  const db = await requireDb();
  const membership = (await db.select({ stripeCustomerId: userMemberships.stripeCustomerId })
    .from(userMemberships)
    .where(eq(userMemberships.userId, userId))
    .limit(1))[0];
  if (!membership?.stripeCustomerId) throw new Error("Complete a test Membership Checkout before opening the test customer portal.");
  const session = await stripe.billingPortal.sessions.create({
    customer: membership.stripeCustomerId,
    return_url: `${origin}/account-settings?tab=membership`,
  });
  return { url: session.url };
}

export async function recordVerifiedTestMembershipEvent(event: Stripe.Event) {
  if (event.livemode) return { status: "ignored" as const };
  const db = await requireDb();
  try {
    await db.insert(membershipProviderEvents).values({
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      processingStatus: "received",
    });
  } catch {
    return { status: "duplicate" as const };
  }

  try {
    const stripe = getStripeClient();
    if (!stripe) throw new Error("Stripe sandbox configuration is unavailable.");
    let subscription: Stripe.Subscription | null = null;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && typeof session.subscription === "string") {
        subscription = await stripe.subscriptions.retrieve(session.subscription);
      }
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      subscription = event.data.object as Stripe.Subscription;
    }

    if (!subscription) {
      await db.update(membershipProviderEvents).set({ processingStatus: "ignored", processedAt: new Date().toISOString().slice(0, 19).replace("T", " ") }).where(and(eq(membershipProviderEvents.provider, "stripe"), eq(membershipProviderEvents.providerEventId, event.id)));
      return { status: "ignored" as const };
    }

    const metadataUserId = Number(subscription.metadata.user_id);
    if (!Number.isInteger(metadataUserId) || metadataUserId <= 0) throw new Error("Stripe Membership subscription is missing its Tradebilia user reference.");
    const subscriptionData = subscription as Stripe.Subscription & { current_period_start?: number; current_period_end?: number };
    await db.update(userMemberships).set({
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      status: stripeStatusToMembershipStatus(subscription.status),
      billingTerm: findBillingTerm(subscription),
      currentPeriodStart: toMysqlDateTime(subscriptionData.current_period_start),
      currentPeriodEnd: toMysqlDateTime(subscriptionData.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
    }).where(eq(userMemberships.userId, metadataUserId));
    await db.update(membershipProviderEvents).set({ processingStatus: "processed", processedAt: new Date().toISOString().slice(0, 19).replace("T", " ") }).where(and(eq(membershipProviderEvents.provider, "stripe"), eq(membershipProviderEvents.providerEventId, event.id)));
    return { status: "processed" as const };
  } catch (error) {
    await db.update(membershipProviderEvents).set({ processingStatus: "failed", failureReason: error instanceof Error ? error.message.slice(0, 500) : "Stripe event processing failed" }).where(and(eq(membershipProviderEvents.provider, "stripe"), eq(membershipProviderEvents.providerEventId, event.id)));
    throw error;
  }
}
