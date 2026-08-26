import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, requireDb } from "./db";

describe("custom TiDB connectivity", () => {
  it("performs a read-only SELECT 1 through the configured custom connection", async () => {
    expect(process.env.CUSTOM_DATABASE_URL).toBeTruthy();
    const db = await requireDb();
    const result = await db.execute(sql`SELECT 1 AS connection_ok`);
    expect(result).toBeTruthy();
  }, 20_000);
});

afterAll(async () => {
  await closeDb();
});
