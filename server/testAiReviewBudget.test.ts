import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from './_core/llm';
import { buildVisualTargetMetadata, filterVisualSourceCandidates, prioritizeVisualSourceCandidates,
  videoGameGameVisualScore, pokemonVisualScore, pokemonVisualCap, sportsCardSingleVisualScore, type VisualSourceCandidate } from './testAiVisualSourceFilter';

const model = vi.mocked(invokeLLM);
const now = new Date('2026-11-10T03:00:00.000Z');
const primary = 'https://example.invalid/budget-target.jpg';
const gameDetails = { gameTitle: 'Metroid', platform: 'NES', completeInBox: 'Yes', sealed: 'No' };
const gameTarget = buildVisualTargetMetadata({ title: 'Metroid NES CIB', category: 'video_games', itemType: 'game', isGraded: false, fullItemDetails: gameDetails });
const game = (index: number, patch: Record<string, unknown> = {}): VisualSourceCandidate => ({ title: 'Metroid NES CIB', isGraded: false,
  saleId: `budget-game-${index}`, imageUrl: `https://example.invalid/budget-game-${index}.jpg`, fullItemDetails: gameDetails, ...patch });
const rawEvidence = { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false,
  rawOrLooseVisible: true, identityMatches: true, artworkMatches: true };
const run = (listings: VisualSourceCandidate[], patch: Partial<Parameters<typeof filterVisualSourceCandidates>[0]> = {}) => filterVisualSourceCandidates({
  sourceRole: 'marketplace', sourceLabel: 'Synthetic owned sold cohort', reviewBudgetRole: 'sold_source',
  targetImageUrl: primary, targetMetadata: gameTarget, listings, ...patch,
});
const allRows = (result: Awaited<ReturnType<typeof run>>) => [...result.listings, ...(result.contextListings ?? [])];
beforeEach(() => {
  model.mockReset(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('No live/image HTTP permitted in the synthetic budget fixture'); }));
  model.mockImplementation(async () => ({ choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: 999,
    verdict: 'match', confidence: 'high', rationale: 'Synthetic deciding artwork and raw form agree.', visualEvidence: rawEvidence }] }) } }] } as any));
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('actual bounded sold-source opportunity pipeline', () => {
  it('raises a two-review Video Game band to eight eligible opportunities without claiming admissions', async () => {
    expect(videoGameGameVisualScore(game(0), gameTarget).score).toBe(60);
    const result = await run(Array.from({ length: 12 }, (_, index) => game(index)));
    expect(model).toHaveBeenCalledTimes(8);
    expect(result.reviewBudget).toMatchObject({ singleMarketplaceSalesRequirement: 6, reviewBuffer: 2,
      requestedSelectionBudget: 8, eligibleImageBearingCount: 12, selectedCount: 8, queuedCount: 8, dispatchedCount: 8,
      opportunityShortfall: 0, admittedCurrentSalesCount: null, verifiedCurrentSalesDeficit: null });
    expect(result.listings).toHaveLength(8); expect(allRows(result)).toHaveLength(12);
    expect(result.visualExecutionCounts).toMatchObject({ selectedCandidateCount: 8, dispatchedCandidateCount: 8 });
    expect(allRows(result).every(row => row.metadataFieldComparisons?.length && row.metadataScoreAwards?.length)).toBe(true);
    expect(result.note).toContain('financial evidence deficit are unmeasured');
  });
  it.each(['context', undefined] as const)('keeps %s contextual reviews at the original band despite forged row and source labels', async role => {
    const result = await run(Array.from({ length: 12 }, (_, index) => game(index, { reviewBudgetRole: 'sold_source', saleStatus: 'completed' })),
      { sourceLabel: 'eBay Sold-Comps', reviewBudgetRole: role });
    expect(model).toHaveBeenCalledTimes(2); expect(result.reviewBudget).toBeUndefined();
    expect(result.visualExecutionCounts?.selectedCandidateCount).toBe(2);
    expect(result.listings.every(row => !row.identityApproval)).toBe(true);
  });
  it('clamps to available eligible images while retaining low-score, hard-conflict and missing-image rows', async () => {
    const listings = Array.from({ length: 4 }, (_, index) => game(index));
    listings.push(game(4, { imageUrl: null }));
    listings.push(game(5, { title: 'Metroid', fullItemDetails: { gameTitle: 'Metroid' } }));
    listings.push(game(6, { title: 'Metroid SNES CIB', fullItemDetails: { ...gameDetails, platform: 'SNES' } }));
    const result = await run(listings);
    expect(model).toHaveBeenCalledTimes(4); expect(allRows(result)).toHaveLength(7);
    expect(result.reviewBudget).toMatchObject({ eligibleImageBearingCount: 4, selectedCount: 4, opportunityShortfall: 4 });
    const byId = new Map(allRows(result).map(row => [row.saleId, row]));
    expect(byId.get('budget-game-4')?.visualExecution?.attempts).toHaveLength(0);
    expect(byId.get('budget-game-5')?.metadataMatchScore).toBeLessThan(50);
    expect(byId.get('budget-game-5')?.visualExecution?.attempts).toHaveLength(0);
    expect(byId.get('budget-game-6')?.visualExecution?.hardExclusion).toBe(true);
  });
  it('selects but never dispatches without a target image', async () => {
    const result = await run(Array.from({ length: 12 }, (_, index) => game(index)), { targetImageUrl: null });
    expect(model).not.toHaveBeenCalled(); expect(result.status).toBe('skipped_no_target_image');
    expect(result.reviewBudget).toMatchObject({ selectedCount: 8, queuedCount: 0, dispatchedCount: 0 });
    expect(allRows(result)).toHaveLength(12);
  });
  it('does not dispatch when the supplied deadline already expired', async () => {
    const result = await run(Array.from({ length: 12 }, (_, index) => game(index)), { reviewDeadlineAt: now.getTime() - 1 });
    expect(model).not.toHaveBeenCalled(); expect(result.deadlineReached).toBe(true);
    expect(result.reviewBudget).toMatchObject({ selectedCount: 8, queuedCount: 8, dispatchedCount: 0, deadlineHeldCount: 8 });
    expect(allRows(result)).toHaveLength(12);
  });
  it('leaves an unmapped/special workflow outside a new exact-comparable budget', async () => {
    const result = await run([game(0)], { targetMetadata: buildVisualTargetMetadata({ title: 'Metroid', category: 'comics', itemType: 'original_art', isGraded: false }) });
    expect(model).not.toHaveBeenCalled(); expect(result.reviewBudget).toBeUndefined();
  });
});

