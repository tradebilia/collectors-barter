/**
 * Twilio Verify integration for SMS phone verification.
 *
 * Uses Twilio's Verify v2 API which handles code generation, expiry (10 min),
 * attempt limiting, and delivery. We never store or generate the code ourselves.
 *
 * Docs: https://www.twilio.com/docs/verify/api
 */
import { ENV } from "./_core/env";

const VERIFY_BASE = "https://verify.twilio.com/v2";

function twilioAuthHeader(): string {
  const raw = `${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export function isTwilioConfigured(): boolean {
  return Boolean(ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioVerifyServiceSid);
}

/**
 * Normalize a user-entered phone number to E.164 format.
 * Assumes US (+1) when no country code is supplied, which matches our user base.
 * Returns null when the input cannot be a valid number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;

  // Already E.164 (e.g. +447911123456)
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  // 10-digit US number → prefix +1
  if (digits.length === 10) return `+1${digits}`;
  // 11-digit starting with 1 → US with country code
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Mask a phone number for display/logging: +15551234567 → (***) ***-4567 */
export function maskPhone(e164: string): string {
  const last4 = e164.slice(-4);
  return `(***) ***-${last4}`;
}

export type SendCodeResult =
  | { ok: true; to: string; channel: string }
  | { ok: false; error: string };

/** Ask Twilio to send a 6-digit SMS code to the given E.164 phone number. */
export async function sendVerificationCode(e164Phone: string): Promise<SendCodeResult> {
  if (!isTwilioConfigured()) {
    return { ok: false, error: "SMS verification is not configured on this server." };
  }

  const body = new URLSearchParams({ To: e164Phone, Channel: "sms" });
  const res = await fetch(`${VERIFY_BASE}/Services/${ENV.twilioVerifyServiceSid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: twilioAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Common Twilio error codes worth translating for end users
    const code = data?.code;
    if (code === 60200) return { ok: false, error: "That phone number is not valid." };
    if (code === 60203) return { ok: false, error: "Too many code requests for this number. Please wait a few minutes." };
    if (code === 60205) return { ok: false, error: "SMS is not supported for this phone number." };
    if (code === 20429) return { ok: false, error: "Too many requests right now. Please try again shortly." };
    return { ok: false, error: data?.message || "Could not send the verification code." };
  }

  return { ok: true, to: data.to, channel: data.channel };
}

export type CheckCodeResult =
  | { ok: true; approved: boolean }
  | { ok: false; error: string };

/** Ask Twilio to check a code the user typed in. */
export async function checkVerificationCode(e164Phone: string, code: string): Promise<CheckCodeResult> {
  if (!isTwilioConfigured()) {
    return { ok: false, error: "SMS verification is not configured on this server." };
  }

  const body = new URLSearchParams({ To: e164Phone, Code: code });
  const res = await fetch(`${VERIFY_BASE}/Services/${ENV.twilioVerifyServiceSid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: twilioAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    const code404 = res.status === 404;
    if (code404) {
      // Verification expired or was already consumed
      return { ok: false, error: "That code has expired. Please request a new one." };
    }
    if (data?.code === 60202) {
      return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
    }
    return { ok: false, error: data?.message || "Could not check the verification code." };
  }

  return { ok: true, approved: data?.status === "approved" && data?.valid === true };
}
