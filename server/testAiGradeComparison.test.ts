import { describe, expect, it } from 'vitest';
import { compareComparableGrades, findStructuredGradeConflict, parseComparableGrade, parseSourceGradeFromTitle } from '../shared/testAiGradeComparison';
import { findMaterialMetadataConflicts } from '../shared/testAiMetadataConflict';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';

const structured = { allowBareNumeric: true };
const metadata = (category: string, grade: string) => `title=Example;category=${category};itemType=single_item;grade=${grade};certificationCompany=PCGS;fullItemDetails={}`;

function specialist(category: string, grade: string, observed: unknown) {
  return normalizeTestAiEvidence({ title: 'Example', category, grade }, [
    { id: 'cert', label: 'Certification', kind: 'certification', status: 'success', fields: { Grade: observed } },
  ]);
}

describe('Stage 4 exact comparable grade parsing', () => {
  it.each(['7.50', '007.5000', '(7.500)'])('canonicalizes %s without rounding', value => {
    expect(parseComparableGrade(value, structured)?.numeric).toBe('7.5');
    expect(compareComparableGrades(value, '7.5', structured)).toBe('match');
  });
  it('does not collapse significant decimals through floating point or round to a category query grade', () => {
    expect(compareComparableGrades('7.5000000000000001', '7.5', structured)).toBe('different');
    expect(compareComparableGrades('7.51', '7.5', structured)).toBe('different');
    expect(parseComparableGrade('7.50', { ...structured, category: 'sports_cards' })?.numeric).toBe('7.5');
  });
  it.each(['0', '0.0', '-1', 'Unknown', 'Other', 'Raw', 'Ungraded', 'null', 'Infinity', 'false'])('does not parse absent/nonpositive grade %s', value => {
    expect(parseComparableGrade(value, structured)).toBeNull();
  });
  it('requires permission for bare numeric structured facts and rejects unlabeled title years/issues', () => {
    expect(parseComparableGrade('7.5')).toBeNull();
    expect(parseComparableGrade('7.5', structured)).toEqual({ numeric: '7.5', designation: null, plus: false, qualifiers: [], qualifierUncertain: false });
    expect(parseSourceGradeFromTitle('Zelda NES 1986 7.5 cartridge')).toBeNull();
    expect(parseSourceGradeFromTitle('Amazing Spider-Man #65 1965')).toBeNull();
  });
  it('preserves numeric plus in every category', () => {
    expect(parseComparableGrade('MS65+', structured)).toEqual({ numeric: '65', designation: 'MS', plus: true, qualifiers: [], qualifierUncertain: false });
    expect(compareComparableGrades('MS65+', 'MS65', structured)).toBe('different');
    expect(compareComparableGrades('9.8+', '9.8', { ...structured, category: 'video_games' })).toBe('different');
  });
  it('preserves meaningful designation prefix and does not invent a missing designation', () => {
    expect(compareComparableGrades('MS65', 'PF65', structured)).toBe('different');
    expect(compareComparableGrades('MS65', '65', structured)).toBe('unknown');
    expect(compareComparableGrades('MS65', 'MS65.0', structured)).toBe('match');
  });
  it.each([
    ['MS65 PL', 'MS65 DMPL'], ['PR69 CAM', 'PR69 DCAM'], ['9 OC', '9 MC'],
    ['9 ST', '9 PD'], ['MS65 RD', 'MS65 RB'], ['MS65 RB', 'MS65 BN'],
  ])('preserves qualifier distinction %s / %s', (left, right) => {
    expect(compareComparableGrades(left, right, structured)).toBe('different');
  });
  it('matches equivalent compact/parenthesized qualifiers with stable token ordering', () => {
    expect(compareComparableGrades('MS65PL', 'MS65 (PL)', structured)).toBe('match');
    expect(compareComparableGrades('MS65 RD PL', 'MS65 PL/RD', structured)).toBe('match');
    expect(parseComparableGrade('9 (OC)', structured)?.qualifiers).toEqual(['OC']);
  });
  it('does not fabricate qualifier completeness or unknown qualifier confirmation', () => {
    expect(compareComparableGrades('MS65 PL', 'MS65', structured)).toBe('unknown');
    expect(compareComparableGrades('MS65 RD PL', 'MS65 PL', structured)).toBe('unknown');
    expect(compareComparableGrades('9 OC', '9 Unknown', structured)).toBe('unknown');
    expect(compareComparableGrades('9 Unknown', '9 Unknown', structured)).toBe('unknown');
    expect(compareComparableGrades('MS65', 'MS65 XYZ', structured)).toBe('unknown');
  });
  it('limits descriptive A suffix softness to Video Games, not numeric plus or card/coin qualifiers', () => {
    for (const category of ['video_games', 'Video Games', 'VideoGames']) {
      expect(compareComparableGrades('9.8-A+', '9.80-A+++', { ...structured, category })).toBe('match');
      expect(compareComparableGrades('9.8-A++', '9.8', { ...structured, category })).toBe('match');
      expect(compareComparableGrades('9.8+ A++', '9.8 A+', { ...structured, category })).toBe('different');
      expect(compareComparableGrades('9.8 OC', '9.8 MC', { ...structured, category })).toBe('different');
    }
    expect(compareComparableGrades('9.8-A+', '9.8-A++', { ...structured, category: 'sports_cards' })).toBe('different');
    expect(compareComparableGrades('9.8-A+', '9.8', structured)).toBe('unknown');
  });
});

