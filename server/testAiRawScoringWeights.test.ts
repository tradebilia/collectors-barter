import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('Live model forbidden in raw-score fixtures'); }) }));
import {
  buildVisualTargetMetadata, annotatePreVisualComparableScores, withMetadataFieldComparisons,
  videoGameGameVisualScore, videoGameConsoleVisualScore, videoGameAccessoryVisualScore,
  moviesIndividualVisualScore, moviesBoxSetVisualScore, musicVisualScore, pokemonVisualScore,
  vintageToyVisualScore, coinsSingleVisualScore, coinsSetVisualScore, paperMoneyVisualScore,
  comicsSingleVisualScore, sportsCardSingleVisualScore, sportsCardSetVisualScore,
  stampsSetVisualScore, stampsSingleVisualScore, disneyPinsIndividualVisualScore,
  universalMetadataScore, type VisualSourceCandidate,
} from './testAiVisualSourceFilter';
import type { MetadataScoreResult } from '../shared/testAiRankingAwards';

type Fixture = { name: string; category: string; itemType: string; weight: number;
  details?: Record<string, unknown>; scorer: (item: VisualSourceCandidate, metadata: string) => MetadataScoreResult };
const fixtures: Fixture[] = [
  { name: 'Video Games game', category: 'video_games', itemType: 'game', weight: 15, scorer: videoGameGameVisualScore },
  { name: 'Video Games console', category: 'video_games', itemType: 'console', weight: 5, scorer: videoGameConsoleVisualScore },
  { name: 'Video Games accessory', category: 'video_games', itemType: 'accessory', weight: 5, scorer: videoGameAccessoryVisualScore },
  { name: 'Movie individual', category: 'movies', itemType: 'individual_movie', weight: 10, scorer: moviesIndividualVisualScore },
  { name: 'Movie box', category: 'movies', itemType: 'box_set', weight: 10, scorer: moviesBoxSetVisualScore },
  { name: 'Sports single', category: 'sports_cards', itemType: 'single_card', weight: 20, scorer: sportsCardSingleVisualScore, details: { rookieStatus: 'No', autographStatus: 'No', relicStatus: 'No', serialNumberedStatus: 'No' } },
  { name: 'Comics', category: 'comics', itemType: 'single_comic', weight: 25, scorer: comicsSingleVisualScore },
  { name: 'Coin single', category: 'coins', itemType: 'single_coin', weight: 20, scorer: coinsSingleVisualScore },
  { name: 'Paper Money', category: 'coins', itemType: 'paper_money', weight: 20, scorer: paperMoneyVisualScore },
  { name: 'Stamp set', category: 'stamps', itemType: 'stamp_set___sheet', weight: 9, scorer: stampsSetVisualScore },
  { name: 'Universal visual fallback', category: 'other', itemType: 'artifact', weight: 40, scorer: universalMetadataScore },
  ...['single_card', 'set', 'unopened_product'].map(itemType => ({ name: `Pokemon ${itemType}`, category: 'pokemon', itemType, weight: 10, scorer: pokemonVisualScore })),
  ...['vinyl_record', 'cassette_tape', 'compact_disc', '8_track_tape', 'other_music_format'].map(itemType => ({ name: `Music ${itemType}`, category: 'music', itemType, weight: 10, scorer: musicVisualScore })),
  ...['action_figure', 'board_game', 'electronic_toy', 'lego', 'model/kit', 'playset', 'plush_stuffed_toy', 'vehicle'].map(itemType => ({ name: `Toy ${itemType}`, category: 'vintage_toys', itemType, weight: 10, scorer: vintageToyVisualScore })),
];
const target = (row: Fixture, state: unknown = 'No', extra: Record<string, unknown> = {}) => buildVisualTargetMetadata({
  title: 'Tangible Collectible', category: row.category, itemType: row.itemType,
  fullItemDetails: { ...(row.details ?? {}), isGraded: state, ...extra },
});
const item = (state: unknown = 'No', extra: Record<string, unknown> = {}): VisualSourceCandidate => ({ title: 'Tangible Collectible', isGraded: state, ...extra });
const gradingAwards = (result: MetadataScoreResult) => result.awards.filter(award => /^(?:isGraded|grade|numericGrade|gradingCompany|gradingDetails)$/.test(award.field));
function accounting(result: MetadataScoreResult) {
  expect(result.score).toBe(result.awards.reduce((sum, award) => sum + award.awardedPoints, 0));
  expect(result.score).toBeGreaterThanOrEqual(0); expect(result.score).toBeLessThanOrEqual(100);
  expect(new Set(result.awards.map(award => award.field)).size).toBe(result.awards.length);
}

