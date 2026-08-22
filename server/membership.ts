import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  billingSettings,
  membershipFeatures,
  membershipPlanFeatures,
  membershipPlans,
  userMemberships,
} from "../drizzle/schema";
import { requireDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";

export const FREE_LAUNCH_BILLING_MODE = "free_launch" as const;
export const FREE_LAUNCH_PLAN_CODE = "free_launch" as const;

type MembershipFeatureGrant = {
  featureKey: string;
  planEnabled: boolean;
  freeLaunchEnabled: boolean;
};

/**
 * Resolves an entitlement without ever treating a plan matrix as a billing
 * activation switch. During free launch every current feature remains open.
 */
export function isMembershipFeatureGranted(
  billingMode: "free_launch" | "preview" | "live",
  grant: MembershipFeatureGrant,
) {
  return billingMode === FREE_LAUNCH_BILLING_MODE || grant.planEnabled || grant.freeLaunchEnabled;
}

export function buildFreeLaunchBillingSummary(settings?: {
  billingMode: "free_launch" | "preview" | "live";
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
    statusLabel: freeLaunchOverride ? "Free Launch Access" : "Billing Preview",
    statusMessage: freeLaunchOverride
      ? "No credit card is required. All current Tradebilia features are available at no charge during the free launch."
      : "Billing remains inactive. Checkout, card collection, and charges are unavailable.",
  };
}

async function getBillingSettingsRow() {
  const db = await requireDb();
  const rows = await db.select().from(billingSettings).orderBy(asc(billingSettings.id)).limit(1);
  return rows[0] ?? null;
}

async function getFreeLaunchPlan() {
  const db = await requireDb();
  const plans = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.code, FREE_LAUNCH_PLAN_CODE))
    .limit(1);
  const plan = plans[0];
  if (!plan) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Free-launch membership plan is unavailable. Please contact Tradebilia support.",
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

/**
 * Existing members are provisioned lazily when they first open Profile. The
 * unique userId constraint makes this safe under concurrent requests.
 */
export async function getOrCreateFreeLaunchMembership(userId: number) {
  const existing = await getMembershipWithPlan(userId);
  if (existing) return existing;

  const db = await requireDb();
  const freeLaunchPlan = await getFreeLaunchPlan();

  try {
    await db.insert(userMemberships).values({
      userId,
      planId: freeLaunchPlan.id,
      status: "free_launch",
    });
  } catch (error) {
    // A simultaneous page request may have created the same unique record.
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
      defaultFreeLaunchEnabled: membershipFeatures.defaultFreeLaunchEnabled,
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

  const billing = buildFreeLaunchBillingSummary(settings as any);
  return {
    billing,
    membership: {
      planCode: membership.plan.code,
      planName: membership.plan.name,
      status: membership.membership.status,
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
      granted: isMembershipFeatureGranted(billing.billingMode, {
        featureKey: grant.featureKey,
        planEnabled: Boolean(grant.planEnabled),
        freeLaunchEnabled: Boolean(grant.defaultFreeLaunchEnabled),
      }),
      source: billing.freeLaunchOverride ? "free_launch_override" : Boolean(grant.planEnabled) ? "plan" : "feature_default",
    })),
  };
}

export async function getBillingOverview() {
  const db = await requireDb();
  const [settings, plans, features, mappings] = await Promise.all([
    getBillingSettingsRow(),
    db.select().from(membershipPlans).orderBy(asc(membershipPlans.sortOrder)),
    db.select().from(membershipFeatures).orderBy(asc(membershipFeatures.sortOrder)),
    db.select().from(membershipPlanFeatures),
  ]);

  const mappingByPlanFeature = new Map(mappings.map((mapping) => [`${mapping.planId}:${mapping.featureId}`, mapping]));
  const billing = buildFreeLaunchBillingSummary(settings as any);

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
      stripePriceConfigured: Boolean(plan.stripePriceId),
    })),
    features: features.map((feature) => ({
      id: feature.id,
      featureKey: feature.featureKey,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      defaultFreeLaunchEnabled: Boolean(feature.defaultFreeLaunchEnabled),
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

export async function updatePlanFeatureConfiguration(input: {
  planId: number;
  featureId: number;
  isEnabled: boolean;
  limitValue: number | null;
}) {
  const db = await requireDb();
  const result = await db
    .update(membershipPlanFeatures)
    .set({
      isEnabled: input.isEnabled ? 1 : 0,
      limitValue: input.limitValue,
    })
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
      return {
        success: true,
        billing: buildFreeLaunchBillingSummary(await getBillingSettingsRow() as any),
      };
    }),
});
