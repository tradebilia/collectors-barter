import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');

describe('second-pass P0 privacy and authorization repairs', () => {
  it('returns only an allow-listed public profile projection', () => {
    const source = read('server/routers.ts');
    const start = source.indexOf('getUserProfile: publicProcedure');
    const end = source.indexOf('search: publicProcedure', start);
    const block = source.slice(start, end);

    expect(block).not.toContain('u.email,');
    expect(block).not.toContain('u.facebookEmail');
    expect(block).not.toContain('u.linkedinEmail');
    expect(block).not.toContain('SELECT * FROM userProfiles');
    expect(block).toContain('AS isOnline');
  });

  it('requires inquiry reply retrieval to be participant-aware', () => {
    const routerSource = read('server/routers.ts');
    const dbSource = read('server/db.ts');

    expect(routerSource).toContain('getRepliesByInquiry(input.inquiryId, ctx.user.id)');
    expect(dbSource).toContain('getRepliesByInquiry(inquiryId: number, userId: number)');
    expect(dbSource).toContain("You can only view replies to inquiries you're involved in");
  });

  it('requires trade-complaint callers to participate in the disputed trade', () => {
    const source = read('server/tradeFlowRouter.ts');
    const start = source.indexOf('fileComplaint: protectedProcedure');
    const end = source.indexOf('leaveTradeReview: protectedProcedure', start);
    const block = source.slice(start, end);

    expect(block).toContain("Only trade participants can file a complaint.");
    expect(block).toContain("code: 'FORBIDDEN'");
    expect(block).toContain('tradeProposals.requesterId');
    expect(block).toContain('tradeProposals.recipientId');
  });
});
