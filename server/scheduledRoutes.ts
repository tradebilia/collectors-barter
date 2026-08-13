import type { Express, Request, Response } from "express";
import { desc, gte, sql } from "drizzle-orm";
import { referralRequests } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";
import { isStagingSafetyEnabled } from "./_core/stagingSafety";
import { sendShippingDeadlineReminderEmail } from "./_core/email";
import { requireDb, deleteDraftsOlderThan } from "./db";
import { getShipmentReminderKind, isShipmentReminderEmailEnabled, shipmentReminderMarker } from "./shipmentReminder";

/** Injectable seams so tests can exercise these handlers without a live DB or cron token. */
export type ScheduledDeps = {
  authenticateRequest: (req: Request) => Promise<{ isCron?: boolean; taskUid?: string }>;
  requireDb: () => Promise<any>;
  deleteDraftsOlderThan: (db: any, cutoff: Date) => Promise<number>;
  notifyOwner: (payload: { title: string; content: string }) => Promise<boolean>;
  isStagingSafetyEnabled: () => boolean;
  sendShippingDeadlineReminderEmail: (payload: { recipientEmail: string; recipientName: string; tradeRef: string; deadline: string; overdue: boolean }) => Promise<boolean>;
};

export const defaultScheduledDeps: ScheduledDeps = {
  authenticateRequest: (req) => sdk.authenticateRequest(req as any) as any,
  requireDb,
  deleteDraftsOlderThan,
  notifyOwner,
  isStagingSafetyEnabled,
  sendShippingDeadlineReminderEmail,
};

