import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COINS_SINGLE_COIN_FIELDS,
  COMICS_SINGLE_COMIC_FIELDS,
  POKEMON_SINGLE_CARD_FIELDS,
  SPORTS_CARDS_SINGLE_CARD_FIELDS,
  STAMPS_SINGLE_STAMP_FIELDS,
  VIDEO_GAMES_GAME_FIELDS,
} from '../client/src/lib/fieldDefinitionsGenerated';
import { buildStructuredItemQuery } from '../shared/testAiCriteria';
import { findMaterialMetadataConflicts } from '../shared/testAiMetadataConflict';

function field(fields: Array<{ name: string }>, name: string) {
  return fields.find((entry) => entry.name === name);
}

function metadata(category: string, details: Record<string, unknown>) {
  return `title=Target; category=${category}; fullItemDetails=${JSON.stringify(details)}`;
}

describe('approved Test AI identity fields', () => {
  it('exposes every approved new field in its relevant recommended or conditional form section', () => {
    expect(field(VIDEO_GAMES_GAME_FIELDS, 'upc')).toMatchObject({
      label: 'UPC / EAN (if printed on packaging)', requirement: 'recommended',
    });
    expect(field(COINS_SINGLE_COIN_FIELDS, 'designation')).toMatchObject({
      label: 'Strike / Designation (as printed on holder)', requirement: 'recommended',
    });
    expect(field(SPORTS_CARDS_SINGLE_CARD_FIELDS, 'gradeQualifier')).toMatchObject({
      requirement: 'recommended', conditionalLogic: 'Is Graded = yes',
    });
    expect(field(POKEMON_SINGLE_CARD_FIELDS, 'gradeQualifier')).toMatchObject({
      requirement: 'recommended', conditionalLogic: 'Is Graded = yes',
    });
    expect(field(COMICS_SINGLE_COMIC_FIELDS, 'certificationLabelStatus')).toMatchObject({
      requirement: 'recommended', conditionalLogic: 'Is Graded = yes',
    });
    expect(field(COMICS_SINGLE_COMIC_FIELDS, 'labelNotation')).toMatchObject({
      requirement: 'recommended', conditionalLogic: 'Certification Label Status = Restored|Conserved',
    });
    for (const name of ['perforation', 'watermark', 'overprintSurcharge']) {
      expect(field(STAMPS_SINGLE_STAMP_FIELDS, name)).toMatchObject({ requirement: 'recommended' });
    }
    expect(field(SPORTS_CARDS_SINGLE_CARD_FIELDS, 'serialNumber')).toMatchObject({
      label: 'Serial Number / Print Run (example: 10/100)', maxLength: 14,
    });
  });

  it('places each new input in the relevant recommendation layout rather than showing it globally', () => {
    const layouts = [
      ['sports_cards_single_card.ts', 'serialNumber', 'gradeQualifier'],
      ['pokemon_single_card.ts', 'gradeQualifier'],
      ['coins_single_coin.ts', 'designation'],
      ['comics_single_comic.ts', 'certificationLabelStatus', 'labelNotation'],
      ['stamps_single_stamp.ts', 'perforation', 'watermark', 'overprintSurcharge'],
      ['video_games_game.ts', 'upc'],
    ] as const;
    for (const [filename, ...keys] of layouts) {
      const source = readFileSync(resolve(import.meta.dirname, `../client/src/lib/layoutConfigs/layouts/${filename}`), 'utf8');
      for (const key of keys) expect(source).toContain(`${key}: {`);
    }
  });

  it('uses stored sports-card parallel data and cautious music matrix data in structured queries', () => {
    const sports = buildStructuredItemQuery('sports_cards', {
      year: '2024', manufacturer: 'Topps', player: 'Example Player', parallelVariation: 'Gold Wave', serialNumber: '10/100',
    });
    expect(sports).toContain('Gold Wave');

    const music = buildStructuredItemQuery('music', {
      artist: 'Example Artist', releaseTitle: 'Example Release', pressingDetails: 'Matrix ABC-123 / DEF-456',
    });
    expect(music).toContain('Matrix ABC-123 / DEF-456');
    expect(buildStructuredItemQuery('music', {
      artist: 'Example Artist', releaseTitle: 'Example Release', pressingDetails: 'Nice copy from my shelf',
    })).not.toContain('Nice copy from my shelf');
  });

  it('uses explicit new candidate metadata conflicts while preserving missing candidate data as unknown', () => {
    const cases = [
      ['coins', { designation: 'DCAM' }, { designation: 'CAM' }, 'designation'],
      ['comics', { certificationLabelStatus: 'Restored' }, { labelStatus: 'Universal' }, 'certificationLabelStatus'],
      ['video_games', { upc: '012345678905' }, { ean: '999999999999' }, 'upc'],
      ['stamps', { watermark: 'Multiple Crown CA' }, { watermarkType: 'Single Crown CA' }, 'watermark'],
      ['stamps', { perforation: 'Perf 12' }, { perf: 'Perf 11' }, 'perforation'],
      ['stamps', { overprintSurcharge: 'Specimen' }, { surcharge: 'Official' }, 'overprintSurcharge'],
      ['sports_cards', { parallelVariation: 'Gold Wave' }, { parallel: 'Base' }, 'parallel'],
      ['sports_cards', { serialNumber: '10/100' }, { serial: '2/99' }, 'serialNumber'],
      ['pokemon', { gradeQualifier: 'OC' }, { labelDesignation: 'MK' }, 'gradeQualifier'],
      ['music', { pressingDetails: 'Matrix ABC-123' }, { matrixRunout: 'Matrix XYZ-999' }, 'pressingDetails'],
    ] as const;

    for (const [category, target, candidate, expectedField] of cases) {
      expect(findMaterialMetadataConflicts(metadata(category, target), { title: 'Target candidate', itemDetails: JSON.stringify(candidate) }))
        .toEqual(expect.arrayContaining([expect.objectContaining({ field: expectedField })]));
    }
    expect(findMaterialMetadataConflicts(metadata('coins', { designation: 'DCAM' }), { title: 'Candidate with no provider designation' })).toEqual([]);
  });
});