describe('fixed contingent raw weights at actual category award boundaries', () => {
  it.each(fixtures)('$name replaces only its existing grading allocation', row => {
    const explicit = row.scorer(item('No', { fullItemDetails: row.details ?? {} }), target(row));
    const unknown = row.scorer(item('Unknown', { fullItemDetails: row.details ?? {} }), target(row));
    expect(gradingAwards(explicit)).toEqual([{ field: 'isGraded', awardedPoints: row.weight, source: 'structured', evidence: [{ field: 'isGraded', value: 'No', source: 'structured' }] }]);
    expect(gradingAwards(unknown)).toEqual([]);
    expect(explicit.score - unknown.score).toBe(row.weight);
    expect(explicit.awards.filter(award => !gradingAwards(explicit).includes(award))).toEqual(unknown.awards);
    expect(explicit.matched).toContain('isGraded');
    accounting(explicit); accounting(unknown);
  });
  it.each(fixtures)('$name does not award raw points to Unknown, graded or conflicted candidate state', row => {
    for (const candidate of [item('Unknown'), item('Yes'), item('No', { graded: true }), item('No', { grade: 9 }), item('No', { gradingCompany: 'CGC' }), item('No', { title: 'Tangible Collectible CGC 9' })]) {
      const result = row.scorer(candidate, target(row));
      expect(gradingAwards(result)).toEqual([]); accounting(result);
    }
  });
  it.each(fixtures)('$name never uses target absence or a contradictory target as a raw scoring denominator', row => {
    for (const metadata of [target(row, 'Unknown'), target(row, 'Unknown', { grade: 0 }), target(row, 'No', { grade: 9 }), target(row, 'No', { graded: true })]) {
      expect(gradingAwards(row.scorer(item(), metadata))).toEqual([]);
    }
  });
  it.each(fixtures)('$name accepts explicit Boolean No and real title raw evidence, not packaging or an unnamed title', row => {
    expect(gradingAwards(row.scorer(item(false), target(row, false)))[0]).toMatchObject({ field: 'isGraded', awardedPoints: row.weight });
    expect(gradingAwards(row.scorer({ title: 'Tangible Collectible Ungraded' }, target(row)))[0]).toMatchObject({ field: 'isGraded', awardedPoints: row.weight, source: 'title', evidence: [{ field: 'isGraded', value: 'Ungraded', source: 'title' }] });
    for (const title of ['Tangible Collectible', 'Tangible Collectible Used', 'Tangible Collectible Loose', 'Tangible Collectible Sealed']) expect(gradingAwards(row.scorer({ title }, target(row)))).toEqual([]);
  });
});