describe('Stage 4 separate title-grade channel', () => {
  it('recognizes parenthesized graders, exact decimal and coin designation/plus/qualifiers', () => {
    expect(parseSourceGradeFromTitle('Zelda CGC Graded (9.8-A++) NES', { category: 'video_games' })).toEqual(expect.objectContaining({ grader: 'CGC', grade: '9.8-A++', comparable: expect.objectContaining({ numeric: '9.8', qualifiers: [] }) }));
    expect(parseSourceGradeFromTitle('Zelda WATA 7.50 Sealed', { category: 'video_games' })?.comparable.numeric).toBe('7.5');
    expect(parseSourceGradeFromTitle('Morgan PCGS MS65+ PL Silver Dollar')).toEqual(expect.objectContaining({ grader: 'PCGS', comparable: expect.objectContaining({ numeric: '65', designation: 'MS', plus: true, qualifiers: ['PL'] }) }));
    expect(parseSourceGradeFromTitle('Proof NGC PF69 DCAM coin')?.comparable.qualifiers).toEqual(['DCAM']);
    expect(parseSourceGradeFromTitle('Comic grade: 7.50')?.comparable.numeric).toBe('7.5');
  });
  it('retains actual non-game grade qualifiers in observed title text', () => {
    expect(parseSourceGradeFromTitle('PSA 9 (OC) Baseball Card')?.comparable.qualifiers).toEqual(['OC']);
    expect(parseSourceGradeFromTitle('PCGS MS65DMPL Morgan')?.comparable.qualifiers).toEqual(['DMPL']);
  });
  it.each(['PSA 9 (XYZ) Baseball Card', 'PSA 9(XYZ) Baseball Card', 'PSA 9 (OC XYZ) Baseball Card', 'PSA 9 (OC) (XYZ) Baseball Card'])('does not confirm a truncated grade from unconsumed qualifier parentheses: %s', title => {
    const source = parseSourceGradeFromTitle(title, { category: 'sports_cards' });
    expect(source?.comparable.qualifierUncertain).toBe(true);
    expect(compareComparableGrades('9', source?.comparable, { ...structured, category: 'sports_cards' })).toBe('unknown');
    expect(compareComparableGrades('9 OC', source?.comparable, { ...structured, category: 'sports_cards' })).toBe('unknown');
  });
  it.each([
    'PSA 9 / PSA 9 (OC) Baseball Card', 'PSA 9 (OC) / PSA 9 Baseball Card',
    'PSA 9 / PSA 9 qualifier unknown card', 'PSA 9 qualifier unknown / PSA 9 card',
    'PSA 9 / PSA 9 (XYZ) card', 'PSA 9 (XYZ) / PSA 9 card',
  ])('does not select a plain-grade winner from multiple uncertain title claims: %s', title => {
    const source = parseSourceGradeFromTitle(title, { category: 'sports_cards' });
    expect(source).toBeNull();
    expect(compareComparableGrades('9', source?.comparable, { ...structured, category: 'sports_cards' })).toBe('unknown');
  });
  it('keeps ordinary trailing title words and fully consumed qualifier/outer parentheses as positive controls', () => {
    const plain = parseSourceGradeFromTitle('PSA 9 Baseball Card', { category: 'sports_cards' });
    expect(plain?.comparable.qualifierUncertain).toBe(false);
    expect(compareComparableGrades('9', plain?.comparable, structured)).toBe('match');
    const qualified = parseSourceGradeFromTitle('PSA 9 (OC) / PSA 9(OC) Baseball Card', { category: 'sports_cards' });
    expect(qualified?.comparable.qualifierUncertain).toBe(false);
    expect(compareComparableGrades('9 OC', qualified?.comparable, structured)).toBe('match');
    expect(compareComparableGrades('9', qualified?.comparable, structured)).toBe('unknown');
    expect(compareComparableGrades('9', parseSourceGradeFromTitle('PSA (9) Baseball Card')?.comparable, structured)).toBe('match');
    expect(compareComparableGrades('9.8', parseSourceGradeFromTitle('CGC Graded (9.8-A++) NES', { category: 'video_games' })?.comparable, { ...structured, category: 'video_games' })).toBe('match');
  });
  it.each([
    'Ungraded Zelda PSA 9.8', 'Not graded PSA 9 card', 'Not PSA 9 card',
    'Raw PCGS MS65 Morgan', 'No grade 9 coin', 'PSA-style 9 card',
    'CGC ready 9.8 comic', 'PSA 9.8XYZ card', 'PCGS MS65XYZ coin',
  ])('does not fabricate grade evidence from negated/ambiguous text %s', title => {
    expect(parseSourceGradeFromTitle(title)).toBeNull();
  });
  it('does not choose a title winner from opposing explicit grade claims', () => {
    expect(parseSourceGradeFromTitle('PSA 7.5 / PSA 8.5 card')).toBeNull();
    expect(parseSourceGradeFromTitle('PCGS MS65 PL / NGC MS65 DMPL coin')).toBeNull();
  });
  it('keeps known missing qualifier claims uncertain in title grade evidence', () => {
    const source = parseSourceGradeFromTitle('PSA 9 qualifier unknown card');
    expect(source?.comparable.qualifierUncertain).toBe(true);
    expect(compareComparableGrades('9', source?.comparable, structured)).toBe('unknown');
  });
  it('strips only presentation annotations, never actual qualifier parentheses', () => {
    expect(compareComparableGrades('7.50', '7.5 (inferred from title)', structured)).toBe('match');
    expect(compareComparableGrades('9 OC', '9 (OC) (detected in title)', structured)).toBe('match');
  });
});

