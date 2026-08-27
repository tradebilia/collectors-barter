# Tradebilia Second Deep Code Audit

**Audit date:** August 27, 2026
**Scope:** A second read-only audit of the updated post-P0/P1/P2 project. It examined client and server code, custom-TiDB schema/constraints, authentication and authorization, profile privacy, marketplace and trade state transitions, messages, reporting, administrator tools, Stripe sandbox, PayPal verification, storage, external providers, scheduled work, runtime startup, tests, dependencies, and deployment-facing controls.
**Audit boundary:** No application code, database record/schema, schedule, Stripe setting/subscription, provider account, or secret was changed during this audit. This report and the tracker entry were initially documentation only. The two P0 findings below were subsequently approved and repaired; the repair record appears in the next section.

## Bottom Line

The prior P0–P2 remediations remained materially intact: the fresh baseline passed **430 tests with four intentional skips**, TypeScript checking and the production build completed, and the production dependency audit remained clean. The review identified two critical defects—privacy controls did not govern all public/member-facing data paths, and the trade flow skipped the Review state that PayPal verification requires. Both were subsequently approved and repaired. [1] [2] [3]

The audit also found one already-observed duplicate review group in the custom TiDB database and several trade workflow tables whose “unique” index names were not backed by real unique constraints. The approved P1 remediation is now complete: all database changes were narrow and reviewed, the one newer duplicate review row was removed under the approved retention rule, and the marketplace baseline remained unchanged. [4]

| Priority | Status | Finding | Practical effect |
| --- | --- | --- | --- |
| **P0** | **Repaired** | Profile visibility, inventory-value, and contact-request preferences were not enforced across all profile/member-search/contact APIs. | Hidden profiles were discoverable, inventory values could be inferred through directory values, and opted-out members could still receive new contacts. Full street addresses were already stripped from the member-search response; the earlier audit wording on client-address exposure was corrected. |
| **P0** | **Repaired** | Mutual trade acceptance jumped directly to Shipping while Review and PayPal verification require `accepted`. | The Review step was bypassed, items were locked and shipping time began, and cash-trade payment verification could not be used in the normal completed-acceptance flow. |
| **P1** | **Repaired** | Workflow “unique” constraints were ordinary indexes; one duplicate review pair existed. | Eight real unique indexes, duplicate-safe application behavior, and deterministic cleanup now protect one-time trade artifacts. |
| **P1** | **Repaired** | A participant could delete shared messages/inquiries for both people. | Each participant now has an independent, read-only personal archive; shared correspondence and administrator review access remain intact. |
| **P1** | **Repaired** | Scheduled escalation and outbound provider calls had avoidable reliability gaps. | Escalation now guards the current state and logs only successful transitions; the approved provider calls have a 15-second timeout and sanitized failure telemetry. |
| **P1** | **Repaired** | Defined startup validation was not executed by the server entry point. | Core environment and custom-TiDB-first database validation now complete before Express starts serving requests. |

## P0 — Approved and Repaired

### 1. Saved privacy choices are bypassed by profile and member-search data paths

Tradebilia saves `showProfile`, `hideInventoryValue`, and `receiveContactRequests` preferences in account settings. Before the repair, the public `market.getUserProfile` procedure did not read those preferences before returning a profile, active listings, listing values, statistics, and visible reviews. A member who switched off public profile visibility could therefore still be retrieved by the public endpoint. [1] [2]

The protected `searchMembers` path selected full address fields for server-side distance calculation. Direct review during remediation confirmed those fields were already stripped before the response; the original claim that a `privateLocation` object containing full street address was serialized to searchers was incorrect and has been corrected here. The confirmed defects were that the search did not exclude hidden profiles, and it could expose or use an inventory total despite the saved preference. [1]

> **Corrected impact:** A hidden member could remain discoverable, inventory values could remain visible in affected public/directory paths, and a member who declined contact requests could still receive a new inquiry or direct-message thread. Full home street address and postal code were not returned by the reviewed search response.

**Completed repair:** `showProfile` is now enforced at the public profile and member-search boundary for non-owners/non-administrators. Directory inventory values are omitted when hidden, contact-request preference is checked before new direct threads/inquiries, and full addresses remain server-only for distance calculations. Focused privacy tests and TypeScript passed.[1] [2]

### 2. Normal mutual acceptance bypasses Review and blocks PayPal verification

