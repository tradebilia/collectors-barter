type DhlAddress = {
  addressLocality?: string;
  postalCode?: string;
  countryCode?: string;
};

type DhlEvent = {
  timestamp?: string;
  description?: string;
  statusCode?: string;
  location?: { address?: DhlAddress };
};

type DhlShipment = {
  shipmentTrackingNumber?: string;
  status?: {
    timestamp?: string;
    status?: string;
    statusCode?: string;
    description?: string;
    location?: { address?: DhlAddress };
  };
  events?: DhlEvent[];
  details?: {
    product?: { productName?: string };
    estimatedDeliveryDate?: string;
  };
};

type DhlTrackingResponse = {
  shipments?: DhlShipment[];
};

const DHL_UNIFIED_TRACKING_URL = "https://api-eu.dhl.com/track/shipments";

export function normalizeDhlTrackingNumber(value: string): string {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{10,35}$/.test(normalized)) {
    throw new Error("Enter a valid DHL tracking number.");
  }
  return normalized;
}

export function formatDhlTrackingResult(response: DhlTrackingResponse, requestedTrackingNumber: string) {
  const shipment = response.shipments?.[0];
  if (!shipment) throw new Error("DHL did not return tracking details for that number.");

  const status = shipment.status;
  return {
    trackingNumber: shipment.shipmentTrackingNumber ?? requestedTrackingNumber,
    status: status?.status ?? status?.statusCode ?? "DHL update received",
    statusCategory: status?.statusCode ?? null,
    statusSummary: null,
    service: shipment.details?.product?.productName ?? "DHL",
    expectedDeliveryDate: shipment.details?.estimatedDeliveryDate ?? null,
    events: (shipment.events ?? []).slice(0, 10).map((event) => ({
      type: event.statusCode ?? "DHL update",
      timestamp: event.timestamp ?? null,
      city: event.location?.address?.addressLocality ?? null,
      state: null,
      country: event.location?.address?.countryCode ?? null,
    })),
  };
}

export async function lookupDhlTracking(trackingNumberInput: string) {
  const trackingNumber = normalizeDhlTrackingNumber(trackingNumberInput);
  const apiKey = process.env.DHL_API_KEY;
  if (!apiKey) throw new Error("DHL API key is not configured.");
  const response = await fetch(
    `${DHL_UNIFIED_TRACKING_URL}?trackingNumber=${encodeURIComponent(trackingNumber)}`,
    {
      headers: {
        "DHL-API-Key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = await response.json().catch(() => null) as DhlTrackingResponse | null;

  if (!response.ok || !payload) {
    if (response.status === 400 || response.status === 404) throw new Error("DHL did not find that tracking number.");
    if (response.status === 401 || response.status === 403) throw new Error("DHL Tracking API access is not authorized for this account.");
    throw new Error("DHL tracking is temporarily unavailable. Please try again.");
  }

  return formatDhlTrackingResult(payload, trackingNumber);
}
