# Third Deep Code Audit — 2026-08-27

**Author:** Manus AI  
**Scope:** Read-only review after the second-audit P0/P1 remediation, canonical test-contract cleanup, and guarded account-closure workflow.  
**Change policy during this audit:** No application behavior, custom TiDB data/schema, provider configuration, payment configuration, schedule, or secret value was changed.

## Executive assessment

The completed remediations materially improved trade-artifact integrity, correspondence retention, scheduled receipt escalation, provider failure boundaries, startup validation, and account-closure controls. The current build type-checks and produces a production bundle. However, the audit identified two **P0** issues that should be corrected before relying on privacy controls or the public sign-in links: a group of public read paths bypasses the profile/closure visibility model, and the mounted OAuth start/callback path issues a session shape that the active custom-auth context cannot resolve.

The next recommended action is a narrowly scoped P0 batch. It should add a shared, server-side public-owner/listing eligibility gate to every public presentation query and consolidate public sign-in entry points onto the supported custom-auth contract (or fully unify the two session formats). No customer data cleanup or payment action is needed for either repair.

## Confirmed P0 findings

| ID | Finding | Evidence | Impact | Minimal safe remediation |
|---|---|---|---|---|
| **P0-1** | **Public read paths bypass profile visibility and immediate account-closure hiding.** | `getListingDetail()` in `server/db.ts` fetches by listing ID without requiring active status or an eligible owner (lines 1002–1028). Its similar-listing query requires only `status = 'active'`, not `isActive = 1` (lines 1058–1080). `market.getUserTrades` is public and returns completed-trade participant/item data for any supplied user ID without a profile/closure predicate (`server/routers.ts`, lines 2104–2147). `market.getVerifiedMerchants` is public and has no `showProfile` or closed-account condition (lines 686–706). Public online-status procedures return exact `lastActivityAt` for any user ID (lines 3587–3617). Account closure only sets `isAccountClosed`, hides active listings, and flips `showProfile` (`server/accountClosure.ts`, lines 123–160). | A hidden or closed member can remain discoverable through direct listing IDs, completed-trade history, merchant cards, or presence lookups. Inactive listing details can be read directly and inactive listings can appear as “similar” items. This undermines the earlier privacy repair and the newly approved immediate-closure expectation. | Create one shared public-owner eligibility predicate/helper and apply it to listing feed/detail/similar queries, verified merchants, public trade history, profile enrichment, and seller-presence lookups. Permit explicit owner/admin exceptions only where required. Return a neutral not-found response for ineligible direct IDs. Add behavior-level regression tests for hidden, closed, and inactive records. |
| **P0-2** | **Public sign-in buttons route to a session format that the active request context cannot authenticate.** | `client/src/const.ts` sends `getLoginUrl()` to `/api/oauth/start`; this helper is used by public pages and navigation. The mounted OAuth callback creates an SDK token with `openId`, `appId`, and `name` (`server/_core/oauth.ts`, lines 37–103; `server/_core/sdk.ts`, lines 166–196). The active tRPC context instead sends that cookie to `customAuth.getUserFromSession()` (`server/_core/context.ts`, lines 20–30), which expects a `userId` payload and resolves the account by ID (`server/_core/customAuth.ts`, lines 97–110). Custom-created accounts set `openId` to `null` (`server/db.ts`, lines 2850–2874). | Visitors using many unauthenticated “Sign In” calls can complete an OAuth redirect but return without an authenticated Tradebilia custom session. The parallel identity model can also create confusing, non-reconciled account records if OAuth use is attempted. | Select and enforce one supported sign-in model. The smallest repair is to route public sign-in entry points to the existing custom sign-in modal and retire the unused OAuth flow from public navigation. If OAuth must remain, use one verified session payload/resolver, add closed/banned checks, and define safe account linking before enabling it. Add end-to-end route-contract tests. |

## P0-A remediation status — completed 2026-08-28

