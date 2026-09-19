export type SimilarListingCandidate = {
  id: number;
  title: string;
  category: string;
  itemType?: string | null;
};

const TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "for", "in", "of", "on", "the", "to", "with",
  "card", "cards", "comic", "comics", "item", "items", "lot", "set",
]);

function normalizedText(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function meaningfulTitleTokens(value: string): Set<string> {
  return new Set(
    normalizedText(value)
      .split(" ")
      .filter(token => token.length >= 3 && !TITLE_STOP_WORDS.has(token)),
  );
}

/**
 * Treats a title as a strong match only when the full normalized title is the
 * same, or when at least two meaningful title tokens overlap and make up at
 * least half of the smaller title. This avoids broad category-only matches.
 */
export function titleSimilarityScore(sourceTitle: string, candidateTitle: string): number {
  const source = normalizedText(sourceTitle);
  const candidate = normalizedText(candidateTitle);
  if (!source || !candidate) return 0;
  if (source === candidate) return 1_000;

  const sourceTokens = meaningfulTitleTokens(sourceTitle);
  const candidateTokens = meaningfulTitleTokens(candidateTitle);
  if (sourceTokens.size === 0 || candidateTokens.size === 0) return 0;

  let sharedTokens = 0;
  for (const token of sourceTokens) {
    if (candidateTokens.has(token)) sharedTokens += 1;
  }

  const smallerTokenCount = Math.min(sourceTokens.size, candidateTokens.size);
  const isStrongTokenMatch = sharedTokens >= 2 || (sharedTokens === 1 && smallerTokenCount === 1);
  return isStrongTokenMatch && sharedTokens / smallerTokenCount >= 0.5
    ? 500 + sharedTokens
    : 0;
}

/**
 * Returns only public listing candidates that are genuinely comparable to the
 * source listing. A candidate must have a strong title/name match or the same
 * category-specific item type. Title matches rank before item-type matches.
 */
export function selectSimilarListings<T extends SimilarListingCandidate>(
  source: SimilarListingCandidate,
  candidates: readonly T[],
  limit = 4,
): T[] {
  const sourceCategory = normalizedText(source.category);
  const sourceItemType = normalizedText(source.itemType);

  return candidates
    .map((candidate, index) => {
      if (candidate.id === source.id || normalizedText(candidate.category) !== sourceCategory) return null;

      const titleScore = titleSimilarityScore(source.title, candidate.title);
      const sameItemType = Boolean(sourceItemType && normalizedText(candidate.itemType) === sourceItemType);
      if (!titleScore && !sameItemType) return null;

      return {
        candidate,
        index,
        score: titleScore + (sameItemType ? 100 : 0),
      };
    })
    .filter((entry): entry is { candidate: T; index: number; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(entry => entry.candidate);
}
