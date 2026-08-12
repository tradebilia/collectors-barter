import type { Express } from "express";
import { COOKIE_NAME } from "../../shared/const";
import { customAuth } from "./customAuth";
import { isStagingSafetyEnabled } from "./stagingSafety";

export function registerProviderOAuthCallbacks(app: Express) {
  app.get("/api/ebay/callback", async (req: any, res: any) => {
    if (isStagingSafetyEnabled()) return res.redirect(302, "/account-settings?ebay=error&reason=staging_disabled");
    const code = req.query.code as string | undefined;
    if (!code) return res.redirect(302, "/account-settings?ebay=error&reason=no_code");
    try {
      const cookies = customAuth.parseCookies(req.headers?.cookie || "");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?ebay=error&reason=not_logged_in");
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
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?facebook=error&reason=not_logged_in&tab=integrations");
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
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) return res.redirect(302, "/account-settings?linkedin=error&reason=not_logged_in&tab=integrations");
      const { handleLinkedInCallback } = await import("./linkedinCallback");
      await handleLinkedInCallback(code, user.id);
      return res.redirect(302, "/account-settings?linkedin=connected&tab=integrations");
    } catch (err) {
      console.error("[LinkedIn Callback] Error:", err);
      return res.redirect(302, "/account-settings?linkedin=error&reason=callback_failed&tab=integrations");
    }
  });
}
