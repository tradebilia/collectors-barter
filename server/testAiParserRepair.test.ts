import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('PARSER_TEST_MUST_NOT_CALL_MODEL'); }) }));
import { buildVisualTargetMetadata, pokemonVisualScore, vintageToyVisualScore,
  buildMetadataFieldComparisons, withMetadataFieldComparisons, applyDeclaredIdentityFilter, annotatePreVisualComparableScores,
  videoGameGameVisualScore } from './testAiVisualSourceFilter';
import { findMaterialMetadataConflicts } from '../shared/testAiMetadataConflict';
import { assessComparableCategoryIdentity, scoreComparable } from './testAiComparableEngine';

function pokemonTarget(number: string) {
  return buildVisualTargetMetadata({ title: 'Pokemon Base Set Charizard', category: 'pokemon',
    itemType: 'single_card', fullItemDetails: { cardName: 'Charizard', setName: 'Base Set', cardNumber: number } });
}
function finalTarget(number: string) {
  return { title: 'Pokemon Base Set Charizard', category: 'pokemon', itemType: 'single_card',
    itemDetails: JSON.stringify({ cardName: 'Charizard', setName: 'Base Set', cardNumber: number }) };
}
function numberAward(candidate: Record<string, unknown>, target = '4/102') {
  return pokemonVisualScore(candidate, pokemonTarget(target)).awards?.find(award => award.field === 'cardNumber');
}

