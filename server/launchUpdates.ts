type FetchLike = typeof fetch;

const RESEND_CONTACTS_URL = "https://api.resend.com/contacts";

export type LaunchUpdateSubscriptionResult = {
  accepted: true;
  alreadySubscribed: boolean;
};

export async function subscribeToLaunchUpdates(
  email: string,
  fetcher: FetchLike = fetch,
): Promise<LaunchUpdateSubscriptionResult> {
  const apiKey = process.env.RESEND_CONTACTS_API_KEY;
  if (!apiKey) {
    throw new Error("Email updates are not configured yet. Please try again later.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const response = await fetcher(RESEND_CONTACTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizedEmail,
      unsubscribed: false,
      properties: {
        signup_source: "coming_soon",
        signup_interest: "launch_updates",
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (response.ok) {
    return { accepted: true, alreadySubscribed: false };
  }

  // Resend may report a repeated contact as either a conflict or an
  // unprocessable duplicate. Keep both outcomes indistinguishable from a
  // first signup so this endpoint cannot disclose subscriber membership.
  const providerError = response.status === 422 ? await response.text().catch(() => "") : "";
  if (response.status === 409 || (response.status === 422 && /already exists|duplicate|already been taken/i.test(providerError))) {
    return { accepted: true, alreadySubscribed: true };
  }

  throw new Error("We could not save your email right now. Please try again later.");
}
