import { afterEach, describe, expect, it, vi } from "vitest";
import { formatUpsTrackingResult, lookupUpsTracking, normalizeUpsExpectedDeliveryDate, normalizeUpsTrackingNumber } from "./upsTracking";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("UPS expected-delivery normalization", () => {
  it("normalizes UPS compact YYYYMMDD dates", () => {
    expect(normalizeUpsExpectedDeliveryDate("20260912")).toBe("2026-09-12");
  });

  it("normalizes ISO and month-first dates", () => {
    expect(normalizeUpsExpectedDeliveryDate("2026-09-12T18:00:00-04:00")).toBe("2026-09-12");
    expect(normalizeUpsExpectedDeliveryDate("09/12/2026")).toBe("2026-09-12");
  });

  it("returns null when UPS omits an estimate", () => {
    expect(normalizeUpsExpectedDeliveryDate(null)).toBeNull();
  });
});

describe("UPS tracking helpers", () => {
  it("normalizes valid UPS tracking numbers and rejects unsafe input", () => {
    expect(normalizeUpsTrackingNumber("1Z 999-AA1 01 2345 6784")).toBe("1Z999AA10123456784");
    expect(() => normalizeUpsTrackingNumber("1Z<script>")).toThrow("valid UPS tracking number");
  });

  it("returns derived shipment information without exposing postal or recipient details", () => {
    const result = formatUpsTrackingResult({
      trackResponse: { shipment: [{
        inquiryNumber: "1Z999AA10123456784",
        package: [{
          currentStatus: { description: "On the Way", simplifiedTextDescription: "In Transit", statusCode: "005" },
          service: { description: "UPS Ground" },
          deliveryDate: [{ type: "DEL", date: "20260820" }],
          activity: [{
            gmtDate: "20260814",
            gmtTime: "120000",
            status: { description: "Departed from Facility" },
            location: { address: { city: "HUNTINGTON", stateProvince: "NY", countryCode: "US", postalCode: "11743", recipientName: "Private Recipient" } as any },
          }],
        }],
      }] },
    } as any, "1Z999AA10123456784");

    expect(result).toMatchObject({
      expectedDeliveryDate: "2026-08-20",
      status: "On the Way",
      service: "UPS Ground",
      events: [{ type: "Departed from Facility", city: "HUNTINGTON", state: "NY" }],
    });
    expect(JSON.stringify(result)).not.toContain("11743");
    expect(JSON.stringify(result)).not.toContain("Private Recipient");
  });

  it("routes live tracking through the protected Cloudflare proxy", async () => {
    vi.stubEnv("CLOUDFLARE_UPS_PROXY_URL", "https://proxy.example.test/");
    vi.stubEnv("CLOUDFLARE_UPS_PROXY_CLIENT_ID", "proxy-client-id");
    vi.stubEnv("CLOUDFLARE_UPS_PROXY_CLIENT_SECRET", "proxy-client-secret");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      trackResponse: { shipment: [{ inquiryNumber: "1Z999AA10123456784", package: [{ currentStatus: { description: "On the Way" } }] }] },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await lookupUpsTracking("1Z999AA10123456784");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe("https://proxy.example.test/ups/track/1Z999AA10123456784");
    expect(requestInit.headers).toMatchObject({
      "CF-Access-Client-Id": "proxy-client-id",
      "CF-Access-Client-Secret": "proxy-client-secret",
    });
    expect(requestUrl).not.toContain("onlinetools.ups.com");
  });
});
