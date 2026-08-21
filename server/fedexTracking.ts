import { classifyApiFailure, recordApiFailure } from "./apiHealth";

type FedexAccessToken = {
  value: string;
  baseUrl: string;
  expiresAt: number;
};

type FedexScanEvent = {
  date?: string;
  eventDescription?: string;
  eventType?: string;
  scanLocation?: { city?: string; stateOrProvinceCode?: string; countryCode?: string };
};

type FedexTrackResult = {
  trackingNumberInfo?: { trackingNumber?: string };
  latestStatusDetail?: { description?: string; code?: string; statusByLocale?: string };
  serviceDetail?: { type?: string; description?: string };
  estimatedDeliveryTimeWindow?: { window?: { ends?: string } };
  dateAndTimes?: Array<{ type?: string; dateTime?: string }>;
  scanEvents?: FedexScanEvent[];
};

type FedexTrackingResponse = {
  output?: { completeTrackResults?: Array<{ trackResults?: FedexTrackResult[] }> };
};

let cachedAccessToken: FedexAccessToken | null = null;

const fedexApiBases = ["https://apis.fedex.com", "https://apis-sandbox.fedex.com"] as const;

export function normalizeFedexTrackingNumber(value: string): string {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{12,34}$/.test(normalized)) {
    throw new Error("Enter a valid FedEx tracking number.");
  }
  return normalized;
}

export function formatFedexTrackingResult(response: FedexTrackingResponse, requestedTrackingNumber: string) {
  const trackedPackage = response.output?.completeTrackResults?.[0]?.trackResults?.[0];
  if (!trackedPackage) throw new Error("FedEx did not return tracking details for that number.");

  const estimatedDelivery = trackedPackage.estimatedDeliveryTimeWindow?.window?.ends
    ?? trackedPackage.dateAndTimes?.find((entry) => entry.type?.toUpperCase().includes("ESTIMATED_DELIVERY"))?.dateTime
    ?? null;

  return {
    trackingNumber: trackedPackage.trackingNumberInfo?.trackingNumber ?? requestedTrackingNumber,
    status: trackedPackage.latestStatusDetail?.statusByLocale ?? trackedPackage.latestStatusDetail?.description ?? "FedEx update received",
    statusCategory: trackedPackage.latestStatusDetail?.code ?? null,
    statusSummary: trackedPackage.latestStatusDetail?.description ?? null,
    service: trackedPackage.serviceDetail?.description ?? trackedPackage.serviceDetail?.type ?? null,
    expectedDeliveryDate: estimatedDelivery,
    events: (trackedPackage.scanEvents ?? []).slice(0, 10).map((event) => ({
      type: event.eventDescription ?? event.eventType ?? "FedEx update",
      timestamp: event.date ?? null,
      city: event.scanLocation?.city ?? null,
      state: event.scanLocation?.stateOrProvinceCode ?? null,
      country: event.scanLocation?.countryCode ?? null,
    })),
  };
}

async function getFedexAccessToken(): Promise<FedexAccessToken> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) return cachedAccessToken;

  const clientId = process.env.FEDEX_CLIENT_ID;
  const clientSecret = process.env.FEDEX_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("FedEx credentials are not configured.");

  for (const baseUrl of fedexApiBases) {
    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as { access_token?: string; expires_in?: string | number } | null;
    if (!response.ok || !payload?.access_token) continue;

    cachedAccessToken = {
      value: payload.access_token,
      baseUrl,
      expiresAt: now + Math.max(Number(payload.expires_in ?? 300) - 60, 60) * 1000,
    };
    return cachedAccessToken;
  }

  throw new Error("FedEx OAuth authentication failed.");
}

export async function lookupFedexTracking(trackingNumberInput: string) {
  try {
    const trackingNumber = normalizeFedexTrackingNumber(trackingNumberInput);
    const accessToken = await getFedexAccessToken();
    const response = await fetch(`${accessToken.baseUrl}/track/v1/trackingnumbers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
        "Content-Type": "application/json",
        "X-locale": "en_US",
      },
      body: JSON.stringify({
        includeDetailedScans: true,
        trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as FedexTrackingResponse | null;
    if (!response.ok || !payload) {
      if (response.status === 400 || response.status === 404) throw new Error("FedEx did not find that tracking number.");
      if (response.status === 401 || response.status === 403) throw new Error("FedEx Track API access is not authorized for this account.");
      throw new Error("FedEx tracking is temporarily unavailable. Please try again.");
    }
    return formatFedexTrackingResult(payload, trackingNumber);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FedEx tracking request failed";
    await recordApiFailure({
      provider: "FedEx",
      operation: "tracking_lookup",
      failureClass: classifyApiFailure({ message }),
      safeMessage: message,
    });
    throw error;
  }
}
