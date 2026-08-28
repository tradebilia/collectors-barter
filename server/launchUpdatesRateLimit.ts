export const LAUNCH_UPDATE_WINDOW_MS = 15 * 60 * 1000;
export const LAUNCH_UPDATE_REQUEST_LIMIT = 4;

type RequestWindow = { count: number; resetAt: number };

const requestWindows = new Map<string, RequestWindow>();

export function normalizeLaunchUpdateEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Process-local protection for the public Coming Soon form. The key includes a
 * normalized email plus request source, deliberately limiting accidental or
 * scripted repeat provider writes without asserting cross-instance rate limits.
 */
export function isLaunchUpdateRequestAllowed(key: string, now = Date.now()): boolean {
  const existing = requestWindows.get(key);
  if (!existing || existing.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + LAUNCH_UPDATE_WINDOW_MS });
    return true;
  }
  if (existing.count >= LAUNCH_UPDATE_REQUEST_LIMIT) return false;
  existing.count += 1;
  return true;
}

export function resetLaunchUpdateRateLimitForTest(key?: string) {
  if (key) requestWindows.delete(key);
  else requestWindows.clear();
}
