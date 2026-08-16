type FetchLike = typeof fetch;
type IgdbEnvironment = { TWITCH_CLIENT_ID?: string; TWITCH_CLIENT_SECRET?: string };

type IgdbFact = { label: string; value: string };

type IgdbLookup = {
  status: 'success' | 'not_found' | 'error';
  message?: string;
  data?: {
    id: number;
    title: string;
    sourceUrl: string;
    matchNote: string;
    facts: IgdbFact[];
  };
};

type IgdbGame = {
  id?: number;
  name?: string;
  first_release_date?: number;
  platforms?: Array<{ name?: string }>;
  genres?: Array<{ name?: string }>;
  game_modes?: Array<{ name?: string }>;
  themes?: Array<{ name?: string }>;
  involved_companies?: Array<{ developer?: boolean; publisher?: boolean; company?: { name?: string } }>;
  age_ratings?: Array<{ organization?: { name?: string }; rating_category?: { rating?: string } }>;
};

const tokenCache = new Map<string, { value: string; expiresAt: number }>();

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function normalizeGameTitle(value: string): string {
  return value
    .replace(/\b(?:graded|factory sealed|sealed|new|mint|cib|wata|vga|igs|psa|cgc)\b/gi, ' ')
    .replace(/\b(?:wata|vga|igs|psa|cgc)\s*[qc]?\d+(?:\.\d+)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeApicalypse(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function searchVariants(title: string): string[] {
  const punctuated = title.replace(/\b(Bros|Dr|Mr|Mrs|Ms|St)\b(?!\.)/g, '$1.');
  return [...new Set([title, punctuated])].filter((value) => value.length >= 2);
}

function valueList(values: Array<{ name?: string }> | undefined): string | null {
  const names = (values ?? []).map((entry) => entry.name?.trim()).filter((value): value is string => Boolean(value));
  return names.length ? names.join(', ') : null;
}

function platformMatches(platforms: IgdbGame['platforms'], platform?: string): boolean {
  if (!platform) return false;
  const sought = normalize(platform);
  const aliases: Record<string, string[]> = {
    nes: ['nintendo entertainment system'], snes: ['super nintendo entertainment system'],
    n64: ['nintendo 64'], gamecube: ['nintendo gamecube'], wii: ['wii'], wiiu: ['wii u'],
    ps1: ['playstation'], ps2: ['playstation 2'], ps3: ['playstation 3'], ps4: ['playstation 4'], ps5: ['playstation 5'],
    xbox: ['xbox'], xbox360: ['xbox 360'], xboxone: ['xbox one'], switch: ['nintendo switch'],
  };
  const accepted = [sought, ...(aliases[sought] ?? [])];
  return (platforms ?? []).some((candidate) => {
    const candidateName = normalize(candidate.name ?? '');
    return accepted.some((term) => candidateName === term || candidateName.startsWith(`${term} `));
  });
}

function scoreGame(game: IgdbGame, expectedTitle: string, releaseYear?: number, platform?: string): number {
  const title = normalize(game.name ?? '');
  const expected = normalize(expectedTitle);
  let score = title === expected ? 200 : title.includes(expected) || expected.includes(title) ? 80 : 0;
  if (releaseYear && game.first_release_date && new Date(game.first_release_date * 1000).getUTCFullYear() === releaseYear) score += 120;
  if (platformMatches(game.platforms, platform)) score += 100;
  return score;
}

async function getTwitchAppToken(
  env: IgdbEnvironment,
  fetchImpl: FetchLike,
): Promise<string | null> {
  const clientId = env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const cached = tokenCache.get(clientId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const response = await fetchImpl('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !payload?.access_token) return null;
  tokenCache.set(clientId, { value: payload.access_token, expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3_600) * 1_000 });
  return payload.access_token;
}

/**
 * Returns commercially authorized IGDB factual game metadata only. It intentionally
 * excludes market pricing, review scores, ownership, grading, condition, and authenticity claims.
 */
export async function lookupIgdbGameMetadata(
  title: string,
  options: { releaseYear?: number; platform?: string } = {},
  fetchImpl: FetchLike = fetch,
  env: IgdbEnvironment = process.env as IgdbEnvironment,
): Promise<IgdbLookup> {
  const lookupTitle = normalizeGameTitle(title);
  if (lookupTitle.length < 2) return { status: 'error', message: 'Enter a Video Game title to search IGDB.' };

  try {
    const clientId = env.TWITCH_CLIENT_ID?.trim();
    const accessToken = await getTwitchAppToken(env, fetchImpl);
    if (!clientId || !accessToken) return { status: 'error', message: 'IGDB credentials are unavailable. Confirm the server-side Twitch application settings.' };

    const fields = 'id,name,first_release_date,platforms.name,genres.name,game_modes.name,themes.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,age_ratings.organization.name,age_ratings.rating_category.rating';
    let payload: unknown = [];
    const terms = searchVariants(lookupTitle);
    const primarySearchTerm = terms[terms.length - 1]!;
    const requestGames = async (searchTerm: string, mainReleasesOnly: boolean): Promise<{ status: 'error'; message: string } | null> => {
      const query = `search "${escapeApicalypse(searchTerm)}"; fields ${fields};${mainReleasesOnly ? ' where category = 0 & version_parent = null;' : ''} limit 12;`;
      const response = await fetchImpl('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Client-ID': clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        body: query,
        signal: AbortSignal.timeout(12_000),
      });
      payload = await response.json().catch(() => null);
      if (!response.ok) return { status: 'error', message: `IGDB returned HTTP ${response.status}.` };
      return null;
    };
    const mainReleaseError = await requestGames(primarySearchTerm, true);
    if (mainReleaseError) return mainReleaseError;
    if (!Array.isArray(payload) || !payload.length) {
      const error = await requestGames(primarySearchTerm, false);
      if (error) return error;
    }
    if (!Array.isArray(payload) || !payload.length) return { status: 'not_found', message: 'No matching IGDB game record was found.' };

    const candidates = payload as IgdbGame[];
    const constrainedCandidates = candidates.filter((candidate) => {
      const releaseYearMatches = !options.releaseYear || (candidate.first_release_date && new Date(candidate.first_release_date * 1_000).getUTCFullYear() === options.releaseYear);
      const platformMatchesInput = !options.platform || platformMatches(candidate.platforms, options.platform);
      return releaseYearMatches && platformMatchesInput;
    });
    if ((options.releaseYear || options.platform) && !constrainedCandidates.length) {
      const constraints = [options.releaseYear ? `release year ${options.releaseYear}` : null, options.platform ? `platform ${options.platform}` : null].filter(Boolean).join(' and ');
      return { status: 'not_found', message: `No IGDB record matched the title with the specified ${constraints}.` };
    }
    const game = [...(constrainedCandidates.length ? constrainedCandidates : candidates)].sort((a, b) => scoreGame(b, lookupTitle, options.releaseYear, options.platform) - scoreGame(a, lookupTitle, options.releaseYear, options.platform))[0];
    if (!game?.id || !game.name) return { status: 'not_found', message: 'No usable IGDB game record was found.' };

    const facts: IgdbFact[] = [];
    const add = (label: string, value: string | number | null | undefined) => {
      if (value !== null && value !== undefined && String(value).trim()) facts.push({ label, value: String(value) });
    };
    const releaseYear = game.first_release_date ? new Date(game.first_release_date * 1_000).getUTCFullYear() : null;
    const developers = (game.involved_companies ?? []).filter((company) => company.developer).map((company) => company.company?.name).filter((value): value is string => Boolean(value)).join(', ');
    const publishers = (game.involved_companies ?? []).filter((company) => company.publisher).map((company) => company.company?.name).filter((value): value is string => Boolean(value)).join(', ');
    const ageRatings = (game.age_ratings ?? []).map((rating) => [rating.organization?.name, rating.rating_category?.rating].filter(Boolean).join(' ')).filter(Boolean).join(', ');
    add('Release year', releaseYear);
    add('Platforms', valueList(game.platforms));
    add('Developers', developers || null);
    add('Publishers', publishers || null);
    add('Genres', valueList(game.genres));
    add('Game modes', valueList(game.game_modes));
    add('Themes', valueList(game.themes));
    add('Age ratings', ageRatings || null);

    const exactName = normalize(game.name) === normalize(lookupTitle);
    const yearMatches = Boolean(options.releaseYear && releaseYear === options.releaseYear);
    const platformMatchesInput = platformMatches(game.platforms, options.platform);
    const matchParts = [exactName ? 'title' : 'title similarity', yearMatches ? 'release year' : null, platformMatchesInput ? 'platform' : null].filter(Boolean);
    return {
      status: 'success',
      data: {
        id: game.id,
        title: game.name,
        sourceUrl: `https://www.igdb.com/games/${game.id}`,
        matchNote: `Matched by ${matchParts.join(', ')}. Confirm the exact release, platform, and edition before using a separate market source.`,
        facts,
      },
    };
  } catch {
    return { status: 'error', message: 'IGDB is temporarily unavailable. Please try again.' };
  }
}