The approved P0-A repair was completed after this audit. `server/publicVisibility.ts` now provides the single public-member eligibility condition—public profile explicitly enabled and account not closed—and public listing feeds/details/similar cards, public ranking cards, site statistics, verified merchants, user trade history, recent trades, and seller-presence procedures use it or equivalent protected joins. The listing formatter now applies this restriction only when a caller explicitly requests public presentation, preserving authenticated owner inventory and watchlist views. Ineligible direct listing requests return the established neutral not-found result, and seller-presence responses no longer expose exact activity timestamps.

All existing public sign-in buttons now keep the visitor on their current Tradebilia page and open the established custom-credential sign-in modal through `?signin=1`; the legacy OAuth start route is no longer used by user-facing navigation. Provider OAuth connection callbacks remain separate and protected. New focused regression coverage verifies the shared eligibility helper, each repaired public surface, private-owner formatting exceptions, and custom sign-in routing.

| Post-remediation validation | Result |
|---|---|
| Focused privacy, account-closure, session, and sign-in tests | **18 passed** across 5 files. |
| Complete non-watch suite | **149 files passed, 1 skipped; 459 tests passed, 4 skipped.** |
| TypeScript, production build, dependency audit, whitespace review | **Passed.** |
| Startup checks and public visual smoke | **Passed.** The sign-in modal opens in place at `?signin=1`; public Member Directory and missing-listing behavior remained intact. |

## Confirmed P1 findings

| ID | Finding | Evidence | Impact | Minimal safe remediation |
|---|---|---|---|---|
| **P1-1** | **Transactional email templates interpolate member-controlled text as raw HTML.** | Most templates interpolate names, subjects, listing titles, reasons, and message previews directly into HTML, for example `sendNewDirectMessageEmail()` and `sendTradeInitiatedEmail()` in `server/_core/email.ts` (lines 127–156 and 176–195). The same module’s referral template already uses explicit HTML escaping, demonstrating the intended pattern. | A malicious display name, listing title, reason, or message preview can alter the rendered content of a recipient email, creating phishing, misleading-link, or layout-integrity risk. | Centralize a small HTML-escape helper and apply it to every dynamic HTML-body and subject value. Preserve pre-launch builder escaping. Add a test with markup-bearing sender/title/message inputs. |
| **P1-2** | **A timed-out Pre-Launch broadcast retry can create a duplicate email campaign.** | `sendPreLaunchUpdate()` sends a broadcast immediately and generates its name from a new timestamp (`server/preLaunchEmail.ts`, lines 160–190). A provider-side success followed by a local timeout gives a retry a different broadcast identity. | An administrator retry can send the same update twice to opted-in contacts. | Persist/request a stable idempotency key or deterministic send record before provider submission, and reconcile a retry with that record rather than creating a new timestamped broadcast. Keep any implementation administrator-only and sandbox-safe. |
| **P1-3** | **The public launch-update signup path can write provider contacts during staging and has no local request throttle.** | `launchUpdates.subscribe` is public (`server/routers.ts`, lines 227–231). `subscribeToLaunchUpdates()` makes Resend contact and segment writes but does not call the existing staging-safety guard or a request limiter (`server/launchUpdates.ts`, lines 27–138). | Embedded-preview or staging interactions can alter the real contact provider; automated requests can consume provider capacity or pollute the audience. | In staging, return a clear no-write availability response before any provider call. Add an IP+normalized-email limiter and preserve duplicate-safe production signup behavior. Add tests that prove no fetch happens in staging and throttling occurs before provider calls. |
| **P1-4** | **PayPal payee verification is fail-open when the provider response omits payee information.** | `verifyPayPalTransaction()` accepts a transaction after status/amount checks when `payeeEmail` is null because the mismatch condition runs only when that field is present (`server/paypal.ts`, lines 143–189). | Before any PayPal/cash obligation is enabled, an unrelated successful transaction could satisfy verification if the provider response is incomplete. Current Free Launch and inactive payment enforcement limit present exposure. | When an expected payee is defined, require a non-empty returned payee and case-insensitive match; otherwise fail closed. Add provider-response omission and mismatch tests before enabling payment enforcement. |
| **P1-5** | **Public market-data endpoints can trigger expensive external work without bounded input shape or local admission control.** | Five market-data procedures are public (`server/_core/marketDataRouter.ts`, lines 41–203). `sources`, search terms, cache age, and some result inputs lack tight allowlists/size bounds. Cache misses invoke eBay work; the provider adapter retries up to three 30-second requests (`server/_core/ebayDataAcquisition.ts`, lines 14–52). | Anonymous traffic can amplify upstream calls and hold server capacity, particularly on repeated cache misses or unusual request combinations. | Require authentication or add endpoint-specific IP/user rate limits, strict source enum/max length/max sources, bounded search text/cache age, and an absolute request budget. Preserve normal public browsing, which does not require this acquisition API. |

