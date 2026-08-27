# Tradebilia Whole-Code Audit Report

**Audit date:** August 27, 2026  
**Scope:** Client, server, database contracts, authentication and authorization, storage, integrations, Stripe sandbox handling, PayPal verification, scheduled work, tests, runtime logs, dependency advisories, and deployment behavior.  
**Change boundary:** Read-only. No application source, database data/schema, schedules, Stripe settings/subscriptions, third-party accounts, secrets, or live behavior was changed.

## Executive Summary

This audit found **three current operational blockers** that should be addressed before relying on their affected features: the Manus OAuth sign-in route is internally inconsistent and rejects callers that use it; the daily shipment-reminder job is enabled but has recent HTTP 404 failures and an overdue next-run timestamp; and provider OAuth token encryption is not operational because the required encryption key is absent or invalid in the active environment. The application itself currently type-checks and produces a production bundle, and the custom TiDB connection is healthy through the published health endpoint.[1] [2] [3]

The audit also identified data-integrity, payment-record, support-abuse, test-maintenance, performance, and dependency-upgrade work. These are actionable risks, but none justified making unapproved changes during this review. No evidence supported several initially suspected issues, including a current Vite syntax failure, public listing-detail routing failure, unsafe user-controlled SQL in the reviewed raw-SQL call sites, first-time profile verification bypass, Stripe billing-period field mapping, or loss of private report-evidence authorization.

| Priority | Classification | Count | Meaning |
| --- | --- | ---: | --- |
| **P0** | Immediate launch / feature blockers | 3 | A currently exposed sign-in path, scheduled reminder service, or provider connection flow is not reliable. |
| **P1** | Fix before enabling the related business feature at scale | 5 | Data integrity, payment verification, public-abuse, or dependency risks that require a controlled remediation pass. |
| **P2** | Reliability, maintenance, performance, or accessibility improvements | 5 | Important hardening work with lower immediate customer impact. |

## P0 — Must Fix Before Broad Launch or Reliance

### 1. Reachable Manus OAuth sign-in links fail their own CSRF-state validation

**Impact:** Several unauthenticated calls use `getLoginUrl()` to send a user to the Manus OAuth portal. That function generates a nonce inside `state`, but it does not write the `__Host-oauth_state` cookie. The callback requires the nonce to exactly match that cookie and returns HTTP 403 when it does not. This makes the OAuth path unavailable for callers such as Home, Item Detail, Inventory, Messages, Profile, Referral Request, Watchlist, Forgot Password, and Reset Password. The separate custom username/password sign-in remains a different path and was not implicated.[4] [5] [6]

> **Evidence:** The browser URL builder creates a random nonce only in the redirect parameter, while the callback reads a browser cookie that no active source path sets.[4] [5]

**Safest repair:** Select one supported sign-in system for each UI entry point. If the Manus OAuth flow is intended to remain, add a server endpoint that creates the one-time cookie using the same request-aware attributes used for its clear operation, then redirect through it. Otherwise, redirect these UI calls to the working custom sign-in flow. Add an integration test covering “start login → callback state validation,” including the embedded preview cookie policy.

### 2. The enabled daily shipment-reminder job is not currently delivering

**Impact:** The sole enabled job is configured for `POST /api/scheduled/tradeReminders`, but its August 23 and August 24 runs returned HTTP 404. At 14:35 UTC on August 27, its next execution timestamp was still 14:00 UTC and its last execution remained August 24. This means shipment reminders and the related lifecycle maintenance should be treated as **not dependable** until a successful post-repair run is observed.[7] [8]

Current source does register the correct callback before static fall-through, and the published `/health` response confirmed that the live process and custom database are currently healthy. The evidence therefore establishes the failed job, but it does **not** conclusively identify whether the remaining cause is a stale deployed revision, scheduler delivery target, or platform scheduling state.[7] [9]

**Safest repair:** After approval, inspect the job delivery target and deployed revision, confirm the callback path remains exactly `/api/scheduled/tradeReminders`, then perform one controlled scheduled-job verification and inspect its run log. Do not create a second job or change notification policy.

### 3. Provider OAuth connections will fail because token encryption is not configured

**Impact:** eBay, Facebook, and LinkedIn token-persistence paths call AES-256-GCM `encrypt()`. That helper throws unless `ENCRYPTION_KEY` is a 64-character hexadecimal key. The active environment passed no presence/length check for that key, while startup validation does not require it; therefore the site can start normally but a user will receive a connection failure when a provider callback attempts to store a token.[10] [11] [12]

