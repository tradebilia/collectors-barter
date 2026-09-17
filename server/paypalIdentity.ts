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

export type PayPalComparisonProfileInput = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  accountEmail: string | null | undefined;
  address: PayPalComparisonProfile["address"];
};

export type PayPalAddressFieldConsistency = {
  street: PayPalConsistencyStatus;
  town: PayPalConsistencyStatus;
  state: PayPalConsistencyStatus;
  zipCode: PayPalConsistencyStatus;
  country: PayPalConsistencyStatus;
};

export type PayPalComparisonInspection = {
  inspectedAt: string;
  paypal: {
    name: string | null;
    email: string | null;
    emailVerified: boolean | null;
    address: {
      street: string | null;
      town: string | null;
      state: string | null;
      zipCode: string | null;
      country: string | null;
    };
  };
  tradebilia: {
    nameCandidates: string[];
    emailCandidates: string[];
    address: PayPalComparisonProfile["address"];
  };
  outcomes: PayPalIdentityConsistency;
  addressFields: PayPalAddressFieldConsistency;
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

/**
 * PayPal returns US regions as postal abbreviations, while Tradebilia asks
 * members for their complete state or territory name. Canonicalize the
 * abbreviation before comparison without changing either displayed value.
 */
const US_REGION_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AS: "American Samoa", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", GU: "Guam", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  MP: "Northern Mariana Islands", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  PR: "Puerto Rico", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VI: "U.S. Virgin Islands", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

function normalizeComparableRegion(value: unknown): string | null {
  const raw = readText(value);
  if (!raw) return null;
  const compactCode = raw.replace(/[.\s]/g, "").toUpperCase();
  return normalizeComparableText(US_REGION_NAMES[compactCode] ?? raw);
}

/**
 * PayPal Identity commonly returns an ISO 3166-1 alpha-2 country code (for
 * example, US) whereas the Tradebilia profile stores the full country name.
 */
function normalizeComparableCountry(value: unknown): string | null {
  const raw = readText(value);
  if (!raw) return null;
  const compact = raw.replace(/[.\s]/g, "").toUpperCase();
  if (compact === "USA" || compact === "UNITEDSTATESOFAMERICA") return normalizeComparableText("United States");

  if (/^[A-Z]{2}$/.test(compact)) {
    try {
      const expanded = new Intl.DisplayNames(["en"], { type: "region" }).of(compact);
      if (expanded) return normalizeComparableText(expanded);
    } catch {
      // A malformed or unsupported code falls through to ordinary text comparison.
    }
  }
  return normalizeComparableText(raw);
}

/**
 * The approved identity check intentionally uses one account name and one
 * signup email. Profile display names and alternate contact emails are not
 * identity candidates for this comparison.
 */
export function buildPayPalComparisonProfile(input: PayPalComparisonProfileInput): PayPalComparisonProfile {
  const fullName = [readText(input.firstName), readText(input.lastName)].filter((value): value is string => Boolean(value)).join(" ");
  const accountEmail = readText(input.accountEmail);
  return {
    nameCandidates: fullName ? [fullName] : [],
    emailCandidates: accountEmail ? [accountEmail] : [],
    address: input.address,
  };
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

function getPayPalAddressValues(payload: Record<string, unknown>) {
  const paypalAddress = readRecord(payload.address) ?? readRecord(payload.addresses);
  return {
    street: paypalAddress?.street_address ?? paypalAddress?.address_line_1 ?? paypalAddress?.line1,
    town: paypalAddress?.locality ?? paypalAddress?.city,
    state: paypalAddress?.region ?? paypalAddress?.state,
    zipCode: paypalAddress?.postal_code ?? paypalAddress?.zip,
    country: paypalAddress?.country ?? paypalAddress?.country_code,
  };
}

function compareAddressField(paypalValue: unknown, localValue: unknown, normalizer = normalizeComparableText): PayPalConsistencyStatus {
  const paypalNormalized = normalizer(paypalValue);
  const localNormalized = normalizer(localValue);
  if (!paypalNormalized || !localNormalized) return "unavailable";
  return paypalNormalized === localNormalized ? "match" : "mismatch";
}

export function buildPayPalAddressFieldConsistency(
  payload: Record<string, unknown>,
  profile: PayPalComparisonProfile["address"],
): PayPalAddressFieldConsistency {
  const paypalAddress = getPayPalAddressValues(payload);
  return {
    street: compareAddressField(paypalAddress.street, profile.street),
    town: compareAddressField(paypalAddress.town, profile.town),
    state: compareAddressField(paypalAddress.state, profile.state, normalizeComparableRegion),
    zipCode: compareAddressField(paypalAddress.zipCode, profile.zipCode),
    country: compareAddressField(paypalAddress.country, profile.country, normalizeComparableCountry),
  };
}

function compareAddress(payload: Record<string, unknown>, profile: PayPalComparisonProfile["address"]): PayPalConsistencyStatus {
  const fieldOutcomes = buildPayPalAddressFieldConsistency(payload, profile);
  const outcomes = Object.values(fieldOutcomes);
  let matches = 0;
  let mismatches = 0;
  for (const outcome of outcomes) {
    if (outcome === "match") matches += 1;
    if (outcome === "mismatch") mismatches += 1;
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

export function buildPayPalComparisonInspection(
  payload: Record<string, unknown>,
  profile: PayPalComparisonProfile,
  inspectedAt = new Date().toISOString(),
): PayPalComparisonInspection {
  const paypalAddress = getPayPalAddressValues(payload);
  return {
    inspectedAt,
    paypal: {
      name: readText(payload.name),
      email: readText(payload.email),
      emailVerified: readBoolean(payload.email_verified),
      address: {
        street: readText(paypalAddress.street),
        town: readText(paypalAddress.town),
        state: readText(paypalAddress.state),
        zipCode: readText(paypalAddress.zipCode),
        country: readText(paypalAddress.country),
      },
    },
    tradebilia: {
      nameCandidates: profile.nameCandidates.filter((value): value is string => Boolean(readText(value))),
      emailCandidates: profile.emailCandidates.filter((value): value is string => Boolean(readText(value))),
      address: profile.address,
    },
    outcomes: buildPayPalIdentityConsistency(payload, profile, inspectedAt),
    addressFields: buildPayPalAddressFieldConsistency(payload, profile.address),
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
