import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Coming Soon supplied composition', () => {
  it('preserves the supplied artwork, animated logo, and lower tidbits while placing signup in the gap', () => {
    const page = readFileSync(resolve(process.cwd(), 'client/src/pages/ComingSoon.tsx'), 'utf8');
    const logo = readFileSync(resolve(process.cwd(), 'client/src/components/SuppliedComingSoonLogo.tsx'), 'utf8');

    expect(page).toContain('/manus-storage/coming-soon-exact-supplied-clean-row_d8aa56d4.png');
    expect(page).toContain('aria-label="Tradebilia launch email signup"');
    expect(page).toContain('SUPPLIED_TIDBITS');
    expect(page).toContain('trpc.launchUpdates.subscribe.useMutation');
    expect(page).not.toContain('Collections on the exchange');
    expect(page.indexOf('Tradebilia launch email signup')).toBeLessThan(page.indexOf('Tradebilia platform highlights'));

    expect(logo).toContain('TRADEBILIA');
    expect(logo).toContain('comingSoonPinwheelSpin');
    expect(logo).toContain('#A97AD7');
    expect(logo).toContain('#29A8FF');
  });
});
