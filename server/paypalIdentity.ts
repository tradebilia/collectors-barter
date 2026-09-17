import { randomUUID } from "node:crypto";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
const PAYPAL_MODE = process.env.PAYPAL_ENV ?? process.env.PAYPAL_MODE ?? "sandbox";
const PAYPAL_API_BASE = PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const PAYPAL_AUTH_BASE = PAYPAL_MODE === "live" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com";
const DEFAULT_SCOPES = [
  "openid",
  "profile",
  "email",
  "address",
];
const ALLOWED_IDENTITY_SCOPES = new Set(DEFAULT_SCOPES);

export type PayPalIdentityReference = {
  paypalUserId: string;
  name: string | null;
  emailVerified: boolean | null;
  verifiedAccount: boolean | null;
  accountType: string | null;
  profileImageUrl: string | null;
  locale: string | null;
  connectedAt: string;
  consistency?: PayPalIdentityConsistency;
};

export type PayPalConsistencyStatus = "match" | "partial_match" | "mismatch" | "unavailable";

export type PayPalIdentityConsistency = {
  version: 1;
  evaluatedAt: string;
  name: PayPalConsistencyStatus;
  email: PayPalConsistencyStatus;
  address: PayPalConsistencyStatus;
};

export type PayPalComparisonProfile = {
  nameCandidates: Array<string | null | undefined>;
  emailCandidates: Array<string | null | undefined>;
  address: {
    street: string | null | undefined;
    town: string | null | undefined;
    state: string | null | undefined;
    zipCode: string | null | undefined;
    country: string | null | undefined;
  };
};

export class PayPalIdentityRequestError extends Error {
  constructor(
    public readonly stage: "token_exchange" | "userinfo",
    public readonly status: number,
  ) {
    super(`PayPal ${stage} failed (${status}).`);
    this.name = "PayPalIdentityRequestError";
  }
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isInternalCallbackUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return host.endsWith(".a.run.app") || host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeComparableText(value: unknown): string | null {
  const raw = readText(value);
  if (!raw) return null;
  const normalized = raw
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\bstreet\b/g, "st")
    .replace(/\broad\b/g, "rd")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\blane\b/g, "ln")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bplace\b/g, "pl")
    .replace(/\bapartment\b/g, "apt")
    .replace(/\bsuite\b/g, "ste")
    .replace(/[^a-z0-9]/g, "");
  return normalized || null;
}

function normalizedNameTokens(value: unknown): string | null {
  const raw = readText(value);
  if (!raw) return null;
  const tokens = raw
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort();
  return tokens.length ? tokens.join("|") : null;
}

function compareName(paypalName: unknown, candidates: Array<string | null | undefined>): PayPalConsistencyStatus {
  const paypalTokens = normalizedNameTokens(paypalName);
  if (!paypalTokens) return "unavailable";
  const availableCandidates = candidates.map(normalizedNameTokens).filter((value): value is string => Boolean(value));
  if (!availableCandidates.length) return "unavailable";
  return availableCandidates.includes(paypalTokens) ? "match" : "mismatch";
}

function compareEmail(
  paypalEmail: unknown,
  paypalEmailVerified: boolean | null,
  candidates: Array<string | null | undefined>,
): PayPalConsistencyStatus {
  if (paypalEmailVerified !== true) return "unavailable";
  const paypalNormalized = normalizeComparableText(paypalEmail);
  if (!paypalNormalized) return "unavailable";
  const availableCandidates = candidates.map(normalizeComparableText).filter((value): value is string => Boolean(value));
  if (!availableCandidates.length) return "unavailable";
  return availableCandidates.includes(paypalNormalized) ? "match" : "mismatch";
}

function compareAddress(payload: Record<string, unknown>, profile: PayPalComparisonProfile["address"]): PayPalConsistencyStatus {
  const paypalAddress = readRecord(payload.address) ?? readRecord(payload.addresses);
  if (!paypalAddress) return "unavailable";
  const pairs: Array<[unknown, unknown]> = [
    [paypalAddress.street_address ?? paypalAddress.address_line_1 ?? paypalAddress.line1, profile.street],
    [paypalAddress.locality ?? paypalAddress.city, profile.town],
    [paypalAddress.region ?? paypalAddress.state, profile.state],
    [paypalAddress.postal_code ?? paypalAddress.zip, profile.zipCode],
    [paypalAddress.country ?? paypalAddress.country_code, profile.country],
  ];
  let matches = 0;
  let mismatches = 0;
  for (const [paypalValue, localValue] of pairs) {
    const paypalNormalized = normalizeComparableText(paypalValue);
    const localNormalized = normalizeComparableText(localValue);
    if (!paypalNormalized || !localNormalized) continue;
    if (paypalNormalized === localNormalized) matches += 1;
    else mismatches += 1;
  }
  if (!matches && !mismatches) return "unavailable";
  if (matches >= 2 && mismatches === 0) return "match";
  if (matches > 0 && mismatches > 0) return "partial_match";
  if (mismatches >= 2) return "mismatch";
  return "unavailable";
}

