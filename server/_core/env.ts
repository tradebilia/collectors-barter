export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  ebayClientId: process.env.EBAY_CLIENT_ID ?? "",
  ebayClientSecret: process.env.EBAY_CLIENT_SECRET ?? "",
  ebayRedirectUri: process.env.EBAY_REDIRECT_URI ?? "http://localhost:3000/api/ebay/callback",
};

// Alias for backward compatibility
export const EBAY_CLIENT_ID = ENV.ebayClientId;
export const EBAY_CLIENT_SECRET = ENV.ebayClientSecret;
export const EBAY_REDIRECT_URI = ENV.ebayRedirectUri;
