import { ENV } from "./env";

const EBAY_API_BASE = "https://api.ebay.com";
const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";

export interface EbayTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface EbayUserInfo {
  username: string;
  userId: string;
  feedbackScore: number;
  feedbackPercentage: number;
  memberSince: Date;
}

export interface EbayFeedback {
  feedbackId: string;
  rating: 'positive' | 'neutral' | 'negative';
  comment?: string;
  from: string;
  itemId?: string;
  itemTitle?: string;
  feedbackDate: Date;
}

/**
 * Generate eBay OAuth authorization URL
 */
export function getEbayAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.ebayClientId,
    response_type: "code",
    redirect_uri: ENV.ebayRedirectUri,
    scope: "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.account.readonly",
    state,
  });

  return `${EBAY_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<EbayTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: ENV.ebayRedirectUri,
  });

  const response = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${ENV.ebayClientId}:${ENV.ebayClientSecret}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`eBay token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<EbayTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${ENV.ebayClientId}:${ENV.ebayClientSecret}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`eBay token refresh failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user info from eBay (requires access token)
 */
export async function getUserInfo(accessToken: string): Promise<EbayUserInfo> {
  const response = await fetch(`${EBAY_API_BASE}/sell/account/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch eBay user info: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    username: data.username,
    userId: data.userId,
    feedbackScore: data.feedbackScore || 0,
    feedbackPercentage: data.positiveFeedbackPercent || 0,
    memberSince: new Date(data.memberSince),
  };
}

/**
 * Get user feedback from eBay (last 3 years)
 */
export async function getUserFeedback(accessToken: string, ebayUserId: string): Promise<EbayFeedback[]> {
  // eBay Feedback API endpoint
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const params = new URLSearchParams({
    filter: `feedbackDateFrom:${threeYearsAgo.toISOString()}`,
    limit: "200", // Max feedback items to fetch
  });

  const response = await fetch(`${EBAY_API_BASE}/sell/feedback/v1/get_feedback_for_target?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch eBay feedback: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  const feedbackRecords = data.feedbackRecords || [];

  return feedbackRecords.map((record: any) => ({
    feedbackId: record.feedbackId,
    rating: record.rating?.toLowerCase() as 'positive' | 'neutral' | 'negative',
    comment: record.comment,
    from: record.from?.username || "Unknown",
    itemId: record.itemId,
    itemTitle: record.itemTitle,
    feedbackDate: new Date(record.feedbackDate),
  }));
}
