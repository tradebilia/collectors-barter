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
    expect(router).toContain("const delivered = await sendPasswordRecoveryEmail({ recipientEmail, token });");
    expect(router).toContain("if (!delivered) {");
    expect(router).toContain("await deletePasswordResetTokensForUser(account.id);");
    expect(router).toContain("const result = await sendVerificationCode(phone);");
    expect(router).toContain("if (!result.ok) {");
    expect(forgotPassword).toContain("recoveryErrorMessage");
  });

  it("allows legacy recovery through either the account email or saved Tradebilia contact email", () => {
    const router = read("server/routers.ts");
    const emailRecovery = router.slice(router.indexOf("requestPasswordRecovery:"), router.indexOf("requestPhonePasswordRecovery:"));
    const forgotPassword = read("client/src/pages/ForgotPassword.tsx");
    expect(emailRecovery).toContain("leftJoin(userProfiles, eq(userProfiles.userId, users.id))");
    expect(emailRecovery).toContain("where(or(eq(users.email, email), eq(userProfiles.contactEmail, email)))");
    expect(emailRecovery).toContain("if (accounts.length !== 1) {");
    expect(emailRecovery).toContain('logPasswordRecoveryDiagnostic("email", accounts.length === 0 ? "no_account_match" : "ambiguous_account_match");');
    expect(emailRecovery).toContain("const recipientEmail = accountEmail === email ? accountEmail : profileEmail === email ? profileEmail : \"\";");
    expect(emailRecovery).not.toContain("userProfiles.emailVerified");
    expect(emailRecovery).not.toContain("profile?.emailVerified");
    expect(forgotPassword).toContain("Tradebilia account email or a verified phone number");
  });

  it("matches only a stored legacy phone and requires Twilio proof before a recovery reset", () => {
    const router = read("server/routers.ts");
    const forgotPassword = read("client/src/pages/ForgotPassword.tsx");
    expect(router).toContain("function storedPhoneRecoveryCondition(e164Phone: string, requireVerified = false)");
    expect(router).toContain("const nationalDigits = e164Phone.startsWith(\"+1\") ? e164Phone.slice(2) : fullDigits;");
    expect(router).toContain("const phoneConditions = [storedPhoneRecoveryCondition(phone)]");
    expect(router).toContain("innerJoin(users, eq(users.id, userProfiles.userId))");
    expect(router).toContain("where(and(...phoneConditions))");
    expect(router).toContain("limit(2)");
    expect(router).toContain("if (profiles.length > 1)");
    expect(router).toContain("For security, enter the email used on your Tradebilia account");
    expect(router).toContain("const result = await checkVerificationCode(phone");
    expect(router).toContain("await claimIdentity(tx, { userId: profile.userId, identityType: \"phone\", value: phone });");
    expect(forgotPassword).toContain("requestPhoneRecovery.mutateAsync({ phone, email: phoneEmail || undefined })");
    expect(forgotPassword).toContain("completePhoneRecovery.mutateAsync({ phone, email: phoneEmail || undefined, code, newPassword })");
    expect(router).toContain("phoneVerified: 1");
  });

  it("records only sanitized recovery branch outcomes for production diagnosis", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("function logPasswordRecoveryDiagnostic(channel: \"email\" | \"phone\", outcome: string)");
    expect(router).toContain("[PasswordRecovery] channel=${channel} outcome=${outcome}");
    expect(router).toContain('logPasswordRecoveryDiagnostic("email", "provider_dispatch_started")');
    expect(router).toContain('logPasswordRecoveryDiagnostic("phone", "provider_dispatch_started")');
    expect(router).toContain('code: "TOO_MANY_REQUESTS"');
    expect(router).toContain("Too many recovery code requests. Please wait a few minutes before trying again.");
    expect(router).not.toContain("console.info(`[PasswordRecovery] email=${email}");
    expect(router).not.toContain("console.info(`[PasswordRecovery] phone=${phone}");
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
