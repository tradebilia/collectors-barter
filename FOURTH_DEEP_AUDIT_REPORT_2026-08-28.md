# Fourth Deep Audit Report — 2026-08-28

**Author:** Manus AI  
**Method:** Read-only source review, independent targeted review, static boundary analysis, full regression/build/audit validation, recent runtime-log review, and public-route smoke verification.  
**Scope:** This fourth review followed the shared market-data hardening. It did not modify application behavior, custom TiDB data/schema, payment configuration, provider configuration/data, schedules, or secret values.

## Executive Assessment

The just-completed shared market-data hardening is functioning as designed: its lower-level routes now require a signed-in member, bound external eBay work, restrict source/parameter selection, and carry a request-abort budget through retries. The separately protected Test AI Sandbox remains unaffected. The audit also confirmed that current tests, TypeScript, production build, dependency audit, startup checks, and whitespace checks pass.

However, the audit found **three distinct P0 issues** outside that market-data scope. They are concrete, externally reachable problems: a public SQL-injection route, a trade-consent reset omission, and two remaining public-profile/trade-history queries that bypass the new shared visibility rule. These should be repaired as one carefully tested P0 batch before additional feature expansion.

| Priority | Finding | Current consequence | Recommended disposition |
|---|---|---|---|
| **P0-A** | `favorites.getCompletedTrades` builds a category predicate with direct string interpolation and runs it through `sql.raw`. | An unauthenticated caller can submit crafted category input that changes the SQL executed by the public completed-trades query. | Replace the raw dynamic predicate with parameterized conditions; preserve the enum-based sort clause; test adversarial category input. |
| **P0-B** | `sendTradeProposal` can alter offered items/cash while a trade remains `negotiating`, but does not remove prior `accepted` confirmation rows. | One participant’s consent to earlier terms can be carried into a modified counterproposal and then combine with the other participant’s acceptance. | Clear both participants’ accepted-confirmation rows, inside the existing transaction, before saving any changed terms/items; log the reset; test the two-party sequence. |
| **P0-C** | `getTopRatedTraders` and `favorites.getCompletedTrades` do not use `isPublicMemberEligible`. | Hidden or closed accounts may still be revealed through ratings or completed-trade content, despite the central public-eligibility repair elsewhere. | Apply the single shared eligibility helper to both query paths; require every published trade participant to be eligible; return neutral empty/not-found responses. |
| **P1-A** | Custom credential-session cookies are hard-coded as `SameSite=None`, while the established request-aware cookie helper uses `Lax` for normal hosts. | This widens cross-site cookie sending beyond the narrowly intended embedded-preview exception. Existing JSON/tRPC mechanics reduce immediate exploitability, but the policy mismatch weakens a defense-in-depth boundary. | Reuse the host-aware cookie options helper and add mutation-origin/cookie tests; preserve the preview-only `SameSite=None` exception. |
| **P1-B** | Eligible account closure does not yet block/cancel an active paid membership. | Free Launch and payment enforcement are inactive today, but a future paid subscriber could close access while a recurring billing relationship remains active. | Before enabling paid membership, block immediate closure for active subscription states or create a separately approved cancellation/reconciliation flow. |
| **P1-C** | PayPal transaction verification checks payee and amount and rejects an existing cross-trade use, but `tradePayments.transactionId` is not database-unique and payer identity is not asserted. | A race can associate one transaction with multiple trades, and a claimant can submit a qualifying transaction that was not made from their own PayPal identity. Current Free Launch reduces active exposure. | Before any payment enforcement, add an atomic unique transaction constraint and bind verification to the payer identity or a provider-created payment obligation. |
| **P1-D** | Public eBay-feedback lookup and username lookup do not consistently reuse public-profile eligibility. | A hidden/closed member’s association with external marketplace identity may remain discoverable by direct identifier. | Gate these public lookups through the shared eligibility helper or explicitly document/obtain consent for separately public marketplace-verification data. |
| **P2-A** | Storage proxy keys are forwarded without canonicalization and its provider call has no explicit abort budget. | The known `reports/{ownerId}` path remains authorization-checked, and S3-style key semantics limit traversal impact, but normalization and bounded fetch are prudent hardening. | Normalize/reject ambiguous keys, retain report ownership checks, add a bounded fetch signal, and avoid provider-response bodies in logs. |
| **P2-B** | Scheduled callbacks rely on the Heartbeat cron context plus a task UID but do not map each callback to an explicit allowed UID. | No application route currently exposes heartbeat-job creation, so this is not a demonstrated bypass. A path/UID allowlist would reduce future configuration risk. | Add a per-handler UID allowlist only when modifying scheduled-route configuration or adding a new job. |

