import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MetadataComparisonTable } from '../client/src/components/TestAiMetadataComparisonTable';
import { annotatePreVisualComparableScores, buildVisualTargetMetadata, withMetadataFieldComparisons } from './testAiVisualSourceFilter';

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
  it('does not append a second synthetic marketplace-title row', () => {
    const target = buildVisualTargetMetadata({ title: 'Moonlighting Season 1&2', category: 'movies', itemType: 'box_set', fullItemDetails: { boxSetName: 'Moonlighting Season 1&2' } });
    const rows = withMetadataFieldComparisons(target, { title: 'Moonlighting Season 1&2', metadataScoreAwards: [{ field: 'boxSetName', source: 'title', awardedPoints: 30 }] }).metadataFieldComparisons ?? [];
    expect(rows.filter(row => /box set name/i.test(row.targetField)).length).toBe(1);
    expect(rows.some(row => row.targetField === 'Target listing title')).toBe(false);
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
