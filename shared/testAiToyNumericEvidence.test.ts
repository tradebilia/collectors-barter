import { describe, expect, it } from 'vitest';
import {
  extractToyNumericTitleEvidence,
  parseToyNumericValue,
  readToyNumericTitleEvidence,
  type ToyNumericField,
} from './testAiToyNumericEvidence';

const FIELDS: ToyNumericField[] = ['setNumber', 'pieceCount', 'numberOfPieces'];

describe('parseToyNumericValue', () => {
  it.each(FIELDS)('accepts exact positive scalar digits for %s', (field) => {
    expect(parseToyNumericValue('6285', field)).toEqual({ value: '6285', raw: '6285' });
    expect(parseToyNumericValue(1, field)).toEqual({ value: '1', raw: '1' });
    expect(parseToyNumericValue('9999999', field)).toEqual({ value: '9999999', raw: '9999999' });
    expect(parseToyNumericValue('  6285  ', field)).toEqual({ value: '6285', raw: '  6285  ' });
  });

  it('rejects oversized inputs without truncating to a convenient number', () => {
    expect(parseToyNumericValue(' '.repeat(97) + '6285', 'setNumber')).toBeNull();
    expect(readToyNumericTitleEvidence('LEGO 6285 ' + 'x'.repeat(4096), 'setNumber')).toBeNull();
    expect(extractToyNumericTitleEvidence('LEGO 6285 ' + 'x'.repeat(4096), 'setNumber').ambiguous).toBe(true);
  });

  it.each([
    ['setNumber', 'Set Number: 6285', '6285'],
    ['setNumber', 'setNumber=6285', '6285'],
    ['setNumber', 'LEGO set # 6285', '6285'],
    ['setNumber', 'Set No. 6285', '6285'],
    ['setNumber', '#6285', '6285'],
    ['pieceCount', 'Piece Count: 100', '100'],
    ['pieceCount', 'pieceCount=100', '100'],
    ['pieceCount', '100 pieces', '100'],
    ['numberOfPieces', 'Number of Pieces: 100', '100'],
    ['numberOfPieces', 'numberOfPieces=100', '100'],
    ['numberOfPieces', '100 pcs', '100'],
    ['numberOfPieces', 'Count: 100 pieces', '100'],
  ] as const)('accepts only the appropriate label: %s / %s', (field, raw, value) => {
    expect(parseToyNumericValue(raw, field)).toEqual({ value, raw });
  });

  it.each(FIELDS)('preserves leading-zero identity for %s', (field) => {
    expect(parseToyNumericValue('006285', field)).toEqual({ value: '006285', raw: '006285' });
    expect(parseToyNumericValue('006285', field)?.value).not.toBe(parseToyNumericValue('6285', field)?.value);
  });

  it.each(FIELDS)('rejects missing, nonscalar, zero, long and malformed values for %s', (field) => {
    const invalid: unknown[] = [
      undefined, null, '', ' ', 'unknown', 'N/A', false, true, ['6285'], { value: '6285' },
      0, -1, NaN, Infinity, 1.5, 10000000, '0', '0000000', '12345678', '00006285',
      '-6285', '+6285', '6,285', '6285.0', '6.285', '6285/100', '6285-6286',
      'ABC6285', '6285A', '$6285', 'Price: 6285', 'Certificate ID: 6285',
      'Black Seas Barracuda 6285', '6285 Black Seas Barracuda', '6285 complete',
      '6285; 6286', 'Set Number: 6285 trailing text', '100 pieces complete',
    ];
    for (const value of invalid) expect(parseToyNumericValue(value, field)).toBeNull();
  });

  it('does not turn structured identifiers into counts or counts into identifiers', () => {
    expect(parseToyNumericValue('Set Number: 100', 'pieceCount')).toBeNull();
    expect(parseToyNumericValue('LEGO set #100', 'numberOfPieces')).toBeNull();
    expect(parseToyNumericValue('100 pieces', 'setNumber')).toBeNull();
    expect(parseToyNumericValue('Piece Count: 100', 'setNumber')).toBeNull();
  });
});

