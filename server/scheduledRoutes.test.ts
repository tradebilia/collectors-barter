import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import express from "express";
import request from "supertest";
import { registerScheduledRoutes, type ScheduledDeps } from "./scheduledRoutes";

const projectRoot = path.resolve(import.meta.dirname, "..");
const indexSource = readFileSync(path.join(projectRoot, "server/_core/index.ts"), "utf8");
const schemaSource = readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf8");

const SCHEDULED_ENDPOINTS = [
  "cleanupExpiredDrafts",
  "referralDigest",
  "tradeReminders",
] as const;

/** A cron caller, as the Heartbeat scheduler would authenticate. */
const CRON_USER = { isCron: true, taskUid: "task_abc123" };

/**
 * Build an app with fully stubbed dependencies so the handlers can be exercised
 * without a live database or a real cron token.
 */
function makeApp(overrides: Partial<ScheduledDeps> = {}) {
  // mysql2 execute() shape:
  //   SELECT -> [[row, ...], [FieldPacket, ...]]   (result[0] is the rows array)
  //   UPDATE -> [ResultSetHeader, [FieldPacket, ...]]  (result[0].affectedRows)
  // The handler always destructures: const [first] = await db.execute(...)
  // so first = rows[] for SELECT, first = ResultSetHeader for UPDATE.
  const selectRows: any[] = (overrides as any).__selectRows ?? [];
  const fakeDb = {
    execute: vi.fn(async (q: any) => {
      // Detect SELECT vs UPDATE/INSERT/DELETE by inspecting the SQL string.
      const text: string = Array.isArray(q?.queryChunks)
        ? q.queryChunks.map((c: any) => (typeof c === "string" ? c : c?.value ?? "")).flat().join(" ")
        : String(q?.sql ?? q ?? "");
      const isSelect = /^\s*SELECT/i.test(text);
      if (isSelect) {
        // Return [[rows], [fields]] — destructuring gives rows array.
        return [selectRows, []];
      }
      // Return [ResultSetHeader, [fields]] — destructuring gives header.
      return [{ fieldCount: 0, affectedRows: 0, insertId: 0, info: "" }, []];
    }),
    select: vi.fn(() => {
      const chain: any = {
        from: () => chain,
        where: () => chain,
        orderBy: async () => selectRows,
      };
      return chain;
    }),
  };

  const deps: ScheduledDeps = {
    authenticateRequest: vi.fn(async () => CRON_USER),
    requireDb: vi.fn(async () => fakeDb),
    deleteDraftsOlderThan: vi.fn(async () => 0),
    notifyOwner: vi.fn(async () => true),
    isStagingSafetyEnabled: vi.fn(() => false),
    sendShippingDeadlineReminderEmail: vi.fn(async () => true),
    ...(Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== "__selectRows"))),
  };

  const app = express();
  app.use(express.json());
  registerScheduledRoutes(app, deps);
  return { app, deps, fakeDb };
}

describe("/health", () => {
  it("returns 200 with database connected when the DB responds", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("returns 503 with database unreachable when the DB throws", async () => {
    const { app } = makeApp({
      requireDb: vi.fn(async () => {
        throw new Error("connect ECONNREFUSED");
      }),
    });
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("error");
    expect(res.body.database).toBe("unreachable");
    expect(res.body.error).toContain("ECONNREFUSED");
  });

  it("surfaces a failing health probe even when the connection itself succeeds", async () => {
    // requireDb resolves, but `select 1` fails — still unhealthy.
    const { app } = makeApp({
      requireDb: vi.fn(async () => ({
        execute: vi.fn(async () => {
          throw new Error("query timeout");
        }),
      })),
    });
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.error).toContain("query timeout");
  });
});

