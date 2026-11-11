import { describe, expect, it } from 'vitest';
import { determineExplicitGradingState, type ExplicitGradingState } from './testAiExplicitGradingState';

type Fixture = [string, unknown, ExplicitGradingState['state'], { title?: unknown; category?: string; identityValues?: readonly unknown[] }?];
const fixtures: Fixture[] = [
  ['missing', {}, 'unknown'], ['null input', null, 'unknown'],
  ['true boolean', { isGraded: true }, 'graded'], ['false boolean', { isGraded: false }, 'raw'],
  ['string No', { isGraded: 'No' }, 'raw'], ['string Yes', { graded: 'Yes' }, 'graded'],
  ['numeric zero boolean', { gradingStatus: 0 }, 'raw'], ['numeric one boolean', { gradingStatus: 1 }, 'graded'],
  ['normalized alias', { 'Is Graded': ' false ' }, 'raw'],
  ['status raw', { gradingStatus: 'Ungraded' }, 'raw'],
  ['state alias raw', { gradingState: 'Raw' }, 'raw'],
  ['named Raw product is not grading state', { title: 'WWE Raw Nintendo Xbox' }, 'unknown', { identityValues: ['WWE Raw'] }],
  ['Raw identity does not hide real grader', { title: 'WWE Raw PSA 9' }, 'graded', { category: 'video_games', identityValues: ['WWE Raw'] }],
  ['separate ungraded assertion remains evidence', { title: 'WWE Raw Ungraded' }, 'raw', { identityValues: ['WWE Raw'] }],
  ['unknown then factual No', { isGraded: 'Unknown', graded: 'No' }, 'raw'],
  ['root unknown nested No', { isGraded: 'Other', itemDetails: { isGraded: 'No' } }, 'raw'],
  ['opposed aliases', { isGraded: 'No', graded: true }, 'conflicted'],
  ['opposed duplicate normalized aliases', { isGraded: 'No', 'Is Graded': 'Yes' }, 'conflicted'],
  ['opposed wrappers', { normalizedStructuredMetadata: { isGraded: 'No' }, rawMetadata: { isGraded: true } }, 'conflicted'],
  ['opposed aspects', { aspects: [{ name: 'Is Graded', values: ['No', 'Yes'] }] }, 'conflicted'],
  ['JSON wrapper', { item_details: '{"Grading Status":"No"}' }, 'raw'],
  ['professional grade alone', { professionalGrade: 9 }, 'graded'],
  ['recognized structured grader alone', { certificationCompany: 'PSA' }, 'graded'],
  ['stale grade No', { isGraded: 'No', grade: '9' }, 'conflicted'],
  ['stale professional grade No', { isGraded: 'No', professionalGrade: 9 }, 'conflicted'],
  ['stale grader No', { isGraded: 'No', grader: 'CGC' }, 'conflicted'],
  ['native Video Game grade alone', { gameGrade: '9' }, 'graded', { category: 'video_games' }],
  ['native Video Game grade opposed to No', { isGraded: 'No', gameGrade: '9' }, 'conflicted', { category: 'video_games' }],
  ['native grade zero placeholder', { gameGrade: 0 }, 'unknown', { category: 'video_games' }],
  ['native grade zero with raw', { isGraded: 'No', gameGrade: '0.0' }, 'raw', { category: 'video_games' }],
  ['native grade unknown placeholder', { gameGrade: 'Unknown' }, 'unknown', { category: 'video_games' }],
  ['native grade alias ignored without category', { gameGrade: '9' }, 'unknown'],
  ['native grade alias ignored outside Video Games', { isGraded: 'No', gameGrade: '9' }, 'raw', { category: 'trading_cards' }],
  ['grade zero placeholder', { grade: 0 }, 'unknown'],
  ['raw with grade zero', { isGraded: 'No', grade: '0.0' }, 'raw'],
  ['unknown grader and zero', { grader: 'Other', grade: 0 }, 'unknown'],
  ['title raw', { title: 'Pikachu Raw' }, 'raw'], ['title ungraded', { title: 'Comic Ungraded' }, 'raw'],
  ['title not graded', {}, 'raw', { title: 'Card notgraded' }],
  ['title graded', { title: 'Professionally Graded Card' }, 'graded'],
  ['title slabbed', { title: 'Slabbed Comic' }, 'graded'],
  ['title numeric grader', { title: 'PSA 9 Pikachu' }, 'graded'],
  ['title labeled grade', { title: 'Comic Grade 9.8' }, 'graded'],
  ['standalone title grader', { title: 'PSA Pikachu' }, 'unknown'],
  ['bare title numbers', { title: 'Card 1999 #9' }, 'unknown'],
  ['structure raw title grade', { isGraded: 'No', title: 'PSA 9 Card' }, 'conflicted'],
  ['structure graded title raw', { graded: true, title: 'Raw Card' }, 'conflicted'],
  ['title raw with numeric grader', { title: 'Raw Card PSA 9' }, 'conflicted'],
  ['No with opposed actual title grades', { isGraded: 'No', title: 'Tangible Collectible PSA 9 CGC 8' }, 'conflicted'],
  ['Raw with opposed actual title grades', { title: 'Tangible Collectible Raw PSA 9 CGC 8' }, 'conflicted'],
  ['No with incomplete qualifier agreement', { isGraded: 'No', title: 'Tangible Collectible PSA 9 OC CGC 9' }, 'conflicted'],
  ['No and Raw with opposed actual title grades', { isGraded: 'No', title: 'Tangible Collectible Raw PSA 9 CGC 8' }, 'conflicted'],
  ['known Raw identity with opposed actual title grades', { isGraded: 'No', title: 'WWE Raw PSA 9 CGC 8' }, 'conflicted',
    { category: 'video_games', identityValues: ['WWE Raw'] }],
  ['known Raw identity preserves grade evidence only', { title: 'WWE Raw PSA 9 CGC 8' }, 'graded',
    { category: 'video_games', identityValues: ['WWE Raw'] }],
  ['uncertain Raw title', { title: 'Tangible Collectible Raw?' }, 'unknown'],
  ['uncertain Ungraded title', { title: 'Tangible Collectible Ungraded?' }, 'unknown'],
  ['uncertain notgraded title', { title: 'Tangible Collectible notgraded?' }, 'unknown'],
  ['uncertain raw with structured No', { isGraded: 'No', title: 'Tangible Collectible Raw?' }, 'raw'],
  ['uncertain ungraded with structured Yes', { graded: true, title: 'Tangible Collectible Ungraded?' }, 'graded'],
  ['uncertain raw with independent structured grade', { grade: '9', title: 'Tangible Collectible Raw?' }, 'graded'],
  ['uncertain raw with unknown and zero stays unknown', { isGraded: 'Unknown', grade: '0', title: 'Tangible Collectible Raw?' }, 'unknown'],
  ['uncertain raw does not hide independent title grade', { title: 'Raw? Tangible Collectible PSA 9' }, 'graded'],
  ['No with uncertain raw and independent title grades', { isGraded: 'No', title: 'Raw? Tangible Collectible PSA 9 CGC 8' }, 'conflicted'],
  ['title opposing words', { title: 'Raw Graded Card' }, 'conflicted'],
  ['negated graded title', { title: 'Card not graded' }, 'raw'],
  ['negated slabbed title', { title: 'Card not slabbed' }, 'unknown'],
  ['negated title grader', { title: 'Not PSA 9 Card' }, 'unknown'],
  ['grader ready title', { title: 'PSA ready Card' }, 'unknown'],
  ['graded style title', { title: 'Graded style Card' }, 'unknown'],
  ['unrelated numbers', { condition: 9, year: 1999, cardNumber: 9 }, 'unknown'],
  ['ignored description and arbitrary object', { description: 'Raw', arbitrary: { isGraded: false } }, 'unknown'],
  ['ignored diagnostics and source text', { sourceText: 'Raw', visualEvidence: { graded: true }, metadataFieldComparisons: [{ graded: true }] }, 'unknown'],
  ...['Unknown', 'Other', 'N/A', 'null', null].map(value => [`placeholder ${value}`, { isGraded: value }, 'unknown'] as Fixture),
  ...['Loose', 'Used', 'Sealed', 'CIB'].map(title => [`no packaging inference ${title}`, { title, condition: title }, 'unknown'] as Fixture),
];

