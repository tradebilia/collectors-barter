const DISCOGS_API_BASE = "https://api.discogs.com";
export const DISCOGS_USER_AGENT = "TradebiliaTestAI/1.0 (+https://tradebilia.manus.space)";

export type DiscogsLookupStatus = "success" | "not_found" | "error";

export type DiscogsReleaseResult = {
  id: number;
  title: string;
  artist: string | null;
  releaseTitle: string;
  year: number | null;
  format: string[];
  label: string[];
  catalogNumber: string[];
  country: string | null;
  genre: string[];
  style: string[];
  sourceUrl: string;
};

export type DiscogsLookupResult = {
  status: DiscogsLookupStatus;
  query: string;
  data?: {
    results: DiscogsReleaseResult[];
    total: number;
    requestedReleaseYear: number | null;
    releaseYearFilterApplied: boolean;
  };
  message?: string;
};

type DiscogsSearchRecord = {
  id?: number;
  title?: string;
  year?: number | string;
  format?: unknown;
  label?: unknown;
  catno?: unknown;
  country?: string;
  genre?: unknown;
  style?: unknown;
  uri?: string;
  resource_url?: string;
  thumb?: string;
  cover_image?: string;
};

type DiscogsSearchResponse = {
  pagination?: { items?: number };
  results?: DiscogsSearchRecord[];
};

type DiscogsSearchAttempt =
  | { error: string }
  | { payload: DiscogsSearchResponse; results: DiscogsReleaseResult[] };

function isDiscogsSearchError(attempt: DiscogsSearchAttempt): attempt is { error: string } {
  return "error" in attempt && typeof attempt.error === "string";
}

type MusicDetails = {
  artist?: string;
  releaseTitle?: string;
  recordLabel?: string;
  catalogNumber?: string;
  releaseYear?: string | number;
  country?: string;
  format?: string;
  formatDetails?: string;
};

function parseMusicDetails(itemDetails?: string): MusicDetails {
  if (!itemDetails) return {};
  try {
    const value = JSON.parse(itemDetails) as unknown;
    return value && typeof value === "object" ? value as MusicDetails : {};
  } catch {
    return {};
  }
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(clean).filter(Boolean);
}

