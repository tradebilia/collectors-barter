const MARKET_DATA_WINDOW_MS = 60_000;
const MEMBER_REQUEST_LIMIT = 8;
const ADMIN_REQUEST_LIMIT = 40;
const IP_REQUEST_LIMIT = 24;

const attempts = new Map<string, number[]>();

function prune(key: string, now: number) {
  const recent = (attempts.get(key) ?? []).filter(timestamp => now - timestamp < MARKET_DATA_WINDOW_MS);
  attempts.set(key, recent);
  return recent;
}

export function isMarketDataAdmissionAllowed(input: { userId: number; ip: string; isAdmin: boolean; now?: number }) {
  const now = input.now ?? Date.now();
  const memberKey = `member:${input.userId}`;
  const ipKey = `ip:${input.ip || "unknown"}`;
  const memberAttempts = prune(memberKey, now);
  const ipAttempts = prune(ipKey, now);
  const memberLimit = input.isAdmin ? ADMIN_REQUEST_LIMIT : MEMBER_REQUEST_LIMIT;

  if (memberAttempts.length >= memberLimit || ipAttempts.length >= IP_REQUEST_LIMIT) return false;

  memberAttempts.push(now);
  ipAttempts.push(now);
  attempts.set(memberKey, memberAttempts);
  attempts.set(ipKey, ipAttempts);
  return true;
}

export function resetMarketDataAdmissionForTest() {
  attempts.clear();
}

export const MARKET_DATA_REQUEST_BUDGET_MS = 15_000;
