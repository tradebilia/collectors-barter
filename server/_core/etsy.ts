import { createHash, randomBytes } from "node:crypto";
import { ENV } from "./env";

const ETSY_AUTHORIZE_URL = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = "https://openapi.etsy.com/v3/public/oauth/token";
const ETSY_API_BASE = "https://api.etsy.com/v3/application";

export const ETSY_SCOPES = ["email_r", "profile_r", "shops_r"] as const;

function requireEtsyConfig() {
  if (!ENV.etsyApiKeystring || !ENV.etsySharedSecret || !ENV.etsyRedirectUri) {
    throw new Error("Etsy OAuth is not configured");
  }
  return {
    keystring: ENV.etsyApiKeystring,
    sharedSecret: ENV.etsySharedSecret,
    redirectUri: ENV.etsyRedirectUri,
  };
}

export function getEtsyAuthUrl(state: string, codeChallenge: string): string {
  const { keystring, redirectUri } = requireEtsyConfig();
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: redirectUri,
    scope: ETSY_SCOPES.join(" "),
    client_id: keystring,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${ETSY_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeEtsyCode(code: string, codeVerifier: string) {
  const { keystring, sharedSecret, redirectUri } = requireEtsyConfig();
  const response = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: keystring,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
      client_secret: sharedSecret,
    }),
  });
  if (!response.ok)
    throw new Error(`Etsy token exchange failed: ${response.status}`);
  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

async function etsyGet<T>(path: string, accessToken: string): Promise<T> {
  const { keystring, sharedSecret } = requireEtsyConfig();
  const response = await fetch(`${ETSY_API_BASE}${path}`, {
    headers: {
      "x-api-key": `${keystring}:${sharedSecret}`,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok)
    throw new Error(`Etsy API request failed for ${path}: ${response.status}`);
  return (await response.json()) as T;
}

export type EtsyUser = {
  user_id: number;
  shop_id?: number;
  primary_email?: string;
  first_name?: string;
  last_name?: string;
};
export type EtsyShop = {
  shop_id: number;
  shop_name?: string;
  title?: string;
  url?: string;
  image_url_760x100?: string;
  icon_url_fullxfull?: string;
  status?: string;
};

export function createEtsyPkceVerifier() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function getEtsyUserIdFromAccessToken(accessToken: string): number {
  const match = /^(\d+)\./.exec(accessToken);
  if (!match) {
    throw new Error("Etsy access token is missing its required user ID prefix");
  }
  return Number(match[1]);
}

export async function getEtsyUser(userId: number, accessToken: string) {
  return etsyGet<EtsyUser>(`/users/${userId}`, accessToken);
}

export async function getEtsyUserShops(
  userId: number,
  accessToken: string
): Promise<EtsyShop | null> {
  try {
    return await etsyGet<EtsyShop>(`/users/${userId}/shops`, accessToken);
  } catch (error) {
    // Etsy returns 404 when an authorized account has no shop. That should
    // not prevent us from verifying the Etsy identity itself.
    if (error instanceof Error && error.message.includes(": 404")) {
      return null;
    }
    throw error;
  }
}
