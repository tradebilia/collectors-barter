import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  adminActivityLog,
  billingSettings,
  membershipFeatures,
  membershipPlanFeatures,
  membershipPlans,
  userMemberships,
  userProfiles,
  users,
} from "../drizzle/schema";
import { requireDb } from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { verifyPassword } from "./_core/auth";
import { createMembershipTestCheckout, createMembershipTestPortal } from "./stripeMembershipBilling";

export const FREE_LAUNCH_BILLING_MODE = "free_launch" as const;
export const LAUNCH_GRACE_BILLING_MODE = "launch_grace" as const;
export const MEMBERSHIP_REQUIRED_BILLING_MODE = "membership_required" as const;
export const FREE_LAUNCH_PLAN_CODE = "free_launch" as const;
export const TRADEBILIA_MEMBERSHIP_PLAN_CODE = "tradebilia_membership" as const;

export const FUTURE_SUBSCRIPTION_PAYMENT_TERMS = [
  { code: "monthly", label: "Monthly", priceCents: 100, displayPrice: "$1 per month" },
  { code: "annual", label: "Annual", priceCents: 1000, displayPrice: "$10 per year" },
] as const;

type BillingMode = typeof FREE_LAUNCH_BILLING_MODE | typeof LAUNCH_GRACE_BILLING_MODE | typeof MEMBERSHIP_REQUIRED_BILLING_MODE;
type MembershipStatus = "free_launch" | "active" | "past_due" | "cancelled" | "complimentary" | "unpaid";

type BillingSettingsRow = {
  id: number;
  billingMode: BillingMode;
  stripeBillingEnabled: number;
  paymentEnforcementEnabled: number;
  feeLaunchStartsAt: string | null;
  feeLaunchGraceEndsAt: string | null;
};

function isFutureDate(value: string | null | undefined) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

export function hasMembershipAccess(status: MembershipStatus | null | undefined, paymentGraceEndsAt?: string | null) {
  return status === "active" || status === "complimentary" || (status === "past_due" && isFutureDate(paymentGraceEndsAt));
}

