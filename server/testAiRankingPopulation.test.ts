import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn().mockRejectedValue(new Error('Synthetic visual outage; no model execution')) }));
import { invokeLLM } from './_core/llm';
import { annotatePreVisualComparableScores, buildVisualTargetMetadata, filterVisualSourceCandidates,
  videoGameConsoleVisualScore, videoGameVisualCap, withMetadataFieldComparisons } from './testAiVisualSourceFilter';
import { bindMetadataRankingPopulation, freezeMetadataRankingPopulation, overlayMetadataRankingPopulation,
  retainOriginDisplayRanking, validMetadataDisplayRank, type MetadataRankingBinding } from '../shared/testAiRankingPopulation';

// Preparation only. Execute only in the reviewed env-i, read-only, network/DB/provider-denied harness.
type Row = Record<string, unknown>;
const TARGET = buildVisualTargetMetadata({ title: 'Metroid NES CIB', category: 'video_games', itemType: 'game',
  itemDetails: JSON.stringify({ gameTitle: 'Metroid', platform: 'NES', completeInBox: 'Yes', sealed: 'No' }) });
const freeze = (rows: Row[], sourceId = 'ebay_active') => freezeMetadataRankingPopulation(rows,
  { populationId: 'synthetic-population', sourceId });
const binding = (row: Row) => row.metadataRanking as MetadataRankingBinding;
const record = (value: unknown) => value as Row;
const displayFields = ['metadataMatchScore', 'metadataMatchRank', 'metadataMatchReasons', 'metadataUnknownFields',
  'metadataScoreAwards', 'metadataMatchLabel', 'metadataFieldComparisons', 'metadataRanking'] as const;
const displayLevels = (row: Row) => [row, record(row.canonicalCandidate), record(row.marketplaceCandidate)];
const actualPopulation = (rows: Row[], targetMetadata = TARGET) => {
  const population = freeze(rows);
  return bindMetadataRankingPopulation(population, annotatePreVisualComparableScores(population.listings, targetMetadata)
    .map((row) => withMetadataFieldComparisons(targetMetadata, row)));
};
const staleDisplay = () => ({ metadataMatchScore: 100, metadataMatchRank: 1,
  metadataMatchReasons: ['stale'], metadataUnknownFields: ['stale'], metadataScoreAwards: [{ field: 'stale', awardedPoints: 100 }],
  metadataMatchLabel: 'stale', metadataFieldComparisons: [{ candidateValue: 'stale' }],
  metadataRanking: { populationId: 'browser-forged', sourceId: 'foreign', occurrenceKey: 'foreign', score: 100, rank: 1 },
  ranking: { state: 'assigned', score: 100, rank: 1, label: 'stale', reasons: ['stale'], matchedFields: ['stale'] } });