describe('Pokémon individual eligibility and larger opportunity', () => {
  const details = { cardName: 'Charizard', cardNumber: '4/102', setName: 'Base Set' };
  const target = buildVisualTargetMetadata({ title: 'Charizard Base Set #4/102', category: 'pokemon', itemType: 'single_card', isGraded: false, fullItemDetails: details });
  const card = (index: number, patch: Record<string, unknown> = {}): VisualSourceCandidate => ({ title: 'Charizard Base Set #4/102', isGraded: false,
    saleId: `budget-card-${index}`, imageUrl: `https://example.invalid/budget-card-${index}.jpg`, fullItemDetails: details, ...patch });
  it.each(['sold_source', 'context'] as const)('enforces every candidate minimum/image before %s slicing', async role => {
    const listings = Array.from({ length: 10 }, (_, index) => card(index));
    listings.unshift(card(10, { imageUrl: null }));
    listings.push(card(11, { title: 'Charizard', fullItemDetails: { cardName: 'Charizard' } }));
    expect(pokemonVisualScore(listings[11], target).score).toBeLessThan(60);
    const result = await run(listings, { targetMetadata: target, reviewBudgetRole: role });
    const expected = role === 'sold_source' ? 9 : pokemonVisualCap(pokemonVisualScore(card(0), target).score);
    expect(model).toHaveBeenCalledTimes(expected);
    expect(result.visualExecutionCounts?.selectedCandidateCount).toBe(expected);
    for (const id of ['budget-card-10', 'budget-card-11']) expect(allRows(result).find(row => row.saleId === id)?.visualExecution?.attempts).toHaveLength(0);
    if (role === 'sold_source') expect(result.reviewBudget).toMatchObject({ singleMarketplaceSalesRequirement: 7, selectedCount: 9 });
  });
});

describe('sold dispatch comparator preserves score, ties and independent hard holds', () => {
  it('keeps score/ingress order while retaining the existing thirty-queue maximum', () => {
    const candidates = Array.from({ length: 32 }, (_, candidateIndex) => ({ candidateIndex, item: { ...game(candidateIndex), metadataMatchScore: candidateIndex < 2 ? 90 : 65 },
      imageUrl: `https://example.invalid/order-${candidateIndex}.jpg`, imageUrls: [`https://example.invalid/order-${candidateIndex}.jpg`] }));
    const held = { candidateIndex: 0, verdict: 'mismatch' as const, confidence: 'high' as const, rationale: 'Actual deterministic conflict fixture' };
    const queue = prioritizeVisualSourceCandidates(candidates, gameTarget, [held], true);
    expect(queue).toHaveLength(30); expect(queue[0].candidateIndex).toBe(1);
    expect(queue.slice(1).map(row => row.candidateIndex)).toEqual(Array.from({ length: 29 }, (_, index) => index + 2));
  });
});

