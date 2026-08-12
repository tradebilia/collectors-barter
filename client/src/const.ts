export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { encodeOAuthState } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = encodeOAuthState({ redirectUri, nonce: crypto.randomUUID() });
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};

/**
 * Navigate to the Manus OAuth login page.
 * Call from event handlers only (e.g. onClick) — never during render.
 */
export function startLogin() {
  window.location.href = getLoginUrl();
}
