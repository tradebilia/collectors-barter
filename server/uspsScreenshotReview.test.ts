import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Test AI USPS screenshot review', () => {
  const source = readFileSync(join(process.cwd(), 'server/testAIRouter.ts'), 'utf8');

  it('is admin-only, bounded to an image payload, and does not persist evidence', () => {
    expect(source).toContain('reviewUspsTrackingScreenshot: protectedProcedure');
    expect(source).toContain("if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })");
    expect(source).toContain('max(4_500_000)');
    expect(source).toContain("'Not stored by Tradebilia'");
    expect(source).not.toContain('storagePut(input.imageDataUrl');
  });

  it('requires explicit USPS result text and rejects color-only inference', () => {
    expect(source).toContain('Never infer validity from color');
    expect(source).toContain("'recognized_result'");
    expect(source).toContain("'tracking_not_available'");
    expect(source).toContain("'mismatched_tracking_number'");
    expect(source).toContain("'needs_review'");
    expect(source).toContain('Tracking Not Available');
  });
});
