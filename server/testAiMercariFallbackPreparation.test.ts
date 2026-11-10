import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Execute only inside the parent's reviewed isolated, env-i, read-only,
// network/DB/provider-denied importer. This file never imports a router/adapter,
// calls an async visual filter, configures a provider, or accesses process.env.
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn(() => { throw new Error('Denied LLM boundary: preparation must not dispatch models'); }),
}));
vi.mock('./testAiResponse', () => ({
  parseAnalyzerResponse: vi.fn(() => { throw new Error('Denied model-response boundary in deterministic preparation'); }),
}));
import { invokeLLM } from './_core/llm';
import { parseAnalyzerResponse } from './testAiResponse';
import { prepareVisualSourceReviewOpportunity, type VisualSourceCandidate } from './testAiVisualSourceFilter';

type Row = VisualSourceCandidate;
const image = (id: string) => `https://example.test/preparation/${id}.jpg`;
const target = (title: string, category: string, itemType: string, details: Record<string, unknown> = {}, extra = '') =>
  `title=${title}; category=${category}; itemType=${itemType}; ${extra}fullItemDetails=${JSON.stringify(details)}`;
const prepare = (listings: Row[], targetMetadata: string, ignoreSubjectiveConditionDifferences = true) =>
  prepareVisualSourceReviewOpportunity({ listings, targetMetadata, ignoreSubjectiveConditionDifferences });
const selectedIds = (result: ReturnType<typeof prepare>) => result.selectedCandidates.map(candidate => candidate.item.id);
const preparedById = (result: ReturnType<typeof prepare>, id: string) => result.preparedListings.find(row => row.id === id)!;
const heldById = (result: ReturnType<typeof prepare>, id: string) => result.heldCandidates.find(candidate => candidate.item.id === id)!;
const consoleDetails = { consoleName: 'NES', modelNumber: 'NES-001', region: 'NTSC-U', workingCondition: 'Working',
  originalBoxIncluded: 'Yes', cablesIncluded: 'Yes', controllersIncluded: 'Yes' };
const consoleTarget = target('Nintendo NES', 'video_games', 'console', consoleDetails, 'isGraded=No; ');
const consoleRow = (id: string, fields: Array<keyof typeof consoleDetails>, withImage = true): Row => ({
  id, title: 'Nintendo NES', isGraded: 'No',
  itemDetails: JSON.stringify(Object.fromEntries(fields.map(field => [field, consoleDetails[field]]))),
  ...(withImage ? { imageUrl: image(id) } : {}),
});
const fullConsole = (id: string, withImage = true) => consoleRow(id, Object.keys(consoleDetails) as Array<keyof typeof consoleDetails>, withImage);

