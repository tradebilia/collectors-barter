import { describe, expect, it } from 'vitest';
import { extractCandidateStructuredMetadata, meaningfulMetadataText, readMetadataValue } from '../shared/testAiMetadataValues';
import { findMaterialMetadataConflicts } from '../shared/testAiMetadataConflict';
import { buildTestAiP0Identity } from '../shared/testAiP0Evidence';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';

const gameMetadata = 'title=Zelda NES;category=video_games;itemType=game;grade=7.50;certificationCompany=PSA;fullItemDetails={"platform":"NES"}';

describe('Stage 4 meaningful metadata values', () => {
  it.each([null, undefined, '', ' ', 'Unknown', 'UNKNOWN', 'Other', ' N/A ', 'N A', 'null', 'undefined', 'none', 'Not Provided', 'unreadable'])('does not claim placeholder %s as evidence', value => {
    expect(meaningfulMetadataText(value)).toBe('');
  });
  it.each([['No', 'No'], [false, 'false'], [0, '0'], [true, 'true'], ['Raw', 'Raw'], ['Ungraded', 'Ungraded']])('retains legitimate field fact %s', (value, text) => {
    expect(meaningfulMetadataText(value)).toBe(text);
  });
  it('filters placeholder array entries without object coercion or dropping false/zero', () => {
    expect(meaningfulMetadataText(['Unknown', 'NES', null, false, 0, { value: 'SNES' }])).toBe('NES, false, 0');
    expect(meaningfulMetadataText({ grade: '9' })).toBe('');
    expect(meaningfulMetadataText(Number.NaN)).toBe('');
  });
  it('resolves punctuation and mixed-case aliases and meaningful custom companions', () => {
    expect(readMetadataValue({ 'PLAT-FORM': 'Other', 'CUSTOM platform': ' NES ' }, ['platform'])).toBe('NES');
    expect(readMetadataValue({ 'Grading Company': 'Other', 'custom certification_company': 'WATA' }, ['gradingCompany', 'certificationCompany'])).toBe('WATA');
    expect(readMetadataValue({ customPlatform: 'Game Boy Color' }, ['platform'])).toBe('Game Boy Color');
    expect(readMetadataValue({ Platform: ['Unknown', 'NES'] }, ['platform'])).toBe('NES');
  });
  it('does not invent a custom value or let placeholders stop later aliases', () => {
    expect(readMetadataValue({ platform: 'Other', customPlatform: 'Unknown' }, ['platform'])).toBe('');
    expect(readMetadataValue({ platform: 'Unknown', Console: 'NES' }, ['platform', 'console'])).toBe('NES');
    expect(readMetadataValue({ sealed: false, factorySealed: true }, ['sealed', 'factorySealed'])).toBe('false');
  });
  it('keeps a specific direct fact ahead of its custom companion', () => {
    expect(readMetadataValue({ platform: 'SNES', customPlatform: 'NES' }, ['platform'])).toBe('SNES');
  });
});

