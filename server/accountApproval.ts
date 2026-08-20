import { accountApprovalReviews } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { requireDb } from "./db";

export async function createPendingEmailHistoryApproval(userId: number, emailFirstSeenAt: Date | null) {
  const db = await requireDb();
  await db.insert(accountApprovalReviews).values({
    userId,
    status: "pending",
    reasonCode: "email_history_under_one_year",
    emailFirstSeenAt: emailFirstSeenAt ? emailFirstSeenAt.toISOString().slice(0, 19).replace("T", " ") : null,
  });
}

export async function getPendingApproval(userId: number) {
  const db = await requireDb();
  const [review] = await db.select().from(accountApprovalReviews)
    .where(and(eq(accountApprovalReviews.userId, userId), eq(accountApprovalReviews.status, "pending")))
    .limit(1);
  return review ?? null;
}

export async function requireMarketplaceApproval(userId: number) {
  const pending = await getPendingApproval(userId);
  if (pending) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account is under review. Marketplace access will be enabled after administrator approval.",
    });
  }
}