describe('actual raw-score diagnostics and source separation', () => {
  const row = fixtures[0];
  it('projects the actual raw title capture into the Is Graded row only', () => {
    const metadata = target(row);
    const candidate: VisualSourceCandidate = { title: 'Tangible Collectible Ungraded' };
    const scored = annotatePreVisualComparableScores([candidate], metadata)[0];
    const rows = withMetadataFieldComparisons(metadata, scored).metadataFieldComparisons;
    expect(rows.find(field => field.fieldKey === 'isGraded')).toMatchObject({ targetValue: 'No', candidateValue: 'Unknown', titleDerivedValue: 'No (inferred from title)', titleDerivedStatus: 'match', rankingContribution: { matched: true, structured: false, titleDerived: true, awardedPoints: 15 } });
    for (const field of rows.filter(field => /^(?:grade|certificationCompany|gradingCompany)$/.test(field.fieldKey))) expect(field.rankingContribution?.matched).toBe(false);
  });
  it('keeps an actual lower-priority raw alias visible and highlighted without an unknown-is-raw rule', () => {
    const metadata = target(row);
    const candidate: VisualSourceCandidate = { title: 'Tangible Collectible', isGraded: 'Unknown', graded: false };
    const scored = annotatePreVisualComparableScores([candidate], metadata)[0];
    const field = withMetadataFieldComparisons(metadata, scored).metadataFieldComparisons.find(field => field.fieldKey === 'isGraded');
    expect(field).toMatchObject({ candidateValue: 'false', status: 'match', rankingContribution: { matched: true, structured: true, titleDerived: false, awardedPoints: 15 } });
  });
  it('retains product identity Raw as identity rather than inventing ungraded state', () => {
    const metadata = buildVisualTargetMetadata({ title: 'WWE Raw', category: 'video_games', itemType: 'game', fullItemDetails: { gameTitle: 'WWE Raw', platform: 'Xbox' } });
    const candidate = { title: 'WWE Raw Xbox', gameTitle: 'WWE Raw', platform: 'Xbox' };
    expect(gradingAwards(videoGameGameVisualScore(candidate, metadata))).toEqual([]);
    expect(withMetadataFieldComparisons(metadata, candidate).metadataFieldComparisons.find(field => field.fieldKey === 'isGraded')).toMatchObject({ titleDerivedValue: 'Unknown' });
  });
  it('keeps a complete explicitly raw Video Game within the unchanged 100-point accounting', () => {
    const details = { gameTitle: 'Metroid', platform: 'NES', releaseYear: '1986', region: 'NTSC-U', edition: 'Standard', sealed: 'Yes', completeInBox: 'Yes', upc: '123456789012', isGraded: 'No' };
    const metadata = buildVisualTargetMetadata({ title: 'Metroid', category: 'video_games', itemType: 'game', fullItemDetails: details });
    const result = videoGameGameVisualScore({ title: 'Metroid', ...details }, metadata);
    expect(result.score).toBe(100); expect(gradingAwards(result)).toMatchObject([{ field: 'isGraded', awardedPoints: 15 }]); accounting(result);
  });
  it('a raw score has identical relevance for Active and sold rows but creates no financial facts', () => {
    const active = Object.freeze({ title: 'Tangible Collectible', isGraded: 'No', source: 'eBay Active', saleStatus: 'active', price: 100 });
    const sold = { ...active, source: 'eBay Sold-Comps', saleStatus: 'sold' };
    expect(videoGameGameVisualScore(active, target(row))).toEqual(videoGameGameVisualScore(sold, target(row)));
    expect(active).toEqual({ title: 'Tangible Collectible', isGraded: 'No', source: 'eBay Active', saleStatus: 'active', price: 100 });
    expect(active).not.toHaveProperty('provenanceToken'); expect(active).not.toHaveProperty('identityApproval'); expect(active).not.toHaveProperty('saleDate');
  });
});

describe('subtypes with no grade allocation keep their existing models', () => {
  it.each([
    ['sports_cards', 'set', sportsCardSetVisualScore], ['coins', 'coin_set', coinsSetVisualScore],
    ['stamps', 'single_stamp', stampsSingleVisualScore], ['disney_pins', 'individual_pin', disneyPinsIndividualVisualScore],
  ] as const)('%s %s does not gain a grading pool', (category, itemType, scorer) => {
    const metadata = buildVisualTargetMetadata({ title: 'Tangible Collectible', category, itemType, isGraded: false });
    expect(gradingAwards(scorer(item(), metadata))).toEqual([]);
    expect(scorer(item(), metadata)).toEqual(scorer(item('Unknown'), metadata));
  });
});

