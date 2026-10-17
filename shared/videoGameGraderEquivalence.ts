function normalizeCategory(category: string | null | undefined): string {
  return String(category ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function normalizeCompany(company: string | null | undefined): string {
  return String(company ?? '').trim().toUpperCase();
}

/**
 * PSA acquired WATA. For video-game listing identity only, both labels are
 * accepted as the same grader family. The visible provider label is never
 * rewritten in returned records.
 */
export function canonicalVideoGameGrader(
  category: string | null | undefined,
  company: string | null | undefined,
): string {
  const normalized = normalizeCompany(company);
  if (normalizeCategory(category) === 'video games' && (normalized === 'PSA' || normalized === 'WATA')) {
    return 'PSA/WATA';
  }
  return normalized;
}

export function videoGameGradersEquivalent(
  category: string | null | undefined,
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = canonicalVideoGameGrader(category, left);
  const normalizedRight = canonicalVideoGameGrader(category, right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

export function equivalentVideoGameGrader(
  category: string | null | undefined,
  company: string | null | undefined,
): string | null {
  const normalizedCategory = normalizeCategory(category);
  const normalizedCompany = normalizeCompany(company);
  if (normalizedCategory !== 'video games' || !['PSA', 'WATA'].includes(normalizedCompany)) return null;
  return normalizedCompany === 'PSA' ? 'WATA' : 'PSA';
}
