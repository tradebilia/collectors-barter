import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MetadataComparisonTable } from '../client/src/components/TestAiMetadataComparisonTable';
import { annotatePreVisualComparableScores, buildVisualTargetMetadata, moviesIndividualVisualScore, withMetadataFieldComparisons } from './testAiVisualSourceFilter';

const baseRow = { targetField: 'Accessory name', targetValue: 'Power Glove', candidateField: 'Accessory name',
  candidateValue: 'Generic Controller', titleDerivedValue: 'Power Glove (detected in title)', status: 'different', titleDerivedStatus: 'match' };
function cells(contribution?: any, row = baseRow): string[] {
  const html = renderToStaticMarkup(createElement(MetadataComparisonTable, { listing: { metadataFieldComparisons: [{ ...row, rankingContribution: contribution }] } }));
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';
  return [...body.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((match) => match[1]);
}

describe('Stage 4 actual metadata comparison table renders honest awarded sources', () => {
  it('title-only awards keep conflicting structured fields neutral and visible', () => {
    const rendered = cells({ matched: true, structured: false, titleDerived: true, awardedPoints: 25, sources: ['title'] });
    expect(rendered).toHaveLength(8);
    expect(rendered[0]).not.toContain('awarded points');
    expect(rendered[2]).not.toMatch(/bg-cyan|bg-sky|bg-violet|title=/);
    expect(rendered[3]).toContain('Generic Controller');
    expect(rendered[4]).toContain('bg-violet');
    expect(rendered[4]).toContain('title');
    expect(rendered[5]).toContain('25');
    expect(rendered[6]).toContain('25');
    expect(rendered[7]).toContain('match');
  });
  it('structured-only awards do not color title values merely because they also match', () => {
    const rendered = cells({ matched: true, structured: true, titleDerived: false, awardedPoints: 10, sources: ['structured'] });
    expect(rendered[2]).toContain('bg-cyan');
    expect(rendered[4]).not.toMatch(/bg-violet|bg-sky|title=/);
  });
  it('rule/combined awards highlight the score term without inventing either source', () => {
    for (const source of ['rule', 'combined']) {
      const rendered = cells({ matched: true, structured: false, titleDerived: false, awardedPoints: 5, sources: [source] });
      expect(rendered[0]).toContain('bg-sky');
      expect(rendered[0]).toContain(source);
      expect(rendered[2]).not.toMatch(/bg-cyan|bg-sky|bg-violet/);
      expect(rendered[4]).not.toMatch(/bg-violet|bg-sky|bg-cyan/);
    }
  });
  it('legacy absent or explicitly unawarded provenance makes no earned-source assertion', () => {
    for (const contribution of [undefined, { matched: false, structured: true, titleDerived: true }]) {
      const rendered = cells(contribution);
      expect(rendered[0]).not.toMatch(/bg-sky|bg-cyan|bg-violet/);
      expect(rendered[2]).not.toMatch(/bg-sky|bg-cyan|bg-violet/);
      expect(rendered[4]).not.toMatch(/bg-sky|bg-cyan|bg-violet/);
    }
  });
  it('keeps the six columns, details and legend without another exclusion panel', () => {
    const html = renderToStaticMarkup(createElement(MetadataComparisonTable, { listing: { metadataFieldComparisons: [baseRow] } }));
    expect([...html.matchAll(/<th\b/g)]).toHaveLength(8);
    expect(html).toContain('Potential Points');
    expect(html).toContain('Full metadata comparison');
    expect(html).toContain('Ranking highlight legend');
    expect(html).toContain('Title-derived scored field');
    expect(html).not.toContain('excluded before');
  });
  it('keeps the metadata dropdown with an honest missing-field notice', () => {
    const html = renderToStaticMarkup(createElement(MetadataComparisonTable, { listing: {} }));
    expect(html).toContain('Full metadata comparison');
    expect(html).toContain('No field comparison was returned');
    expect(html).not.toContain('<table');
  });
  it('renders Movie Title and generic Title aliases as one canonical row', () => {
    const target = buildVisualTargetMetadata({ title: 'Moonlighting Season 1&2', category: 'movies', itemType: 'individual_movie', fullItemDetails: { movieTitle: 'Moonlighting Season 1&2', title: 'Moonlighting Season 1&2' } });
    const rows = withMetadataFieldComparisons(target, { title: 'Moonlighting Season 1&2', movieTitle: 'Moonlighting Season 1&2', metadataScoreAwards: [{ field: 'movieTitle', source: 'title', awardedPoints: 30 }] }).metadataFieldComparisons ?? [];
    expect(rows.filter(row => ['movieTitle', 'title'].includes(row.fieldKey ?? '')).length).toBe(1);
    expect(rows.find(row => row.fieldKey === 'movieTitle')?.targetField).toBe('Movie title');
  });
  it('renders certification company, grading company, and grader as one canonical scored row', () => {
    const target = buildVisualTargetMetadata({ title: 'Canon VHS', category: 'movies', itemType: 'individual_movie', fullItemDetails: {
      format: 'VHS', isGraded: 'Yes', certificationCompany: 'CGC', grade: '8', gradingCompany: 'CGC',
    } });
    const candidate = { title: 'Canon CGC 8.0 VHS Tape', format: 'VHS' };
    const scored = moviesIndividualVisualScore(candidate, target);
    const output = withMetadataFieldComparisons(target, { ...candidate, metadataScoreAwards: scored.awards, metadataMatchScore: scored.score });
    const rows = output.metadataFieldComparisons ?? [];
    const companyRows = rows.filter(row => /^(?:certificationCompany|gradingCompany|grader)$/.test(row.fieldKey ?? ''));
    expect(companyRows).toHaveLength(1);
    expect(companyRows[0]).toMatchObject({ fieldKey: 'certificationCompany', targetValue: 'CGC', titleDerivedValue: 'CGC', titleDerivedStatus: 'match' });
    expect(companyRows[0].rankingContribution).toMatchObject({ matched: true, titleDerived: true, awardedPoints: 5 });
    const gradeRow = rows.find(row => row.fieldKey === 'grade');
    expect(gradeRow).toMatchObject({ titleDerivedValue: '8', titleDerivedStatus: 'match' });
    expect(gradeRow?.rankingContribution).toMatchObject({ matched: true, titleDerived: true, awardedPoints: 5 });
    expect(scored.score).toBe(55);
    expect(rows.reduce((total, row) => total + (row.rankingContribution?.awardedPoints ?? 0), 0)).toBe(55);
  });
  it('renders CGC 8 A as numeric 8 and awards the matching title-grade points', () => {
    const target = buildVisualTargetMetadata({ title: 'Canon CGC 8.0 VHS Tape', category: 'movies', itemType: 'individual_movie', fullItemDetails: {
      title: 'Canon CGC 8.0 VHS Tape', format: 'VHS', isGraded: 'Yes', certificationCompany: 'CGC', grade: '8',
    } });
    const candidate = { title: 'Canon CGC 8.0 A VHS Tape', format: 'VHS' };
    const scored = moviesIndividualVisualScore(candidate, target);
    const output = withMetadataFieldComparisons(target, { ...candidate, metadataScoreAwards: scored.awards, metadataMatchScore: scored.score });
    const titleRow = (output.metadataFieldComparisons ?? []).find(row => ['title', 'movieTitle'].includes(row.fieldKey ?? ''));
    expect(titleRow).toMatchObject({ rankingContribution: { matched: true, titleDerived: true, awardedPoints: 25 } });
    const gradeRow = (output.metadataFieldComparisons ?? []).find(row => row.fieldKey === 'grade');
    expect(gradeRow).toMatchObject({ titleDerivedValue: '8', titleDerivedStatus: 'match' });
    expect(gradeRow?.rankingContribution).toMatchObject({ matched: true, titleDerived: true, awardedPoints: 5 });
    expect(scored.score).toBe(55);
    expect((output.metadataFieldComparisons ?? []).reduce((total, row) => total + (row.rankingContribution?.awardedPoints ?? 0), 0)).toBe(55);
    const rendered = renderToStaticMarkup(createElement(MetadataComparisonTable, { listing: output }));
    expect(rendered).toContain('Movie title');
    expect(rendered).toMatch(/data-ranking-score="true">25<\/td>/);
    expect(rendered).toContain('data-ranking-score-total="true">55<');
  });
  it('attaches the Movie title award to a generic MATCH Title row for individual_movie', () => {
    const target = buildVisualTargetMetadata({ title: 'Canon CGC 8.0 VHS Tape', category: 'individual_movie', itemType: 'individual_movie', fullItemDetails: {
      title: 'Canon CGC 8.0 VHS Tape', format: 'VHS', grade: '8',
    } });
    const output = withMetadataFieldComparisons(target, {
      title: 'Canon CGC 8.0 A VHS Tape',
      metadataScoreAwards: [{ field: 'movieTitle', source: 'title', awardedPoints: 25,
        evidence: [{ field: 'title', source: 'title', value: 'Canon CGC 8.0 A VHS Tape' }] }],
      metadataFieldComparisons: [{ fieldKey: 'title', targetField: 'Title', targetValue: 'Canon CGC 8.0 VHS Tape',
        candidateField: 'Title', candidateValue: 'Canon CGC 8.0 A VHS Tape', titleDerivedValue: 'Canon CGC 8.0 A VHS Tape',
        titleDerivedStatus: 'match', status: 'match' }],
    });
    const titleRows = (output.metadataFieldComparisons ?? []).filter(row => ['title', 'movieTitle'].includes(row.fieldKey ?? ''));
    expect(titleRows).toHaveLength(1);
    expect(titleRows[0]).toMatchObject({ fieldKey: 'title', rankingContribution: { matched: true, titleDerived: true, awardedPoints: 25 } });
  });
  it('refreshes stale live Movie awards so a MATCH title cannot remain at Score 0', () => {
    const target = buildVisualTargetMetadata({ title: 'Conan CGC 8.0 VHS Tape', category: 'movies', itemType: 'individual_movie', fullItemDetails: {
      title: 'Conan CGC 8.0 VHS Tape', format: 'VHS', isGraded: 'Yes', certificationCompany: 'CGC', grade: '8',
    } });
    const staleAwards = [
      { field: 'format', source: 'title' as const, awardedPoints: 20 },
      { field: 'gradingCompany', source: 'title' as const, awardedPoints: 5 },
      { field: 'grade', source: 'title' as const, awardedPoints: 5 },
    ];
    const output = withMetadataFieldComparisons(target, {
      title: 'Conan CGC 8.0 A VHS Tape', format: 'VHS', metadataMatchScore: 30, metadataScoreAwards: staleAwards,
    });
    const titleRow = output.metadataFieldComparisons.find(row => row.targetField === 'Movie title');
    expect(output.metadataMatchScore).toBe(55);
    expect(output.metadataScoreAwards).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'movieTitle', awardedPoints: 25 })]));
    expect(titleRow?.rankingContribution).toMatchObject({ matched: true, titleDerived: true, awardedPoints: 25 });
  });

  it('scores the actual live Conan stored identity, not a substituted inventory listing title', () => {
    const target = buildVisualTargetMetadata({ title: 'Conan CGC 8.0 VHS Tape', category: 'movies', itemType: 'individual_movie',
      grade: '8', certificationCompany: 'CGC', condition: 'mint', itemDetails: JSON.stringify({
        certificationNumber: '1004068009', format: 'VHS', isGraded: 'yes', quantity: '1', releaseYear: '1991',
        sealed: 'yes', shippingAvailable: 'yes', title: 'Conan The Destroyer', year: '1991',
      }) });
    const candidate = { title: 'Conan CGC 8.0 A VHS Tape' };
    const scored = moviesIndividualVisualScore(candidate, target);
    expect(scored.awards.find(award => award.field === 'movieTitle')?.awardedPoints).toBe(25);
    expect(scored.score).toBe(55);
    const output = withMetadataFieldComparisons(target, { ...candidate, metadataMatchScore: scored.score, metadataScoreAwards: scored.awards });
    const identityRows = output.metadataFieldComparisons.filter(row => row.targetField === 'Movie title');
    expect(identityRows).toHaveLength(1);
    expect(identityRows[0]).toMatchObject({ targetValue: 'Conan The Destroyer', candidateValue: candidate.title,
      titleDerivedStatus: 'match', rankingContribution: { awardedPoints: 25 } });
    const potentialTotal = output.metadataFieldComparisons.reduce((total, row) => total + (row.rankingContribution?.potentialPoints ?? 0), 0);
    expect(potentialTotal).toBe(100);
    expect(output.metadataFieldComparisons.find(row => row.fieldKey === 'edition')).toMatchObject({ targetValue: 'Unknown', rankingContribution: { potentialPoints: 15 } });
    expect(output.metadataFieldComparisons.find(row => row.fieldKey === 'region')).toMatchObject({ targetValue: 'Unknown', rankingContribution: { potentialPoints: 10 } });
    const rendered = renderToStaticMarkup(createElement(MetadataComparisonTable, { listing: output }));
    expect(rendered).toMatch(/data-ranking-score="true">25<\/td>/);
    expect(rendered).toContain('data-ranking-score-total="true">55<');
    expect(rendered).toContain('potential 100/100');
    for (const title of ['Conan The Barbarian CGC 8.0 A VHS Tape', 'Rambo CGC 8.0 A VHS Tape']) {
      expect(moviesIndividualVisualScore({ title }, target).awards.some(award => award.field === 'movieTitle')).toBe(false);
    }
  });
});