const expectCleared = (row: Row, expectedBinding?: MetadataRankingBinding) => {
  for (const level of displayLevels(row)) {
    for (const field of displayFields) {
      expect(level[field]).toEqual(field === 'metadataRanking' ? expectedBinding : undefined);
    }
    expect(level.ranking).toMatchObject({ state: 'not_assigned', score: null, rank: null,
      label: null, reasons: [], matchedFields: [] });
  }
};
const expectSynchronized = (row: Row, expected: Row) => {
  for (const level of displayLevels(row)) {
    for (const field of displayFields) expect(level[field]).toEqual(expected[field]);
    expect(level.ranking).toMatchObject({ state: 'assigned', score: binding(expected).score, rank: binding(expected).rank,
      label: expected.metadataMatchLabel ?? null, reasons: expected.metadataMatchReasons ?? [],
      matchedFields: expected.metadataMatchReasons ?? [] });
  }
};
const wrappedRow = (id: string, title = 'Metroid NES CIB'): Row => {
  const untouched = { ...staleDisplay(), signingPayload: { candidateId: id, signed: true } };
  const wrapper = () => ({ ...staleDisplay(), candidateId: `${id}-candidate`, providerRecordId: `${id}-provider`,
    sourceId: 'provider-source', title, normalizedTitle: title.toLowerCase(), url: `https://example.test/${id}`,
    price: 123, currency: 'USD', date: '2026-11-01', saleStatus: 'completed', priceBasis: 'sold', buyerPremium: 'included',
    shipping: 'excluded', tax: 'unknown', imageUrls: ['https://example.test/candidate.jpg'],
    visual: { requirement: 'required', status: 'mismatch', rationale: 'keep visual state' },
    valuation: { disposition: 'context_only', reasons: ['keep valuation state'] },
    universalFilter: { state: 'blocked', reasons: ['keep identity gate'] },
    itemTypeFilter: { state: 'blocked', reasons: ['keep type gate'] },
    signedComparable: untouched.signingPayload, signingPayload: untouched.signingPayload,
    rawMetadata: untouched, providerObject: untouched, canonicalCandidate: untouched, marketplaceCandidate: untouched });
  return { ...staleDisplay(), id, title, price: 123, signedComparable: untouched.signingPayload,
    signingPayload: untouched.signingPayload, rawMetadata: untouched, providerObject: untouched,
    canonicalCandidate: wrapper(), marketplaceCandidate: wrapper() };
};
const expectNonDisplayPreserved = (output: Row, input: Row) => {
  const pairs = [[output, input], [record(output.canonicalCandidate), record(input.canonicalCandidate)],
    [record(output.marketplaceCandidate), record(input.marketplaceCandidate)]];
  for (const [actual, original] of pairs) {
    for (const [field, value] of Object.entries(original)) {
      if ((displayFields as readonly string[]).includes(field) || field === 'ranking'
        || (original === input && ['canonicalCandidate', 'marketplaceCandidate'].includes(field))) continue;
      expect(actual[field]).toBe(value);
    }
  }
};

// Reuse the Nintendo NES/NES-001 console target and full-score fixture from
// testAiVisualSourceFilter.test.ts; omission-only variants retain real evidence.
const CONSOLE_DETAILS = { consoleName: 'NES', modelNumber: 'NES-001', region: 'NTSC-U', workingCondition: 'Working',
  originalBoxIncluded: 'Yes', cablesIncluded: 'Yes', controllersIncluded: 'Yes' };
const CONSOLE_TARGET = buildVisualTargetMetadata({ title: 'Nintendo NES', category: 'video_games', itemType: 'console',
  isGraded: 'No', fullItemDetails: CONSOLE_DETAILS });
const consoleFixture = (id: string, fields: Array<keyof typeof CONSOLE_DETAILS>, image = true): Row => ({
  id, title: 'Nintendo NES', isGraded: 'No',
  itemDetails: JSON.stringify(Object.fromEntries(fields.map((field) => [field, CONSOLE_DETAILS[field]]))),
  ...(image ? { imageUrl: `https://example.test/${id}.jpg` } : {}),
});
const fullConsole = (id: string, image = true) => consoleFixture(id, Object.keys(CONSOLE_DETAILS) as Array<keyof typeof CONSOLE_DETAILS>, image);
const consoleCapCases: Array<{ score: number; cap: number; fields: Array<keyof typeof CONSOLE_DETAILS> }> = [
  { score: 45, cap: 0, fields: ['region'] },
  { score: 50, cap: 2, fields: ['modelNumber'] },
  { score: 65, cap: 2, fields: ['modelNumber', 'region'] },
  { score: 70, cap: 4, fields: ['modelNumber', 'region', 'cablesIncluded'] },
  { score: 75, cap: 4, fields: ['modelNumber', 'region', 'originalBoxIncluded'] },
  { score: 80, cap: 6, fields: ['modelNumber', 'region', 'workingCondition'] },
  { score: 85, cap: 6, fields: ['modelNumber', 'region', 'workingCondition', 'cablesIncluded'] },
  { score: 90, cap: 8, fields: ['modelNumber', 'region', 'workingCondition', 'originalBoxIncluded'] },
];
const selectedNoTargetIds = (rows: Row[]) => rows.filter((row) => row.visualRequirement === 'not_required_no_target_image').map((row) => row.id);
const publicNoTarget = (rows: Row[]) => filterVisualSourceCandidates({ sourceRole: 'ebay',
  sourceLabel: 'synthetic console population', targetMetadata: CONSOLE_TARGET, targetImageUrl: null, listings: rows });