**Security note:** The compatibility `decrypt()` path deliberately returns an undecipherable value unchanged to support pre-migration plaintext tokens. This means any historical plaintext tokens remain a residual at-rest exposure until an approved rotation/migration plan is performed. The audit did not inspect token values.[10]

**Safest repair:** Add a new secret using a securely generated 32-byte hexadecimal value, validate only its presence/format, and make provider-connect UI fail clearly when encryption is unavailable. Inventory and rotate/migrate legacy tokens only with a separately approved plan; do not print, commit, or reuse the key.

## P1 — Fix Before Enabling Related Features at Scale

### 4. Four intended uniqueness protections are absent from the deployed TiDB schema

Read-only TiDB metadata confirmed uniqueness for OpenIDs, account-review user IDs, Membership user IDs, Stripe subscription IDs, and Stripe provider-event IDs. However, deployed metadata did not show unique protection for **usernames**, **one profile per user**, **report identifiers**, or **one watchlist entry per user/listing**. The TypeScript schema uses ordinary `index()` declarations at several of these logical-uniqueness boundaries, so application-level “check then insert” code can race under concurrent requests.[13] [14]

The read-only duplicate scan found **zero current duplicate groups** in all four areas. This is a latent integrity risk rather than proof of existing corrupted records.[14]

**Safest repair:** First reconcile the Drizzle declarations with the actual TiDB schema. Then, after a fresh duplicate preflight and a recovery checkpoint, add the smallest possible unique indexes in dependency order and update mutation handling to return clear conflict messages.

### 5. Stripe webhook retry behavior can permanently skip an event that failed once

The membership webhook stores a provider-event row before processing. On a processing exception it changes that row to `failed` and returns HTTP 500. However, a later retry sees the existing event ID and returns `duplicate` without reprocessing it; the webhook then returns HTTP 200. A transient database or Stripe retrieval failure can therefore leave the Membership record stale until manual intervention.[15] [16]

This is **limited to the current Stripe sandbox Membership state**. The audit confirmed that the webhook receives the raw request body before JSON parsing, ignores live-mode events, validates recurring test prices, and uses the subscription-item period fields. The issue is retry-state handling, not live charging or membership access enforcement.[15] [16] [17]

**Safest repair:** Keep the unique event-ID constraint, but treat only `processed` and `ignored` events as terminal duplicates. Permit a controlled retry of a previously `failed` event with an explicit processing-state transition and a regression test for “failure, retry, success.”

### 6. PayPal verification does not bind the transaction to the trade’s agreed cash obligation

The verification endpoint confirms that the caller and payee participate in the proposal, then sends the **caller-supplied** amount and payee email to PayPal. It does not require that the proposal includes cash, that the caller is the participant owing the cash, that the amount equals the trade’s agreed amount, or that the proposal is in the applicable payment stage. A valid PayPal transfer between the same two people can consequently be recorded against an unrelated or no-cash trade and set the caller’s `paypalVerified` trust signal.[18] [19]

No automatic trade completion, shipment release, or funds movement follows from this record today. The immediate impact is an inaccurate trade payment record and misleading trust data, not an automated financial loss.

**Safest repair:** Derive payer, payee, amount, currency, and permissible trade status solely from the locked proposal row; reject zero/no-cash proposals and mismatched amounts; retain the PayPal response only as supporting verification. Add both server unit tests and a transaction-state test.

### 7. Public support intake permits unthrottled false-urgent ticket spam

The unauthenticated Contact form submits to a public ticket mutation. Its fields are bounded and validated, but the endpoint has no visible rate-limit/anti-automation control and accepts a caller-controlled `urgent` priority even though the public UI normally sets a lower priority. Anonymous submissions are assigned to a fixed administrator account ID and high/urgent ticket counts feed the operations queue.[20] [21]

**Safest repair:** Add server-side request throttling and an abuse control appropriate to the chosen launch policy; compute anonymous priority on the server rather than accepting `urgent` from the client; represent anonymous tickets explicitly instead of as an administrator-owned record.

### 8. Dependency audit reports 81 known advisories, including one critical and 21 high

`pnpm audit --prod` reported **81 advisories: 1 critical, 21 high, 49 moderate, and 10 low**. Direct dependencies include affected `drizzle-orm`, Axios, tRPC, and Express transitive routing packages; the audit also reports several transitive Mermaid/DOMPurify/AWS XML parser paths. Advisory severity alone does not prove a Tradebilia exploit path, but this volume is too high to carry into a broad launch without a deliberate upgrade-and-regression pass.[22]

**Safest repair:** Produce a dependency upgrade plan that prioritizes the patched minimums identified by the audit, checks whether `streamdown`/Mermaid is needed in the deployed client, updates in small batches, and runs the complete build/test/security regression suite after each batch. Do **not** use automatic bulk remediation.

