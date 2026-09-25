import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { classifyApiFailure, type ApiFailureClass } from "./apiHealth";
import { getMarketNewsFeedRegistry } from "./marketNewsFeeds";

export const API_PROVIDER_IDS = [
  "manus_forge",
  "manus_oauth",
  "openai_direct_reserved",
  "psa_direct_reserved",
  "gocollect_reserved",
  "ebay",
  "sold_comps",
  "parse_bot",
  "pcgs",
  "hipstamp",
  "pokemon_price_tracker",
  "market_news_rss",
  "rawg",
  "igdb",
  "discogs",
  "smithsonian",
  "tcgdex",
  "wikidata",
  "apify_whatnot",
  "resend",
  "twilio_verify",
  "ipqs",
  "paypal",
  "stripe_test",
  "daily",
  "usps",
  "ups",
  "fedex",
  "dhl",
  "cloudflare_r2_media",
  "cloudflare_r2_static",
  "facebook_oauth",
  "linkedin_oauth",
  "etsy_oauth",
] as const;

export type ApiProviderId = (typeof API_PROVIDER_IDS)[number];
export type ApiProviderHealthStatus =
  | "working"
  | "ready_to_test"
  | "not_configured"
  | "requires_account_connection"
  | "not_active"
  | "failed";
export type ApiProviderTestMode = "data" | "credential" | "configuration" | "not_active";

type ProviderGroup = "AI & platform" | "Market data" | "Catalog reference" | "Communications & trust" | "Shipping" | "Payments" | "Member connections" | "Storage";
type ProviderEnv = NodeJS.ProcessEnv;
type FetchLike = typeof fetch;

type ApiProviderHealthCacheEntry = {
  status: Exclude<ApiProviderHealthStatus, "ready_to_test" | "not_configured" | "not_active">;
  message: string;
  checkedAt: string;
  httpStatus: number | null;
  failureClass: ApiFailureClass | null;
  recordsVerified: number | null;
};

export type ApiProviderHealthRow = {
  id: ApiProviderId;
  name: string;
  group: ProviderGroup;
  description: string;
  testMode: ApiProviderTestMode;
  configured: boolean;
  canTest: boolean;
  status: ApiProviderHealthStatus;
  message: string;
  checkedAt: string | null;
  httpStatus: number | null;
  failureClass: ApiFailureClass | null;
  recordsVerified: number | null;
};

type ProbeContext = { env: ProviderEnv; fetchImpl: FetchLike };
type ProbeSuccess = { message: string; httpStatus?: number | null; recordsVerified?: number | null };
type ApiProviderDefinition = {
  id: ApiProviderId;
  name: string;
  group: ProviderGroup;
  description: string;
  testMode: ApiProviderTestMode;
  configured: (env: ProviderEnv) => boolean;
  check?: (context: ProbeContext) => Promise<ProbeSuccess>;
  requiresAccountConnection?: boolean;
};

const REQUEST_TIMEOUT_MS = 15_000;
const healthCache = new Map<ApiProviderId, ApiProviderHealthCacheEntry>();

class ProviderHttpError extends Error {
  constructor(readonly status: number, readonly provider: string) {
    super(`${provider} returned HTTP ${status}`);
  }
}

