import { describe, expect, it } from 'vitest';
import {
  compareComparableGrades,
  parseComparableGrade,
  parseSourceGradeFromTitle,
  readSourceGradeClaimsFromTitle,
} from '../shared/testAiGradeComparison';
import { determineExplicitGradingState } from '../shared/testAiExplicitGradingState';
import { findMaterialMetadataConflicts } from '../shared/testAiMetadataConflict';
import {
  annotateSoldComparableCandidate,
  buildEbayBrowseQuery,
  buildSoldCompsQueryCandidates,
  extractGradeFromQuery,
  extractGradeFromTitle,
  filterListingsByGrade,
  filterListingsByTargetGradingState,
} from './testAIRouter';
import { buildMetadataFieldComparisons } from './testAiVisualSourceFilter';

const structured = { allowBareNumeric: true };
const targetMetadata = (grade: string, provider = 'PSA', category = 'sports_cards') =>
  `title=Example;category=${category};itemType=single_item;grade=${grade};certificationCompany=${provider};fullItemDetails={"isGraded":"Yes"}`;
const context = (grade: number | string, provider = 'PSA', category = 'sports_cards') => ({
  category, targetItemType: 'single_item', certificationCompany: provider,
  targetGrade: grade, targetNumber: null, targetPlayer: null,
});
const gradeMissingReason = 'grade is not stated or cannot be normalized from the marketplace title';
const providerMissingReason = 'grading or authentication company is not stated in the marketplace title';

const compactCases = [
  { title: 'Example PSA10', spaced: 'Example PSA 10', provider: 'PSA', grade: '10', numeric: 10, category: 'sports_cards' },
  { title: 'Example psa9.5 Card', spaced: 'Example psa 9.5 Card', provider: 'PSA', grade: '9.5', numeric: 9.5, category: 'sports_cards' },
  { title: 'Example WATA7.50 NES', spaced: 'Example WATA 7.50 NES', provider: 'WATA', grade: '7.5', numeric: 7.5, category: 'video_games' },
  { title: 'Example CGC9.8 Comic', spaced: 'Example CGC 9.8 Comic', provider: 'CGC', grade: '9.8', numeric: 9.8, category: 'comics' },
  { title: '(PSA10) Example', spaced: '(PSA 10) Example', provider: 'PSA', grade: '10', numeric: 10, category: 'sports_cards' },
];