## Evidence and Reassessment Notes

### P0-A — Parameterization is Missing in a Public Route

The public `favorites.getCompletedTrades` procedure accepts a free-form `category` string. It constructs a SQL string containing that value and inserts the result through `sql.raw(categoryFilter)`. Although the `sortBy` branch is safe because it is limited to a fixed enum, the category branch is not parameterized. The safe repair is narrow: retain the fixed order clause, replace the category condition with parameterized SQL expressions, and enforce the same shared public-member eligibility predicate already used by `favorites.getUserTrades` and `favorites.getRecentTrades`.

### P0-B — Agreement Must Be Reset on Changed Terms

`tradeFlowRouter.sendTradeProposal` correctly locks the trade proposal row and item rows in a transaction. It then changes items and/or cash while the trade is still `negotiating`. The later acceptance procedure treats the presence of the other participant’s earlier `accepted` confirmation as sufficient for mutual agreement. The counterproposal transaction must therefore invalidate accepted confirmations before changes are committed. This is a trade-integrity issue, not merely an activity-log issue.

### P0-C — Central Rule Not Yet Used Everywhere

The prior P0 remediation added `isPublicMemberEligible` to major feeds, listing detail, merchants, seller presence, and public trade surfaces. This audit found two older parallel read paths that still contain hand-written public user/trade SQL: `getTopRatedTraders` and `favorites.getCompletedTrades`. A member’s public profile preference and closed-account state should be checked at every public presentation boundary, including rating and trade-history summaries.

### Rejected or Reduced-Severity Candidates

The audit specifically rejected several independent-review claims as P0 after checking the reachable call paths. The shared `updateProfile` helper can persist verification flags, but the member-edit router input does not expose those fields; email and phone verification call the helper only after their respective verified code flows. Scheduled-route `taskUid` validation is not an externally reachable authorization bypass because no app-level caller creates arbitrary Heartbeat jobs. The storage proxy is intentionally mixed public/private storage; report-evidence keys receive owner/admin checks. Its key normalization remains a P2 improvement rather than a confirmed public evidence disclosure.

PayPal verification already checks trade participation, accepted state, server-derived amount, expected payee, and cross-trade prior use. The residual atomic uniqueness/payer-binding gap is important before any paid enforcement but is not classified as a current P0 because Tradebilia remains in Free Launch with Stripe sandbox-only and payment enforcement disabled. Similarly, the account-closure subscription concern must be addressed before paid membership activates, not by silently introducing a payment-provider cancellation now.

## Validation Evidence

The final read-only validation used the current restored WebDev workspace after market-data hardening. Results were as follows.

| Check | Result |
|---|---|
| Focused market-data admission coverage | 4 tests passed; rejection/throttle paths make no provider call. |
| Complete non-watch suite | 150 test files passed, 1 file skipped; 474 tests passed, 4 intentionally skipped. |
| TypeScript | Passed with `pnpm check`. |
| Production build | Passed with `pnpm build`; existing large-chunk advisory remains a performance observation, not a build failure. |
| Production dependency audit | Passed with no known production vulnerabilities. |
| Whitespace and secret-pattern review | Passed; no credential-shaped addition found in the reviewed diff. |
| Runtime startup checks | Environment and custom-TiDB connection checks passed before server startup. |
| Public route smoke | Homepage, member/public routes, sign-in modal, and non-existent listing handling rendered without a new browser-console error. |

## Recommended Next Approval

Approve **P0-A through P0-C together** as one narrow integrity/privacy batch. It should change only the public completed-trades/top-rated SQL paths and the counterproposal acceptance-reset transaction, with focused adversarial SQL, two-party consent, and hidden/closed-member regression tests. It does not require a database migration, provider action, payment action, schedule run, or marketplace-data change.

After that P0 batch, the safest next order is P1-A (host-aware custom-session cookies), P1-B/P1-C before any paid membership or PayPal enforcement, and P1-D as a privacy-policy/product decision. P2 items should remain separate hardening work so they do not obscure the urgent P0 repair.

## Preserved Boundaries

No code or configuration was changed during this fourth audit. The custom TiDB marketplace baseline was not written, Free Launch remains active, Stripe remains sandbox-only, payment enforcement remains inactive, no provider message/payment/broadcast was sent, and no schedule was run or changed. No secret, credential, member content, payment identifier, or provider token is recorded in this report.
