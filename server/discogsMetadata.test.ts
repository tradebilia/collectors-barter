import { describe, expect, it, vi } from "vitest";
import { buildDiscogsSearchParams, buildDiscogsSearchQuery, lookupDiscogsReleases } from "./discogsMetadata";

describe("Discogs metadata adapter", () => {
  it("builds a music-focused query from structured inventory details", () => {
    const details = JSON.stringify({
      artist: "Miles Davis",
      releaseTitle: "Kind of Blue",
      recordLabel: "Columbia",
      catalogNumber: "CL 1355",
      releaseYear: "1959",
      country: "US",
      format: "Vinyl",
    });

    expect(buildDiscogsSearchQuery("fallback title", details)).toBe("Miles Davis Kind of Blue");
    const params = buildDiscogsSearchParams("fallback title", details);
    expect(params.get("q")).toBe("Miles Davis Kind of Blue");
    expect(params.get("type")).toBe("release");
    expect(params.get("year")).toBe("1959");
    expect(params.get("catno")).toBe("CL 1355");
    expect(params.get("label")).toBe("Columbia");
    expect(params.get("country")).toBe("US");
    expect(params.get("format")).toBe("Vinyl");
  });

  it("normalizes usable Discogs release results and preserves source links", async () => {
    process.env.DISCOGS_USER_TOKEN = "test-token";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      pagination: { items: 1 },
      results: [{
        id: 123,
        title: "Miles Davis - Kind Of Blue",
        year: 1959,
        format: ["Vinyl", "LP", "Album"],
        label: ["Columbia"],
        catno: ["CL 1355"],
        country: "US",
        genre: ["Jazz"],
        style: ["Modal"],
        uri: "/release/123-Miles-Davis-Kind-Of-Blue",
        thumb: "https://i.discogs.com/thumb.jpg",
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await lookupDiscogsReleases("Kind of Blue", undefined, fetchMock);

    expect(result.status).toBe("success");
    expect(result.data?.results[0]).toMatchObject({
      id: 123,
      title: "Miles Davis - Kind Of Blue",
      year: 1959,
      format: ["Vinyl", "LP", "Album"],
      label: ["Columbia"],
      catalogNumber: ["CL 1355"],
      sourceUrl: "https://www.discogs.com/release/123-Miles-Davis-Kind-Of-Blue",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/database/search?"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Discogs token=test-token",
          "User-Agent": expect.stringContaining("TradebiliaTestAI/1.0"),
        }),
      }),
    );
  });

  it("returns a safe configuration error without making a request when the token is missing", async () => {
    delete process.env.DISCOGS_USER_TOKEN;
    const fetchMock = vi.fn<typeof fetch>();

    const result = await lookupDiscogsReleases("Kind of Blue", undefined, fetchMock);

    expect(result).toEqual({
      status: "error",
      query: "Kind of Blue",
      message: "Discogs user token is not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports Discogs rate limiting without treating it as a successful match", async () => {
    process.env.DISCOGS_USER_TOKEN = "test-token";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 429 }));

    const result = await lookupDiscogsReleases("Kind of Blue", undefined, fetchMock);

    expect(result.status).toBe("error");
    expect(result.message).toContain("rate limit");
  });
});