function numberOrNull(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function discogsUrl(record: DiscogsSearchRecord): string {
  const uri = clean(record.uri);
  if (uri) return uri.startsWith("http") ? uri : `https://www.discogs.com${uri}`;
  const resourceUrl = clean(record.resource_url);
  if (resourceUrl) return resourceUrl;
  return record.id ? `https://www.discogs.com/release/${record.id}` : "https://www.discogs.com/";
}

function splitDiscogsSearchTitle(title: string): { artist: string | null; releaseTitle: string } {
  const separator = title.indexOf(" - ");
  if (separator <= 0) return { artist: null, releaseTitle: title };
  return {
    artist: title.slice(0, separator).trim() || null,
    releaseTitle: title.slice(separator + 3).trim() || title,
  };
}

export function buildDiscogsSearchQuery(title: string, itemDetails?: string): string {
  const details = parseMusicDetails(itemDetails);
  return (clean(details.releaseTitle) || clean(title)).replace(/\s+/g, " ").trim();
}
export function getDiscogsReleaseYear(itemDetails?: string): number | null {
  const year = clean(parseMusicDetails(itemDetails).releaseYear);
  if (!/^\d{4}$/.test(year)) return null;
  const numericYear = Number(year);
  const latestPlausibleYear = new Date().getUTCFullYear() + 1;
  return numericYear >= 1877 && numericYear <= latestPlausibleYear ? numericYear : null;
}
export function buildDiscogsSearchParams(title: string, itemDetails?: string, useReleaseYear = false): URLSearchParams {
  const details = parseMusicDetails(itemDetails);
  const artist = clean(details.artist);
  const releaseTitle = clean(details.releaseTitle);
  const params = new URLSearchParams({
    q: buildDiscogsSearchQuery(title, itemDetails),
    type: "release",
    per_page: "12",
    page: "1",
  });
  if (releaseTitle) params.set("release_title", releaseTitle);
  if (artist) params.set("artist", artist);
  const releaseYear = getDiscogsReleaseYear(itemDetails);
  if (useReleaseYear && releaseYear) params.set("year", String(releaseYear));
  // Do not send saved release year, catalog number, label, country, or format as
  // restrictive Discogs filters. Existing inventory can contain partial values or
  // internal UI codes such as `vinyl_record`, which Discogs does not recognize as
  // a format and would turn an otherwise valid album search into a false zero result.
  return params;
}

function normalizeRecord(record: DiscogsSearchRecord): DiscogsReleaseResult | null {
  const id = numberOrNull(record.id);
  const title = clean(record.title);
  if (!id || !title) return null;
  const { artist, releaseTitle } = splitDiscogsSearchTitle(title);
  return {
    id,
    title,
    artist,
    releaseTitle,
    year: numberOrNull(record.year),
    format: stringList(record.format),
    label: stringList(record.label),
    catalogNumber: stringList(record.catno),
    country: clean(record.country) || null,
    genre: stringList(record.genre),
    style: stringList(record.style),
    sourceUrl: discogsUrl(record),
  };
}

export async function lookupDiscogsReleases(
  title: string,
  itemDetails?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscogsLookupResult> {
  const token = process.env.DISCOGS_USER_TOKEN?.trim();
  const query = buildDiscogsSearchQuery(title, itemDetails);
  if (!token) return { status: "error", query, message: "Discogs user token is not configured." };
  if (query.length < 2) return { status: "error", query, message: "Enter a music title or artist before searching Discogs." };

  try {
    const requestedReleaseYear = getDiscogsReleaseYear(itemDetails);
    const search = async (useReleaseYear: boolean): Promise<DiscogsSearchAttempt> => {
      const params = buildDiscogsSearchParams(title, itemDetails, useReleaseYear);
      const response = await fetchImpl(`${DISCOGS_API_BASE}/database/search?${params.toString()}`, {
        headers: {
          Authorization: `Discogs token=${token}`,
          "User-Agent": DISCOGS_USER_AGENT,
          Accept: "application/vnd.discogs.v2.discogs+json",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (response.status === 401 || response.status === 403) return { error: "Discogs rejected the configured credential." };
      if (response.status === 429) return { error: "Discogs rate limit reached. Please wait before trying again." };
      if (!response.ok) return { error: `Discogs returned HTTP ${response.status}.` };
      const payload = await response.json() as DiscogsSearchResponse;
      const results = (payload.results ?? []).map(normalizeRecord).filter((result): result is DiscogsReleaseResult => Boolean(result));
      return { payload, results };
    };

    let releaseYearFilterApplied = Boolean(requestedReleaseYear);
    let searchResult = await search(releaseYearFilterApplied);
    if (isDiscogsSearchError(searchResult)) return { status: "error", query, message: searchResult.error };

    // A stored year helps narrow candidates, but it must never hide a valid release.
    if (releaseYearFilterApplied && !searchResult.results.length) {
      releaseYearFilterApplied = false;
      searchResult = await search(false);
      if (isDiscogsSearchError(searchResult)) return { status: "error", query, message: searchResult.error };
    }

    if (isDiscogsSearchError(searchResult)) return { status: "error", query, message: searchResult.error };
    const { payload, results } = searchResult;
    const total = payload.pagination?.items ?? results.length;
    if (!results.length) {
      return { status: "not_found", query, data: { results: [], total, requestedReleaseYear, releaseYearFilterApplied }, message: "No matching Discogs release records were found." };
    }
    return { status: "success", query, data: { results, total, requestedReleaseYear, releaseYearFilterApplied } };
  } catch {
    return { status: "error", query, message: "Discogs is temporarily unavailable. Please try again." };
  }
}