describe('Stage 4 bounded structured projection', () => {
  it('reads known object, named array and JSON detail wrappers without title inference', () => {
    const listing = {
      title: 'Zelda NES PSA 7.5', titleEvidence: { platform: 'SNES', grade: '9' },
      rawMetadata: { itemSpecifics: [{ Name: 'Platform', Value: ['Unknown', 'NES'] }, { propertyName: 'Grade', propertyValue: '7.50' }] },
      structuredMetadata: { aspects: { 'Grading Company': ['PSA'], 'Custom Edition': ['First'] } },
      itemDetails: '{"Edition":"Other","sealed":false,"completeInBox":true}',
    };
    const result = extractCandidateStructuredMetadata(listing);
    expect(readMetadataValue(result, ['platform'])).toBe('NES');
    expect(readMetadataValue(result, ['grade'])).toBe('7.50');
    expect(readMetadataValue(result, ['gradingCompany'])).toBe('PSA');
    expect(readMetadataValue(result, ['edition'])).toBe('First');
    expect(result.sealed).toBe(false);
    expect(result.completeInBox).toBe(true);
    expect(result).not.toHaveProperty('title');
    expect(result).not.toHaveProperty('titleEvidence');
  });
  it('supports nested known arrays and Other/custom across wrappers', () => {
    const result = extractCandidateStructuredMetadata({
      platform: 'Other',
      fullItemDetails: { 'Custom Platform': 'NES', details: { aspects: [{ key: 'Grade', values: ['7.5'] }] } },
    });
    expect(result.platform).toBe('NES');
    expect(readMetadataValue(result, ['grade'])).toBe('7.5');
  });
  it('does not let direct Unknown mask raw provider facts or a meaningful opposite get erased', () => {
    expect(readMetadataValue(extractCandidateStructuredMetadata({ platform: 'Unknown', rawMetadata: { aspects: { Platform: 'NES' } } }), ['platform'])).toBe('NES');
    expect(readMetadataValue(extractCandidateStructuredMetadata({ platform: 'SNES', rawMetadata: { aspects: { Platform: 'NES' } }, title: 'Zelda NES' }), ['platform'])).toBe('SNES');
    expect(readMetadataValue(extractCandidateStructuredMetadata({ platform: 'Other', customPlatform: 'SNES', rawMetadata: { aspects: { Platform: 'NES' } } }), ['platform'])).toBe('SNES');
  });
  it.each(['numericGrade', 'finalGrade', 'professionalGrade'])('preserves contrary %s independently of primary grade in both insertion orders', alias => {
    for (const details of [{ grade: '7.50', [alias]: '8.5' }, { [alias]: '8.5', grade: '7.50' }]) {
      const listing = Object.freeze({ title: 'Example CGC 7.5', ...details });
      const result = extractCandidateStructuredMetadata(listing);
      expect(result.grade).toBe('7.50');
      expect(result[alias]).toBe('8.5');
      expect(listing).toEqual({ title: 'Example CGC 7.5', ...details });
      expect(findMaterialMetadataConflicts('title=Example;category=comics;itemType=single_item;grade=7.5;certificationCompany=CGC;fullItemDetails={}', listing)).toEqual([
        expect.objectContaining({ field: 'grade', targetValue: '7.5', candidateValue: '8.5' }),
      ]);
    }
  });
  it.each(['numericGrade', 'finalGrade', 'professionalGrade'])('keeps alias-only %s and the existing primary convenience grade', alias => {
    const result = extractCandidateStructuredMetadata({ [alias]: '7.50' });
    expect(result[alias]).toBe('7.50');
    expect(result.grade).toBe('7.50');
    expect(findMaterialMetadataConflicts(gameMetadata, { title: 'Zelda NES PSA 7.5', [alias]: '7.50', platform: 'NES' })).toEqual([]);
  });
  it('applies direct-over-wrapper priority only to a duplicate grade alias, not its meaningful siblings', () => {
    const result = extractCandidateStructuredMetadata({ grade: '7.5', numericGrade: '8.5', details: { grade: '9.5', numericGrade: '9' } });
    expect(result).toEqual({ grade: '7.5', numericGrade: '8.5' });
    expect(extractCandidateStructuredMetadata({ grade: 'Unknown', numericGrade: 'Other', details: { grade: '7.50', numericGrade: '8.5' } })).toEqual({ grade: '7.50', numericGrade: '8.5' });
    expect(extractCandidateStructuredMetadata({ 'NUMERIC GRADE': '8.5', details: { numericGrade: '9' }, grade: '7.50' })).toEqual({ numericGrade: '8.5', grade: '7.50' });
  });
  it('retains copied independent grade arrays without mutating frozen provider facts', () => {
    const grade = Object.freeze(['7.50']);
    const numericGrade = Object.freeze(['8.5']);
    const listing = Object.freeze({ grade, numericGrade });
    const result = extractCandidateStructuredMetadata(listing);
    expect(result).toEqual({ grade: ['7.50'], numericGrade: ['8.5'] });
    expect(result.grade).not.toBe(grade);
    expect(result.numericGrade).not.toBe(numericGrade);
    expect(listing.grade).toBe(grade);
    expect(listing.numericGrade).toBe(numericGrade);
  });
  it('does not recursively mine arbitrary objects or transport/authority/debug fields', () => {
    const result = extractCandidateStructuredMetadata({
      payload: { platform: 'NES' }, debugPlatform: 'SNES', price: 42,
      details: { providerObject: { grade: '9' }, title: 'Zelda NES', guideValue: 100, rankingScore: 100, signedPayload: 'x', grade: '7.5' },
    });
    expect(result).toEqual({ grade: '7.5' });
    expect(extractCandidateStructuredMetadata({ title: 'Zelda NES PSA 7.5' })).toEqual({});
  });
  it('retains named signed-item facts, not signing tokens', () => {
    expect(extractCandidateStructuredMetadata({ signedItemType: 'Baseball', signer: 'Example', details: { signature: 'authority' } })).toEqual({ signedItemType: 'Baseball', signer: 'Example' });
  });
  it('keeps raw objects/arrays immutable and does not alias projected arrays', () => {
    const values = Object.freeze(['NES']);
    const specifics = Object.freeze([Object.freeze({ name: 'Platform', value: values })]);
    const listing = Object.freeze({ rawMetadata: Object.freeze({ itemSpecifics: specifics }) });
    const result = extractCandidateStructuredMetadata(listing);
    expect(result.platform).toEqual(['NES']);
    expect(result.platform).not.toBe(values);
    expect(listing.rawMetadata.itemSpecifics).toBe(specifics);
  });
  it('handles cycles, excessive known nesting and malformed JSON without traversal failures', () => {
    const cycle: Record<string, unknown> = { platform: 'NES' };
    cycle.details = cycle;
    expect(readMetadataValue(extractCandidateStructuredMetadata(cycle), ['platform'])).toBe('NES');
    let deep: Record<string, unknown> = { platform: 'SNES' };
    for (let i = 0; i < 12; i++) deep = { details: deep };
    expect(extractCandidateStructuredMetadata(deep)).toEqual({});
    expect(extractCandidateStructuredMetadata({ itemDetails: '{bad' })).toEqual({});
  });
});

