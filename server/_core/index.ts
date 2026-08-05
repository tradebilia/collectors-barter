import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { customAuth } from "./customAuth";
import { COOKIE_NAME } from "../../shared/const";
import { sdk } from "./sdk";
import { notifyOwner } from "./notification";
import { desc, gte } from "drizzle-orm";
import { referralRequests } from "../../drizzle/schema";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Health check — verifies the process is up AND the database is reachable.
  app.get("/health", async (_req, res) => {
    try {
      const { requireDb } = await import("../db");
      const db = await requireDb();
      const { sql } = await import("drizzle-orm");
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
  });

  // ==========================================================================
  // SCHEDULED (CRON) ENDPOINTS
  // Invoked by the Heartbeat scheduler, never by end users. Every handler
  // rejects any caller whose token is not a cron token.
  // ==========================================================================

  // Delete abandoned draft listings older than 30 days.
  app.post("/api/scheduled/cleanupExpiredDrafts", async (req, res) => {
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        return res.status(403).json({ error: "cron-only" });
      }
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }
      const { requireDb, deleteDraftsOlderThan } = await import("../db");
      const db = await requireDb();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deletedCount = await deleteDraftsOlderThan(db, thirtyDaysAgo);
      res.json({ ok: true, deletedCount, cutoffDate: thirtyDaysAgo.toISOString() });
    } catch (error: any) {
      console.error("[cleanupExpiredDrafts] Error:", error);
      res.status(500).json({ error: error?.message ?? String(error), timestamp: new Date().toISOString() });
    }
  });

  // Email the project owner a digest of referral requests from the last 3 days.
  app.post("/api/scheduled/referralDigest", async (req, res) => {
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        return res.status(403).json({ error: "cron-only" });
      }
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }
      const { requireDb } = await import("../db");
      const db = await requireDb();
      // Schema timestamps are string-mode, so compare against a MySQL datetime string.
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      const pendingReferrals = await db
        .select()
        .from(referralRequests)
        .where(gte(referralRequests.createdAt, threeDaysAgo))
        .orderBy(desc(referralRequests.createdAt));
      if (pendingReferrals.length === 0) {
        return res.json({ ok: true, skipped: "no-referrals" });
      }
      const referralLines = pendingReferrals.map(
        (ref: any) =>
          `- ${ref.collectorName} (${ref.collectorEmail}) - Focus: ${ref.collectorFocus} - Referrer: ${ref.referrerFirstName} ${ref.referrerLastName}`
      );
      const delivered = await notifyOwner({
        title: `Tradebilia Referral Digest - ${pendingReferrals.length} new referrals`,
        content: [
          `You have ${pendingReferrals.length} new referral request(s) from the past 3 days:\n`,
          referralLines.join("\n"),
        ].join("\n"),
      });
      res.json({ ok: true, referralCount: pendingReferrals.length, notified: delivered });
    } catch (error: any) {
      console.error("[referralDigest] Error:", error);
      res.status(500).json({ error: error?.message ?? String(error), timestamp: new Date().toISOString() });
    }
  });

  // Enforce all trade-lifecycle timers: stale-negotiation auto-cancel,
  // acceptance-window expiry, and overdue-receipt escalation.
  app.post("/api/scheduled/tradeReminders", async (req, res) => {
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        return res.status(403).json({ error: "cron-only" });
      }
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }
      const { requireDb } = await import("../db");
      const db = await requireDb();
      const { sql } = await import("drizzle-orm");
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      let autoCancelled = 0;
      let acceptanceTimedOut = 0;
      let receiptEscalated = 0;

      // 1. 30-day auto-cancel: negotiating trades with no activity for 30 days.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      const [staleResult] = await db.execute(
        sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Auto-cancelled: 30 days of no activity', updatedAt = ${now} WHERE status IN ('pending', 'negotiating') AND lastActivityAt IS NOT NULL AND lastActivityAt < ${thirtyDaysAgo}`
      );
      autoCancelled = (staleResult as any)?.affectedRows || 0;

      // 2. 72-hour acceptance timeout: one party accepted, the other never confirmed.
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      const [pendingAcceptances] = await db.execute(
        sql`SELECT proposalId FROM tradeReceiptConfirmation WHERE confirmationType = 'accepted' AND confirmedAt < ${threeDaysAgo}`
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
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      const [overdueShipments] = await db.execute(
        sql`SELECT DISTINCT proposalId FROM tradeTrackingNumbers WHERE submittedAt < ${fifteenDaysAgo} AND proposalId NOT IN (SELECT proposalId FROM tradeReceiptConfirmation WHERE confirmationType = 'received') AND proposalId IN (SELECT id FROM tradeProposals WHERE status IN ('accepted', 'shipped'))`
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

      res.json({ ok: true, autoCancelled, acceptanceTimedOut, receiptEscalated, timestamp: now });
    } catch (error: any) {
      console.error("[tradeReminders] Error:", error);
      res.status(500).json({ error: error?.message ?? String(error), timestamp: new Date().toISOString() });
    }
  });

  // eBay OAuth callback — handles redirect from eBay after user authorizes
  app.get("/api/ebay/callback", async (req: any, res: any) => {
    const code = req.query.code as string | undefined;
    if (!code) return res.redirect(302, "/account-settings?ebay=error&reason=no_code");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?ebay=error&reason=not_logged_in");
      const { handleEbayCallback } = await import("./ebayCallback");
      await handleEbayCallback(code, user.id);
      return res.redirect(302, "/account-settings?ebay=connected&tab=integrations");
    } catch (err) {
      console.error("[eBay Callback] Error:", err);
      return res.redirect(302, "/account-settings?ebay=error&reason=callback_failed");
    }
  });

  // Facebook OAuth callback — handles redirect from Facebook after user authorizes
  app.get("/api/facebook/callback", async (req: any, res: any) => {
    const code = req.query.code as string | undefined;
    if (req.query.error) return res.redirect(302, "/account-settings?facebook=error&reason=access_denied&tab=integrations");
    if (!code) return res.redirect(302, "/account-settings?facebook=error&reason=no_code&tab=integrations");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?facebook=error&reason=not_logged_in&tab=integrations");
      const { handleFacebookCallback } = await import("./facebookCallback");
      await handleFacebookCallback(code, user.id);
      return res.redirect(302, "/account-settings?facebook=connected&tab=integrations");
    } catch (err) {
      console.error("[Facebook Callback] Error:", err);
      return res.redirect(302, "/account-settings?facebook=error&reason=callback_failed&tab=integrations");
    }
  });

  // LinkedIn OAuth callback — handles redirect from LinkedIn after user authorizes
  app.get("/api/linkedin/callback", async (req: any, res: any) => {
    const code = req.query.code as string | undefined;
    if (req.query.error) return res.redirect(302, "/account-settings?linkedin=error&reason=access_denied&tab=integrations");
    if (!code) return res.redirect(302, "/account-settings?linkedin=error&reason=no_code&tab=integrations");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?linkedin=error&reason=not_logged_in&tab=integrations");
      const { handleLinkedInCallback } = await import("./linkedinCallback");
      await handleLinkedInCallback(code, user.id);
      return res.redirect(302, "/account-settings?linkedin=connected&tab=integrations");
    } catch (err) {
      console.error("[LinkedIn Callback] Error:", err);
      return res.redirect(302, "/account-settings?linkedin=error&reason=callback_failed&tab=integrations");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
