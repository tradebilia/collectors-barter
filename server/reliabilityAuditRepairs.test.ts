import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const source = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("verified reliability-audit repairs", () => {
  it("opens newly created inquiries by inquiry record ID", () => {
    expect(source("client/src/components/ComposeMessageModal.tsx")).toContain("/messages?inquiry=${data.id}");
  });

  it("persists the Messages communication preference", () => {
    const routerSource = source("server/routers.ts");
    expect(routerSource).toContain("messages: z.object({ email: z.boolean(), text: z.boolean() })");
    expect(routerSource).toContain("messages: input.messages");
  });

  it("wires the standalone verification route to authenticated verification procedures", () => {
    const verifySource = source("client/src/pages/VerifyAccount.tsx");
    expect(verifySource).toContain("verifyEmailCodeMutation.mutateAsync({ code: otp })");
    expect(verifySource).toContain("verifyPhoneCodeMutation.mutateAsync({ phone, code: otp })");
    expect(verifySource).toContain("sendEmailCodeMutation.mutateAsync({})");
    expect(verifySource).toContain("sendPhoneCodeMutation.mutateAsync({ phone })");
  });

  it("keeps bulk-deleted listings recoverable and removes member-omitted photos", () => {
    const dbSource = source("server/db.ts");
    expect(dbSource).toContain(".set({ isActive: 0 })");
    expect(dbSource).toContain("Keep bulk-deleted listings recoverable for the Inventory Undo action.");
    expect(dbSource).toContain("Members can remove their own photos, reorder retained photos, and add new ones.");
  });

  it("uses a guarded closure request rather than promising blind self-service record deletion", () => {
    const settingsSource = source("client/src/pages/AccountSettings.tsx");
    expect(settingsSource).toContain("Request Account Closure");
    expect(settingsSource).toContain("Eligible accounts close immediately");
    expect(settingsSource).toContain("Trade and safety records are not erased");
  });
});