The normal second acceptance is transactionally handled, but it changes `tradeProposals.status` from `negotiating` directly to `shipping`, immediately locks the listed items, starts the shipping deadline, and deletes the acceptance records. [5] The separately defined Review-to-Shipping procedure, `proceedToShipping`, only accepts a trade whose status is `accepted`. [6]

The P1 payment safeguard correctly derives an obligation from the locked proposal but deliberately permits verification only when the proposal is `accepted`; the Trade Room payment interface is also rendered only at that same status. Because normal mutual acceptance produces `shipping`, the review/payment UI and endpoint are unreachable for newly accepted cash trades. [2] [6] [7]

> **Impact:** The user-facing trade sequence does not match its own stages. Both parties can be sent into Shipping without a Review confirmation, while the direct PayPal verification capability is unavailable in the ordinary cash-trade path.

**Completed repair:** Mutual proposal acceptance now locks the agreed items while retaining the `accepted` Review status with no shipping deadline. The existing mutual `proceedToShipping` confirmation starts Shipping and its deadline. The server-derived positive-cash PayPal obligation remains available only in the intended Review state. Focused lifecycle, payment authorization, and atomicity tests plus TypeScript passed without creating a trade or payment.[5] [6] [7]

## Post-Repair Validation

The approved P0 changes were checked with six privacy tests and ten trade/payment lifecycle tests, all passing. TypeScript checking, production build, and production dependency audit also passed. The complete suite recorded 434 passing tests and four intentional skips; two external carrier credential checks timed out against UPS and USPS endpoints. Those timeouts are external-provider reliability issues already listed as P1 work and are unrelated to the P0 code changes. Public homepage and profile rendering remained visually intact after the repair.[3]

## P1 — Approved and Repaired

### 3. Database constraints do not enforce several one-time trade actions

Read-only custom-TiDB metadata showed that `tradeReceiptConfirmation`, `tradeTrackingNumbers`, `tradeReviews`, `tradeVotingLinks`, `tradeVotes`, `tradePrivateNotes`, and `tradeProposalItems` currently have only their primary-key indexes. Several schema declarations use `index()` despite names that imply uniqueness, such as `unique_note_per_trade` and `tradeProposalItems_unique_item`. [4] [8]

The aggregate duplicate scan found one real duplicate group: **two review rows for the same proposal/reviewer pair**. No duplicate groups were found in the examined receipt-confirmation, tracking, vote, private-note, or proposal-item pairs at audit time. [4]

**Minimal repair:** Before migration, retain a recovery checkpoint and make an explicit, reviewed decision on the existing duplicate-review group. Then add only the real composite unique constraints needed for each business rule, use idempotent/upsert handling where appropriate, and add conflict/error tests. This should be a new small custom-TiDB migration, not a bulk schema regeneration.

**Completed repair:** The approved custom-TiDB migration removed exactly one newer duplicate review row while retaining the oldest row, then added eight narrowly scoped unique indexes for private notes, proposal items, receipt confirmations, reviews, tracking records, votes, and voting links/tokens. Server procedures now reject duplicate artifacts with clear conflicts, scope private notes and tracking to trade participants, retain Review-before-Shipping, and use cryptographic voting tokens. Aggregate-only postchecks confirmed zero duplicate review groups and preserved the baseline of three members, 16 active listings, and $147,530 in active listing value.

### 4. One member can erase a shared direct-message thread or inquiry

`deleteDirectThread` first verifies that the caller participates in a thread, but then hard-deletes the one shared thread record. The database cascade removes every message for both participants. [9] The direct-message persistence layer deliberately maintains a single shared thread per participant pair, so this is a real shared-data deletion effect rather than a duplicate local record. [10]

The inquiry deletion path likewise uses a single shared deletion marker. The current behavior may be a product decision, but it is unsafe for trade communications because one participant can remove evidence and the other person has no independent archive or recovery path. [11]

**Minimal repair:** Replace destructive “delete conversation” behavior with caller-specific archive/hidden state. Preserve shared message history and allow administrator review when necessary. Make the UI wording clear, and retain a separate administrator-only purge policy with an audit trail.

**Completed repair:** The additive communication migration added participant-specific archive timestamps to inquiries and direct-message threads. It mapped legacy shared inquiry deletes to both parties’ archives and removed no correspondence body; the runtime had zero such legacy rows. Active inboxes, read counts, and direct-message lists now apply only the caller’s archive state. Archived messages and inquiries remain available read-only to that member, new messages restore both inbox views, and the UI no longer offers a permanent-purge action.

