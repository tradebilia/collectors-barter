import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { adminActivityLog, billingSettings, membershipFeatures, membershipPlanFeatures, membershipPlans, userMemberships, userProfiles, users } from "../drizzle/schema";
import { requireDb } from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { verifyPassword } from "./_core/auth";
import { createMembershipTestCheckout, createMembershipTestPortal } from "./stripeMembershipBilling";

export const FREE_LAUNCH_BILLING_MODE = "free_launch" as const;
export const FREE_LAUNCH_PLAN_CODE = "free_launch" as const;
export const TRADEBILIA_MEMBERSHIP_PLAN_CODE = "tradebilia_membership" as const;

export const FUTURE_SUBSCRIPTION_PAYMENT_TERMS = [
  { code: "monthly", label: "Monthly", priceCents: 100, displayPrice: "$1 per month" },
  { code: "annual", label: "Annual", priceCents: 1000, displayPrice: "$10 per year" },
] as const;

type MembershipStatus = "free_launch" | "active" | "past_due" | "cancelled" | "complimentary" | "unpaid";

function isFutureDate(value: string | null | undefined) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

export function hasMembershipAccess(status: MembershipStatus | null | undefined, paymentGraceEndsAt?: string | null) {
  return status === "active" || status === "complimentary" || (status === "past_due" && isFutureDate(paymentGraceEndsAt));
}

export function buildBillingSummary(settings?: { billingMode: string; paymentEnforcementEnabled: number } | null) {
  const freeLaunchOverride = settings?.billingMode === FREE_LAUNCH_BILLING_MODE || !settings?.paymentEnforcementEnabled;
  const feeModeEnabled = settings?.billingMode === "membership_required";
  return {
    billingMode: settings?.billingMode ?? FREE_LAUNCH_BILLING_MODE,
    feeModeEnabled,
    freeLaunchOverride,
    stripeBillingEnabled: false,
    checkoutAvailable: false,
    cardCollectionAvailable: false,
    paymentRequired: false,
    paymentEnforcementEnabled: false,
    futureSubscriptionTerms: FUTURE_SUBSCRIPTION_PAYMENT_TERMS,
    statusLabel: feeModeEnabled ? "Fee Mode On — launch control only" : freeLaunchOverride ? "Free Launch Access" : "Membership model prepared",
    statusMessage: freeLaunchOverride
      ? feeModeEnabled
        ? "Fee Mode is recorded as On, but checkout, card collection, and payment enforcement remain inactive until a separately approved launch-readiness activation."
        : "No credit card is required. All current Tradebilia features are available at no charge during the Free Launch."
      : "Payment enforcement is intentionally inactive. Checkout, card collection, and charges remain unavailable.",
  };
}

async function getSettings() {
  const db = await requireDb();
  return (await db.select().from(billingSettings).orderBy(asc(billingSettings.id)).limit(1))[0] ?? null;
}

async function getPlan(code: typeof FREE_LAUNCH_PLAN_CODE | typeof TRADEBILIA_MEMBERSHIP_PLAN_CODE) {
  const db = await requireDb();
  const plan = (await db.select().from(membershipPlans).where(eq(membershipPlans.code, code)).limit(1))[0];
  if (!plan) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The required Tradebilia membership plan is unavailable." });
  return plan;
}

async function getMembership(userId: number) {
  const db = await requireDb();
  return (await db.select({ membership: userMemberships, plan: membershipPlans })
    .from(userMemberships)
    .innerJoin(membershipPlans, eq(userMemberships.planId, membershipPlans.id))
    .where(eq(userMemberships.userId, userId))
    .limit(1))[0] ?? null;
}

export async function getOrCreateFreeLaunchMembership(userId: number) {
  const existing = await getMembership(userId);
  if (existing) return existing;
  const db = await requireDb();
  const freePlan = await getPlan(FREE_LAUNCH_PLAN_CODE);
  try {
    await db.insert(userMemberships).values({ userId, planId: freePlan.id, status: "free_launch", billingTerm: "none" });
  } catch (error) {
    const concurrent = await getMembership(userId);
    if (concurrent) return concurrent;
    throw error;
  }
  const created = await getMembership(userId);
  if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Membership access could not be prepared." });
  return created;
}

