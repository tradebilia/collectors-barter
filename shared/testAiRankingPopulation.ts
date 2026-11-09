/** Display/audit metadata only. No identity, visual, price or signing authority. */
export type MetadataScorerRole = 'exact_comparable' | 'original_art_relevance' | 'signed_item_relevance' | 'unranked';
export type MetadataRankingBinding = {
  populationId: string;
  sourceId: string;
  occurrenceKey: string;
  ordinal: number;
  populationSize: number;
  scorerRole: MetadataScorerRole;
  score: number | null;
  rank: number | null;
};
type RankingRow = Record<string, unknown>;
export type MetadataRankingPopulation<T extends RankingRow = RankingRow> = {
  populationId: string;
  sourceId: string;
  scorerRole: MetadataScorerRole;
  /** Ingress order, not display order or selector priority. */
  listings: Array<T & RankingRow>;
  bindings: readonly MetadataRankingBinding[];
  /** Invocation-owned snapshots; never reconstructed from browser rank fields. */
  entries: ReadonlyMap<string, RankingRow>;
};

const displayFields = [
  'metadataMatchScore', 'metadataMatchRank', 'metadataMatchReasons', 'metadataUnknownFields',
  'metadataScoreAwards', 'metadataMatchLabel', 'metadataFieldComparisons', 'metadataRanking',
] as const;
const candidateWrapperFields = ['marketplaceCandidate', 'canonicalCandidate'] as const;
function isRecord(value: unknown): value is RankingRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function record(value: unknown): RankingRow {
  return isRecord(value) ? value : {};
}
function meaningfulReference(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  return text && !/^(?:unknown|other|n\/?a|null|undefined)$/i.test(text) ? text : null;
}
function providerReference(row: RankingRow): string {
  const wrappers = [row, record(row.rawMetadata), record(row.marketplaceCandidate), record(row.canonicalCandidate)];
  for (const wrapper of wrappers) {
    for (const field of ['providerRecordId', 'saleId', 'listingId', 'itemId', 'id']) {
      const value = meaningfulReference(wrapper[field]);
      if (value) return `id:${encodeURIComponent(value)}`;
    }
  }
  for (const wrapper of wrappers) {
    for (const field of ['itemWebUrl', 'itemUrl', 'url', 'listingUrl']) {
      const value = meaningfulReference(wrapper[field]);
      if (!value) continue;
      try {
        const url = new URL(value);
        if (url.protocol === 'http:' || url.protocol === 'https:') return `url:${encodeURIComponent(value)}`;
      } catch { /* Missing/invalid references use run-local ordinal, never title. */ }
    }
  }
  // Normalized MarketplaceCandidate.candidateId may be a title fallback. Only
  // an explicit raw/direct candidate ID is a reference, never the generated wrapper.
  for (const wrapper of [record(row.rawMetadata), row]) {
    const value = meaningfulReference(wrapper.candidateId);
    const source = meaningfulReference(wrapper.sourceId) ?? 'unknown';
    const title = String(wrapper.normalizedTitle ?? wrapper.title ?? '').trim().toLowerCase();
    if (value && value.toLowerCase() !== title && value.toLowerCase() !== `${source}:${title}`.toLowerCase()) {
      return `candidate:${encodeURIComponent(value)}`;
    }
  }
  return 'local';
}
function validScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}
export function validMetadataDisplayRank(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
function belongs(binding: unknown, population: MetadataRankingPopulation): binding is MetadataRankingBinding {
  const value = record(binding);
  return value.populationId === population.populationId && value.sourceId === population.sourceId
    && typeof value.occurrenceKey === 'string' && population.entries.has(value.occurrenceKey);
}
function displaySnapshot(row: RankingRow): RankingRow {
  const fields: RankingRow = {};
  for (const field of displayFields) fields[field] = row[field];
  return fields;
}
function projectDisplayLevel(row: RankingRow, snapshot: RankingRow): RankingRow {
  const result: RankingRow = { ...row, ...snapshot };
  if (isRecord(row.ranking)) {
    const binding = record(snapshot.metadataRanking);
    result.ranking = { ...row.ranking,
      state: validMetadataDisplayRank(binding.rank) ? 'assigned' : 'not_assigned',
      score: binding.score ?? null, rank: binding.rank ?? null,
      label: snapshot.metadataMatchLabel ?? null,
      reasons: snapshot.metadataMatchReasons ?? [], matchedFields: snapshot.metadataMatchReasons ?? [],
    };
  }
  return result;
}
/** Only the row and its two direct known candidate wrappers are display levels.
 * Raw metadata, arbitrary provider objects, signing payloads and deeper wrappers
 * are not traversed. Each changed level is copied; no inbound object is mutated.
 */
function project<T extends RankingRow>(row: T, snapshot: RankingRow): T & RankingRow {
  const result = projectDisplayLevel(row, snapshot);
  for (const field of candidateWrapperFields) {
    if (isRecord(row[field])) result[field] = projectDisplayLevel(row[field], snapshot);
  }
  return result as T & RankingRow;
}
function clearedDisplaySnapshot(): RankingRow {
  const cleared: RankingRow = {};
  for (const field of displayFields) cleared[field] = undefined;
  return cleared;
}
function clearDisplayMetadata<T extends RankingRow>(row: T): T & RankingRow {
  return project(row, clearedDisplaySnapshot());
}

/** Pure freeze. The server caller supplies a new invocation ID; inbound ranks are ignored. */
export function freezeMetadataRankingPopulation<T extends RankingRow>(listings: T[], options: {
  populationId: string; sourceId: string; scorerRole?: MetadataScorerRole;
}): MetadataRankingPopulation<T> {
  if (!options.populationId.trim() || !options.sourceId.trim()) throw new Error('Ranking population requires source and invocation identity');
  const scorerRole = options.scorerRole ?? 'exact_comparable';
  const bindings = listings.map((row, ordinal) => Object.freeze({
    populationId: options.populationId, sourceId: options.sourceId,
    occurrenceKey: `${encodeURIComponent(options.sourceId)}:${encodeURIComponent(options.populationId)}:${providerReference(row)}:occ:${ordinal}`,
    ordinal, populationSize: listings.length, scorerRole, score: null, rank: null,
  } satisfies MetadataRankingBinding));
  const copies = listings.map((row, ordinal) => {
    const cleared = clearedDisplaySnapshot();
    cleared.metadataRanking = bindings[ordinal];
    return project(row, cleared);
  });
  return { ...options, scorerRole, listings: copies, bindings,
    entries: new Map(copies.map((row, index) => [bindings[index].occurrenceKey, displaySnapshot(row)])) };
}

/** Bind actual scorer output by the carried key, not output order, title, or provider identity. */
export function bindMetadataRankingPopulation<T extends RankingRow>(
  population: MetadataRankingPopulation<T>, scoredListings: RankingRow[],
): MetadataRankingPopulation<T> {
  const scoredByKey = new Map<string, RankingRow>();
  for (const row of scoredListings) {
    if (!belongs(row.metadataRanking, population)) continue;
    const key = row.metadataRanking.occurrenceKey;
    // Repeated projections are not new occurrences; first actual scorer output wins.
    if (!scoredByKey.has(key)) scoredByKey.set(key, row);
  }
  const ranked = population.bindings.filter((binding) => population.scorerRole !== 'unranked'
    && validScore(scoredByKey.get(binding.occurrenceKey)?.metadataMatchScore))
    .sort((a, b) => Number(scoredByKey.get(b.occurrenceKey)!.metadataMatchScore)
      - Number(scoredByKey.get(a.occurrenceKey)!.metadataMatchScore) || a.ordinal - b.ordinal);
  const ranks = new Map(ranked.map((binding, index) => [binding.occurrenceKey, index + 1]));
  const bindings = population.bindings.map((binding) => Object.freeze({ ...binding,
    score: ranks.has(binding.occurrenceKey) ? scoredByKey.get(binding.occurrenceKey)!.metadataMatchScore as number : null,
    rank: ranks.get(binding.occurrenceKey) ?? null,
  }));
  const entries = new Map<string, RankingRow>();
  const listings = population.listings.map((row, ordinal) => {
    const binding = bindings[ordinal];
    const scored = scoredByKey.get(binding.occurrenceKey);
    const snapshot = scored && binding.score !== null ? displaySnapshot(scored) : displaySnapshot(clearDisplayMetadata(row));
    snapshot.metadataRanking = binding;
    snapshot.metadataMatchScore = binding.score ?? undefined;
    snapshot.metadataMatchRank = binding.rank ?? undefined;
    entries.set(binding.occurrenceKey, snapshot);
    return project(row, snapshot);
  });
  return { ...population, bindings, listings, entries };
}

/** Final output overlay only. This helper must never supply visual selection order/caps. */
export function overlayMetadataRankingPopulation<T extends RankingRow>(
  listings: T[], population: MetadataRankingPopulation,
): Array<T & RankingRow> {
  return listings.map((row) => belongs(row.metadataRanking, population)
    ? project(row, population.entries.get(row.metadataRanking.occurrenceKey)!)
    : clearDisplayMetadata(row));
}

/** Caller supplies a locally known parent occurrence, not a browser-authorized population. */
export function preserveParentMetadataRanking<T extends RankingRow>(parent: RankingRow, reviewed: T): T & RankingRow {
  const binding = record(parent.metadataRanking);
  if (typeof binding.occurrenceKey !== 'string' || typeof binding.populationId !== 'string'
    || typeof binding.sourceId !== 'string') return reviewed;
  return project(reviewed, displaySnapshot(parent));
}

/** Origin key is a display join hint only, never server rank or eligibility authority. */
export function retainOriginDisplayRanking<T extends RankingRow>(base: RankingRow, reviewed: T): T & RankingRow {
  const binding = record(base.metadataRanking);
  const reviewBinding = record(reviewed.metadataRanking);
  const origin = reviewed.metadataOriginOccurrenceKey ?? reviewBinding.occurrenceKey;
  if (typeof origin !== 'string' || origin !== binding.occurrenceKey) return reviewed;
  return preserveParentMetadataRanking(base, reviewed);
}