### 5. Scheduled receipt escalation can race a newly advanced trade

The daily reminder handler selects proposals with the eligible `accepted` or `shipped` status, then separately updates each selected proposal to `disputed` without repeating the status condition in that update. A participant can complete or otherwise advance a proposal after the query but before the update; the scheduled worker may then overwrite that newer state. Its following log insertion is also unguarded against concurrent job delivery. [12]

The P2 acceptance-timeout correction is present and works differently: it repeats the `negotiating` condition in its update and deletes receipt confirmations only after that guarded update succeeds. [12]

**Minimal repair:** Add the eligible status condition to the escalation update, increment counts/log only when it changes a row, and enforce an idempotent event key or unique constraint for system escalation logs. Add concurrent-state regression coverage.

**Completed repair:** Receipt escalation now repeats its eligible `accepted`/`shipped` status, aged-tracking, and missing-receipt conditions in the update itself. It writes the system administrator event and increments the reported count only after that guarded update affects a row. The controlled handler tests include a stale-candidate scenario where a trade has advanced and confirm no overwrite or duplicate event; the existing job was not run or reconfigured.

### 6. Email, SMS, and certification lookups can wait forever for a provider

The shared Resend email transport uses `fetch()` with no abort signal. The same no-timeout pattern appears in Twilio verification and PCGS lookup helpers. Those paths do catch failures, but a provider that accepts a connection and never completes the response can leave the request waiting until infrastructure-level limits intervene. [13] [14] [15]

**Minimal repair:** Apply a consistent bounded `AbortSignal.timeout()` to each provider call, classify timeout errors as retryable/temporary, and add no-network timeout tests. Do not alter email/SMS policy, credentials, or production providers during this repair.

**Completed repair:** The Resend transactional email, Twilio Verify, and PCGS certification adapters now use a 15-second abort signal. HTTP and transport failures record only sanitized API Health metadata and return the existing safe temporary-failure behavior. Deterministic timeout and HTTP-failure tests made no provider call, sent no email/SMS, and changed no credentials or provider policy.

### 7. Startup checks exist but the active entry point never runs them

`startupChecks.ts` defines environment/database validation, but `server/_core/index.ts` starts Express, registers routes, and begins listening without importing or calling that module. The server can therefore begin running with a bad external configuration and expose delayed errors through a user action instead of failing clearly at boot. [16] [17]

**Minimal repair:** Run the required configuration validation before listening, distinguish optional integrations from required core dependencies, and make startup fail non-zero for missing required configuration. This must preserve the existing custom TiDB precedence and preview cookie exceptions.

**Completed repair:** The entry point now runs the existing core environment validation and a read-only runtime database check before constructing Express. Validation uses the same `CUSTOM_DATABASE_URL`-first precedence as normal runtime access and does not require optional Resend, Twilio, or PCGS settings. Development-server boot logs confirmed both checks passed before the listener started.

## P2 — Important Hardening and Product Clarifications

| Finding | Why it matters | Focused improvement |
| --- | --- | --- |
| **Request-origin helper trusts `Host` as a fallback** | The test-only Stripe return URL is constructed from `Host` when no matching `Origin` is supplied. This is administrator-only and Stripe sandbox-only today, but it should not rely on a client-controlled host value. [18] | Use an explicit allowlist of production/preview origins for external return URLs; retain test-only restrictions. |
| **Provider callbacks use a cookie but not the preview bearer fallback** | eBay/Facebook/LinkedIn callbacks correctly validate one-time state and require a signed-in session, but only read the cookie. A restricted browser that needs the embedded bearer bridge may fail to link an account. [19] | Decide whether external browser redirects can realistically carry the header. If yes, use the same safe fallback resolver; otherwise show a clear preview-cookie requirement. |
| **Privacy-policy wording needed alignment with the closure workflow** | The policy previously mentioned self-service deletion while the product used a manual review notice. The approved hybrid workflow is now implemented and the policy has been aligned. | **Repaired.** Eligible accounts close after guarded checks; only blocked cases enter administrator review; protected history is retained. |
| **Administrator authorization is correct but repetitive** | The reviewed admin endpoints use `protectedProcedure` plus repeated manual role checks. No unprotected admin action was confirmed, but this pattern is easier to miss in future edits. | Use the central `adminProcedure` for new endpoints and migrate existing blocks only in a tested refactor. |
| **Webhook documentation is misleading** | The Stripe webhook comment says it never changes billing state, but verified sandbox events do update the local sandbox Membership record. The implementation itself remains sandbox-only. [20] | Correct the comment and keep the code/test-only safeguards unchanged. |