// These exercise real production helpers, not copies of their regexes.
describe('compact grade title repair: shared and router consumers', () => {
  it.each(compactCases)('reads $title identically to its spaced form', ({ title, spaced, provider, grade, numeric, category }) => {
    const source = parseSourceGradeFromTitle(title, { category });
    expect(source).toMatchObject({ grader: provider, comparable: { numeric: grade, qualifierUncertain: false } });
    expect(source?.comparable).toEqual(parseSourceGradeFromTitle(spaced, { category })?.comparable);
    expect(readSourceGradeClaimsFromTitle(title, { category }).map(claim => claim.grader)).toEqual([provider]);
    expect(parseComparableGrade(title, { category })).toEqual(source?.comparable);
    expect(compareComparableGrades(grade, title, { ...structured, category })).toBe('match');
    expect(extractGradeFromTitle(title)).toBe(numeric);
    expect(extractGradeFromTitle(title)).toBe(extractGradeFromTitle(spaced));
    expect(determineExplicitGradingState({ title }, { category }).state).toBe('graded');

    const listing = Object.freeze({ title, soldPrice: 100 });
    expect(filterListingsByTargetGradingState([listing], false)).toEqual([]);
    expect(filterListingsByTargetGradingState([listing], true)).toEqual([listing]);
    const annotated = annotateSoldComparableCandidate(listing, context(numeric, provider, category));
    expect(annotated.evidenceReasons).not.toContain(gradeMissingReason);
    expect(annotated.evidenceReasons).not.toContain(providerMissingReason);
    expect(listing).toEqual({ title, soldPrice: 100 });

    const rows = buildMetadataFieldComparisons(targetMetadata(grade, provider, category), listing);
    expect(rows.find(row => row.fieldKey === 'grade')?.titleDerivedValue).toBe(grade);
    expect(rows.find(row => row.fieldKey === 'certificationCompany')?.titleDerivedValue).toBe(provider);
    expect(rows.find(row => row.fieldKey === 'isGraded')?.titleDerivedValue).toBe('Yes (inferred from title)');
  });

  it('uses compact grade evidence in the real router grade filter without rejecting omissions', () => {
    const listings = [{ title: 'Example PSA10' }, { title: 'Example PSA9' }, { title: 'Example Card' }];
    expect(filterListingsByGrade(listings, 10, 'sports_cards', 'PSA')).toEqual([listings[0], listings[2]]);
    expect(filterListingsByGrade([{ title: 'Example WATA7.5' }, { title: 'Example WATA8.5' }], 7.5, 'video_games', 'WATA'))
      .toEqual([{ title: 'Example WATA7.5' }]);
  });

  it('recognizes every pre-existing router provider in a compact numeric title', () => {
    for (const provider of ['CGC', 'PSA', 'BGS', 'PCGS', 'NGC', 'CBCS', 'SGC', 'HGA', 'CSG', 'ISA', 'GMA', 'WATA', 'VGA', 'IGS', 'AFA', 'CAS', 'UKG', 'PSE', 'ASG', 'PSAG', 'VHSDNA', 'Rewind']) {
      const title = `Example ${provider}9.5`;
      expect(extractGradeFromTitle(title)).toBe(9.5);
      expect(filterListingsByTargetGradingState([{ title }], false)).toEqual([]);
      expect(annotateSoldComparableCandidate({ title }, context(9.5, provider)).evidenceReasons).not.toContain(providerMissingReason);
    }
  });
});

const malformedTitles = [
  'Example PSA10000000', 'Example PSA 10000000', 'Example WATA75000000',
  'Example PSAX10', 'Example PSA X10', 'Example WATAX7.5',
  'Example UPSA10', 'Example WATACH10', 'Example Showcase10', 'Example Rewindable10',
  'Example PSA10XYZ', 'Example WATA7.5junk', 'Example PSA10A123',
  'Example PSA10++', 'Example PSA10.', 'Example PSA10.0.5', 'Example PSA10_suffix',
  'Example PCGS MS10000000', 'Example PCGS MS65.0.5',
  'Example 1999 #10', 'Example PSA Card', 'Example PSA certificate #10000000',
];

