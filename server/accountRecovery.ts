import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const PASSWORD_RECOVERY_TOKEN_TTL_MS = 30 * 60 * 1000;
export const RECOVERY_REQUEST_WINDOW_MS = 15 * 60 * 1000;
export const RECOVERY_REQUEST_LIMIT = 3;

type RecoveryRequestWindow = { count: number; resetAt: number };

const requestWindows = new Map<string, RecoveryRequestWindow>();

export function normalizeRecoveryEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createOpaqueRecoveryToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRecoveryToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSixDigitCode(): string {
  const bytes = randomBytes(4);
  const value = bytes.readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, "0");
}

export function timingSafeTextEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function isRecoveryRequestAllowed(key: string, now = Date.now()): boolean {
  const existing = requestWindows.get(key);
  if (!existing || existing.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + RECOVERY_REQUEST_WINDOW_MS });
    return true;
  }
  if (existing.count >= RECOVERY_REQUEST_LIMIT) return false;
  existing.count += 1;
  return true;
}

export function resetRecoveryRateLimitForTest(key?: string) {
  if (key) requestWindows.delete(key);
  else requestWindows.clear();
}

export function isRecoveryTokenExpired(expiresAt: string | Date, now = Date.now()): boolean {
  const expiresAtMs = new Date(expiresAt).getTime();
  return !Number.isFinite(expiresAtMs) || expiresAtMs <= now;
}
