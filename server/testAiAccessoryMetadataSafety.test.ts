import { describe, expect, it } from 'vitest';
import {
  buildDeclaredIdentityReviews,
  buildVisualTargetMetadata,
  videoGameAccessoryVisualScore,
  withMetadataFieldComparisons,
  type VisualSourceCandidate,
} from './testAiVisualSourceFilter';

// Only deterministic accessory scoring/projection/filter exports are called:
// no provider, model, database, or image/network path is used or mocked.
const target = buildVisualTargetMetadata({
  title: 'NES Power Glove',
  category: 'video_games',
  itemType: 'accessory',
  isGraded: 'No',
  fullItemDetails: {
    accessoryType: 'Controller',
    accessoryName: 'Power Glove',
    platform: 'NES',
    manufacturer: 'Nintendo',
    workingCondition: 'Working',
    originalPackaging: 'Yes',
  },
});

const wrapperKeys = [
  'rawMetadata', 'providerMetadata', 'canonicalCandidate', 'mercariObservation',
] as const;
const expectedFields = [
  'accessoryType', 'accessoryName', 'compatiblePlatform', 'manufacturer',
  'workingCondition', 'completeInBox', 'isGraded',
];
const expectedPoints = [20, 25, 20, 10, 10, 10, 5];

function directCandidate(): VisualSourceCandidate {
  return {
    // Deliberately supplies no identity, platform, working, or packaging clues.
    // Successful awards here must come from the actual structured fields.
    title: 'Vintage gaming peripheral',
    accessoryType: 'Controller',
    accessoryName: 'Power Glove',
    platform: 'NES',
    manufacturer: 'Nintendo',
    workingCondition: 'Working',
    originalPackaging: 'Yes',
    isGraded: 'No',
  };
}

function nullPrototypeWrappers(): Record<string, unknown> {
  return Object.fromEntries(wrapperKeys.map(key => [key, Object.create(null)]));
}

// Freeze all nested fixture objects and snapshot their actual descriptors and
// prototypes (JSON/structuredClone would erase null prototypes or lose methods).
function preserveInput(input: object): () => void {
  const seen = new WeakSet<object>();
  const snapshots: Array<{
    value: object;
    prototype: object | null;
    descriptors: PropertyDescriptorMap;
  }> = [];
  function visit(value: object): void {
    if (seen.has(value)) return;
    seen.add(value);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.value !== null && typeof descriptor.value === 'object') visit(descriptor.value);
    }
    Object.freeze(value);
    snapshots.push({ value, prototype: Object.getPrototypeOf(value), descriptors: Object.getOwnPropertyDescriptors(value) });
  }
  visit(input);
  return () => {
    for (const snapshot of snapshots) {
      expect(Object.getPrototypeOf(snapshot.value)).toBe(snapshot.prototype);
      expect(Object.getOwnPropertyDescriptors(snapshot.value)).toEqual(snapshot.descriptors);
    }
  };
}

function project(candidate: VisualSourceCandidate, scoring: ReturnType<typeof videoGameAccessoryVisualScore>) {
  const scored = {
    ...candidate,
    metadataMatchScore: scoring.score,
    metadataMatchReasons: scoring.matched,
    metadataUnknownFields: scoring.unknown ?? [],
    metadataScoreAwards: scoring.awards,
  };
  const assertUnchanged = preserveInput(scored);
  const result = withMetadataFieldComparisons(target, scored);
  assertUnchanged();
  return result;
}

function expectSameScoringAndComparisons(baseline: VisualSourceCandidate, candidate: VisualSourceCandidate) {
  const assertBaselineUnchanged = preserveInput(baseline);
  const assertCandidateUnchanged = preserveInput(candidate);
  // Establish the initial baseline by calling the exported real scorer directly.
  const initial = videoGameAccessoryVisualScore(baseline, target);
  const initialProjection = project(baseline, initial);
  const scoring = videoGameAccessoryVisualScore(candidate, target);
  const projection = project(candidate, scoring);

  expect(scoring).toEqual(initial);
  expect(scoring.matched).toEqual(initial.matched);
  expect(scoring.unknown).toEqual(initial.unknown);
  expect(scoring.awards).toEqual(initial.awards);
  expect(projection.metadataMatchScore).toBe(initialProjection.metadataMatchScore);
  expect(projection.metadataMatchReasons).toEqual(initialProjection.metadataMatchReasons);
  expect(projection.metadataUnknownFields).toEqual(initialProjection.metadataUnknownFields);
  expect(projection.metadataScoreAwards).toEqual(initialProjection.metadataScoreAwards);
  expect(projection.metadataFieldComparisons).toEqual(initialProjection.metadataFieldComparisons);
  expect(projection.metadataFieldComparisons.length).toBeGreaterThan(0);
  assertBaselineUnchanged();
  assertCandidateUnchanged();
  return { scoring, projection };
}

