import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TestAiVisualDifferenceList } from '../client/src/components/TestAiCandidateStatus';
import type { VisualExecution } from '../shared/testAiVisualExecution';

const differences = [{ field: 'packaging', targetObservation: 'clear outer edge', candidateObservation: 'black keep-case border', impact: 'secondary presentation differs' }];
const receipt = (identity: VisualExecution['identity']): VisualExecution => ({
  version: 1, state: 'completed', reasonCode: 'review_returned', selectedForReview: true, hardExclusion: false,
  identity, attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }],
});
const render = (listing: any) => renderToStaticMarkup(<TestAiVisualDifferenceList listing={{ ...listing, visualDifferences: differences }} />);

describe('observed visual differences SSR presentation', () => {
  it('uses neutral observed treatment for an actual match with soft packaging differences', () => {
    const html = render({ visualExecution: receipt({ origin: 'visual', result: 'match', reviewVerdict: 'match' }), visualReviewStatus: 'mismatch' });
    expect(html).toContain('Observed differences — all detected differences');
    expect(html).not.toContain('Why mismatch');
    expect(html).toContain('border-amber-700/30');
    expect(html).not.toContain('border-red-700/30');
  });

  it.each([
    ['rough', { origin: 'visual', result: 'manual_unknown', reviewVerdict: 'rough_match' }],
    ['unreadable', { origin: 'visual', result: 'manual_unknown', reviewVerdict: 'unreadable' }],
  ] as const)('uses neutral observed treatment for %s visual outcomes', (_label, identity) => {
    const html = render({ visualExecution: receipt(identity), visualReviewStatus: 'mismatch' });
    expect(html).toContain('Observed differences — all detected differences');
    expect(html).not.toContain('Why mismatch');
  });

  it('uses legacy mismatch only when no execution receipt exists', () => {
    const html = render({ visualReviewStatus: 'mismatch' });
    expect(html).toContain('Why mismatch — all detected differences');
    expect(html).toContain('border-red-700/30');
  });

  it('keeps authoritative visual mismatch red despite a stale match label', () => {
    const html = render({ visualExecution: receipt({ origin: 'visual', result: 'mismatch', reviewVerdict: 'mismatch' }), visualReviewStatus: 'match' });
    expect(html).toContain('Why mismatch — all detected differences');
    expect(html).not.toContain('Observed differences');
  });

  it.each([
    ['unresolved', { origin: 'none', result: 'not_established' }],
    ['authoritative match', { origin: 'visual', result: 'match', reviewVerdict: 'match' }],
  ] as const)('uses observed treatment when stale mismatch conflicts with authoritative %s', (_label, identity) => {
    const html = render({ visualExecution: receipt(identity), visualReviewStatus: 'mismatch' });
    expect(html).toContain('Observed differences — all detected differences');
    expect(html).not.toContain('Why mismatch');
  });

  it.each([
    { version: 2, attempts: [] },
    { version: 1, attempts: [] },
    { ...receipt({ origin: 'visual', result: 'mismatch', reviewVerdict: 'mismatch' }), attempts: [] },
  ])('does not fabricate a mismatch from a malformed or no-response receipt', visualExecution => {
    const html = render({ visualExecution, visualReviewStatus: 'mismatch' });
    expect(html).toContain('Observed differences — all detected differences');
    expect(html).not.toContain('Why mismatch');
  });

  it('renders nothing for an empty difference array', () => {
    const html = renderToStaticMarkup(<TestAiVisualDifferenceList listing={{ visualDifferences: [] }} />);
    expect(html).toBe('');
  });
});
