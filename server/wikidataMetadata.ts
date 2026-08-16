export type WikidataCategory = 'movies' | 'autographs';

type FetchLike = typeof fetch;

type WikidataFact = { label: string; value: string };

type WikidataClaim = {
  mainsnak?: {
    datavalue?: { value?: unknown };
  };
};

type WikidataLookup = {
  status: 'success' | 'not_found' | 'error';
  message?: string;
  data?: {
    entityId: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    sourceUrl: string;
    facts: WikidataFact[];
  };
};

type WikidataEntity = {
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  claims?: Record<string, WikidataClaim[]>;
};

function asEntityId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

function claimValues(entity: WikidataEntity, property: string): unknown[] {
  return (entity.claims?.[property] ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter((value): value is unknown => value !== undefined && value !== null);
}

function firstTime(entity: WikidataEntity, property: string): string | null {
  const value = claimValues(entity, property)[0];
  if (!value || typeof value !== 'object') return null;
  const time = (value as { time?: unknown }).time;
  if (typeof time !== 'string') return null;
  return time.match(/^\+?(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

function imageUrl(entity: WikidataEntity): string | null {
  const fileName = claimValues(entity, 'P18')[0];
  if (typeof fileName !== 'string' || !fileName.trim()) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=360`;
}

async function fetchJson(url: string, fetchImpl: FetchLike): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Tradebilia-TestAI/1.0 (read-only metadata lookup)' },
  });
  let data: any = null;
  try { data = await response.json(); } catch { data = null; }
  return { ok: response.ok, status: response.status, data };
}

async function resolveLabels(ids: string[], fetchImpl: FetchLike): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(ids)].slice(0, 12);
  if (!uniqueIds.length) return {};
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=en&ids=${encodeURIComponent(uniqueIds.join('|'))}`;
  const result = await fetchJson(url, fetchImpl);
  if (!result.ok || !result.data?.entities) return {};
  return Object.fromEntries(
    Object.entries(result.data.entities as Record<string, WikidataEntity>)
      .map(([id, entity]) => [id, entity.labels?.en?.value])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function entityIds(entity: WikidataEntity, property: string): string[] {
  return claimValues(entity, property).map(asEntityId).filter((id): id is string => Boolean(id));
}

function displayList(ids: string[], labels: Record<string, string>): string | null {
  const values = ids.map((id) => labels[id] ?? id).filter(Boolean);
  return values.length ? values.join(', ') : null;
}

function durationValue(entity: WikidataEntity): string | null {
  const value = claimValues(entity, 'P2047')[0];
  if (!value || typeof value !== 'object') return null;
  const amount = (value as { amount?: unknown }).amount;
  if (typeof amount !== 'string' && typeof amount !== 'number') return null;
  const normalized = String(amount).replace(/^\+/, '');
  return `${normalized} minutes`;
}

export async function lookupWikidataMetadata(query: string, category: WikidataCategory, fetchImpl: FetchLike = fetch): Promise<WikidataLookup> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { status: 'error', message: 'Enter a title or signer name to search Wikidata.' };
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=5&search=${encodeURIComponent(normalizedQuery)}`;
    const search = await fetchJson(searchUrl, fetchImpl);
    const entityId = search.data?.search?.[0]?.id;
    if (!search.ok) return { status: 'error', message: `Wikidata search returned HTTP ${search.status}.` };
    if (typeof entityId !== 'string') return { status: 'not_found', message: 'No matching Wikidata record was found.' };

    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels%7Cdescriptions%7Cclaims&languages=en&ids=${encodeURIComponent(entityId)}`;
    const entityResult = await fetchJson(entityUrl, fetchImpl);
    const entity = entityResult.data?.entities?.[entityId] as WikidataEntity | undefined;
    if (!entityResult.ok || !entity) return { status: 'error', message: `Wikidata record lookup returned HTTP ${entityResult.status}.` };

    const relatedProperties = category === 'movies'
      ? ['P57', 'P136', 'P495', 'P272', 'P161', 'P58', 'P162', 'P86', 'P344', 'P1040', 'P750', 'P291', 'P166']
      : ['P106', 'P27', 'P166', 'P39'];
    const labels = await resolveLabels(relatedProperties.flatMap((property) => entityIds(entity, property)), fetchImpl);
    const facts: WikidataFact[] = [];
    if (category === 'movies') {
      const releaseDate = firstTime(entity, 'P577');
      const director = displayList(entityIds(entity, 'P57'), labels);
      const genre = displayList(entityIds(entity, 'P136'), labels);
      const origin = displayList(entityIds(entity, 'P495'), labels);
      const productionCompany = displayList(entityIds(entity, 'P272'), labels);
      const cast = displayList(entityIds(entity, 'P161'), labels);
      const screenwriter = displayList(entityIds(entity, 'P58'), labels);
      const producer = displayList(entityIds(entity, 'P162'), labels);
      const composer = displayList(entityIds(entity, 'P86'), labels);
      const cinematographer = displayList(entityIds(entity, 'P344'), labels);
      const editor = displayList(entityIds(entity, 'P1040'), labels);
      const distributor = displayList(entityIds(entity, 'P750'), labels);
      const premiereLocation = displayList(entityIds(entity, 'P291'), labels);
      const awards = displayList(entityIds(entity, 'P166'), labels);
      const runningTime = durationValue(entity);
      if (releaseDate) facts.push({ label: 'Release', value: releaseDate });
      if (director) facts.push({ label: 'Director', value: director });
      if (genre) facts.push({ label: 'Genre', value: genre });
      if (origin) facts.push({ label: 'Origin', value: origin });
      if (productionCompany) facts.push({ label: 'Studio', value: productionCompany });
      if (cast) facts.push({ label: 'Principal cast', value: cast });
      if (screenwriter) facts.push({ label: 'Screenwriter', value: screenwriter });
      if (producer) facts.push({ label: 'Producer', value: producer });
      if (composer) facts.push({ label: 'Composer', value: composer });
      if (cinematographer) facts.push({ label: 'Cinematographer', value: cinematographer });
      if (editor) facts.push({ label: 'Editor', value: editor });
      if (distributor) facts.push({ label: 'Distributor', value: distributor });
      if (runningTime) facts.push({ label: 'Running time', value: runningTime });
      if (premiereLocation) facts.push({ label: 'Premiere location', value: premiereLocation });
      if (awards) facts.push({ label: 'Awards', value: awards });
    } else {
      const born = firstTime(entity, 'P569');
      const died = firstTime(entity, 'P570');
      const occupation = displayList(entityIds(entity, 'P106'), labels);
      const nationality = displayList(entityIds(entity, 'P27'), labels);
      const awards = displayList(entityIds(entity, 'P166'), labels);
      const careerRole = displayList(entityIds(entity, 'P39'), labels);
      if (born) facts.push({ label: 'Born', value: born });
      if (died) facts.push({ label: 'Died', value: died });
      if (occupation) facts.push({ label: 'Known for', value: occupation });
      if (nationality) facts.push({ label: 'Nationality', value: nationality });
      if (awards) facts.push({ label: 'Awards', value: awards });
      if (careerRole) facts.push({ label: 'Career role', value: careerRole });
    }

    return { status: 'success', data: {
      entityId,
      title: entity.labels?.en?.value ?? normalizedQuery,
      description: entity.descriptions?.en?.value ?? null,
      imageUrl: imageUrl(entity),
      sourceUrl: `https://www.wikidata.org/wiki/${entityId}`,
      facts,
    } };
  } catch {
    return { status: 'error', message: 'Wikidata is temporarily unavailable. Please try again.' };
  }
}
