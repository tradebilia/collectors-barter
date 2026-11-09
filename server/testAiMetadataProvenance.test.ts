import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from './_core/llm';
import {
  annotatePreVisualComparableScores, buildDeclaredIdentityReviews, buildMetadataFieldComparisons,
  buildVisualTargetMetadata, filterVisualSourceCandidates, normalizeVisualSourceCandidate,
  withMetadataFieldComparisons, videoGameGameVisualScore,
} from './testAiVisualSourceFilter';

const mockLLM = vi.mocked(invokeLLM);
function game(details: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return buildVisualTargetMetadata({ title: 'The Legend of Zelda NES', category: 'video_games', itemType: 'game',
    fullItemDetails: { gameTitle: 'The Legend of Zelda', platform: 'NES', ...details }, ...extra });
}
function scored(target: string, candidate: any) {
  return withMetadataFieldComparisons(target, annotatePreVisualComparableScores([candidate], target)[0]);
}
function row(candidate: any, name: string): any {
  return candidate.metadataFieldComparisons.find((entry: any) => entry.targetField === name);
}

describe('Stage 4 composed normalized metadata and awarded comparison projections', () => {
  beforeEach(() => mockLLM.mockReset());
  it('Unknown structured grader stays Unknown while permitted numeric title evidence scores and compares', () => {
    const target = game({ isGraded: 'Yes' }, { grade: '7.50', certificationCompany: 'PSA' });
    const candidate = { title: 'The Legend of Zelda NES PSA 7.5', grade: 'Unknown', grader: 'Unknown',
      details: { platform: 'Unknown' } };
    expect(normalizeVisualSourceCandidate(candidate).grader).toBe('');
    const output = scored(target, candidate);
    expect(row(output, 'Grade')).toMatchObject({ candidateValue: 'Unknown', titleDerivedStatus: 'match',
      rankingContribution: { matched: true, structured: false, titleDerived: true } });
    expect(row(output, 'Certification company')).toMatchObject({ candidateValue: 'Unknown', titleDerivedStatus: 'match',
      rankingContribution: { matched: true, structured: false, titleDerived: true } });
  });
  it('resolves direct Other/custom and case aliases without hiding true opposite structured platform', () => {
    const target = game();
    const recovered = scored(target, { title: 'The Legend of Zelda', Platform: 'Other', customPlatform: 'NES',
      details: { gameTitle: 'The Legend of Zelda' } });
    expect(row(recovered, 'Platform')).toMatchObject({ candidateValue: 'NES', status: 'match' });
    expect(recovered.metadataMatchReasons).toContain('platform');
    const opposite = { title: 'The Legend of Zelda NES', platform: 'SNES' };
    expect(buildDeclaredIdentityReviews([opposite], target)[0]?.verdict).toBe('mismatch');
    expect(row(scored(target, opposite), 'Platform')).toMatchObject({ candidateValue: 'SNES', status: 'different', titleDerivedStatus: 'match' });
  });
  it('refreshes final awards even when comparison rows were prepared before scoring and carry stale markers', () => {
    const target = game({ isGraded: 'Yes' }, { grade: '7.5', certificationCompany: 'PSA' });
    const candidate: any = { title: 'The Legend of Zelda NES PSA 7.5' };
    candidate.metadataFieldComparisons = buildMetadataFieldComparisons(target, candidate)
      .map((entry) => ({ ...entry, rankingContribution: { matched: true, structured: true, titleDerived: false, reasons: ['stale'] } }));
    const output = scored(target, candidate);
    expect(row(output, 'Grade').rankingContribution).toMatchObject({ matched: true, structured: false, titleDerived: true });
    expect(withMetadataFieldComparisons(target, output).metadataFieldComparisons).toEqual(output.metadataFieldComparisons);
    const reasonOnly = withMetadataFieldComparisons(target, { ...candidate, metadataScoreAwards: [], metadataMatchReasons: ['grade', 'isGraded'] });
    expect(row(reasonOnly, 'Grade').rankingContribution.matched).toBe(false);
  });
  it('an Is Graded award does not award or highlight numeric Grade', () => {
    const target = game({ isGraded: 'No' });
    const output = scored(target, { title: 'The Legend of Zelda NES', isGraded: false });
    expect(output.metadataScoreAwards.some((award: any) => award.field === 'isGraded')).toBe(true);
    expect(row(output, 'Grade').rankingContribution.matched).toBe(false);
  });
  it('CIB-only structured records agree rather than becoming sealed; both true form conflicts remain', () => {
    const target = game({ sealed: 'No', completeInBox: 'Yes' });
    const candidate = { title: 'The Legend of Zelda NES', completeInBox: 'Yes', sealed: false };
    expect(buildDeclaredIdentityReviews([candidate], target)).toEqual([]);
    const sealed = game({ sealed: 'Yes', completeInBox: 'Yes' });
    expect(buildDeclaredIdentityReviews([candidate], sealed)[0]?.verdict).toBe('mismatch');
    expect(buildDeclaredIdentityReviews([{ ...candidate, sealed: 'Yes' }], target)[0]?.verdict).toBe('mismatch');
  });
  it('meaningful numeric plus remains different while decimal and Video Game descriptive suffix formatting agree', () => {
    const target = game({ isGraded: 'Yes' }, { grade: '7.50', certificationCompany: 'PSA' });
    expect(row(scored(target, { title: 'The Legend of Zelda NES PSA 7.5', grade: '7.5' }), 'Grade').status).toBe('match');
    expect(row(scored(target, { title: 'The Legend of Zelda NES PSA 7.5+', grade: '7.5+' }), 'Grade').status).toBe('different');
    const parenthesized = game({ isGraded: 'Yes' }, { grade: '9.8', certificationCompany: 'CGC' });
    expect(row(scored(parenthesized, { title: 'The Legend of Zelda NES CGC Graded (9.8-A++)' }), 'Grade').titleDerivedStatus).toBe('match');
  });
  it('does not mutate source metadata during normalization and retains contrary title grade separately', () => {
    const target = game({ isGraded: 'Yes' }, { grade: '7.5', certificationCompany: 'PSA' });
    const candidate = { title: 'The Legend of Zelda NES PSA 8.5', grade: '7.50', grader: 'PSA', details: { platform: 'NES' } };
    const before = JSON.stringify(candidate);
    const output = scored(target, candidate);
    expect(JSON.stringify(candidate)).toBe(before);
    expect(row(output, 'Grade')).toMatchObject({ status: 'match', titleDerivedStatus: 'different',
      rankingContribution: { structured: true, titleDerived: false } });
  });
});

