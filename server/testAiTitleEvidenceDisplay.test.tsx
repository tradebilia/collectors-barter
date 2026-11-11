import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// These fixtures are pure. Any accidental model call must fail rather than reach
// a live provider. Parent must run with an isolated config and no live test setup.
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('TITLE_DISPLAY_TEST_MUST_NOT_CALL_MODEL'); }) }));
import { invokeLLM } from './_core/llm';
import {
  buildMetadataFieldComparisons, buildVisualTargetMetadata, moviesBoxSetVisualScore,
  moviesIndividualVisualScore, videoGameAccessoryVisualScore, videoGameGameVisualScore, vintageToyVisualScore, withMetadataFieldComparisons,
  type MetadataFieldComparison, type VisualSourceCandidate,
} from './testAiVisualSourceFilter';
import {
  MetadataComparisonTable, metadataSelectedScoringEvidence,
} from '../client/src/components/TestAiMetadataComparisonTable';
import type { RankingAward } from '../shared/testAiRankingAwards';

const screenshotTitle = 'Moonlighting: Seasons One and Two Used DVD 1985 TV Bruce Willis Free USA Ship';
function movieTarget(extra: Record<string, unknown> = {}) {
  return buildVisualTargetMetadata({ title: 'Moonlighting Season 1&2', category: 'movies', itemType: 'box_set',
    fullItemDetails: { boxSetName: 'Moonlighting Season 1&2', format: 'DVD', numberOfMovies: 2, sealed: 'no', ...extra } });
}
function gameTarget(details: Record<string, unknown> = {}, top: Record<string, unknown> = {}) {
  return buildVisualTargetMetadata({ title: 'The Legend of Zelda NES', category: 'video_games', itemType: 'game',
    fullItemDetails: { gameTitle: 'The Legend of Zelda', platform: 'NES', ...details }, ...top });
}
function row(rows: MetadataFieldComparison[], key: string): MetadataFieldComparison {
  const found = rows.find(entry => entry.fieldKey === key);
  expect(found, `comparison row ${key}`).toBeDefined();
  return found!;
}
function cells(comparison: MetadataFieldComparison): string[] {
  const html = renderToStaticMarkup(createElement(MetadataComparisonTable, {
    listing: { metadataFieldComparisons: [comparison] },
  }));
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? '';
  return [...body.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(match => match[1]);
}
function visible(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function movieRows(candidate: VisualSourceCandidate, target = movieTarget()) {
  const score = moviesBoxSetVisualScore(candidate, target);
  const listing = { ...candidate, metadataMatchScore: score.score, metadataScoreAwards: score.awards };
  return { score, listing, rows: buildMetadataFieldComparisons(target, listing) };
}

describe('title evidence transparency: screenshot scorer and real rendered witnesses', () => {
  it('keeps the screenshot score 75 and all four exact selected awards, visibly, without filling structured Unknowns', () => {
    const candidate = { title: screenshotTitle };
    const before = JSON.stringify(candidate);
    const { score, listing, rows } = movieRows(candidate);
    expect(score.score).toBe(75);
    expect(score.awards).toEqual([
      { field: 'boxSetName', source: 'title', awardedPoints: 30, evidence: [{ field: 'title', source: 'title', value: screenshotTitle }] },
      { field: 'format', source: 'title', awardedPoints: 20, evidence: [{ field: 'format', source: 'title', value: 'DVD' }] },
      { field: 'numberOfMovies', source: 'title', awardedPoints: 15, evidence: [{ field: 'numberOfMovies', source: 'title', value: '2' }] },
      { field: 'sealed', source: 'title', awardedPoints: 10, evidence: [{ field: 'sealed', source: 'title', value: 'Used' }] },
    ]);
    for (const award of score.awards) {
      const comparison = row(rows, award.field);
      expect(comparison).toMatchObject({ candidateValue: 'Unknown', titleDerivedStatus: 'match',
        rankingContribution: { matched: true, awardedPoints: award.awardedPoints, sources: ['title'] } });
      expect(comparison.status).toBe(award.field === 'boxSetName' ? 'match' : 'unknown');
      expect(comparison.rankingContribution?.scoringEvidence).toEqual([{
        awardField: award.field, source: award.source, awardedPoints: award.awardedPoints,
        shared: false, evidence: award.evidence,
      }]);
      const rendered = cells(comparison);
      expect(rendered).toHaveLength(8);
      expect(visible(rendered[0])).not.toContain('awarded points');
      expect(visible(rendered[3])).toBe('Unknown');
      expect(visible(rendered[4])).toContain('Title evidence');
      expect(visible(rendered[4])).toContain(`${award.evidence![0].field}: ${award.evidence![0].value}`);
      expect(visible(rendered[4])).toContain('Recorded scoring witness, not a structured or extracted field value');
      expect(visible(rendered[5])).toBe(String(award.awardedPoints));
      expect(visible(rendered[6])).toBe(String(award.awardedPoints));
      expect(visible(rendered[7])).toBe('match');
    }
    expect(row(rows, 'boxSetName')).toMatchObject({ titleDerivedValue: 'Moonlighting', titleDerivedStatus: 'match' });
    expect(row(rows, 'numberOfMovies')).toMatchObject({ titleDerivedValue: '2', titleDerivedStatus: 'match' });
    expect(row(rows, 'sealed')).toMatchObject({ titleDerivedValue: 'No (inferred from title)', titleDerivedStatus: 'match' });
    const projected = withMetadataFieldComparisons(movieTarget(), listing);
    expect(projected.metadataMatchScore).toBe(75);
    expect(projected.metadataScoreAwards).toEqual(score.awards);
    expect(withMetadataFieldComparisons(movieTarget(), projected).metadataFieldComparisons).toEqual(projected.metadataFieldComparisons);
    expect(JSON.stringify(candidate)).toBe(before);
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it('captures title-derived Movie Edition and CGC numeric grade awards instead of showing MATCH with zero points', () => {
    const target = buildVisualTargetMetadata({ title: 'Pulp Fiction', category: 'movies', itemType: 'individual_movie',
      grade: '9.6', certificationCompany: 'CGC', fullItemDetails: {
        movieTitle: 'Pulp Fiction', format: 'VHS', edition: 'Collectors Edition', isGraded: 'yes', sealed: 'yes',
      } });
    const candidate = { title: 'Pulp Fiction VHS Special Collector’s Edition 1994 CGC Graded 9.6 A+ Seal' };
    const score = moviesIndividualVisualScore(candidate, target);
    expect(score.score).toBe(75);
    expect(score.awards).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'edition', source: 'title', awardedPoints: 15 }),
      expect.objectContaining({ field: 'gradingCompany', source: 'title', awardedPoints: 5 }),
      expect.objectContaining({ field: 'grade', source: 'title', awardedPoints: 5 }),
    ]));
    const rows = buildMetadataFieldComparisons(target, { ...candidate, metadataScoreAwards: score.awards });
    expect(row(rows, 'edition')).toMatchObject({ titleDerivedValue: 'Collectors Edition (detected in title)', titleDerivedStatus: 'match', rankingContribution: { awardedPoints: 15 } });
    expect(row(rows, 'grade')).toMatchObject({ titleDerivedValue: '9.6', titleDerivedStatus: 'match', rankingContribution: { awardedPoints: 5 } });
    const projected = withMetadataFieldComparisons(target, { ...candidate, metadataMatchScore: score.score, metadataScoreAwards: score.awards });
    expect(projected.metadataMatchScore).toBe(75);
    expect(projected.metadataScoreAwards).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'edition', awardedPoints: 15 }),
      expect.objectContaining({ field: 'grade', awardedPoints: 5 }),
    ]));
  });

  it('preserves structured conflicts and independent title parsing instead of rescuing them with title awards', () => {
    const { score, rows } = movieRows({ title: screenshotTitle,
      fullItemDetails: { boxSetName: 'Different Show', format: 'VHS', numberOfMovies: 3, sealed: 'yes' } });
    for (const key of ['boxSetName', 'format', 'numberOfMovies', 'sealed']) {
      const comparison = row(rows, key);
      expect(comparison.status).toBe('different');
      expect(comparison.rankingContribution?.matched).toBe(false);
      expect(comparison.rankingContribution?.scoringEvidence).toEqual([]);
      expect(cells(comparison)[4]).not.toContain('data-selected-scoring-evidence');
    }
    expect(row(rows, 'format')).toMatchObject({ candidateValue: 'VHS', titleDerivedValue: 'DVD (detected in title)', titleDerivedStatus: 'match' });
    expect(score.awards).toEqual([]);
  });

  it('shows a title-selected identity award without replacing a contradictory structured identity', () => {
    const target = buildVisualTargetMetadata({ title: 'Power Glove NES Controller', category: 'video_games', itemType: 'accessory',
      fullItemDetails: { accessoryName: 'Power Glove' } });
    const candidate = { title: 'PAX Power Glove NES Controller', accessoryName: 'Generic Controller' };
    const score = videoGameAccessoryVisualScore(candidate, target);
    expect(score.awards).toContainEqual({ field: 'accessoryName', source: 'title', awardedPoints: 25,
      evidence: [{ field: 'accessoryName', source: 'title', value: candidate.title }] });
    const listing = { ...candidate, metadataScoreAwards: score.awards };
    const comparison = row(buildMetadataFieldComparisons(target, listing), 'accessoryName');
    expect(comparison).toMatchObject({ candidateValue: 'Generic Controller', status: 'different',
      rankingContribution: { matched: true, structured: false } });
    const rendered = cells(comparison);
    expect(visible(rendered[3])).toBe('Generic Controller');
    expect(rendered[2]).not.toContain('bg-cyan');
    expect(visible(rendered[4])).toContain('accessoryName: PAX Power Glove NES Controller');
  });

  it('does not invent quantity, grade, shipping, economics or arbitrary fields from target echoes and absence', () => {
    const target = movieTarget({ quantity: 2, grade: '2', professionalGrade: '2', shipping: 'Free USA Ship',
      shippingCost: 'Free', currency: 'USA', randomFlag: 'Used' });
    const rows = buildMetadataFieldComparisons(target, { title: screenshotTitle });
    for (const key of ['quantity', 'grade', 'professionalGrade', 'shipping', 'shippingCost', 'randomFlag']) {
      expect(row(rows, key)).toMatchObject({ candidateValue: 'Unknown', titleDerivedValue: 'Unknown',
        status: 'unknown', titleDerivedStatus: 'unknown', rankingContribution: { matched: false } });
    }
    const absent = movieRows({ title: 'Moonlighting' }, movieTarget({ boxSetName: 'Moonlighting' }));
    for (const key of ['format', 'numberOfMovies', 'sealed']) {
      expect(row(absent.rows, key)).toMatchObject({ candidateValue: 'Unknown', titleDerivedValue: 'Unknown',
        rankingContribution: { matched: false, scoringEvidence: [] } });
    }
  });

  it('displays the selected witness, not an arbitrary title or a matching unselected alias', () => {
    const target = gameTarget({ isGraded: 'Yes' }, { grade: '7.5', certificationCompany: 'PSA' });
    const candidate = { title: 'The Legend of Zelda NES PSA 8.5', grade: '7.50', numericGrade: '8.5', grader: 'PSA' };
    const score = videoGameGameVisualScore(candidate, target);
    const rows = buildMetadataFieldComparisons(target, { ...candidate, metadataScoreAwards: score.awards });
    const primary = row(rows, 'grade');
    expect(primary).toMatchObject({ candidateValue: '7.50', status: 'match', titleDerivedValue: '8.5', titleDerivedStatus: 'different',
      rankingContribution: { structured: true, titleDerived: false } });
    expect(primary.rankingContribution?.scoringEvidence?.[0].evidence).toEqual([{ field: 'grade', source: 'structured', value: '7.50' }]);
    const rendered = cells(primary);
    expect(visible(rendered[4])).toContain('8.5');
    expect(visible(rendered[4])).not.toContain('Independent title parse');
    expect(visible(rendered[4])).toContain('Structured evidence · grade: 7.50');
    expect(visible(rendered[4])).not.toContain(candidate.title);
    expect(rendered[4]).not.toContain('bg-violet');
    // The independent alias has no target value; do not manufacture a conflict.
    expect(row(rows, 'numericGrade')).toMatchObject({ targetValue: 'Unknown', candidateValue: '8.5', status: 'unknown', rankingContribution: { structured: false } });
  });

  it('retains the recorded title witness even if the current independent title source differs', () => {
    const selected = 'Moonlighting: Seasons One and Two Used DVD';
    const rows = buildMetadataFieldComparisons(movieTarget(), { title: 'Unselected title VHS 1999', metadataScoreAwards: [
      { field: 'boxSetName', source: 'title', awardedPoints: 30, evidence: [{ field: 'title', source: 'title', value: selected }] },
    ] });
    const comparison = row(rows, 'boxSetName');
    expect(comparison.titleDerivedValue).toBe('Unknown');
    expect(visible(cells(comparison)[4])).toContain(`title: ${selected}`);
    expect(visible(cells(comparison)[4])).not.toContain('Unselected title');
  });

  it('keeps a selected structured count alias visible without calling it a structured numberOfMovies value', () => {
    const { score, rows } = movieRows({ title: screenshotTitle, fullItemDetails: { quantity: 2 } });
    expect(score.awards).toContainEqual({ field: 'numberOfMovies', source: 'structured', awardedPoints: 15,
      evidence: [{ field: 'quantity', source: 'structured', value: '2' }] });
    const comparison = row(rows, 'numberOfMovies');
    expect(comparison).toMatchObject({ candidateValue: 'Unknown', status: 'unknown',
      rankingContribution: { matched: true, structured: false, awardedPoints: 15 } });
    const rendered = cells(comparison);
    expect(visible(rendered[3])).toBe('Unknown');
    expect(visible(rendered[4])).toContain('Structured evidence · quantity: 2');
    expect(rendered[2]).not.toContain('bg-cyan');
  });
});

