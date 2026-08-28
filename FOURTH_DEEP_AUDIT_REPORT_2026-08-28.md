# Fourth Deep Audit Report — 2026-08-28

**Author:** Manus AI
**Method:** Read-only source review, independent targeted review, static boundary analysis, full regression/build/audit validation, recent runtime-log review, and public-route smoke verification.
**Scope:** This fourth review followed the shared market-data hardening. It did not modify application behavior, custom TiDB data/schema, payment configuration, provider configuration/data, schedules, or secret values.

## Executive Assessment

The just-completed shared market-data hardening is functioning as designed: its lower-level routes now require a signed-in member, bound external eBay work, restrict source/parameter selection, and carry a request-abort budget through retries. The separately protected Test AI Sandbox remains unaffected. The audit also confirmed that current tests, TypeScript, production build, dependency audit, startup checks, and whitespace checks pass.

The audit originally found **three distinct P0 issues** outside that market-data scope. They were concrete, externally reachable problems: a public SQL-injection route, a trade-consent reset omission, and two remaining public-profile/trade-history queries that bypassed the shared visibility rule. Rich approved the narrow P0-A through P0-C repair batch, which is now implemented and validated. The remaining items in this report are independent P1/P2 follow-ups.

| Priority | Finding | Current consequence | Recommended disposition |
|---|---|---|---|
| **P0-A — Remediated** | `favorites.getCompletedTrades` had built a category predicate with direct string interpolation and used `sql.raw`. | A caller could have submitted crafted category input that changed public completed-trades SQL. | Input is now an explicit category enum and the predicate is parameterized; the fixed enum-only order clause remains safe. |
| **P0-B — Remediated** | `sendTradeProposal` had allowed offered items/cash to change while a trade remained `negotiating` without removing prior `accepted` confirmations. | One participant’s consent to earlier terms could have carried into a modified counterproposal. | The existing locked transaction now compares the proposer’s item set and cash terms, deletes both accepted confirmations only when terms change, and records an `acceptance_reset` event before the new proposal event. |
| **P0-C — Remediated** | `getTopRatedTraders` and `favorites.getCompletedTrades` had not used `isPublicMemberEligible`. | Hidden or closed accounts could have appeared through ratings or completed-trade content. | Both routes now apply the shared eligibility helper; completed-trade publication requires both participants to be eligible. |
| **P1-A** | Custom credential-session cookies are hard-coded as `SameSite=None`, while the established request-aware cookie helper uses `Lax` for normal hosts. | This widens cross-site cookie sending beyond the narrowly intended embedded-preview exception. Existing JSON/tRPC mechanics reduce immediate exploitability, but the policy mismatch weakens a defense-in-depth boundary. | Reuse the host-aware cookie options helper and add mutation-origin/cookie tests; preserve the preview-only `SameSite=None` exception. |
| **P1-B** | Eligible account closure does not yet block/cancel an active paid membership. | Free Launch and payment enforcement are inactive today, but a future paid subscriber could close access while a recurring billing relationship remains active. | Before enabling paid membership, block immediate closure for active subscription states or create a separately approved cancellation/reconciliation flow. |
| **P1-C** | PayPal transaction verification checks payee and amount and rejects an existing cross-trade use, but `tradePayments.transactionId` is not database-unique and payer identity is not asserted. | A race can associate one transaction with multiple trades, and a claimant can submit a qualifying transaction that was not made from their own PayPal identity. Current Free Launch reduces active exposure. | Before any payment enforcement, add an atomic unique transaction constraint and bind verification to the payer identity or a provider-created payment obligation. |
| **P1-D** | Public eBay-feedback lookup and username lookup do not consistently reuse public-profile eligibility. | A hidden/closed member’s association with external marketplace identity may remain discoverable by direct identifier. | Gate these public lookups through the shared eligibility helper or explicitly document/obtain consent for separately public marketplace-verification data. |
| **P2-A** | Storage proxy keys are forwarded without canonicalization and its provider call has no explicit abort budget. | The known `reports/{ownerId}` path remains authorization-checked, and S3-style key semantics limit traversal impact, but normalization and bounded fetch are prudent hardening. | Normalize/reject ambiguous keys, retain report ownership checks, add a bounded fetch signal, and avoid provider-response bodies in logs. |
| **P2-B** | Scheduled callbacks rely on the Heartbeat cron context plus a task UID but do not map each callback to an explicit allowed UID. | No application route currently exposes heartbeat-job creation, so this is not a demonstrated bypass. A path/UID allowlist would reduce future configuration risk. | Add a per-handler UID allowlist only when modifying scheduled-route configuration or adding a new job. |

