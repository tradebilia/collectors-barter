type FetchLike = typeof fetch;

type TcgDexFact = { label: string; value: string };

type TcgDexLookup = {
  status: 'success' | 'not_found' | 'error';
  message?: string;
  data?: {
    id: string;
    title: string;
    sourceUrl: string;
    matchNote: string;
    facts: TcgDexFact[];
  };
};

type TcgDexCardStub = { id?: string; localId?: string; name?: string };

type TcgDexCard = {
  id?: string;
  localId?: string;
  name?: string;
  category?: string;
  rarity?: string;
  illustrator?: string;
  hp?: number | string;
  stage?: string;
  types?: string[];
  set?: { id?: string; name?: string; cardCount?: { official?: number; total?: number } };
  variants?: Record<string, boolean | undefined>;
  variants_detailed?: Array<{ type?: string; subtype?: string; stamp?: string[] }>;
  legal?: Record<string, boolean | undefined>;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/pok[eé]mon|trading card|tcg|card/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function compact(value: string): string {
  return normalize(value).replace(/\s/g, '');
}

function formatVariants(variants: TcgDexCard['variants']): string | null {
  const labels: Record<string, string> = {
    firstEdition: 'First edition', holo: 'Holo', normal: 'Non-holo', reverse: 'Reverse holo', wPromo: 'Promo',
  };
  const values = Object.entries(variants ?? {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => labels[key] ?? key.replace(/([A-Z])/g, ' $1').trim());
  return values.length ? values.join(', ') : null;
}

function formatLegalities(legal: TcgDexCard['legal']): string | null {
  const values = Object.entries(legal ?? {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key[0].toUpperCase() + key.slice(1));
  return values.length ? values.join(', ') : null;
}

async function fetchJson(url: string, fetchImpl: FetchLike): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Tradebilia-TestAI/1.0 (read-only Pokémon catalog lookup)' },
    signal: AbortSignal.timeout(8_000),
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

function detailVariants(card: TcgDexCard): string[] {
  return (card.variants_detailed ?? []).flatMap((variant) => [variant.type, variant.subtype, ...(variant.stamp ?? [])])
    .filter((value): value is string => typeof value === 'string')
    .map(normalize);
}

function scoreCard(card: TcgDexCard, normalizedQuery: string, cardNumber?: string, setName?: string): number {
  let score = normalize(card.name ?? '') === normalizedQuery ? 100 : normalize(card.name ?? '').includes(normalizedQuery) ? 30 : 0;
  if (cardNumber && compact(card.localId ?? '') === compact(cardNumber)) score += 100;
  if (setName) {
    const normalizedSet = normalize(setName);
    if (normalize(card.set?.name ?? '').includes(normalizedSet)) score += 80;
    if (detailVariants(card).some((variant) => variant.includes(normalizedSet))) score += 180;
  }
  return score;
}

/**
 * Returns factual Pokémon card catalog metadata only. Pricing, images, certification,
 * condition, ownership, and authenticity fields are intentionally excluded.
 */
export async function lookupTcgDexCatalog(
  query: string,
  options: { cardNumber?: string; setName?: string } = {},
  fetchImpl: FetchLike = fetch,
): Promise<TcgDexLookup> {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return { status: 'error', message: 'Enter a Pokémon card name to search TCGdex.' };
  const searchTerm = query
    .replace(/pok[eé]mon|trading card|tcg|card/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (searchTerm.length < 2) return { status: 'error', message: 'Enter a Pokémon card name to search TCGdex.' };

  try {
    const search = await fetchJson(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(searchTerm)}`, fetchImpl);
    if (!search.ok) return { status: 'error', message: `TCGdex search returned HTTP ${search.status}.` };
    if (!Array.isArray(search.data) || !search.data.length) return { status: 'not_found', message: 'No matching TCGdex card record was found.' };

    const stubs = (search.data as TcgDexCardStub[])
      .filter((card) => typeof card.id === 'string' && typeof card.name === 'string')
      .sort((a, b) => {
        const aNumber = options.cardNumber && compact(a.localId ?? '') === compact(options.cardNumber) ? 1 : 0;
        const bNumber = options.cardNumber && compact(b.localId ?? '') === compact(options.cardNumber) ? 1 : 0;
        const aName = normalize(a.name ?? '') === normalizedQuery ? 1 : 0;
        const bName = normalize(b.name ?? '') === normalizedQuery ? 1 : 0;
        return (bNumber - aNumber) || (bName - aName);
      })
      .slice(0, 8);

    const cards: TcgDexCard[] = [];
    for (const stub of stubs) {
      const detail = await fetchJson(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(stub.id!)}`, fetchImpl);
      if (detail.ok && detail.data && typeof detail.data === 'object') cards.push(detail.data as TcgDexCard);
    }
    if (!cards.length) return { status: 'error', message: 'TCGdex returned matching cards but their details could not be read.' };

    const card = [...cards].sort((a, b) => scoreCard(b, normalizedQuery, options.cardNumber, options.setName) - scoreCard(a, normalizedQuery, options.cardNumber, options.setName))[0];
    const id = card?.id;
    if (!card || typeof id !== 'string') return { status: 'not_found', message: 'No usable TCGdex card record was found.' };

    const facts: TcgDexFact[] = [];
    const add = (label: string, value: string | number | null | undefined) => {
      if (value !== null && value !== undefined && String(value).trim()) facts.push({ label, value: String(value) });
    };
    add('Card number', card.localId);
    add('Set', card.set?.name);
    add('Set code', card.set?.id);
    add('Rarity', card.rarity);
    add('Category', card.category);
    add('HP', card.hp);
    add('Types', card.types?.join(', '));
    add('Stage', card.stage);
    add('Illustrator', card.illustrator);
    add('Variants', formatVariants(card.variants));
    add('Legalities', formatLegalities(card.legal));

    const exactNumber = Boolean(options.cardNumber && compact(card.localId ?? '') === compact(options.cardNumber));
    const matchedSet = Boolean(options.setName && normalize(card.set?.name ?? '').includes(normalize(options.setName)));
    const matchedVariant = Boolean(options.setName && detailVariants(card).some((variant) => variant.includes(normalize(options.setName!))));
    const exactSetOrVariant = matchedSet || matchedVariant;
    const matchNote = exactNumber && exactSetOrVariant
      ? `Matched by card name, card number, and ${matchedVariant && !matchedSet ? 'variant' : 'set'}. Confirm the physical card and variant before using any separate market source.`
      : exactNumber
        ? 'Matched by card name and card number. Confirm the set and variant before using any separate market source.'
        : 'Name-based catalog match. Confirm the exact set, card number, and variant before using any separate market source.';

    return {
      status: 'success',
      data: {
        id,
        title: card.name?.trim() || query.trim(),
        sourceUrl: `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(id)}`,
        matchNote,
        facts,
      },
    };
  } catch {
    return { status: 'error', message: 'TCGdex is temporarily unavailable. Please try again.' };
  }
}
