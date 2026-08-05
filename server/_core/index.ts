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
import { registerScheduledRoutes } from "../scheduledRoutes";

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

  // /health + /api/scheduled/* cron endpoints (see server/scheduledRoutes.ts).
  // Registered here, ahead of the Vite/static fallthrough, so cron POSTs reach the
  // handlers instead of being served the SPA HTML shell.
  registerScheduledRoutes(app);

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
