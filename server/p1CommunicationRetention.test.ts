import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const schema = readFileSync(join(root, "drizzle/schema.ts"), "utf8");
const router = readFileSync(join(root, "server/routers.ts"), "utf8");
const persistence = readFileSync(join(root, "server/directMessagePersistence.ts"), "utf8");
const db = readFileSync(join(root, "server/db.ts"), "utf8");
const migration = readFileSync(join(root, "drizzle/0013_p1_member_communication_archives.sql"), "utf8");

describe("second deep-audit member communication retention", () => {
  it("uses additive participant-specific archive fields and preserves legacy inquiry bodies", () => {
    for (const field of ["senderArchivedAt", "recipientArchivedAt", "participantAArchivedAt", "participantBArchivedAt"]) {
      expect(schema).toContain(field);
      expect(migration).toContain(field);
    }
    expect(migration).toContain("WHERE `deletedAt` IS NOT NULL");
    expect(migration).not.toContain("DELETE FROM");
  });

  it("archives only the requesting member, retains archive access, and restores visibility on a new message", () => {
    expect(router).toContain("input(z.object({ archived: z.boolean().optional().default(false) }).optional())");
    expect(router).toContain("participantAArchivedAt IS NOT NULL");
    expect(router).toContain("participantBArchivedAt IS NOT NULL");
    expect(router).toContain("? { participantAArchivedAt: sql`NOW()` }");
    expect(router).toContain(": { participantBArchivedAt: sql`NOW()` }");
    expect(router).not.toContain("db.delete(directMessageThreads)");
    expect(persistence).toContain("participantAArchivedAt = NULL");
    expect(persistence).toContain("participantBArchivedAt = NULL");
    expect(db).toContain("senderArchivedAt: mysqlNow()");
    expect(db).toContain("recipientArchivedAt: mysqlNow()");
    expect(db).toContain("senderArchivedAt: null");
    expect(db).toContain("recipientArchivedAt: null");
  });

  it("does not surface archived correspondence as unread or permit permanent client-side purging", () => {
    expect(db).toContain("isNull(itemInquiries.senderArchivedAt)");
    expect(db).toContain("isNull(itemInquiries.recipientArchivedAt)");
    expect(db).toContain("participantAArchivedAt IS NULL");
    expect(db).toContain("participantBArchivedAt IS NULL");
    expect(db).toContain("preserved: true");
    expect(router).toContain("participantAArchivedAt IS NULL");
    expect(router).toContain("participantBArchivedAt IS NULL");
  });

  it("keeps the personal archive readable but read-only in the member interface", () => {
    const messages = readFileSync(join(root, "client/src/pages/Messages.tsx"), "utf8");
    expect(messages).toContain('{ value: "deleted", label: "Archived" }');
    expect(messages).toContain("getDirectMessageThreads.useQuery({ archived: true }");
    expect(messages).toContain('folder === "deleted" && activeThread.kind === "direct"');
    expect(messages).toContain("not permanently deleted here");
  });
});
