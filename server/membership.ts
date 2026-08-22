import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  billingSettings,
  membershipFeatures,
  membershipPlanFeatures,
  membershipPlans,
  userMemberships,
  userProfiles,
  users,
} from "../drizzle/schema";
import { requireDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";

export const FREE_LAUNCH_BILLING_MODE = "free_launch" as const;
export const SUBSCRIPTION_BILLING_MODE = "subscription" as const;
export const FREE_LAUNCH_PLAN_CODE = "free_launch" as const;
export const SUBSCRIPTION_PLAN_CODE = "subscription" as const;

type BillingMode = typeof FREE_LAUNCH_BILLING_MODE | typeof SUBSCRIPTION_BILLING_MODE;
type MembershipStatus = "free_launch" | "trialing" | "active" | "past_due" | "cancelled" | "complimentary";

type MembershipFeatureGrant = {
  planEnabled: boolean;
};

/**
 * Free launch is open to every member. After a future subscription launch, a
 * feature is granted only to an active/trialing subscriber or an administrator-
 * granted complimentary member, and only when the subscription plan enables it.
 */
export function isMembershipFeatureGranted(
  billingMode: BillingMode,
  membershipStatus: MembershipStatus,
  grant: MembershipFeatureGrant,
) {
  if (billingMode === FREE_LAUNCH_BILLING_MODE) return true;
  const hasMembershipAccess = membershipStatus === "active"
    || membershipStatus === "trialing"
    || membershipStatus === "complimentary";
  return hasMembershipAccess && grant.planEnabled;
}

export function buildBillingSummary(settings?: {
  billingMode: BillingMode;
  stripeBillingEnabled: number;
} | null) {
  const billingMode = settings?.billingMode ?? FREE_LAUNCH_BILLING_MODE;
  const freeLaunchOverride = billingMode === FREE_LAUNCH_BILLING_MODE;

  return {
    billingMode,
    freeLaunchOverride,
    stripeBillingEnabled: false,
    checkoutAvailable: false,
    cardCollectionAvailable: false,
    paymentRequired: false,
    statusLabel: freeLaunchOverride ? "Free Launch Access" : "Subscription Model Prepared",
    statusMessage: freeLaunchOverride
      ? "No credit card is required. All current Tradebilia features are available at no charge during the free launch."
      : "Subscription billing is not active. Checkout, card collection, and charges remain unavailable.",
  };
}

async function getBillingSettingsRow() {
  const db = await requireDb();
  const rows = await db.select().from(billingSettings).orderBy(asc(billingSettings.id)).limit(1);
  return rows[0] ?? null;
}

async function getPlanByCode(code: typeof FREE_LAUNCH_PLAN_CODE | typeof SUBSCRIPTION_PLAN_CODE) {
  const db = await requireDb();
  const plans = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.code, code))
    .limit(1);
  const plan = plans[0];
  if (!plan) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `${code === FREE_LAUNCH_PLAN_CODE ? "Free-launch" : "Subscription"} membership plan is unavailable. Please contact Tradebilia support.`,
    });
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

/** Existing members receive a durable free-launch record only when needed. */
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
    });
  } catch (error) {
    const concurrentMembership = await getMembershipWithPlan(userId);
    if (concurrentMembership) return concurrentMembership;
    throw error;
  }

  const created = await getMembershipWithPlan(userId);
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Membership access could not be prepared. Please try again.",
    });
  }
  return created;
}

export async function getMyMembershipStatus(userId: number) {
  const [settings, membership] = await Promise.all([
    getBillingSettingsRow(),
    getOrCreateFreeLaunchMembership(userId),
  ]);
  const db = await requireDb();
  const grants = await db
    .select({
      featureKey: membershipFeatures.featureKey,
      name: membershipFeatures.name,
      description: membershipFeatures.description,
      category: membershipFeatures.category,
      sortOrder: membershipFeatures.sortOrder,
      planEnabled: membershipPlanFeatures.isEnabled,
      limitValue: membershipPlanFeatures.limitValue,
    })
    .from(membershipFeatures)
    .leftJoin(
      membershipPlanFeatures,
      and(
        eq(membershipPlanFeatures.featureId, membershipFeatures.id),
        eq(membershipPlanFeatures.planId, membership.plan.id),
      ),
    )
    .orderBy(asc(membershipFeatures.sortOrder));

  const billing = buildBillingSummary(settings as BillingMode extends never ? never : any);
  const isComplimentary = membership.membership.status === "complimentary";
  return {
    billing,
    membership: {
      planCode: membership.plan.code,
      planName: isComplimentary ? "Complimentary Membership" : membership.plan.name,
      status: membership.membership.status,
      isComplimentary,
      billingInterval: membership.plan.billingInterval,
      currentPeriodEnd: membership.membership.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(membership.membership.cancelAtPeriodEnd),
    },
    entitlements: grants.map((grant) => ({
      featureKey: grant.featureKey,
      name: grant.name,
      description: grant.description,
      category: grant.category,
      limitValue: grant.limitValue,
      granted: isMembershipFeatureGranted(
        billing.billingMode,
        membership.membership.status,
        { planEnabled: Boolean(grant.planEnabled) },
      ),
      source: billing.freeLaunchOverride
        ? "free_launch_override"
        : isComplimentary
          ? "complimentary_grant"
          : Boolean(grant.planEnabled)
            ? "subscription"
            : "not_included",
    })),
  };
}