describe('reviewed raw-state loophole regressions', () => {
  const row = fixtures[0];
  it.each([
    { title: 'Tangible Collectible PSA 9 CGC 8', isGraded: 'No' },
    { title: 'Tangible Collectible Raw PSA 9 CGC 8' },
    { title: 'Tangible Collectible', isGraded: 'No', gameGrade: '9' },
    { title: 'Tangible Collectible Raw?' },
    { title: 'Tangible Collectible Ungraded?' },
  ])('never awards a raw pool for opposed, hidden-native or uncertain title evidence %#', candidate => {
    expect(gradingAwards(videoGameGameVisualScore(candidate, target(row)))).toEqual([]);
  });
  it('gameGrade zero remains a placeholder rather than a graded or raw fact', () => {
    expect(gradingAwards(videoGameGameVisualScore({ title: 'Tangible Collectible', isGraded: 'No', gameGrade: 0 }, target(row)))[0]).toMatchObject({ field: 'isGraded', awardedPoints: 15 });
    expect(gradingAwards(videoGameGameVisualScore({ title: 'Tangible Collectible', gameGrade: 0 }, target(row)))).toEqual([]);
  });
  it('uses actual candidate identity even when the target has only a sparse title', () => {
    const candidate = { title: 'WWE Raw Xbox', gameTitle: 'WWE Raw', platform: 'Xbox' };
    expect(gradingAwards(videoGameGameVisualScore(candidate, target(row)))).toEqual([]);
    expect(withMetadataFieldComparisons(target(row), candidate).metadataFieldComparisons.find(field => field.fieldKey === 'isGraded')?.titleDerivedValue).toBe('Unknown');
  });
  it('keeps equivalent state aliases visible but credits the actual state term once', () => {
    const details = { isGraded: 'No', graded: false, gradingStatus: 'Raw', gradingState: 'Ungraded' };
    const metadata = buildVisualTargetMetadata({ title: 'Tangible Collectible', category: 'video_games', itemType: 'game', fullItemDetails: details });
    const candidate = { title: 'Tangible Collectible', ...details };
    const scored = annotatePreVisualComparableScores([candidate], metadata)[0];
    const fields = withMetadataFieldComparisons(metadata, scored).metadataFieldComparisons.filter(field => /^(?:isGraded|graded|gradingStatus|gradingState)$/.test(field.fieldKey));
    expect(fields.length).toBeGreaterThan(1);
    expect(fields.filter(field => field.rankingContribution?.matched)).toHaveLength(1);
    expect(fields.reduce((sum, field) => sum + (field.rankingContribution?.awardedPoints ?? 0), 0)).toBe(15);
    expect(fields.find(field => field.fieldKey === 'isGraded')?.rankingContribution).toMatchObject({ structured: true, awardedPoints: 15 });
  });
  it('shows a real No/grade contradiction instead of a clean raw state match', () => {
    const metadata = target(row);
    const candidate = { title: 'Tangible Collectible', isGraded: 'No', gameGrade: '9' };
    const scored = annotatePreVisualComparableScores([candidate], metadata)[0];
    const field = withMetadataFieldComparisons(metadata, scored).metadataFieldComparisons.find(field => field.fieldKey === 'isGraded');
    expect(field?.candidateValue).toContain('Conflicted'); expect(field?.candidateValue).toContain('gameGrade=9');
    expect(field).toMatchObject({ status: 'unknown', titleDerivedStatus: 'unknown', rankingContribution: { matched: false, awardedPoints: 0 } });
  });
  it('does not change the actual comics/Original Art universal-call boundary', () => {
    const metadata = buildVisualTargetMetadata({ title: 'Tangible Collectible', category: 'comics', itemType: 'original_art', isGraded: false });
    expect(gradingAwards(universalMetadataScore(item(), metadata))).toEqual([]);
    expect(universalMetadataScore(item(), metadata)).toEqual(universalMetadataScore(item('Unknown'), metadata));
  });
});