describe('independent-review failure and reason projection regressions', () => {
  it('retains a genuine Sports Card score-band cap of ten instead of shrinking it to nine', async () => {
    const details = { player: 'Kobe Bryant', year: '1996', manufacturer: 'Topps', cardNumber: '138' };
    const title = '1996 Topps Kobe Bryant #138 PSA 10';
    const target = buildVisualTargetMetadata({ title, category: 'sports_cards', itemType: 'single_card', grade: '10', certificationCompany: 'PSA', isGraded: true, fullItemDetails: details });
    const listings = Array.from({ length: 12 }, (_, index) => ({ title, saleId: `sports-budget-${index}`, isGraded: true,
      grade: '10', gradingCompany: 'PSA', fullItemDetails: details, imageUrl: `https://example.invalid/sports-budget-${index}.jpg` }));
    expect(sportsCardSingleVisualScore(listings[0], target).score).toBeGreaterThanOrEqual(90);
    model.mockImplementation(async () => ({ choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: 999,
      verdict: 'match', confidence: 'high', rationale: 'Synthetic deciding graded card and exact visible number agree.',
      visualEvidence: { ...rawEvidence, rawOrLooseVisible: false, slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true } }] }) } }] } as any));
    const result = await run(listings, { targetMetadata: target });
    expect(model).toHaveBeenCalledTimes(10);
    expect(result.reviewBudget).toMatchObject({ existingScoreBandCap: 10, singleMarketplaceSalesRequirement: 7,
      requestedSelectionBudget: 10, selectedCount: 10, queuedCount: 10, dispatchedCount: 10 });
  });
  it('emits each occurrence once across provider-unavailable selected and held partitions', async () => {
    model.mockRejectedValue(new Error('Synthetic provider unavailable'));
    const result = await run(Array.from({ length: 12 }, (_, index) => game(index)));
    expect(result.status).toBe('provider_unavailable');
    expect(result.listings).toHaveLength(8); expect(result.contextListings).toHaveLength(4);
    expect(new Set(allRows(result).map(row => row.metadataRanking?.occurrenceKey)).size).toBe(12);
    expect(result.reviewBudget).toMatchObject({ selectedCount: 8, queuedCount: 8, dispatchedCount: 8 });
    expect(result.contextListings?.every(row => row.visualExecution?.attempts.length === 0 && row.evidenceReasons?.some(reason => reason.includes('review budget reached')))).toBe(true);
    expect(allRows(result).every(row => !row.identityApproval)).toBe(true);
  });
  it('preserves actual over-budget, low-score and unavailable-image reason arrays on successful output', async () => {
    const listings = Array.from({ length: 12 }, (_, index) => game(index, { evidenceReasons: ['Inherited unrelated diagnostic'] }));
    listings.push(game(12, { imageUrl: null }));
    listings.push(game(13, { title: 'Metroid', fullItemDetails: { gameTitle: 'Metroid' } }));
    const result = await run(listings);
    const byId = new Map(allRows(result).map(row => [row.saleId, row]));
    expect(byId.get('budget-game-8')?.evidenceReasons).toEqual(['bounded sold-source review budget reached (8 selected; 8 requested)']);
    expect(byId.get('budget-game-12')?.evidenceReasons).toEqual(['no candidate image available; retained as context-only']);
    expect(byId.get('budget-game-13')?.evidenceReasons).toEqual(['metadata score below minimum (50)']);
  });
  it('preserves the first dispatched four-way chunk and honestly holds the remainder after a short deadline', async () => {
    model.mockImplementation(async () => {
      vi.setSystemTime(new Date(now.getTime() + 2000));
      return { choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: 999, verdict: 'match', confidence: 'high',
        rationale: 'Synthetic complete deciding raw-form review', visualEvidence: rawEvidence }] }) } }] } as any;
    });
    const result = await run(Array.from({ length: 12 }, (_, index) => game(index)), { reviewDeadlineAt: now.getTime() + 1000 });
    expect(model).toHaveBeenCalledTimes(4);
    expect(result.deadlineReached).toBe(true);
    expect(result.reviewBudget).toMatchObject({ selectedCount: 8, queuedCount: 8, dispatchedCount: 4, deadlineHeldCount: 4 });
    expect(allRows(result)).toHaveLength(12);
    expect(allRows(result).filter(row => row.visualExecution?.identity.result === 'match')).toHaveLength(4);
    expect(result.reviewBudget?.verifiedCurrentSalesDeficit).toBeNull();
  });
  it('keeps mixed Mercari status labels contextual without an owned sold-cohort role', async () => {
    const result = await run(Array.from({ length: 12 }, (_, index) => game(index, { providerMetadata: { status: index % 2 ? 'active' : 'sold' },
      saleStatus: 'completed', priceBasis: 'sold' })), { sourceLabel: 'Mercari Video Game sold listings', reviewBudgetRole: undefined });
    expect(result.reviewBudget).toBeUndefined(); expect(model).toHaveBeenCalledTimes(2);
    expect(allRows(result).every(row => !row.identityApproval)).toBe(true);
  });
});
