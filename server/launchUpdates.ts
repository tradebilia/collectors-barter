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

  // Resend may reject a repeated contact creation. The privacy-safe result is
  // intentionally identical to a first signup so the endpoint cannot reveal
  // whether an address was already on the launch list.
  if (response.status === 409) {
    return { accepted: true, alreadySubscribed: true };
  }

  throw new Error("We could not save your email right now. Please try again later.");
}