describe('determineExplicitGradingState', () => {
  it.each(fixtures)('%s', (_name, input, state, options) => {
    const result = determineExplicitGradingState(input, options);
    expect(result.state).toBe(state);
    if (state === 'unknown' || state === 'conflicted') expect(result.witness).toBeUndefined();
    else expect(result.observations).toContainEqual(expect.objectContaining({ ...result.witness, state }));
  });
  it('keeps raw/raw known, but never turns unknown/factual No into a match', () => {
    expect([determineExplicitGradingState({ isGraded: false }).state, determineExplicitGradingState({ graded: 'No' }).state]).toEqual(['raw', 'raw']);
    expect([determineExplicitGradingState({}).state, determineExplicitGradingState({ isGraded: 'No' }).state]).toEqual(['unknown', 'raw']);
  });
  it('selects the actual structured alias before a title witness', () => {
    expect(determineExplicitGradingState({ graded: false, isGraded: 'Unknown', title: 'Raw Card' }).witness)
      .toEqual({ field: 'graded', source: 'structured', value: 'false' });
    expect(determineExplicitGradingState({ isGraded: 'Unknown', title: 'Ungraded Card' }).witness)
      .toEqual({ field: 'title', source: 'title', value: 'Ungraded' });
  });
  it('retains each real title-grade observation alongside the original raw evidence', () => {
    const result = determineExplicitGradingState({ isGraded: 'No', title: 'Tangible Collectible Raw PSA 9 CGC 8' });
    expect(result.state).toBe('conflicted');
    expect(result.witness).toBeUndefined();
    expect(result.observations).toEqual([
      { field: 'isGraded', source: 'structured', value: 'No', state: 'raw', kind: 'explicit' },
      { field: 'title', source: 'title', value: 'Raw', state: 'raw', kind: 'explicit' },
      { field: 'title', source: 'title', value: 'PSA 9', state: 'graded', kind: 'grade' },
      { field: 'title', source: 'title', value: 'CGC 8', state: 'graded', kind: 'grade' },
    ]);
  });
  it('masks only known Raw identity while retaining opposed grade observations', () => {
    const result = determineExplicitGradingState({ title: 'WWE Raw PSA 9 CGC 8' },
      { category: 'video_games', identityValues: ['WWE Raw'] });
    expect(result.state).toBe('graded');
    expect(result.observations).toEqual([
      { field: 'title', source: 'title', value: 'PSA 9', state: 'graded', kind: 'grade' },
      { field: 'title', source: 'title', value: 'CGC 8', state: 'graded', kind: 'grade' },
    ]);
  });
  it.each(['video_games', 'Video Games', 'VIDEO-GAMES', 'videoGames', ' Video Games '])
  ('recognizes native gameGrade only in the normalized Video Game category %s', category => {
    const result = determineExplicitGradingState({ isGraded: 'No', gameGrade: '9' }, { category });
    expect(result).toMatchObject({ state: 'conflicted' });
    expect(result.witness).toBeUndefined();
    expect(result.observations).toContainEqual({ field: 'gameGrade', source: 'structured',
      value: '9', state: 'graded', kind: 'grade' });
  });
  it('preserves the actual native alias and wrapper in its structured winner', () => {
    const result = determineExplicitGradingState({ details: { 'Game Grade': '9' } }, { category: 'Video Games' });
    expect(result.witness).toEqual({ field: 'details.Game Grade', source: 'structured', value: '9' });
    expect(determineExplicitGradingState({ aspects: [{ name: 'Game Grade', values: ['0', '9'] }], isGraded: 'No' },
      { category: 'video_games' }).observations).toEqual(expect.arrayContaining([
      { field: 'aspects[0].Game Grade.values', source: 'structured', value: '0', state: 'unknown', kind: 'grade' },
      { field: 'aspects[0].Game Grade.values', source: 'structured', value: '9', state: 'graded', kind: 'grade' },
    ]));
  });
  it.each(['Raw', 'Ungraded', 'not graded', 'Graded', 'Slabbed', 'Encapsulated'])
  ('rejects the same small uncertainty suffixes after %s', token => {
    for (const suffix of ['?', ' ?', ' style', ' like', ' candidate', ' ready', ' possible', ' maybe?']) {
      const result = determineExplicitGradingState({ title: `Tangible Collectible ${token}${suffix}` });
      expect(result.state).toBe('unknown');
      expect(result.witness).toBeUndefined();
      expect(result.observations).toEqual([]);
    }
  });
  it('preserves affirmative raw statements, negation and valid opposition', () => {
    for (const title of ['Tangible Collectible Ungraded', 'Tangible Collectible not graded', 'Tangible Collectible notgraded']) {
      expect(determineExplicitGradingState({ title }).state).toBe('raw');
    }
    expect(determineExplicitGradingState({ title: 'Tangible Collectible not Raw' }).state).toBe('unknown');
    expect(determineExplicitGradingState({ title: 'Tangible Collectible not Ungraded' }).state).toBe('unknown');
    expect(determineExplicitGradingState({ title: 'Ungraded PSA 9' }).state).toBe('conflicted');
    expect(determineExplicitGradingState({ title: 'not graded PSA 9' }).state).toBe('raw');
  });
  it('preserves contrary originals without mutating frozen provider metadata', () => {
    const input = Object.freeze({ isGraded: 'No', details: Object.freeze({ isGraded: 'Yes' }) });
    const result = determineExplicitGradingState(input);
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'isGraded', value: 'No', state: 'raw' }),
      expect.objectContaining({ field: 'details.isGraded', value: 'Yes', state: 'graded' }),
    ]));
    expect(input.details.isGraded).toBe('Yes');
  });
  it('handles cycles and fails unknown without a witness when bounds hide observations', () => {
    const cycle: Record<string, unknown> = {}; cycle.metadata = cycle;
    expect(determineExplicitGradingState(cycle).state).toBe('unknown');
    expect(determineExplicitGradingState({ aspects: Array.from({ length: 257 }, () => ({ name: 'isGraded', value: 'No' })) }))
      .toMatchObject({ state: 'unknown', truncated: true });
  });
  it('does not award a witness when title-claim or uncertain-raw masking bounds are exhausted', () => {
    for (const title of ['PSA 9 '.repeat(2050), 'Raw? '.repeat(2050)]) {
      const result = determineExplicitGradingState({ title });
      expect(result).toMatchObject({ state: 'unknown', truncated: true });
      expect(result.witness).toBeUndefined();
    }
  });
});

