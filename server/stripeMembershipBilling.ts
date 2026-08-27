import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { membershipPlans, membershipProviderEvents, userMemberships, users } from "../drizzle/schema";
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

const DUPLICATE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due", "incomplete", "unpaid"]);
const ACTIVE_LOCAL_MEMBERSHIP_STATUSES = new Set(["active", "past_due", "unpaid"]);

async function assertNoExistingTestMembershipSubscription(stripe: Stripe, membership: { stripeCustomerId: string | null; stripeSubscriptionId: string | null; status: string } | undefined) {
  if (membership?.stripeSubscriptionId && ACTIVE_LOCAL_MEMBERSHIP_STATUSES.has(membership.status)) {
    throw new Error("A Tradebilia Membership subscription is already active or awaiting payment. Use the test customer portal before starting another Checkout.");
  }
  if (!membership?.stripeCustomerId) return;
  const subscriptions = await stripe.subscriptions.list({ customer: membership.stripeCustomerId, status: "all", limit: 100 });
  const hasBlockingMembership = subscriptions.data.some((subscription) =>
    !subscription.livemode &&
    DUPLICATE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
    findBillingTerm(subscription) !== "none",
  );
  if (hasBlockingMembership) {
    throw new Error("A Tradebilia Membership subscription is already active or awaiting payment. Use the test customer portal before starting another Checkout.");
  }
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

  const membership = (await db.select({ stripeCustomerId: userMemberships.stripeCustomerId, stripeSubscriptionId: userMemberships.stripeSubscriptionId, status: userMemberships.status })
    .from(userMemberships)
    .where(eq(userMemberships.userId, input.userId))
    .limit(1))[0];
  await assertNoExistingTestMembershipSubscription(stripe, membership);
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
  const eventWhere = and(eq(membershipProviderEvents.provider, "stripe"), eq(membershipProviderEvents.providerEventId, event.id));
  const existingEvent = (await db.select({ id: membershipProviderEvents.id }).from(membershipProviderEvents).where(eventWhere).limit(1))[0];
  if (existingEvent) return { status: "duplicate" as const };
  try {
    await db.insert(membershipProviderEvents).values({
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      processingStatus: "received",
    });
  } catch (error) {
    const concurrentEvent = (await db.select({ id: membershipProviderEvents.id }).from(membershipProviderEvents).where(eventWhere).limit(1))[0];
    if (concurrentEvent) return { status: "duplicate" as const };
    throw error;
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
      await db.update(membershipProviderEvents).set({ processingStatus: "ignored", processedAt: new Date().toISOString().slice(0, 19).replace("T", " ") }).where(eventWhere);
      return { status: "ignored" as const };
    }

    const metadataUserId = Number(subscription.metadata.user_id);
    if (!Number.isInteger(metadataUserId) || metadataUserId <= 0) throw new Error("Stripe Membership subscription is missing its Tradebilia user reference.");
    const billingTerm = findBillingTerm(subscription);
    if (billingTerm === "none") throw new Error("Stripe Membership subscription does not use a configured test price.");
    const existingMembership = (await db.select({ id: userMemberships.id }).from(userMemberships).where(eq(userMemberships.userId, metadataUserId)).limit(1))[0];
    if (!existingMembership) {
      const freeLaunchPlan = (await db.select({ id: membershipPlans.id }).from(membershipPlans).where(eq(membershipPlans.code, "free_launch")).limit(1))[0];
      if (!freeLaunchPlan) throw new Error("The Free Launch membership plan is unavailable.");
      try {
        await db.insert(userMemberships).values({ userId: metadataUserId, planId: freeLaunchPlan.id, status: "free_launch", billingTerm: "none" });
      } catch (error) {
        const concurrentMembership = (await db.select({ id: userMemberships.id }).from(userMemberships).where(eq(userMemberships.userId, metadataUserId)).limit(1))[0];
        if (!concurrentMembership) throw error;
      }
    }
    const subscriptionData = subscription as Stripe.Subscription & { current_period_start?: number; current_period_end?: number };
    const subscriptionItem = subscription.items.data[0];
    const updateResult = await db.update(userMemberships).set({
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      status: stripeStatusToMembershipStatus(subscription.status),
      billingTerm,
      currentPeriodStart: toMysqlDateTime(subscriptionItem?.current_period_start ?? subscriptionData.current_period_start),
      currentPeriodEnd: toMysqlDateTime(subscriptionItem?.current_period_end ?? subscriptionData.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
    }).where(eq(userMemberships.userId, metadataUserId));
    const affectedRows = Number((updateResult as any)[0]?.affectedRows ?? (updateResult as any).affectedRows ?? 0);
    if (affectedRows === 0) throw new Error("Stripe Membership event could not update the member record.");
    await db.update(membershipProviderEvents).set({ processingStatus: "processed", processedAt: new Date().toISOString().slice(0, 19).replace("T", " ") }).where(eventWhere);
    return { status: "processed" as const };
  } catch (error) {
    await db.update(membershipProviderEvents).set({ processingStatus: "failed", failureReason: error instanceof Error ? error.message.slice(0, 500) : "Stripe event processing failed" }).where(eventWhere);
    throw error;
  }
}