describe('Stage 4 pure independent structured-grade conflict reader', () => {
  it.each(['numericGrade', 'finalGrade', 'professionalGrade'])('checks contrary %s after a matching primary grade', alias => {
    for (const details of [{ grade: '7.50', [alias]: '8.5' }, { [alias]: '8.5', grade: '7.50' }]) {
      expect(findStructuredGradeConflict('7.5', Object.freeze(details), { category: 'comics' })).toBe('8.5');
    }
    expect(findStructuredGradeConflict('7.50', { grade: '7.5', [alias]: '7.500' }, { category: 'comics' })).toBeNull();
    expect(findStructuredGradeConflict('7.5', { grade: '7.5', [alias]: 'Unknown' }, { category: 'comics' })).toBeNull();
  });
  it('reads case/punctuation aliases and Other/custom without treating unknown as agreement', () => {
    expect(findStructuredGradeConflict('7.5', { grade: '7.5', 'NUMERIC GRADE': '8.5' })).toBe('8.5');
    expect(findStructuredGradeConflict('7.5', { grade: '7.5', finalGrade: 'Other', customFinalGrade: '8.5' })).toBe('8.5');
    expect(findStructuredGradeConflict('9 OC', { grade: '9 OC', numericGrade: '9 Unknown' })).toBeNull();
    expect(findStructuredGradeConflict('9', { grade: 'Unknown', finalGrade: 'Other' })).toBeNull();
  });
  it('preserves exact numeric, plus, designation and qualifier differences in later aliases', () => {
    for (const [target, opposing] of [['7.5', '7.5000000000000001'], ['MS65+', 'MS65'], ['MS65 PL', 'MS65 DMPL'], ['PR69 CAM', 'PR69 DCAM'], ['MS65', 'PF65']]) {
      expect(findStructuredGradeConflict(target, { grade: target, numericGrade: opposing }, { category: 'coins' })).toBe(opposing);
    }
    expect(findStructuredGradeConflict('9.8-A+', { grade: '9.8-A+', finalGrade: '9.8-A++' }, { category: 'video_games' })).toBeNull();
    expect(findStructuredGradeConflict('9.8+', { grade: '9.8+', finalGrade: '9.8' }, { category: 'video_games' })).toBe('9.8');
  });
});