import { parseSourceGradeFromTitle, readSourceGradeClaimsFromTitle } from './testAiGradeComparison';

describe('readSourceGradeClaimsFromTitle', () => {
  it('retains every opposed valid grader and labeled claim without choosing a grade', () => {
    const title = 'Tangible Collectible PSA 9 CGC 8 Grade 7';
    expect(readSourceGradeClaimsFromTitle(title).map(({ grade, grader }) => ({ grade, grader })))
      .toEqual([{ grade: '9', grader: 'PSA' }, { grade: '8', grader: 'CGC' }, { grade: '7', grader: null }]);
    expect(parseSourceGradeFromTitle(title)).toBeNull();
  });

  it.each([
    'Tangible Collectible Raw PSA 9 CGC 8',
    'Tangible Collectible Ungraded PSA 9',
    'Not PSA 9 CGC 8',
    'Tangible Collectible no grade PSA 9',
    'Tangible Collectible grade unknown CGC 8',
    'PSA style CGC 8',
  ])('preserves the whole-title guard for %s', title => {
    expect(readSourceGradeClaimsFromTitle(title)).toEqual([]);
    expect(parseSourceGradeFromTitle(title)).toBeNull();
  });

  it('keeps the existing per-claim negation filter', () => {
    expect(readSourceGradeClaimsFromTitle('Fake PSA 9 CGC 8').map(({ grade, grader }) => ({ grade, grader })))
      .toEqual([{ grade: '8', grader: 'CGC' }]);
    expect(parseSourceGradeFromTitle('Fake PSA 9 CGC 8')).toMatchObject({ grade: '8', grader: 'CGC' });
  });

  it('retains designation, plus and qualifiers rather than reducing them to a number', () => {
    const claims = readSourceGradeClaimsFromTitle('PCGS MS65+ PL');
    expect(claims.length).toBeGreaterThan(0);
    for (const claim of claims) {
      expect(claim.comparable).toEqual({ numeric: '65', designation: 'MS', plus: true,
        qualifiers: ['PL'], qualifierUncertain: false });
    }
    expect(parseSourceGradeFromTitle('PCGS MS65+ PL')).toMatchObject({ grade: 'MS65+ PL', grader: 'PCGS' });
  });
  it('normalizes a CGC numeric title grade without an invalid letter suffix', () => {
    const parsed = parseSourceGradeFromTitle('Canon CGC 8.0 A VHS Tape', { category: 'movies' });
    expect(parsed).toMatchObject({ grade: '8.0', grader: 'CGC', comparable: { numeric: '8', designation: null, qualifiers: [] } });
  });
  it('preserves valid A-plus title suffixes for video-game grading', () => {
    const parsed = parseSourceGradeFromTitle('Game WATA 9 A+', { category: 'video_games' });
    expect(parsed).toMatchObject({ grade: '9 A+', grader: 'WATA', comparable: { numeric: '9', qualifiers: [] } });
  });

  it('retains incomplete qualifiers without manufacturing aggregate agreement', () => {
    const claims = readSourceGradeClaimsFromTitle('PSA 9 (OC) CGC 9');
    expect(claims.map(claim => claim.comparable.qualifiers)).toEqual([['OC'], []]);
    expect(parseSourceGradeFromTitle('PSA 9 (OC) CGC 9')).toBeNull();
    expect(readSourceGradeClaimsFromTitle('PSA 9 qualifier unknown CGC 9')[0].comparable.qualifierUncertain).toBe(true);
    expect(parseSourceGradeFromTitle('PSA 9 qualifier unknown CGC 9')).toBeNull();
    expect(readSourceGradeClaimsFromTitle('PSA 9 (mystery)')[0].comparable.qualifierUncertain).toBe(true);
  });

  it('preserves the existing category-scoped AFA Q/C prefix rules', () => {
    const title = 'AFA Q85 AFA C80';
    expect(readSourceGradeClaimsFromTitle(title, { category: 'Vintage Toys' })
      .map(({ grade, grader }) => ({ grade, grader })))
      .toEqual([{ grade: '85', grader: 'AFA' }, { grade: '80', grader: 'AFA' }]);
    expect(parseSourceGradeFromTitle(title, { category: 'vintage_toys' })).toBeNull();
    expect(readSourceGradeClaimsFromTitle(title, { category: 'coins' })).toEqual([]);
    expect(readSourceGradeClaimsFromTitle('CGC Q85', { category: 'vintage_toys' })).toEqual([]);
  });

  it('keeps unlabelled toy generation codes out of grade claims', () => {
    expect(readSourceGradeClaimsFromTitle('Optimus Prime G1', { category: 'vintage_toys' })).toEqual([]);
    expect(parseSourceGradeFromTitle('Optimus Prime G1', { category: 'vintage_toys' })).toBeNull();
    expect(parseSourceGradeFromTitle('AFA G1', { category: 'vintage_toys' })).toMatchObject({ grade: 'G1', grader: 'AFA' });
  });

  it.each(['PSA 0', 'PSA 9++', 'PSA 9A123', 'Card 1999 #9', 'PSA Card'])
  ('does not weaken numeric or grade-authority requirements for %s', title => {
    expect(readSourceGradeClaimsFromTitle(title)).toEqual([]);
    expect(parseSourceGradeFromTitle(title)).toBeNull();
  });
});

