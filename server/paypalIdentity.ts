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
  "phone",
  "https://uri.paypal.com/services/paypalattributes",
];

export type PayPalIdentityReference = {
  paypalUserId: string;
  name: string | null;
  emailVerified: boolean | null;
  verifiedAccount: boolean | null;
  accountType: string | null;
  profileImageUrl: string | null;
  locale: string | null;
  connectedAt: string;
};

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
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
  const configured = process.env.PAYPAL_IDENTITY_REDIRECT_URI ?? process.env.PAYPAL_REDIRECT_URI;
  if (configured) return configured;
  if (!origin) throw new Error("PayPal identity redirect URI is not configured.");
  return `${origin.replace(/\/$/, "")}/api/paypal/callback`;
}

export function getPayPalIdentityScopes(): string[] {
  const configured = process.env.PAYPAL_IDENTITY_SCOPES
    ?.split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_SCOPES;
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

export function normalizePayPalUserInfo(payload: Record<string, unknown>, connectedAt = new Date().toISOString()): PayPalIdentityReference {
  const paypalUserId = readText(payload.user_id) ?? readText(payload.sub);
  if (!paypalUserId) throw new Error("PayPal userinfo did not include a user identifier.");
  return {
    paypalUserId,
    name: readText(payload.name),
    emailVerified: readBoolean(payload.email_verified),
    verifiedAccount: readBoolean(payload.verified_account),
    accountType: readText(payload.account_type),
    profileImageUrl: safeHttpsUrl(payload.picture ?? payload.profile_image_url),
    locale: readText(payload.locale),
    connectedAt,
  };
}

async function parseResponse(response: Response, context: string): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${context} failed (${response.status}).`);
  }
  return body as Record<string, unknown>;
}

export async function exchangePayPalIdentityCode(code: string, redirectUri: string): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal identity credentials are not configured.");
  }
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const body = await parseResponse(response, "PayPal token exchange");
  const accessToken = readText(body.access_token);
  if (!accessToken) throw new Error("PayPal token response did not include an access token.");
  return accessToken;
}

export async function fetchPayPalUserInfo(accessToken: string): Promise<PayPalIdentityReference> {
  const response = await fetch(`${PAYPAL_API_BASE}/v1/identity/oauth2/userinfo?schema=openid`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const body = await parseResponse(response, "PayPal userinfo request");
  return normalizePayPalUserInfo(body);
}

export function createPayPalOauthState(): string {
  return randomUUID();
}