## Post-P1 Reassessment of Remaining Recommendations

This no-change reassessment was completed after the P0/P1 repairs and canonical test-contract maintenance. No remaining finding is a confirmed P0-level defect under the current **Free Launch** and **Stripe sandbox-only** configuration. The recommended sequence below keeps the small, concrete disclosure and boundary corrections separate from broader refactors.

| Priority | Recommendation | Current verified evidence | Recommended approval boundary |
| --- | --- | --- | --- |
| **P2A — Repaired** | Implement the approved hybrid account-closure workflow and align its member-facing policy. | A member submits a guarded closure request. The server checks active/unresolved trades, complaints, reports, tickets, account reviews, and moderation holds. A clean non-administrator account closes immediately, active listings are hidden, the public profile/contact preference is disabled, and new/existing custom sessions are rejected. Blocked requests are visible in the administrator queue with a live, count-only audit of active/completed trades, complaints/reports, tickets, listings, membership, and prior requests. | The additive migration created account-closure state and request records only; no account, listing, trade, message, report, or evidence record was deleted. Focused and full validation passed without submitting a closure request. |
| **Before any live billing — P2B** | Replace the Stripe sandbox return-URL `Host` fallback with an explicit trusted-origin allowlist. | The administrator-only sandbox checkout/portal helper accepts a same-host `Origin` when present, but otherwise builds a URL from the incoming `Host` header. Present practical exposure is limited by administrator access and sandbox-only payment processing, but this must not become the live-payment boundary. | Small targeted helper/test change: allow only explicitly configured Tradebilia production and approved preview origins; reject all other values. Preserve same-tab sandbox behavior, Free Launch, and the current no-live-charge restriction. |
| **Low — clarify rather than change session resolution** | Treat the provider OAuth callback bearer-header concern as a preview usability limitation, not a bearer-fallback implementation task. | External OAuth redirects do not reliably carry a browser application's `Authorization` header. The callback’s cookie-and-one-time-state requirement is therefore the correct security model; adding a bearer fallback would not reliably solve embedded-preview redirects. | Add concise member/admin guidance only if preview linking remains a supported workflow. Do not place session tokens in redirect URLs, weaken state validation, or modify live callback authorization without a separately tested design. |
| **Deferred refactor** | Consolidate repeated manual administrator role checks behind `adminProcedure`. | A reusable `adminProcedure` exists, while 86 manual role-check occurrences remain. The current audit did not identify an exposed administrator endpoint; the risk is future maintenance drift, not a confirmed authorization bypass. | Adopt `adminProcedure` for all new administrator endpoints now. Schedule an incremental, grouped refactor only with endpoint-by-endpoint tests and no concurrent product changes. |
| **Low — documentation-only** | Correct the Stripe webhook comment. | The comment says verified sandbox events never change billing state, but the handler intentionally records validated sandbox membership events while payment enforcement remains inactive. | Comment/test-only update. Do not alter Stripe webhook behavior, subscriptions, payment enforcement, or any Stripe credential/configuration. |

> **Recommended next approval:** P2B—trusted return origins—should be completed before any future proposal to activate live billing. The OAuth, administrator-refactor, and webhook-comment items can remain deliberately separated from payment or marketplace changes.

## Rechecked Controls and Claims That Were Not Confirmed as Defects

The audit did not simply repeat earlier findings. The following controls were specifically rechecked and are not listed as current defects.