describe('Step 1 actual Pokémon number consumers', () => {
  it.each(['4/102', '#4/102', '004/0102', 'Card Number 004/0102'])('recovers exact title number %s across gates and diagnostics', number => {
    const candidate = { title: `Pokemon Base Set Charizard ${number}` };
    const metadata = pokemonTarget('4/102');
    const award = numberAward(candidate);
    expect(award).toMatchObject({ field: 'cardNumber', awardedPoints: 15, source: 'title' });
    expect(award?.evidence?.[0].value).toContain(number.replace(/^Card Number /, '').replace(/^#/, ''));
    expect(findMaterialMetadataConflicts(metadata, candidate).filter(row => row.field === 'cardNumber')).toEqual([]);
    expect(applyDeclaredIdentityFilter([candidate], metadata).removedCount).toBe(0);
    const rows = buildMetadataFieldComparisons(metadata, candidate);
    expect(rows.find(row => row.fieldKey === 'cardNumber')).toMatchObject({
      candidateValue: 'Unknown', status: 'unknown', titleDerivedStatus: 'match',
      titleDerivedValue: expect.stringContaining(number.replace(/^Card Number /, '').replace(/^#/, '')),
    });
    const scored = annotatePreVisualComparableScores([candidate], metadata)[0];
    expect(scored.metadataScoreAwards).toContainEqual(award);
    const final = scoreComparable(finalTarget('4/102'), { title: candidate.title, price: 100, currency: 'USD' });
    expect(final.categoryIdentity?.conflicts).toEqual([]);
    expect(final.categoryIdentity?.confirmedFields).toContain('Card #');
    expect(final.reasons).not.toContain('explicit catalog or issue number differs');
  });

  it.each([['4/102', '#4'], ['#4', '4/102']])('retains partial %s versus %s without a full-number award', (target, candidateNumber) => {
    const metadata = pokemonTarget(target);
    const candidate = { title: `Pokemon Base Set Charizard ${candidateNumber}` };
    expect(numberAward(candidate, target)).toBeUndefined();
    expect(findMaterialMetadataConflicts(metadata, candidate).filter(row => row.field === 'cardNumber')).toEqual([]);
    expect(applyDeclaredIdentityFilter([candidate], metadata).removedCount).toBe(0);
    expect(buildMetadataFieldComparisons(metadata, candidate).find(row => row.fieldKey === 'cardNumber')?.titleDerivedStatus).toBe('unknown');
    const final = scoreComparable(finalTarget(target), { title: candidate.title, price: 100, currency: 'USD' });
    expect(final.categoryIdentity?.conflicts).toEqual([]);
    expect(final.categoryIdentity?.unconfirmedFields).toContain('Card #');
    expect(final.reasons).not.toContain('catalog or issue number matches');
    expect(final.reasons).not.toContain('explicit catalog or issue number differs');
  });

  it.each(['4/130', '#5/102'])('preserves explicit number conflict %s at every gate', candidateNumber => {
    const metadata = pokemonTarget('4/102');
    const candidate = { title: `Pokemon Base Set Charizard ${candidateNumber}` };
    expect(numberAward(candidate)).toBeUndefined();
    expect(findMaterialMetadataConflicts(metadata, candidate).some(row => row.field === 'cardNumber')).toBe(true);
    expect(applyDeclaredIdentityFilter([candidate], metadata).removedCount).toBe(1);
    expect(buildMetadataFieldComparisons(metadata, candidate).find(row => row.fieldKey === 'cardNumber')?.titleDerivedStatus).toBe('different');
    const final = scoreComparable(finalTarget('4/102'), { title: candidate.title, price: 100, currency: 'USD' });
    expect(final.classification).toBe('rejected');
    expect(final.categoryIdentity?.conflicts.some(reason => reason.startsWith('Card # differs'))).toBe(true);
  });

  it('preserves meaningful structured precedence and contradictory title/aliases', () => {
    const target = pokemonTarget('4/102');
    for (const candidate of [
      { title: 'Pokemon Base Set Charizard 4/102', fullItemDetails: { cardNumber: '4/130' } },
      { title: 'Pokemon Base Set Charizard 4/130', fullItemDetails: { cardNumber: '4/102' } },
      { title: 'Pokemon Base Set Charizard', fullItemDetails: { cardNumber: '4/102', cardNo: '4/130' } },
    ]) {
      expect(numberAward(candidate)).toBeUndefined();
      expect(findMaterialMetadataConflicts(target, candidate).some(row => row.field === 'cardNumber')).toBe(true);
      expect(applyDeclaredIdentityFilter([candidate], target).removedCount).toBe(1);
    }
  });

  it('allows placeholder recovery with the actual structured witness', () => {
    const candidate = { title: 'Pokemon Base Set Charizard', fullItemDetails: { cardNumber: 'Unknown', cardNo: '004/0102' } };
    expect(numberAward(candidate)).toMatchObject({ source: 'structured', awardedPoints: 15,
      evidence: [{ field: 'cardNo', source: 'structured', value: '004/0102' }] });
  });

  it.each(['1999', '$4', 'PSA 4', 'Cert #4', 'Serial 4/102', 'Lot of 4 cards', '1234564/102'])('does not manufacture a card number from %s', text => {
    const candidate = { title: `Pokemon Base Set Charizard ${text}` };
    expect(numberAward(candidate)).toBeUndefined();
    expect(buildMetadataFieldComparisons(pokemonTarget('4/102'), candidate).find(row => row.fieldKey === 'cardNumber')?.titleDerivedStatus).toBe('unknown');
  });

  it('does not erase namespaces or infer a set from a denominator', () => {
    expect(numberAward({ title: 'Pokemon Base Set Charizard TG04/TG30' }, 'TG4/TG30')).toMatchObject({ awardedPoints: 15 });
    expect(numberAward({ title: 'Pokemon Base Set Charizard 4/30' }, 'TG4/TG30')).toBeUndefined();
    const wrongSet = { title: 'Pokemon Other Set Charizard 4/102', fullItemDetails: { setName: 'Other Set' } };
    expect(findMaterialMetadataConflicts(pokemonTarget('4/102'), wrongSet).some(row => row.field === 'setName')).toBe(true);
  });

  it('keeps the Sports Card number identity contract unchanged', () => {
    const target = { title: 'Topps Kobe #138', category: 'sports_cards', itemDetails: JSON.stringify({ player: 'Kobe', manufacturer: 'Topps', year: '1996', cardNumber: '138' }) };
    const identity = assessComparableCategoryIdentity(target, JSON.parse(target.itemDetails), '1996 Topps Kobe #139', '139');
    expect(identity.conflicts).toContain('Card # differs (139)');
  });
});

describe('Step 1 actual Toy numeric awards and year/region safeguards', () => {
  function lego(details: Record<string, unknown>) {
    return buildVisualTargetMetadata({ title: 'LEGO Pirates Black Seas Barracuda', category: 'vintage_toys', itemType: 'lego', fullItemDetails: details });
  }
  it('awards independent structured set number and piece count with actual witnesses', () => {
    const target = lego({ setNumber: '6285', pieceCount: '909' });
    const result = vintageToyVisualScore({ title: 'LEGO Pirates', fullItemDetails: { setNumber: '6285', pieceCount: '909' } }, target);
    expect(result.awards).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'setNumber', awardedPoints: 25, source: 'structured', evidence: [{ field: 'setNumber', source: 'structured', value: '6285' }] }),
      expect.objectContaining({ field: 'pieceCount', awardedPoints: 5, source: 'structured', evidence: [{ field: 'pieceCount', source: 'structured', value: '909' }] }),
    ]));
  });
  it('recovers field-aware title numbers, not the target reconstructed as evidence', () => {
    const result = vintageToyVisualScore({ title: 'LEGO Pirates 6285 Black Seas Barracuda 909 pieces' }, lego({ setNumber: '6285', pieceCount: '909' }));
    expect(result.awards?.find(award => award.field === 'setNumber')).toMatchObject({ source: 'title', awardedPoints: 25 });
    expect(result.awards?.find(award => award.field === 'pieceCount')).toMatchObject({ source: 'title', awardedPoints: 5 });
  });
  it.each([
    { title: 'LEGO Pirates 6285 909 pieces', fullItemDetails: { setNumber: '9999', pieceCount: '100' } },
    { title: 'LEGO Pirates 1999 $6285 Cert #6285' },
    { title: 'LEGO 62850 9090 pieces' },
    { title: 'LEGO 6285 9999 909 pieces 100 pieces' },
  ])('does not reward contradictory/unrelated numeric text: $title', candidate => {
    const result = vintageToyVisualScore(candidate, lego({ setNumber: '6285', pieceCount: '909' }));
    expect(result.awards?.some(award => ['setNumber', 'pieceCount'].includes(award.field))).toBe(false);
  });
  it.each(['board_game', 'board_game___puzzle', 'board game/puzzle', 'puzzle'])('preserves actual Board Game piece counts without manufacturing a title year: %s', itemType => {
    const target = buildVisualTargetMetadata({ title: 'Puzzle', category: 'vintage_toys', itemType, fullItemDetails: { gamePuzzleName: 'Puzzle', numberOfPieces: '100', year: '2000' } });
    for (const year of ['2000', '1999', '']) {
      const candidate = { title: `Puzzle 100 pieces ${year}` };
      const result = vintageToyVisualScore(candidate, target);
      expect(result.awards?.find(award => award.field === 'numberOfPieces')).toMatchObject({ awardedPoints: 10, source: 'title' });
      expect(result.awards?.find(award => award.field === 'year')).toBeUndefined();
      expect(buildMetadataFieldComparisons(target, candidate).find(row => row.targetField === 'Year')).toMatchObject({ candidateValue: 'Unknown', titleDerivedValue: 'Unknown', status: 'unknown', titleDerivedStatus: 'unknown' });
      expect(findMaterialMetadataConflicts(target, candidate).some(row => row.field === 'year')).toBe(false);
    }
  });
  it('does not upgrade NTSC to a specific region or change the 100-point maximum', () => {
    const target = buildVisualTargetMetadata({ title: 'Metroid NES', category: 'video_games', itemType: 'game', fullItemDetails: { gameTitle: 'Metroid', platform: 'NES', region: 'NTSC-U' } });
    const result = videoGameGameVisualScore({ title: 'Metroid NES NTSC' }, target);
    expect(result.awards?.find(award => award.field === 'region')).toBeUndefined();
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('Step 1 independent-review regressions', () => {
  it('does not rescue an explicitly malformed second number with a valid first number', () => {
    const candidate = { title: 'Pokemon Base Set Charizard 4/102 card number 4/130/7' };
    expect(numberAward(candidate)).toBeUndefined();
    expect(applyDeclaredIdentityFilter([candidate], pokemonTarget('4/102')).removedCount).toBe(1);
    expect(scoreComparable(finalTarget('4/102'), { ...candidate, price: 100, currency: 'USD' }).classification).toBe('rejected');
  });
  it.each(['TG04/30 TG04/TG30', 'TG04/TG30 TG04/30'])('selects the fuller actual namespace witness independent of order: %s', numbers => {
    expect(numberAward({ title: `Pokemon Base Set Charizard ${numbers}` }, 'TG4/TG30')).toMatchObject({ awardedPoints: 15 });
  });
  it('keeps actual cardNo alias evidence visible and highlighted after score-to-refresh projection', () => {
    const target = pokemonTarget('4/102');
    const candidate: Record<string, unknown> = { title: 'Pokemon Base Set Charizard', cardNo: '004/0102' };
    const scored = annotatePreVisualComparableScores([candidate], target)[0];
    expect(withMetadataFieldComparisons(target, scored).metadataFieldComparisons.find(row => row.fieldKey === 'cardNumber')).toMatchObject({
      candidateValue: '004/0102', status: 'match', rankingContribution: { matched: true, structured: true, titleDerived: false, awardedPoints: 15 },
    });
  });
  it.each(['piece-count: 100', 'number-of-pieces: 100'])('reads %s as a count, not another LEGO set number', countText => {
    const target = buildVisualTargetMetadata({ title: 'LEGO Pirates', category: 'vintage_toys', itemType: 'lego', fullItemDetails: { setNumber: '6285', pieceCount: '100' } });
    const candidate = { title: `LEGO 6285 ${countText}` };
    const awards = vintageToyVisualScore(candidate, target).awards;
    expect(awards.find(award => award.field === 'setNumber')).toMatchObject({ awardedPoints: 25 });
    expect(awards.find(award => award.field === 'pieceCount')).toMatchObject({ awardedPoints: 5 });
    expect(findMaterialMetadataConflicts(target, candidate)).toEqual([]);
  });
  it.each(['8 years old', 'Certificate: #9999'])('ignores unrelated %s without suppressing the real set', text => {
    const target = buildVisualTargetMetadata({ title: 'LEGO Pirates', category: 'vintage_toys', itemType: 'lego', fullItemDetails: { setNumber: '6285' } });
    const candidate = { title: `LEGO 6285 ${text}` };
    expect(vintageToyVisualScore(candidate, target).awards.find(award => award.field === 'setNumber')).toMatchObject({ awardedPoints: 25 });
    expect(findMaterialMetadataConflicts(target, candidate)).toEqual([]);
  });
  it('keeps labeled count aliases equivalent and highlights their actual structured witness', () => {
    const target = buildVisualTargetMetadata({ title: 'LEGO Pirates', category: 'vintage_toys', itemType: 'lego', fullItemDetails: { setNumber: '6285', pieceCount: '100' } });
    const candidate: Record<string, unknown> = { title: 'LEGO Pirates', setNo: 'Set Number: 6285', pieces: 'Piece Count: 100' };
    const scored = annotatePreVisualComparableScores([candidate], target)[0];
    const rows = withMetadataFieldComparisons(target, scored).metadataFieldComparisons;
    expect(rows.find(row => row.fieldKey === 'pieceCount')).toMatchObject({ candidateValue: 'Piece Count: 100', status: 'match', rankingContribution: { matched: true, structured: true, awardedPoints: 5 } });
    expect(rows.find(row => row.fieldKey === 'setNumber')).toMatchObject({ candidateValue: 'Set Number: 6285', status: 'match', rankingContribution: { matched: true, structured: true, awardedPoints: 25 } });
    expect(findMaterialMetadataConflicts(target, candidate)).toEqual([]);
  });
});
