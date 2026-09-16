import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWhatnotReference } from "./whatnotReference";

describe("Whatnot Reference adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runs seller profile/reviews mode and returns aggregate fields without review text", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { defaultDatasetId: "dataset-1" } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        seller: {
          username: "dovescollection",
          displayName: "Doves Collection",
          userId: "123",
        },
        profileMetrics: {
          rating: 5,
          numReviews: 3700,
          soldCount: 22830,
          followerCount: 12584,
          averageShipDays: 1,
          isVerifiedSeller: false,
        },
        reviews: [{ review: "private review text should not be returned" }],
      }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWhatnotReference("@dovescollection");

    expect(result).toMatchObject({ username: "dovescollection", rating: 5, reviewCount: 3700, soldCount: 22830, followerCount: 12584, sellerStatus: "Seller" });
    expect(result).not.toHaveProperty("review");
    const input = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(input).toMatchObject({ mode: "seller", usernames: ["dovescollection"], includeProfile: true, includeReviews: true, includeShows: false, includeShopListings: false, maxReviews: 10 });
  });

  it("rejects malformed usernames before calling Apify", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchWhatnotReference("bad username")).rejects.toThrow("valid public Whatnot username");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
