/**
 * LinkedIn OAuth 2.0 integration for Tradebilia.
 *
 * Flow:
 *  1. getLinkedInAuthUrl(state)  → redirect user to LinkedIn login
 *  2. User approves → LinkedIn redirects to /api/linkedin/callback?code=...
 *  3. exchangeLinkedInCode(code) → get access token
 *  4. getLinkedInUserInfo(token) → get user profile data
 *
 * LinkedIn API version: v2
 * Scopes used: openid, profile, email
 * (These are the standard OpenID Connect scopes available to all LinkedIn apps)
 */
import { ENV } from "./env";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

// OpenID Connect scopes — available to all LinkedIn apps without review
const LINKEDIN_SCOPES = ["openid", "profile", "email"].join(" ");

export interface LinkedInTokenData {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

export interface LinkedInUserInfo {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  headline?: string;
  profileUrl?: string;
}

/**
 * Build the URL to redirect the user to for LinkedIn login.
 */
export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ENV.linkedinClientId,
    redirect_uri: ENV.linkedinRedirectUri,
    state,
    scope: LINKEDIN_SCOPES,
  });
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the authorization code returned by LinkedIn for an access token.
 */
export async function exchangeLinkedInCode(code: string): Promise<LinkedInTokenData> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: ENV.linkedinRedirectUri,
    client_id: ENV.linkedinClientId,
    client_secret: ENV.linkedinClientSecret,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LinkedIn] Token exchange failed:", errorText);
    throw new Error(`LinkedIn token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    console.error("[LinkedIn] Token exchange error:", data.error);
    throw new Error(data.error_description || "LinkedIn token exchange failed");
  }

  return data as LinkedInTokenData;
}

/**
 * Fetch the user's profile from LinkedIn using the OpenID Connect userinfo endpoint.
 * Returns id (sub), name, email, profile picture, headline, and profile URL.
 */
export async function getLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LinkedIn] UserInfo request failed:", errorText);
    throw new Error(`LinkedIn UserInfo API failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    console.error("[LinkedIn] UserInfo error:", data.error);
    throw new Error(data.error_description || "LinkedIn UserInfo API failed");
  }

  return {
    id: data.sub,
    name: data.name ?? `${data.given_name ?? ""} ${data.family_name ?? ""}`.trim(),
    email: data.email ?? undefined,
    picture: data.picture ?? undefined,
    headline: data.headline ?? undefined,
    profileUrl: data.profile ?? undefined,
  };
}