/** MySQL DATETIME literal for `n` days ago. */
function daysAgoSql(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Resolve the caller as a cron invocation, or send a 403.
 * `taskUid` is set by the cron system and is the only trustworthy job identifier —
 * request bodies are attacker-controllable and must never be used for lookups.
 */
async function requireCron(
  deps: ScheduledDeps,
  req: Request,
  res: Response
): Promise<{ isCron?: boolean; taskUid?: string } | null> {
  let user: { isCron?: boolean; taskUid?: string };
  try {
    user = await deps.authenticateRequest(req);
  } catch {
    res.status(403).json({ error: "cron-only" });
    return null;
  }
  if (!user?.isCron || !user.taskUid) {
    res.status(403).json({ error: "cron-only" });
    return null;
  }
  return user;
}

function failed(res: Response, label: string, error: any) {
  console.error(`[${label}] Error:`, error);
  res.status(500).json({ error: error?.message ?? String(error), timestamp: new Date().toISOString() });
}

/** Health check — verifies the process is up AND the database is reachable. */
export function makeHealthHandler(deps: ScheduledDeps = defaultScheduledDeps) {
  return async (_req: Request, res: Response) => {
    try {
      const db = await deps.requireDb();
      await db.execute(sql`select 1`);
      res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(503).json({
        status: "error",
        database: "unreachable",
        error: error?.message ?? String(error),
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/** Delete abandoned draft listings older than 30 days. */
export function makeCleanupExpiredDraftsHandler(deps: ScheduledDeps = defaultScheduledDeps) {
  return async (req: Request, res: Response) => {
    if (!(await requireCron(deps, req, res))) return;
    if (deps.isStagingSafetyEnabled()) return res.json({ ok: true, skipped: "staging-safety" });
    try {
      const db = await deps.requireDb();
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deletedCount = await deps.deleteDraftsOlderThan(db, cutoff);
      res.json({ ok: true, deletedCount, cutoffDate: cutoff.toISOString() });
    } catch (error: any) {
      failed(res, "cleanupExpiredDrafts", error);
    }
  };
}

/** Email the project owner a digest of referral requests from the last 3 days. */
export function makeReferralDigestHandler(deps: ScheduledDeps = defaultScheduledDeps) {
  return async (req: Request, res: Response) => {
    if (!(await requireCron(deps, req, res))) return;
    if (deps.isStagingSafetyEnabled()) return res.json({ ok: true, skipped: "staging-safety" });
    try {
      const db = await deps.requireDb();
      // Schema timestamps are string-mode, so compare against a MySQL datetime string.
      const pending = await db
        .select()
        .from(referralRequests)
        .where(gte(referralRequests.createdAt, daysAgoSql(3)))
        .orderBy(desc(referralRequests.createdAt));
      if (!pending || pending.length === 0) {
        return res.json({ ok: true, skipped: "no-referrals" });
      }
      const lines = pending.map(
        (ref: any) =>
          `- ${ref.collectorName} (${ref.collectorEmail}) - Focus: ${ref.collectorFocus} - Referrer: ${ref.referrerFirstName} ${ref.referrerLastName}`
      );
      const notified = await deps.notifyOwner({
        title: `Tradebilia Referral Digest - ${pending.length} new referrals`,
        content: [`You have ${pending.length} new referral request(s) from the past 3 days:\n`, lines.join("\n")].join("\n"),
      });
      res.json({ ok: true, referralCount: pending.length, notified });
    } catch (error: any) {
      failed(res, "referralDigest", error);
    }
  };
}

/**
 * Enforce all trade-lifecycle timers: stale-negotiation auto-cancel,
 * acceptance-window expiry, and overdue-receipt escalation.
 */
export function makeTradeRemindersHandler(deps: ScheduledDeps = defaultScheduledDeps) {
  return async (req: Request, res: Response) => {
    if (!(await requireCron(deps, req, res))) return;
    if (deps.isStagingSafetyEnabled()) return res.json({ ok: true, skipped: "staging-safety" });
    try {
      const db = await deps.requireDb();
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      let acceptanceTimedOut = 0;
      let receiptEscalated = 0;
      let shipmentDueSoonReminders = 0;
      let shipmentOverdueReminders = 0;

      // 1. 30-day auto-cancel: pending/negotiating trades with no activity for 30 days.
      const [staleResult] = await db.execute(
        sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Auto-cancelled: 30 days of no activity', updatedAt = ${now} WHERE status IN ('pending', 'negotiating') AND lastActivityAt IS NOT NULL AND lastActivityAt < ${daysAgoSql(30)}`
      );
      const autoCancelled = (staleResult as any)?.affectedRows || 0;

      // 2. 72-hour acceptance timeout: one party accepted, the other never confirmed.
      const [pendingAcceptances] = await db.execute(
        sql`SELECT proposalId FROM tradeReceiptConfirmation WHERE confirmationType = 'accepted' AND confirmedAt < ${daysAgoSql(3)}`
      );
      for (const row of ((pendingAcceptances as unknown as any[]) || [])) {
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Auto-cancelled: 72-hour acceptance window expired', updatedAt = ${now} WHERE id = ${row.proposalId} AND status = 'negotiating'`
        );
        await db.execute(
          sql`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${row.proposalId} AND confirmationType = 'accepted'`
        );
        acceptanceTimedOut++;
      }

      // 3. 15-day receipt timeout: tracking submitted but receipt never confirmed.
      const [overdueShipments] = await db.execute(
        sql`SELECT DISTINCT proposalId FROM tradeTrackingNumbers WHERE submittedAt < ${daysAgoSql(15)} AND proposalId NOT IN (SELECT proposalId FROM tradeReceiptConfirmation WHERE confirmationType = 'received') AND proposalId IN (SELECT id FROM tradeProposals WHERE status IN ('accepted', 'shipped'))`
      );
      for (const row of ((overdueShipments as unknown as any[]) || [])) {
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'disputed', declineReason = 'Auto-escalated: Receipt not confirmed within 15 days', updatedAt = ${now} WHERE id = ${row.proposalId}`
        );
        await db.execute(
          sql`INSERT INTO tradeAdminLog (proposalId, eventType, details, createdAt) VALUES (${row.proposalId}, 'disputed', 'Auto-escalated: 15-day receipt timeout', ${now})`
        );
        receiptEscalated++;
      }

      const [shipmentCandidates] = await db.execute(
        sql`SELECT tp.id as proposalId, tp.tradeReferenceNumber, tp.shippingDeadline, tp.shippingAt,
              u.id as recipientUserId, u.email,
              COALESCE(NULLIF(up.displayName, ''), NULLIF(CONCAT_WS(' ', up.firstName, up.lastName), ''), NULLIF(u.username, ''), 'Collector') as recipientName,
              up.notificationPreferences,
              EXISTS(SELECT 1 FROM tradeTrackingNumbers ttn WHERE ttn.proposalId = tp.id AND ttn.userId = u.id) as hasTracking
            FROM tradeProposals tp
            INNER JOIN users u ON u.id IN (tp.requesterId, tp.recipientId)
            LEFT JOIN userProfiles up ON up.userId = u.id
            WHERE tp.status = 'shipping' AND tp.shippingAt IS NOT NULL AND u.email IS NOT NULL`
      );
      const nowDate = new Date(now.replace(" ", "T") + "Z");
      for (const candidate of ((shipmentCandidates as unknown as any[]) || [])) {
        if (Number(candidate.hasTracking) || !isShipmentReminderEmailEnabled(candidate.notificationPreferences)) continue;
        const deadline = candidate.shippingDeadline ? new Date(candidate.shippingDeadline) : new Date(new Date(candidate.shippingAt).getTime() + 3 * 24 * 60 * 60 * 1000);
        const kind = getShipmentReminderKind(deadline, nowDate);
        if (!kind) continue;
        const markerMessage = `shipment-reminder:${shipmentReminderMarker(kind, deadline, nowDate)}`;
        const [reservation] = await db.execute(
          sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, isRead, createdAt)
              SELECT ${candidate.proposalId}, ${candidate.recipientUserId}, 'reminder', ${markerMessage}, 0, ${now}
              WHERE NOT EXISTS (SELECT 1 FROM tradeAlerts WHERE proposalId = ${candidate.proposalId} AND recipientUserId = ${candidate.recipientUserId} AND alertType = 'reminder' AND message = ${markerMessage})`
        );
        if (!(reservation as any)?.affectedRows) continue;
        try {
          await deps.sendShippingDeadlineReminderEmail({ recipientEmail: candidate.email, recipientName: candidate.recipientName, tradeRef: candidate.tradeReferenceNumber || String(candidate.proposalId), deadline: deadline.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" }), overdue: kind === "overdue" });
        } catch (error) { console.warn(`[tradeReminders] Shipment reminder email failed for proposal ${candidate.proposalId}, recipient ${candidate.recipientUserId}:`, error); }
        if (kind === "overdue") shipmentOverdueReminders++; else shipmentDueSoonReminders++;
      }

      res.json({ ok: true, autoCancelled, acceptanceTimedOut, receiptEscalated, shipmentDueSoonReminders, shipmentOverdueReminders, timestamp: now });
    } catch (error: any) {
      failed(res, "tradeReminders", error);
    }
  };
}

/**
 * Mount /health plus the cron endpoints.
 * MUST be called before the Vite / static fallthrough — `/api/scheduled/*` is not
 * auto-registered, so otherwise the cron POSTs receive the SPA HTML shell.
 */
export function registerScheduledRoutes(app: Express, deps: ScheduledDeps = defaultScheduledDeps) {
  app.get("/health", makeHealthHandler(deps));
  app.post("/api/scheduled/cleanupExpiredDrafts", makeCleanupExpiredDraftsHandler(deps));
  app.post("/api/scheduled/referralDigest", makeReferralDigestHandler(deps));
  app.post("/api/scheduled/tradeReminders", makeTradeRemindersHandler(deps));
}
