type SmithsonianFact = {
  label: string;
  value: string;
};

export type SmithsonianStampLookup = {
  status: 'success' | 'not_found' | 'error';
  message?: string;
  data?: {
    objectId: string;
    title: string;
    imageUrl: string | null;
    sourceUrl: string;
    facts: SmithsonianFact[];
  };
};

type SmithsonianMedia = {
  content?: string;
  usage?: { access?: string };
};

type SmithsonianRecord = {
  id?: string;
  title?: string;
  content?: {
    descriptiveNonRepeating?: {
      title?: { content?: string };
      record_link?: string;
      online_media?: { media?: SmithsonianMedia[] };
      metadata_usage?: { access?: string };
    };
    freetext?: Record<string, Array<{ content?: string }> | undefined>;
    indexedStructured?: Record<string, string[] | undefined>;
  };
};

type FetchLike = typeof fetch;

function firstText(...values: Array<string | undefined | null>): string | null {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;
}

function firstFreetext(record: SmithsonianRecord, key: string): string | null {
  const values = record.content?.freetext?.[key] ?? [];
  return firstText(...values.map((value) => value.content));
}

function joinedFreetext(record: SmithsonianRecord, key: string): string | null {
  const values = (record.content?.freetext?.[key] ?? [])
    .map((value) => value.content?.trim())
    .filter((value): value is string => Boolean(value));
  return values.length ? [...new Set(values)].join(' · ') : null;
}

function firstStructured(record: SmithsonianRecord, key: string): string | null {
  return firstText(...(record.content?.indexedStructured?.[key] ?? []));
}

function recordText(record: SmithsonianRecord): string {
  return JSON.stringify(record).toLowerCase();
}

export async function lookupSmithsonianStampMetadata(
  query: string,
  apiKey: string | undefined = process.env.SMITHSONIAN_API_KEY,
  fetchImpl: FetchLike = fetch,
): Promise<SmithsonianStampLookup> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { status: 'error', message: 'Enter a stamp title or catalog identifier to search Smithsonian Open Access.' };
  if (!apiKey) return { status: 'error', message: 'Smithsonian Open Access is not configured.' };

  try {
    const url = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(normalizedQuery)}&rows=10&api_key=${encodeURIComponent(apiKey)}`;
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
    });
    const body = await response.json() as { response?: { rows?: SmithsonianRecord[] } };
    if (!response.ok) return { status: 'error', message: `Smithsonian search returned HTTP ${response.status}.` };

    const rows = body.response?.rows ?? [];
    if (!rows.length) return { status: 'not_found', message: 'No Smithsonian Open Access stamp reference was found.' };

    const record = rows.find((row) => /national postal museum|postal museum|\bnpm\b/.test(recordText(row)));
    if (!record) {
      return { status: 'not_found', message: 'No National Postal Museum reference matched this stamp query.' };
    }
    const objectId = firstText(record.id) ?? 'smithsonian-record';
    const title = firstText(record.title, record.content?.descriptiveNonRepeating?.title?.content) ?? normalizedQuery;
    const sourceUrl = firstText(
      record.content?.descriptiveNonRepeating?.record_link,
      `https://www.si.edu/object/${encodeURIComponent(objectId)}`,
    )!;
    const imageUrl = firstText(...(record.content?.descriptiveNonRepeating?.online_media?.media ?? []).map((media) => media.content));
    const facts: SmithsonianFact[] = [];
    const collection = firstFreetext(record, 'dataSource') ?? firstStructured(record, 'data_source');
    const date = firstStructured(record, 'date') ?? firstFreetext(record, 'date');
    const subject = joinedFreetext(record, 'topic') ?? firstStructured(record, 'topic');
    const place = firstStructured(record, 'place') ?? firstFreetext(record, 'place');
    const catalogReference = firstFreetext(record, 'title');
    const objectNumber = firstFreetext(record, 'identifier');
    const printer = firstFreetext(record, 'name');
    const description = firstFreetext(record, 'notes');
    const objectType = firstFreetext(record, 'objectType') ?? firstStructured(record, 'object_type');
    const physicalDetails = joinedFreetext(record, 'physicalDescription');
    const collectionGroup = firstFreetext(record, 'setName');
    const rights = firstText(
      record.content?.descriptiveNonRepeating?.metadata_usage?.access,
      record.content?.descriptiveNonRepeating?.online_media?.media?.[0]?.usage?.access,
    );
    if (collection) facts.push({ label: 'Collection', value: collection });
    if (collectionGroup) facts.push({ label: 'Collection group', value: collectionGroup });
    if (date) facts.push({ label: 'Date', value: date });
    if (subject) facts.push({ label: 'Subject', value: subject });
    if (place) facts.push({ label: 'Place', value: place });
    if (catalogReference) facts.push({ label: 'Catalog reference', value: catalogReference });
    if (objectNumber) facts.push({ label: 'Object number', value: objectNumber });
    if (printer) facts.push({ label: 'Printer', value: printer });
    if (description) facts.push({ label: 'Description', value: description });
    if (objectType) facts.push({ label: 'Object type', value: objectType });
    if (physicalDetails) facts.push({ label: 'Material & dimensions', value: physicalDetails });
    if (rights) facts.push({ label: 'Image rights', value: rights });

    return {
      status: 'success',
      data: { objectId, title, imageUrl, sourceUrl, facts },
    };
  } catch {
    return { status: 'error', message: 'Smithsonian Open Access is temporarily unavailable. Please try again.' };
  }
}
