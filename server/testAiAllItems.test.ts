import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Test AI all-sandbox-items selector', () => {
  const routerSource = fs.readFileSync(path.resolve(import.meta.dirname, './testAIRouter.ts'), 'utf8');
  const pageSource = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');
  const sandboxProcedure = routerSource.slice(
    routerSource.indexOf('getAllSandboxItems: protectedProcedure.query'),
    routerSource.indexOf('lookupUspsTracking:', routerSource.indexOf('getAllSandboxItems: protectedProcedure.query')),
  );
  const myInventoryProcedure = routerSource.slice(
    routerSource.indexOf('getMyInventory: protectedProcedure.query'),
    routerSource.indexOf('getAllSandboxItems:', routerSource.indexOf('getMyInventory: protectedProcedure.query')),
  );

  it('uses a read-only admin procedure that includes every listing state', () => {
    expect(sandboxProcedure).toContain('getAllSandboxItems: protectedProcedure.query');
    expect(sandboxProcedure).toContain("if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });");
    expect(sandboxProcedure).toContain('l.status, l.isActive');
    expect(sandboxProcedure).not.toContain("l.status = 'active'");
    expect(sandboxProcedure).not.toContain('isPublicMemberEligible');
    expect(myInventoryProcedure).not.toContain("l.status = 'active'");
    expect(myInventoryProcedure).not.toContain('l.isActive = 1');
  });

  it('returns a non-contact owner label and explicit listing state for sandbox review', () => {
    expect(sandboxProcedure).toContain('ownerDisplayName');
    expect(sandboxProcedure).toContain("'Member'");
    expect(sandboxProcedure).toContain('status: r.status');
    expect(sandboxProcedure).toContain('isActive: Number(r.isActive) === 1');
    expect(sandboxProcedure).not.toContain('ownerEmail');
    expect(sandboxProcedure).not.toContain('ownerPhone');
  });

  it('exposes both My Inventory and All Sandbox Items selector modes with availability labels', () => {
    expect(pageSource).toContain("const [inventoryScope, setInventoryScope] = useState<'mine' | 'all'>('mine')");
    expect(pageSource).toContain('My Inventory');
    expect(pageSource).toContain('All Sandbox Items');
    expect(pageSource).toContain('trpc.testAI.getAllSandboxItems.useQuery');
    expect(pageSource).toContain('ownerDisplayName');
    expect(pageSource).toContain('itemAvailabilityLabel(i)');
    expect(pageSource).toContain('administrator-only analyzer sandbox');
  });

  it('does not render an empty Item B data or source column until Item B is selected', () => {
    expect(pageSource).toContain("${leftItem && rightItem ? 'grid-cols-2' : 'grid-cols-1'}");
    expect(pageSource).toContain('{rightItem && <DataColumn item={rightItem}');
    expect(pageSource).not.toContain("{rightItem ? <SourceSelector enabled={rightSources}");
  });
});