describe('rule/composite provenance and grading/CIB/Board Game protections', () => {
  it.each(['rule', 'combined'] as const)('visibly explains a %s award with no field witness and no inferred value', source => {
    const listing = { title: 'Moonlighting', metadataScoreAwards: [{ field: 'productForm', source, awardedPoints: 5 }] };
    const comparison = row(buildMetadataFieldComparisons(movieTarget(), listing), 'productForm');
    expect(comparison).toMatchObject({ candidateValue: 'Unknown', titleDerivedValue: 'Unknown', status: 'unknown',
      rankingContribution: { matched: true, structured: false, titleDerived: false, awardedPoints: 5 } });
    const rendered = cells(comparison);
    expect(visible(rendered[0])).not.toContain('awarded points');
    expect(visible(rendered[4])).toContain(`Rule/combined scoring evidence (${source})`);
    expect(visible(rendered[4])).toContain('No field value recorded');
    expect(rendered[2]).not.toContain('bg-cyan');
    expect(rendered[4]).not.toContain('bg-violet');
  });

  it('keeps every awarded term visible even after the normal 40-row display limit', () => {
    const details = Object.fromEntries(Array.from({ length: 45 }, (_, index) => [`unscored${index}`, 'Unknown']));
    const target = movieTarget(details);
    const candidate = { title: 'Moonlighting', metadataScoreAwards: [{ field: 'productForm', source: 'rule', awardedPoints: 5 }] as RankingAward[] };
    for (const rows of [buildMetadataFieldComparisons(target, candidate), withMetadataFieldComparisons(target, candidate).metadataFieldComparisons]) {
      expect(rows).toHaveLength(40);
      expect(row(rows, 'productForm').rankingContribution?.awardedPoints).toBe(5);
    }
  });

  it('shows composite child evidence only for that child, labeling points shared rather than additional', () => {
    const target = movieTarget({ grade: '9.8', gradingCompany: 'CGC' });
    const rows = buildMetadataFieldComparisons(target, { title: 'Moonlighting CGC 9.8', metadataScoreAwards: [
      { field: 'gradingDetails', source: 'title', awardedPoints: 10, evidence: [
        { field: 'grade', source: 'title', value: '9.8' }, { field: 'gradingCompany', source: 'title', value: 'CGC' },
      ] },
    ] });
    expect(row(rows, 'grade').rankingContribution?.scoringEvidence).toEqual([{
      awardField: 'gradingDetails', source: 'title', awardedPoints: 10, shared: true,
      evidence: [{ field: 'grade', source: 'title', value: '9.8' }],
    }]);
    expect(visible(cells(row(rows, 'grade'))[4])).toContain('shared scoring term');
    expect(row(rows, 'gradingDetails').rankingContribution?.scoringEvidence?.[0].evidence).toHaveLength(2);
  });

  it('an Is Graded witness never creates numeric Grade or grader awards', () => {
    const target = gameTarget({ isGraded: 'No' });
    const candidate = { title: 'The Legend of Zelda NES ungraded' };
    const score = videoGameGameVisualScore(candidate, target);
    const rows = buildMetadataFieldComparisons(target, { ...candidate, metadataScoreAwards: score.awards });
    const state = row(rows, 'isGraded');
    expect(state.rankingContribution?.matched).toBe(true);
    expect(visible(cells(state)[4])).toContain('ungraded');
    for (const key of ['grade', 'certificationCompany']) {
      expect(row(rows, key)).toMatchObject({ candidateValue: 'Unknown', titleDerivedValue: 'Unknown', rankingContribution: { matched: false } });
    }
    const conflicted = buildMetadataFieldComparisons(target, { title: 'The Legend of Zelda NES PSA 7.5', isGraded: false });
    expect(row(conflicted, 'isGraded').candidateValue).toContain('Conflicted');
    expect(row(conflicted, 'isGraded').titleDerivedStatus).toBe('unknown');
  });

  it('CIB evidence stays separate from sealed and missing numeric grade', () => {
    const target = gameTarget({ completeInBox: 'Yes', sealed: 'No' });
    const rows = buildMetadataFieldComparisons(target, { title: 'The Legend of Zelda NES CIB' });
    expect(row(rows, 'completeInBox')).toMatchObject({ candidateValue: 'Unknown', titleDerivedValue: 'Yes (inferred from title)', titleDerivedStatus: 'match' });
    for (const key of ['sealed', 'grade']) {
      expect(row(rows, key)).toMatchObject({ candidateValue: 'Unknown', titleDerivedValue: 'Unknown', titleDerivedStatus: 'unknown' });
    }
  });

  it('keeps Board Game year Unknown while showing the actual scored piece-count witness', () => {
    const target = buildVisualTargetMetadata({ title: 'Puzzle', category: 'vintage_toys', itemType: 'board_game___puzzle',
      fullItemDetails: { gamePuzzleName: 'Puzzle', numberOfPieces: '100', year: '2000' } });
    const candidate = { title: 'Puzzle 100 pieces 2000' };
    const score = vintageToyVisualScore(candidate, target);
    const rows = buildMetadataFieldComparisons(target, { ...candidate, metadataScoreAwards: score.awards });
    expect(row(rows, 'year')).toMatchObject({ candidateValue: 'Unknown', titleDerivedValue: 'Unknown',
      status: 'unknown', titleDerivedStatus: 'unknown', rankingContribution: { matched: false } });
    const pieces = row(rows, 'numberOfPieces');
    expect(pieces.rankingContribution?.matched).toBe(true);
    expect(visible(cells(pieces)[4])).toContain('Title evidence');
    expect(score.awards.some(award => award.field === 'year')).toBe(false);
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it('never manufactures selected evidence from legacy reasons, hints or a non-award', () => {
    expect(metadataSelectedScoringEvidence({ matched: true, titleDerived: true, reasons: ['title'], awardedPoints: 30 })).toEqual([]);
    expect(metadataSelectedScoringEvidence({ matched: false, awards: [{ field: 'title', source: 'title', awardedPoints: 30,
      evidence: [{ field: 'title', source: 'title', value: screenshotTitle }] }] })).toEqual([]);
    expect(metadataSelectedScoringEvidence({ matched: true, awards: [{ field: 'sealed', source: 'title', awardedPoints: 10,
      evidence: [{ field: 'sealed', source: 'title', value: 'Used' }] }] })).toEqual([
      { awardField: 'sealed', source: 'title', awardedPoints: 10, evidence: [{ field: 'sealed', source: 'title', value: 'Used' }] },
    ]);
  });
});