beforeEach(() => {
  vi.mocked(invokeLLM).mockClear();
  vi.mocked(parseAnalyzerResponse).mockClear();
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Denied network boundary in deterministic preparation'); }));
});
afterEach(() => {
  expect(invokeLLM).not.toHaveBeenCalled();
  expect(parseAnalyzerResponse).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe('Step6 synchronous canonical review-opportunity preparation', () => {
  it('returns a synchronous image-bearing count without requiring a target image or approval', () => {
    const result = prepare([fullConsole('one')], consoleTarget);
    expect(result).not.toHaveProperty('then');
    expect(result).toMatchObject({ supported: true, eligibleCount: 1, cap: 8, minimumMetadataScore: 50 });
    expect(selectedIds(result)).toEqual(['one']);
    expect(result.selectedCandidates[0]).toMatchObject({ candidateIndex: 0, imageUrl: image('one'), imageUrls: [image('one')] });
    expect(result.preparedListings[0].metadataMatchScore).toBe(100);
    expect(result.preparedListings[0]).not.toHaveProperty('visualExecution');
    expect(result.preparedListings[0]).not.toHaveProperty('signedComparable');
    expect(result.preparedListings[0]).not.toHaveProperty('valuationEligible');
  });

  it.each([
    { score: 45, cap: 0, fields: ['region'] },
    { score: 50, cap: 2, fields: ['modelNumber'] },
    { score: 65, cap: 2, fields: ['modelNumber', 'region'] },
    { score: 70, cap: 4, fields: ['modelNumber', 'region', 'cablesIncluded'] },
    { score: 75, cap: 4, fields: ['modelNumber', 'region', 'originalBoxIncluded'] },
    { score: 80, cap: 6, fields: ['modelNumber', 'region', 'workingCondition'] },
    { score: 85, cap: 6, fields: ['modelNumber', 'region', 'workingCondition', 'cablesIncluded'] },
    { score: 90, cap: 8, fields: ['modelNumber', 'region', 'workingCondition', 'originalBoxIncluded'] },
  ])('keeps real console score $score/cap $cap and held real 100 out of cap authority', ({ score, cap, fields }) => {
    const eligible = Array.from({ length: 10 }, (_, index) => consoleRow(`eligible-${index}`, fields as Array<keyof typeof consoleDetails>));
    const hard = { ...fullConsole('hard'), lotQuantity: 2 };
    const input = [hard, ...eligible];
    const before = structuredClone(input);
    const control = prepare(eligible, consoleTarget);
    const result = prepare(input, consoleTarget);
    expect(result).toMatchObject({ supported: true, eligibleCount: cap, cap, minimumMetadataScore: 50 });
    expect(selectedIds(result)).toEqual(selectedIds(control));
    expect(selectedIds(result)).toEqual(eligible.slice(0, cap).map(row => row.id));
    expect(result.selectedCandidates.map(candidate => candidate.candidateIndex)).toEqual(eligible.slice(0, cap).map((_, index) => index + 1));
    expect(result.preparedListings).toHaveLength(input.length);
    expect(preparedById(result, 'hard')).toMatchObject({ metadataMatchScore: 100, metadataMatchRank: 1, evidenceDisposition: 'context_only' });
    expect(heldById(result, 'hard').reason).toMatch(/quantity|lot|single item/i);
    eligible.forEach((row, index) => {
      expect(preparedById(result, String(row.id))).toMatchObject({ metadataMatchScore: score, metadataMatchRank: index + 2 });
      if (index >= cap) expect(heldById(result, String(row.id)).reasonCode).toBe('selection_excluded');
    });
    expect(input).toEqual(before);
  });

  it('preserves the eligible missing-image 100 cap driver without giving it a selected slot', () => {
    const rows = Array.from({ length: 10 }, (_, index) => consoleRow(`image-${index}`, ['modelNumber', 'region']));
    const result = prepare([{ ...fullConsole('hard'), lotQuantity: 2 }, fullConsole('no-image', false), ...rows], consoleTarget);
    expect(result).toMatchObject({ supported: true, eligibleCount: 8, cap: 8 });
    expect(selectedIds(result)).toEqual(rows.slice(0, 8).map(row => row.id));
    expect(heldById(result, 'no-image')).toMatchObject({ candidateIndex: 1, reason: expect.stringMatching(/cap reached/i), reasonCode: 'selection_excluded' });
    // Preserve the existing selector's distinct rationale and evidence-reason wording.
    expect(preparedById(result, 'no-image').evidenceReasons).toEqual(['no candidate image available; retained as context-only']);
    expect(result.preparedListings).toHaveLength(12);
    expect(result.selectedCandidates.every(candidate => candidate.imageUrls.length > 0)).toBe(true);
  });

  it('checks image readiness locally: invalid URLs do not produce opportunity, real gallery aliases do', () => {
    const result = prepare([{ ...fullConsole('invalid', false), imageUrl: 'javascript:alert(1)' },
      { ...fullConsole('gallery', false), images: [{ url: image('gallery') }] }], consoleTarget);
    expect(result.eligibleCount).toBe(1);
    expect(selectedIds(result)).toEqual(['gallery']);
    expect(heldById(result, 'invalid').reasonCode).toBe('selection_excluded');
  });

  it('preserves exact-reference duplicate/gallery semantics and distinct equal-title occurrences', () => {
    const input = [fullConsole('same', false), { ...fullConsole('same'), imageUrls: [image('back')] }, fullConsole('other')];
    const before = structuredClone(input);
    const result = prepare(input, consoleTarget);
    expect(selectedIds(result)).toEqual(['same', 'other']);
    expect(result.selectedCandidates.map(candidate => candidate.candidateIndex)).toEqual([0, 2]);
    expect(result.selectedCandidates[0].imageUrls).toEqual([image('back'), image('same')]);
    expect(result.preparedListings).toHaveLength(3);
    expect(result.heldCandidates.find(candidate => candidate.candidateIndex === 1)).toMatchObject({ reasonCode: 'universal_duplicate_hold' });
    expect(input).toEqual(before);
  });

  it('never lets a later same-reference occurrence cure an earlier held occurrence', () => {
    const result = prepare([{ ...fullConsole('same'), lotQuantity: 2 }, fullConsole('same')], consoleTarget);
    expect(result).toMatchObject({ supported: true, eligibleCount: 0, cap: 0 });
    expect(result.heldCandidates.map(candidate => candidate.reasonCode)).toEqual(['universal_pre_visual_hold', 'universal_duplicate_hold']);
    expect(result.preparedListings).toHaveLength(2);
  });

  it('clears direct and known-wrapper foreign display data but preserves economic, guide, visual, receipt and signing payloads', () => {
    const stale = { metadataMatchScore: 100, metadataMatchRank: 1, metadataMatchReasons: ['foreign'], metadataUnknownFields: ['foreign'],
      metadataScoreAwards: [{ field: 'foreign', source: 'rule' as const, awardedPoints: 100 }], metadataFieldComparisons: [],
      metadataRanking: { populationId: 'foreign', sourceId: 'foreign', occurrenceKey: 'foreign', ordinal: 0, populationSize: 1,
        scorerRole: 'exact_comparable' as const, score: 100, rank: 1 }, ranking: { score: 100, rank: 1, state: 'assigned' } };
    const signing = { signature: 'synthetic-not-authority' };
    const receipt: NonNullable<Row['visualExecution']> = { version: 1, state: 'unknown', reasonCode: 'legacy_unknown',
      selectedForReview: false, hardExclusion: false, identity: { result: 'not_established', origin: 'none' }, attempts: [] };
    const raw = { price: 12, status: 'active', currency: null, soldAt: null, sentinel: 'raw unchanged' };
    const wrapper = { ...stale, price: 12, saleStatus: 'unknown', priceBasis: 'unknown', currency: null,
      date: null, guide: { value: 55 }, visual: { status: 'match' }, signedComparable: signing, rawMetadata: raw };
    const input: Row = { ...consoleRow('low', ['region']), ...stale, price: 12, currency: null,
      saleStatus: 'unknown', priceBasis: 'unknown', date: null, valuationEligible: true, visualReviewStatus: 'match',
      evidenceDisposition: 'valuation_eligible', signedComparable: signing, visualExecution: receipt as Row['visualExecution'],
      rawMetadata: raw, canonicalCandidate: wrapper, marketplaceCandidate: wrapper };
    const before = structuredClone(input);
    const result = prepare([input], consoleTarget);
    expect(result.eligibleCount).toBe(0);
    const output = result.preparedListings[0];
    expect(output.metadataMatchScore).toBe(45);
    expect(output.metadataMatchRank).toBe(1);
    expect(output.metadataRanking).toBeUndefined();
    for (const name of ['canonicalCandidate', 'marketplaceCandidate']) {
      const level = output[name] as Record<string, unknown>;
      expect(level.metadataMatchScore).toBeUndefined();
      expect(level.metadataMatchRank).toBeUndefined();
      expect(level.metadataRanking).toBeUndefined();
      expect(level.ranking).toMatchObject({ score: null, rank: null, state: 'not_assigned' });
      for (const field of ['price', 'saleStatus', 'priceBasis', 'currency', 'date', 'guide', 'visual', 'signedComparable', 'rawMetadata']) {
        expect(level[field]).toBe(wrapper[field as keyof typeof wrapper]);
      }
    }
    expect(output.signedComparable).toBe(signing);
    expect(output.visualExecution).toBe(receipt);
    expect(output.rawMetadata).toBe(raw);
    expect(output).toMatchObject({ price: 12, currency: null, date: null, saleStatus: 'unknown', priceBasis: 'unknown' });
    expect(input).toEqual(before);
  });

  it('recomputes on every call without module state, mutation, randomness or previous population bindings', () => {
    const first = prepare([fullConsole('full')], consoleTarget);
    const rows = [consoleRow('low', ['region'])];
    const before = structuredClone(rows);
    const second = prepare(rows, consoleTarget);
    const repeated = prepare(rows, consoleTarget);
    expect(first.eligibleCount).toBe(1);
    expect(second.eligibleCount).toBe(0);
    expect(second).toEqual(repeated);
    expect(rows).toEqual(before);
  });

  it('shares canonical legacy/direct/nested target metadata with the final preparation path', () => {
    const row = fullConsole('canonical');
    const canonical = prepare([row], consoleTarget);
    const direct = prepare([row], 'title=Nintendo NES; category=Video Games; itemType=console; isGraded=No; consoleName=NES; modelNumber=NES-001; region=NTSC-U; workingCondition=Working; originalBoxIncluded=Yes; cablesIncluded=Yes; controllersIncluded=Yes');
    const nested = prepare([row], `title=Nintendo NES; category=video_games; isGraded=No; details=${JSON.stringify({ itemType: 'console', ...consoleDetails })}`);
    for (const result of [direct, nested]) {
      expect(result).toMatchObject({ supported: true, eligibleCount: canonical.eligibleCount, cap: canonical.cap, minimumMetadataScore: 50 });
      expect(result.preparedListings[0].metadataMatchScore).toBe(100);
      expect(selectedIds(result)).toEqual(['canonical']);
    }
  });
});

describe('Step6 exact category minimums and unchanged unsupported workflows', () => {
  const movieTarget = target('Alien', 'movies', 'individual_movie', { movieTitle: 'Alien', format: 'DVD', releaseYear: '1979' });
  const comicTarget = target('Amazing Spider-Man 300', 'comics', 'single_comic', { comicTitle: 'Amazing Spider-Man', issueNumber: '300', publisher: 'Marvel' });
  const pinTarget = target('Mickey Mouse Pin', 'disney_pins', 'individual_pin', { pinName: 'Mickey Mouse', character: 'Mickey Mouse' });
  const savedPinTarget = target('Mickey Mouse Pin', 'disney_pins', 'single_pin', { pinName: 'Mickey Mouse', character: 'Mickey Mouse' });
  const unopenedTarget = target('Factory Box', 'sports_cards', 'unopened_product', { productName: 'Factory Box', productFormat: 'Box', productType: 'Box' });

  it.each([
    { label: 'movie', metadata: movieTarget, minimum: 60, below: { title: 'Alien', format: 'DVD' }, boundary: { title: 'Alien', format: 'DVD', releaseYear: '1979' }, belowScore: 45, boundaryScore: 60 },
    { label: 'comic', metadata: comicTarget, minimum: 50, below: { title: 'Amazing Spider-Man 300' }, boundary: { title: 'Marvel Amazing Spider-Man 300' }, belowScore: 40, boundaryScore: 50 },
    { label: 'pin', metadata: pinTarget, minimum: 40, below: { title: 'Pin', pinName: 'Mickey Mouse' }, boundary: { title: 'Mickey Mouse Pin', character: 'Mickey Mouse' }, belowScore: 25, boundaryScore: 40 },
    { label: 'saved single_pin', metadata: savedPinTarget, minimum: 40, below: { title: 'Pin', pinName: 'Mickey Mouse' }, boundary: { title: 'Mickey Mouse Pin', character: 'Mickey Mouse' }, belowScore: 25, boundaryScore: 40 },
    { label: 'unopened sports product', metadata: unopenedTarget, minimum: 55, below: { title: 'Factory Box', productFormat: 'Box' }, boundary: { title: 'Factory Box', productFormat: 'Box', productType: 'Box' }, belowScore: 40, boundaryScore: 55 },
  ])('uses the actual $label selector, including its inclusive $minimum minimum', ({ metadata, minimum, below, boundary, belowScore, boundaryScore }) => {
    const low = prepare([{ id: 'below', ...below, imageUrl: image('below') }], metadata);
    const exact = prepare([{ id: 'boundary', ...boundary, imageUrl: image('boundary') }], metadata);
    expect(low).toMatchObject({ supported: true, eligibleCount: 0, cap: 0, minimumMetadataScore: minimum });
    expect(exact).toMatchObject({ supported: true, eligibleCount: 1, cap: 2, minimumMetadataScore: minimum });
    expect(low.preparedListings[0].metadataMatchScore).toBe(belowScore);
    expect(exact.preparedListings[0].metadataMatchScore).toBe(boundaryScore);
    expect(selectedIds(exact)).toEqual(['boundary']);
  });

  it.each([
    ['sports_cards', 'single_card', 50], ['sports_cards', 'complete_set', 50], ['sports_cards', 'box_set', 55],
    ['comics', 'single_comic', 50], ['coins', 'single_coin', 60], ['coins', 'coin_set', 60], ['coins', 'paper_money', 60],
    ['stamps', 'single_stamp', 60], ['stamps', 'stamp_set', 60],
    ['video_games', 'game', 50], ['video_games', 'console', 50], ['video_games', 'accessory', 50],
    ['movies', 'individual_movie', 60], ['movies', 'box_set', 60],
    // `single_pin` is the key the inventory form actually saves for an individual pin.
    ['disney_pins', 'individual_pin', 40], ['disney_pins', 'single_pin', 40], ['disney_pins', 'pin_set', 40],
    ['music', 'vinyl_record', 60], ['music', 'box_set', 60], ['vintage_toys', 'lego', 60],
    ['pokemon', 'single_card', 60], ['pokemon', 'set', 60], ['pokemon', 'unopened_product', 60],
  ])('reports support from existing %s / %s dispatch even for an empty population', (category, itemType, minimum) => {
    const result = prepare([], target('Synthetic target', category, String(itemType)));
    expect(result).toMatchObject({ supported: true, eligibleCount: 0, minimumMetadataScore: minimum });
    expect(result.selectedCandidates).toEqual([]);
  });

  it.each([
    ['autographs', 'signed_item'], ['comics', 'original_art'], ['video_games', 'collection_lot'],
    ['pokemon', 'collection_lot'], ['coins', 'collection_lot'], ['sports_cards', 'collection_lot'],
    ['video_games', 'unknown'], ['video_games', ''], ['sports_cards', 'unknown'], ['sports_cards', ''],
    ['sports_cards', 'unrecognized_widget'], ['movies', 'unrecognized_widget'], ['coins', 'unrecognized_widget'],
    ['coins', 'individual_movie'], ['unknown', 'individual_movie'], ['stamps', 'stamp_block'], ['unknown', 'game'],
  ])('keeps %s / %s unsupported instead of inventing an exact-comparable threshold', (category, itemType) => {
    const result = prepare([fullConsole('one')], target('Synthetic target', category, itemType));
    expect(result).toMatchObject({ supported: false, eligibleCount: 0, cap: null, minimumMetadataScore: null });
    expect(result.selectedCandidates).toEqual([]);
    expect(result.preparedListings).toHaveLength(1);
    expect(result.unsupportedReason).toBeDefined();
  });


  it('routes a Music box-set target to the Music scorer, never the Movies selector', () => {
    const musicBox = target('Beatles Anthology', 'music', 'box_set', { albumTitle: 'Anthology', artist: 'The Beatles', format: 'CD' });
    const result = prepare([{ id: 'unrelated', title: 'Pin', imageUrl: image('unrelated') }], musicBox);
    expect(result).toMatchObject({ supported: true, minimumMetadataScore: 60 });
    expect(heldById(result, 'unrelated').reason).toMatch(/^Music metadata score/);
    expect(heldById(result, 'unrelated').reason).not.toMatch(/Movies/);
  });

  it('routes a saved single_pin Disney target to the Disney scorer, never the Movies selector', () => {
    const pin = target('Mickey Mouse Pin', 'disney_pins', 'single_pin', { pinName: 'Mickey Mouse', character: 'Mickey Mouse' });
    const result = prepare([{ id: 'low', title: 'Pin', imageUrl: image('low') }], pin);
    expect(result).toMatchObject({ supported: true, minimumMetadataScore: 40 });
    expect(heldById(result, 'low').reason).not.toMatch(/Movies/);
  });

  it('retains wrong-target and low siblings while one real eligible opportunity ends deterministic preparation', () => {
    // "OTHER" is the form's custom-value placeholder, not a model number; use a real conflicting one.
    const wrong = { ...fullConsole('wrong'), itemDetails: JSON.stringify({ ...consoleDetails, modelNumber: 'NES-101' }) };
    const result = prepare([wrong, consoleRow('below', ['region']), fullConsole('match')], consoleTarget);
    expect(result.eligibleCount).toBe(1);
    expect(selectedIds(result)).toEqual(['match']);
    expect(result.preparedListings.map(row => row.id)).toEqual(['wrong', 'below', 'match']);
    expect(heldById(result, 'wrong').reason).toMatch(/model number differs/i);
    expect(heldById(result, 'below').reason).toMatch(/below/i);
  });

  it('does not manufacture raw/graded observations or award grading points for an unknown source', () => {
    const unknown = { ...fullConsole('unknown') };
    delete unknown.isGraded;
    const result = prepare([unknown, fullConsole('raw'), { ...fullConsole('graded'), isGraded: 'Yes', grade: '9', certificationCompany: 'VGA' }], consoleTarget);
    expect(preparedById(result, 'unknown').metadataMatchScore).toBe(95);
    expect(preparedById(result, 'unknown').metadataUnknownFields).toContain('isGraded');
    expect(preparedById(result, 'unknown').isGraded).toBeUndefined();
    expect(preparedById(result, 'raw').metadataMatchScore).toBe(100);
    expect(heldById(result, 'graded').reason).toMatch(/grading state/i);
  });

  it('reuses explicit grade and form conflicts, retaining both rows before category selection', () => {
    const metadata = target('Metroid', 'video_games', 'game', { gameTitle: 'Metroid', platform: 'NES', sealed: 'Yes', completeInBox: 'Yes' }, 'isGraded=Yes; grade=9.8; certificationCompany=WATA; ');
    const base = { title: 'Metroid NES WATA 9.8 sealed', gameTitle: 'Metroid', platform: 'NES', sealed: 'Yes', isGraded: 'Yes', grade: '9.8', certificationCompany: 'WATA' };
    const result = prepare([{ ...base, id: 'grade', grade: '9.6', title: 'Metroid NES WATA 9.6 sealed', imageUrl: image('grade') },
      { ...base, id: 'form', sealed: 'No', packageStatus: 'loose', completeInBox: 'No', title: 'Metroid NES WATA 9.8 loose', imageUrl: image('form') }], metadata);
    expect(result.eligibleCount).toBe(0);
    expect(result.preparedListings).toHaveLength(2);
    expect(heldById(result, 'grade').reason).toMatch(/grade/i);
    expect(heldById(result, 'form').reason).toMatch(/sealed|form/i);
  });

  it('reuses contradictory Pokémon number evidence, while omission remains unknown', () => {
    const metadata = target('Charizard Base Set', 'pokemon', 'single_card', { cardName: 'Charizard', setName: 'Base Set', cardNumber: '4/102' });
    const result = prepare([{ id: 'conflict', title: 'Charizard Base Set #4/102', cardNumber: '4/102', number: '5/102', imageUrl: image('conflict') },
      { id: 'unknown', title: 'Charizard Base Set', imageUrl: image('unknown') }], metadata);
    expect(result.eligibleCount).toBe(0);
    expect(heldById(result, 'conflict').reason).toMatch(/number|contradict/i);
    expect(preparedById(result, 'unknown').metadataUnknownFields).toContain('cardNumber');
    expect(preparedById(result, 'unknown').cardNumber).toBeUndefined();
  });

  it('passes the subjective-condition option into the shared declared-conflict gate', () => {
    const metadata = target('Alien', 'movies', 'individual_movie', { movieTitle: 'Alien', format: 'DVD', releaseYear: '1979', condition: 'Good' });
    const rows = [{ id: 'condition', title: 'Alien', format: 'DVD', releaseYear: '1979', condition: 'Fair', imageUrl: image('condition') }];
    const strict = prepare(rows, metadata, false);
    const ignored = prepare(rows, metadata, true);
    expect(strict.eligibleCount).toBe(0);
    expect(heldById(strict, 'condition').reason).toMatch(/condition/i);
    expect(ignored).toMatchObject({ supported: true, eligibleCount: 1, minimumMetadataScore: 60 });
  });
});