export async function getSubscriptionAccessPolicy(userId: number | null) {
  const billing = buildBillingSummary(await getSettings());
  if (billing.freeLaunchOverride) return { ...billing, hasSubscriptionAccess: true, membershipStatus: userId ? "free_launch" : null };
  if (!userId) return { ...billing, hasSubscriptionAccess: false, membershipStatus: null };
  const row = await getMembership(userId);
  const membershipStatus = (row?.membership.status ?? "unpaid") as MembershipStatus;
  return { ...billing, hasSubscriptionAccess: hasMembershipAccess(membershipStatus, row?.membership.paymentGraceEndsAt), membershipStatus };
}

export async function assertSubscriptionAccess(userId: number | null) {
  const policy = await getSubscriptionAccessPolicy(userId);
  if (!policy.hasSubscriptionAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Tradebilia Membership is required for this page." });
  return policy;
}

export async function getMyMembershipStatus(userId: number) {
  const [settings, row] = await Promise.all([getSettings(), getOrCreateFreeLaunchMembership(userId)]);
  const db = await requireDb();
  const grants = await db.select({ featureKey: membershipFeatures.featureKey, name: membershipFeatures.name, description: membershipFeatures.description, category: membershipFeatures.category, planEnabled: membershipPlanFeatures.isEnabled })
    .from(membershipFeatures)
    .leftJoin(membershipPlanFeatures, and(eq(membershipPlanFeatures.featureId, membershipFeatures.id), eq(membershipPlanFeatures.planId, row.plan.id)))
    .orderBy(asc(membershipFeatures.sortOrder));
  const billing = buildBillingSummary(settings);
  const status = row.membership.status as MembershipStatus;
  return {
    billing,
    membership: { planCode: row.plan.code, planName: status === "complimentary" ? "Complimentary Membership" : row.plan.name, status, billingTerm: row.membership.billingTerm, isComplimentary: status === "complimentary", currentPeriodEnd: row.membership.currentPeriodEnd, paymentGraceEndsAt: row.membership.paymentGraceEndsAt, cancelAtPeriodEnd: Boolean(row.membership.cancelAtPeriodEnd) },
    entitlements: grants.map((grant) => ({ ...grant, granted: billing.freeLaunchOverride || (hasMembershipAccess(status, row.membership.paymentGraceEndsAt) && Boolean(grant.planEnabled)), source: billing.freeLaunchOverride ? "free_launch_override" : "membership_plan" })),
  };
}

export async function getBillingOverview() {
  const db = await requireDb();
  const [settings, plans, features, mappings] = await Promise.all([
    getSettings(),
    db.select().from(membershipPlans).where(inArray(membershipPlans.code, [FREE_LAUNCH_PLAN_CODE, TRADEBILIA_MEMBERSHIP_PLAN_CODE])).orderBy(asc(membershipPlans.sortOrder)),
    db.select().from(membershipFeatures).orderBy(asc(membershipFeatures.sortOrder)),
    db.select().from(membershipPlanFeatures),
  ]);
  const mapping = new Map(mappings.map((row) => [`${row.planId}:${row.featureId}`, row]));
  return { billing: buildBillingSummary(settings), plans: plans.map((plan) => ({ id: plan.id, code: plan.code, name: plan.name, isFreeLaunch: Boolean(plan.isFreeLaunch), isActive: Boolean(plan.isActive) })), features: features.map((feature) => ({ id: feature.id, featureKey: feature.featureKey, name: feature.name, description: feature.description })), matrix: plans.flatMap((plan) => features.map((feature) => ({ planId: plan.id, featureId: feature.id, isEnabled: Boolean(mapping.get(`${plan.id}:${feature.id}`)?.isEnabled), limitValue: mapping.get(`${plan.id}:${feature.id}`)?.limitValue ?? null, effectiveAtLaunch: true }))) };
}

async function getAdministrationMembers() {
  const db = await requireDb();
  const rows = await db.select({ userId: users.id, username: users.username, email: users.email, accountDisplayName: users.displayName, accountName: users.name, profileDisplayName: userProfiles.displayName, membershipStatus: userMemberships.status, billingTerm: userMemberships.billingTerm, planCode: membershipPlans.code, planName: membershipPlans.name })
    .from(users).leftJoin(userProfiles, eq(userProfiles.userId, users.id)).leftJoin(userMemberships, eq(userMemberships.userId, users.id)).leftJoin(membershipPlans, eq(membershipPlans.id, userMemberships.planId)).orderBy(asc(users.id));
  return rows.map((row) => ({ userId: row.userId, displayName: row.profileDisplayName || row.accountDisplayName || row.accountName || row.username || `Collector ${row.userId}`, email: row.email ?? null, membershipStatus: row.membershipStatus ?? "free_launch", billingTerm: row.billingTerm ?? "none", isComplimentary: row.membershipStatus === "complimentary", planCode: row.planCode ?? FREE_LAUNCH_PLAN_CODE, planName: row.membershipStatus === "complimentary" ? "Complimentary Membership" : row.planName ?? "Free Launch Access" }));
}

function requireAdministrator(role: string | null | undefined) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can manage membership configuration." });
}