| Area | Result |
| --- | --- |
| **P0–P2 test/build/dependency status** | Fresh baseline: 430 passing tests, four intentional skips, successful TypeScript and production build, and no remaining production dependency advisories. [3] |
| **Stripe sandbox boundary and retry repair** | The webhook still reads raw signed bytes before JSON parsing, ignores live events, rejects unconfigured/non-recurring prices, uses subscription-item period dates, and retries a previously failed event only through its guarded state reset. [20] [21] |
| **P1 PayPal input binding** | The browser no longer supplies the payee or amount. The server derives participants and positive cash amount from the proposal before calling PayPal. The newly found issue is status reachability, not restoration of the former browser-controlled amount defect. [7] |
| **Unsafe raw SQL in reviewed marketplace/trade paths** | The reviewed dynamic SQL fragments originate from fixed server allowlists or database-selected numeric IDs, not unbounded request strings. This does not make every raw query safe automatically, but no injectable user-string construction was confirmed in the reviewed paths. |
| **Private report-evidence storage** | `reports/{ownerId}/…` keys are gated to the owner or administrator before a signed storage redirect. [22] |
| **Public R2 image uploads** | New listing/avatar uploads have MIME allowlisting, byte-size limits, file-signature checks, generated keys, and a restricted legacy-source URL validator. [23] |
| **Session cookie legacy formatter** | The old unconditional `SameSite=None` formatter is unused; active custom sign-in writes use the request-aware cookie helper. [24] |
| **Daily overdue reminder cadence** | Daily overdue reminders are intentional policy behavior; due-soon reminders use a deadline marker. This was not classified as spam. [25] |

## Recommended Approval Batches

| Batch | Scope | Reason for sequence |
| --- | --- | --- |
| **A — Privacy and trade-flow repair** | Enforce profile/search/contact preferences, retain server-only distance data, restore Review-before-Shipping, and make cash verification reachable in the chosen review state. | **Completed.** The two P0 findings were repaired and focused regression validation passed. |
| **B — Integrity and communication retention** | Reconcile duplicate review data, add narrowly scoped trade artifact constraints, make messaging/inquiry deletion per-user archival, and harden scheduled escalation idempotency. | Prevents repeated actions and unilateral loss of trade evidence. |
| **C — Resilience and maintenance** | Add outbound timeouts, wire startup checks, harden trusted external return origins, clarify provider-preview behavior, update policy/comment text, and reduce manual admin-auth repetition. | Reduces operational failures without changing marketplace terms, membership mode, or payments. |

The P0 portion of Batch A, the approved P1 parts of B and C, and the approved P2A account-closure workflow are complete. P2B and the remaining lower-priority P2 items remain approval-only. The account-closure work used a dedicated additive custom-TiDB migration, aggregate preflight/postcheck, focused tests, full non-watch test/build/dependency validation, and a credential-safe synchronization review.

## References

[1]: ./server/db.ts "Member search selection and privateLocation mapping, lines 1436–1615"
[2]: ./server/routers.ts "Public market.getUserProfile and payment verification routes, lines 650–745 and 3644–3777"
[3]: /tmp/tradebilia-deep-audit-baseline.log "Fresh test, TypeScript, production build, dependency, and runtime baseline"
[4]: /tmp/tradebilia-deep-trade-integrity.json "Read-only custom-TiDB trade integrity/index inventory"
[5]: ./server/tradeFlowRouter.ts "Mutual trade acceptance transition, lines 521–588"
[6]: ./server/tradeFlowRouter.ts "Review-to-shipping transition, lines 1367–1425"
[7]: ./server/paymentAuthorization.ts "Server-derived payment obligation"
[8]: ./drizzle/schema.ts "Trade workflow index declarations, lines 401–560"
[9]: ./server/routers.ts "Direct-message deletion, lines 1978–1995"
[10]: ./server/directMessagePersistence.ts "Single shared thread persistence contract"
[11]: ./server/db.ts "Inquiry persistence and shared deletion state"
[12]: ./server/scheduledRoutes.ts "Trade reminder and escalation handler, lines 129–219"
[13]: ./server/_core/email.ts "Shared Resend transport, lines 11–42"
[14]: ./server/twilio.ts "Twilio verification requests"
[15]: ./server/pcgsMarketData.ts "PCGS lookup transport"
[16]: ./server/_core/startupChecks.ts "Defined core environment/startup validation"
[17]: ./server/_core/index.ts "Active server entry point, lines 36–83"
[18]: ./server/membership.ts "Stripe sandbox request-origin helper, lines 138–150"
[19]: ./server/_core/providerOAuthCallbacks.ts "Provider callback session resolution"
[20]: ./server/stripeWebhook.ts "Signed Stripe webhook handler"
[21]: ./server/stripeMembershipBilling.ts "Sandbox Membership event persistence"
[22]: ./server/_core/storageProxy.ts "Private report-evidence authorization"
[23]: ./server/r2PublicMedia.ts "Public media upload validation"
[24]: ./server/_core/customAuth.ts "Unused legacy session-cookie formatter"
[25]: ./server/shipmentReminder.ts "Shipment reminder cadence and idempotency markers"
