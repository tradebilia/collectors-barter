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

  it('keeps the streamlined capture action permissioned and non-persistent', () => {
    const pageSource = readFileSync(join(process.cwd(), 'client/src/pages/TestAI.tsx'), 'utf8');
    expect(pageSource).toContain('const openUspsAndCapture = () =>');
    expect(pageSource).toContain("window.open(officialUspsTrackingUrl, '_blank', 'noopener,noreferrer')");
    expect(pageSource).toContain('navigator.mediaDevices.getDisplayMedia');
    expect(pageSource).toContain('submitUspsScreenshotForReview(image)');
    expect(pageSource).toContain('Capture selected tab/window');
    expect(pageSource).not.toContain('document.cookie');
    expect(pageSource).not.toContain('bypass');
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
