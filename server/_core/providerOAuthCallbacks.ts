import type { Express } from "express";
import { COOKIE_NAME } from "../../shared/const";
import { customAuth } from "./customAuth";
import { hasValidProviderTokenEncryptionKey } from "./crypto";
import { isStagingSafetyEnabled } from "./stagingSafety";
import {
  clearProviderOauthStateCookie,
  isValidProviderOauthState,
  providerOauthStateCookieName,
} from "./providerOauthState";

export function registerProviderOAuthCallbacks(app: Express) {
  app.get("/api/ebay/callback", async (req: any, res: any) => {
    if (isStagingSafetyEnabled()) return res.redirect(302, "/account-settings?ebay=error&reason=staging_disabled");
    const code = req.query.code as string | undefined;
    if (!code) return res.redirect(302, "/account-settings?ebay=error&reason=no_code");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const isValidState = isValidProviderOauthState(cookies.get(providerOauthStateCookieName("ebay")), req.query.state);
      clearProviderOauthStateCookie(res, "ebay");
      if (!isValidState) return res.redirect(302, "/account-settings?ebay=error&reason=invalid_state");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?ebay=error&reason=not_logged_in");
      if (!hasValidProviderTokenEncryptionKey()) return res.redirect(302, "/account-settings?ebay=error&reason=encryption_unavailable&tab=integrations");
      const { handleEbayCallback } = await import("./ebayCallback");
      await handleEbayCallback(code, user.id);
      return res.redirect(302, "/account-settings?ebay=connected&tab=integrations");
    } catch (err) {
      console.error("[eBay Callback] Error:", err);
      return res.redirect(302, "/account-settings?ebay=error&reason=callback_failed");
    }
  });

  app.get("/api/facebook/callback", async (req: any, res: any) => {
    if (isStagingSafetyEnabled()) return res.redirect(302, "/account-settings?facebook=error&reason=staging_disabled&tab=integrations");
    const code = req.query.code as string | undefined;
    if (req.query.error) return res.redirect(302, "/account-settings?facebook=error&reason=access_denied&tab=integrations");
    if (!code) return res.redirect(302, "/account-settings?facebook=error&reason=no_code&tab=integrations");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const isValidState = isValidProviderOauthState(cookies.get(providerOauthStateCookieName("facebook")), req.query.state);
      clearProviderOauthStateCookie(res, "facebook");
      if (!isValidState) return res.redirect(302, "/account-settings?facebook=error&reason=invalid_state&tab=integrations");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?facebook=error&reason=not_logged_in&tab=integrations");
      if (!hasValidProviderTokenEncryptionKey()) return res.redirect(302, "/account-settings?facebook=error&reason=encryption_unavailable&tab=integrations");
      const { handleFacebookCallback } = await import("./facebookCallback");
      await handleFacebookCallback(code, user.id);
      return res.redirect(302, "/account-settings?facebook=connected&tab=integrations");
    } catch (err) {
      console.error("[Facebook Callback] Error:", err);
      return res.redirect(302, "/account-settings?facebook=error&reason=callback_failed&tab=integrations");
    }
  });

  app.get("/api/linkedin/callback", async (req: any, res: any) => {
    if (isStagingSafetyEnabled()) return res.redirect(302, "/account-settings?linkedin=error&reason=staging_disabled&tab=integrations");
    const code = req.query.code as string | undefined;
    if (req.query.error) return res.redirect(302, "/account-settings?linkedin=error&reason=access_denied&tab=integrations");
    if (!code) return res.redirect(302, "/account-settings?linkedin=error&reason=no_code&tab=integrations");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const isValidState = isValidProviderOauthState(cookies.get(providerOauthStateCookieName("linkedin")), req.query.state);
      clearProviderOauthStateCookie(res, "linkedin");
      if (!isValidState) return res.redirect(302, "/account-settings?linkedin=error&reason=invalid_state&tab=integrations");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?linkedin=error&reason=not_logged_in&tab=integrations");
      if (!hasValidProviderTokenEncryptionKey()) return res.redirect(302, "/account-settings?linkedin=error&reason=encryption_unavailable&tab=integrations");
      const { handleLinkedInCallback } = await import("./linkedinCallback");
      await handleLinkedInCallback(code, user.id);
      return res.redirect(302, "/account-settings?linkedin=connected&tab=integrations");
    } catch (err) {
      console.error("[LinkedIn Callback] Error:", err);
      return res.redirect(302, "/account-settings?linkedin=error&reason=callback_failed&tab=integrations");
    }
  });

  app.get("/api/etsy/callback", async (req: any, res: any) => {
    if (isStagingSafetyEnabled()) return res.redirect(302, "/account-settings?etsy=error&reason=staging_disabled&tab=integrations");
    if (req.query.error) return res.redirect(302, "/account-settings?etsy=error&reason=access_denied&tab=integrations");
    const code = req.query.code as string | undefined;
    if (!code) return res.redirect(302, "/account-settings?etsy=error&reason=no_code&tab=integrations");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const isValidState = isValidProviderOauthState(cookies.get(providerOauthStateCookieName("etsy")), req.query.state);
      clearProviderOauthStateCookie(res, "etsy");
      if (!isValidState) return res.redirect(302, "/account-settings?etsy=error&reason=invalid_state&tab=integrations");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?etsy=error&reason=not_logged_in&tab=integrations");
      if (!hasValidProviderTokenEncryptionKey()) return res.redirect(302, "/account-settings?etsy=error&reason=encryption_unavailable&tab=integrations");
      const verifier = cookies.get("tradebilia_etsy_pkce_verifier");
      if (!verifier) return res.redirect(302, "/account-settings?etsy=error&reason=missing_pkce&tab=integrations");
      res.clearCookie("tradebilia_etsy_pkce_verifier", { httpOnly: true, secure: true, sameSite: "lax", path: "/api" });
      const { handleEtsyCallback } = await import("./etsyCallback");
      await handleEtsyCallback(code, verifier, user.id);
      return res.redirect(302, "/account-settings?etsy=connected&tab=integrations");
    } catch (err) {
      console.error("[Etsy Callback] Error:", err);
      return res.redirect(302, "/account-settings?etsy=error&reason=callback_failed&tab=integrations");
    }
  });

  // Reserved UPS OAuth return URL. Token exchange remains disabled until the UPS
  // client credentials are securely configured for Tradebilia.
  app.get("/api/ups/callback", async (_req: any, res: any) => {
    return res.redirect(302, "/account-settings?ups=error&reason=not_configured&tab=integrations");
  });
}