describe('Stage 4 real shared-filter full-population display ranking', () => {
  beforeEach(() => mockLLM.mockReset());
  it('hard-held top scores keep global rank without expanding the eligible review cap', async () => {
    const target = game({ releaseYear: '1987', region: 'NTSC-U', edition: 'Standard', sealed: 'Yes',
      completeInBox: 'Yes', upcEan: '012345678901', quantity: '1', isGraded: 'Yes' }, { grade: '7.5', certificationCompany: 'PSA' });
    const hard = { id: 'hard', title: 'The Legend of Zelda NES 1987 NTSC-U Standard Sealed PSA 7.5',
      details: { gameTitle: 'The Legend of Zelda', platform: 'NES', releaseYear: '1987', region: 'NTSC-U', edition: 'Standard',
        sealed: 'Yes', completeInBox: 'Yes', isGraded: 'Yes', upcEan: '012345678901' }, grade: '7.5', grader: 'PSA', quantity: 2 };
    const eligible = ['one', 'two', 'three'].map((id) => ({ id, title: 'The Legend of Zelda NES PSA 7.5',
      imageUrl: `https://example.com/${id}.jpg`, isGraded: 'Yes', grade: '7.5', grader: 'PSA' }));
    const result = await filterVisualSourceCandidates({ sourceRole: 'ebay', sourceLabel: 'eBay Sold-Comps',
      targetMetadata: target, listings: [hard, ...eligible] });
    const output = result.contextListings || [];
    expect(output.find((candidate: any) => candidate.id === 'hard')?.metadataMatchRank).toBe(1);
    expect(new Set(output.map((candidate: any) => candidate.metadataMatchRank)).size).toBe(4);
    expect(new Set(output.map((candidate: any) => candidate.metadataRanking?.populationId)).size).toBe(1);
    expect(output.filter((candidate: any) => candidate.visualRequirement === 'not_required_no_target_image')).toHaveLength(2);
    expect(mockLLM).not.toHaveBeenCalled();
  });
  it('same-title records keep their own score/awards/rank through no-target projections', async () => {
    const target = game({ isGraded: 'No' });
    const candidates = [
      { id: 'left', title: 'The Legend of Zelda NES', details: { gameTitle: 'The Legend of Zelda', platform: 'NES', isGraded: 'No' }, imageUrl: 'https://example.com/left.jpg' },
      { id: 'right', title: 'The Legend of Zelda NES', details: { gameTitle: 'The Legend of Zelda', platform: 'Unknown', isGraded: 'No' }, imageUrl: 'https://example.com/right.jpg' },
    ];
    const result = await filterVisualSourceCandidates({ sourceRole: 'ebay', sourceLabel: 'eBay Active', targetMetadata: target, listings: candidates });
    for (const candidate of result.contextListings || []) {
      const original = candidates.find((entry) => entry.id === candidate.id)!;
      expect(candidate.metadataMatchScore).toBe(videoGameGameVisualScore(original, target).score);
      expect(candidate.metadataScoreAwards).toEqual(videoGameGameVisualScore(original, target).awards);
    }
    expect(new Set(result.contextListings?.map((entry: any) => entry.metadataRanking?.occurrenceKey)).size).toBe(2);
  });
  it('unsupported Collection/Lot targets cannot preserve incoming fake rank or earned awards', async () => {
    const target = buildVisualTargetMetadata({ title: 'Mixed games', category: 'video_games', itemType: 'collection_lot' });
    const result = await filterVisualSourceCandidates({ sourceRole: 'ebay', sourceLabel: 'eBay Active', targetMetadata: target,
      listings: [{ id: 'unsupported', title: 'Mixed games', metadataMatchRank: 1, metadataMatchScore: 100, metadataScoreAwards: [{ field: 'grade', source: 'title', awardedPoints: 100 }] }] });
    const candidate: any = result.contextListings?.[0] || result.listings[0];
    expect(candidate.metadataMatchRank).toBeUndefined();
    expect(candidate.metadataMatchScore).toBeUndefined();
    expect(candidate.metadataScoreAwards || []).toEqual([]);
  });
});


