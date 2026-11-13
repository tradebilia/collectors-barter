export type AutographAuthenticator = {
  shortName: string;
  fullName: string;
  aliases: readonly string[];
};

/**
 * User-provided authoritative Autographs authentication-company registry.
 * Short names are the canonical values used in inventory and title-derived
 * evidence; full names and common punctuation variants are accepted aliases.
 */
export const AUTOGRAPH_AUTHENTICATORS: readonly AutographAuthenticator[] = [
  { shortName: 'PSA/DNA', fullName: 'Professional Sports Authenticator / DNA', aliases: ['PSA/DNA', 'PSA DNA', 'PSA-DNA', 'PSA', 'Professional Sports Authenticator / DNA', 'Professional Sports Authenticator'] },
  { shortName: 'JSA', fullName: 'James Spence Authentication', aliases: ['JSA', 'James Spence Authentication'] },
  { shortName: 'BAS', fullName: 'Beckett Authentication Services', aliases: ['BAS', 'Beckett', 'Beckett Authentication Services'] },
  { shortName: 'PAAS', fullName: 'Professional Autograph Authentication Services', aliases: ['PAAS', 'PAASC', 'Professional Autograph Authentication Services'] },
  { shortName: 'ACOA', fullName: 'AutographCOA', aliases: ['ACOA', 'AutographCOA', 'Autograph COA'] },
  { shortName: 'SWAU', fullName: 'SWAU Authentication', aliases: ['SWAU', 'SWAU Authentication'] },
  { shortName: 'GA', fullName: 'Global Authentics', aliases: ['GA', 'Global Authentics', 'Global Authority, Inc.', 'Global Authority Incorporated'] },
  { shortName: 'REAL', fullName: 'Roger Epperson Authentication Ltd.', aliases: ['REAL', 'Roger Epperson Authentication', 'Roger Epperson Authentication Ltd'] },
  { shortName: 'ZSA', fullName: 'Zarelli Space Authentication', aliases: ['ZSA', 'Zarelli Space Authentication'] },
  { shortName: 'CAS', fullName: 'Certified Authentication Service', aliases: ['CAS', 'Certified Authentication Service'] },
  { shortName: 'ACG', fullName: 'ACG Cert', aliases: ['ACG', 'ACG Cert'] },
  { shortName: 'GOAT', fullName: 'GOAT Authentics', aliases: ['GOAT', 'GOAT Authentics'] },
  { shortName: 'OA', fullName: 'OnlineAuthentics', aliases: ['OA', 'OnlineAuthentics', 'Online Authentics'] },
  { shortName: 'UDA', fullName: 'Upper Deck Authenticated', aliases: ['UDA', 'Upper Deck', 'Upper Deck Authenticated'] },
  { shortName: 'Fanatics', fullName: 'Fanatics Authentic', aliases: ['Fanatics', 'Fanatics Authentic'] },
  { shortName: 'Panini', fullName: 'Panini Authentic', aliases: ['Panini', 'Panini Authentic'] },
  { shortName: 'Steiner', fullName: 'Steiner Sports', aliases: ['Steiner', 'Steiner Sports'] },
  { shortName: 'TRISTAR', fullName: 'TRISTAR Productions', aliases: ['TRISTAR', 'TRISTAR Productions', 'TriStar'] },
  { shortName: 'MM', fullName: 'Mounted Memories', aliases: ['MM', 'Mounted Memories'] },
  { shortName: 'Schwartz', fullName: 'Schwartz Sports Memorabilia', aliases: ['Schwartz', 'Schwartz Sports Memorabilia'] },
  { shortName: 'Radtke', fullName: 'Radtke Sports', aliases: ['Radtke', 'Radtke Sports'] },
  { shortName: 'Fiterman', fullName: 'Fiterman Sports Group', aliases: ['Fiterman', 'Fiterman Sports Group'] },
  { shortName: 'GTSM', fullName: 'GT Sports Marketing', aliases: ['GTSM', 'GT Sports Marketing'] },
  { shortName: 'MAB', fullName: 'MAB Celebrity Services', aliases: ['MAB', 'MAB Celebrity Services'] },
  { shortName: 'SI', fullName: 'Sports Integrity', aliases: ['SI', 'Sports Integrity'] },
  { shortName: 'Frameworth', fullName: 'Frameworth Sports Marketing', aliases: ['Frameworth', 'Frameworth Sports Marketing'] },
  { shortName: 'SOP', fullName: 'Stacks of Plaques', aliases: ['SOP', 'Stacks of Plaques'] },
  { shortName: 'LOJO', fullName: 'LOJO Sports', aliases: ['LOJO', 'LOJO Sports'] },
  { shortName: 'TSC', fullName: 'Total Sports Concepts', aliases: ['TSC', 'Total Sports Concepts'] },
  { shortName: 'TSE', fullName: 'TSE', aliases: ['TSE'] },
  { shortName: 'SP Images', fullName: 'SP Images', aliases: ['SP Images', 'SPImages'] },
  { shortName: 'GNR', fullName: 'Great North Road', aliases: ['GNR', 'Great North Road'] },
  { shortName: 'Authentigraphs', fullName: 'Authentigraphs', aliases: ['Authentigraphs'] },
  { shortName: "Lucky's", fullName: "Lucky's", aliases: ["Lucky's", 'Luckys'] },
  { shortName: 'MLAM', fullName: 'Major League Alumni Marketing', aliases: ['MLAM', 'Major League Alumni Marketing'] },
  { shortName: 'PIA', fullName: 'PIA', aliases: ['PIA'] },
  { shortName: 'MLB', fullName: 'Major League Baseball Authentication', aliases: ['MLB', 'Major League Baseball Authentication'] },
  { shortName: 'CGC SS', fullName: 'CGC Signature Series', aliases: ['CGC SS', 'CGC Signature Series'] },
  { shortName: 'CGC/JSA', fullName: 'CGC / James Spence Authentication', aliases: ['CGC/JSA', 'CGC JSA', 'CGC / James Spence Authentication'] },
  { shortName: 'CBCS', fullName: 'Comic Book Certification Service', aliases: ['CBCS', 'Comic Book Certification Service'] },
  { shortName: 'CBCS VSP', fullName: 'CBCS Verified Signature Program', aliases: ['CBCS VSP', 'CBCS Verified Signature Program'] },
  { shortName: 'CBCS Witnessed', fullName: 'CBCS Witnessed Signature Program', aliases: ['CBCS Witnessed', 'CBCS Witnessed Signature Program'] },
  { shortName: 'JSA WPP', fullName: 'JSA Witness Protection Program', aliases: ['JSA WPP', 'JSA Witness Protection Program'] },
  { shortName: 'Reznikoff', fullName: 'John Reznikoff', aliases: ['Reznikoff', 'John Reznikoff'] },
  { shortName: 'University Archives', fullName: 'University Archives', aliases: ['University Archives'] },
  { shortName: 'Rendell', fullName: 'Kenneth W. Rendell', aliases: ['Rendell', 'Kenneth W. Rendell', 'Kenneth Rendell'] },
  { shortName: 'Hamilton', fullName: 'Charles Hamilton', aliases: ['Hamilton', 'Charles Hamilton'] },
  { shortName: 'Koschal', fullName: 'Stephen Koschal', aliases: ['Koschal', 'Stephen Koschal'] },
  { shortName: 'Floyd Authentic', fullName: 'Floyd Authentic', aliases: ['Floyd Authentic'] },
  { shortName: 'POTP', fullName: 'Piece of the Past', aliases: ['POTP', 'Piece of the Past'] },
  { shortName: 'Kevin Martin', fullName: 'Kevin Martin', aliases: ['Kevin Martin'] },
  { shortName: 'GAI', fullName: 'Global Authentication Incorporated', aliases: ['GAI', 'Global Authentication Incorporated'] },
] as const;

