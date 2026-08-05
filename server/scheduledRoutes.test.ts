import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const indexSource = readFileSync(path.join(projectRoot, "server/_core/index.ts"), "utf8");
const schemaSource = readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf8");

const SCHEDULED_ENDPOINTS = [
  "cleanupExpiredDrafts",
  "referralDigest",
  "tradeReminders",
] as const;

describe("scheduled (cron) route registration", () => {
  it("mounts every scheduled endpoint explicitly", () => {
    for (const name of SCHEDULED_ENDPOINTS) {
      expect(indexSource).toContain(`app.post("/api/scheduled/${name}"`);
    }
  });

  it("mounts the /health check", () => {
    expect(indexSource).toContain('app.get("/health"');
  });

  it("registers scheduled routes before the Vite/static fallthrough", () => {
    // /api/scheduled/* is not auto-registered and must be mounted ahead of the
    // SPA catch-all, otherwise the cron POSTs get served the HTML shell.
    const lastScheduled = Math.max(
      ...SCHEDULED_ENDPOINTS.map((n) => indexSource.indexOf(`app.post("/api/scheduled/${n}"`))
    );
    // Compare against the CALL sites, not the top-of-file import statement.
    const fallthrough = Math.min(
      ...["await setupVite(app", "serveStatic(app)"]
        .map((call) => indexSource.indexOf(call))
        .filter((i) => i > -1)
    );
    expect(lastScheduled).toBeGreaterThan(-1);
    expect(Number.isFinite(fallthrough)).toBe(true);
    expect(lastScheduled).toBeLessThan(fallthrough);
  });
});

describe("scheduled (cron) route authorization", () => {
  it("gates every scheduled endpoint on isCron AND taskUid", () => {
    // Each handler must reject non-cron callers. Counting the guard occurrences
    // ensures a newly added endpoint cannot silently skip the check.
    const guards = indexSource.match(/!user\.isCron \|\| !user\.taskUid/g) ?? [];
    expect(guards.length).toBe(SCHEDULED_ENDPOINTS.length);
  });

  it("returns 403 rather than leaking a 500 when authentication fails", () => {
    const cronOnly = indexSource.match(/res\.status\(403\)\.json\(\{ error: "cron-only" \}\)/g) ?? [];
    // Two per handler: one for the auth throw, one for the isCron/taskUid guard.
    expect(cronOnly.length).toBe(SCHEDULED_ENDPOINTS.length * 2);
  });

  it("never trusts req.body for identifying the scheduled job", () => {
    // taskUid comes from the cron system; req.body is attacker-controllable.
    for (const name of SCHEDULED_ENDPOINTS) {
      const start = indexSource.indexOf(`app.post("/api/scheduled/${name}"`);
      const nextRoute = indexSource.indexOf("app.post(", start + 10);
      const nextGet = indexSource.indexOf("app.get(", start + 10);
      const candidates = [nextRoute, nextGet].filter((i) => i > start);
      const end = candidates.length ? Math.min(...candidates) : indexSource.length;
      const handler = indexSource.slice(start, end);
      expect(handler).not.toContain("req.body");
    }
  });
});

describe("tradeProposals status enum", () => {
  const statusLine = schemaSource
    .split("\n")
    .find((line) => line.includes("status: mysqlEnum") && line.includes("'frozen'"));

  it("includes 'disputed' so fileComplaint and the 15-day escalation can persist", () => {
    // Regression guard: fileComplaint (tradeFlowRouter) and the tradeReminders
    // cron both write status='disputed'. Under STRICT_TRANS_TABLES a missing
    // enum member makes those UPDATEs throw instead of coercing.
    expect(statusLine).toBeDefined();
    expect(statusLine).toContain("'disputed'");
  });

  it("still contains every previously supported status", () => {
    for (const status of [
      "pending",
      "negotiating",
      "accepted",
      "shipping",
      "shipped",
      "declined",
      "completed",
      "cancelled",
      "frozen",
    ]) {
      expect(statusLine).toContain(`'${status}'`);
    }
  });
});