describe("scheduled (cron) endpoint authorization", () => {
  for (const name of SCHEDULED_ENDPOINTS) {
    it(`${name} returns 403 when the caller is not cron`, async () => {
      const { app, deps } = makeApp({
        authenticateRequest: vi.fn(async () => ({ isCron: false, taskUid: undefined })),
      });
      const res = await request(app).post(`/api/scheduled/${name}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("cron-only");
      // The handler must bail out before touching the database.
      expect(deps.requireDb).not.toHaveBeenCalled();
    });

    it(`${name} returns 403 (not 500) when authentication throws`, async () => {
      const { app, deps } = makeApp({
        authenticateRequest: vi.fn(async () => {
          throw new Error("Invalid session cookie");
        }),
      });
      const res = await request(app).post(`/api/scheduled/${name}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("cron-only");
      expect(deps.requireDb).not.toHaveBeenCalled();
    });

    it(`${name} returns 403 when isCron is true but taskUid is missing`, async () => {
      const { app } = makeApp({
        authenticateRequest: vi.fn(async () => ({ isCron: true, taskUid: undefined })),
      });
      const res = await request(app).post(`/api/scheduled/${name}`);
      expect(res.status).toBe(403);
    });

    it(`${name} ignores an attacker-supplied taskUid in the request body`, async () => {
      // taskUid must come from the authenticated cron context, never the body.
      const { app } = makeApp({
        authenticateRequest: vi.fn(async () => ({ isCron: false, taskUid: undefined })),
      });
      const res = await request(app)
        .post(`/api/scheduled/${name}`)
        .send({ isCron: true, taskUid: "task_abc123" });
      expect(res.status).toBe(403);
    });
  }
});

describe("scheduled writer staging safety", () => {
  for (const name of SCHEDULED_ENDPOINTS) {
    it(`${name} skips all side effects when staging safety is enabled`, async () => {
      const { app, deps } = makeApp({ isStagingSafetyEnabled: vi.fn(() => true) });
      const res = await request(app).post(`/api/scheduled/${name}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, skipped: "staging-safety" });
      expect(deps.requireDb).not.toHaveBeenCalled();
      expect(deps.deleteDraftsOlderThan).not.toHaveBeenCalled();
      expect(deps.notifyOwner).not.toHaveBeenCalled();
    });
  }

  it("runs the normal cleanup writer path when staging safety is disabled", async () => {
    const { app, deps } = makeApp({
      isStagingSafetyEnabled: vi.fn(() => false),
      deleteDraftsOlderThan: vi.fn(async () => 3),
    });
    const res = await request(app).post("/api/scheduled/cleanupExpiredDrafts");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, deletedCount: 3 });
    expect(deps.requireDb).toHaveBeenCalledTimes(1);
    expect(deps.deleteDraftsOlderThan).toHaveBeenCalledTimes(1);
  });
});

describe("cleanupExpiredDrafts", () => {
  it("deletes drafts older than 30 days and reports the count", async () => {
    const { app, deps } = makeApp({ deleteDraftsOlderThan: vi.fn(async () => 7) });
    const res = await request(app).post("/api/scheduled/cleanupExpiredDrafts");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, deletedCount: 7 });

    // Verify the cutoff really is ~30 days back, not an arbitrary window.
    const cutoff = (deps.deleteDraftsOlderThan as any).mock.calls[0][1] as Date;
    const daysBack = (Date.now() - cutoff.getTime()) / 86_400_000;
    expect(daysBack).toBeGreaterThan(29.9);
    expect(daysBack).toBeLessThan(30.1);
  });

  it("returns 500 when the delete helper fails", async () => {
    const { app } = makeApp({
      deleteDraftsOlderThan: vi.fn(async () => {
        throw new Error("deadlock");
      }),
    });
    const res = await request(app).post("/api/scheduled/cleanupExpiredDrafts");
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("deadlock");
  });
});

describe("referralDigest", () => {
  it("skips notifying when there are no recent referrals", async () => {
    const { app, deps } = makeApp({ __selectRows: [] } as any);
    const res = await request(app).post("/api/scheduled/referralDigest");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, skipped: "no-referrals" });
    expect(deps.notifyOwner).not.toHaveBeenCalled();
  });

  it("notifies the owner with each referral rendered into the digest", async () => {
    const rows = [
      {
        collectorName: "Ada Lovelace",
        collectorEmail: "ada@example.com",
        collectorFocus: "Comics",
        referrerFirstName: "Alan",
        referrerLastName: "Turing",
      },
      {
        collectorName: "Grace Hopper",
        collectorEmail: "grace@example.com",
        collectorFocus: "Coins",
        referrerFirstName: "Ada",
        referrerLastName: "Lovelace",
      },
    ];
    const { app, deps } = makeApp({ __selectRows: rows } as any);
    const res = await request(app).post("/api/scheduled/referralDigest");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, referralCount: 2, notified: true });

    const payload = (deps.notifyOwner as any).mock.calls[0][0];
    expect(payload.title).toContain("2 new referrals");
    expect(payload.content).toContain("ada@example.com");
    expect(payload.content).toContain("grace@example.com");
    expect(payload.content).toContain("Alan Turing");
  });
});

describe("tradeReminders", () => {
  it("reports counts for all three timer rules", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/scheduled/tradeReminders");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      autoCancelled: 0,
      acceptanceTimedOut: 0,
      receiptEscalated: 0,
      shipmentDueSoonReminders: 0,
      shipmentOverdueReminders: 0,
    });
  });

  it("counts stale negotiations auto-cancelled by the 30-day rule", async () => {
    const requireDb = vi.fn(async () => ({
      // UPDATE returns [ResultSetHeader, fields]; SELECT returns [rows[], fields]
      execute: vi.fn(async (q: any) => {
        const text = Array.isArray(q?.queryChunks)
          ? q.queryChunks.map((c: any) => (typeof c === "string" ? c : c?.value ?? "")).flat().join(" ")
          : String(q?.sql ?? q ?? "");
        const isSelect = /^\s*SELECT/i.test(text);
        if (isSelect) return [[], []]; // no rows
        return [{ affectedRows: 4 }, []]; // UPDATE with 4 affected rows
      }),
    }));
    const { app } = makeApp({ requireDb } as any);
    const res = await request(app).post("/api/scheduled/tradeReminders");
    expect(res.status).toBe(200);
    expect(res.body.autoCancelled).toBe(4);
  });

  it("escalates overdue receipts to 'disputed' and writes an admin log row", async () => {
    const statements: string[] = [];
    const execute = vi.fn(async (q: any) => {
      const text: string = Array.isArray(q?.queryChunks)
        ? q.queryChunks.map((c: any) => (typeof c === "string" ? c : c?.value ?? "")).flat().join(" ")
        : String(q?.sql ?? "");
      statements.push(text);
      const isSelect = /^\s*SELECT/i.test(text);
      if (isSelect) {
        // 3rd call is the overdue shipments SELECT — return one row to trigger escalation.
        const selectCount = statements.filter(s => /^\s*SELECT/i.test(s)).length;
        if (selectCount === 2) return [[{ proposalId: 42 }], []]; // overdue shipments
        return [[], []]; // pending acceptances (none)
      }
      return [{ affectedRows: 0 }, []];
    });
    const { app } = makeApp({ requireDb: vi.fn(async () => ({ execute })) } as any);
    const res = await request(app).post("/api/scheduled/tradeReminders");
    expect(res.status).toBe(200);
    expect(res.body.receiptEscalated).toBe(1);

    const all = statements.join(" | ");
    expect(all).toContain("disputed");
    expect(all).toContain("tradeAdminLog");
  });

  it("preserves an accepted confirmation when its proposal is no longer eligible for cancellation", async () => {
    const statements: string[] = [];
    const execute = vi.fn(async (q: any) => {
      const text: string = Array.isArray(q?.queryChunks)
        ? q.queryChunks.map((c: any) => (typeof c === "string" ? c : c?.value ?? "")).flat().join(" ")
        : String(q?.sql ?? "");
      statements.push(text);
      const isSelect = /^\s*SELECT/i.test(text);
      if (isSelect) {
        const selectCount = statements.filter(s => /^\s*SELECT/i.test(s)).length;
        if (selectCount === 1) return [[{ proposalId: 77 }], []];
        return [[], []];
      }
      if (text.includes("72-hour acceptance window expired")) return [{ affectedRows: 0 }, []];
      return [{ affectedRows: 0 }, []];
    });
    const { app } = makeApp({ requireDb: vi.fn(async () => ({ execute })) } as any);
    const res = await request(app).post("/api/scheduled/tradeReminders");

    expect(res.status).toBe(200);
    expect(res.body.acceptanceTimedOut).toBe(0);
    const all = statements.join(" | ");
    expect(all).toContain("INNER JOIN tradeProposals");
    expect(all).toContain("tp.status = 'negotiating'");
    expect(all).not.toContain("DELETE FROM tradeReceiptConfirmation");
  });

  it("returns 500 when the database fails mid-run", async () => {
    const { app } = makeApp({
      requireDb: vi.fn(async () => ({
        execute: vi.fn(async () => {
          throw new Error("lock wait timeout");
        }),
      })),
    } as any);
    const res = await request(app).post("/api/scheduled/tradeReminders");
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("lock wait timeout");
  });
});

describe("scheduled route wiring in the real server", () => {
  it("registers the scheduled routes before the Vite/static fallthrough", () => {
    // /api/scheduled/* is not auto-registered and must be mounted ahead of the
    // SPA catch-all, otherwise the cron POSTs get served the HTML shell.
    const registration = indexSource.indexOf("registerScheduledRoutes(app)");
    const fallthrough = Math.min(
      ...["await setupVite(app", "serveStatic(app)"]
        .map((call) => indexSource.indexOf(call))
        .filter((i) => i > -1)
    );
    expect(registration).toBeGreaterThan(-1);
    expect(Number.isFinite(fallthrough)).toBe(true);
    expect(registration).toBeLessThan(fallthrough);
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
