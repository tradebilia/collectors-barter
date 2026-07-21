/**
 * Facebook OAuth 2.0 integration for Tradebilia.
 *
 * Flow:
 *  1. getFacebookAuthUrl(state)  → redirect user to Facebook login
 *  2. User approves → Facebook redirects to /api/facebook/callback?code=...
 *  3. exchangeFacebookCode(code) → get access token
 *  4. getFacebookUserInfo(token) → get user profile data
 */

import { ENV } from "./env";

// Facebook OAuth endpoints
const FACEBOOK_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v19.0/me";

// Scopes we request — only basic public_profile and email (no app review needed)
const FACEBOOK_SCOPES = ["public_profile", "email"].join(",");

export interface FacebookTokenData {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookUserInfo {
  id: string;
  name: string;
  email?: string;
  verified?: boolean;
  picture?: string;
}

/**
 * Build the URL to redirect the user to for Facebook login.
 */
export function getFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.facebookAppId,
    redirect_uri: ENV.facebookRedirectUri,
    scope: FACEBOOK_SCOPES,
    response_type: "code",
    state,
  });
  return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the authorization code returned by Facebook for an access token.
 */
export async function exchangeFacebookCode(code: string): Promise<FacebookTokenData> {
  const params = new URLSearchParams({
    client_id: ENV.facebookAppId,
    client_secret: ENV.facebookAppSecret,
    redirect_uri: ENV.facebookRedirectUri,
    code,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Facebook] Token exchange failed:", errorText);
    throw new Error(`Facebook token exchange failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    console.error("[Facebook] Token exchange error:", data.error);
    throw new Error(data.error.message || "Facebook token exchange failed");
  }

  return data as FacebookTokenData;
}

/**
 * Fetch the user's basic profile info from the Facebook Graph API.
 * Returns id, name, email (if granted), verified status, and profile picture URL.
 */
export async function getFacebookUserInfo(accessToken: string): Promise<FacebookUserInfo> {
  const fields = "id,name,email,verified,picture.type(large)";
  const params = new URLSearchParams({
    fields,
    access_token: accessToken,
  });

  const response = await fetch(`${FACEBOOK_GRAPH_URL}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Facebook] Graph API request failed:", errorText);
    throw new Error(`Facebook Graph API failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    console.error("[Facebook] Graph API error:", data.error);
    throw new Error(data.error.message || "Facebook Graph API failed");
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    verified: data.verified === true,
    picture: data.picture?.data?.url,
  };
}
