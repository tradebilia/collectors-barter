/** A rejected browser fetch, not a structured authentication/server error. */
export function isRpcConnectionInterruption(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { data?: unknown; message?: unknown };
  if (candidate.data != null || typeof candidate.message !== 'string') return false;
  return /^(?:Failed to fetch|NetworkError when attempting to fetch resource\.?|Load failed)$/i.test(candidate.message);
}
