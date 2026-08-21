type FetchLike = typeof fetch;

const RESEND_CONTACTS_URL = "https://api.resend.com/contacts";
const RESEND_AUDIENCES_URL = "https://api.resend.com/audiences";

function isDuplicateContact(status: number, providerError: string) {
  return status === 409 || (status === 422 && /already exists|duplicate|already been taken/i.test(providerError));
}

function classifyProviderFailure(status: number, providerError: string) {
  if (status === 401 || status === 403) return "authorization_rejected";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_unavailable";
  if (/propert|custom field|metadata/i.test(providerError)) return "metadata_rejected";
  return `http_${status}`;
}

type ResendAudienceList = { data?: Array<{ id?: unknown }> } | Array<{ id?: unknown }>;

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
  const createContact = (body: Record<string, unknown>) => fetcher(RESEND_CONTACTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const findAudienceId = async () => {
    const audiencesResponse = await fetcher(RESEND_AUDIENCES_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!audiencesResponse.ok) return null;

    const audiences = await audiencesResponse.json().catch(() => null) as ResendAudienceList | null;
    const records = Array.isArray(audiences) ? audiences : audiences?.data;
    const audienceId = records?.[0]?.id;
    return typeof audienceId === "string" && audienceId ? audienceId : null;
  };

  const response = await createContact({
    email: normalizedEmail,
    unsubscribed: false,
    properties: {
      signup_source: "coming_soon",
      signup_interest: "launch_updates",
    },
  });

  if (response.ok) {
    return { accepted: true, alreadySubscribed: false };
  }

  const providerError = await response.text().catch(() => "");
  if (isDuplicateContact(response.status, providerError)) {
    return { accepted: true, alreadySubscribed: true };
  }

  // Properties are optional in Resend's contact API. Retry once without them
  // when the metadata-bearing request is rejected, preserving opt-in status.
  if (response.status === 400 || response.status === 422) {
    const fallbackResponse = await createContact({ email: normalizedEmail, unsubscribed: false });
    if (fallbackResponse.ok) {
      return { accepted: true, alreadySubscribed: false };
    }

    const fallbackError = await fallbackResponse.text().catch(() => "");
    if (isDuplicateContact(fallbackResponse.status, fallbackError)) {
      return { accepted: true, alreadySubscribed: true };
    }

    const audienceId = await findAudienceId().catch(() => null);
    if (audienceId) {
      const audienceResponse = await createContact({ email: normalizedEmail, unsubscribed: false, audience_id: audienceId });
      if (audienceResponse.ok) {
        return { accepted: true, alreadySubscribed: false };
      }

      const audienceError = await audienceResponse.text().catch(() => "");
      if (isDuplicateContact(audienceResponse.status, audienceError)) {
        return { accepted: true, alreadySubscribed: true };
      }

      console.warn("[Launch updates] Resend contact creation failed", {
        initialStatus: response.status,
        initialClassification: classifyProviderFailure(response.status, providerError),
        fallbackStatus: fallbackResponse.status,
        fallbackClassification: classifyProviderFailure(fallbackResponse.status, fallbackError),
        audienceFallbackStatus: audienceResponse.status,
        audienceFallbackClassification: classifyProviderFailure(audienceResponse.status, audienceError),
      });
    } else {
      console.warn("[Launch updates] Resend contact creation failed", {
        initialStatus: response.status,
        initialClassification: classifyProviderFailure(response.status, providerError),
        fallbackStatus: fallbackResponse.status,
        fallbackClassification: classifyProviderFailure(fallbackResponse.status, fallbackError),
        audienceFallbackStatus: "unavailable",
      });
    }
  } else {
    console.warn("[Launch updates] Resend contact creation failed", {
      initialStatus: response.status,
      initialClassification: classifyProviderFailure(response.status, providerError),
    });
  }

  throw new Error("We could not save your email right now. Please try again later.");
}