## P1-A remediation status — completed 2026-08-28

The approved P1-A repair resolved **P1-1 through P1-3**. Transactional notification HTML now renders every dynamic member or administrator-supplied value through shared plain-text escaping helpers, preserves deliberate line breaks, and normalizes every provider-boundary subject to remove CR/LF and other control characters. The Tradebilia logo/template structure and existing Resend failure behavior remain unchanged.

Pre-Launch delivery now records a unique administrator delivery key, content hash, requested-by account, confirmed broadcast identity, recipient count, and state before a provider broadcast is attempted. A confirmed retry returns the recorded result without contacting Resend; `sending` or `uncertain` records deliberately fail closed rather than sending again. This local ledger is necessary because Resend documents idempotency for single and batch email endpoints, not broadcast creation/send. [1] [2] [3]

The public Coming Soon signup, Pre-Launch recipient lookup, and Pre-Launch delivery all stop before any provider request when staging safety is enabled. Public signup is additionally limited per normalized email and request source in the local process. The live administrator UI retains its existing preview and explicit confirmation; its UUID delivery key remains stable for a confirmed send/retry and renews only when draft content changes or a delivery is confirmed.

| Post-remediation validation | Result |
|---|---|
| Focused outbound-safety tests | **22 passed** across transactional email, launch-update, and Pre-Launch delivery suites; providers were mocked or blocked. |
| Complete non-watch suite | **149 files passed, 1 skipped; 470 tests passed, 4 skipped.** |
| TypeScript, production build, dependency audit, whitespace review | **Passed.** |
| Custom-TiDB preflight/postcheck | Dedicated 10-column delivery ledger was absent before, present after, and had **0 records** after validation. The baseline remained 3 members, 16 active listings, $147,530 active value, 7 trade messages, and zero inquiries/direct messages/reports/complaints. |

The remaining P1 items are **P1-4 PayPal fail-closed payee verification** and **P1-5 public market-data admission controls**. They require a separate approval because they affect payment-verification and public data-acquisition contracts.

## Confirmed P2 findings

