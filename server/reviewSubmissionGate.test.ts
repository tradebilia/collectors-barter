import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const warRoomSource = readFileSync(resolve(projectRoot, 'client/src/pages/WarRoom.tsx'), 'utf8');
const tradeFlowSource = readFileSync(resolve(projectRoot, 'server/tradeFlowRouter.ts'), 'utf8');

describe('Step 6 review submission gate', () => {
  it('keeps Submit Review disabled until every rating has a value', () => {
    expect(warRoomSource).toContain('const hasAllReviewRatings = Object.values(reviewRatings).every((rating) => rating > 0);');
    expect(warRoomSource).toContain('disabled={leaveReviewMutation.isPending || !hasAllReviewRatings}');
  });

  it('rejects incomplete review ratings at the server input boundary', () => {
    const reviewSchemaStart = tradeFlowSource.indexOf('const leaveReviewSchema = z.object({');
    const reviewSchemaEnd = tradeFlowSource.indexOf('\n});', reviewSchemaStart);
    const reviewSchemaSource = tradeFlowSource.slice(reviewSchemaStart, reviewSchemaEnd);

    expect(reviewSchemaSource).toContain('tradeExperienceRating: z.number().int().min(1).max(5)');
    expect(reviewSchemaSource).toContain('itemConditionRating: z.number().int().min(1).max(5)');
    expect(reviewSchemaSource).toContain('communicationRating: z.number().int().min(1).max(5)');
    expect(reviewSchemaSource).toContain('shippingSpeedRating: z.number().int().min(1).max(5)');
  });
});
