import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routerSource = readFileSync(new URL('./tradeFlowRouter.ts', import.meta.url), 'utf8');
const warRoomSource = readFileSync(new URL('../client/src/pages/WarRoom.tsx', import.meta.url), 'utf8');
const adminSource = readFileSync(new URL('../client/src/pages/AdminDashboard.tsx', import.meta.url), 'utf8');

describe('Trade Room dispute reporting contracts', () => {
  it('serializes an authenticated participant dispute transition and limits it to post-acceptance states', () => {
    expect(routerSource).toMatch(/markTradeDisputed:\s*protectedProcedure/);
    expect(routerSource).toContain('FOR UPDATE');
    expect(routerSource).toContain("['accepted', 'shipping', 'shipped', 'completed'].includes(proposal.status)");
    expect(routerSource).toContain('Only trade participants can request dispute review');
    expect(routerSource).toContain("status = 'disputed'");
  });

  it('writes durable administrator audit and participant system-notice records within the dispute transaction', () => {
    expect(routerSource).toContain('tx.insert(tradeAdminLog)');
    expect(routerSource).toContain("eventType: 'disputed'");
    expect(routerSource).toContain('tx.insert(tradeMessages)');
    expect(routerSource).toContain("messageType: 'system'");
    expect(routerSource).toContain('requested administrator dispute review');
  });

  it('renders an explicit confirmation-based dispute action and pauses disputed trades without mobile-layout changes', () => {
    expect(warRoomSource).toContain('Request Dispute Review');
    expect(warRoomSource).toContain('Request dispute review?');
    expect(warRoomSource).toContain('Mark Trade Disputed');
    expect(warRoomSource).toContain("case 'disputed': return 'disputed'");
    expect(warRoomSource).toContain('Trade changes and completion actions are paused.');
    expect(warRoomSource).toContain('canRequestDisputeReview');
  });

  it('allows administrators to preserve resolution notes with report status changes', () => {
    expect(adminSource).toContain('reportResolutionNotes');
    expect(adminSource).toContain('Resolution Notes');
    expect(adminSource).toContain('adminNotes: reportResolutionNotes.trim() || undefined');
    expect(adminSource).toContain('Current Resolution Notes');
  });
});