describe('parseSourceGradeFromTitle aggregate controls', () => {
  it('keeps the first original claim only when all parsed grades match', () => {
    const title = 'PSA 9.0 CGC 9 Grade 9';
    expect(parseSourceGradeFromTitle(title)).toEqual(readSourceGradeClaimsFromTitle(title)[0]);
    expect(parseSourceGradeFromTitle(title)).toMatchObject({ grade: '9.0', grader: 'PSA',
      comparable: { numeric: '9', designation: null, plus: false, qualifiers: [], qualifierUncertain: false } });
  });

  it.each(['PSA 9 CGC 8', 'PSA 9+ CGC 9', 'PSA 9 OC CGC 9 MC', 'PSA 9 OC CGC 9'])
  ('still rejects opposed or incomplete aggregate claims for %s', title => {
    expect(readSourceGradeClaimsFromTitle(title).length).toBeGreaterThan(1);
    expect(parseSourceGradeFromTitle(title)).toBeNull();
  });

  it('retains the existing Video Game soft-suffix contract', () => {
    expect(parseSourceGradeFromTitle('WATA 9 A+ VGA 9', { category: 'Video Games' }))
      .toMatchObject({ grade: '9 A+', grader: 'WATA', comparable: { numeric: '9', qualifiers: [] } });
    expect(parseSourceGradeFromTitle('WATA 9 A+ VGA 9', { category: 'trading_cards' })).toBeNull();
  });
});
