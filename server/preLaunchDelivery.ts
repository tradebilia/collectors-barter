import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { preLaunchBroadcastDeliveries } from "../drizzle/schema";
import { requireDb } from "./db";

export type PreLaunchDeliveryInput = {
  deliveryKey: string;
  requestedBy: number;
  subject: string;
  message: string;
};

export type PreLaunchDeliveryReservation =
  | { kind: "claimed"; deliveryId: number }
  | { kind: "sent"; recipientCount: number; broadcastId: string | null }
  | { kind: "uncertain" };

type PreLaunchDatabase = Awaited<ReturnType<typeof requireDb>>;

function payloadHash(input: Pick<PreLaunchDeliveryInput, "subject" | "message">) {
  return createHash("sha256").update(`${input.subject}\u0000${input.message}`).digest("hex");
}

function affectedRows(result: unknown): number {
  return Number((result as any)?.affectedRows ?? (result as any)?.[0]?.affectedRows ?? 0);
}

/**
 * Claim a unique administrator delivery before contacting Resend. A completed
 * delivery is safely replayed to the initiating administrator; an uncertain
 * delivery is deliberately not automatically resent.
 */
export async function reservePreLaunchDelivery(
  input: PreLaunchDeliveryInput,
  database?: PreLaunchDatabase,
): Promise<PreLaunchDeliveryReservation> {
  const db = database ?? await requireDb();
  const hash = payloadHash(input);

  try {
    await db.insert(preLaunchBroadcastDeliveries).values({
      deliveryKey: input.deliveryKey,
      requestedBy: input.requestedBy,
      payloadHash: hash,
      subject: input.subject,
      status: "prepared",
    });
  } catch (error) {
    const code = String((error as { code?: string } | undefined)?.code ?? "");
    if (code !== "ER_DUP_ENTRY" && code !== "23000") throw error;
  }

  const [existing] = await db
    .select()
    .from(preLaunchBroadcastDeliveries)
    .where(eq(preLaunchBroadcastDeliveries.deliveryKey, input.deliveryKey))
    .limit(1);

  if (!existing || existing.requestedBy !== input.requestedBy || existing.payloadHash !== hash) {
    throw new Error("This delivery confirmation cannot be reused with different content.");
  }
  if (existing.status === "sent") {
    return {
      kind: "sent",
      recipientCount: existing.recipientCount ?? 0,
      broadcastId: existing.broadcastId,
    };
  }
  if (existing.status === "uncertain" || existing.status === "sending") return { kind: "uncertain" };

  const claim = await db
    .update(preLaunchBroadcastDeliveries)
    .set({ status: "sending" })
    .where(and(
      eq(preLaunchBroadcastDeliveries.id, existing.id),
      eq(preLaunchBroadcastDeliveries.status, "prepared"),
    ));

  return affectedRows(claim) === 1 ? { kind: "claimed", deliveryId: existing.id } : { kind: "uncertain" };
}

export async function markPreLaunchDeliverySent(input: {
  deliveryId: number;
  recipientCount: number;
  broadcastId: string | null;
}) {
  const db = await requireDb();
  await db
    .update(preLaunchBroadcastDeliveries)
    .set({ status: "sent", recipientCount: input.recipientCount, broadcastId: input.broadcastId })
    .where(and(
      eq(preLaunchBroadcastDeliveries.id, input.deliveryId),
      eq(preLaunchBroadcastDeliveries.status, "sending"),
    ));
}

export async function markPreLaunchDeliveryUncertain(deliveryId: number) {
  const db = await requireDb();
  await db
    .update(preLaunchBroadcastDeliveries)
    .set({ status: "uncertain" })
    .where(and(
      eq(preLaunchBroadcastDeliveries.id, deliveryId),
      eq(preLaunchBroadcastDeliveries.status, "sending"),
    ));
}

export const hashPreLaunchDeliveryPayload = payloadHash;
