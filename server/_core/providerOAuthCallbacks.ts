import type { Express } from "express";
import { COOKIE_NAME } from "../../shared/const";
import { customAuth } from "./customAuth";
import { hasValidProviderTokenEncryptionKey } from "./crypto";
import {
  buildPayPalAuthorizationUrl,
  buildPayPalComparisonInspection,
  createPayPalOauthState,
  exchangePayPalIdentityCode,
  fetchPayPalUserInfoPayload,
  getPayPalIdentityRedirectUri,
  normalizePayPalUserInfo,
  PayPalIdentityRequestError,
} from "../paypalIdentity";
import { setPayPalComparisonInspectionCookie } from "../paypalInspection";
import { getUserPayPalComparisonProfile, saveUserPayPalIdentity } from "../db";
import { isStagingSafetyEnabled } from "./stagingSafety";
import {
  clearProviderOauthStateCookie,
  isValidProviderOauthState,
  providerOauthStateCookieName,
  setProviderOauthStateCookie,
} from "./providerOauthState";

export function registerProviderOAuthCallbacks(app: Express) {
  app.get("/api/paypal/start", async (req: any, res: any) => {
    if (isStagingSafetyEnabled()) return res.redirect(302, "/account-settings?paypal=error&reason=staging_disabled&tab=integrations");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?paypal=error&reason=not_logged_in&tab=integrations");
      const state = createPayPalOauthState();
      const forwardedProto = req.headers?.["x-forwarded-proto"]?.split(",")[0]?.trim();
      const protocol = forwardedProto || req.protocol || "https";
      const forwardedHost = req.headers?.["x-forwarded-host"]?.split(",")[0]?.trim();
      const host = forwardedHost || req.get?.("host") || req.headers?.host;
      if (!host) return res.redirect(302, "/account-settings?paypal=error&reason=missing_origin&tab=integrations");
      const redirectUri = getPayPalIdentityRedirectUri(`${protocol}://${host}`);
      setProviderOauthStateCookie(res, "paypal", state);
      return res.redirect(302, buildPayPalAuthorizationUrl(state, redirectUri));
    } catch (err) {
      console.error("[PayPal Start] Error:", err);
      return res.redirect(302, "/account-settings?paypal=error&reason=start_failed&tab=integrations");
    }
  });

  app.get("/api/paypal/inspection/start", async (req: any, res: any) => {
    if (isStagingSafetyEnabled()) return res.redirect(302, "/test-ai?paypalInspector=error&reason=staging_disabled");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user || user.role !== "admin") return res.redirect(302, "/test-ai?paypalInspector=error&reason=not_authorized");
      const state = createPayPalOauthState();
      const forwardedProto = req.headers?.["x-forwarded-proto"]?.split(",")[0]?.trim();
      const protocol = forwardedProto || req.protocol || "https";
      const forwardedHost = req.headers?.["x-forwarded-host"]?.split(",")[0]?.trim();
      const host = forwardedHost || req.get?.("host") || req.headers?.host;
      if (!host) return res.redirect(302, "/test-ai?paypalInspector=error&reason=missing_origin");
      const redirectUri = getPayPalIdentityRedirectUri(`${protocol}://${host}`);
      setProviderOauthStateCookie(res, "paypal_inspection", state);
      return res.redirect(302, buildPayPalAuthorizationUrl(state, redirectUri));
    } catch {
      return res.redirect(302, "/test-ai?paypalInspector=error&reason=start_failed");
    }
  });

  app.get("/api/paypal/callback", async (req: any, res: any) => {
    const cookies = customAuth.parseCookies(req.headers?.cookie || "");
    const isInspection = isValidProviderOauthState(cookies.get(providerOauthStateCookieName("paypal_inspection")), req.query.state);
    const resultPath = isInspection ? "/test-ai?paypalInspector" : "/account-settings?paypal";
    if (isStagingSafetyEnabled()) return res.redirect(302, `${resultPath}=error&reason=staging_disabled${isInspection ? "" : "&tab=integrations"}`);
    if (req.query.error) return res.redirect(302, `${resultPath}=error&reason=access_denied${isInspection ? "" : "&tab=integrations"}`);
    const code = req.query.code as string | undefined;
    if (!code) return res.redirect(302, `${resultPath}=error&reason=no_code${isInspection ? "" : "&tab=integrations"}`);
    try {
      const isValidState = isInspection || isValidProviderOauthState(cookies.get(providerOauthStateCookieName("paypal")), req.query.state);
      clearProviderOauthStateCookie(res, isInspection ? "paypal_inspection" : "paypal");
      if (!isValidState) return res.redirect(302, "/account-settings?paypal=error&reason=invalid_state&tab=integrations");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user || (isInspection && user.role !== "admin")) return res.redirect(302, `${resultPath}=error&reason=not_authorized${isInspection ? "" : "&tab=integrations"}`);
      const forwardedProto = req.headers?.["x-forwarded-proto"]?.split(",")[0]?.trim();
      const protocol = forwardedProto || req.protocol || "https";
      const forwardedHost = req.headers?.["x-forwarded-host"]?.split(",")[0]?.trim();
      const host = forwardedHost || req.get?.("host") || req.headers?.host;
      if (!host) return res.redirect(302, "/account-settings?paypal=error&reason=missing_origin&tab=integrations");
      const redirectUri = getPayPalIdentityRedirectUri(`${protocol}://${host}`);
      const accessToken = await exchangePayPalIdentityCode(code, redirectUri);
      const userinfo = await fetchPayPalUserInfoPayload(accessToken);
      const comparisonProfile = await getUserPayPalComparisonProfile(user.id);
      if (isInspection) {
        setPayPalComparisonInspectionCookie(res, user.id, buildPayPalComparisonInspection(userinfo, comparisonProfile));
        return res.redirect(302, "/test-ai?paypalInspector=ready");
      }
      const identity = normalizePayPalUserInfo(userinfo, new Date().toISOString(), comparisonProfile);
      await saveUserPayPalIdentity(user.id, identity);
      return res.redirect(302, "/account-settings?paypal=connected&tab=integrations");
    } catch (err) {
      console.error("[PayPal Callback] Error:", err);
      const reason = err instanceof PayPalIdentityRequestError
        ? `callback_${err.stage}_${err.status}`
        : "callback_failed";
      return res.redirect(302, `${resultPath}=error&reason=${reason}${isInspection ? "" : "&tab=integrations"}`);
    }
  });

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
