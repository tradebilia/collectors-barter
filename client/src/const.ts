export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start on our own server so it can set the HttpOnly one-time OAuth state
// cookie before redirecting to the Manus sign-in portal. The callback requires
// that cookie to validate the state nonce and reject cross-site login attempts.
export const getLoginUrl = () => {
  return `${window.location.origin}/api/oauth/start`;
};

/**
 * Navigate to the Manus OAuth login page.
 * Call from event handlers only (e.g. onClick) — never during render.
 */
export function startLogin() {
  window.location.href = getLoginUrl();
}