describe('readToyNumericTitleEvidence: LEGO set numbers', () => {
  it.each([
    ['LEGO 6285 Black Seas Barracuda', '6285'],
    ['LEGO Pirates 6285 Black Seas Barracuda complete', '6285'],
    ['LEGO set number: 6285 Black Seas Barracuda', '6285'],
    ['LEGO Pirates Set #6285 complete', '6285'],
    ['LEGO Pirates Set No. 6285', '6285'],
    ['Black Seas Barracuda set number 6285 by LEGO', '6285'],
    ['LEGO set number 2000', '2000'],
    ['LEGO 6285 released 1989, 909 pieces, price $200', '6285'],
    ['LEGO 6285 Certificate ID: 12345678', '6285'],
    ['LEGO 6285 lot of 2 sets', '6285'],
    ['LEGO set #006285 Black Seas Barracuda', '006285'],
  ])('returns the actual set capture from %s', (title, value) => {
    expect(readToyNumericTitleEvidence(title, 'setNumber')).toEqual({ value, raw: value });
  });

  it.each([
    '6285 Black Seas Barracuda', 'Pirates Set Number: 6285', 'Set #6285',
    'LEGO Pirates', 'LEGO 1989 Pirates', 'LEGO 2000', 'LEGO year 6285',
    'LEGO Price: 6285', 'LEGO $6285', 'LEGO 6285 USD', 'LEGO €6285',
    'LEGO certificate #6285', 'LEGO Certificate ID: 6285', 'LEGO cert no. 6285',
    'LEGO serial number 6285', 'LEGO PSA 6285', 'LEGO lot #6285', 'LEGO lot of 6285',
    'LEGO quantity: 6285', 'LEGO 6285 pieces', 'LEGO 6285 pcs', 'LEGO Piece Count: 6285',
    'LEGO ABC6285', 'LEGO 6285A', 'LEGO set #12345678', 'LEGO 123456786285',
    'LEGO 6,285', 'LEGO 6285.00', 'LEGO set #6285/100', 'LEGO 6285-6286',
  ])('does not salvage unsupported set evidence from %s', (title) => {
    expect(readToyNumericTitleEvidence(title, 'setNumber')).toBeNull();
  });

  it.each([
    'LEGO 6285 and 6286 Pirates sets',
    'LEGO set #6285 / set #6286',
    'LEGO set number 6285 set number 6286',
    'LEGO 006285 and 6285',
    'LEGO 6285 and 12345678',
    'LEGO 6285 and 0',
  ])('leaves multiple conflicting or malformed observations ambiguous: %s', (title) => {
    expect(readToyNumericTitleEvidence(title, 'setNumber')).toBeNull();
    expect(extractToyNumericTitleEvidence(title, 'setNumber').ambiguous).toBe(true);
  });

  it('retains all actual captures without picking a target-shaped occurrence', () => {
    expect(extractToyNumericTitleEvidence('LEGO 6285 and 6286', 'setNumber')).toEqual({
      observations: [{ value: '6285', raw: '6285' }, { value: '6286', raw: '6286' }],
      ambiguous: true,
    });
    expect(readToyNumericTitleEvidence('LEGO 6285 set #6285', 'setNumber')).toEqual({ value: '6285', raw: '6285' });
  });
});

describe('readToyNumericTitleEvidence: piece counts', () => {
  it.each(['pieceCount', 'numberOfPieces'] as const)('requires actual pieces/count context for %s', (field) => {
    for (const title of [
      'Puzzle 100 pieces complete', 'Board game 100 pcs', 'Piece Count: 100 puzzle',
      'Number of Pieces: 100', 'Puzzle pieces: 100', 'Puzzle count: 100',
      'Puzzle 100-count', 'Puzzle 100-piece', 'LEGO 6285 with 100 pieces',
      'LEGO set number 6285 Piece Count: 100',
    ]) {
      expect(readToyNumericTitleEvidence(title, field)).toEqual({ value: '100', raw: '100' });
    }
    expect(readToyNumericTitleEvidence('Puzzle 00100 pieces', field)).toEqual({ value: '00100', raw: '00100' });
  });

  it.each(['pieceCount', 'numberOfPieces'] as const)('rejects unlabelled, malformed and unrelated numbers for %s', (field) => {
    for (const title of [
      'LEGO 100 Black Seas Barracuda', 'LEGO Set Number: 100', 'LEGO set #100',
      'Puzzle 100', 'Puzzle 2000 edition', 'Price $100', 'Certificate ID 100',
      'Puzzle 12345678 pieces', 'Puzzle 0 pieces', 'Puzzle 1,000 pieces',
      'Puzzle 100.5 pieces', 'Puzzle ABC100 pieces', 'Puzzle 100A pieces',
      'Puzzle 100/200 pieces', 'Puzzle 100-200 pieces', 'Puzzle $100 pieces',
      'Puzzle Certificate ID: 100 pieces', 'Puzzle lot of 100 pieces',
      'LEGO set number 100 pieces',
    ]) {
      expect(readToyNumericTitleEvidence(title, field)).toBeNull();
    }
  });

  it.each(['pieceCount', 'numberOfPieces'] as const)('does not choose one conflicting count for %s', (field) => {
    for (const title of ['Puzzle 100 pieces or 200 pieces', '100 pcs, count: 200', '100 pieces and 12345678 pcs', '00100 pieces and 100 pcs']) {
      expect(readToyNumericTitleEvidence(title, field)).toBeNull();
      expect(extractToyNumericTitleEvidence(title, field).ambiguous).toBe(true);
    }
    expect(readToyNumericTitleEvidence('100 pieces (100 pcs) complete', field)).toEqual({ value: '100', raw: '100' });
  });

  it('never coerces arbitrary metadata objects, arrays or sourceText into title evidence', () => {
    for (const field of FIELDS) {
      for (const title of [null, undefined, '', 100, ['LEGO 6285'], { sourceText: 'LEGO 6285, 100 pieces' }]) {
        expect(readToyNumericTitleEvidence(title, field)).toBeNull();
        expect(extractToyNumericTitleEvidence(title, field)).toEqual({ observations: [], ambiguous: false });
      }
    }
  });
});