export function buildPayPalIdentityConsistency(
  payload: Record<string, unknown>,
  profile: PayPalComparisonProfile,
  evaluatedAt = new Date().toISOString(),
): PayPalIdentityConsistency {
  return {
    version: 1,
    evaluatedAt,
    name: compareName(payload.name, profile.nameCandidates),
    email: compareEmail(payload.email, readBoolean(payload.email_verified), profile.emailCandidates),
    address: compareAddress(payload, profile.address),
  };
}

function safeHttpsUrl(value: unknown): string | null {
  const raw = readText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getPayPalIdentityRedirectUri(origin?: string): string {
  const identityRedirect = readText(process.env.PAYPAL_IDENTITY_REDIRECT_URI);
  if (identityRedirect && !isInternalCallbackUrl(identityRedirect)) return identityRedirect;

  const publicOrigin = readText(origin);
  if (publicOrigin && !isInternalCallbackUrl(publicOrigin)) {
    return `${publicOrigin.replace(/\/$/, "")}/api/paypal/callback`;
  }

  const legacyRedirect = readText(process.env.PAYPAL_REDIRECT_URI);
  if (legacyRedirect && !isInternalCallbackUrl(legacyRedirect)) return legacyRedirect;

  throw new Error("PayPal identity redirect URI is not configured with a public HTTPS origin.");
}

export function getPayPalIdentityScopes(): string[] {
  const configured = process.env.PAYPAL_IDENTITY_SCOPES
    ?.split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter((scope) => ALLOWED_IDENTITY_SCOPES.has(scope));
  return configured?.length ? [...new Set(configured)] : DEFAULT_SCOPES;
}

export function buildPayPalAuthorizationUrl(state: string, redirectUri: string): string {
  if (!PAYPAL_CLIENT_ID) throw new Error("PayPal client ID is not configured.");
  const url = new URL("/signin/authorize", PAYPAL_AUTH_BASE);
  url.searchParams.set("client_id", PAYPAL_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", getPayPalIdentityScopes().join(" "));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export function normalizePayPalUserInfo(
  payload: Record<string, unknown>,
  connectedAt = new Date().toISOString(),
  comparisonProfile?: PayPalComparisonProfile,
): PayPalIdentityReference {
  const paypalUserId = readText(payload.user_id) ?? readText(payload.sub);
  if (!paypalUserId) throw new Error("PayPal userinfo did not include a user identifier.");
  const reference: PayPalIdentityReference = {
    paypalUserId,
    name: readText(payload.name),
    emailVerified: readBoolean(payload.email_verified),
    verifiedAccount: readBoolean(payload.verified_account),
    accountType: readText(payload.account_type),
    profileImageUrl: safeHttpsUrl(payload.picture ?? payload.profile_image_url),
    locale: readText(payload.locale),
    connectedAt,
  };
  if (comparisonProfile) reference.consistency = buildPayPalIdentityConsistency(payload, comparisonProfile, connectedAt);
  return reference;
}

async function parseResponse(
  response: Response,
  stage: "token_exchange" | "userinfo",
): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PayPalIdentityRequestError(stage, response.status);
  }
  return body as Record<string, unknown>;
}

export async function exchangePayPalIdentityCode(code: string, redirectUri: string): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal identity credentials are not configured.");
  }
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/identity/openidconnect/tokenservice`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const body = await parseResponse(response, "token_exchange");
  const accessToken = readText(body.access_token);
  if (!accessToken) throw new Error("PayPal token response did not include an access token.");
  return accessToken;
}

export async function fetchPayPalUserInfoPayload(accessToken: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${PAYPAL_API_BASE}/v1/identity/openidconnect/userinfo/?schema=openid`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  return parseResponse(response, "userinfo");
}

export async function fetchPayPalUserInfo(accessToken: string): Promise<PayPalIdentityReference> {
  return normalizePayPalUserInfo(await fetchPayPalUserInfoPayload(accessToken));
}

export function createPayPalOauthState(): string {
  return randomUUID();
}
