import { ENV } from "./_core/env";

export type WhatnotReference = {
  username: string;
  displayName: string | null;
  userId: string | null;
  profileUrl: string;
  avatarUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  soldCount: number | null;
  followerCount: number | null;
  averageShippingTime: string | null;
  sellerStatus: string | null;
  refreshedAt: string;
  source: "apify";
};

const ACTOR_ID = "omgr8VWKxGZrtwQKJ";
const APIFY_API_BASE = "https://api.apify.com/v2";

function readText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.replace(/,/g, "").replace(/%$/, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function findValue(value: unknown, keys: string[], depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findValue(entry, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  for (const child of Object.values(record)) {
    const found = findValue(child, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function parseDatasetItem(item: unknown, username: string): WhatnotReference {
  const profileUrl = readText(findValue(item, ["profileUrl", "profileURL", "url", "userUrl"]))
    ?? `https://www.whatnot.com/user/${encodeURIComponent(username)}`;
  return {
    username: readText(findValue(item, ["username", "userName", "handle"])) ?? username,
    displayName: readText(findValue(item, ["displayName", "name", "sellerName"])) ,
    userId: readText(findValue(item, ["userId", "userID", "id"])) ,
    profileUrl,
    avatarUrl: readText(findValue(item, ["avatarUrl", "avatarURL", "profilePicture", "profileImage"])) ,
    rating: readNumber(findValue(item, ["rating", "averageRating", "sellerRating", "starRating"])) ,
    reviewCount: readNumber(findValue(item, ["reviewCount", "reviewsCount", "ratingCount", "ratingsCount"])) ,
    soldCount: readNumber(findValue(item, ["soldCount", "itemsSold", "salesCount", "totalSold"])) ,
    followerCount: readNumber(findValue(item, ["followerCount", "followers", "followersCount"])) ,
    averageShippingTime: readText(findValue(item, ["averageShippingTime", "avgShippingTime", "shippingTime", "averageHandlingTime"])) ,
    sellerStatus: readText(findValue(item, ["sellerStatus", "status", "accountStatus"])) ,
    refreshedAt: new Date().toISOString(),
    source: "apify",
  };
}

async function apifyRequest(path: string, init?: RequestInit): Promise<any> {
  if (!ENV.apifyApiToken) throw new Error("Apify is not configured for Whatnot Reference.");
  const response = await fetch(`${APIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ENV.apifyApiToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Apify Whatnot request failed (${response.status})${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }
  return response.json();
}

export async function fetchWhatnotReference(usernameInput: string): Promise<WhatnotReference> {
  const username = usernameInput.trim().replace(/^@/, "");
  if (!/^[a-zA-Z0-9._-]{2,80}$/.test(username)) {
    throw new Error("Enter a valid public Whatnot username.");
  }
  const run = await apifyRequest(`/acts/${ACTOR_ID}/runs?waitForFinish=60`, {
    method: "POST",
    body: JSON.stringify({
      mode: "seller",
      usernames: [username],
      userIds: [],
      includeProfile: true,
      includeReviews: true,
      includeShows: false,
      includeShopListings: false,
      maxReviews: 10,
    }),
  });
  const datasetId = run?.data?.defaultDatasetId;
  if (!datasetId) throw new Error("Apify did not return a Whatnot result dataset.");
  const dataset = await apifyRequest(`/datasets/${encodeURIComponent(datasetId)}/items?format=json&clean=true&limit=10`);
  const items = Array.isArray(dataset) ? dataset : [];
  if (!items.length) throw new Error("No public Whatnot profile data was returned for that username.");
  return parseDatasetItem(items[0], username);
}
