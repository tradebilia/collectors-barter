export const COMIC_BOOK_COVER_SKETCH_REMARK = 'Comic Book Cover Sketch / Remark';

export const COMICS_ORIGINAL_ART_COVER_SKETCH_FIELDS = {
  comicTitle: 'coverSketchComicTitle',
  issueNumber: 'coverSketchIssueNumber',
} as const;

export function getMissingComicsOriginalArtCoverSketchFields(input: {
  category?: string | null;
  itemType?: string | null;
  itemDetails?: Record<string, unknown> | null;
}): string[] {
  if (String(input.category ?? '').trim().toLowerCase() !== 'comics') return [];
  if (String(input.itemType ?? '').trim().toLowerCase() !== 'original_art') return [];

  const details = input.itemDetails ?? {};
  const artType = String(details.artType ?? '').trim();
  if (artType !== COMIC_BOOK_COVER_SKETCH_REMARK) return [];

  const missing: string[] = [];
  if (!String(details[COMICS_ORIGINAL_ART_COVER_SKETCH_FIELDS.comicTitle] ?? '').trim()) {
    missing.push('Comic Title');
  }
  if (!String(details[COMICS_ORIGINAL_ART_COVER_SKETCH_FIELDS.issueNumber] ?? '').trim()) {
    missing.push('Issue Number');
  }
  return missing;
}
