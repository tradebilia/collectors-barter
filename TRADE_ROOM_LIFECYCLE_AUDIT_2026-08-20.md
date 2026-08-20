# Trade Room Lifecycle Audit

## Bottom Line

The Trade Room has a strong core process. It protects participation, delays contact disclosure until mutual acceptance, requires both parties to confirm before shipping, locks traded items, records tracking and milestones, enforces a single review per participant, preserves a downloadable receipt, and provides a report path. The main remaining risks are **atomicity around proposal and acceptance updates** and **the handoff from a member-reported issue to an explicitly disputed trade state**.

Some potential concerns were reviewed and are **not current defects**. First-time Account Setup requires server-persisted verified email and phone before completion. A scheduled lifecycle process already expires one-sided trade acceptance after 72 hours, cancels stale pending or negotiating trades after 30 days, and escalates tracked-but-unconfirmed trades after 15 days. The Trade Room already states that Tradebilia does not process payments and is not responsible for payment disputes or losses.

## Step-by-Step Assessment

| Trade Room segment | What is working | Verified gap or improvement | Priority |
|---|---|---|---|
| Proposal creation and item selection | Self-trade, listing availability, standing, ownership, and participant authorization safeguards are present. | `sendTradeProposal` deletes and reinserts offered items through separate statements rather than one explicit transaction. A failure midway can leave a partial offer. The request has no maximum offered-item count. | Before broader launch |
| Negotiation and counteroffers | Draft edits no longer flip the persisted negotiation turn; acceptance is correctly gated when a local counteroffer is unsent. | No material functional defect found. Consolidating legacy and current proposal paths would reduce maintenance risk. | Later |
| Final review and mutual commitment | Both parties must confirm; items lock and competing proposals are cancelled after mutual confirmation. One-sided confirmation is already expired by scheduled logic after 72 hours. | Acceptance and transition use multiple statements without an explicit atomic/idempotent boundary. Concurrent confirmations could create duplicate activity or inconsistent intermediate state under rare racing requests. | Before broader launch |
| Shipping preparation | Contact data is shown only to authorized participants in accepted/shipping states. Server-side verified email and phone requirements are enforced at Account Setup. Deadlines and reminders exist. | Address quality is stored but not normalized or validated against a delivery-address service. This is a data-quality improvement, not a bypass of the current verified-contact gate. | Before broader launch |
| Tracking and reminders | Participants-only tracking, idempotent reminder markers, opt-out preferences, official USPS-link fallback, and other carrier adapters are in place. | Operationally, reminder jobs need a documented pre-launch/cutover check so they cannot send unintended notices in a staging or migration situation. | Launch preparation |
| Completion, receipt, and reviews | Receipt PDF, timeline, participant-only completion actions, review duplicate guard, and report link are in place. | Members can download but not directly email their receipt. Completed reviews remain final, with no in-room appeal or moderation request path. | Later |
| Reported issue and escalation | Evidence is private, bounded, and ownership-checked; administrators are authorized to review report status. | A Trade Room report pre-fills the report form but does not directly offer to mark the associated proposal as disputed. The administrator report view also does not expose its server-supported `adminNotes` input. | Before broader launch |

## Recommended Sequence

1. **Make proposal item replacement and mutual acceptance atomic and idempotent.** This is the most important technical hardening because it protects the exact state each member agrees to.
2. **Connect a Trade Room issue report to an explicit dispute-state decision.** The member should be able to request that the trade be marked disputed; the server should record that choice, preserve the evidence, and notify the other participant and administrators under a clear policy.
3. **Add an administrator resolution-notes field to report review.** This creates a durable explanation of why a report was dismissed, acted upon, or left under review.
4. **Document reminder-job launch controls and address-quality expectations.** No immediate address provider integration is required, but the operational rules should be explicit before broad public launch.

## Evidence

Reviewed implementation and safeguards: `server/tradeFlowRouter.ts`, `server/scheduledRoutes.ts`, `server/shipmentReminder.ts`, `server/tradeRoomSafeguards.ts`, `client/src/pages/WarRoom.tsx`, `server/reportEvidence.ts`, `server/routers.ts`, and their associated regression suites. The assessment also reconciles previous completed Trade Room timeline, receipt, reminder, responsive-layout, and reporting repairs.
