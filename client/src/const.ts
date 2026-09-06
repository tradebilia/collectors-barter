export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Public Tradebilia members authenticate through the custom credential session
// flow. Keep the current route in place and ask the app root to open its
// supported sign-in modal rather than navigating into the legacy OAuth session
// route, whose token shape is intentionally not used by customAuth.
export const getLoginUrl = () => {
  const location = new URL(window.location.href);
  location.searchParams.set("signin", "1");
  return `${location.pathname}${location.search}${location.hash}`;
};

/**
 * Password-recovery screens are one-time flows. Their sign-in action must not
 * preserve a reset token or recovery route after the member has authenticated.
 */
export const getHomeLoginUrl = () => "/?signin=1";

/**
 * Open the supported custom sign-in flow. Call from event handlers only.
 */
export function startLogin() {
  window.location.href = getLoginUrl();
}
