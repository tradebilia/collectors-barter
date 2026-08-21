import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');

describe('second-pass P1 reliability repairs', () => {
  it('uses registered settings and login actions instead of stale route strings', () => {
    expect(read('client/src/pages/PublicProfile.tsx')).toContain('setLocation("/account-settings")');
    expect(read('client/src/pages/Home.tsx')).toContain('href="/account-settings"');
    expect(read('client/src/pages/ForgotPassword.tsx')).not.toContain('setLocation("/signin")');
    expect(read('client/src/pages/ResetPassword.tsx')).not.toContain('setLocation("/signin")');
    expect(read('client/src/pages/ForgotPassword.tsx')).toContain('onClick={startLogin}');
    expect(read('client/src/pages/ResetPassword.tsx')).toContain('onClick={startLogin}');
  });

  it('retains only the server-backed Account Setup email verification path', () => {
    const source = read('client/src/pages/AccountSetup.tsx');
    expect(source).toContain('await verifyEmailCodeMutation.mutateAsync({ code: emailVerificationCode })');
    expect(source).not.toContain('if (emailVerificationCode.length >= 4)');
    expect(source).not.toContain('toast.success("Verification code resent to your email")');
  });

  it('makes market-data cache management admin-only and honest about availability', () => {
    const source = read('server/_core/marketDataRouter.ts');
    const start = source.indexOf('clearCache: protectedProcedure');
    const block = source.slice(start);
    expect(block).toContain("ctx.user.role !== 'admin'");
    expect(block).toContain("code: 'FORBIDDEN'");
    expect(block).toContain('success: false');
    expect(block).not.toContain("success: true,\n        message: 'Cache cleared'");
  });
});
