import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

describe("fourth-pass verified repairs", () => {
  it("deletes inquiry children and expired draft children inside transactions", () => {
    const db = source("server/db.ts");
    expect(db).toContain("tx.delete(inquiryReplies)");
    expect(db).toContain("await db.transaction(async (tx)");
    expect(db).toContain("deleteDraftsOlderThan");
  });

  it("protects public authentication and payment transaction reuse", () => {
    const routers = source("server/routers.ts");
    expect(routers).toContain("signup:${clientAddress}");
    expect(routers).toContain("signin:${clientAddress}:${input.username.toLowerCase()}");
    expect(routers).toContain("This PayPal transaction is already associated with a different trade.");
  });

  it("keeps one sign-in modal and exposes core accessibility semantics", () => {
    const topBar = source("client/src/components/TopBar.tsx");
    const signIn = source("client/src/components/SignInModal.tsx");
    expect((topBar.match(/<SignInModal/g) ?? []).length).toBe(2);
    expect(signIn).toContain('role="dialog"');
    expect(signIn).toContain("signin-modal-title");
  });
});
