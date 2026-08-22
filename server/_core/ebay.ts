import { ENV } from "./env";
import { classifyApiFailure, recordApiFailure } from "../apiHealth";

const fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  try {
    return await globalThis.fetch(input, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "eBay request failed";
    await recordApiFailure({
      provider: "eBay",
      operation: "account_linking_or_profile_lookup",
      failureClass: classifyApiFailure({ message }),
      safeMessage: message,
    });
    throw error;
  }
};

const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
// Commerce Identity API — correct endpoint for authenticated user info
const EBAY_IDENTITY_URL = "https://apiz.ebay.com/commerce/identity/v1/user/";
// Trading API — XML-based, the only way to get individual feedback entries
const EBAY_TRADING_API_URL = "https://api.ebay.com/ws/api.dll";

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
  sellerLevel?: string;
  idVerified: boolean;
  star?: string;
  positive12mo?: number;
  neutral12mo?: number;
  negative12mo?: number;
  isStoreOwner?: boolean;
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
 * Generate eBay OAuth authorization URL.
 * Scopes:
 *   - commerce.identity.readonly: get username, member since, feedback score
 */
export function getEbayAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.ebayClientId,
    response_type: "code",
    redirect_uri: "https://tradebilia.manus.space/api/ebay/callback",
    scope: [
      "https://api.ebay.com/oauth/api_scope",
      "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
    ].join(" "),
    state,
  });

  return `${EBAY_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeCodeForToken(code: string): Promise<EbayTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: "https://tradebilia.manus.space/api/ebay/callback",
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
    const body = await response.text();
    throw new Error(`eBay token exchange failed (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<EbayTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: [
      "https://api.ebay.com/oauth/api_scope",
      "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
    ].join(" "),
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
    const body = await response.text();
    throw new Error(`eBay token refresh failed (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Get authenticated user info.
 * 
 * Strategy: Use the Identity API for username/userId, then use the Trading API
 * GetUser call for feedbackScore and positiveFeedbackPercent (since the Identity
 * API does NOT return feedback data).
 */
export async function getUserInfo(accessToken: string): Promise<EbayUserInfo> {
  // Step 1: Get username and userId from the Identity API
  const identityResponse = await fetch(EBAY_IDENTITY_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!identityResponse.ok) {
    const body = await identityResponse.text();
    throw new Error(`Failed to fetch eBay user info (${identityResponse.status}): ${body}`);
  }

  const identityData = await identityResponse.json();
  const username = identityData.username || identityData.userId;
  const userId = identityData.userId;

  // Step 2: Get feedbackScore, positiveFeedbackPercent, etc. via Trading API GetUser
  let feedbackScore = 0;
  let feedbackPercentage = 0;
  let memberSince = new Date();
	  let sellerLevel: string | undefined = undefined;
	  let idVerified = false;
	  let star: string | undefined = undefined;
	  let positive12mo = 0;
	  let neutral12mo = 0;
	  let negative12mo = 0;
	  let isStoreOwner = false;
	
	  try {
    // Note: With OAuth tokens, use X-EBAY-API-IAF-TOKEN header instead of
    // embedding the token in the XML body's RequesterCredentials.
    const getUserXml = `<?xml version="1.0" encoding="utf-8"?>
<GetUserRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <DetailLevel>ReturnAll</DetailLevel>
</GetUserRequest>`;

    const tradingResponse = await fetch(EBAY_TRADING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
        "X-EBAY-API-CALL-NAME": "GetUser",
        "X-EBAY-API-SITEID": "0",
        "X-EBAY-API-IAF-TOKEN": accessToken,
      },
      body: getUserXml,
    });

    if (tradingResponse.ok) {
      const xmlText = await tradingResponse.text();
      const getXmlVal = (tag: string) => {
        const m = xmlText.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
        return m ? m[1] : undefined;
      };

      feedbackScore = parseInt(getXmlVal("FeedbackScore") || "0", 10);
      feedbackPercentage = parseFloat(getXmlVal("PositiveFeedbackPercent") || "0");
      const regDateStr = getXmlVal("RegistrationDate");
      if (regDateStr) memberSince = new Date(regDateStr);
      
	      sellerLevel = getXmlVal("SellerLevel");
	      const idVerifiedVal = getXmlVal("IDVerified");
	      idVerified = idVerifiedVal === "true" || idVerifiedVal === "1" || idVerifiedVal?.toLowerCase() === "true";
	      star = getXmlVal("FeedbackRatingStar");
	      positive12mo = parseInt(getXmlVal("PositiveFeedbackRating") || "0", 10);
	      neutral12mo = parseInt(getXmlVal("NeutralFeedbackRating") || "0", 10);
	      negative12mo = parseInt(getXmlVal("NegativeFeedbackRating") || "0", 10);
	      isStoreOwner = getXmlVal("StoreOwner") === "true";
	    } else {
      console.error("Trading API GetUser failed, using defaults for feedback");
    }
  } catch (err) {
    console.error("Failed to fetch Trading API user data:", err);
  }

  return {
    username,
    userId,
    feedbackScore,
    feedbackPercentage,
	    memberSince,
	    sellerLevel,
	    idVerified,
	    star,
	    positive12mo,
	    neutral12mo,
	    negative12mo,
	    isStoreOwner,
	  };
	}

/**
 * Get individual feedback entries via the eBay Trading API (XML).
 * The REST Sell Feedback API only covers feedback sellers give to buyers —
 * to read feedback RECEIVED by a user, the Trading API (GetFeedback) is required.
 * Returns up to 200 most recent feedback entries.
 */
export async function getUserFeedback(accessToken: string, ebayUserId: string): Promise<EbayFeedback[]> {
  if (!ENV.ebayClientId) return [];

  // Note: With OAuth tokens, use X-EBAY-API-IAF-TOKEN header instead of
  // embedding the token in the XML body's RequesterCredentials.
  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<GetFeedbackRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <UserID>${ebayUserId}</UserID>
  <FeedbackType>FeedbackReceivedAsSeller</FeedbackType>
  <DetailLevel>ReturnAll</DetailLevel>
  <Pagination>
    <EntriesPerPage>200</EntriesPerPage>
    <PageNumber>1</PageNumber>
  </Pagination>
</GetFeedbackRequest>`;

  try {
    const response = await fetch(EBAY_TRADING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
        "X-EBAY-API-CALL-NAME": "GetFeedback",
        "X-EBAY-API-SITEID": "0",
        "X-EBAY-API-IAF-TOKEN": accessToken,
      },
      body: xmlBody,
    });

    if (!response.ok) {
      console.error(`eBay Trading API feedback request failed: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();

    // Parse feedback entries from XML response
    const feedbackEntries: EbayFeedback[] = [];
    const entryRegex = /<FeedbackDetail>([\s\S]*?)<\/FeedbackDetail>/g;
    let match;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entry = match[1];
      const get = (tag: string) => {
        const m = entry.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
        return m ? m[1] : undefined;
      };

      const commentTypeStr = (get("CommentType") || "").toLowerCase();
      const rating: 'positive' | 'neutral' | 'negative' =
        commentTypeStr === "positive" ? "positive" :
        commentTypeStr === "negative" ? "negative" : "neutral";

      const feedbackId = get("FeedbackID");
      const commentText = get("CommentText");
      const from = get("CommentingUser") || "Unknown";
      const itemId = get("ItemID");
      const itemTitle = get("ItemTitle");
      const dateStr = get("CommentTime");

      if (feedbackId && dateStr) {
        feedbackEntries.push({
          feedbackId,
          rating,
          comment: commentText,
          from,
          itemId,
          itemTitle,
          feedbackDate: new Date(dateStr),
        });
      }
    }

    return feedbackEntries;
  } catch (error) {
    console.error("Failed to fetch eBay feedback via Trading API:", error);
    return [];
  }
}
