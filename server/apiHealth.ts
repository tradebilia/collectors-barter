import { apiHealthEvents } from "../drizzle/schema";
import { requireDb } from "./db";

export const API_FAILURE_CLASSES = [
  "quota_exhausted",
  "rate_limited",
  "authentication",
  "configuration",
  "timeout",
  "upstream",
  "network",
  "validation",
  "unknown",
] as const;

export type ApiFailureClass = (typeof API_FAILURE_CLASSES)[number];

type ApiFailureInput = {
  provider: string;
  operation: string;
  failureClass: ApiFailureClass;
  statusCode?: number | null;
  providerErrorCode?: string | null;
  safeMessage?: string | null;
};

const scrub = (value: string | null | undefined, maxLength: number) =>
  value ? value.replace(/https?:\/\/\S+/gi, "[redacted-url]").replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]").slice(0, maxLength) : null;

export function classifyApiFailure(input: { statusCode?: number | null; message?: string | null; code?: string | null }): ApiFailureClass {
  const message = `${input.message ?? ""} ${input.code ?? ""}`.toLowerCase();
  if (input.statusCode === 429 || /rate.?limit|too many requests/.test(message)) return "rate_limited";
  if (input.statusCode === 401 || input.statusCode === 403 || /invalid api key|unauthori[sz]ed|forbidden|authenticat/.test(message)) return "authentication";
  if (/insufficient credit|credit balance|quota|plan limit|billing/.test(message)) return "quota_exhausted";
  if (/missing.*key|not configured|configuration/.test(message)) return "configuration";
  if (/timeout|aborted|timed out/.test(message)) return "timeout";
  if (input.statusCode && input.statusCode >= 500) return "upstream";
  if (/enotfound|econnreset|network|fetch failed|socket/.test(message)) return "network";
  if (input.statusCode && input.statusCode >= 400 && input.statusCode < 500) return "validation";
  return "unknown";
}

export async function recordApiFailure(input: ApiFailureInput) {
  try {
    const db = await requireDb();
    await db.insert(apiHealthEvents).values({
      provider: input.provider.slice(0, 80),
      operation: input.operation.slice(0, 120),
      failureClass: input.failureClass,
      statusCode: input.statusCode ?? null,
      providerErrorCode: scrub(input.providerErrorCode, 120),
      safeMessage: scrub(input.safeMessage, 255),
    });
  } catch (error) {
    console.warn("[ApiHealth] Could not record a sanitized API failure event.");
  }
}
