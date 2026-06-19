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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

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
      // Use require for schema since it's TypeScript
      const { referralRequests } = require("../drizzle/schema");

      // Get referrals from the last 3 days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
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
      console.error('[referralDigest] Error:', error);
      res.status(500).json({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  });

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
