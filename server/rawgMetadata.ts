type RawgEnvironment = { RAWG_API_KEY?: string };
type RawgFact = { label: string; value: string };

type RawgLookup = {
  status: 'success' | 'not_found' | 'error';
  message?: string;
  data?: {
    id: number;
    title: string;
    sourceUrl: string;
    matchNote: string;
    facts: RawgFact[];
  };
};

type RawgGame = {
  id?: number;
  slug?: string;
  name?: string;
  released?: string;
  platforms?: Array<{ platform?: { name?: string } }>;
  genres?: Array<{ name?: string }>;
  developers?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  esrb_rating?: { name?: string } | null;
};

export type RawgProviderStatus = {
  status: 'active' | 'setup_required';
  keyConfigured: boolean;
  message: string;
};

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

function searchVariants(title: string): string[] {
  const punctuated = title.replace(/\b(Bros|Dr|Mr|Mrs|Ms|St)\b(?!\.)/g, '$1.');
  return [...new Set([title, punctuated])].filter((value) => value.length >= 2);
}

function platformMatches(platforms: RawgGame['platforms'], platform?: string): boolean {
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
    const candidateName = normalize(candidate.platform?.name ?? '');
    return accepted.some((term) => candidateName === term || candidateName.startsWith(`${term} `));
  });
}

function releaseYear(game: RawgGame): number | null {
  const year = Number.parseInt(game.released?.slice(0, 4) ?? '', 10);
  return Number.isInteger(year) ? year : null;
}

function names(values: Array<{ name?: string }> | undefined): string | null {
  const result = (values ?? []).map((entry) => entry.name?.trim()).filter((value): value is string => Boolean(value));
  return result.length ? result.join(', ') : null;
}

function platformNames(platforms: RawgGame['platforms']): string | null {
  const result = (platforms ?? []).map((entry) => entry.platform?.name?.trim()).filter((value): value is string => Boolean(value));
  return result.length ? result.join(', ') : null;
}

function scoreGame(game: RawgGame, expectedTitle: string, expectedYear?: number, platform?: string): number {
  const title = normalize(game.name ?? '');
  const expected = normalize(expectedTitle);
  let score = title === expected ? 200 : title.includes(expected) || expected.includes(title) ? 80 : 0;
  if (expectedYear && releaseYear(game) === expectedYear) score += 120;
  if (platformMatches(game.platforms, platform)) score += 100;
  return score;
}

/**
 * Returns user-approved, commercially permitted RAWG factual catalog metadata only.
 * It intentionally excludes pricing, review scores, ownership, grading, condition, and authenticity claims.
 */
export async function lookupRawgGameMetadata(
  title: string,
  options: { releaseYear?: number; platform?: string } = {},
  fetchImpl: typeof fetch = fetch,
  env: RawgEnvironment = process.env as RawgEnvironment,
): Promise<RawgLookup> {
  const lookupTitle = normalizeGameTitle(title);
  if (lookupTitle.length < 2) return { status: 'error', message: 'Enter a Video Game title to search RAWG.' };

  const key = env.RAWG_API_KEY?.trim();
  if (!key) return { status: 'error', message: 'RAWG credentials are unavailable. Confirm the server-side API key setting.' };

  try {
    let payload: { results?: RawgGame[] } | null = null;
    for (const term of searchVariants(lookupTitle)) {
      const query = new URLSearchParams({ key, search: term, search_precise: 'true', page_size: '12' });
      const response = await fetchImpl(`https://api.rawg.io/api/games?${query}`, { signal: AbortSignal.timeout(12_000) });
      payload = await response.json().catch(() => null) as { results?: RawgGame[] } | null;
      if (!response.ok) return { status: 'error', message: `RAWG returned HTTP ${response.status}.` };
      if (payload?.results?.length) break;
    }

    const candidates = payload?.results ?? [];
    if (!candidates.length) return { status: 'not_found', message: 'No matching RAWG game record was found.' };
    const platformConstrained = candidates.filter((game) => !options.platform || platformMatches(game.platforms, options.platform));
    if (options.platform && !platformConstrained.length) {
      return { status: 'not_found', message: `No RAWG record matched the title with the specified platform ${options.platform}.` };
    }
    const game = [...(platformConstrained.length ? platformConstrained : candidates)].sort((a, b) => scoreGame(b, lookupTitle, options.releaseYear, options.platform) - scoreGame(a, lookupTitle, options.releaseYear, options.platform))[0];
    if (!game?.id || !game.name || !game.slug) return { status: 'not_found', message: 'No usable RAWG game record was found.' };

    const facts: RawgFact[] = [];
    const add = (label: string, value: string | number | null | undefined) => {
      if (value !== null && value !== undefined && String(value).trim()) facts.push({ label, value: String(value) });
    };
    const year = releaseYear(game);
    add('Release year', year);
    add('Platforms', platformNames(game.platforms));
    add('Developers', names(game.developers));
    add('Publishers', names(game.publishers));
    add('Genres', names(game.genres));
    add('ESRB rating', game.esrb_rating?.name ?? null);

    const exactName = normalize(game.name) === normalize(lookupTitle);
    const yearMatches = Boolean(options.releaseYear && year === options.releaseYear);
    const platformMatchesInput = platformMatches(game.platforms, options.platform);
    const matchParts = [exactName ? 'title' : 'title similarity', yearMatches ? 'release year' : null, platformMatchesInput ? 'platform' : null].filter(Boolean);
    const yearDiscrepancy = options.releaseYear && year && !yearMatches
      ? ` RAWG records a ${year} first-release year, which differs from the supplied ${options.releaseYear}; confirm the regional release before relying on this field.`
      : '';
    return {
      status: 'success',
      data: {
        id: game.id,
        title: game.name,
        sourceUrl: `https://rawg.io/games/${encodeURIComponent(game.slug)}`,
        matchNote: `Matched by ${matchParts.join(', ')}. Confirm the exact release, platform, and edition before using a separate market source.${yearDiscrepancy}`,
        facts,
      },
    };
  } catch {
    return { status: 'error', message: 'RAWG is temporarily unavailable. Please try again.' };
  }
}

export function getRawgProviderStatus(env: RawgEnvironment = process.env as RawgEnvironment): RawgProviderStatus {
  const keyConfigured = Boolean(env.RAWG_API_KEY?.trim());
  return keyConfigured
    ? { status: 'active', keyConfigured: true, message: 'RAWG is active for user-approved, read-only Video Game catalog metadata.' }
    : { status: 'setup_required', keyConfigured: false, message: 'RAWG is inactive. Add a server-side RAWG API key before any lookup can be made.' };
}
