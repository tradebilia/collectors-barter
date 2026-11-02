const AUTOGRAPH_REPLICA_PATTERNS: readonly [RegExp, string][] = [
  [/\bf(?:acsimil|ascimil)(?:e|y|ie)\b/i, 'candidate title or description declares a facsimile autograph'],
  [/\breplica\b/i, 'candidate title or description declares a replica autograph'],
  [/\breprod(?:uction|ution)\b/i, 'candidate title or description declares a reproduction autograph'],
  [/\b(?:printed|print)\s+(?:signature|autograph)\b/i, 'candidate title or description declares a printed signature'],
  [/\b(?:stamped|stamp)\s+(?:signature|autograph)\b/i, 'candidate title or description declares a stamped signature'],
  [/\bauto[- ]?pen\b/i, 'candidate title or description declares an autopen signature'],
  [/\b(?:machine|mechanically)\s*[- ]?signed\b/i, 'candidate title or description declares a mechanically signed autograph'],
  [/\b(?:pre[- ]?print|preprint)\s+(?:signature|autograph)\b/i, 'candidate title or description declares a preprint signature'],
];

/** Returns a deterministic exclusion reason for non-hand-signed autograph evidence. */
export function autographReplicaReasonFromText(value: unknown): string | null {
  const text = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const match = AUTOGRAPH_REPLICA_PATTERNS.find(([pattern]) => pattern.test(text));
  return match
    ? `Autograph candidate explicitly declares Facsimile or equivalent non-hand-signed wording; replica or reproduction signed objects are excluded from market-range evidence.`
    : null;
}