function expectAllAccessoryAwards(scoring: ReturnType<typeof videoGameAccessoryVisualScore>) {
  expect(scoring.score).toBe(100);
  expect(scoring.matched).toEqual(expectedFields);
  expect(scoring.unknown).toEqual([]);
  expect(scoring.awards.map(award => award.field)).toEqual(expectedFields);
  expect(scoring.awards.map(award => award.awardedPoints)).toEqual(expectedPoints);
}

describe('Video Games / Accessory metadata coercion safety', () => {
  it.each(wrapperKeys)('ignores a top-level null-prototype %s wrapper without changing the direct baseline', key => {
    const wrapper = Object.create(null);
    // This fixture reproduces the exact former String(Object.create(null)) bug.
    expect(() => String(wrapper)).toThrow(TypeError);
    const baseline = directCandidate();
    const { scoring } = expectSameScoringAndComparisons(baseline, { ...baseline, [key]: wrapper });
    expectAllAccessoryAwards(scoring);
  });

  it('ignores all four null-prototype wrappers together', () => {
    const baseline = directCandidate();
    const { scoring } = expectSameScoringAndComparisons(baseline, { ...baseline, ...nullPrototypeWrappers() });
    expectAllAccessoryAwards(scoring);
  });

  it.each([
    { label: 'scalar strings', array: false, packaging: 'Yes' },
    { label: 'singleton scalar arrays', array: true, packaging: 'Yes' },
    { label: 'boolean scalar arrays', array: true, packaging: true },
    { label: 'finite-number scalar arrays', array: true, packaging: 1 },
  ])('keeps name/type/manufacturer/platform/working/packaging awards from $label aspects', ({ array, packaging }) => {
    const fields = {
      accessoryType: 'Controller',
      accessoryName: 'Power Glove',
      platform: 'NES',
      manufacturer: 'Nintendo',
      workingCondition: 'Working',
      originalPackaging: packaging,
    };
    const baseline: VisualSourceCandidate = {
      title: 'Vintage gaming peripheral',
      isGraded: 'No',
      aspects: Object.entries(fields).map(([name, value]) => ({ name, value: array ? [value] : value })),
    };
    const { scoring } = expectSameScoringAndComparisons(baseline, { ...baseline, ...nullPrototypeWrappers() });
    expectAllAccessoryAwards(scoring);
    expect(scoring.awards.every(award => award.source === 'structured')).toBe(true);
    if (packaging === 'Yes') {
      // Moving identical scalar evidence into aspect arrays must not lose awards
      // or substitute title-derived witnesses.
      expect(scoring).toEqual(videoGameAccessoryVisualScore(directCandidate(), target));
    }
  });

  it.each(wrapperKeys)('never invokes an arbitrary %s object toString', key => {
    let coercions = 0;
    const arbitraryObject = {
      toString() {
        coercions += 1;
        throw new Error('untrusted metadata object was coerced');
      },
    };
    const baseline = directCandidate();
    const { scoring } = expectSameScoringAndComparisons(baseline, { ...baseline, [key]: arbitraryObject });
    expectAllAccessoryAwards(scoring);
    expect(coercions).toBe(0);
  });

  it('still uses a genuine Power Glove title over generic provider labels, without treating included manuals as manual-only', () => {
    const baseline: VisualSourceCandidate = {
      ...directCandidate(),
      title: 'Nintendo NES Power Glove Controller Tested Working Complete with Manuals',
      accessoryName: 'Generic Controller',
      accessoryType: 'Generic Accessory',
    };
    const candidate = { ...baseline, ...nullPrototypeWrappers() };
    const { scoring, projection } = expectSameScoringAndComparisons(baseline, candidate);
    expectAllAccessoryAwards(scoring);
    for (const field of ['accessoryName', 'accessoryType', 'manufacturer']) {
      expect(scoring.awards.find(award => award.field === field)).toMatchObject({
        source: 'title',
        evidence: [{ field, source: 'title', value: baseline.title }],
      });
      expect(projection.metadataFieldComparisons.find(row => row.fieldKey === field)).toMatchObject({
        titleDerivedStatus: 'match',
        rankingContribution: { matched: true, titleDerived: true },
      });
    }
    expect(buildDeclaredIdentityReviews([baseline], target)).toEqual([]);
    expect(buildDeclaredIdentityReviews([candidate], target)).toEqual([]);
  });

  it('still rejects manual-only Power Glove listings despite matching structured metadata and safe wrappers', () => {
    const baseline = { ...directCandidate(), title: 'Nintendo NES Power Glove Controller Manual Only' };
    const candidate = { ...baseline, ...nullPrototypeWrappers() };
    expectSameScoringAndComparisons(baseline, candidate);
    const initialReviews = buildDeclaredIdentityReviews([baseline], target);
    expect(initialReviews).toHaveLength(1);
    expect(initialReviews[0]).toMatchObject({ candidateIndex: 0, verdict: 'mismatch' });
    expect(initialReviews[0].rationale).toContain('manual or instructions only');
    expect(buildDeclaredIdentityReviews([candidate], target)).toEqual(initialReviews);
  });
});
