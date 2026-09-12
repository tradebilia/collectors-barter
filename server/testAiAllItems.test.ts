import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Test AI all-public-items selector', () => {
  const routerSource = fs.readFileSync(path.resolve(import.meta.dirname, './testAIRouter.ts'), 'utf8');
  const pageSource = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');

  it('uses a read-only admin procedure with active-listing and public-profile safeguards', () => {
    expect(routerSource).toContain('getAllPublicItems: protectedProcedure.query');
    expect(routerSource).toContain("if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });");
    expect(routerSource).toContain("l.status = 'active' AND l.isActive = 1");
    expect(routerSource).toContain('isPublicMemberEligible(sql`l.ownerId`)');
  });

  it('returns a privacy-safe owner label without exposing account contact fields', () => {
    expect(routerSource).toContain('ownerDisplayName');
    expect(routerSource).toContain("'Member'");
    expect(routerSource).not.toContain('ownerEmail');
    expect(routerSource).not.toContain('ownerPhone');
  });

  it('exposes both My Inventory and All Public Items selector modes', () => {
    expect(pageSource).toContain("const [inventoryScope, setInventoryScope] = useState<'mine' | 'all'>('mine')");
    expect(pageSource).toContain('My Inventory');
    expect(pageSource).toContain('All Public Items');
    expect(pageSource).toContain('trpc.testAI.getAllPublicItems.useQuery');
    expect(pageSource).toContain('ownerDisplayName');
    expect(pageSource).toContain('active listings from members who allow public profile visibility');
  });
});
