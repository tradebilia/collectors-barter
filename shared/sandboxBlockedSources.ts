/**
 * Specialist source IDs whose tested public access path returned HTTP 403.
 *
 * A blocked source is removed from the sandbox UI and applicability policy; it
 * must not remain selectable while its access contract is unavailable.
 */
export const SANDBOX_SITE_BLOCKED_SOURCE_IDS = [
  'heritage',
  'university_archives',
  'swann',
  'rr_auction',
  'alexander_historical',
] as const;

export type SandboxSiteBlockedSourceId = typeof SANDBOX_SITE_BLOCKED_SOURCE_IDS[number];

export function isSandboxSiteBlockedSource(sourceId: string): boolean {
  return (SANDBOX_SITE_BLOCKED_SOURCE_IDS as readonly string[]).includes(sourceId);
}