function configured(env: ProviderEnv, ...keys: string[]) {
  return keys.every((key) => Boolean(env[key]?.trim()));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function recordCount(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  const record = asRecord(value);
  const candidates = [record.data, record.results, record.items, record.itemSummaries, record.records];
  for (const candidate of candidates) if (Array.isArray(candidate)) return candidate.length;
  return null;
}

async function requestJson(fetchImpl: FetchLike, url: string, init: RequestInit = {}) {
  const response = await fetchImpl(url, { ...init, signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Provider checks intentionally discard non-JSON response bodies.
  }
  return { response, payload };
}

function requireResponse(response: Response, provider: string) {
  if (!response.ok) throw new ProviderHttpError(response.status, provider);
}

async function probeEbay({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const credentials = Buffer.from(`${env.EBAY_PROD_CLIENT_ID}:${env.EBAY_PROD_CLIENT_SECRET}`).toString("base64");
  const token = await requestJson(fetchImpl, "https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });
  requireResponse(token.response, "eBay");
  const accessToken = String(asRecord(token.payload).access_token ?? "");
  if (!accessToken) throw new Error("eBay returned no application access token");
  const browse = await requestJson(fetchImpl, "https://api.ebay.com/buy/browse/v1/item_summary/search?q=collectible&limit=1", {
    headers: { Authorization: `Bearer ${accessToken}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });
  requireResponse(browse.response, "eBay Browse");
  return { message: "Application token accepted and Browse API returned market data.", httpStatus: browse.response.status, recordsVerified: recordCount(browse.payload) };
}

async function probeParseBot({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api.parse.bot/scraper/bbbbdc36-6d99-4a7a-8115-cf766b2497e3/search_pokemon_cards?query=charizard", {
    headers: { "X-API-Key": env.PARSE_BOT_API_KEY! },
  });
  requireResponse(response.response, "Parse.bot");
  return { message: "Market-data scraper returned a sample catalog response.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probeSoldComps({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const apiKey = env.SOLD_COMPS_API_KEY || env.SOLID_COMPS_API_KEY;
  const response = await requestJson(fetchImpl, "https://api.sold-comps.com/v1/scrape?keyword=charizard&count=1&sortOrder=endedRecently&ebaySite=ebay.com", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  requireResponse(response.response, "Sold-Comps");
  return { message: "Completed-sale endpoint returned a bounded read-only response.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probePcgs({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/00000000?retrieveAllData=true", {
    headers: { Authorization: `bearer ${env.PCGS_API_TOKEN}` },
  });
  if ([401, 403].includes(response.response.status)) throw new ProviderHttpError(response.response.status, "PCGS");
  if (response.response.status >= 500) throw new ProviderHttpError(response.response.status, "PCGS");
  return { message: "PCGS accepted the credentialed certificate request. The probe uses a deliberately non-listing certificate number.", httpStatus: response.response.status, recordsVerified: 0 };
}

async function probeHipstamp({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://www.hipstamp.com/api/listings?keywords=United%20States%20Scott%201&limit=1&page=1&sort=default", {
    headers: { Accept: "application/json", "X-ApiKey": env.HIPSTAMP_API_KEY! },
  });
  requireResponse(response.response, "HIPStamp");
  return { message: "Active-listing search returned stamp-market data.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probePokemonPriceTracker({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://www.pokemonpricetracker.com/api/v2/cards?search=charizard&language=english&limit=1", {
    headers: { Accept: "application/json", Authorization: `Bearer ${env.POKEMON_PRICE_TRACKER_API_KEY}` },
  });
  requireResponse(response.response, "Pokémon Price Tracker");
  return { message: "Card catalog returned a bounded Pokémon/TCG sample.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probeMarketNews({ fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const representatives = [...new Map(getMarketNewsFeedRegistry().map((feed) => [feed.category, feed])).values()];
  const outcomes = await Promise.all(representatives.map(async (feed) => {
    try {
      const response = await fetchImpl(feed.url, {
        headers: { "User-Agent": "Tradebilia-Admin-Health/1.0 (read-only)" },
        signal: AbortSignal.timeout(7_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }));
  const reachable = outcomes.filter(Boolean).length;
  if (reachable === 0) throw new Error("No representative RSS source responded successfully");
  return { message: `${reachable} of ${representatives.length} category representatives responded. The registry itself contains ${getMarketNewsFeedRegistry().length} feeds.`, recordsVerified: reachable };
}

async function probeRawg({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(env.RAWG_API_KEY!)}&search=Super%20Mario%20Bros.&page_size=1`;
  const response = await requestJson(fetchImpl, url);
  requireResponse(response.response, "RAWG");
  return { message: "Video-game catalog search returned a bounded sample.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probeIgdb({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const token = await requestJson(fetchImpl, "https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID!, client_secret: env.TWITCH_CLIENT_SECRET!, grant_type: "client_credentials" }),
  });
  requireResponse(token.response, "Twitch OAuth for IGDB");
  const accessToken = String(asRecord(token.payload).access_token ?? "");
  if (!accessToken) throw new Error("Twitch returned no IGDB access token");
  const games = await requestJson(fetchImpl, "https://api.igdb.com/v4/games", {
    method: "POST",
    headers: { Accept: "application/json", "Client-ID": env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${accessToken}` },
    body: "fields id,name; limit 1;",
  });
  requireResponse(games.response, "IGDB");
  return { message: "Twitch OAuth and the IGDB game catalog both returned data.", httpStatus: games.response.status, recordsVerified: recordCount(games.payload) };
}

async function probeDiscogs({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api.discogs.com/database/search?q=Kind%20of%20Blue&type=release&per_page=1&page=1", {
    headers: { Accept: "application/json", "User-Agent": "Tradebilia-Admin-Health/1.0", Authorization: `Discogs token=${env.DISCOGS_USER_TOKEN}` },
  });
  requireResponse(response.response, "Discogs");
  return { message: "Music-release catalog returned a bounded sample.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probeSmithsonian({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, `https://api.si.edu/openaccess/api/v1.0/search?q=postage%20stamp&api_key=${encodeURIComponent(env.SMITHSONIAN_API_KEY!)}&rows=1`, { headers: { Accept: "application/json" } });
  requireResponse(response.response, "Smithsonian");
  return { message: "National Postal Museum search returned a bounded reference response.", httpStatus: response.response.status, recordsVerified: recordCount(asRecord(response.payload).response) };
}

async function probeTcgDex({ fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api.tcgdex.net/v2/en/cards?name=Charizard");
  requireResponse(response.response, "TCGdex");
  return { message: "Public Pokémon catalog search returned a response.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probeWikidata({ fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=1&search=Superman", { headers: { Accept: "application/json", "User-Agent": "Tradebilia-Admin-Health/1.0" } });
  requireResponse(response.response, "Wikidata");
  const payload = asRecord(response.payload);
  return { message: "Public reference search returned a response.", httpStatus: response.response.status, recordsVerified: Array.isArray(payload.search) ? payload.search.length : null };
}

async function probeApify({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api.apify.com/v2/users/me", { headers: { Authorization: `Bearer ${env.APIFY_API_TOKEN}`, Accept: "application/json" } });
  requireResponse(response.response, "Apify");
  return { message: "Whatnot-reference account endpoint accepted the configured token.", httpStatus: response.response.status, recordsVerified: 1 };
}

async function probeResend({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api.resend.com/domains", { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, Accept: "application/json" } });
  requireResponse(response.response, "Resend");
  return { message: "Read-only sender-domain endpoint accepted the configured credential. No email was sent.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probeTwilio({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const basic = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await requestJson(fetchImpl, `https://verify.twilio.com/v2/Services/${encodeURIComponent(env.TWILIO_VERIFY_SERVICE_SID!)}`, { headers: { Authorization: `Basic ${basic}`, Accept: "application/json" } });
  requireResponse(response.response, "Twilio Verify");
  return { message: "Verify service endpoint accepted the configured credential. No SMS was sent.", httpStatus: response.response.status, recordsVerified: 1 };
}

async function probeIpqs({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, `https://www.ipqualityscore.com/api/json/email/${encodeURIComponent(env.IPQS_API_KEY!)}/noreply%40tradebilia.com?fast=true`, { headers: { Accept: "application/json" } });
  requireResponse(response.response, "IPQS");
  return { message: "Email-history endpoint returned a safe non-member reference response.", httpStatus: response.response.status, recordsVerified: 1 };
}

async function probePayPal({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const mode = env.PAYPAL_ENV || env.PAYPAL_MODE || "sandbox";
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const basic = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await requestJson(fetchImpl, `${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: "grant_type=client_credentials",
  });
  requireResponse(response.response, "PayPal");
  return { message: "OAuth credential endpoint accepted the configured client. No payment or identity record was accessed.", httpStatus: response.response.status, recordsVerified: 1 };
}

async function probeStripe({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, Accept: "application/json" } });
  requireResponse(response.response, "Stripe");
  return { message: "Read-only balance endpoint accepted the configured key. No customer, checkout, or payment was created.", httpStatus: response.response.status, recordsVerified: 1 };
}

async function probeDaily({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api.daily.co/v1/rooms?limit=1", { headers: { Authorization: `Bearer ${env.DAILY_API_KEY}`, Accept: "application/json" } });
  requireResponse(response.response, "Daily");
  return { message: "Read-only video-room listing endpoint accepted the configured key. No room was created.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

async function probeUsps({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://apis.usps.com/oauth2/v3/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: env.USPS_CONSUMER_KEY, client_secret: env.USPS_CONSUMER_SECRET }),
  });
  requireResponse(response.response, "USPS");
  return { message: "Tracking OAuth token endpoint accepted the configured credential. No tracking record was accessed.", httpStatus: response.response.status, recordsVerified: 1 };
}

async function probeUps({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const basic = Buffer.from(`${env.UPS_CLIENT_ID}:${env.UPS_CLIENT_SECRET}`).toString("base64");
  const response = await requestJson(fetchImpl, "https://onlinetools.ups.com/security/v1/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: "grant_type=client_credentials",
  });
  requireResponse(response.response, "UPS");
  return { message: "Tracking OAuth token endpoint accepted the configured credential. No tracking record was accessed.", httpStatus: response.response.status, recordsVerified: 1 };
}

async function probeFedex({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: env.FEDEX_CLIENT_ID!, client_secret: env.FEDEX_CLIENT_SECRET! });
  const origins = ["https://apis.fedex.com", "https://apis-sandbox.fedex.com"];
  let lastStatus = 0;
  for (const origin of origins) {
    const response = await requestJson(fetchImpl, `${origin}/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body });
    lastStatus = response.response.status;
    if (response.response.ok) return { message: "Tracking OAuth token endpoint accepted the configured credential. No tracking record was accessed.", httpStatus: response.response.status, recordsVerified: 1 };
  }
  throw new ProviderHttpError(lastStatus, "FedEx");
}

async function probeDhl({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const response = await requestJson(fetchImpl, "https://api-eu.dhl.com/track/shipments?trackingNumber=0000000000", { headers: { "DHL-API-Key": env.DHL_API_KEY!, Accept: "application/json" } });
  if ([401, 403].includes(response.response.status) || response.response.status >= 500) throw new ProviderHttpError(response.response.status, "DHL");
  return { message: "DHL accepted the authenticated tracking request. The probe uses a deliberately non-shipment tracking number.", httpStatus: response.response.status, recordsVerified: 0 };
}

async function probeR2(bucket: string, endpointKey: string, accessKey: string, secretKey: string, env: ProviderEnv): Promise<ProbeSuccess> {
  const client = new S3Client({
    region: "auto",
    endpoint: env[endpointKey],
    credentials: { accessKeyId: env[accessKey]!, secretAccessKey: env[secretKey]! },
  });
  const response = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
  return { message: `Read-only bucket listing completed for ${bucket}. No object was changed.`, recordsVerified: response.Contents?.length ?? 0 };
}

async function probeForge({ env, fetchImpl }: ProbeContext): Promise<ProbeSuccess> {
  const base = (env.BUILT_IN_FORGE_API_URL || "https://forge.manus.im").replace(/\/$/, "");
  const response = await requestJson(fetchImpl, `${base}/v1/models`, { headers: { Authorization: `Bearer ${env.BUILT_IN_FORGE_API_KEY}`, Accept: "application/json" } });
  requireResponse(response.response, "Manus Forge");
  return { message: "Model catalog endpoint accepted the configured Forge credential. No model invocation was made.", httpStatus: response.response.status, recordsVerified: recordCount(response.payload) };
}

const PROVIDERS: ApiProviderDefinition[] = [
  { id: "manus_forge", name: "Manus Forge", group: "AI & platform", description: "Vision, field-completion, image comparison, and analyzer model access.", testMode: "credential", configured: (env) => configured(env, "BUILT_IN_FORGE_API_KEY"), check: probeForge },
  { id: "manus_oauth", name: "Manus OAuth", group: "AI & platform", description: "Platform-managed sign-in and session infrastructure. Individual account sign-in verifies the end-to-end connection.", testMode: "configuration", configured: (env) => configured(env, "VITE_APP_ID", "OAUTH_SERVER_URL"), requiresAccountConnection: true },
  { id: "openai_direct_reserved", name: "OpenAI direct key (reserved)", group: "AI & platform", description: "A direct key is configured, but current runtime code uses Manus Forge instead.", testMode: "not_active", configured: (env) => configured(env, "TRADEBILIA_OPENAI_API_KEY") },
  { id: "psa_direct_reserved", name: "PSA direct key (reserved)", group: "Market data", description: "A PSA credential is retained, but the sandbox currently uses the Parse.bot PSA source rather than a direct PSA integration.", testMode: "not_active", configured: (env) => configured(env, "PSA_API_TOKEN") },
  { id: "gocollect_reserved", name: "GoCollect key (reserved)", group: "Market data", description: "A GoCollect credential is retained, but no active application adapter currently requests the GoCollect API.", testMode: "not_active", configured: (env) => configured(env, "GO_COLLECT_API_KEY") },
  { id: "ebay", name: "eBay Browse", group: "Market data", description: "Active-listing context and account-linking support.", testMode: "data", configured: (env) => configured(env, "EBAY_PROD_CLIENT_ID", "EBAY_PROD_CLIENT_SECRET"), check: probeEbay },
  { id: "sold_comps", name: "Sold-Comps", group: "Market data", description: "Completed-sale lookup used only when its separate credential is configured.", testMode: "data", configured: (env) => Boolean(env.SOLD_COMPS_API_KEY?.trim() || env.SOLID_COMPS_API_KEY?.trim()), check: probeSoldComps },
  { id: "parse_bot", name: "Parse.bot", group: "Market data", description: "PSA, SGC, BGS, CGC Comics, PriceCharting, 130point, and PWCC/Fanatics read-only data.", testMode: "data", configured: (env) => configured(env, "PARSE_BOT_API_KEY"), check: probeParseBot },
  { id: "pcgs", name: "PCGS CoinFacts", group: "Market data", description: "Coin certification, population, and price-guide context.", testMode: "credential", configured: (env) => configured(env, "PCGS_API_TOKEN"), check: probePcgs },
  { id: "hipstamp", name: "HIPStamp", group: "Market data", description: "Stamp active listings and store-scoped sold/closed reference data.", testMode: "data", configured: (env) => configured(env, "HIPSTAMP_API_KEY"), check: probeHipstamp },
  { id: "pokemon_price_tracker", name: "Pokémon Price Tracker", group: "Market data", description: "Pokémon identity, market, history, and plan-gated population context in Test AI.", testMode: "data", configured: (env) => configured(env, "POKEMON_PRICE_TRACKER_API_KEY"), check: probePokemonPriceTracker },
  { id: "market_news_rss", name: "Market news RSS registry", group: "Market data", description: "140 category-specific RSS/Atom feeds used as contextual market news, not valuation evidence.", testMode: "data", configured: () => true, check: probeMarketNews },
  { id: "rawg", name: "RAWG", group: "Catalog reference", description: "Video-game factual catalog metadata.", testMode: "data", configured: (env) => configured(env, "RAWG_API_KEY"), check: probeRawg },
  { id: "igdb", name: "IGDB / Twitch", group: "Catalog reference", description: "Video-game release, platform, publisher, and genre facts.", testMode: "data", configured: (env) => configured(env, "TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"), check: probeIgdb },
  { id: "discogs", name: "Discogs", group: "Catalog reference", description: "Music release, label, format, and catalog-number facts.", testMode: "data", configured: (env) => configured(env, "DISCOGS_USER_TOKEN"), check: probeDiscogs },
  { id: "smithsonian", name: "Smithsonian Open Access", group: "Catalog reference", description: "National Postal Museum stamp-reference context.", testMode: "data", configured: (env) => configured(env, "SMITHSONIAN_API_KEY"), check: probeSmithsonian },
  { id: "tcgdex", name: "TCGdex", group: "Catalog reference", description: "Public Pokémon card identity catalog.", testMode: "data", configured: () => true, check: probeTcgDex },
  { id: "wikidata", name: "Wikidata", group: "Catalog reference", description: "Public movie and autograph factual reference metadata.", testMode: "data", configured: () => true, check: probeWikidata },
  { id: "apify_whatnot", name: "Apify / Whatnot", group: "Member connections", description: "Public Whatnot seller-reference collection through the configured actor.", testMode: "credential", configured: (env) => configured(env, "APIFY_API_TOKEN"), check: probeApify },
  { id: "resend", name: "Resend", group: "Communications & trust", description: "Transactional email and pre-launch contact management.", testMode: "credential", configured: (env) => configured(env, "RESEND_API_KEY"), check: probeResend },
  { id: "twilio_verify", name: "Twilio Verify", group: "Communications & trust", description: "Phone-verification service. The health test never sends an SMS.", testMode: "credential", configured: (env) => configured(env, "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"), check: probeTwilio },
  { id: "ipqs", name: "IPQualityScore", group: "Communications & trust", description: "Email-history risk signal for account approval.", testMode: "data", configured: (env) => configured(env, "IPQS_API_KEY"), check: probeIpqs },
  { id: "paypal", name: "PayPal", group: "Payments", description: "PayPal account-identity verification. The health test does not inspect a member identity or payment.", testMode: "credential", configured: (env) => configured(env, "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"), check: probePayPal },
  { id: "stripe_test", name: "Stripe test billing", group: "Payments", description: "Future membership test-mode billing only. The health test creates no checkout or payment.", testMode: "credential", configured: (env) => configured(env, "STRIPE_SECRET_KEY"), check: probeStripe },
  { id: "daily", name: "Daily", group: "Member connections", description: "Trade Room video calls. The health test lists rooms only and creates none.", testMode: "credential", configured: (env) => configured(env, "DAILY_API_KEY"), check: probeDaily },
  { id: "usps", name: "USPS Tracking", group: "Shipping", description: "Carrier tracking OAuth. The health test obtains no shipment record.", testMode: "credential", configured: (env) => configured(env, "USPS_CONSUMER_KEY", "USPS_CONSUMER_SECRET"), check: probeUsps },
  { id: "ups", name: "UPS Tracking", group: "Shipping", description: "Carrier tracking OAuth. The health test obtains no shipment record.", testMode: "credential", configured: (env) => configured(env, "UPS_CLIENT_ID", "UPS_CLIENT_SECRET"), check: probeUps },
  { id: "fedex", name: "FedEx Tracking", group: "Shipping", description: "Carrier tracking OAuth. The health test obtains no shipment record.", testMode: "credential", configured: (env) => configured(env, "FEDEX_CLIENT_ID", "FEDEX_CLIENT_SECRET"), check: probeFedex },
  { id: "dhl", name: "DHL Tracking", group: "Shipping", description: "Carrier tracking. The health test uses a deliberately invalid tracking reference.", testMode: "credential", configured: (env) => configured(env, "DHL_API_KEY"), check: probeDhl },
  { id: "cloudflare_r2_media", name: "Cloudflare R2 public media", group: "Storage", description: "Listing images and public profile-media bucket.", testMode: "credential", configured: (env) => configured(env, "R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"), check: ({ env }) => probeR2("tradebilia-public-media", "R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", env) },
  { id: "cloudflare_r2_static", name: "Cloudflare R2 static assets", group: "Storage", description: "Tradebilia static-asset bucket.", testMode: "credential", configured: (env) => configured(env, "R2_STATIC_ENDPOINT", "R2_STATIC_ACCESS_KEY_ID", "R2_STATIC_SECRET_ACCESS_KEY"), check: ({ env }) => probeR2("tradebilia-static", "R2_STATIC_ENDPOINT", "R2_STATIC_ACCESS_KEY_ID", "R2_STATIC_SECRET_ACCESS_KEY", env) },
  { id: "facebook_oauth", name: "Facebook OAuth", group: "Member connections", description: "Member profile-linking provider; an individual member authorization is required before profile data can be checked.", testMode: "configuration", configured: (env) => configured(env, "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_REDIRECT_URI"), requiresAccountConnection: true },
  { id: "linkedin_oauth", name: "LinkedIn OAuth", group: "Member connections", description: "Member profile-linking provider; an individual member authorization is required before profile data can be checked.", testMode: "configuration", configured: (env) => configured(env, "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI"), requiresAccountConnection: true },
  { id: "etsy_oauth", name: "Etsy OAuth", group: "Member connections", description: "Member shop-linking provider; an individual member authorization is required before shop data can be checked.", testMode: "configuration", configured: (env) => configured(env, "ETSY_API_KEYSTRING", "ETSY_SHARED_SECRET", "ETSY_REDIRECT_URI"), requiresAccountConnection: true },
];

function configurationMessage(definition: ApiProviderDefinition, isConfigured: boolean) {
  if (!isConfigured) return "Required server-side credential or configuration is unavailable. No provider request can be made.";
  if (definition.testMode === "not_active") return "The key is present, but this direct provider path is not used by the current runtime.";
  if (definition.requiresAccountConnection) return "Provider settings are present. A member must complete OAuth before their individual connection can be verified.";
  return "Configured and ready for an administrator-triggered, read-only test.";
}

function healthRow(definition: ApiProviderDefinition, env: ProviderEnv): ApiProviderHealthRow {
  const isConfigured = definition.configured(env);
  const cached = healthCache.get(definition.id);
  if (!isConfigured) {
    return { ...definition, configured: false, canTest: false, status: "not_configured", message: configurationMessage(definition, false), checkedAt: null, httpStatus: null, failureClass: "configuration", recordsVerified: null };
  }
  if (definition.testMode === "not_active") {
    return { ...definition, configured: true, canTest: false, status: "not_active", message: configurationMessage(definition, true), checkedAt: null, httpStatus: null, failureClass: null, recordsVerified: null };
  }
  if (cached) {
    return { ...definition, configured: true, canTest: true, status: cached.status, message: cached.message, checkedAt: cached.checkedAt, httpStatus: cached.httpStatus, failureClass: cached.failureClass, recordsVerified: cached.recordsVerified };
  }
  if (definition.requiresAccountConnection) {
    return { ...definition, configured: true, canTest: true, status: "requires_account_connection", message: configurationMessage(definition, true), checkedAt: null, httpStatus: null, failureClass: null, recordsVerified: null };
  }
  return { ...definition, configured: true, canTest: true, status: "ready_to_test", message: configurationMessage(definition, true), checkedAt: null, httpStatus: null, failureClass: null, recordsVerified: null };
}

export function getApiProviderHealthOverview(env: ProviderEnv = process.env): ApiProviderHealthRow[] {
  return PROVIDERS.map((definition) => healthRow(definition, env));
}

export async function runApiProviderHealthCheck(providerId: ApiProviderId, options: { env?: ProviderEnv; fetchImpl?: FetchLike } = {}): Promise<ApiProviderHealthRow> {
  const definition = PROVIDERS.find((provider) => provider.id === providerId);
  if (!definition) throw new Error("Unknown API provider health check.");
  const env = options.env ?? process.env;
  if (!definition.configured(env) || definition.testMode === "not_active") return healthRow(definition, env);

  const checkedAt = new Date().toISOString();
  if (definition.requiresAccountConnection || !definition.check) {
    healthCache.set(providerId, {
      status: "requires_account_connection",
      message: "Provider settings are present. Verify a member-specific account connection from the profile integration flow.",
      checkedAt,
      httpStatus: null,
      failureClass: null,
      recordsVerified: null,
    });
    return healthRow(definition, env);
  }

  try {
    const result = await definition.check({ env, fetchImpl: options.fetchImpl ?? fetch });
    healthCache.set(providerId, {
      status: "working",
      message: result.message,
      checkedAt,
      httpStatus: result.httpStatus ?? null,
      failureClass: null,
      recordsVerified: result.recordsVerified ?? null,
    });
  } catch (error) {
    const status = error instanceof ProviderHttpError ? error.status : null;
    const message = error instanceof Error ? error.message : "Provider health test did not complete.";
    healthCache.set(providerId, {
      status: "failed",
      message: status ? `Read-only provider test failed with HTTP ${status}. No provider data was changed.` : "Read-only provider test could not complete. No provider data was changed.",
      checkedAt,
      httpStatus: status,
      failureClass: classifyApiFailure({ statusCode: status, message }),
      recordsVerified: null,
    });
  }
  return healthRow(definition, env);
}
