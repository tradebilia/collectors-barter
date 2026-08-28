# Fifth Deep Audit Report — Final P0 Review

**Date:** 2026-08-28  
**Author:** Manus AI  
**Scope:** Read-only review after the fourth-audit P0 repairs and shared market-data hardening. No application code, custom TiDB schema/data, payment state, provider configuration/action, schedule, or secret was changed by this audit.

## Executive Outcome

The prior fourth-audit repairs remain effective: public completed-trade category filtering is parameterized, shared public-eligibility rules cover the repaired public outputs, and changed counterproposal terms reset stale acceptance records within the proposal lock. The fifth review does **not** confirm a general authentication, public-profile, account-closure, payment-webhook, or dynamic-SQL P0 bypass.

However, the P0 remediation cycle is **not yet closed**. One concrete concurrency flaw remains in mutual trade acceptance. Two distinct negotiations that include the same listing can be accepted concurrently because `acceptTradeProposal` locks only its proposal and its own acceptance records, not every listing that the trade would consume.

| Priority | Verified finding | Current status | Required decision |
|---|---|---|---|
| **P0** | Competing concurrent trade acceptances can consume the same listing twice. | Open. | Approve one narrow transaction-locking repair. |
| P1 | Session lifetime/revocation refinement and closure-versus-future-paid-membership behavior. | Deferred; no present Free Launch exploit was verified. | Separate future hardening decision. |
| P2 | Incremental guard consolidation, test ergonomics, and performance maintenance. | Deferred. | Schedule independently after P0 closure. |

## Verified P0 — Competing Trade Acceptance Race

`acceptTradeProposal` locks the selected `tradeProposals` row and that proposal’s `tradeReceiptConfirmation` rows. On mutual acceptance it marks involved listings as `traded`, then cancels other pending/negotiating proposals that reference those listings. The listing updates do not lock or conditionally require the `active` state before the acceptance is committed; competing-proposal cancellation occurs after status advancement.

This leaves a reachable interleaving. A listing owner can have two negotiation rows for the same requested listing. The owner can record first acceptance in both proposals. Then each other participant can mutually accept their different proposal at nearly the same time. Each transaction locks a different proposal row, observes its own valid acceptance record, updates the shared listing to `traded`, and finds the competing proposal already advanced when its late cancellation query runs. Both proposals can therefore become `accepted`, despite sharing an item.

> The issue requires concurrent requests and does not indicate that a duplicate acceptance exists in current marketplace data. It is nevertheless P0 because it can create two conflicting confirmed trade obligations for one physical item.

### Approval-Ready Repair Scope

The smallest safe repair is limited to `acceptTradeProposal` and its regression suite. Within the existing transaction, the service should derive the requested and offered listing IDs, sort and de-duplicate them, then select **all** such listings in stable ID order with `FOR UPDATE`. It must verify that each remains `isActive = 1` and `status = 'active'` before changing the proposal to accepted. Listing state updates should retain an active-state guard and verify their affected-row outcome. This lock must be acquired before the mutual-acceptance status change and competing-proposal cleanup, so one transaction wins and a competitor safely receives a neutral conflict rather than creating a second accepted trade.

Required tests should model two separate proposals sharing a listing, demonstrate that the losing transaction cannot advance after the winner locks the listing, and retain the existing normal two-party acceptance and changed-counterproposal reset tests. The repair requires no migration, marketplace-data write, provider activity, payment action, schedule change, or secret change during implementation.

## Candidates Investigated and Rejected as P0

| Candidate | Evidence and conclusion |
|---|---|
| Context request/response objects and authentication lookup errors | Request/response are server-only context members, never returned in tRPC results. An authentication lookup failure becomes `ctx.user = null`; `protectedProcedure` then denies access. This is fail-closed, not authorization escalation. |
| Cross-site cookie/CSRF exposure | The active session cookie policy is `SameSite=Lax` on first-party Tradebilia hosts. `SameSite=None` is restricted to the embedded `*.manus.computer` preview exception. The older custom cookie-string helper is not an active session-issuance path. |
| Account-closure IDOR | The member-facing closure router has no member-controlled user ID; it passes `ctx.user.id` to the helper. Administrator audit/review procedures retain explicit administrator checks. |
| Account closure during an omitted trade state | The declared lifecycle uses the covered non-terminal statuses. No omitted active state was verified. The future paid-membership billing decision remains a separate P1 design item while Free Launch/payment enforcement is inactive. |
| Stripe webhook forgery/replay | Raw-body signature verification precedes event handling, and test-role event constraints remain enforced. No P0 bypass was confirmed. |
| Remaining public dynamic-SQL interpolation | The repaired completed-trade category is enum-bounded and parameterized. Other reviewed raw fragments use fixed server-owned values or validated enum mappings; no public user-controlled interpolation was confirmed. |

## Validation Evidence

The post-fourth-audit codebase passed the complete non-watch suite: **151 test files / 478 tests**, with **4 intentional skips**. TypeScript, production build, `pnpm audit --prod`, whitespace review, and the project secret-pattern review passed. Recent development-server and browser-console logs showed no new runtime error. The build retains the existing large-chunk advisory, which is a performance-maintenance item rather than a P0 security finding.

## Closure Criteria

The P0 cycle should be considered closed only after the listing-lock repair is approved and validated with a competing-proposal concurrency regression, complete tests, TypeScript, production build, dependency audit, whitespace/secret review, and a safe canonical synchronization. The fix should be documented as a fifth-audit P0 remediation and be followed by a short two-member acceptance check before broader P1/P2 work resumes.
