import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";
import { notifyOwner } from "./notification";
import { desc, gte } from "drizzle-orm";
import { referralRequests } from "../../drizzle/schema";
import { validateEnvironment, validateDatabaseConnection } from "./startupChecks";

// Bind strictly to the configured port. Previously the server silently
// "drifted" to 3001+ when 3000 was briefly busy during a restart, while the
// frontend/proxy still pointed at 3000 — the classic "server is running but
// nothing connects" failure. Now we retry the SAME port a few times (to ride
// out a not-yet-dead old process) and fail loudly if it stays occupied.
function listenOnPort(server: ReturnType<typeof createServer>, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      server.removeListener("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port);
  });
}

async function listenWithRetry(
  server: ReturnType<typeof createServer>,
  port: number,
  attempts = 5,
  delayMs = 500,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await listenOnPort(server, port);
      return;
    } catch (err: any) {
      if (err?.code === "EADDRINUSE" && attempt < attempts) {
        console.warn(
          `[startup] Port ${port} busy (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms...`,
        );
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
}

async function startServer() {
  // Fail fast on misconfiguration instead of failing cryptically at first request.
  validateEnvironment();
  await validateDatabaseConnection();

  const app = express();
  // Trust proxy is required for the session cookie to be set correctly behind 
  // the Manus proxy (handles HTTPS termination). Without this, req.secure is 
  // false, and the 'secure: true' cookie is rejected by the browser.
  app.set('trust proxy', true);
  const server = createServer(app);

  // Health endpoint: lets tooling (and humans) verify the server AND its
  // database connection are actually working, not just that a process exists.
  app.get("/health", async (_req, res) => {
    try {
      const { requireDb } = await import("../db");
      const db = await requireDb();
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`select 1`);
      res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: "degraded", database: "unreachable", timestamp: new Date().toISOString() });
    }
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // eBay OAuth callback — handles redirect from eBay after user authorizes
  app.get("/api/ebay/callback", async (req: any, res: any) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code) {
      return res.redirect(302, "/account-settings?ebay=error&reason=no_code");
    }

    try {
      // Identify the logged-in user from session cookie
      const { customAuth } = await import("./customAuth");
      const COOKIE_NAME = "app_session_id";
      // Parse cookie header manually (cookie-parser not installed)
      const cookieHeader = req.headers?.cookie || "";
      const cookies = new Map<string, string>();
      cookieHeader.split(";").forEach((part: string) => {
        const [k, ...v] = part.trim().split("=");
        if (k) cookies.set(k.trim(), decodeURIComponent(v.join("=").trim()));
      });
      const sessionCookie = cookies.get(COOKIE_NAME);
      const user = await customAuth.getUserFromSession(sessionCookie);

      if (!user) {
        return res.redirect(302, "/account-settings?ebay=error&reason=not_logged_in");
      }

      const { handleEbayCallback } = await import("./ebayCallback");
      await handleEbayCallback(code, user.id);

      return res.redirect(302, "/account-settings?ebay=connected&tab=integrations");
    } catch (error) {
      console.error("[eBay Callback] Error:", error);
      return res.redirect(302, "/account-settings?ebay=error&reason=callback_failed");
    }
  });

  // Facebook OAuth callback — handles redirect from Facebook after user authorizes
  app.get("/api/facebook/callback", async (req: any, res: any) => {
    const code = req.query.code as string | undefined;
    const error = req.query.error as string | undefined;

    // User denied access on Facebook
    if (error) {
      return res.redirect(302, "/account-settings?facebook=error&reason=access_denied&tab=integrations");
    }

    if (!code) {
      return res.redirect(302, "/account-settings?facebook=error&reason=no_code&tab=integrations");
    }

    try {
      // Identify the logged-in user from session cookie (same pattern as eBay)
      const { customAuth } = await import("./customAuth");
      const COOKIE_NAME = "app_session_id";
      const cookieHeader = req.headers?.cookie || "";
      const cookies = new Map<string, string>();
      cookieHeader.split(";").forEach((part: string) => {
        const [k, ...v] = part.trim().split("=");
        if (k) cookies.set(k.trim(), decodeURIComponent(v.join("=").trim()));
      });
      const sessionCookie = cookies.get(COOKIE_NAME);
      const user = await customAuth.getUserFromSession(sessionCookie);

      if (!user) {
        return res.redirect(302, "/account-settings?facebook=error&reason=not_logged_in&tab=integrations");
      }

      const { handleFacebookCallback } = await import("./facebookCallback");
      await handleFacebookCallback(code, user.id);
      return res.redirect(302, "/account-settings?facebook=connected&tab=integrations");
    } catch (err) {
      console.error("[Facebook Callback] Error:", err);
      return res.redirect(302, "/account-settings?facebook=error&reason=callback_failed&tab=integrations");
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

  // Scheduled draft cleanup endpoint
  app.post("/api/scheduled/cleanupExpiredDrafts", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }

      // Dynamic import to get db instance
      const { requireDb, deleteDraftsOlderThan } = await import("../db");
      const db = await requireDb();

      // Delete drafts older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deletedCount = await deleteDraftsOlderThan(db, thirtyDaysAgo);

      res.json({ ok: true, deletedCount, cutoffDate: thirtyDaysAgo.toISOString() });
    } catch (error: any) {
      console.error("[cleanupExpiredDrafts] Error:", error);
      res.status(500).json({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Scheduled referral digest endpoint
  app.post("/api/scheduled/referralDigest", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }

      // Dynamic import to get db instance
      const { requireDb } = await import("../db");
      const db = await requireDb();
      // NOTE: previously used `require("../drizzle/schema")` which crashes in
      // ESM at runtime; schema is now statically imported at the top of file.

      // Get referrals from the last 3 days. Schema timestamps are
      // string-mode, so compare with a MySQL-format datetime string.
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      const pendingReferrals = await db.select()
        .from(referralRequests)
        .where(gte(referralRequests.createdAt, threeDaysAgo))
        .orderBy(desc(referralRequests.createdAt));

      if (pendingReferrals.length === 0) {
        return res.json({ ok: true, skipped: "no-referrals" });
      }

      // Build digest email
      const referralLines = pendingReferrals.map((ref: any) => 
        `• ${ref.collectorName} (${ref.collectorEmail}) - Focus: ${ref.collectorFocus} - Referrer: ${ref.referrerFirstName} ${ref.referrerLastName}`
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
      res.status(500).json({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Scheduled trade reminders endpoint — handles all trade timers
  app.post("/api/scheduled/tradeReminders", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }

      const { requireDb } = await import("../db");
      const db = await requireDb();
      const { sql } = await import("drizzle-orm");
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      let autoCancelled = 0;
      let acceptanceTimedOut = 0;
      let receiptEscalated = 0;

      // 1. 30-day auto-cancel: Trades in negotiating with no activity for 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      const [staleResult] = await db.execute(
        sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Auto-cancelled: 30 days of no activity', updatedAt = ${now} WHERE status IN ('pending', 'negotiating') AND lastActivityAt IS NOT NULL AND lastActivityAt < ${thirtyDaysAgo}`
      );
      autoCancelled = (staleResult as any)?.affectedRows || 0;

      // 2. 72-hour acceptance timeout: First acceptance recorded but other party hasn't confirmed in 3 days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      const [pendingAcceptances] = await db.execute(
        sql`SELECT proposalId FROM tradeReceiptConfirmation WHERE confirmationType = 'accepted' AND confirmedAt < ${threeDaysAgo}`
      );
      for (const row of (pendingAcceptances as unknown as any[] || [])) {
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Auto-cancelled: 72-hour acceptance window expired', updatedAt = ${now} WHERE id = ${row.proposalId} AND status = 'negotiating'`
        );
        await db.execute(
          sql`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${row.proposalId} AND confirmationType = 'accepted'`
        );
        acceptanceTimedOut++;
      }

      // 3. 15-day receipt timeout: Tracking submitted but no receipt confirmation in 15 days
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      const [overdueShipments] = await db.execute(
        sql`SELECT DISTINCT proposalId FROM tradeTrackingNumbers WHERE submittedAt < ${fifteenDaysAgo} AND proposalId NOT IN (SELECT proposalId FROM tradeReceiptConfirmation WHERE confirmationType = 'received') AND proposalId IN (SELECT id FROM tradeProposals WHERE status IN ('accepted', 'shipped'))`
      );
      for (const row of (overdueShipments as unknown as any[] || [])) {
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
      res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
    }
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  await listenWithRetry(server, port);
  console.log(`[startup] Port check: PASS (bound to ${port})`);
  console.log(`Server running on http://localhost:${port}/`);

  // Graceful shutdown: close the HTTP server and database pool so restarts
  // never leave stale sockets holding the port (the cause of past restart
  // failures) or half-open DB connections.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] Received ${signal}, closing server...`);
    // Terminate idle keep-alive sockets immediately so close() doesn't hang
    // waiting for browsers/Vite HMR clients to drop their connections.
    server.closeAllConnections?.();
    server.close(async () => {
      try {
        const { closeDb } = await import("../db");
        await closeDb();
      } catch {
        // best-effort pool cleanup
      }
      console.log("[shutdown] Clean exit.");
      process.exit(0);
    });
    // Force-exit if something refuses to drain within 2s.
    setTimeout(() => process.exit(1), 2000).unref();
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

startServer().catch(err => {
  console.error("[startup] FATAL: server failed to start:", err?.message ?? err);
  process.exit(1);
});
