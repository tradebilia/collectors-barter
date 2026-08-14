type UpsAccessToken = {
  value: string;
  expiresAt: number;
};

type UpsActivity = {
  date?: string;
  time?: string;
  gmtDate?: string;
  gmtTime?: string;
  status?: { description?: string; type?: string };
  location?: { address?: { city?: string; stateProvince?: string; countryCode?: string } };
};

type UpsPackage = {
  currentStatus?: { description?: string; simplifiedTextDescription?: string; statusCode?: string };
  service?: { description?: string };
  deliveryDate?: Array<{ date?: string; type?: string }>;
  activity?: UpsActivity[];
};

type UpsTrackingResponse = {
  trackResponse?: { shipment?: Array<{ inquiryNumber?: string; package?: UpsPackage[] }> };
};

let cachedAccessToken: UpsAccessToken | null = null;

export function normalizeUpsTrackingNumber(value: string): string {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{7,34}$/.test(normalized)) {
    throw new Error("Enter a valid UPS tracking number.");
  }
  return normalized;
}

function toEventTimestamp(activity: UpsActivity): string | null {
  const date = activity.gmtDate ?? activity.date;
  const time = activity.gmtTime ?? activity.time;
  if (!date) return null;
  if (/^\d{8}$/.test(date)) {
    const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    if (time && /^\d{6}$/.test(time)) return `${formattedDate}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}Z`;
    return formattedDate;
  }
  return date;
}

export function formatUpsTrackingResult(response: UpsTrackingResponse, requestedTrackingNumber: string) {
  const shipment = response.trackResponse?.shipment?.[0];
  const trackedPackage = shipment?.package?.[0];
  if (!trackedPackage) throw new Error("UPS did not return tracking details for that number.");

  return {
    trackingNumber: shipment?.inquiryNumber ?? requestedTrackingNumber,
    status: trackedPackage.currentStatus?.description ?? trackedPackage.currentStatus?.simplifiedTextDescription ?? "UPS update received",
    statusCategory: trackedPackage.currentStatus?.statusCode ?? null,
    statusSummary: trackedPackage.currentStatus?.simplifiedTextDescription ?? null,
    service: trackedPackage.service?.description ?? null,
    expectedDeliveryDate: trackedPackage.deliveryDate?.find((date) => date.type?.toLowerCase().includes("delivery"))?.date
      ?? trackedPackage.deliveryDate?.[0]?.date
      ?? null,
    events: (trackedPackage.activity ?? []).slice(0, 10).map((activity) => ({
      type: activity.status?.description ?? activity.status?.type ?? "UPS update",
      timestamp: toEventTimestamp(activity),
      city: activity.location?.address?.city ?? null,
      state: activity.location?.address?.stateProvince ?? null,
      country: activity.location?.address?.countryCode ?? null,
    })),
  };
}

async function getUpsAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) return cachedAccessToken.value;

  const clientId = process.env.UPS_CLIENT_ID;
  const clientSecret = process.env.UPS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("UPS credentials are not configured.");

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://onlinetools.ups.com/security/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; expires_in?: string | number } | null;
  if (!response.ok || !payload?.access_token) throw new Error("UPS OAuth authentication failed.");

  cachedAccessToken = {
    value: payload.access_token,
    expiresAt: now + Math.max(Number(payload.expires_in ?? 300) - 60, 60) * 1000,
  };
  return cachedAccessToken.value;
}

export async function lookupUpsTracking(trackingNumberInput: string) {
  const trackingNumber = normalizeUpsTrackingNumber(trackingNumberInput);
  const accessToken = await getUpsAccessToken();
  const response = await fetch(
    `https://onlinetools.ups.com/api/track/v1/details/${encodeURIComponent(trackingNumber)}?locale=en_US&returnSignature=false&returnMilestones=false&returnPOD=false`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        transId: crypto.randomUUID(),
        transactionSrc: "tradebilia",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = await response.json().catch(() => null) as UpsTrackingResponse | null;
  if (!response.ok || !payload) {
    if (response.status === 404) throw new Error("UPS did not find that tracking number.");
    if (response.status === 403) throw new Error("UPS Track API access is not authorized for this account.");
    throw new Error("UPS tracking is temporarily unavailable. Please try again.");
  }
  return formatUpsTrackingResult(payload, trackingNumber);
}
