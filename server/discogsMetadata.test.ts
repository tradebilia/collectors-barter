import { describe, expect, it, vi } from "vitest";
import { buildDiscogsSearchParams, buildDiscogsSearchQuery, getDiscogsReleaseYear, lookupDiscogsReleases } from "./discogsMetadata";

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

    expect(buildDiscogsSearchQuery("Display Title — Signed Limited Edition", details)).toBe("Kind of Blue");
    const params = buildDiscogsSearchParams("Display Title — Signed Limited Edition", details);
    expect(params.get("q")).toBe("Kind of Blue");
    expect(params.get("release_title")).toBe("Kind of Blue");
    expect(params.get("artist")).toBe("Miles Davis");
    expect(params.get("type")).toBe("release");
    expect(params.get("year")).toBeNull();
    expect(params.get("catno")).toBeNull();
    expect(params.get("label")).toBeNull();
    expect(params.get("country")).toBeNull();
    expect(params.get("format")).toBeNull();
  });

  it("uses a valid Release Year only for the initial narrowing request", () => {
    const details = JSON.stringify({ artist: "The Beatles", releaseTitle: "Sgt. Pepper's Lonely Hearts Club Band", releaseYear: "1967" });
    expect(getDiscogsReleaseYear(details)).toBe(1967);
    expect(getDiscogsReleaseYear(JSON.stringify({ releaseYear: "1900" }))).toBe(1900);
    expect(getDiscogsReleaseYear(JSON.stringify({ releaseYear: "nineteen sixty seven" }))).toBeNull();
    expect(getDiscogsReleaseYear(JSON.stringify({ releaseYear: "1500" }))).toBeNull();
    expect(buildDiscogsSearchParams("Listing title", details).get("year")).toBeNull();
    expect(buildDiscogsSearchParams("Listing title", details, true).get("year")).toBe("1967");
  });

  it("does not forward internal Music format codes that would eliminate valid Discogs results", () => {
    const params = buildDiscogsSearchParams("Listing title", JSON.stringify({
      artist: "The Beatles",
      releaseTitle: "Sgt. Pepper's Lonely Hearts Club Band",
      format: "vinyl_record",
      catalogNumber: "PCS 7027",
    }));

    expect(params.get("q")).toBe("Sgt. Pepper's Lonely Hearts Club Band");
    expect(params.get("release_title")).toBe("Sgt. Pepper's Lonely Hearts Club Band");
    expect(params.get("artist")).toBe("The Beatles");
    expect(params.get("format")).toBeNull();
    expect(params.get("catno")).toBeNull();
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

    const result = await lookupDiscogsReleases("Display Title — Signed Limited Edition", JSON.stringify({ artist: "Miles Davis", releaseTitle: "Kind of Blue" }), fetchMock);

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
      expect.stringContaining("release_title=Kind+of+Blue"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Discogs token=test-token",
          "User-Agent": expect.stringContaining("TradebiliaTestAI/1.0"),
        }),
      }),
    );
  });

  it("keeps a valid Release Year filter when it returns matching candidates", async () => {
    process.env.DISCOGS_USER_TOKEN = "test-token";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      pagination: { items: 1 },
      results: [{ id: 1967, title: "The Beatles - Sgt. Pepper's Lonely Hearts Club Band", year: 1967, format: ["Vinyl"], uri: "/release/1967" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await lookupDiscogsReleases("Listing title", JSON.stringify({ artist: "The Beatles", releaseTitle: "Sgt. Pepper's Lonely Hearts Club Band", releaseYear: "1967" }), fetchMock);

    expect(result.status).toBe("success");
    expect(result.data?.requestedReleaseYear).toBe(1967);
    expect(result.data?.releaseYearFilterApplied).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("year=1967");
  });

  it("falls back to title and artist candidates if the stored Release Year produces no matches", async () => {
    process.env.DISCOGS_USER_TOKEN = "test-token";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ pagination: { items: 0 }, results: [] }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        pagination: { items: 1 },
        results: [{ id: 1968, title: "The Beatles - Sgt. Pepper's Lonely Hearts Club Band", year: 1968, format: ["Vinyl"], uri: "/release/1968" }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await lookupDiscogsReleases("Listing title", JSON.stringify({ artist: "The Beatles", releaseTitle: "Sgt. Pepper's Lonely Hearts Club Band", releaseYear: "1900" }), fetchMock);

    expect(result.status).toBe("success");
    expect(result.data?.requestedReleaseYear).toBe(1900);
    expect(result.data?.releaseYearFilterApplied).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("year=1900");
    expect(fetchMock.mock.calls[1]?.[0]).not.toContain("year=");
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
