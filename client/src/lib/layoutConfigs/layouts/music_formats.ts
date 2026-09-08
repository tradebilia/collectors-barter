import type { ItemTypeLayoutConfig } from '../layoutTypes';

const commonRequired = {
  listingTitle: { colSpan: 'half' as const, position: 1 },
  artist: { colSpan: 'half' as const, position: 2 },
  releaseTitle: { colSpan: 'half' as const, position: 3 },
  tradeValue: { colSpan: 'half' as const, position: 4 },
  photos: { colSpan: 'full' as const, position: 5 },
  isGraded: { colSpan: 'half' as const, position: 6 },
  condition: { colSpan: 'half' as const, position: 7 },
  gradingCompany: { colSpan: 'half' as const, position: 8 },
  grade: { colSpan: 'half' as const, position: 9 },
  certificationNumber: { colSpan: 'half' as const, position: 10 },
};

const commonRecommended = {
  recordLabel: { colSpan: 'half' as const, position: 1 },
  catalogNumber: { colSpan: 'half' as const, position: 2 },
  releaseYear: { colSpan: 'half' as const, position: 3 },
  country: { colSpan: 'half' as const, position: 4 },
  edition: { colSpan: 'half' as const, position: 5 },
  playbackTested: { colSpan: 'half' as const, position: 6 },
  packagingIncluded: { colSpan: 'half' as const, position: 7 },
};

const commonOptional = {
  genre: { colSpan: 'half' as const, position: 1 },
  packagingCondition: { colSpan: 'half' as const, position: 2 },
  playbackNotes: { colSpan: 'full' as const, position: 3 },
};

const musicLayout = (itemType: string, fieldLayout: Record<string, { colSpan: 'full' | 'half'; position: number }>): ItemTypeLayoutConfig => ({
  itemType,
  category: 'music',
  sections: {
    required: { columns: 2, fieldLayout: commonRequired },
    recommended: { columns: 2, fieldLayout: commonRecommended },
    optional: { columns: 2, fieldLayout },
  },
  spacing: { gap: 'gap-6', padding: 'p-4' },
  conditionalFieldPlacement: { isGraded: 'right', playbackTested: 'below', packagingIncluded: 'right' },
});

export const musicVinylRecordLayout = musicLayout('vinyl_record', {
  ...commonOptional,
  recordSize: { colSpan: 'half', position: 4 },
  playbackSpeed: { colSpan: 'half', position: 5 },
  pressingDetails: { colSpan: 'full', position: 6 },
});

export const musicCassetteTapeLayout = musicLayout('cassette_tape', {
  ...commonOptional,
  inlayBookletStatus: { colSpan: 'half', position: 4 },
});

export const musicCompactDiscLayout = musicLayout('compact_disc', {
  ...commonOptional,
  bookletStatus: { colSpan: 'half', position: 4 },
});

export const musicEightTrackTapeLayout = musicLayout('eight_track_tape', {
  ...commonOptional,
  cartridgeNotes: { colSpan: 'full', position: 4 },
});

export const musicOtherFormatLayout = musicLayout('other_music_format', {
  ...commonOptional,
  formatDetails: { colSpan: 'half', position: 4 },
});