function getSafeRequestOrigin(req: { protocol: string; headers: Record<string, string | string[] | undefined>; get?: (name: string) => string | undefined }) {
  const host = req.get?.("host") ?? req.headers.host;
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : null;
  if (origin && host) {
    try {
      if (new URL(origin).host === host) return origin;
    } catch {
      // Fall through to the current request origin.
    }
  }
  if (!host || typeof host !== "string") throw new TRPCError({ code: "BAD_REQUEST", message: "A valid Tradebilia request origin is required for Stripe test Checkout." });
  return `${req.protocol}://${host}`;
}

export const membershipRouter = router({
  getAccessPolicy: publicProcedure.query(({ ctx }) => getSubscriptionAccessPolicy(ctx.user?.id ?? null)),
  getMyStatus: protectedProcedure.query(({ ctx }) => getMyMembershipStatus(ctx.user.id)),
});

export const billingRouter = router({
  getOverview: protectedProcedure.query(({ ctx }) => { requireAdministrator(ctx.user.role); return getBillingOverview(); }),
  getMembers: protectedProcedure.query(({ ctx }) => { requireAdministrator(ctx.user.role); return getAdministrationMembers(); }),
  updatePlanFeature: protectedProcedure.input(z.object({ planId: z.number().int().positive(), featureId: z.number().int().positive(), isEnabled: z.boolean(), limitValue: z.number().int().nonnegative().nullable() })).mutation(async ({ ctx, input }) => {
    requireAdministrator(ctx.user.role);
    const db = await requireDb();
    await db.update(membershipPlanFeatures).set({ isEnabled: input.isEnabled ? 1 : 0, limitValue: input.limitValue }).where(and(eq(membershipPlanFeatures.planId, input.planId), eq(membershipPlanFeatures.featureId, input.featureId)));
    return { success: true };
  }),
  updateFeeMode: protectedProcedure
    .input(z.object({ enabled: z.boolean(), currentPassword: z.string().min(1).max(200), confirmationPhrase: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.user.role);
      const expectedPhrase = input.enabled ? "ENABLE TRADEBILIA FEE MODE" : "DISABLE TRADEBILIA FEE MODE";
      if (input.confirmationPhrase.trim() !== expectedPhrase) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Type exactly: ${expectedPhrase}` });
      }

      const db = await requireDb();
      const [administrator] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!administrator?.passwordHash || !(await verifyPassword(input.currentPassword, administrator.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current administrator password verification failed." });
      }

      const settings = await getSettings();
      if (!settings) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Billing settings are unavailable." });
      const billingMode = input.enabled ? "membership_required" : FREE_LAUNCH_BILLING_MODE;
      await db.update(billingSettings).set({
        billingMode,
        paymentEnforcementEnabled: 0,
        updatedBy: ctx.user.id,
      }).where(eq(billingSettings.id, settings.id));
      await db.insert(adminActivityLog).values({
        adminId: ctx.user.id,
        action: "fee_mode_launch_control_changed",
        targetType: "billing_settings",
        targetReference: String(settings.id),
        summary: `Fee Mode launch control turned ${input.enabled ? "On" : "Off"}; checkout and payment enforcement remain inactive`,
      });
      return { success: true, enabled: input.enabled, paymentEnforcementEnabled: false };
    }),
  startTestCheckout: protectedProcedure.input(z.object({ billingTerm: z.enum(["monthly", "annual"]) })).mutation(async ({ ctx, input }) => {
    requireAdministrator(ctx.user.role);
    try {
      return await createMembershipTestCheckout({ userId: ctx.user.id, billingTerm: input.billingTerm, origin: getSafeRequestOrigin(ctx.req) });
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Test Checkout could not be started." });
    }
  }),
  openTestPortal: protectedProcedure.mutation(async ({ ctx }) => {
    requireAdministrator(ctx.user.role);
    try {
      return await createMembershipTestPortal(ctx.user.id, getSafeRequestOrigin(ctx.req));
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Test customer portal could not be opened." });
    }
  }),
});