describe('Stage 4 presentation compatibility and separate relevance-role exclusions', () => {
  it('retains legacy nested title/photos while never labeling them provider identity metadata', () => {
    const source = { details: JSON.stringify({ title: 'Zelda NES', imageUrl: 'https://example.test/nested.jpg', platform: 'NES' }) };
    const before = JSON.stringify(source);
    const candidate = normalizeVisualSourceCandidate(source);
    expect(candidate.title).toBe('Zelda NES');
    expect(candidate.imageUrls).toContain('https://example.test/nested.jpg');
    expect(candidate.details).not.toHaveProperty('title');
    expect(candidate.details).not.toHaveProperty('imageUrl');
    expect(JSON.stringify(source)).toBe(before);
  });
  it('Signed Item hard exclusions retain relevance ranking and metadata only, never visual or valuation admission', async () => {
    const target = buildVisualTargetMetadata({ title: 'Michael Jordan signed basketball', category: 'autographs', itemType: 'signed_item',
      fullItemDetails: { signer: 'Michael Jordan', signedItemType: 'basketball' } });
    const result = await filterVisualSourceCandidates({ sourceRole: 'ebay', sourceLabel: 'eBay Sold-Comps', targetMetadata: target,
      listings: [{ id: 'replica', title: 'Michael Jordan signed basketball facsimile replica', price: 50 }] });
    const held: any = result.contextListings?.find((candidate: any) => candidate.id === 'replica');
    expect(held).toBeDefined();
    expect(held.metadataRanking.scorerRole).toBe('signed_item_relevance');
    expect(held.metadataMatchLabel).toBe('Market Relevance Score');
    expect(held.metadataFieldComparisons.length).toBeGreaterThan(0);
    expect(held.valuationEligible).toBe(false);
    expect(held.hardException).toBe(true);
    expect(result.listings).toEqual([]);
    expect(result.reviewedCount).toBe(0);
  });
});