export const AUTOGRAPH_AUTHENTICATION_OPTIONS = AUTOGRAPH_AUTHENTICATORS.map((company) => company.shortName);

function normalized(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
}

function compact(value: unknown): string {
  return normalized(value).replace(/[^a-z0-9]+/g, '');
}

export function normalizeAutographAuthenticator(value: unknown): string {
  const compacted = compact(value);
  if (!compacted) return '';
  const found = AUTOGRAPH_AUTHENTICATORS.find((company) => company.aliases.some((alias) => compact(alias) === compacted));
  return found?.shortName ?? normalized(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find a declared authenticator in a listing title, preferring full names. */
export function findAutographAuthenticatorInText(value: unknown): string | null {
  const text = String(value ?? '');
  const aliases = AUTOGRAPH_AUTHENTICATORS.flatMap((company) => company.aliases.map((alias) => ({ company, alias })))
    .sort((left, right) => right.alias.length - left.alias.length);
  const match = aliases.find(({ alias }) => new RegExp(`(?:^|[^A-Za-z0-9])${escapeRegExp(alias)}(?:$|[^A-Za-z0-9])`, 'i').test(text));
  return match?.company.shortName ?? null;
}

export function autographAuthenticatorsEquivalent(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeAutographAuthenticator(left);
  const normalizedRight = normalizeAutographAuthenticator(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}