## P2 — Reliability, Quality, Privacy, and Maintainability

| Finding | Evidence and impact | Focused remediation |
| --- | --- | --- |
| **Two test contracts currently fail** | The full suite completed with 407 passing tests, 4 skipped, and 2 failed tests in 134 files. Both failures are brittle exact-substring checks for mobile Account Settings tabs and the authenticated top-bar icon markup. Browser mobile review did not demonstrate the expected visual break, so this is test/implementation contract drift rather than a confirmed mobile rendering failure.[23] | Update the tests to assert semantic responsive behavior and accessibility rather than exact class-string order; retain a browser-level/mobile regression test. |
| **Current build has a large initial client bundle** | Fresh type checking and production build both passed, but Vite reported a 3.72 MB main JavaScript asset (686.79 kB gzip) and warned that chunks exceed the default 500 kB threshold.[24] | Profile route/module usage, dynamically import the heavy guide/admin/analysis features, and establish a launch performance budget before refactoring. |
| **Authentication payload persists in browser local storage** | `useAuth` persists the resolved user payload to `manus-runtime-user-info` for the preview-session workaround, then removes it at logout. This does not include a password hash in the reviewed `auth.me` projection, but increases exposure of profile metadata if arbitrary same-origin script execution occurs.[25] [26] | Store only the minimum display/session fields required for the preview workaround, apply a clear expiry, and retain/logout-test the cleanup behavior. |
| **User-visible form accessibility needs hardening** | The public Sign Up page renders visible label text but does not associate labels with input IDs, and error text is not connected through `aria-describedby`/live feedback. The Trade Room cash modal also has icon-only close control without an accessible label.[27] [28] | Add IDs, `htmlFor`, accessible error associations, and explicit `aria-label` values; include a keyboard/focus-dialog check. |
| **Scheduled acceptance cleanup is weakly guarded and under-tested** | The scheduler selects old `accepted` confirmations without joining/filtering the parent trade status, then deletes them even when its cancellation update affects no active negotiating trade. The normal mutual-acceptance flow cleans these rows, so the risk is a stale-data edge case; the scheduled route tests do not cover it.[7] [29] | Filter by the eligible parent trade state, make cancellation/deletion atomic per proposal, increment counts only when a cancellation occurs, and add the missing regression case. |

## Items Investigated and Ruled Out

The following initially plausible claims were checked directly and are **not classified as confirmed defects** in this report.

| Claim | Audit result |
| --- | --- |
| Historical Vite syntax/HMR messages mean the current guide page is broken. | **Ruled out.** A fresh non-watch `pnpm check` and production build both succeeded. The old log entries correspond to transient staged edits. |
| The homepage’s current listing cards link to invalid item IDs. | **Ruled out.** Initial numbers mistaken for IDs were asset-path segments; a current feed ID opened the listing detail page successfully. |
| `sql.raw` in the reviewed marketplace/trade queries directly interpolates request data. | **Ruled out in the reviewed calls.** Category/order and status fragments were selected from server-controlled allowlists/database-record IDs, not unconstrained request strings. Continued review should preserve that pattern. |
| First-time profile setup lets a browser simply claim email/phone verification. | **Ruled out.** The server validates that the submitted email matches the account email and server-persisted verified contact, and that the normalized phone matches a server-persisted verified phone, before assigning final flags.[30] [31] |
| Stripe subscription dates are read from obsolete fields and provider event IDs are not unique. | **Ruled out.** The active code prefers the subscription-item period fields and deployed TiDB has a unique `(provider, providerEventId)` constraint. The separate failed-event retry flaw remains confirmed.[13] [15] |
| The report-evidence storage proxy exposes report files publicly. | **Ruled out for the current producer contract.** Keys following `reports/{ownerId}/…` require a matching session user or administrator before a signed redirect is obtained.[32] |
| Provider OAuth callbacks lack state or session binding. | **Ruled out for eBay/Facebook/LinkedIn.** Those callbacks use their own provider state-cookie validation and require a logged-in Tradebilia session. This is separate from the broken Manus OAuth path.[33] |

## Validation Performed

The audit inspected code and configuration using read-only methods, ran source-level and browser smoke checks without submitting data, queried only custom TiDB metadata/counts, reviewed the Heartbeat job/listed its logs without running it, and did not create a Stripe session, invoke a payment provider, mutate a schedule, or change secrets.

