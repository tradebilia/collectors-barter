import { describe, expect, it } from 'vitest';
import { COMICS_ORIGINAL_ART_FIELDS } from '../client/src/lib/fieldDefinitionsGenerated';
import { comicsOriginalartLayout } from '../client/src/lib/layoutConfigs/layouts/comics_original_art';
import { getMissingComicsOriginalArtCoverSketchFields } from '../shared/comicsOriginalArtValidation';

describe('Comics / Original Art artwork title field', () => {
  it('uses the requested visible label without changing the stored field key or layout', () => {
    const field = COMICS_ORIGINAL_ART_FIELDS.find((entry) => entry.name === 'artworkTitle');

    expect(field).toMatchObject({
      name: 'artworkTitle',
      label: 'Artwork Title / Character',
    });
    expect(comicsOriginalartLayout.sections.recommended.fieldLayout.artworkTitle).toBeDefined();
  });

  it('offers a specific Comic Book Cover Sketch / Remark choice without removing Cover Art', () => {
    const field = COMICS_ORIGINAL_ART_FIELDS.find((entry) => entry.name === 'artType');

    expect(field?.dropdownOptions).toContain('Comic Book Cover Sketch / Remark');
    expect(field?.dropdownOptions).not.toContain('Comic Book Cover Art');
    expect(field?.dropdownOptions).toContain('Cover Art');
  });

  it('adds separate required cover-sketch fields and leaves published-art fields unchanged', () => {
    expect(COMICS_ORIGINAL_ART_FIELDS.find((entry) => entry.name === 'coverSketchComicTitle')).toMatchObject({
      name: 'coverSketchComicTitle',
      label: 'Comic Title',
      requirement: 'conditional',
      conditionalLogic: 'Art Type = Comic Book Cover Sketch / Remark',
    });
    expect(COMICS_ORIGINAL_ART_FIELDS.find((entry) => entry.name === 'coverSketchIssueNumber')).toMatchObject({
      name: 'coverSketchIssueNumber',
      label: 'Issue Number',
      requirement: 'conditional',
      conditionalLogic: 'Art Type = Comic Book Cover Sketch / Remark',
    });
    expect(COMICS_ORIGINAL_ART_FIELDS.find((entry) => entry.name === 'issueNumber')).toMatchObject({
      name: 'issueNumber',
      conditionalLogic: 'Original Published Page = Yes',
    });
    expect(comicsOriginalartLayout.sections.required.fieldLayout.coverSketchComicTitle).toEqual({ colSpan: 'half', position: 6 });
    expect(comicsOriginalartLayout.sections.required.fieldLayout.coverSketchIssueNumber).toEqual({ colSpan: 'half', position: 7 });
  });

  it('requires both cover-sketch fields only for the cover sketch/remark art type', () => {
    expect(getMissingComicsOriginalArtCoverSketchFields({
      category: 'comics', itemType: 'original_art', itemDetails: { artType: 'Comic Book Cover Sketch / Remark' },
    })).toEqual(['Comic Title', 'Issue Number']);
    expect(getMissingComicsOriginalArtCoverSketchFields({
      category: 'comics', itemType: 'original_art', itemDetails: {
        artType: 'Comic Book Cover Sketch / Remark', coverSketchComicTitle: 'Spawn', coverSketchIssueNumber: '300',
      },
    })).toEqual([]);
    expect(getMissingComicsOriginalArtCoverSketchFields({
      category: 'comics', itemType: 'original_art', itemDetails: { artType: 'Interior Page', issueNumber: '300' },
    })).toEqual([]);
  });
});
