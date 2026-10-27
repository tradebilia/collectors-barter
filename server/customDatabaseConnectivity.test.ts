import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { resolveTradebiliaDatabaseTarget } from "./databaseTarget";
import { closeDb, requireDb } from "./db";

describe("active TiDB connectivity", () => {
  it("performs a read-only probe through the explicitly selected, attested new target", async () => {
    const target = resolveTradebiliaDatabaseTarget();
    expect(target.name).toBe("new");
    expect(target.expectedDatabaseName).toBe("test");

    const db = await requireDb();
    const [rows] = await db.execute(sql`SELECT DATABASE() AS databaseName`);
    expect(Array.isArray(rows) ? rows[0]?.databaseName : undefined).toBe("test");
  }, 20_000);

  it("shares one fresh attested pool across concurrent callers", async () => {
    await closeDb();
    const [first, second] = await Promise.all([requireDb(), requireDb()]);

    expect(first).toBe(second);
    const [rows] = await first.execute(sql`SELECT DATABASE() AS databaseName`);
    expect(Array.isArray(rows) ? rows[0]?.databaseName : undefined).toBe("test");
  }, 20_000);

  it("releases the callback pool before a later attested pool is adopted", async () => {
    const first = await requireDb();
    await closeDb();
    const second = await requireDb();

    expect(second).not.toBe(first);
    const [rows] = await second.execute(sql`SELECT DATABASE() AS databaseName`);
    expect(Array.isArray(rows) ? rows[0]?.databaseName : undefined).toBe("test");
  }, 20_000);
});

afterAll(async () => {
  await closeDb();
});