| Check | Result |
| --- | --- |
| Fresh TypeScript check | Passed. |
| Fresh production build | Passed; performance warning retained. |
| Baseline full test suite | 407 passed, 4 skipped, 2 failed brittle UI-contract tests. |
| Published `GET /health` | Returned `status: ok` and `database: connected`. |
| Custom TiDB integrity scan | No current duplicate groups in the four examined missing-uniqueness areas. |
| Desktop/mobile public route smoke checks | Public homepage, search, category, current listing detail, guide, sign-up, recovery, and contact pages rendered; no current browser-console exception was retained from the tested flow. |
| Stripe sandbox source review | Raw-body registration, live-event rejection, configured test-price check, event uniqueness, and subscription-item periods confirmed; failed-event retry gap confirmed. |

## Recommended Approval Batches

I recommend approving remediation in three small, reversible batches rather than a broad rewrite.

| Batch | Scope | Why it comes first |
| --- | --- | --- |
| **A — Restore critical flows** | Repair OAuth state-cookie/start flow, configure and validate provider-token encryption, resolve the shipment-reminder delivery mismatch, and add targeted tests. | Restores reachable sign-in, provider-connect, and operational reminder functionality. It requires a new secret and one controlled scheduled-job verification. |
| **B — Integrity and transaction correctness** | Add approved TiDB uniqueness protections after preflight; bind PayPal verification to locked trade obligations; make Stripe failed events retryable; add tests. | Prevents data duplicates and misleading billing/payment records before these features see broader use. |
| **C — Launch hardening** | Rate-limit contact intake, replace brittle tests, reduce client bundle size, improve accessibility/local-storage minimization, tighten scheduled cleanup, and plan dependency updates. | Improves scale readiness and safety without changing marketplace policy. |

No remediation has begun. Please approve **Batch A**, **Batches A and B**, **all three batches**, or a narrower subset. I will preserve the custom TiDB database, Free Launch, Stripe sandbox-only status, existing schedule identity, and existing deployment/domain behavior while implementing only the approved scope.

## References

[1]: ./server/_core/startupChecks.ts "Startup checks"
[2]: ./server/db.ts "Custom TiDB database connection helpers"
[3]: https://tradebilia.manus.space/health "Tradebilia published health endpoint, checked August 27, 2026"
[4]: ./client/src/const.ts "Browser OAuth URL builder"
[5]: ./server/_core/oauth.ts "Manus OAuth callback"
[6]: /tmp/tradebilia-oauth-reachability.txt "Read-only active caller inventory"
[7]: ./server/scheduledRoutes.ts "Scheduled routes and trade-reminder handler"
[8]: /tmp/tradebilia-heartbeat-list.txt "Read-only Heartbeat job inventory"
[9]: /tmp/tradebilia-heartbeat-logs.txt "Read-only Heartbeat execution history"
[10]: ./server/_core/crypto.ts "Provider token encryption helper"
[11]: ./server/_core/startupChecks.ts "Environment requirements"
[12]: /tmp/tradebilia-confirmed-audit-observations.md "No-disclosure encryption-key presence/format audit result"
[13]: /tmp/tradebilia-custom-tidb-indexes.txt "Read-only TiDB index metadata"
[14]: /tmp/tradebilia-custom-tidb-integrity.txt "Read-only duplicate-group inventory"
[15]: ./server/stripeMembershipBilling.ts "Sandbox Membership event persistence"
[16]: ./server/stripeWebhook.ts "Signed raw-body Stripe webhook route"
[17]: https://docs.stripe.com/webhooks "Stripe: Receive Stripe events in your webhook endpoint"
[18]: ./server/routers.ts "Payment verification procedures"
[19]: ./server/paypal.ts "PayPal transaction verification helper"
[20]: ./client/src/pages/Contact.tsx "Public contact form"
[21]: ./server/routers.ts "Public support-ticket mutation"
[22]: /tmp/tradebilia-whole-code-baseline.log "Production dependency audit"
[23]: /tmp/tradebilia-baseline-failure-details.txt "Full-suite test result and failure detail"
[24]: /tmp/tradebilia-final-build-recheck.txt "Fresh TypeScript and production build result"
[25]: ./client/src/_core/hooks/useAuth.ts "Authentication-state persistence"
[26]: ./server/routers.ts "Authenticated user response projection"
[27]: ./client/src/pages/SignUp.tsx "Sign Up form"
[28]: ./client/src/pages/WarRoom.tsx "Trade Room cash dialog"
[29]: ./server/scheduledRoutes.test.ts "Scheduled-route test coverage"
[30]: ./server/accountSetupRequirements.ts "Server-side account-setup requirements"
[31]: ./server/routers.ts "Profile persistence procedure"
[32]: ./server/_core/storageProxy.ts "Private report-evidence storage proxy"
[33]: ./server/_core/providerOAuthCallbacks.ts "Provider callback state and session checks"
