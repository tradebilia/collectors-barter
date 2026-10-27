import express from "express";
import { readFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  isTradebiliaMaintenanceModeEnabled,
  registerTradebiliaMaintenanceModeGuard,
} from "./maintenanceMode";

const serverSource = readFileSync(path.join(path.resolve(import.meta.dirname), "index.ts"), "utf8");

function makeApp(env: NodeJS.ProcessEnv) {
  const app = express();
  const writeHandler = vi.fn((_req, res) => res.status(200).json({ ok: true }));
  registerTradebiliaMaintenanceModeGuard(app, env);
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.post("/api/scheduled/tradeReminders", writeHandler);
  app.post("/api/trpc/trades.sendMessage", writeHandler);
  app.get("/", writeHandler);
  return { app, writeHandler };
}

describe("Tradebilia maintenance mode", () => {
  it("is disabled unless explicitly set to 1", () => {
    expect(isTradebiliaMaintenanceModeEnabled({})).toBe(false);
    expect(isTradebiliaMaintenanceModeEnabled({ TRADEBILIA_MAINTENANCE_MODE: "true" })).toBe(false);
    expect(isTradebiliaMaintenanceModeEnabled({ TRADEBILIA_MAINTENANCE_MODE: "1" })).toBe(true);
  });

  it("allows normal requests when disabled", async () => {
    const { app, writeHandler } = makeApp({});
    const response = await request(app).post("/api/trpc/trades.sendMessage");

    expect(response.status).toBe(200);
    expect(writeHandler).toHaveBeenCalledTimes(1);
  });

  it("allows only GET /health while enabled", async () => {
    const { app, writeHandler } = makeApp({ TRADEBILIA_MAINTENANCE_MODE: "1" });
    const health = await request(app).get("/health");
    const root = await request(app).get("/");
    const scheduledWriter = await request(app).post("/api/scheduled/tradeReminders");
    const trpcMutation = await request(app).post("/api/trpc/trades.sendMessage");

    expect(health.status).toBe(200);
    for (const response of [root, scheduledWriter, trpcMutation]) {
      expect(response.status).toBe(503);
      expect(response.headers["retry-after"]).toBe("120");
      expect(response.headers["cache-control"]).toContain("no-store");
      expect(response.body.error).toBe("maintenance-mode");
    }
    expect(writeHandler).not.toHaveBeenCalled();
  });

  it("mounts the real maintenance guard before every route class that could cause side effects", () => {
    const guard = serverSource.indexOf("registerTradebiliaMaintenanceModeGuard(app)");
    const downstreamRegistrations = [
      "registerStripeWebhook(app)",
      "app.use(express.json",
      "registerStorageProxy(app)",
      "registerOAuthRoutes(app)",
      "registerScheduledRoutes(app)",
      "registerProviderOAuthCallbacks(app)",
      '"/api/trpc"',
      "await setupVite(app",
      "serveStatic(app)",
    ];

    expect(guard).toBeGreaterThan(-1);
    for (const registration of downstreamRegistrations) {
      expect(serverSource.indexOf(registration), registration).toBeGreaterThan(guard);
    }
  });
});
