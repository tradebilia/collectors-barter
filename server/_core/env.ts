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
  // eBay API
  ebayClientId: process.env.EBAY_PROD_CLIENT_ID ?? "",
  ebayClientSecret: process.env.EBAY_PROD_CLIENT_SECRET ?? "",
  // Facebook OAuth
  facebookAppId: process.env.FACEBOOK_APP_ID ?? "",
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? "",
  facebookRedirectUri: process.env.FACEBOOK_REDIRECT_URI ?? "",
  // LinkedIn OAuth
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID ?? "",
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  linkedinRedirectUri: process.env.LINKEDIN_REDIRECT_URI ?? "",
  // Encryption key for OAuth tokens at rest
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  // OpenAI for trade analysis
  openaiApiKey: process.env.TRADEBILIA_OPENAI_API_KEY ?? "", // key refreshed 2026-08-06
  // PSA API (placeholder)
  psaApiToken: process.env.PSA_API_TOKEN ?? "",
  // Twilio Verify (SMS phone verification during account setup)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? "",
};
