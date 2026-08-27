import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("public contact intake safeguards", () => {
  it("rate-limits submissions and makes anonymous priority server-owned", () => {
    const routers = read("server/routers.ts");
    const section = routers.slice(routers.indexOf("submitTicket: publicProcedure"), routers.indexOf("// Admin trade deletion"));
    expect(section).toContain('isRecoveryRequestAllowed(`public-contact:${clientAddress}`, Date.now(), 3)');
    expect(section).toContain('code: "TOO_MANY_REQUESTS"');
    expect(section).not.toContain("priority: z.enum");
    expect(section).toContain("'medium')");
  });

  it("stores new anonymous tickets without an administrator placeholder and exposes clear admin display fields", () => {
    const schema = read("drizzle/schema.ts");
    const migration = read("drizzle/0011_p1_contact_intake_hardening.sql");
    const admin = read("client/src/pages/AdminDashboard.tsx");
    expect(schema).toContain("userId: int().references(() => users.id)");
    expect(schema).toContain("submittedByName: varchar({ length: 100 })");
    expect(schema).toContain("submittedByEmail: varchar({ length: 320 })");
    expect(migration).toContain("MODIFY COLUMN `userId` int NULL");
    expect(migration).toContain("ADD COLUMN `submittedByName`");
    expect(migration).toContain("ADD COLUMN `submittedByEmail`");
    expect(admin).toContain("submitterDisplayName");
    expect(admin).toContain("submitterEmail");
  });
});
