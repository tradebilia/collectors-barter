import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TestAiEvidenceReview, evidenceReviewCandidates } from '../client/src/components/test-ai/TestAiEvidenceReview';
import { MetadataComparisonTable, TestAiVisualComparison } from '../client/src/components/TestAiMetadataComparisonTable';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
const item = { id: 1, title: 'Target LaserDisc', category: 'movies', itemType: 'individual_movie' };
const summary = normalizeTestAiEvidence(item, []);
const review = (sources: any[]) => renderToStaticMarkup(createElement(TestAiEvidenceReview, { item, side: 'left', summary, sources }));
const receipt = { version: 1, state: 'completed', reasonCode: 'review_returned', hardExclusion: false, selectedForReview: true, identity: { origin: 'visual', result: 'mismatch', reviewVerdict: 'mismatch' }, attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }] };
describe('Evidence Review is the complete candidate decision view', () => {
  it('renders candidates from raw retained records even when no analyzer records exist', () => {
    const html = review([{ id: 'mercari_sold_comps', label: 'Mercari Sold', packet: { listings: [{ title: 'Visible rejected candidate', evidenceDisposition: 'rejected_objective_conflict', evidenceReasons: ['Wrong format: DVD versus LaserDisc'] }] } }]);
    expect(html).toContain('Visible rejected candidate'); expect(html).toContain('Wrong format: DVD versus LaserDisc');
    expect(html).toContain('Evidence Review — candidate decisions'); expect(html).toContain('Target item'); expect(html).not.toContain('AI Field Completion');
  });
  it('retains raw, pre-vision excluded, visual and context records without narrowing to matches', () => {
    const candidates = evidenceReviewCandidates({ id: 'sold_comps', label: 'eBay Sold', packet: { listings: [{ title: 'Primary row' }], preVisionExcludedListings: [{ title: 'Excluded row' }], visualReviewListings: [{ title: 'Visual row' }], context: [{ title: 'Context row' }] } });
    expect(candidates.map(row => row.title)).toEqual(expect.arrayContaining(['Primary row', 'Excluded row', 'Visual row', 'Context row'])); expect(candidates).toHaveLength(4);
  });
  it('retains specialist sales, context and nested auction records', () => {
    const rows = evidenceReviewCandidates({ id: 'goldin', label: 'Goldin', packet: { sales: [{ title: 'Sale' }], context: [{ title: 'Context' }], data: { auctions: [{ title: 'Auction' }] } } });
    expect(rows.map(row => row.title)).toEqual(expect.arrayContaining(['Sale', 'Context', 'Auction']));
  });
  it('does not collapse same-title independent rows into one', () => {
    expect(evidenceReviewCandidates({ id: 'mercari_sold_comps', label: 'Mercari', packet: { listings: [{ title: 'Same', price: 11 }, { title: 'Same', price: 11 }] } })).toHaveLength(2);
  });
  it('does not display source-stage eligibility as actual valuation use', () => {
    const html = review([{ id: 'sold_comps', label: 'eBay Sold', packet: { listings: [{ title: 'Eligible', evidenceDisposition: 'valuation_eligible' }] } }]);
    expect(html).toContain('VALUATION NOT RUN'); expect(html).not.toContain('USED IN VALUATION'); expect(html).toContain('Final valuation analysis has not run yet; current valuation counts are 0.');
  });
  it('shows an explicit no-record state and source failure instead of a blank page', () => {
    const html = review([{ id: 'sold_comps', label: 'eBay Sold', status: 'error', message: 'Provider failed' }]);
    expect(html).toContain('No candidate records are available yet'); expect(html).toContain('Request failed'); expect(html).toContain('Provider failed'); expect(html).not.toContain('zero marketplace matches');
  });
  it('shows the failure reason once in Source Results, not buried in a closed dropdown', () => {
    const message = 'The source request was not sent because it exceeded the client request-size limit.';
    const html = review([{ id: 'mercari_sold_comps', label: 'Mercari Sold', status: 'error', message }]);
    expect(html.split(message)).toHaveLength(2);
    expect(html.indexOf(message)).toBeGreaterThan(html.indexOf('Source results'));
    expect(html.indexOf(message)).toBeLessThan(html.indexOf('Evidence diagnostics'));
  });
  it('keeps source diagnostics collapsed by default', () => {
    const html = review([]); expect(html).toContain('Evidence diagnostics'); expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
  });
  it('actually replaces the old Evidence Review render path and mounts old source panels behind a closed audit', () => {
    const page = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');
    expect(page).toContain('<TestAiEvidenceReview item={item}'); expect(page).toContain('Source and technical audit — queries, retrieval and provider details');
    expect(page).not.toContain('P0 evidence sufficiency ·'); expect(page).not.toContain('Source-stage treatment of selected sources');
    expect(page).not.toContain('function FieldCompletionPanel'); expect(page).not.toContain('<FieldCompletionPanel');
    expect(page).toContain('onSummaryChange?.(summary)'); expect(page).toContain('onCandidatePacket?.(source.id, data)');
    expect(page).toContain('Discogs reference selection');
  });
});
describe('Metadata and visual evidence are separate expandable sections', () => {
  it('keeps the metadata dropdown visible even when no fields were returned', () => {
    const html = renderToStaticMarkup(createElement(MetadataComparisonTable, { listing: {} }));
    expect(html).toContain('Full metadata comparison'); expect(html).toContain('No field comparison was returned');
  });
  it('keeps the full six-column table while showing specific target/candidate visual observations below it', () => {
    const listing = { visualExecution: receipt, metadataFieldComparisons: [{ targetField: 'Format', targetValue: 'LaserDisc', candidateField: 'Format', candidateValue: 'DVD', titleDerivedValue: 'DVD', status: 'different' }], visualDifferences: [{ field: 'Disc format', targetObservation: 'LaserDisc sleeve', candidateObservation: 'DVD case', impact: 'Different physical format' }] };
    const metadata = renderToStaticMarkup(createElement(MetadataComparisonTable, { listing }));
    const visual = renderToStaticMarkup(createElement(TestAiVisualComparison, { listing }));
    expect((metadata.match(/<th /g) ?? []).length).toBe(6); expect(metadata).not.toContain('Visual comparison');
    expect(visual).toContain('Visual comparison'); expect(visual).toContain('LaserDisc sleeve'); expect(visual).toContain('DVD case'); expect(visual).not.toContain('Scored field');
  });
  it('does not claim a visual match or show stale differences when no visual response exists', () => {
    const html = renderToStaticMarkup(createElement(TestAiVisualComparison, { listing: { visualDifferences: [{ field: 'STALE', targetObservation: 'STALE OBSERVATION' }] } }));
    expect(html).toContain('No completed visual comparison'); expect(html).not.toContain('STALE'); expect(html).not.toContain('Visual match');
  });
  it('does not invent detailed differences for a vague mismatch', () => {
    const html = renderToStaticMarkup(createElement(TestAiVisualComparison, { listing: { visualExecution: receipt, visualReviewRationale: 'Different product somehow' } }));
    expect(html).toContain('did not record specific visual differences'); expect(html).not.toContain('Different product somehow');
  });
});