describe('actual scorer → refreshed comparison → rendered component', () => {
  function renderedRows(listing: any): string[][] {
    const html = renderToStaticMarkup(createElement(MetadataComparisonTable, { listing }));
    const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';
    return [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
      [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cell[1]));
  }
  it('renders only the actual winning Grade source, never a conflicting sibling alias', () => {
    const target = buildVisualTargetMetadata({ title: 'The Legend of Zelda NES PSA 7.5', category: 'video_games', itemType: 'game', grade: '7.5', certificationCompany: 'PSA', fullItemDetails: { gameTitle: 'The Legend of Zelda', platform: 'NES', isGraded: 'Yes' } });
    const candidate = { title: 'The Legend of Zelda NES PSA 7.5', grade: '7.50', numericGrade: '8.5', grader: 'PSA' };
    const annotated = annotatePreVisualComparableScores([candidate], target)[0];
    const output = withMetadataFieldComparisons(target, annotated);
    const rows = output.metadataFieldComparisons!;
    const cellsByRow = renderedRows(output);
    const gradeIndex = rows.findIndex((row) => row.fieldKey === 'grade');
    const siblingIndex = rows.findIndex((row) => row.fieldKey === 'numericGrade');
    expect(gradeIndex).toBeGreaterThanOrEqual(0);
    expect(siblingIndex).toBeGreaterThanOrEqual(0);
    expect(cellsByRow[gradeIndex]).toHaveLength(8);
    expect(cellsByRow[gradeIndex][2]).toContain('bg-cyan');
    expect(cellsByRow[gradeIndex][3]).toContain('7.50');
    expect(cellsByRow[siblingIndex][2]).not.toMatch(/bg-cyan|bg-violet/);
    expect(cellsByRow[siblingIndex][3]).toContain('8.5');
    expect(cellsByRow[gradeIndex][5]).toContain('5');
    expect(cellsByRow[gradeIndex][6]).toContain('5');
    expect(cellsByRow[siblingIndex][5]).toContain('5');
    expect(cellsByRow[siblingIndex][6]).toContain('0');
    expect(cellsByRow[gradeIndex][7]).toContain('match');
    expect(withMetadataFieldComparisons(target, output).metadataFieldComparisons).toEqual(rows);
  });
  it('renders actual title-first Accessory points without coloring contradictory structured metadata', () => {
    const target = buildVisualTargetMetadata({ title: 'Power Glove NES Controller', category: 'video_games', itemType: 'accessory', fullItemDetails: { accessoryName: 'Power Glove', accessoryType: 'controller', platform: 'NES', manufacturer: 'PAX' } });
    const annotated = annotatePreVisualComparableScores([{ title: 'PAX Power Glove NES Controller', accessoryName: 'Generic Controller' }], target)[0];
    const output = withMetadataFieldComparisons(target, annotated);
    const index = output.metadataFieldComparisons!.findIndex((row) => row.fieldKey === 'accessoryName');
    expect(index).toBeGreaterThanOrEqual(0);
    const rendered = renderedRows(output)[index];
    expect(rendered[0]).not.toContain('awarded points');
    expect(rendered[2]).not.toMatch(/bg-cyan|bg-violet/);
    expect(rendered[3]).toContain('Generic Controller');
    expect(rendered[4]).toContain('bg-violet');
    expect(rendered[4]).toContain('Power Glove');
  });
});
