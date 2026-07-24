// IMPORTANT: ENV uses lazy getters instead of eagerly-captured constants.
//
// Previously this file captured `process.env.*` values at module-evaluation
// time (e.g. `jwtSecret: process.env.JWT_SECRET ?? ""`). Because ES module
// imports are hoisted and evaluated BEFORE `dotenv.config()` runs in
// server/_core/index.ts, every value loaded from the .env file (rather than
// the shell environment) was captured as an empty string. This caused
// runtime failures such as "JWT_SECRET environment variable is not set"
// during sign-in, even though JWT_SECRET was present in .env.
//
// Getters defer the read of `process.env` until the value is actually used,
// which is always after dotenv has populated the environment.
export const ENV = {
  get appId() {
    return process.env.VITE_APP_ID ?? "";
  },
  get cookieSecret() {
    return process.env.JWT_SECRET ?? "";
  },
  get jwtSecret() {
    return process.env.JWT_SECRET ?? "";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get oAuthServerUrl() {
    return process.env.OAUTH_SERVER_URL ?? "https://api.manus.im";
  },
  get ownerOpenId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get forgeApiUrl() {
    return process.env.BUILT_IN_FORGE_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.BUILT_IN_FORGE_API_KEY ?? "";
  },
  get ebayClientId() {
    return process.env.EBAY_CLIENT_ID ?? "";
  },
  get ebayClientSecret() {
    return process.env.EBAY_CLIENT_SECRET ?? "";
  },
  get ebayRedirectUri() {
    return process.env.EBAY_REDIRECT_URI ?? "http://localhost:3000/api/ebay/callback";
  },
  get openAiApiKey() {
    return process.env.OPENAI_API_KEY ?? "";
  },
  get openAiModel() {
    return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  },
  get facebookAppId() {
    return process.env.FACEBOOK_APP_ID ?? "";
  },
  get facebookAppSecret() {
    return process.env.FACEBOOK_APP_SECRET ?? "";
  },
  get facebookRedirectUri() {
    return process.env.FACEBOOK_REDIRECT_URI ?? "http://localhost:3000/api/facebook/callback";
  },
  get linkedinClientId() {
    return process.env.LINKEDIN_CLIENT_ID ?? "";
  },
  get linkedinClientSecret() {
    return process.env.LINKEDIN_CLIENT_SECRET ?? "";
  },
  get linkedinRedirectUri() {
    return process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:3000/api/linkedin/callback";
  },
};

// Aliases for backward compatibility.
// NOTE: these are still evaluated eagerly at import time; modules that need
// guaranteed-fresh values should use ENV.ebayClientId etc. directly.
export const EBAY_CLIENT_ID = ENV.ebayClientId;
export const EBAY_CLIENT_SECRET = ENV.ebayClientSecret;
export const EBAY_REDIRECT_URI = ENV.ebayRedirectUri;
