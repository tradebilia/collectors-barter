type ErrorRecord = Record<string, unknown>;

function asRecord(value: unknown): ErrorRecord {
  return value && typeof value === 'object' ? value as ErrorRecord : {};
}

function providerMessage(payload: unknown): string | null {
  const body = asRecord(payload);
  const nested = asRecord(body.error);
  const errors = Array.isArray(body.errors) ? body.errors : [];
  const firstError = asRecord(errors[0]);
  const candidates = [
    body.message,
    body.detail,
    body.title,
    typeof body.error === 'string' ? body.error : null,
    nested.message,
    nested.detail,
    nested.title,
    nested.error,
    firstError.message,
    firstError.detail,
    firstError.title,
  ];
  const message = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return message ? message.trim().replace(/\s+/g, ' ').slice(0, 240) : null;
}

/**
 * Converts a provider HTTP response into a safe, actionable message.
 * Provider payload text is included only when it is a short string; secrets and
 * raw response bodies are never exposed. These failures remain non-evidence.
 */
export function formatProviderError(provider: string, status: number, payload?: unknown): string {
  const message = providerMessage(payload);
  if (status === 401 || status === 403) return `${provider} credentials are not authorized (HTTP ${status}). Check the secure server-side credential configuration.`;
  if (status === 404) return `${provider} returned HTTP 404: no matching record or endpoint was found.`;
  if (status === 408) return `${provider} request timed out (HTTP 408). Try again shortly.`;
  if (status === 429) return `${provider} rate limit reached (HTTP 429). Try again shortly.`;
  if (status >= 500) return message
    ? `${provider} service error (HTTP ${status}): ${message}`
    : `${provider} service error (HTTP ${status}). Try again shortly.`;
  if (message) return `${provider} returned HTTP ${status}: ${message}`;
  return `${provider} lookup failed (HTTP ${status}). Try again shortly.`;
}

export function formatProviderNetworkError(provider: string): string {
  return `${provider} could not be reached or the request timed out. Try again shortly.`;
}