const expectActualConsoleSnapshot = (row: Row, ordinal: number, populationSize: number, rank: number) => {
  const score = videoGameConsoleVisualScore(row, CONSOLE_TARGET);
  expect(row.metadataMatchScore).toBe(score.score);
  expect(row.metadataScoreAwards).toEqual(score.awards);
  expect(row.metadataMatchReasons).toEqual(score.matched);
  expect(row.metadataUnknownFields).toEqual(score.unknown);
  expect(row.metadataFieldComparisons).toEqual(withMetadataFieldComparisons(CONSOLE_TARGET, row).metadataFieldComparisons);
  expect(row.metadataFieldComparisons).toEqual(expect.any(Array));
  expect(binding(row)).toMatchObject({ sourceId: 'synthetic console population', ordinal, populationSize,
    scorerRole: 'exact_comparable', score: score.score, rank });
  expect(row.metadataMatchRank).toBe(rank);
};

describe('Stage 4 pure retained-occurrence display ranking', () => {
  it('freezes unique source-scoped keys for equal titles, repeated IDs/references and no-ID rows without mutating input', () => {
    const repeated = { title: 'same title', itemId: 'CaseSensitiveID' };
    const input = [repeated, repeated, { title: 'same title', itemId: 'casesensitiveid' },
      { title: 'same title', itemId: '', itemWebUrl: 'https://example.test/Record' },
      { title: 'same title' }, { title: 'same title' }];
    const population = freeze(input);
    expect(new Set(population.bindings.map((row) => row.occurrenceKey)).size).toBe(input.length);
    expect(population.bindings.map((row) => row.ordinal)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(population.bindings.every((row) => row.populationSize === input.length)).toBe(true);
    expect(population.bindings[0].occurrenceKey).toContain('CaseSensitiveID');
    expect(population.bindings[2].occurrenceKey).toContain('casesensitiveid');
    expect(population.bindings[3].occurrenceKey).toContain('url:');
    expect(population.bindings[4].occurrenceKey).toContain(':local:occ:4');
    expect(repeated).not.toHaveProperty('metadataRanking');
    expect(freeze(input, 'mercari_sold_comps').bindings[0].occurrenceKey).not.toBe(population.bindings[0].occurrenceKey);
  });

  it('binds reordered scores by carried occurrence; preserves ingress ties, awards/reasons and display gaps', () => {
    const population = freeze([{ id: 'held', title: 'same', price: 1 }, { id: 'eligible', title: 'same', price: 99999 },
      { id: 'other', title: 'same' }, { id: 'missing-score', metadataMatchScore: 100, metadataMatchRank: 1 }]);
    const scored = population.listings.map((row, index) => ({ ...row,
      metadataMatchScore: index === 3 ? undefined : [100, 80, 80][index],
      metadataMatchReasons: [`own-${index}`], metadataScoreAwards: [{ field: `term-${index}`, source: 'title', awardedPoints: 10 }],
      metadataFieldComparisons: [{ candidateValue: `value-${index}` }] }));
    const bound = bindMetadataRankingPopulation(population, [...scored].reverse());
    expect(bound.bindings.map((row) => row.rank)).toEqual([1, 2, 3, null]);
    const projected = overlayMetadataRankingPopulation([{ ...scored[2], price: 0, visualReviewStatus: 'mismatch', metadataMatchRank: 1 },
      { ...scored[1], visualReviewStatus: 'match', metadataMatchScore: -99 }], bound);
    expect(projected.map((row) => row.metadataMatchRank)).toEqual([3, 2]);
    expect(projected.map((row) => row.metadataMatchReasons)).toEqual([['own-2'], ['own-1']]);
    expect(projected[0].metadataScoreAwards).toEqual(scored[2].metadataScoreAwards);
    expect(projected[0].visualReviewStatus).toBe('mismatch');
    expect(projected[0].price).toBe(0);
    expect(projected[1].metadataMatchScore).toBe(80);
    expect(overlayMetadataRankingPopulation([projected[0], projected[0]], bound).map(binding).map((row) => row.rank)).toEqual([3, 3]);
  });

  it.each([null, '', 0, -1, NaN, Infinity, '1', 1.5])('does not coerce invalid display rank %s to zero or authority', (value) => {
    expect(validMetadataDisplayRank(value)).toBe(false);
  });

  it('accepts genuine numeric score zero but rejects null/empty/string/nonfinite/out-of-model scores', () => {
    const population = freeze(Array.from({ length: 8 }, (_, id) => ({ id, metadataMatchScore: 100, metadataMatchRank: 1 })));
    const values = [0, null, '', '100', -1, 101, NaN, Infinity];
    const bound = bindMetadataRankingPopulation(population, population.listings.map((row, index) => ({ ...row, metadataMatchScore: values[index] })));
    expect(bound.bindings.map((row) => row.rank)).toEqual([1, null, null, null, null, null, null, null]);
    expect(bound.listings[0].metadataMatchScore).toBe(0);
    expect(bound.listings[1].metadataMatchRank).toBeUndefined();
  });

  it('clears stale direct and known-wrapper diagnostics at freeze; leaves signing, economics, raw metadata and deeper wrappers intact', () => {
    const input = wrappedRow('wrapped');
    const before = structuredClone(input);
    const frozen = freeze([input, input]);
    for (const [index, row] of frozen.listings.entries()) {
      expectCleared(row, frozen.bindings[index]);
      expectNonDisplayPreserved(row, input);
      expect(row).not.toBe(input);
      expect(row.canonicalCandidate).not.toBe(input.canonicalCandidate);
      expect(row.marketplaceCandidate).not.toBe(input.marketplaceCandidate);
      expect(row.ranking).not.toBe(input.ranking);
      expect(record(row.canonicalCandidate).ranking).not.toBe(record(input.canonicalCandidate).ranking);
      expect(record(row.marketplaceCandidate).ranking).not.toBe(record(input.marketplaceCandidate).ranking);
    }
    expect(input).toEqual(before);
    expect(frozen.bindings[0].occurrenceKey).not.toBe(frozen.bindings[1].occurrenceKey);
  });

  it('synchronizes actual scorer awards/rows in known wrappers at bind and final reordered overlay without mutating projections', () => {
    const inputs = [wrappedRow('cib'), wrappedRow('unknown', 'Metroid NES')];
    const before = structuredClone(inputs);
    const bound = actualPopulation(inputs);
    bound.listings.forEach((row, index) => {
      expectSynchronized(row, row);
      expectNonDisplayPreserved(row, inputs[index]);
    });
    const projections = [...bound.listings].reverse().map((row) => ({ ...row, ...staleDisplay(), metadataRanking: row.metadataRanking,
      canonicalCandidate: { ...record(row.canonicalCandidate), ...staleDisplay() },
      marketplaceCandidate: { ...record(row.marketplaceCandidate), ...staleDisplay() },
      price: 0, visualReviewStatus: 'mismatch', evidenceDisposition: 'context_only' }));
    const projectionBefore = structuredClone(projections);
    const overlaid = overlayMetadataRankingPopulation(projections, bound);
    overlaid.forEach((row, index) => {
      const expected = bound.listings[bound.listings.length - 1 - index];
      expectSynchronized(row, expected);
      expectNonDisplayPreserved(row, projections[index]);
      expect(row.price).toBe(0);
      expect(row.visualReviewStatus).toBe('mismatch');
      expect(row.evidenceDisposition).toBe('context_only');
    });
    expect(inputs).toEqual(before);
    expect(projections).toEqual(projectionBefore);
  });

  it('nonranking and missing/invalid scorer output clear every known display level instead of borrowing nested authority', () => {
    const input = wrappedRow('lot');
    const unranked = freezeMetadataRankingPopulation([input],
      { populationId: 'lot-population', sourceId: 'ebay_active', scorerRole: 'unranked' });
    const bound = bindMetadataRankingPopulation(unranked, unranked.listings.map((row) => ({ ...row, ...staleDisplay(), metadataRanking: row.metadataRanking })));
    expectCleared(bound.listings[0], bound.bindings[0]);
    expectNonDisplayPreserved(bound.listings[0], input);
    expect(bound.bindings[0]).toMatchObject({ score: null, rank: null, scorerRole: 'unranked' });
    const population = freeze([wrappedRow('missing'), wrappedRow('invalid')]);
    const invalid = bindMetadataRankingPopulation(population, [{ ...population.listings[1], metadataMatchScore: 101 }]);
    invalid.listings.forEach((row, index) => expectCleared(row, invalid.bindings[index]));
  });

  it.each(['population', 'source', 'occurrence', 'unbound'] as const)('clears %s foreign overlay at all known display levels without changing other fields', (kind) => {
    const bound = actualPopulation([wrappedRow('own')]);
    const input = wrappedRow('foreign');
    input.metadataRanking = kind === 'unbound' ? undefined : { ...bound.bindings[0],
      ...(kind === 'population' ? { populationId: 'browser-forged' } : kind === 'source' ? { sourceId: 'foreign-source' }
        : { occurrenceKey: 'foreign-occurrence' }) };
    const before = structuredClone(input);
    const [foreign] = overlayMetadataRankingPopulation([input], bound);
    expectCleared(foreign);
    expectNonDisplayPreserved(foreign, input);
    expect(input).toEqual(before);
  });

  it('does not invent candidate wrappers or ranking objects and leaves non-record wrapper values untouched', () => {
    const wrapperArray = [staleDisplay()];
    const input = { id: 'plain', canonicalCandidate: wrapperArray, marketplaceCandidate: 'provider opaque value' };
    const population = freeze([input]);
    const bound = bindMetadataRankingPopulation(population, population.listings.map((row) => ({ ...row, metadataMatchScore: 0 })));
    expect(bound.listings[0].canonicalCandidate).toBe(wrapperArray);
    expect(bound.listings[0].marketplaceCandidate).toBe(input.marketplaceCandidate);
    expect(bound.listings[0]).not.toHaveProperty('ranking');
  });

  it('retains only locally matched parent display metadata after separate subset review, including known wrappers', () => {
    const bound = actualPopulation([wrappedRow('one'), wrappedRow('two', 'Metroid NES')]);
    const base = bound.listings[1];
    const reviewed = { ...wrappedRow('reviewed'), metadataOriginOccurrenceKey: binding(base).occurrenceKey,
      visualReviewStatus: 'match', evidenceDisposition: 'context_only' };
    const before = structuredClone(reviewed);
    const merged = retainOriginDisplayRanking(base, reviewed);
    expectSynchronized(merged, base);
    expectNonDisplayPreserved(merged, reviewed);
    expect(merged.visualReviewStatus).toBe('match');
    expect(merged.evidenceDisposition).toBe('context_only');
    expect(retainOriginDisplayRanking(bound.listings[0], reviewed)).toBe(reviewed);
    expect(reviewed).toEqual(before);
  });

  it('uses actual scorer output rather than inbound score/rank and restores own rows after projection reorder', () => {
    const bound = actualPopulation([{ id: 'cib', title: 'Metroid NES CIB', metadataMatchScore: -99, metadataMatchRank: 999 },
      { id: 'unknown', title: 'Metroid NES', metadataMatchScore: 100, metadataMatchRank: 1 }]);
    expect(bound.listings[0].metadataMatchScore).toBeGreaterThan(Number(bound.listings[1].metadataMatchScore));
    expect(bound.bindings.map((row) => row.rank)).toEqual([1, 2]);
    const reordered = overlayMetadataRankingPopulation([...bound.listings].reverse().map((row) => ({ ...row,
      metadataMatchScore: 999, metadataMatchRank: 1, metadataScoreAwards: ['stale'] })), bound);
    expect(reordered[0].metadataMatchScore).toBe(bound.listings[1].metadataMatchScore);
    expect(reordered[0].metadataScoreAwards).toEqual(bound.listings[1].metadataScoreAwards);
    expect(reordered[0].metadataFieldComparisons).toEqual(bound.listings[1].metadataFieldComparisons);
  });

  it('actual no-target shared filtering keeps full outer population ranks for hard-held and eligible context copies', async () => {
    const bound = actualPopulation([{ id: 'hard', title: 'Metroid NES CIB Lot of 2', imageUrl: 'https://example.test/hard.jpg' },
      { id: 'eligible', title: 'Metroid NES CIB', imageUrl: 'https://example.test/eligible.jpg' },
      { id: 'missing', title: 'Metroid NES CIB' }]);
    const result = await filterVisualSourceCandidates({ sourceRole: 'ebay', sourceLabel: 'synthetic population',
      targetMetadata: TARGET, targetImageUrl: null, listings: bound.listings, rankingPopulation: bound });
    const projected = [...result.listings, ...(result.contextListings ?? [])];
    for (const row of projected) {
      const expected = bound.entries.get(binding(row).occurrenceKey)!;
      expect(row.metadataRanking).toEqual(expected.metadataRanking);
      expect(row.metadataMatchScore).toEqual(expected.metadataMatchScore);
      expect(row.metadataScoreAwards).toEqual(expected.metadataScoreAwards);
    }
    expect(projected.some((row) => row.id === 'hard')).toBe(true);
  });

  it.each([[49, 0], [50, 2], [69, 2], [70, 4], [79, 4], [80, 6], [89, 6], [90, 8]] as const)
  ('checks exact existing Video Games helper boundary %s -> %s without pretending it is real model evidence', (score, cap) => {
    // The approved console/game/accessory terms are multiples of five. Exact
    // 49/69/79/89 are helper-only; actual public controls below use 45/65/75/85.
    expect(videoGameVisualCap(score)).toBe(cap);
  });
});

describe('Stage 4 actual public-filter cap controls; selection stays private', () => {
  it('standalone public filtering recomputes stale direct/canonical/marketplace diagnostics and preserves wrapper payloads', async () => {
    const input = [wrappedRow('cib'), wrappedRow('unknown', 'Metroid NES')];
    const before = structuredClone(input);
    const modelCallsBefore = vi.mocked(invokeLLM).mock.calls.length;
    const result = await filterVisualSourceCandidates({ sourceRole: 'ebay', sourceLabel: 'standalone wrapped population',
      targetMetadata: TARGET, targetImageUrl: null, listings: input });
    const rows = [...result.listings, ...(result.contextListings ?? [])];
    expect(result.status).toBe('skipped_no_target_image');
    expect(rows).toHaveLength(input.length);
    for (const row of rows) {
      const original = input.find((candidate) => candidate.id === row.id)!;
      expectSynchronized(row, row);
      expect(binding(row)).toMatchObject({ sourceId: 'standalone wrapped population', populationSize: input.length });
      expect(binding(row).populationId).not.toBe('browser-forged');
      expect(binding(row).occurrenceKey).not.toBe('foreign');
      // The public filter owns top-level image/visual/context preparation. The
      // wrapper's economic/identity/signing/raw fields are still unchanged.
      for (const field of ['canonicalCandidate', 'marketplaceCandidate'] as const) {
        const outputWrapper = record(row[field]);
        const originalWrapper = record(original[field]);
        for (const [key, value] of Object.entries(originalWrapper)) {
          if (!(displayFields as readonly string[]).includes(key) && key !== 'ranking') expect(outputWrapper[key]).toBe(value);
        }
      }
      expect(row.signedComparable).toBe(original.signedComparable);
      expect(row.signingPayload).toBe(original.signingPayload);
      expect(row.price).toBe(original.price);
    }
    expect(vi.mocked(invokeLLM).mock.calls.length).toBe(modelCallsBefore);
    expect(input).toEqual(before);
  });

  it.each(consoleCapCases)('real console score $score selects $cap occurrences; hard-held real 100 does not enlarge that cap', async ({ score, cap, fields }) => {
    const eligible = Array.from({ length: 10 }, (_, index) => consoleFixture(`eligible-${index}`, fields));
    const hard = { ...fullConsole('hard-held'), lotQuantity: 2 };
    expect(videoGameConsoleVisualScore(hard, CONSOLE_TARGET).score).toBe(100);
    eligible.forEach((row) => expect(videoGameConsoleVisualScore(row, CONSOLE_TARGET).score).toBe(score));
    const input = [hard, ...eligible];
    const before = structuredClone(input);
    const modelCallsBefore = vi.mocked(invokeLLM).mock.calls.length;
    const control = await publicNoTarget(eligible);
    const held = await publicNoTarget(input);
    const selectedIds = eligible.slice(0, cap).map((row) => row.id);
    expect(control.status).toBe('skipped_no_target_image');
    expect(held.status).toBe('skipped_no_target_image');
    expect(control.listings).toEqual([]);
    expect(held.listings).toEqual([]);
    const controlRows = control.contextListings ?? [];
    const heldRows = held.contextListings ?? [];
    expect(selectedNoTargetIds(controlRows)).toEqual(selectedIds);
    expect(selectedNoTargetIds(heldRows)).toEqual(selectedIds);
    expect(heldRows).toHaveLength(input.length);
    expect(new Set(heldRows.map((row) => binding(row).occurrenceKey)).size).toBe(input.length);
    const byId = new Map(heldRows.map((row) => [row.id, row]));
    const hardOutput = byId.get('hard-held')!;
    expectActualConsoleSnapshot(hardOutput, 0, input.length, 1);
    expect(hardOutput).toMatchObject({ visualRequirement: 'not_required_pre_visual', evidenceDisposition: 'context_only' });
    expect(String(hardOutput.visualReviewRationale)).toMatch(/quantity|lot|single item/i);
    eligible.forEach((inputRow, index) => {
      const output = byId.get(inputRow.id)!;
      expectActualConsoleSnapshot(output, index + 1, input.length, index + 2);
      expect(output.evidenceDisposition).toBe('context_only');
      expect(output.visualRequirement).toBe(index < cap ? 'not_required_no_target_image' : 'not_required_pre_visual');
      if (index >= cap) expect(output.evidenceReasons).toContain(score < 50
        ? 'metadata score below minimum (50)' : `visual-review cap reached (${cap})`);
    });
    expect(vi.mocked(invokeLLM).mock.calls.length).toBe(modelCallsBefore);
    expect(input).toEqual(before);
  });

  it('retains the existing eligible missing-image cap driver: real 100 drives eight image rows without consuming a slot', async () => {
    const eligible = Array.from({ length: 10 }, (_, index) => consoleFixture(`eligible-${index}`, ['modelNumber', 'region']));
    const hard = { ...fullConsole('hard-held'), lotQuantity: 2 };
    const missing = fullConsole('missing-image-driver', false);
    expect(videoGameConsoleVisualScore(hard, CONSOLE_TARGET).score).toBe(100);
    expect(videoGameConsoleVisualScore(missing, CONSOLE_TARGET).score).toBe(100);
    eligible.forEach((row) => expect(videoGameConsoleVisualScore(row, CONSOLE_TARGET).score).toBe(65));
    const input = [hard, missing, ...eligible];
    const before = structuredClone(input);
    const modelCallsBefore = vi.mocked(invokeLLM).mock.calls.length;
    const withoutMissing = await publicNoTarget([hard, ...eligible]);
    const withMissing = await publicNoTarget(input);
    expect(selectedNoTargetIds(withoutMissing.contextListings ?? [])).toEqual(eligible.slice(0, 2).map((row) => row.id));
    const rows = withMissing.contextListings ?? [];
    expect(selectedNoTargetIds(rows)).toEqual(eligible.slice(0, 8).map((row) => row.id));
    expect(rows).toHaveLength(input.length);
    const byId = new Map(rows.map((row) => [row.id, row]));
    expectActualConsoleSnapshot(byId.get('hard-held')!, 0, input.length, 1);
    expectActualConsoleSnapshot(byId.get('missing-image-driver')!, 1, input.length, 2);
    expect(byId.get('hard-held')).toMatchObject({ visualRequirement: 'not_required_pre_visual', evidenceDisposition: 'context_only' });
    expect(byId.get('missing-image-driver')).toMatchObject({ visualRequirement: 'not_required_pre_visual', evidenceDisposition: 'context_only',
      evidenceReasons: ['no candidate image available; retained as context-only'] });
    eligible.forEach((inputRow, index) => {
      const output = byId.get(inputRow.id)!;
      expectActualConsoleSnapshot(output, index + 2, input.length, index + 3);
      expect(output.visualRequirement).toBe(index < 8 ? 'not_required_no_target_image' : 'not_required_pre_visual');
      if (index >= 8) expect(output.evidenceReasons).toContain('visual-review cap reached (8)');
    });
    expect(vi.mocked(invokeLLM).mock.calls.length).toBe(modelCallsBefore);
    expect(input).toEqual(before);
  });
});