it('Stage 4 real visual gate keeps an opposing sibling grade despite matching primary grade and title', () => {
  const target = game({ isGraded: 'Yes' }, { grade: '7.5', certificationCompany: 'PSA' });
  const candidate = { title: 'The Legend of Zelda NES PSA 7.5', grade: '7.50', numericGrade: '8.5', grader: 'PSA' };
  const normalized = normalizeVisualSourceCandidate(candidate);
  expect(normalized.details.numericGrade).toBe('8.5');
  expect(buildDeclaredIdentityReviews([candidate], target)[0]?.verdict).toBe('mismatch');
  const comparison = scored(target, candidate);
  expect(row(comparison, 'Grade').status).toBe('match');
  expect(row(comparison, 'Numeric Grade') ?? row(comparison, 'Numeric grade')).toMatchObject({ candidateValue: '8.5' });
});

it('Stage 4 opposing structured numericGrade cannot borrow the primary Grade winning source highlight', () => {
  const target = game({ isGraded: 'Yes' }, { grade: '7.5', certificationCompany: 'PSA' });
  const output = scored(target, { title: 'The Legend of Zelda NES PSA 7.5', grade: '7.50', numericGrade: '8.5', grader: 'PSA' });
  expect(row(output, 'Grade')).toMatchObject({ candidateValue: '7.50', rankingContribution: { structured: true } });
  const sibling = row(output, 'Numeric Grade') ?? row(output, 'Numeric grade');
  expect(sibling).toMatchObject({ candidateValue: '8.5', rankingContribution: { structured: false } });
  expect(withMetadataFieldComparisons(target, output).metadataFieldComparisons).toEqual(output.metadataFieldComparisons);
});

it('Stage 4 comparisons and hard gates agree on meaningful Boolean No/false and Yes/true without inventing absent states', () => {
  const target = game({ sealed: 'No', completeInBox: 'Yes' });
  const candidate = { title: 'The Legend of Zelda NES', sealed: false, completeInBox: true };
  expect(buildDeclaredIdentityReviews([candidate], target)).toEqual([]);
  const output = scored(target, candidate);
  expect(row(output, 'Sealed')).toMatchObject({ candidateValue: 'false', status: 'match' });
  expect(row(output, 'Complete In Box')).toMatchObject({ candidateValue: 'true', status: 'match' });
  expect(row(scored(target, { title: 'The Legend of Zelda NES' }), 'Sealed').status).toBe('unknown');
});

it('Stage 4 Unknown grading-state aliases cannot mask meaningful nested raw state', () => {
  const target = game({ isGraded: 'Yes' }, { grade: '7.5', certificationCompany: 'PSA' });
  const raw = { title: 'The Legend of Zelda NES', isGraded: 'Unknown', details: { graded: false } };
  expect(buildDeclaredIdentityReviews([raw], target)[0]?.rationale).toContain('raw');
  expect(row(scored(target, raw), 'Is Graded')).toMatchObject({ candidateValue: 'false', status: 'different' });
  expect(buildDeclaredIdentityReviews([{ title: 'The Legend of Zelda NES', isGraded: 'Unknown' }], target)).toEqual([]);
});