describe('compact grade title repair: strict boundaries and negative evidence', () => {
  it.each(malformedTitles)('does not fabricate grade evidence from %s', title => {
    expect(readSourceGradeClaimsFromTitle(title)).toEqual([]);
    expect(parseSourceGradeFromTitle(title)).toBeNull();
    expect(parseComparableGrade(title)).toBeNull();
    expect(extractGradeFromTitle(title)).toBeNull();
    expect(determineExplicitGradingState({ title }).state).toBe('unknown');
    expect(annotateSoldComparableCandidate({ title }, context(10)).evidenceReasons).toContain(gradeMissingReason);
    const rows = buildMetadataFieldComparisons(targetMetadata('10'), { title });
    expect(rows.find(row => row.fieldKey === 'grade')?.titleDerivedValue).toBe('Unknown');
    expect(rows.find(row => row.fieldKey === 'isGraded')?.titleDerivedValue).toBe('Unknown');
  });

  it.each(['PSA10000000', 'PSAX10', 'WATA75000000', 'WATAX7.5', 'Showcase10', 'Rewindable10', 'UPSA10', 'PSA10XYZ', 'WATA7.5junk', 'PSA10_suffix'])
  ('does not mistake %s for a certification provider in the actual router', fragment => {
    const listing = { title: `Example ${fragment}` };
    expect(filterListingsByTargetGradingState([listing], false)).toEqual([listing]);
    expect(annotateSoldComparableCandidate(listing, context(10)).evidenceReasons).toContain(providerMissingReason);
  });

  it('retains standalone provider mentions without inventing a grade or a title state', () => {
    const listing = { title: 'Example PSA Card' };
    expect(extractGradeFromTitle(listing.title)).toBeNull();
    expect(determineExplicitGradingState(listing).state).toBe('unknown');
    expect(filterListingsByTargetGradingState([listing], false)).toEqual([]);
    const reasons = annotateSoldComparableCandidate(listing, context(10)).evidenceReasons;
    expect(reasons).not.toContain(providerMissingReason);
    expect(reasons).toContain(gradeMissingReason);
  });

  it.each(['Not PSA10 Card', 'No WATA7.5 Game', 'Without PSA10 Card', 'Non PSA10 Card', 'PSA style 10 Card', 'PSA ready 10 Card'])
  ('does not convert negated/aspirational wording into grade evidence: %s', title => {
    expect(readSourceGradeClaimsFromTitle(title)).toEqual([]);
    expect(extractGradeFromTitle(title)).toBeNull();
    expect(determineExplicitGradingState({ title }).state).toBe('unknown');
    if (/^(?:Not|No|Without|Non)\s/i.test(title)) {
      const listing = { title };
      expect(filterListingsByTargetGradingState([listing], false)).toEqual([listing]);
      expect(annotateSoldComparableCandidate(listing, context(10)).evidenceReasons).toContain(providerMissingReason);
    }
  });

  it('retains independently affirmative holder evidence after a negated compact grader', () => {
    expect(filterListingsByTargetGradingState([{ title: 'Example Not PSA10 but slabbed' }], false)).toEqual([]);
    expect(filterListingsByTargetGradingState([{ title: 'Example PSA10' }], false)).toEqual([]);
    expect(filterListingsByTargetGradingState([{ title: 'Example not graded' }], false)).toHaveLength(1);
  });

  it('does not truncate a long certificate identifier when a separate real grade exists', () => {
    const title = 'Example PSA10000000 / WATA7.5';
    expect(readSourceGradeClaimsFromTitle(title).map(({ grade, grader }) => ({ grade, grader })))
      .toEqual([{ grade: '7.5', grader: 'WATA' }]);
    expect(extractGradeFromTitle(title)).toBe(7.5);
    expect(parseSourceGradeFromTitle('Example PSA10 cert #10000000')?.comparable.numeric).toBe('10');
  });

  it('keeps decimal strings exact in grade comparisons and material-conflict metadata', () => {
    const title = 'Example WATA7.5000000000000001';
    expect(parseSourceGradeFromTitle(title)?.comparable.numeric).toBe('7.5000000000000001');
    expect(compareComparableGrades('7.5', title, structured)).toBe('different');
    expect(findMaterialMetadataConflicts(targetMetadata('7.5', 'WATA', 'video_games'), { title })).toEqual([
      expect.objectContaining({ field: 'grade', candidateValue: '7.5000000000000001' }),
    ]);
    expect(findMaterialMetadataConflicts(targetMetadata('7.50', 'WATA', 'video_games'), { title: 'Example WATA7.5' })).toEqual([]);
  });
});

