type UspsAccessToken = {
  value: string;
  expiresAt: number;
};

type UspsTrackingEvent = {
  eventType?: string;
  acceptanceTypeCategory?: string;
  eventTimestamp?: string;
  GMTTimestamp?: string;
  eventCity?: string;
  eventState?: string;
  eventCountry?: string;
};

type UspsTrackingResponse = {
  trackingNumber?: string;
  status?: string;
  statusCategory?: string;
  statusSummary?: string;
  mailClass?: string;
  deliveryDateExpectation?: {
    expectedDeliveryDate?: string;
    predictedDeliveryDate?: string;
    guaranteedDeliveryDate?: string;
  };
  trackingEvents?: UspsTrackingEvent[];
};

let cachedAccessToken: UspsAccessToken | null = null;

export function normalizeUspsTrackingNumber(value: string): string {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{4,34}$/.test(normalized)) {
    throw new Error("Enter a valid USPS tracking number.");
  }
  return normalized;
}

function toDisplayEvent(event: UspsTrackingEvent) {
  return {
    type: event.eventType ?? event.acceptanceTypeCategory ?? "USPS update",
    timestamp: event.GMTTimestamp ?? event.eventTimestamp ?? null,
    city: event.eventCity ?? null,
    state: event.eventState ?? null,
    country: event.eventCountry ?? null,
  };
}

export function formatUspsTrackingResult(response: UspsTrackingResponse, requestedTrackingNumber: string) {
  return {
    trackingNumber: response.trackingNumber ?? requestedTrackingNumber,
    status: response.status ?? "USPS update received",
    statusCategory: response.statusCategory ?? null,
    statusSummary: response.statusSummary ?? null,
    service: response.mailClass ?? null,
    expectedDeliveryDate: response.deliveryDateExpectation?.expectedDeliveryDate
      ?? response.deliveryDateExpectation?.predictedDeliveryDate
      ?? response.deliveryDateExpectation?.guaranteedDeliveryDate
      ?? null,
    events: (response.trackingEvents ?? []).slice(0, 10).map(toDisplayEvent),
  };
}

export function getUspsTrackingErrorMessage(status: number, payload: unknown): string {
  if (status === 404) return "USPS did not find that tracking number.";
  if (status === 403) {
    return "USPS Tracking API access has not yet been authorized for this USPS account. The tracking number may still work on USPS.com.";
  }
  return "USPS tracking is temporarily unavailable. Please try again.";
}

async function getUspsAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) {
    return cachedAccessToken.value;
  }

  const consumerKey = process.env.USPS_CONSUMER_KEY;
  const consumerSecret = process.env.USPS_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error("USPS credentials are not configured.");
  }

  const tokenResponse = await fetch("https://apis.usps.com/oauth2/v3/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: consumerKey,
      client_secret: consumerSecret,
    }),
    signal: AbortSignal.timeout(12_000),
  });

  const tokenPayload = await tokenResponse.json().catch(() => null) as {
    access_token?: string;
    expires_in?: number;
  } | null;

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    throw new Error("USPS OAuth authentication failed.");
  }

  cachedAccessToken = {
    value: tokenPayload.access_token,
    expiresAt: now + Math.max((tokenPayload.expires_in ?? 300) - 60, 60) * 1000,
  };
  return cachedAccessToken.value;
}

export async function lookupUspsTracking(trackingNumberInput: string) {
  const trackingNumber = normalizeUspsTrackingNumber(trackingNumberInput);
  const accessToken = await getUspsAccessToken();
  const trackingResponse = await fetch("https://apis.usps.com/tracking/v3r2/tracking", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify([{ trackingNumber }]),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await trackingResponse.json().catch(() => null) as UspsTrackingResponse[] | unknown;
  if (!trackingResponse.ok || !Array.isArray(payload) || !payload[0]) {
    throw new Error(getUspsTrackingErrorMessage(trackingResponse.status, payload));
  }

  return formatUspsTrackingResult(payload[0], trackingNumber);
}
