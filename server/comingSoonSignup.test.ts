import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Coming Soon exact supplied composition', () => {
  it('renders the unchanged supplied HTML and wires only its displayed email controls', () => {
    const page = readFileSync(resolve(process.cwd(), 'client/src/pages/ComingSoon.tsx'), 'utf8');

    expect(page).toContain('/manus-storage/tradebilia_coming_soon_exact_ba8c631b.html');
    expect(page).toContain('pointer-events-none');
    expect(page).toContain('aria-label="Tradebilia launch email signup"');
    expect(page).toContain('trpc.launchUpdates.subscribe.useMutation');
    expect(page).toContain('type="email"');
    expect(page).toContain('type="submit"');
    expect(page).not.toContain('max-w-[1815px]');
    expect(page).not.toContain('SUPPLIED_TIDBITS');
    expect(page).not.toContain('SuppliedComingSoonLogo');
  });
});
