type FetchLike = typeof fetch;

type SmithsonianFact = { label: string; value: string };

type SmithsonianLookup = {
  status: 'success' | 'not_found' | 'error';
  message?: string;
  data?: { id: string; title: string; imageUrl: string | null; sourceUrl: string; facts: SmithsonianFact[] };
};

type SmithsonianRecord = {
  id?: string;
  title?: string;
  unitCode?: string;
  content?: {
    descriptiveNonRepeating?: {
      title?: { content?: string };
      record_link?: string;
      data_source?: string;
      online_media?: { media?: Array<{ content?: string; thumbnail?: string }> };
    };
    freetext?: Record<string, Array<{ content?: string }>>;
    indexedStructured?: Record<string, string[]>;
  };
};

function first(values: Array<{ content?: string }> | undefined): string | null {
  return values?.map((entry) => entry.content?.trim()).find(Boolean) || null;
}

function joined(values: string[] | undefined): string | null {
  const unique = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  return unique.length ? unique.join(', ') : null;
}

function isPostalMuseumRecord(record: SmithsonianRecord): boolean {
  const source = [record.unitCode, record.content?.descriptiveNonRepeating?.data_source, first(record.content?.freetext?.dataSource)]
    .filter(Boolean).join(' ').toLowerCase();
  return record.unitCode === 'NPM' || source.includes('national postal museum') || source.includes('postal museum');
}

export async function lookupSmithsonianStampReference(query: string, fetchImpl: FetchLike = fetch): Promise<SmithsonianLookup> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { status: 'error', message: 'Enter a stamp title or catalog reference to search Smithsonian.' };
  const apiKey = process.env.SMITHSONIAN_API_KEY;
  if (!apiKey) return { status: 'error', message: 'Smithsonian stamp reference is not configured.' };
  try {
    const url = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(normalizedQuery)}&api_key=${encodeURIComponent(apiKey)}&rows=12`;
    const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    const payload: any = await response.json().catch(() => null);
    if (!response.ok) return { status: 'error', message: `Smithsonian search returned HTTP ${response.status}.` };
    const record = ((payload?.response?.rows ?? []) as SmithsonianRecord[]).find(isPostalMuseumRecord);
    if (!record) return { status: 'not_found', message: 'No relevant National Postal Museum stamp reference was found for this query.' };
    const free = record.content?.freetext ?? {};
    const indexed = record.content?.indexedStructured ?? {};
    const media = record.content?.descriptiveNonRepeating?.online_media?.media?.[0];
    const facts: SmithsonianFact[] = [];
    const add = (label: string, value: string | null) => { if (value) facts.push({ label, value }); };
    add('Catalog reference', first(free.notes) || first(free.identifier) || joined(indexed.identifier));
    add('Object number', record.id || null);
    add('Date', first(free.date) || joined(indexed.date));
    add('Place', first(free.place) || joined(indexed.place));
    add('Printer / maker', first(free.name) || joined(indexed.name));
    add('Object type', first(free.objectType) || joined(indexed.object_type));
    add('Medium / dimensions', first(free.physicalDescription) || joined(indexed.material));
    add('Topics', first(free.topic) || joined(indexed.topic));
    facts.push({ label: 'Collection', value: 'National Postal Museum' }, { label: 'Image rights', value: 'CC0' });
    return {
      status: 'success',
      data: {
        id: record.id || 'unknown',
        title: record.content?.descriptiveNonRepeating?.title?.content || record.title || 'Smithsonian stamp reference',
        imageUrl: media?.thumbnail || media?.content || null,
        sourceUrl: record.content?.descriptiveNonRepeating?.record_link || `https://www.si.edu/object/${record.id}`,
        facts,
      },
    };
  } catch {
    return { status: 'error', message: 'Smithsonian is temporarily unavailable. Please try again.' };
  }
}
