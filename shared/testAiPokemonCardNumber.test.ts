import { describe, expect, it } from 'vitest';
import { comparePokemonCardNumbers, parsePokemonCardNumber, readPokemonCardNumbersFromTitle } from './testAiPokemonCardNumber';

describe('parsePokemonCardNumber', () => {
  it.each(['4/102', '#4/102', '004/0102', ' card no. #004 / 0102 ', 'Card Number: 4/102'])('canonicalizes %s without losing raw input', raw => {
    expect(parsePokemonCardNumber(raw)).toEqual({ original: raw, raw, canonical: '4/102',
      numerator: { number: '4', prefix: null, suffix: null }, denominator: { number: '102', prefix: null, suffix: null } });
  });
  it('preserves namespace roles and normalizes only numeric runs', () => {
    expect(parsePokemonCardNumber('tg004a / TG030b')).toMatchObject({ canonical: 'TG4A/TG30B',
      numerator: { number: '4', prefix: 'TG', suffix: 'A' }, denominator: { number: '30', prefix: 'TG', suffix: 'B' } });
    expect(parsePokemonCardNumber('#004')?.denominator).toBeNull();
    expect(parsePokemonCardNumber(4)?.original).toBe(4);
    expect(parsePokemonCardNumber('0000')?.canonical).toBe('0');
  });
  it.each([null, undefined, {}, ['4/102'], true, NaN, Infinity, 4.5, -4, '', 'unknown', '1999 Charizard',
    '$4', 'PSA 4', '4.5', '4/102/7', '12345/102', '4/12345', 'ABCD4/102', '4/102ABCDE', '4/102-A', '4/102 trailing'])('rejects malformed/non-observation input %j', value => {
    expect(parsePokemonCardNumber(value)).toBeNull();
  });
});

describe('comparePokemonCardNumbers', () => {
  it.each([
    ['004/0102', '4/102', 'match'], ['TG04/TG30', 'tg4/tg030', 'match'], ['#4', '4', 'match'],
    ['#4', '4/102', 'partial'], ['4/102', '#4', 'partial'], ['TG04/TG30', '4/30', 'partial'],
    ['TG04/TG30', 'TG4/30', 'partial'], ['4A/102', '4/102', 'partial'],
    ['4/102', '4/130', 'different'], ['#4', '#5', 'different'], ['TG04/TG30', 'GG04/GG30', 'different'],
    ['TG04/TG30', 'TG04/GG30', 'different'], ['4A/102', '4B/102', 'different'],
    ['4/102A', '4/102B', 'different'], ['TG04/TG30', '5/30', 'different'],
    [null, '4/102', 'unknown'], ['4/102', 'PSA 4', 'unknown'], [null, null, 'unknown'],
  ] as const)('%j versus %j is %s, symmetrically', (left, right, result) => {
    expect(comparePokemonCardNumbers(left, right)).toBe(result);
    expect(comparePokemonCardNumbers(right, left)).toBe(result);
  });
});

describe('readPokemonCardNumbersFromTitle', () => {
  it.each(['Charizard 4/102 Holo PSA 9', 'Charizard TG04/TG30', 'Charizard #004', 'Charizard card no. 004/0102',
    '4/102 Pokemon card', '4/102 trailing12345'])('recovers a bounded title witness from %s', title => {
    const result = readPokemonCardNumbersFromTitle(title);
    expect(result.ambiguous).toBe(false);
    expect(result.observations).toHaveLength(1);
    const observation = result.observations[0];
    expect(observation.source).toBe('title');
    expect(title.slice(observation.index, observation.index + observation.raw.length)).toBe(observation.raw);
  });
  it.each(['Pokemon 1999 Charizard', 'Charizard 4', 'PSA 9.5 cert #12345678', 'Cert ID #004/0102',
    'Certification Number #4', 'Cert. #4', 'PSA #4/102', 'CGC #4', '$4/102', 'USD 4/102', 'Price: 4/102',
    '4/102 USD', 'Lot of #4 cards', 'Quantity #4', 'Serial numbered 4/102', 'Numbered 4/102',
    'Print run 4/102', 'Scale 1/100', '1/100 scale', 'Date 11/09/2026', '11/09', '1999/2000',
    'ABC12345/102', '4/102ABCDEFGHIJ', '4/102-ABCDEF', '4/102.ABCDEF', '4/102/7', '4 / 102 / 7',
    'ID_4/102', '9.4/102', '4/102.5', '4/102PSA', 'Pokemon 12345', 'Holder ID #4', '#4 cards'])('does not salvage unrelated or malformed evidence from %s', title => {
    expect(readPokemonCardNumbersFromTitle(title)).toEqual({ observations: [], ambiguous: false });
  });
  it('keeps conflicting declarations and reports ambiguity, without a winner', () => {
    const result = readPokemonCardNumbersFromTitle('Charizard #4 4/102 card number 4/130');
    expect(result.observations.map(item => item.canonical)).toEqual(['4', '4/102', '4/130']);
    expect(result.ambiguous).toBe(true);
    expect(readPokemonCardNumbersFromTitle('#4 #5').ambiguous).toBe(true);
    expect(readPokemonCardNumbersFromTitle('TG04/TG30 GG04/GG30').ambiguous).toBe(true);
  });
  it('does not treat duplicates or compatible partial declarations as contradictions', () => {
    const result = readPokemonCardNumbersFromTitle('#004 4/102 card no. 004/0102');
    expect(result.observations).toHaveLength(3);
    expect(result.ambiguous).toBe(false);
  });
  it('is bounded, stateless, and never returns a truncated winner', () => {
    expect(readPokemonCardNumbersFromTitle(null)).toEqual({ observations: [], ambiguous: false });
    expect(readPokemonCardNumbersFromTitle('x'.repeat(4097))).toEqual({ observations: [], ambiguous: false });
    expect(readPokemonCardNumbersFromTitle(Array(33).fill('#4').join(' '))).toEqual({ observations: [], ambiguous: true });
    expect(readPokemonCardNumbersFromTitle('4/102')).toEqual(readPokemonCardNumbersFromTitle('4/102'));
  });
});

describe('malformed explicit title declarations', () => {
  it.each(['Charizard 4/102 card number 4/130/7', 'Charizard 4/102 #12345/102', 'Charizard 4/102 card no. 4/102.5'])('has no unambiguous winner in %s', title => {
    expect(readPokemonCardNumbersFromTitle(title).ambiguous).toBe(true);
  });
});
