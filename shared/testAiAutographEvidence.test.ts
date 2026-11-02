import { describe, expect, it } from 'vitest';
import { autographReplicaReasonFromText } from './testAiAutographEvidence';

describe('shared autograph non-hand-signed detector', () => {
  it.each([
    'Babe Ruth Facsimile Autographed Baseball',
    'Babe Ruth Fascimile Autographed Baseball',
    'Babe Ruth Facsimilie Autographed Baseball',
    'Babe Ruth Facsimily Autographed Baseball',
    'Babe Ruth Fascimilie Autographed Baseball',
  ])('rejects facsimile spelling variant: %s', (title) => {
    expect(autographReplicaReasonFromText(title)).toContain('explicitly declares');
  });

  it.each([
    'Babe Ruth Autopen Signed Baseball',
    'Babe Ruth Auto Pen Signed Baseball',
    'Babe Ruth Auto-Pen Signed Baseball',
    'Babe Ruth Printed Autograph Baseball',
    'Babe Ruth Stamped Signature Baseball',
    'Babe Ruth Pre-Print Autograph Baseball',
    'Babe Ruth Reproduction Signed Baseball',
    'Babe Ruth Replica Signed Baseball',
  ])('rejects non-hand-signed wording: %s', (title) => {
    expect(autographReplicaReasonFromText(title)).toContain('explicitly declares');
  });

  it.each([
    'Babe Ruth Signed Baseball with JSA authentication',
    'Babe Ruth Single Signed Official Baseball',
    'Babe Ruth Autographed Baseball - authentic',
  ])('does not reject ordinary signed-item wording: %s', (title) => {
    expect(autographReplicaReasonFromText(title)).toBeNull();
  });
});