describe('compact grade title repair: independent claims and raw opposition', () => {
  it('retains each compact provider/labeled claim even when the aggregate has no winner', () => {
    const title = 'Example PSA10 CGC9 Grade 8';
    expect(readSourceGradeClaimsFromTitle(title).map(({ grade, grader }) => ({ grade, grader })))
      .toEqual([{ grade: '10', grader: 'PSA' }, { grade: '9', grader: 'CGC' }, { grade: '8', grader: null }]);
    expect(parseSourceGradeFromTitle(title)).toBeNull();
    expect(extractGradeFromTitle(title)).toBeNull();
    expect(determineExplicitGradingState({ isGraded: 'No', title }).state).toBe('conflicted');
  });

  it.each(['PSA10 / PSA9', 'PSA10 / Grade 9', 'PSA10+ / CGC10', 'PSA9OC / CGC9MC', 'PSA9OC / CGC9', 'PSA9 / CGC9 qualifier unknown'])
  ('does not select a plain first-grade winner for %s', title => {
    expect(readSourceGradeClaimsFromTitle(title).length).toBeGreaterThan(1);
    expect(parseSourceGradeFromTitle(title)).toBeNull();
    expect(extractGradeFromTitle(title)).toBeNull();
    expect(annotateSoldComparableCandidate({ title }, context(10)).evidenceReasons).toContain(gradeMissingReason);
  });

  it('retains the first source only when independent compact/spaced claims fully agree', () => {
    const title = 'Example PSA10.0 CGC 10 Grade 10';
    expect(parseSourceGradeFromTitle(title)).toEqual(readSourceGradeClaimsFromTitle(title)[0]);
    expect(extractGradeFromTitle(title)).toBe(10);
  });

  it.each(['Raw Example PSA10 CGC9', 'Ungraded Example PSA10 CGC9'])
  ('keeps whole-title grade guards while state observations retain opposition: %s', title => {
    expect(readSourceGradeClaimsFromTitle(title)).toEqual([]);
    expect(extractGradeFromTitle(title)).toBeNull();
    const state = determineExplicitGradingState({ isGraded: 'No', title });
    expect(state.state).toBe('conflicted');
    expect(state.witness).toBeUndefined();
    expect(state.observations.filter(observation => observation.kind === 'grade').map(observation => observation.value))
      .toEqual(['PSA 10', 'CGC 9']);
  });

  it('retains structured raw/title grade opposition and masked Raw identity safeguards', () => {
    expect(determineExplicitGradingState({ isGraded: false, title: 'Example PSA10' }).state).toBe('conflicted');
    expect(determineExplicitGradingState({ title: 'not graded PSA10' }).state).toBe('raw');
    const result = determineExplicitGradingState({ title: 'WWE Raw WATA7.5 PSA8.5' }, { category: 'video_games', identityValues: ['WWE Raw'] });
    expect(result.state).toBe('graded');
    expect(result.observations.map(observation => observation.value)).toEqual(['WATA 7.5', 'PSA 8.5']);
  });
});

