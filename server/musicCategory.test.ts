import { describe, expect, it } from 'vitest';
import { tradebiliaCategories, getTradebiliaCategoryTheme } from '../client/src/lib/tradebilia';
import { CATEGORY_ITEM_TYPES } from '../client/src/lib/fieldDefinitionsRemaining';
import {
  MUSIC_CASSETTE_TAPE_FIELDS,
  MUSIC_COMPACT_DISC_FIELDS,
  MUSIC_EIGHT_TRACK_TAPE_FIELDS,
  MUSIC_OTHER_FORMAT_FIELDS,
  MUSIC_VINYL_RECORD_FIELDS,
} from '../client/src/lib/fieldDefinitionsMusic';
import { ITEM_TYPE_LAYOUTS } from '../client/src/lib/layoutConfigs/itemTypeLayouts';
import { getGradingCompanyNamesForCategory } from '../shared/gradingCompanyConfig';
import { forumCategoryLabels, getForumSubcategories } from '../shared/forum';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Music category', () => {
  it('requires the reviewed migration artifact instead of altering legacy enums during listing creation', () => {
    const dbSource = read('server/db.ts');
    const schemaSource = read('drizzle/schema.ts');
    const migrationSource = read('drizzle/0024_p0_music_category_schema.sql');
    const draftMigrationSource = read('drizzle/0025_p0_music_draft_category_schema.sql');
    const driftMigrationSource = read('drizzle/0026_p0_schema_drift_repair.sql');

    expect(dbSource).not.toContain('ensureMusicCategory');
    expect(dbSource).not.toContain('ALTER TABLE listings MODIFY COLUMN category');
    expect(schemaSource).toContain("'movies','music','autographs','disney_pins']).notNull()");
    expect(schemaSource).toContain("'movies','music','autographs','disney_pins','all']).default('all').notNull()");
    expect(migrationSource).toMatch(/ALTER TABLE `listings`\s+MODIFY COLUMN `category`/);
    expect(migrationSource).toMatch(/ALTER TABLE `conventions`\s+MODIFY COLUMN `category`/);
    expect(migrationSource).not.toMatch(/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i);
    expect(draftMigrationSource).toMatch(/ALTER TABLE `draftListings`\s+MODIFY COLUMN `category`/);
    expect(draftMigrationSource).toContain("'movies','music','autographs','disney_pins'");
    expect(draftMigrationSource).not.toMatch(/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i);
    expect(driftMigrationSource).toMatch(/ALTER TABLE `conventionCategories`\s+MODIFY COLUMN `category`/);
    expect(driftMigrationSource).toContain("'paypal','venmo','cash_app','zelle'");
    expect(driftMigrationSource).toContain("'frozen','disputed'");
    expect(driftMigrationSource).toContain('CREATE TABLE IF NOT EXISTS `forumReports`');
    expect(driftMigrationSource).toContain('CREATE TABLE IF NOT EXISTS `forumFollows`');
    expect(driftMigrationSource).toContain('CREATE TABLE IF NOT EXISTS `forumNotifications`');
    expect(driftMigrationSource).not.toMatch(/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\b|\bRENAME\s+COLUMN\b/i);
  });

  it('keeps the logical cash-payment IDs mapped to the preserved live physical columns', () => {
    const schemaSource = read('drizzle/schema.ts');
    expect(schemaSource).toContain('payerId: int("payerUserId")');
    expect(schemaSource).toContain('payeeId: int("payeeUserId")');
  });

  it('registers Music as a first-class marketplace category with a unique visual theme', () => {
    expect(tradebiliaCategories).toContainEqual({ value: 'music', label: 'Music' });
    expect(getTradebiliaCategoryTheme('music')).toMatchObject({
      eyebrow: 'Pressings, tapes, and recorded sound',
      headingFont: "'Bebas Neue', 'Oswald', sans-serif",
    });
  });

  it('maps all approved Music formats into the normal item-type registry', () => {
    expect(CATEGORY_ITEM_TYPES.music).toMatchObject({
      vinyl_record: MUSIC_VINYL_RECORD_FIELDS,
      cassette_tape: MUSIC_CASSETTE_TAPE_FIELDS,
      compact_disc: MUSIC_COMPACT_DISC_FIELDS,
      eight_track_tape: MUSIC_EIGHT_TRACK_TAPE_FIELDS,
      other_music_format: MUSIC_OTHER_FORMAT_FIELDS,
    });
  });

  it('keeps Music fields compact while preserving grading and format conditionals', () => {
    const field = (name: string) => MUSIC_VINYL_RECORD_FIELDS.find(item => item.name === name);
    expect(field('listingTitle')?.requirement).toBe('required');
    expect(field('artist')?.requirement).toBe('required');
    expect(field('releaseTitle')?.requirement).toBe('required');
    expect(field('tradeValue')?.requirement).toBe('required');
    expect(field('photos')?.requirement).toBe('required');
    expect(field('condition')?.conditionalLogic).toBe('Is Graded = no');
    expect(field('gradingCompany')?.dropdownOptions).toEqual(['AMG', 'MGA', 'Rewind', 'Other']);
    expect(field('gradingCompany')?.supportsOther).toBe(true);
    expect(field('playbackNotes')?.conditionalLogic).toBe('Playback Tested = yes');
    expect(field('packagingCondition')?.conditionalLogic).toBe('Packaging Included = yes');
    expect(MUSIC_OTHER_FORMAT_FIELDS.find(item => item.name === 'formatDetails')?.requirement).toBe('required');
  });

  it('registers independent Music layouts and category-aware media graders', () => {
    expect(ITEM_TYPE_LAYOUTS.music_vinyl_record).toMatchObject({ itemType: 'vinyl_record', category: 'music' });
    expect(ITEM_TYPE_LAYOUTS.music_compact_disc.sections.optional.fieldLayout.bookletStatus).toBeDefined();
    expect(ITEM_TYPE_LAYOUTS.music_eight_track_tape.sections.optional.fieldLayout.cartridgeNotes).toBeDefined();
    expect(getGradingCompanyNamesForCategory('music')).toEqual(expect.arrayContaining(['AMG', 'MGA', 'Rewind', 'Raw']));
  });

  it('includes Music in the forum category map and specific format subcategories', () => {
    expect(forumCategoryLabels.music).toBe('Music');
    expect(getForumSubcategories('music').map(item => item.value)).toEqual(expect.arrayContaining([
      'vinyl_records', 'cassette_tapes', 'compact_discs', 'eight_tracks', 'other_music_formats',
    ]));
  });

  it('uses the supplied hero asset and Music-specific filters on the category page', () => {
    const source = read('client/src/pages/CategoryPage.tsx');
    expect(source).toContain('music-headphones-white-rgba_12aa8a48.png');
    expect(source).toContain('music: [');
    expect(source).toContain('Record Label');
    expect(source).toContain('musicFormatOptions');
  });
});
