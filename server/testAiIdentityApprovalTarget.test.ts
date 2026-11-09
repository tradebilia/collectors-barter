import { describe, expect, it } from 'vitest';
import { canonicalIdentityApprovalGrade, canonicalizeIdentityApprovalTarget, canonicalizeIdentityApprovalCandidateFields, identityApprovalCandidateFieldsCompatible, identityApprovalTargetsEquivalent } from '../shared/testAiIdentityApprovalTarget';

const game = {
  title: 'Zelda', category: 'Video Games', itemType: 'video_game', grade: '7.50', certificationCompany: 'PSA',
  itemDetails: { gameTitle: 'Zelda', platform: 'NES', sealed: 'Yes', completeInBox: 'Yes', edition: 'First edition' },
};

describe('identity-target-v1 semantic binding', () => {
  it('is stable across JSON key order, case, whitespace and numeric-only formatting', () => {
    const reciprocal = { ...game, category: 'video_games', grade: '7.5', certificationCompany: 'WATA',
      itemDetails: JSON.stringify({ edition: 'First edition', completeInBox: 'Yes', sealed: 'Yes', platform: 'NES', gameTitle: 'Zelda' }) };
    expect(identityApprovalTargetsEquivalent(game, reciprocal)).toBe(true);
    expect(canonicalizeIdentityApprovalTarget(game).conflicts).toEqual([]);
  });

  it('normalizes decimal strings exactly without precision loss or rounding', () => {
    expect(canonicalIdentityApprovalGrade('007.5000')).toBe('7.5');
    expect(canonicalIdentityApprovalGrade('7.500000000000000001')).toBe('7.500000000000000001');
    expect(canonicalIdentityApprovalGrade('7.499999999999999999')).not.toBe(canonicalIdentityApprovalGrade('7.5'));
    expect(canonicalIdentityApprovalGrade('MS65+')).not.toBe(canonicalIdentityApprovalGrade('MS65'));
    expect(canonicalIdentityApprovalGrade('10 OC')).not.toBe(canonicalIdentityApprovalGrade('10'));
  });

  it('never expands the Video Games PSA/WATA family to another category or grader', () => {
    expect(identityApprovalTargetsEquivalent(game, { ...game, certificationCompany: 'VGA' })).toBe(false);
    expect(identityApprovalTargetsEquivalent({ ...game, category: 'sports_cards' }, { ...game, category: 'sports_cards', certificationCompany: 'WATA' })).toBe(false);
  });

  it('ignores only specimen tracking and economic/cosmetic fields, not material identity', () => {
    expect(identityApprovalTargetsEquivalent(game, { ...game, itemDetails: { ...game.itemDetails, certId: 'new-cert', serialNumber: 'new', qrCode: 'new', askingPrice: '999999', notes: 'cosmetic' } })).toBe(true);
    for (const material of [{ platform: 'SNES' }, { gameTitle: 'Mario' }, { edition: 'Second edition' }, { language: 'Japanese' }, { gradeQualifier: 'Qualified' }, { productForm: 'manual only' }]) {
      expect(identityApprovalTargetsEquivalent(game, { ...game, itemDetails: { ...game.itemDetails, ...material } })).toBe(false);
    }
  });

  it('lets sealed imply CIB only for the same consistent target, not a CIB-only cohort', () => {
    const sealedOnly = { ...game, itemDetails: { gameTitle: 'Zelda', platform: 'NES', sealed: 'Yes', edition: 'First edition' } };
    expect(identityApprovalTargetsEquivalent(game, sealedOnly)).toBe(true);
    expect(identityApprovalTargetsEquivalent(game, { ...game, itemDetails: { ...game.itemDetails, sealed: 'No' } })).toBe(false);
    expect(canonicalizeIdentityApprovalTarget({ ...game, itemDetails: { ...game.itemDetails, completeInBox: 'No' } }).conflicts).toContain('sealed contradicts incomplete target');
  });

  it('fails closed on conflicting aliases, graded declarations, and malformed raw fields', () => {
    for (const itemDetails of [{ ...game.itemDetails, console: 'SNES' }, { ...game.itemDetails, grade: '8' }, { ...game.itemDetails, gradingCompany: 'VGA' }, { ...game.itemDetails, isGraded: 'No' }, '{bad JSON']) {
      expect(canonicalizeIdentityApprovalTarget({ ...game, itemDetails }).conflicts.length).toBeGreaterThan(0);
      expect(identityApprovalTargetsEquivalent(game, { ...game, itemDetails })).toBe(false);
    }
  });

  it('does not silently ignore malformed known itemType declarations but keeps Unknown neutral', () => {
    for (const itemType of [{ value: 'sealed_box' }, ['sealed_box']]) {
      const changed = { ...game, itemDetails: { ...game.itemDetails, itemType } };
      expect(canonicalizeIdentityApprovalTarget(changed).conflicts).toContain('malformed itemType');
      expect(identityApprovalTargetsEquivalent(game, changed)).toBe(false);
      expect(canonicalizeIdentityApprovalTarget({ ...game, itemType } as any).conflicts).toContain('malformed itemType');
    }
    expect(identityApprovalTargetsEquivalent(game, { ...game, itemDetails: { ...game.itemDetails, itemType: 'Unknown' } })).toBe(true);
  });

  it('resolves existing Other companions and does not invent unknown values', () => {
    const unknown = canonicalizeIdentityApprovalTarget({ title: 'Coin', category: 'coins', itemDetails: { country: 'Unknown', mintMark: 'Other' } });
    expect(unknown.fields.country).toBeUndefined();
    expect(unknown.fields.mintMark).toBeUndefined();
    const custom = { ...game, itemDetails: { ...game.itemDetails, platform: 'Other', customPlatform: 'NES' } };
    expect(identityApprovalTargetsEquivalent(game, custom)).toBe(true);
    expect(canonicalizeIdentityApprovalTarget({ title: 'Coin', category: 'coins', itemDetails: { isGraded: 'No' } }).fields.gradedState).toBe('raw');
  });

  it('binds hard identifiers and meaningful coin/card qualifiers', () => {
    const card = { title: 'Kobe', category: 'sports_cards', grade: '10', certificationCompany: 'PSA', itemDetails: { player: 'Kobe Bryant', cardNumber: '138', manufacturer: 'Topps', year: '1996', gradeQualifier: 'OC' } };
    expect(identityApprovalTargetsEquivalent(card, { ...card, itemDetails: { ...card.itemDetails, cardNumber: '139' } })).toBe(false);
    expect(identityApprovalTargetsEquivalent(card, { ...card, itemDetails: { ...card.itemDetails, gradeQualifier: 'MC' } })).toBe(false);
    const coin = { title: 'Coin', category: 'coins', grade: 'MS65+', certificationCompany: 'PCGS', itemDetails: { year: '1900', denomination: 'Dollar', designation: 'PL' } };
    expect(identityApprovalTargetsEquivalent(coin, { ...coin, grade: 'MS65' })).toBe(false);
    expect(identityApprovalTargetsEquivalent(coin, { ...coin, itemDetails: { ...coin.itemDetails, designation: 'DMPL' } })).toBe(false);
  });

  it('binds only known comic distribution/restoration aliases including newly declared restoration', () => {
    const comic = { title: 'Amazing Spider-Man', category: 'comics', grade: '9.8', certificationCompany: 'CGC',
      itemDetails: { comicTitle: 'Amazing Spider-Man', issueNumber: '300', distributionType: 'Direct', labelNotation: 'Color touch' } };
    expect(identityApprovalTargetsEquivalent(comic, { ...comic,
      itemDetails: { comicTitle: 'Amazing Spider-Man', issueNumber: '300', distribution: 'direct', restorationDetail: 'Color touch' } })).toBe(true);
    expect(identityApprovalTargetsEquivalent(comic, { ...comic,
      itemDetails: { ...comic.itemDetails, labelNotation: undefined, labelNote: 'Color touch' } })).toBe(true);
    expect(identityApprovalTargetsEquivalent(comic, { ...comic, itemDetails: { ...comic.itemDetails, distributionType: 'Newsstand' } })).toBe(false);
    expect(canonicalizeIdentityApprovalTarget({ ...comic, itemDetails: { ...comic.itemDetails, distribution: 'Newsstand' } }).conflicts).toContain('conflicting distributionType');
    const absent = { ...comic, itemDetails: { comicTitle: 'Amazing Spider-Man', issueNumber: '300', distributionType: 'Direct' } };
    expect(identityApprovalTargetsEquivalent(absent, comic)).toBe(false);
    expect(identityApprovalTargetsEquivalent(absent, { ...absent, itemDetails: { ...absent.itemDetails, notes: 'Color touch' } })).toBe(true);
  });

  it('ignores pure Video Games A suffix aliases before conflict collection but no real qualifier or numeric grade', () => {
    for (const suffix of ['A+', 'A++', 'A+++', 'Sealed A++']) {
      expect(identityApprovalTargetsEquivalent(game, { ...game, itemDetails: { ...game.itemDetails, gradeQualifier: suffix, labelDesignation: 'A+' } })).toBe(true);
    }
    for (const qualifier of ['Qualified', 'A++++', 'A++ Qualified', 'Qualified A+']) {
      expect(identityApprovalTargetsEquivalent(game, { ...game, itemDetails: { ...game.itemDetails, gradeQualifier: qualifier } })).toBe(false);
    }
    expect(identityApprovalTargetsEquivalent(game, { ...game, grade: '7.5 A++' })).toBe(false);
    expect(identityApprovalTargetsEquivalent(game, { ...game, itemDetails: { ...game.itemDetails, sealed: 'No', gradeQualifier: 'A++' } })).toBe(false);
    const card = { ...game, category: 'sports_cards', itemDetails: { player: 'Kobe Bryant', gradeQualifier: 'A+' } };
    expect(identityApprovalTargetsEquivalent(card, { ...card, itemDetails: { ...card.itemDetails, gradeQualifier: 'A++' } })).toBe(false);
  });

  it('ignores stale Disney grading declarations before conflicts while retaining genuine pin identity', () => {
    const pin = { title: 'Mickey Sorcerer', category: 'disney_pins', itemType: 'individual_pin', itemDetails: { pinName: 'Mickey Sorcerer', character: 'Mickey' } };
    const stale = { ...pin, grade: '10', certificationCompany: 'PSA', condition: 'Raw', itemDetails: { ...pin.itemDetails,
      grade: '9', gradingCompany: 'BGS', isGraded: 'Yes', gradedState: 'Raw', gradingState: 'Slabbed', rawOrGraded: 'Raw', gradeQualifier: 'OC' } };
    expect(identityApprovalTargetsEquivalent(pin, stale)).toBe(true);
    expect(canonicalizeIdentityApprovalTarget(stale).fields.gradedState).toBeUndefined();
    expect(canonicalizeIdentityApprovalTarget(stale).conflicts).toEqual([]);
    expect(identityApprovalTargetsEquivalent(pin, { ...stale, itemDetails: { ...stale.itemDetails, character: 'Donald' } })).toBe(false);
  });

  it('canonicalizes only bounded actual provider fields without candidate title fallback', () => {
    expect(canonicalizeIdentityApprovalCandidateFields('sports_cards', { gradingCompany: 'PSA', numericGrade: '10.00', player: 'Unknown' })).toEqual({
      fields: { certificationCompany: 'PSA', grade: '10', gradedState: 'graded' }, conflicts: [] });
    expect(canonicalizeIdentityApprovalCandidateFields('video_games', { grade: '7.50', grader: 'WATA' }).fields.gameTitle).toBeUndefined();
    expect(canonicalizeIdentityApprovalCandidateFields('video_games', { player: 'Kobe Bryant', sport: 'Basketball', grade: '7.5' }).conflicts).toEqual([]);
    expect(canonicalizeIdentityApprovalCandidateFields('video_games', { player: 'Kobe Bryant' }).fields).toEqual({});
    const movie = canonicalizeIdentityApprovalCandidateFields('movies', { movieTitle: 'Jaws' });
    expect(movie.fields).toEqual({ movieTitle: 'jaws' });
    expect(canonicalizeIdentityApprovalCandidateFields('movies', { ...movie.fields })).toEqual(movie);
    expect(canonicalizeIdentityApprovalCandidateFields('sports_cards', { title: 'Kobe Bryant' }).conflicts).toContain('unsupported candidate identity field title');
    for (const invalid of [{ browserApproved: 'yes' }, { grade: 10 }, { grade: '9', numericGrade: '10' }, { player: 'x'.repeat(301) }]) {
      expect(canonicalizeIdentityApprovalCandidateFields('sports_cards', invalid as Record<string, string>).conflicts.length).toBeGreaterThan(0);
    }
    expect(canonicalizeIdentityApprovalCandidateFields('sports_cards', Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`key${i}`, 'x']))).conflicts.length).toBeGreaterThan(0);
  });

  it('compares partial known candidate identity/state/form but keeps unknown and sports year neutral', () => {
    const targetFields = canonicalizeIdentityApprovalTarget({ title: 'Kobe', category: 'sports_cards', grade: '10', certificationCompany: 'PSA',
      itemDetails: { player: 'Kobe Bryant', year: '1996', cardNumber: '138' } }).fields;
    const compatible = (values: Record<string, string>) => identityApprovalCandidateFieldsCompatible(targetFields,
      canonicalizeIdentityApprovalCandidateFields('sports_cards', values).fields);
    expect(compatible({ grade: '10.00', gradingCompany: 'PSA', year: '1997' })).toBe(true);
    expect(compatible({ player: 'Unknown' })).toBe(true);
    for (const values of [{ grade: '9' }, { gradingCompany: 'BGS' }, { isGraded: 'No' }, { player: 'Michael Jordan' }, { cardNumber: '139' }]) expect(compatible(values)).toBe(false);
    const gameFields = canonicalizeIdentityApprovalTarget(game).fields;
    expect(identityApprovalCandidateFieldsCompatible(gameFields, canonicalizeIdentityApprovalCandidateFields('video_games', { grade: '7.5', gradingCompany: 'WATA' }).fields)).toBe(true);
    for (const values of [{ gameTitle: 'Mario' }, { platform: 'SNES' }, { itemType: 'manual' }, { condition: 'CIB' }, { saleForm: 'complete_in_box' }, { sealed: 'No' }]) {
      expect(identityApprovalCandidateFieldsCompatible(gameFields, canonicalizeIdentityApprovalCandidateFields('video_games', values).fields)).toBe(false);
    }
  });
});