describe('compact grade title repair: compatibility and no query changes', () => {
  it('preserves descriptive A++ softness only in shared Video Game consumers', () => {
    const title = 'Example WATA7.5-A++';
    expect(compareComparableGrades('7.5-A+', title, { ...structured, category: 'video_games' })).toBe('match');
    expect(compareComparableGrades('7.5-A+', title, { ...structured, category: 'sports_cards' })).toBe('different');
    expect(compareComparableGrades('7.5+', title, { ...structured, category: 'video_games' })).toBe('different');
    expect(parseSourceGradeFromTitle(title, { category: 'video_games' })?.comparable.qualifiers).toEqual([]);
    expect(parseSourceGradeFromTitle(title, { category: 'sports_cards' })?.comparable.qualifiers).toEqual(['A++']);
    expect(extractGradeFromTitle(title)).toBe(7.5);
    expect(extractGradeFromTitle('WATA7.5-A++ / PSA7.5-A+')).toBe(7.5);
    expect(parseSourceGradeFromTitle('WATA7.5-A++ / PSA7.5-A+', { category: 'video_games' })).not.toBeNull();
    expect(parseSourceGradeFromTitle('WATA7.5-A++ / PSA7.5-A+', { category: 'sports_cards' })).toBeNull();
  });

  it.each(['PSA10(XYZ)', 'PSA10 (OC XYZ)', 'WATA7.5-XYZ'])
  ('keeps unconsumed label junk uncertain rather than confirming %s', title => {
    const source = parseSourceGradeFromTitle(title);
    expect(source?.comparable.qualifierUncertain).toBe(true);
    expect(compareComparableGrades(source?.comparable.numeric, source?.comparable, structured)).toBe('unknown');
    expect(extractGradeFromTitle(title)).toBeNull();
  });

  it.each(['IGS9.5 (OC XYZ)', 'CAS9.5 (OC', 'PSAG9.5 (XYZ)', 'VHSDNA9.5++'])
  ('does not let a router-only provider confirm a truncated grade in %s', title => {
    expect(extractGradeFromTitle(title)).toBeNull();
    expect(annotateSoldComparableCandidate({ title }, context(9.5)).evidenceReasons).toContain(gradeMissingReason);
  });

  it('preserves spaced grader-pair, known coin designation and AFA display APIs', () => {
    expect(extractGradeFromTitle('Example NES WATA PSA 7.5')).toBe(7.5);
    expect(extractGradeFromTitle('Example NES WATA PSA7.5')).toBe(7.5);
    expect(extractGradeFromTitle('Example PCGS MS65+ PL')).toBe('MS65+');
    expect(extractGradeFromTitle('Example NGC PF69 DCAM')).toBe('PF69');
    expect(extractGradeFromTitle('Example CGC Graded (9.8-A++) VHS')).toBe(9.8);
    expect(extractGradeFromTitle('Example AFA Graded 8.0 New')).toBe(8);
    expect(extractGradeFromTitle('Example G1 AFA Graded Q60 MIB')).toBe('Q60');
    expect(extractGradeFromTitle('Example AFA C60')).toBe('C60');
    expect(filterListingsByGrade([{ title: 'Example G1 AFA Graded Q60 MIB' }], 60, 'vintage_toys', 'AFA')).toHaveLength(1);
    expect(parseSourceGradeFromTitle('AFA Q60', { category: 'coins' })).toBeNull();
    expect(parseSourceGradeFromTitle('PSA Q60', { category: 'vintage_toys' })).toBeNull();
  });

  it.each(['Transformers Megatron G1 AFA 60', 'Transformers Megatron G1 AFA60', 'Transformers Megatron G1 AFA Graded 60.0'])
    ('preserves ordinary numeric AFA grades with toy generation identity: %s', (title) => {
      expect(extractGradeFromTitle(title)).toBe(60);
      expect(annotateSoldComparableCandidate({ title }, context(60, 'AFA', 'vintage_toys')).evidenceReasons).not.toContain(gradeMissingReason);
      expect(filterListingsByGrade([{ title }, { title: 'Transformers Megatron G1 AFA70' }], 60, 'vintage_toys', 'AFA')).toEqual([{ title }]);
      expect(parseSourceGradeFromTitle('Example AFA G1', { category: 'vintage_toys' })?.comparable.designation).toBe('G');
    });

  it('leaves query extraction and query-building contracts unchanged', () => {
    expect(extractGradeFromQuery('Example PSA10')).toBeNull();
    expect(extractGradeFromQuery('Example PSA 10')).toBe(10);
    expect(extractGradeFromQuery('Example WATA 7.5')).toBe(7.5);
    expect(buildEbayBrowseQuery('Example PSA10')).toBe('Example PSA10');
    expect(buildEbayBrowseQuery('Example PSA 10', { preserveGrade: true })).toBe('Example PSA 10');
    expect(buildEbayBrowseQuery('Example PSA 10')).toBe('Example PSA');
    expect(buildSoldCompsQueryCandidates('Edge of the Spider-Verse #2 CGC 9.8')).toEqual([
      'Edge of the Spider-Verse #2 CGC', 'Edge of the Spider-Verse #2', 'Edge of the Spider-Verse #2 CGC 9.8',
      'Edge of Spider-Verse #2 CGC', 'Edge of Spider-Verse #2', 'Edge of Spider-Verse #2 CGC 9.8',
    ]);
  });
});
