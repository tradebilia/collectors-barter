import { createHmac } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { identityRegistry } from "../drizzle/schema";
import { ENV } from "./_core/env";

export const IDENTITY_TYPES = ["email", "phone", "ebay", "facebook", "linkedin", "etsy"] as const;
export type IdentityType = (typeof IDENTITY_TYPES)[number];
export type IdentityRegistryStatus = "active" | "restricted" | "review_required";

const IDENTITY_UNAVAILABLE_MESSAGE = "This identity cannot be used for this account. Please contact Tradebilia support if you believe this is an error.";

function getIdentityRegistryKey(): string {
  const key = ENV.encryptionKey || process.env.JWT_SECRET;
  if (!key) throw new Error("Identity protection is temporarily unavailable. Please try again later.");
  return key;
}

export function normalizeIdentity(identityType: IdentityType, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (identityType === "email") return trimmed.toLowerCase();
  if (identityType === "phone") return trimmed.replace(/[\s().-]/g, "");
  return trimmed;
}

export function fingerprintIdentity(identityType: IdentityType, value: string, key = getIdentityRegistryKey()): string {
  const normalized = normalizeIdentity(identityType, value);
  if (!normalized) throw new Error("An identity value is required.");
  return createHmac("sha256", key).update(`${identityType}:${normalized}`, "utf8").digest("hex");
}

export function identityUnavailableError(): Error {
  return new Error(IDENTITY_UNAVAILABLE_MESSAGE);
}

/**
 * Atomically claim an identity for its owner. Call this from the same database
 * transaction as the account or provider update that introduces the identity.
 */
export async function claimIdentity(
  tx: any,
  input: { userId: number; identityType: IdentityType; value: string },
): Promise<void> {
  const normalized = normalizeIdentity(input.identityType, input.value);
  if (!normalized) return;
  const fingerprint = fingerprintIdentity(input.identityType, normalized);
  const [existing] = await tx
    .select({ ownerUserId: identityRegistry.ownerUserId, status: identityRegistry.status })
    .from(identityRegistry)
    .where(and(eq(identityRegistry.identityType, input.identityType), eq(identityRegistry.fingerprint, fingerprint)))
    .limit(1);

  if (existing) {
    if (existing.ownerUserId !== input.userId || existing.status !== "active") {
      throw identityUnavailableError();
    }
    await tx
      .update(identityRegistry)
      .set({ updatedAt: new Date().toISOString().slice(0, 19).replace("T", " ") })
      .where(and(eq(identityRegistry.identityType, input.identityType), eq(identityRegistry.fingerprint, fingerprint)));
    return;
  }

  try {
    await tx.insert(identityRegistry).values({
      identityType: input.identityType,
      fingerprint,
      ownerUserId: input.userId,
      status: "active",
    });
  } catch (error: any) {
    // The unique index is the race-safe final authority. Never reveal whether
    // a matching record belongs to another member.
    if (error?.code === "ER_DUP_ENTRY" || error?.code === "23505") throw identityUnavailableError();
    throw error;
  }
}

/** Marks all already-claimed identities for a moderated member as restricted. */
export async function setIdentityRestrictionStatus(
  tx: any,
  input: { userId: number; status: Extract<IdentityRegistryStatus, "active" | "restricted">; administratorId?: number },
): Promise<void> {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const set = input.status === "restricted"
    ? { status: "restricted" as const, restrictedAt: now, restrictedBy: input.administratorId ?? null }
    : { status: "active" as const, restrictedAt: null, restrictedBy: null };
  await tx
    .update(identityRegistry)
    .set(set)
    .where(and(eq(identityRegistry.ownerUserId, input.userId), ne(identityRegistry.status, "review_required")));
}

export async function hasIdentityConflict(
  tx: any,
  input: { userId?: number; identityType: IdentityType; value: string },
): Promise<boolean> {
  const normalized = normalizeIdentity(input.identityType, input.value);
  if (!normalized) return false;
  const fingerprint = fingerprintIdentity(input.identityType, normalized);
  const [existing] = await tx
    .select({ ownerUserId: identityRegistry.ownerUserId, status: identityRegistry.status })
    .from(identityRegistry)
    .where(and(eq(identityRegistry.identityType, input.identityType), eq(identityRegistry.fingerprint, fingerprint)))
    .limit(1);
  return Boolean(existing && (existing.ownerUserId !== input.userId || existing.status !== "active"));
}
