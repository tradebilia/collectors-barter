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

// Scopes we request.
// NOTE: user_likes requires App Review before going live to the general public.
// In Development Mode it works for the app owner and added Testers.
// user_location was deprecated by Meta — location is read from the Graph API
// 'location' field directly (no separate scope needed).
const FACEBOOK_SCOPES = [
  "public_profile",
  "email",
  "user_likes",
].join(",");

export interface FacebookTokenData {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookLike {
  id: string;
  name: string;
}

export interface FacebookUserInfo {
  id: string;
  name: string;
  email?: string;
  verified?: boolean;
  picture?: string;
  location?: string;
  link?: string;
  likes?: FacebookLike[];
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
 * Fetch the user's extended profile from the Facebook Graph API.
 * Returns id, name, email, verified status, profile picture, location,
 * profile link, and page likes.
 */
export async function getFacebookUserInfo(accessToken: string): Promise<FacebookUserInfo> {
  // Fetch core profile fields
  const fields = "id,name,email,verified,picture.type(large),location,link";
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

  // Fetch page likes separately (paged endpoint)
  let likes: FacebookLike[] = [];
  try {
    const likesParams = new URLSearchParams({
      fields: "id,name",
      limit: "50",
      access_token: accessToken,
    });
    const likesResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/likes?${likesParams.toString()}`
    );
    if (likesResponse.ok) {
      const likesData = await likesResponse.json();
      if (likesData.data && Array.isArray(likesData.data)) {
        likes = likesData.data.map((l: any) => ({ id: l.id, name: l.name }));
      }
    }
  } catch (e) {
    // Likes are optional — don't fail the whole connection if this errors
    console.warn("[Facebook] Could not fetch likes:", e);
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    verified: data.verified === true,
    picture: data.picture?.data?.url,
    location: data.location?.name ?? undefined,
    link: data.link ?? undefined,
    likes: likes.length > 0 ? likes : undefined,
  };
}
