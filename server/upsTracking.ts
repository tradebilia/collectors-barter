import { classifyApiFailure, recordApiFailure } from "./apiHealth";
import { normalizeTrackingTimeline } from "./shippingTrackingTimeline";

const fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  try {
    return await globalThis.fetch(input, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPS request failed";
    await recordApiFailure({
      provider: "UPS",
      operation: "tracking_or_token_request",
      failureClass: classifyApiFailure({ message }),
      safeMessage: message,
    });
    throw error;
  }
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

export function normalizeUpsTrackingNumber(value: string): string {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{7,34}$/.test(normalized)) {
    throw new Error("Enter a valid UPS tracking number.");
  }
  return normalized;
}

export function normalizeUpsExpectedDeliveryDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  if (/^\d{8}$/.test(normalized)) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
  }
  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  const monthFirstDate = normalized.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (monthFirstDate) return `${monthFirstDate[3]}-${monthFirstDate[1]}-${monthFirstDate[2]}`;
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
    expectedDeliveryDate: normalizeUpsExpectedDeliveryDate(
      trackedPackage.deliveryDate?.find((date) => date.type?.toLowerCase().includes("delivery"))?.date
        ?? trackedPackage.deliveryDate?.[0]?.date
        ?? null,
    ),
    events: normalizeTrackingTimeline((trackedPackage.activity ?? []).map((activity) => ({
      type: activity.status?.description ?? activity.status?.type ?? "UPS update",
      timestamp: toEventTimestamp(activity),
      city: activity.location?.address?.city ?? null,
      state: activity.location?.address?.stateProvince ?? null,
      country: activity.location?.address?.countryCode ?? null,
    }))),
  };
}

export async function lookupUpsTracking(trackingNumberInput: string) {
  const trackingNumber = normalizeUpsTrackingNumber(trackingNumberInput);
  const proxyUrl = process.env.CLOUDFLARE_UPS_PROXY_URL?.replace(/\/$/, "");
  const proxyClientId = process.env.CLOUDFLARE_UPS_PROXY_CLIENT_ID;
  const proxyClientSecret = process.env.CLOUDFLARE_UPS_PROXY_CLIENT_SECRET;
  if (!proxyUrl || !proxyClientId || !proxyClientSecret) {
    throw new Error("Cloudflare UPS tracking proxy is not configured.");
  }

  const response = await fetch(
    `${proxyUrl}/ups/track/${encodeURIComponent(trackingNumber)}`,
    {
      headers: {
        "CF-Access-Client-Id": proxyClientId,
        "CF-Access-Client-Secret": proxyClientSecret,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = await response.json().catch(() => null) as (UpsTrackingResponse & { error?: string }) | null;
  if (!response.ok || !payload) {
    if (response.status === 404) throw new Error("UPS did not find that tracking number.");
    if (response.status === 403) throw new Error("UPS Track API access is not authorized for this account.");
    if (response.status === 400 && payload?.error === "Invalid tracking number") throw new Error("Enter a valid UPS tracking number.");
    throw new Error("UPS tracking is temporarily unavailable. Please try again.");
  }
  return formatUpsTrackingResult(payload, trackingNumber);
}
