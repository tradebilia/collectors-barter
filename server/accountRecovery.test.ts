import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
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
import { sendPasswordRecoveryEmail } from "./_core/email";

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

  it("does not report recovery delivery as successful when the provider rejects it", () => {
    const router = read("server/routers.ts");
    const forgotPassword = read("client/src/pages/ForgotPassword.tsx");
    expect(router).toContain("const delivered = await sendPasswordRecoveryEmail({ recipientEmail: email, token });");
    expect(router).toContain("if (!delivered) {");
    expect(router).toContain("await deletePasswordResetTokensForUser(account.id);");
    expect(router).toContain("const result = await sendVerificationCode(phone);");
    expect(router).toContain("if (!result.ok) {");
    expect(forgotPassword).toContain("recoveryErrorMessage");
  });

  it("allows registered account email recovery for legacy profiles that predate profile verification flags", () => {
    const router = read("server/routers.ts");
    const emailRecovery = router.slice(router.indexOf("requestPasswordRecovery:"), router.indexOf("requestPhonePasswordRecovery:"));
    const forgotPassword = read("client/src/pages/ForgotPassword.tsx");
    expect(emailRecovery).toContain("where(eq(users.email, email))");
    expect(emailRecovery).not.toContain("userProfiles.emailVerified");
    expect(emailRecovery).not.toContain("profile?.emailVerified");
    expect(forgotPassword).toContain("Tradebilia account email or a verified phone number");
  });

  it("matches only a stored legacy phone and requires Twilio proof before a recovery reset", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("function storedPhoneRecoveryCondition(e164Phone: string, requireVerified = false)");
    expect(router).toContain("const nationalDigits = e164Phone.startsWith(\"+1\") ? e164Phone.slice(2) : fullDigits;");
    expect(router).toContain("where(storedPhoneRecoveryCondition(phone))");
    expect(router).toContain("limit(2)");
    expect(router).toContain("if (profiles.length === 1)");
    expect(router).toContain("const result = await checkVerificationCode(phone");
    expect(router).toContain("await claimIdentity(tx, { userId: profile.userId, identityType: \"phone\", value: phone });");
    expect(router).toContain("phoneVerified: 1");
  });
});

describe("password recovery email delivery", () => {
  const originalResendApiKey = process.env.RESEND_API_KEY;
  const originalStagingMode = process.env.TRADEBILIA_STAGING_MODE;

  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-sending-key";
    delete process.env.TRADEBILIA_STAGING_MODE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalResendApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResendApiKey;
    if (originalStagingMode === undefined) delete process.env.TRADEBILIA_STAGING_MODE;
    else process.env.TRADEBILIA_STAGING_MODE = originalStagingMode;
  });

  it("dispatches the one-time reset link through the transactional email provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "email_test" }), { status: 200 }));
    await expect(sendPasswordRecoveryEmail({ recipientEmail: "member@example.com", token: "safe_test_token" })).resolves.toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain("https://tradebilia.manus.space/reset-password?token=safe_test_token");
  });
});
