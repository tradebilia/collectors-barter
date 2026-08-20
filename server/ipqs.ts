import { classifyApiFailure, recordApiFailure } from "./apiHealth";

type IpqsPayload = {
  success?: boolean;
  message?: string;
  errors?: string[];
  first_seen?: { timestamp?: number | null; iso?: string | null } | null;
};

export type IpqsEmailHistoryResult =
  | { available: true; firstSeenAt: Date | null; underOneYear: boolean }
  | { available: false };

export async function getIpqsEmailHistory(email: string): Promise<IpqsEmailHistoryResult> {
  const apiKey = process.env.IPQS_API_KEY;
  if (!apiKey) {
    await recordApiFailure({ provider: "IPQS", operation: "email_history_registration", failureClass: "configuration", safeMessage: "IPQS server key is not configured." });
    return { available: false };
  }

  try {
    const response = await fetch(
      `https://www.ipqualityscore.com/api/json/email/${encodeURIComponent(apiKey)}/${encodeURIComponent(email)}?timeout=7`,
      { signal: AbortSignal.timeout(12_000) },
    );
    const payload = await response.json() as IpqsPayload;
    if (!response.ok || payload.success !== true) {
      const safeMessage = payload.message ?? payload.errors?.[0] ?? "IPQS email validation was unsuccessful.";
      await recordApiFailure({
        provider: "IPQS",
        operation: "email_history_registration",
        failureClass: classifyApiFailure({ statusCode: response.status, message: safeMessage }),
        statusCode: response.status,
        safeMessage,
      });
      return { available: false };
    }

    const timestamp = payload.first_seen?.timestamp;
    const firstSeenAt = timestamp && timestamp > 0 ? new Date(timestamp * 1000) : null;
    const underOneYear = firstSeenAt ? Date.now() - firstSeenAt.getTime() < 365.25 * 24 * 60 * 60 * 1000 : false;
    return { available: true, firstSeenAt, underOneYear };
  } catch (error) {
    const message = error instanceof Error ? error.message : "IPQS request failed.";
    await recordApiFailure({
      provider: "IPQS",
      operation: "email_history_registration",
      failureClass: classifyApiFailure({ message }),
      safeMessage: message,
    });
    return { available: false };
  }
}