export function buildBillingSummary(settings?: BillingSettingsRow | null) {
  const configuredMode = settings?.billingMode ?? FREE_LAUNCH_BILLING_MODE;
  const paymentEnforcementEnabled = Boolean(settings?.paymentEnforcementEnabled);
  const freeLaunchOverride = configuredMode === FREE_LAUNCH_BILLING_MODE || !paymentEnforcementEnabled;
  const feeModeEnabled = configuredMode === MEMBERSHIP_REQUIRED_BILLING_MODE;

  return {
    billingMode: configuredMode,
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

export function isMembershipFeatureGranted(
  billing: ReturnType<typeof buildBillingSummary>,
  status: MembershipStatus,
  planEnabled: boolean,
  paymentGraceEndsAt?: string | null,
) {
  if (billing.freeLaunchOverride) return true;
  return hasMembershipAccess(status, paymentGraceEndsAt) && planEnabled;
}

async function getBillingSettingsRow() {
  const db = await requireDb();
  const rows = await db.select().from(billingSettings).orderBy(asc(billingSettings.id)).limit(1);
  return (rows[0] ?? null) as BillingSettingsRow | null;
}

async function getPlanByCode(code: typeof FREE_LAUNCH_PLAN_CODE | typeof TRADEBILIA_MEMBERSHIP_PLAN_CODE) {
  const db = await requireDb();
  const rows = await db.select().from(membershipPlans).where(eq(membershipPlans.code, code)).limit(1);
  const plan = rows[0];
  if (!plan) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The required Tradebilia membership plan is unavailable." });
  }
  return plan;
}

async function getMembershipWithPlan(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ membership: userMemberships, plan: membershipPlans })
    .from(userMemberships)
    .innerJoin(membershipPlans, eq(userMemberships.planId, membershipPlans.id))
    .where(eq(userMemberships.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** A membership row is created only when a signed-in member first requests status. */
export async function getOrCreateFreeLaunchMembership(userId: number) {
  const existing = await getMembershipWithPlan(userId);
  if (existing) return existing;

  const db = await requireDb();
  const freeLaunchPlan = await getPlanByCode(FREE_LAUNCH_PLAN_CODE);
  try {
    await db.insert(userMemberships).values({
      userId,
      planId: freeLaunchPlan.id,
      status: "free_launch",
      billingTerm: "none",
    });
  } catch (error) {
    const concurrent = await getMembershipWithPlan(userId);
    if (concurrent) return concurrent;
    throw error;
  }

  const created = await getMembershipWithPlan(userId);
  if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Membership access could not be prepared." });
  return created;
}

export async function getSubscriptionAccessPolicy(userId: number | null) {
  const settings = await getBillingSettingsRow();
  const billing = buildBillingSummary(settings);
  if (billing.freeLaunchOverride) {
    return { ...billing, hasSubscriptionAccess: true, membershipStatus: userId ? "free_launch" : null };
  }
  if (!userId) return { ...billing, hasSubscriptionAccess: false, membershipStatus: null };

  const row = await getMembershipWithPlan(userId);
  const membershipStatus = (row?.membership.status ?? "unpaid") as MembershipStatus;
  return {
    ...billing,
    hasSubscriptionAccess: hasMembershipAccess(membershipStatus, row?.membership.paymentGraceEndsAt),
    membershipStatus,
  };
}

export async function assertSubscriptionAccess(userId: number | null) {
  const policy = await getSubscriptionAccessPolicy(userId);
  if (!policy.hasSubscriptionAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Tradebilia Membership is required for this page." });
  }
  return policy;
}

export async function getMyMembershipStatus(userId: number) {
  const [settings, membership] = await Promise.all([getBillingSettingsRow(), getOrCreateFreeLaunchMembership(userId)]);
  const db = await requireDb();
  const grants = await db
    .select({
      featureKey: membershipFeatures.featureKey,
      name: membershipFeatures.name,
      description: membershipFeatures.description,
      category: membershipFeatures.category,
      sortOrder: membershipFeatures.sortOrder,
      planEnabled: membershipPlanFeatures.isEnabled,
    })
    .from(membershipFeatures)
    .leftJoin(
      membershipPlanFeatures,
      and(eq(membershipPlanFeatures.featureId, membershipFeatures.id), eq(membershipPlanFeatures.planId, membership.plan.id)),
    )
    .orderBy(asc(membershipFeatures.sortOrder));
  const billing = buildBillingSummary(settings);
  const status = membership.membership.status as MembershipStatus;

  return {
    billing,
    membership: {
      planCode: membership.plan.code,
      planName: status === "complimentary" ? "Complimentary Membership" : membership.plan.name,
      status,
      billingTerm: membership.membership.billingTerm,
      isComplimentary: status === "complimentary",
      currentPeriodEnd: membership.membership.currentPeriodEnd,
      paymentGraceEndsAt: membership.membership.paymentGraceEndsAt,
      cancelAtPeriodEnd: Boolean(membership.membership.cancelAtPeriodEnd),
    },
    entitlements: grants.map((grant) => ({
      featureKey: grant.featureKey,
      name: grant.name,
      description: grant.description,
      category: grant.category,
      granted: isMembershipFeatureGranted(billing, status, Boolean(grant.planEnabled), membership.membership.paymentGraceEndsAt),
      source: billing.freeLaunchOverride ? "free_launch_override" : status === "complimentary" ? "complimentary_access" : "membership_plan",
    })),
  };
}

export async function getBillingOverview() {
  const db = await requireDb();
  const [settings, plans, features, mappings] = await Promise.all([
    getBillingSettingsRow(),
    db.select().from(membershipPlans).where(inArray(membershipPlans.code, [FREE_LAUNCH_PLAN_CODE, TRADEBILIA_MEMBERSHIP_PLAN_CODE])).orderBy(asc(membershipPlans.sortOrder)),
    db.select().from(membershipFeatures).orderBy(asc(membershipFeatures.sortOrder)),
    db.select().from(membershipPlanFeatures),
  ]);
  const mappingsByKey = new Map(mappings.map((row) => [`${row.planId}:${row.featureId}`, row]));
  const billing = buildBillingSummary(settings);
  return {
    billing,
    plans: plans.map((plan) => ({ id: plan.id, code: plan.code, name: plan.name, isFreeLaunch: Boolean(plan.isFreeLaunch), isActive: Boolean(plan.isActive) })),
    features: features.map((feature) => ({ id: feature.id, featureKey: feature.featureKey, name: feature.name, description: feature.description })),
    matrix: plans.flatMap((plan) => features.map((feature) => ({
      planId: plan.id,
      featureId: feature.id,
      isEnabled: Boolean(mappingsByKey.get(`${plan.id}:${feature.id}`)?.isEnabled),
      limitValue: mappingsByKey.get(`${plan.id}:${feature.id}`)?.limitValue ?? null,
      effectiveAtLaunch: true,
    }))),
  };
}

export async function getMembershipAdministrationMembers() {
  const db = await requireDb();
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      email: users.email,
      accountDisplayName: users.displayName,
      accountName: users.name,
      profileDisplayName: userProfiles.displayName,
      membershipStatus: userMemberships.status,
      billingTerm: userMemberships.billingTerm,
      paymentGraceEndsAt: userMemberships.paymentGraceEndsAt,
      planCode: membershipPlans.code,
      planName: membershipPlans.name,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(userMemberships, eq(userMemberships.userId, users.id))
    .leftJoin(membershipPlans, eq(membershipPlans.id, userMemberships.planId))
    .orderBy(asc(users.id));
  return rows.map((row) => ({
    userId: row.userId,
    displayName: row.profileDisplayName || row.accountDisplayName || row.accountName || row.username || `Collector ${row.userId}`,
    email: row.email ?? null,
    membershipStatus: row.membershipStatus ?? "free_launch",
    billingTerm: row.billingTerm ?? "none",
    paymentGraceEndsAt: row.paymentGraceEndsAt ?? null,
    isComplimentary: row.membershipStatus === "complimentary",
    planCode: row.planCode ?? FREE_LAUNCH_PLAN_CODE,
    planName: row.membershipStatus === "complimentary" ? "Complimentary Membership" : row.planName ?? "Free Launch Access",
  }));
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

export async function grantComplimentaryMembership(userId: number) {
  const db = await requireDb();
  const target = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "The selected member was not found." });
  const plan = await getPlanByCode(TRADEBILIA_MEMBERSHIP_PLAN_CODE);
  const existing = await getMembershipWithPlan(userId);
  if (existing) {
    await db.update(userMemberships).set({ planId: plan.id, status: "complimentary", billingTerm: "complimentary", cancelAtPeriodEnd: 0, paymentGraceEndsAt: null }).where(eq(userMemberships.userId, userId));
  } else {
    await db.insert(userMemberships).values({ userId, planId: plan.id, status: "complimentary", billingTerm: "complimentary" });
  }
}

export async function revokeComplimentaryMembership(userId: number) {
  const db = await requireDb();
  const plan = await getPlanByCode(FREE_LAUNCH_PLAN_CODE);
  const result = await db.update(userMemberships).set({ planId: plan.id, status: "free_launch", billingTerm: "none", cancelAtPeriodEnd: 0, paymentGraceEndsAt: null }).where(and(eq(userMemberships.userId, userId), eq(userMemberships.status, "complimentary")));
  const affectedRows = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
  if (affectedRows === 0) throw new TRPCError({ code: "NOT_FOUND", message: "The selected member does not have complimentary access." });
}

export async function updatePlanFeatureConfiguration(input: { planId: number; featureId: number; isEnabled: boolean; limitValue: number | null }) {
  const db = await requireDb();
  const result = await db
    .update(membershipPlanFeatures)
    .set({ isEnabled: input.isEnabled ? 1 : 0, limitValue: input.limitValue })
    .where(and(eq(membershipPlanFeatures.planId, input.planId), eq(membershipPlanFeatures.featureId, input.featureId)));
  const affectedRows = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
  if (affectedRows === 0) throw new TRPCError({ code: "NOT_FOUND", message: "The selected plan feature was not found." });
}

export const membershipRouter = router({
  getAccessPolicy: publicProcedure.query(({ ctx }) => getSubscriptionAccessPolicy(ctx.user?.id ?? null)),
  getMyStatus: protectedProcedure.query(({ ctx }) => getMyMembershipStatus(ctx.user.id)),
});

export const billingRouter = router({
  getOverview: protectedProcedure.query(({ ctx }) => {
    requireAdministrator(ctx.user.role);
    return getBillingOverview();
  }),
  getMembers: protectedProcedure.query(({ ctx }) => {
    requireAdministrator(ctx.user.role);
    return getMembershipAdministrationMembers();
  }),
  updatePlanFeature: protectedProcedure
    .input(z.object({ planId: z.number().int().positive(), featureId: z.number().int().positive(), isEnabled: z.boolean(), limitValue: z.number().int().nonnegative().nullable() }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.user.role);
      await updatePlanFeatureConfiguration(input);
      return { success: true, billing: buildBillingSummary(await getBillingSettingsRow()) };
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

      const settings = await getBillingSettingsRow();
      if (!settings) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Billing settings are unavailable." });
      await db.update(billingSettings).set({
        billingMode: input.enabled ? MEMBERSHIP_REQUIRED_BILLING_MODE : FREE_LAUNCH_BILLING_MODE,
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
  grantComplimentaryAccess: protectedProcedure
    .input(z.object({ targetUserId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.user.role);
      await grantComplimentaryMembership(input.targetUserId);
      return { success: true };
    }),
  revokeComplimentaryAccess: protectedProcedure
    .input(z.object({ targetUserId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.user.role);
      await revokeComplimentaryMembership(input.targetUserId);
      return { success: true };
    }),
});