## Evidence and Reassessment Notes

### P0-A — Parameterization is Missing in a Public Route

The public `favorites.getCompletedTrades` procedure had accepted a free-form category string, constructed SQL containing that value, and inserted it through `sql.raw(categoryFilter)`. The remediation changes category input to the existing explicit category enum and uses parameterized SQL expressions for both requested and offered listing categories. The fixed `sortBy` enum retains the only raw order fragment. The same query now requires both completed-trade participants to satisfy `isPublicMemberEligible`.

### P0-B — Agreement Must Be Reset on Changed Terms

`tradeFlowRouter.sendTradeProposal` correctly locks the trade proposal row and item rows in a transaction. The completed remediation compares the proposer’s current item set and cash terms with the submitted terms while that lock is held. If either changes, the same transaction invalidates every `accepted` confirmation before the counterproposal event is logged; if only a message is added without a term change, acceptance remains intact. This is a trade-integrity safeguard, not merely an activity-log change.

### P0-C — Central Rule Not Yet Used Everywhere

The prior P0 remediation added `isPublicMemberEligible` to major feeds, listing detail, merchants, seller presence, and public trade surfaces. This audit found two older parallel read paths with hand-written public user/trade SQL: `getTopRatedTraders` and `favorites.getCompletedTrades`. The completed P0 batch moved both routes onto the same shared eligibility predicate, so public profile preference and closed-account state apply equally to rating and trade-history summaries.

### Rejected or Reduced-Severity Candidates

The audit specifically rejected several independent-review claims as P0 after checking the reachable call paths. The shared `updateProfile` helper can persist verification flags, but the member-edit router input does not expose those fields; email and phone verification call the helper only after their respective verified code flows. Scheduled-route `taskUid` validation is not an externally reachable authorization bypass because no app-level caller creates arbitrary Heartbeat jobs. The storage proxy is intentionally mixed public/private storage; report-evidence keys receive owner/admin checks. Its key normalization remains a P2 improvement rather than a confirmed public evidence disclosure.

PayPal verification already checks trade participation, accepted state, server-derived amount, expected payee, and cross-trade prior use. The residual atomic uniqueness/payer-binding gap is important before any paid enforcement but is not classified as a current P0 because Tradebilia remains in Free Launch with Stripe sandbox-only and payment enforcement disabled. Similarly, the account-closure subscription concern must be addressed before paid membership activates, not by silently introducing a payment-provider cancellation now.

## Validation Evidence

The final read-only validation used the current restored WebDev workspace after market-data hardening. Results were as follows.

| Check | Result |
|---|---|
| Focused market-data admission coverage | 4 tests passed; rejection/throttle paths make no provider call. |
| Focused fourth-audit P0 coverage | 7 tests passed; covers category constraints/parameterization, public eligibility, and changed-terms acceptance resets. |
| Complete non-watch suite after P0 repair | 151 test files passed, 1 file skipped; 478 tests passed, 4 intentionally skipped. |
| TypeScript | Passed with `pnpm check`. |
| Production build | Passed with `pnpm build`; existing large-chunk advisory remains a performance observation, not a build failure. |
| Production dependency audit | Passed with no known production vulnerabilities. |
| Whitespace and secret-pattern review | Passed; no credential-shaped addition found in the reviewed diff. |
| Runtime startup checks | Environment and custom-TiDB connection checks passed before server startup. |
| Public route smoke | Homepage, member/public routes, sign-in modal, and non-existent listing handling rendered without a new browser-console error. |

## Recommended Next Approval

The P0-A through P0-C batch has been approved, completed, and validated. It changed only public completed-trades/top-rated query protections, the counterproposal acceptance-reset transaction, the Trade Showcase category type, and focused regression coverage. It required no database migration, provider action, payment action, schedule run, or marketplace-data change.

After that P0 batch, the safest next order is P1-A (host-aware custom-session cookies), P1-B/P1-C before any paid membership or PayPal enforcement, and P1-D as a privacy-policy/product decision. P2 items should remain separate hardening work so they do not obscure the urgent P0 repair.

## Preserved Boundaries

The fourth audit itself made no change. Its later, separately approved P0 repair batch changed only the guarded public-query, trade-consent, and client type/test code described above. The custom TiDB marketplace baseline was not written, Free Launch remains active, Stripe remains sandbox-only, payment enforcement remains inactive, no provider message/payment/broadcast was sent, and no schedule was run or changed. No secret, credential, member content, payment identifier, or provider token is recorded in this report.
