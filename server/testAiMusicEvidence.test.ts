import { describe, expect, it } from 'vitest';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { buildTestAiP0Identity } from '../shared/testAiP0Evidence';

describe('Music evidence normalization', () => {
  const music = {
    title: 'Kind of Blue',
    category: 'music',
    itemDetails: JSON.stringify({
      artist: 'Miles Davis',
      releaseTitle: 'Kind of Blue',
      catalogNumber: 'CL 1355',
      recordLabel: 'Columbia',
      country: 'US',
      releaseYear: '1959',
      format: 'Vinyl',
      pressing: 'First pressing',
    }),
  };

  it('requires artist and release title before Music records can support identity-ready comparison', () => {
    const identity = buildTestAiP0Identity(music);
    expect(identity.readiness).toBe('ready');
    expect(identity.materialFields).toEqual(['artist', 'releaseTitle']);
    expect(identity.fields.map((field) => field.key)).toEqual(expect.arrayContaining(['artist', 'releaseTitle']));
  });

  it('aligns an exact selected release but exposes pressing conflicts for review', () => {
    const summary = normalizeTestAiEvidence(music, [{
      id: 'discogs',
      label: 'Discogs Music Catalog',
      kind: 'reference',
      status: 'success',
      fields: {
        artist: 'Miles Davis',
        releaseTitle: 'Kind of Blue',
        catalogNumber: 'CL 1355',
        recordLabel: 'Columbia',
        country: 'US',
        format: 'Vinyl',
        pressing: 'Second pressing',
      },
    }]);
    expect(summary.alignedSources[0]?.fields).toEqual(expect.arrayContaining(['Artist', 'Release title', 'Catalog #', 'Label', 'Country', 'Format']));
    expect(summary.reviewFlags.some((flag) => flag.kind === 'material' && flag.field === 'Edition / pressing')).toBe(true);
  });

  it('does not fabricate Discogs alignment when a multi-candidate search has no selected release fields', () => {
    const summary = normalizeTestAiEvidence(music, [{
      id: 'discogs',
      label: 'Discogs Music Catalog',
      kind: 'reference',
      status: 'success',
      message: 'Multiple release candidates require selection.',
    }]);
    expect(summary.alignedSources).toHaveLength(0);
    expect(summary.sources[0]?.role).toBe('reference_context');
  });
});