describe('Stage 4 actual material grade conflict and specialist functions', () => {
  it('matches structured/title decimal formats without discarding numeric contradictions', () => {
    expect(findMaterialMetadataConflicts(metadata('comics', '7.50'), { title: 'Comic CGC Graded (7.5)', grade: '7.5' })).toEqual([]);
    expect(findMaterialMetadataConflicts(metadata('comics', '7.50'), { title: 'Comic CGC 7.5', grade: '8.5' })).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'grade', candidateValue: '8.5' })]));
    expect(findMaterialMetadataConflicts(metadata('comics', '7.50'), { title: 'Comic CGC 8.5', grade: '7.5' })).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'grade', candidateValue: '8.5' })]));
  });
  it('retains every contrary meaningful grade alias from known wrappers despite matching title and primary grade', () => {
    const candidate = Object.freeze({ title: 'Example CGC 7.5', grade: '7.50', details: Object.freeze({ numericGrade: '8.5', finalGrade: '7.500', professionalGrade: '7.5' }) });
    expect(findMaterialMetadataConflicts(metadata('comics', '7.5'), candidate)).toEqual([
      expect.objectContaining({ field: 'grade', targetValue: '7.5', candidateValue: '8.5' }),
    ]);
    const targetWithAlias = 'title=Example;category=comics;itemType=single_item;certificationCompany=CGC;fullItemDetails={"numericGrade":"7.50"}';
    expect(findMaterialMetadataConflicts(targetWithAlias, { title: 'Example CGC 7.5', grade: '7.5', numericGrade: '7.500' })).toEqual([]);
    expect(findMaterialMetadataConflicts(targetWithAlias, { title: 'Example CGC 7.5', grade: '8.5' })).toEqual([
      expect.objectContaining({ field: 'grade', targetValue: '7.50', candidateValue: '8.5' }),
    ]);
  });
  it('retains structured and separately labeled title plus/qualifier/prefix conflicts', () => {
    for (const [target, candidate] of [['MS65+', 'MS65'], ['MS65 PL', 'MS65 DMPL'], ['PR69 CAM', 'PR69 DCAM'], ['MS65', 'PF65']]) {
      expect(findMaterialMetadataConflicts(metadata('coins', target), { title: `PCGS ${target}`, grade: candidate })).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'grade' })]));
      expect(findMaterialMetadataConflicts(metadata('coins', target), { title: `PCGS ${candidate}`, grade: target })).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'grade' })]));
    }
  });
  it('does not turn missing qualifiers/placeholder facts into false conflicts or confirmations', () => {
    expect(findMaterialMetadataConflicts(metadata('coins', 'MS65 PL'), { title: 'Morgan coin', grade: 'Unknown' })).toEqual([]);
    expect(findMaterialMetadataConflicts(metadata('coins', 'MS65 PL'), { title: 'PCGS MS65', grade: 'MS65' })).toEqual([]);
  });
  it('keeps Video Games A suffix soft but true numeric plus hard', () => {
    expect(findMaterialMetadataConflicts(metadata('video_games', '9.8-A++'), { title: 'Zelda CGC Graded (9.8-A+)', grade: '9.80-A+++' })).toEqual([]);
    expect(findMaterialMetadataConflicts(metadata('video_games', '9.8+'), { title: 'Zelda CGC 9.8 A++', grade: '9.8' })).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'grade' })]));
  });
  it('does not erase plus punctuation in separate non-game qualifier fields', () => {
    const target = (category: string) => `title=Example;category=${category};grade=9.8;fullItemDetails={"gradeQualifier":"A+"}`;
    expect(findMaterialMetadataConflicts(target('sports_cards'), { grade: '9.8', gradeQualifier: 'A++' })).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'gradeQualifier' })]));
    expect(findMaterialMetadataConflicts(target('video_games'), { grade: '9.8', gradeQualifier: 'A++' })).toEqual([]);
    expect(findMaterialMetadataConflicts(target('sports_cards'), { grade: '9.8', gradeQualifier: 'Unknown' })).toEqual([]);
  });
  it('aligns specialist 7.50/7.5 and preserves plus/qualifier review flags', () => {
    const match = specialist('comics', '7.50', '7.5');
    expect(match.reviewFlags).toEqual([]);
    expect(match.alignedSources).toEqual([expect.objectContaining({ fields: ['Grade'] })]);
    for (const [target, observed] of [['MS65+', 'MS65'], ['MS65 PL', 'MS65 DMPL'], ['PR69 CAM', 'PR69 DCAM']]) {
      expect(specialist('coins', target, observed).reviewFlags).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'material', field: 'Grade' })]));
    }
  });
  it.each(['PSA 9 (XYZ) Baseball Card', 'PSA 9 / PSA 9 (OC) Baseball Card', 'PSA 9 (OC) / PSA 9 Baseball Card'])('keeps uncertain title-grade observations reviewable in the actual specialist summary: %s', observed => {
    const summary = specialist('sports_cards', '9', observed);
    expect(summary.alignedSources).toEqual([]);
    expect(summary.reviewFlags).toEqual([expect.objectContaining({ kind: 'material', field: 'Grade', sourceId: 'cert' })]);
    expect(specialist('sports_cards', '9', 'PSA 9 Baseball Card').reviewFlags).toEqual([]);
  });
  it('never claims specialist grade alignment when required qualifier information is absent', () => {
    const summary = specialist('coins', 'MS65 PL', 'MS65');
    expect(summary.alignedSources).toEqual([]);
    expect(summary.reviewFlags).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'Grade' })]));
    expect(specialist('coins', 'MS65', 'Unknown').reviewFlags).toEqual([]);
  });
});


