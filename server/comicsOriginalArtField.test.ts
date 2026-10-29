import { describe, expect, it } from 'vitest';
import { COMICS_ORIGINAL_ART_FIELDS } from '../client/src/lib/fieldDefinitionsGenerated';
import { comicsOriginalartLayout } from '../client/src/lib/layoutConfigs/layouts/comics_original_art';

describe('Comics / Original Art artwork title field', () => {
  it('uses the requested visible label without changing the stored field key or layout', () => {
    const field = COMICS_ORIGINAL_ART_FIELDS.find((entry) => entry.name === 'artworkTitle');

    expect(field).toMatchObject({
      name: 'artworkTitle',
      label: 'Artwork Title / Character',
    });
    expect(comicsOriginalartLayout.sections.recommended.fieldLayout.artworkTitle).toBeDefined();
  });
});
