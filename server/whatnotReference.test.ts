import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWhatnotReference } from "./whatnotReference";

describe("Whatnot Reference adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runs seller profile/reviews mode and returns aggregate fields without review text", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { defaultDatasetId: "dataset-1" } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        username: "dovescollection",
        displayName: "Doves Collection",
        userId: "123",
        profileUrl: "https://www.whatnot.com/user/dovescollection",
        rating: 5,
        reviewCount: 3697,
        soldCount: 22763,
        followers: 12372,
        averageShippingTime: "1 day",
        sellerStatus: "active",
        review: "private review text should not be returned",
      }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWhatnotReference("@dovescollection");

    expect(result).toMatchObject({ username: "dovescollection", rating: 5, reviewCount: 3697, soldCount: 22763, followerCount: 12372, averageShippingTime: "1 day", sellerStatus: "active" });
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