| ID | Finding | Evidence | Impact | Recommended disposition |
|---|---|---|---|---|
| **P2-1** | **Trusted external-return origin is still derived from request headers.** | `getSafeRequestOrigin()` falls back to `${req.protocol}://${host}` in `server/membership.ts` (lines 138–150); the OAuth starter also derives its redirect URI from request host/proto (`server/_core/oauth.ts`, lines 16–24). | A deployment/proxy that accepts attacker-controlled host headers can create untrusted return/callback origins. Stripe flows remain administrator-only and sandbox-only, but this must be repaired before live billing or broader OAuth use. | Complete the previously identified P2B allowlist: use configured canonical origins only, reject others, and cover Stripe/OAuth consistently. |
| **P2-2** | **Scheduled acceptance cancellation and receipt escalation write lifecycle state and audit records in separate operations.** | `server/scheduledRoutes.ts`, lines 151–188, conditionally updates the trade then separately deletes confirmation rows or writes the administrator log. | A failure after the guarded status update can leave an incomplete audit trail. Receipt escalation itself remains race-safe/idempotent because it logs only after an affected-row guard. | Put each state-transition plus its required audit mutation in a short database transaction; retain existing conditional predicates and idempotency tests. |
| **P2-3** | **Membership feature updates silently report success if a plan-feature row is absent.** | `billing.updatePlanFeature` executes an update then always returns `{ success: true }` without checking affected rows (`server/membership.ts`, lines 157–165). | An administrator can believe a capability setting changed when it did not. | Verify affected rows and return a not-found/conflict error, or safely upsert the mapping after validating plan/feature IDs. |
| **P2-4** | **Timeout handling is still inconsistent across external integrations.** | The recent 15-second protections cover Resend transactional mail, Twilio, and PCGS; several other provider calls remain unbounded in code, including eBay integration/lookup, Facebook profile calls, Parse-market requests, storage operations, and some tracking adapters. | One degraded provider can continue to tie up request capacity or generate uneven error behavior. | Establish a shared outbound-request wrapper with timeout, sanitized failure telemetry, and tests. Apply it incrementally to user-triggered and scheduled paths first. |
| **P2-5** | **The complete regression suite contains an environment-dependent external credential probe.** | The otherwise successful local run had one failure: `server/ipqs.credentials.test.ts` timed out after 15 seconds. TypeScript, production build, production dependency audit, and whitespace validation passed. | The test suite can report a false regression when the external IPQS service/network is slow, reducing CI signal quality. | Move credential probes to an explicit manual/integration command and keep the normal suite deterministic with mocked provider behavior. |

## Lower-priority observations

The public verified-merchants view rendered correctly in the smoke test, but its current server query is the same privacy/closure bypass described in P0-1. The public shell also visibly cycles the wordmark through category labels (for example, “TRADE SPORTS CARDS”); this appears deliberate in `AnimatedLogoSmall70` rather than a security defect, so it is not assigned a remediation priority.

No new secret value was printed, logged, committed, or placed in audit output. The review did not find a direct custom-session authentication bypass, unchecked destructive data migration, live payment activation, unguarded scheduled endpoint, or a new trade-artifact uniqueness regression. Existing startup logs confirmed required-environment and custom-database connectivity checks passed before the server began listening.

## Validation record

| Check | Result |
|---|---|
| Full non-watch test suite | **1 external failure**: `server/ipqs.credentials.test.ts` timed out; 146 test files passed and one was skipped. |
| TypeScript | **Passed** (`pnpm check`). |
| Production build | **Passed** (`pnpm build`). |
| Production dependency audit | **Passed** (`pnpm audit --prod`). |
| Whitespace review | **Passed** (`git diff --check`). |
| Runtime startup evidence | **Passed**: environment and custom database connection checks logged before listening. |
| Public visual smoke | Homepage, Member Directory, Verified Merchants, and unknown-item route rendered. The unknown route displayed the project’s Not Found UI. |

## Approval-ready remediation sequence

> **Recommended next batch: P0-A — public-visibility/closure enforcement and public sign-in consolidation.**

P0-A should be implemented as one focused, tested batch because both faults undermine expected public entry and privacy behavior. It should not alter trade data, membership policy, payment settings, or provider credentials. The batch should add behavior-level tests for direct inactive listing access, hidden/closed profile discovery, public trade history, merchant cards, online-status lookups, and public sign-in redirects.

P0-A and P1-A are complete. The recommended next order is P1-B (PayPal fail-closed verification and public market-data admission controls), then P2B (trusted configured origins before any live billing). P2 reliability cleanup can proceed in small provider-specific batches to avoid a broad integration refactor.

## References

1. [Resend — Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
2. [Resend — Create Broadcast](https://resend.com/docs/api-reference/broadcasts/create-broadcast)
3. [Resend — Send Broadcast](https://resend.com/docs/api-reference/broadcasts/send-broadcast)