describe('Stage 4 actual identity and conflict readers', () => {
  it('treats required Unknown or unresolved Other platform as missing rather than ready', () => {
    for (const platform of ['Unknown', 'Other']) {
      const identity = buildTestAiP0Identity({ title: 'Zelda', category: 'video_games', itemDetails: { platform } });
      expect(identity.readiness).toBe('limited');
      expect(identity.missingCriticalFields).toEqual(['Platform']);
    }
  });
  it('uses custom/case/array facts and keeps Sealed No and CIB Yes independently', () => {
    const identity = buildTestAiP0Identity({
      title: 'Zelda', category: 'video_games', certificationCompany: 'Unknown',
      itemDetails: { 'PLAT FORM': 'Other', customPlatform: ['NES'], sealed: false, completeInBox: true, 'Grading Company': 'Other', customGradingCompany: 'WATA' },
    });
    expect(identity.readiness).toBe('ready');
    expect(identity.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'platform', value: 'NES' }),
      expect.objectContaining({ key: 'sealed', value: 'false' }),
      expect.objectContaining({ key: 'completeInBox', value: 'true' }),
      expect.objectContaining({ key: 'certificationCompany', value: 'WATA' }),
    ]));
  });
  it.each(['Unknown', 'Other', 'N/A'])('recovers the exact-key detail grader behind top-level %s in both actual readers', certificationCompany => {
    const itemDetails = Object.freeze({ denomination: 'Dollar', year: '1881', certificationCompany: 'PCGS' });
    const input = Object.freeze({ title: '1881 Morgan dollar', category: 'coins', certificationCompany, itemDetails });
    const identity = buildTestAiP0Identity(input);
    expect(identity.readiness).toBe('ready');
    expect(identity.fields).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'certificationCompany', label: 'Grader', value: 'PCGS', material: true })]));
    const summary = normalizeTestAiEvidence(input, [
      { id: 'cert', label: 'Certification', kind: 'certification', status: 'success', fields: { certificationCompany: 'NGC' } },
    ]);
    expect(summary.identity).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'certificationCompany', value: 'PCGS' })]));
    expect(summary.identityReadiness.fields).toEqual(identity.fields);
    expect(summary.reviewFlags).toEqual([expect.objectContaining({ kind: 'material', field: 'Grader', sourceId: 'cert' })]);
    expect(summary.reviewFlags[0].message).toContain('“NGC” while the listing records “PCGS”');
    expect(summary.alignedSources).toEqual([]);
    expect(input.certificationCompany).toBe(certificationCompany);
    expect(itemDetails.certificationCompany).toBe('PCGS');
  });
  it('retains meaningful direct grader precedence and meaningful recovered grader alignment', () => {
    const input = { title: '1881 Morgan dollar', category: 'coins', certificationCompany: ' NGC ', itemDetails: { denomination: 'Dollar', year: '1881', certificationCompany: 'PCGS' } };
    expect(buildTestAiP0Identity(input).fields).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'certificationCompany', value: 'NGC' })]));
    const direct = normalizeTestAiEvidence(input, [{ id: 'cert', label: 'Certification', kind: 'certification', status: 'success', fields: { certificationCompany: 'NGC' } }]);
    expect(direct.reviewFlags).toEqual([]);
    expect(direct.alignedSources).toEqual([{ id: 'cert', label: 'Certification', fields: ['Grader'] }]);
    const recovered = normalizeTestAiEvidence({ ...input, certificationCompany: 'Unknown' }, [{ id: 'cert', label: 'Certification', kind: 'certification', status: 'success', fields: { certificationCompany: 'PCGS' } }]);
    expect(recovered.reviewFlags).toEqual([]);
    expect(recovered.alignedSources).toEqual([{ id: 'cert', label: 'Certification', fields: ['Grader'] }]);
  });
  it.each([false, 'No'])('keeps explicit negative sealedStatus %s through the graded conflict field-selection gate', sealedStatus => {
    const target = `title=Example;category=vintage_toys;itemType=action_figure;grade=8;certificationCompany=AFA;fullItemDetails=${JSON.stringify({ sealedStatus })}`;
    expect(findMaterialMetadataConflicts(target, { title: 'Example AFA 8', grade: '8', sealedStatus: true })).toEqual([
      expect.objectContaining({ field: 'sealedStatus', targetValue: String(sealedStatus), candidateValue: 'true' }),
    ]);
    expect(findMaterialMetadataConflicts(target, { title: 'Example AFA 8', grade: '8', sealedStatus })).toEqual([]);
    expect(findMaterialMetadataConflicts(target, { title: 'Example AFA 8', grade: '8', sealedStatus: 'Unknown' })).toEqual([]);
  });
  it('keeps meaningful packageStatus false as an explicit seal-state alias', () => {
    const target = 'title=Example;category=vintage_toys;itemType=action_figure;grade=8;certificationCompany=AFA;fullItemDetails={"sealedStatus":"Unknown","packageStatus":false}';
    expect(findMaterialMetadataConflicts(target, { title: 'Example AFA 8', grade: '8', sealedStatus: true })).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'sealedStatus', targetValue: 'false', candidateValue: 'true' }),
    ]));
  });
  it.each(['Unknown', 'Other', 'N/A', null])('does not invent explicit target seal state for placeholder %s', sealedStatus => {
    const target = `title=Example;category=vintage_toys;itemType=action_figure;grade=8;certificationCompany=AFA;fullItemDetails=${JSON.stringify({ sealedStatus })}`;
    expect(findMaterialMetadataConflicts(target, { title: 'Example AFA 8', grade: '8', sealedStatus: true })).toEqual([]);
  });
  it('keeps opposite structured platform conflicts despite matching titles', () => {
    expect(findMaterialMetadataConflicts(gameMetadata, { title: 'Zelda NES PSA 7.5', platform: 'Unknown', grade: 'Unknown' })).toEqual([]);
    expect(findMaterialMetadataConflicts(gameMetadata, { title: 'Zelda NES PSA 7.5', platform: 'Other', customPlatform: 'NES', grade: '7.5' })).toEqual([]);
    expect(findMaterialMetadataConflicts(gameMetadata, { title: 'Zelda NES PSA 7.5', rawMetadata: { aspects: [{ name: 'Platform', value: 'SNES' }] } })).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'platform', candidateValue: 'SNES' }),
    ]));
  });
  it('makes specialist identity readers skip provider placeholders and resolve case/custom platform', () => {
    const summary = normalizeTestAiEvidence({ title: 'Zelda', category: 'video_games', itemDetails: { 'PLATFORM': 'Other', customPlatform: 'NES' } }, [
      { id: 'ref', label: 'Reference', kind: 'reference', status: 'success', fields: { Platform: 'Unknown' } },
    ]);
    expect(summary.identity).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'platform', value: 'NES' })]));
    expect(summary.reviewFlags).toEqual([]);
    expect(summary.identityReadiness.readiness).toBe('ready');
  });
  it.each(['Unknown', 'Other', 'N/A', null, undefined, ''])('skips placeholder specialist globalReleaseYear %s instead of emitting a regional-year disagreement', globalReleaseYear => {
    const fields = Object.freeze({ globalReleaseYear });
    const summary = normalizeTestAiEvidence({ title: 'Zelda', category: 'video_games', itemDetails: { platform: 'NES', releaseYear: '1986' } }, [
      { id: 'ref', label: 'Reference', kind: 'reference', status: 'success', fields },
    ]);
    expect(summary.reviewFlags).toEqual([]);
    expect(summary.alignedSources).toEqual([]);
    expect(summary.identityReadiness.readiness).toBe('ready');
    expect(fields.globalReleaseYear).toBe(globalReleaseYear);
  });
  it('retains a genuine global release-year context difference and matching-year control', () => {
    const input = { title: 'Zelda', category: 'video_games', itemDetails: { platform: 'NES', releaseYear: '1986' } };
    const different = normalizeTestAiEvidence(input, [{ id: 'ref', label: 'Reference', kind: 'reference', status: 'success', fields: { 'Global Release Year': '1985' } }]);
    expect(different.reviewFlags).toEqual([expect.objectContaining({ kind: 'context', field: 'Release year', sourceId: 'ref' })]);
    expect(different.reviewFlags[0].message).toContain('1985; the listing records 1986');
    expect(normalizeTestAiEvidence(input, [{ id: 'ref', label: 'Reference', kind: 'reference', status: 'success', fields: { globalReleaseYear: '1986' } }]).reviewFlags).toEqual([]);
  });
});
