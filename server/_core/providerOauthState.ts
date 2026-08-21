import { randomBytes, timingSafeEqual } from "node:crypto";

export const PROVIDER_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export type ProviderOauthName = "ebay" | "facebook" | "linkedin";

export function providerOauthStateCookieName(provider: ProviderOauthName): string {
  return `tradebilia_${provider}_oauth_state`;
}

export function createProviderOauthState(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidProviderOauthState(expected: string | undefined, received: unknown): boolean {
  if (!expected || typeof received !== "string") return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export function setProviderOauthStateCookie(
  res: { cookie: (name: string, value: string, options: Record<string, unknown>) => unknown },
  provider: ProviderOauthName,
  state: string,
): void {
  res.cookie(providerOauthStateCookieName(provider), state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api",
    maxAge: PROVIDER_OAUTH_STATE_TTL_MS,
  });
}

export function clearProviderOauthStateCookie(
  res: { clearCookie: (name: string, options: Record<string, unknown>) => unknown },
  provider: ProviderOauthName,
): void {
  res.clearCookie(providerOauthStateCookieName(provider), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api",
  });
}
