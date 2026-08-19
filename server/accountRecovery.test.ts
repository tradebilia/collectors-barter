import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PASSWORD_RECOVERY_TOKEN_TTL_MS,
  createOpaqueRecoveryToken,
  hashRecoveryToken,
  isRecoveryRequestAllowed,
  isRecoveryTokenExpired,
  normalizeRecoveryEmail,
  resetRecoveryRateLimitForTest,
  timingSafeTextEquals,
} from "./accountRecovery";

describe("account recovery security helpers", () => {
  beforeEach(() => resetRecoveryRateLimitForTest());

  it("creates opaque tokens and persists only an irreversible hash", () => {
    const token = createOpaqueRecoveryToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(hashRecoveryToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRecoveryToken(token)).not.toBe(token);
  });

  it("normalizes email and compares equal-length verification text safely", () => {
    expect(normalizeRecoveryEmail(" Member@Example.COM ")).toBe("member@example.com");
    expect(timingSafeTextEquals("123456", "123456")).toBe(true);
    expect(timingSafeTextEquals("123456", "123457")).toBe(false);
    expect(timingSafeTextEquals("123456", "12345")).toBe(false);
  });

  it("recognizes expired reset proof and bounds recovery requests", () => {
    expect(isRecoveryTokenExpired(new Date(Date.now() - 1))).toBe(true);
    expect(isRecoveryTokenExpired(new Date(Date.now() + PASSWORD_RECOVERY_TOKEN_TTL_MS))).toBe(false);
    expect(isRecoveryRequestAllowed("member@example.com", 1_000)).toBe(true);
    expect(isRecoveryRequestAllowed("member@example.com", 1_001)).toBe(true);
    expect(isRecoveryRequestAllowed("member@example.com", 1_002)).toBe(true);
    expect(isRecoveryRequestAllowed("member@example.com", 1_003)).toBe(false);
  });
});

describe("recovery source-integrity", () => {
  const projectRoot = resolve(__dirname, "..");
  const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

  it("uses verified contacts and no longer renders or saves security questions", () => {
    const setup = read("client/src/pages/AccountSetup.tsx");
    const settings = read("client/src/pages/AccountSettings.tsx");
    const signInModal = read("client/src/components/SignInModal.tsx");
    const router = read("server/routers.ts");
    expect(setup).toContain("Verify this account email");
    expect(setup).not.toContain("securityQuestion");
    expect(settings).toContain("Password recovery uses your verified Tradebilia email");
    expect(settings).not.toContain("saveSecurityQuestion");
    expect(signInModal).toContain('navigate("/forgot-password")');
    expect(router).toContain("requestPasswordRecovery");
    expect(router).toContain("completePhonePasswordRecovery");
    expect(router).not.toContain("saveSecurityQuestion:");
  });
});