export async function getBillingOverview() {
  const db = await requireDb();
  const [settings, plans, features, mappings] = await Promise.all([
    getBillingSettingsRow(),
    db
      .select()
      .from(membershipPlans)
      .where(inArray(membershipPlans.code, [FREE_LAUNCH_PLAN_CODE, SUBSCRIPTION_PLAN_CODE]))
      .orderBy(asc(membershipPlans.sortOrder)),
    db.select().from(membershipFeatures).orderBy(asc(membershipFeatures.sortOrder)),
    db.select().from(membershipPlanFeatures),
  ]);

  const mappingByPlanFeature = new Map(mappings.map((mapping) => [`${mapping.planId}:${mapping.featureId}`, mapping]));
  const billing = buildBillingSummary(settings as any);

  return {
    billing,
    plans: plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      billingInterval: plan.billingInterval,
      isActive: Boolean(plan.isActive),
      isFreeLaunch: Boolean(plan.isFreeLaunch),
      stripePriceConfigured: false,
    })),
    features: features.map((feature) => ({
      id: feature.id,
      featureKey: feature.featureKey,
      name: feature.name,
      description: feature.description,
      category: feature.category,
    })),
    matrix: plans.flatMap((plan) => features.map((feature) => {
      const mapping = mappingByPlanFeature.get(`${plan.id}:${feature.id}`);
      return {
        planId: plan.id,
        featureId: feature.id,
        isEnabled: Boolean(mapping?.isEnabled),
        limitValue: mapping?.limitValue ?? null,
        effectiveAtLaunch: true,
      };
    })),
  };
}

export async function getMembershipAdministrationMembers() {
  const db = await requireDb();
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      accountDisplayName: users.displayName,
      accountName: users.name,
      profileDisplayName: userProfiles.displayName,
      membershipStatus: userMemberships.status,
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
    username: row.username || null,
    membershipStatus: row.membershipStatus ?? "free_launch",
    isComplimentary: row.membershipStatus === "complimentary",
    planCode: row.planCode ?? FREE_LAUNCH_PLAN_CODE,
    planName: row.membershipStatus === "complimentary" ? "Complimentary Membership" : row.planName ?? "Free Launch Access",
  }));
}

export async function grantComplimentaryMembership(targetUserId: number) {
  const db = await requireDb();
  const target = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "The selected member was not found." });

  const subscriptionPlan = await getPlanByCode(SUBSCRIPTION_PLAN_CODE);
  const existing = await getMembershipWithPlan(targetUserId);
  if (existing) {
    await db
      .update(userMemberships)
      .set({ planId: subscriptionPlan.id, status: "complimentary", cancelAtPeriodEnd: 0 })
      .where(eq(userMemberships.userId, targetUserId));
  } else {
    await db.insert(userMemberships).values({
      userId: targetUserId,
      planId: subscriptionPlan.id,
      status: "complimentary",
    });
  }
}

export async function revokeComplimentaryMembership(targetUserId: number) {
  const db = await requireDb();
  const freeLaunchPlan = await getPlanByCode(FREE_LAUNCH_PLAN_CODE);
  const result = await db
    .update(userMemberships)
    .set({ planId: freeLaunchPlan.id, status: "free_launch", cancelAtPeriodEnd: 0 })
    .where(and(eq(userMemberships.userId, targetUserId), eq(userMemberships.status, "complimentary")));
  const affectedRows = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
  if (affectedRows === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The selected member does not have a complimentary membership grant." });
  }
}

export async function updatePlanFeatureConfiguration(input: {
  planId: number;
  featureId: number;
  isEnabled: boolean;
  limitValue: number | null;
}) {
  const db = await requireDb();
  const result = await db
    .update(membershipPlanFeatures)
    .set({ isEnabled: input.isEnabled ? 1 : 0, limitValue: input.limitValue })
    .where(and(eq(membershipPlanFeatures.planId, input.planId), eq(membershipPlanFeatures.featureId, input.featureId)));

  const affectedRows = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
  if (affectedRows === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The selected plan-feature setting was not found." });
  }
}

function requireAdministrator(role: string | null | undefined) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can manage membership configuration." });
  }
}

export const membershipRouter = router({
  getMyStatus: protectedProcedure.query(async ({ ctx }) => getMyMembershipStatus(ctx.user.id)),
});

export const billingRouter = router({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    requireAdministrator(ctx.user.role);
    return getBillingOverview();
  }),
  getMembers: protectedProcedure.query(async ({ ctx }) => {
    requireAdministrator(ctx.user.role);
    return getMembershipAdministrationMembers();
  }),
  updatePlanFeature: protectedProcedure
    .input(z.object({
      planId: z.number().int().positive(),
      featureId: z.number().int().positive(),
      isEnabled: z.boolean(),
      limitValue: z.number().int().nonnegative().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.user.role);
      await updatePlanFeatureConfiguration(input);
      return { success: true, billing: buildBillingSummary(await getBillingSettingsRow() as any) };
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