describe('existing AFA Vintage Toys title-prefix compatibility', () => {
  it('normalizes Q60 and C60 titles to the same exact numeric grade only for AFA Vintage Toys', () => {
    for (const prefix of ['Q', 'C']) {
      const title = parseSourceGradeFromTitle(`Transformers AFA Graded ${prefix}60`, { category: 'vintage_toys' });
      expect(title?.grade).toBe('60');
      expect(compareComparableGrades('60.00', title?.comparable, { allowBareNumeric: true, category: 'vintage_toys' })).toBe('match');
    }
  });
  it('does not erase numeric plus, qualifier uncertainty, or allow the alias for other graders/categories', () => {
    const plus = parseSourceGradeFromTitle('AFA Graded Q60+', { category: 'vintage_toys' });
    expect(compareComparableGrades('60.0', plus?.comparable, { allowBareNumeric: true, category: 'vintage_toys' })).toBe('different');
    const uncertain = parseSourceGradeFromTitle('AFA Graded Q60 (XYZ)', { category: 'vintage_toys' });
    expect(uncertain?.comparable.qualifierUncertain).toBe(true);
    expect(parseSourceGradeFromTitle('PSA Graded Q60', { category: 'vintage_toys' })).toBeNull();
    expect(parseSourceGradeFromTitle('AFA Graded Q60', { category: 'coins' })).toBeNull();
    expect(parseSourceGradeFromTitle('Not AFA Graded Q60', { category: 'vintage_toys' })).toBeNull();
  });
});

it('does not mistake Vintage Toy G1 generation identity for a conflicting grade in the actual Q60 priority title', () => {
  const title = 'Rare 1984 Hasbro Transformer G1 Megatron AFA Graded Q60 MIB';
  const observed = parseSourceGradeFromTitle(title, { category: 'vintage_toys' });
  expect(observed?.comparable.numeric).toBe('60');
  expect(compareComparableGrades('60.00', observed?.comparable, { allowBareNumeric: true, category: 'vintage_toys' })).toBe('match');
  expect(parseSourceGradeFromTitle('1984 Hasbro Transformer G1 Megatron MIB', { category: 'vintage_toys' })).toBeNull();
  expect(parseSourceGradeFromTitle('AFA Graded Q60 / AFA Graded Q70 G1 Megatron', { category: 'vintage_toys' })).toBeNull();
  expect(parseSourceGradeFromTitle('PCGS G1 Coin', { category: 'coins' })?.comparable).toMatchObject({ designation: 'G', numeric: '1' });
});
