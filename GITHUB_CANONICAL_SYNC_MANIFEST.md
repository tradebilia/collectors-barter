# GitHub Canonical Synchronization Manifest

**Status:** GitHub `main` is the canonical Tradebilia code history as of 2026-08-26.

## Canonical Baseline

| Record | Value |
|---|---|
| Canonical repository | `tradebilia/collectors-barter` |
| Canonical branch | `main` |
| Canonical immutable tag | `baseline/github-canonical-20260826T1715Z` |
| Initial canonical baseline commit | `44375811651b2141613ad2d46b1aa76b346f41ff` |
| GitHub pre-reconciliation backup tag | `backup/github-main-pre-webdev-reconcile-20260826T1705Z` |
| Managed WebDev pre-reconciliation checkpoint | `8e6c5375` |

## Purpose and Recovery Rules

The external GitHub repository is the authoritative history for future Tradebilia code changes. The managed WebDev project retains independent checkpoint history for deployment recovery and must not be force-pushed into GitHub or used to overwrite newer GitHub work.

Before a future GitHub-to-WebDev reconciliation, create a fresh WebDev checkpoint and an immutable GitHub backup tag. Before a future WebDev change becomes canonical, commit and push the reviewed change to GitHub first, then apply the equivalent reviewed content to WebDev and checkpoint it. Record any new canonical baseline tag and paired recovery checkpoint in this document.

## Compatibility Boundary

The canonical GitHub repository contains an historical membership migration chain. The restored Tradebilia custom TiDB runtime now contains the separately approved, verified mixed-case Membership foundation, but the original GitHub migration files must not be replayed on that runtime. The following historical GitHub paths remain **migration-gated** and must not be imported or replayed as-is:

- `drizzle/0007_shocking_expediter.sql`
- `drizzle/0008_slimy_risque.sql`
- `drizzle/meta/0007_snapshot.json`
- `drizzle/meta/0008_snapshot.json`
- `drizzle/meta/_journal.json`
- `drizzle/schema.ts` membership additions
- `server/membership.ts`
- `server/membership.test.ts`
- `server/preLaunchRecipientSelection.test.ts`
- `client/src/components/SubscriptionAccessGate.tsx`
- Membership-dependent portions of `server/routers.ts`, `client/src/App.tsx`, `client/src/pages/AccountSettings.tsx`, and `client/src/pages/AdminDashboard.tsx`

No migration, seed, schema push, destructive action, or database write is authorized by this manifest alone. The restored custom TiDB data remains the runtime data source.

## Verified Compatible Baseline Content

The Member Directory title-artwork adjustment, its regression test, and the future membership/billing/verification planning document are present and identical in both repositories at this baseline.

## WebDev-First Membership Implementation Pair

| Record | Value |
|---|---|
| Approved custom TiDB membership migration | Applied and verified on 2026-08-26; existing marketplace records were retained. |
| WebDev membership implementation checkpoint | `fd796d54` |
| GitHub implementation commit | `85e92ae4ed2926cd864786cfbc2f7629989f0213` |
| Payment state | Free Launch retained; Stripe, checkout, card collection, and paid-access enforcement are inactive. |
| Later payment safety boundary | A separately approved Stripe test-mode phase is required before any payment credential, checkout, webhook, or charge is introduced. |

The GitHub `0009_warm_mongu.sql` migration is the source-history upgrade path for environments that already ran GitHub’s earlier membership migrations. It must **not** be replayed on the restored custom TiDB runtime, which already received the separately reviewed WebDev migration `0007_elite_switch.sql`.

## Stripe Sandbox Checkout Pair

| Record | Value |
|---|---|
| Custom TiDB membership audit | Read-only verification confirmed the runtime mixed-case `userMemberships` table, required columns/indexes, `membershipProviderEvents` idempotency key, and the completed administrator’s monthly sandbox subscription record. No migration or marketplace-data write was required. |
| Marketplace baseline | 3 members, 16 active listings, and $147,530 active listing value before and after the audit. |
| Free Launch safeguards | `billingMode=free_launch`, `stripeBillingEnabled=0`, and `paymentEnforcementEnabled=0`. |
| Canonical sandbox implementation commit | `0d45ce25d94bec3c222da929fb57832e0730442b` |
| Paired managed WebDev checkpoint | `ca726dc7` |
| Sandbox period mapping correction | Canonical commit `48003d5802ae1662465e9f8aa999eda37a07d9de`; managed checkpoint `82c76148`. |
| Same-tab Checkout and duplicate guard | Canonical commit `d87a453bf9de22bbff6cc837dd5ffc4906044ba1`; managed checkpoint `12f56cb8`. |
| Payment boundary | Stripe sandbox Checkout and customer portal remain administrator-only. No live key, live charge, fee enforcement, or member restriction is enabled. |

The canonical commit deliberately merges the sandbox-specific behavior without replacing the existing richer Membership administration code. It validates signed raw Stripe sandbox webhooks, stores only membership/provider audit fields needed for reconciliation, rejects unconfigured prices, and keeps duplicate provider events idempotent.

## Administrator Operations Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `af0fbbc9d75f0e8a26111ba8909e49a412b7713f` |
| Paired managed WebDev checkpoint | `70942380` |
| Custom TiDB additions | Additive, idempotent `accountApprovalReviews`, `apiHealthEvents`, and privacy-safe `adminActivityLog` tables. No seed, destructive, member, trade, Membership, payment, or scheduling-data migration was run. |
| Operations workspace | Administrator-only Health, Action Queue, Active Trade Lifecycle, Launch & Membership Readiness, Operational Timeline, and CSV Exports. CSV values are spreadsheet-formula safe. |
| Existing schedule repair | The existing enabled `tradebilia-shipment-reminders-daily` Heartbeat job was refreshed in place at `/api/scheduled/tradeReminders` with the existing daily UTC cadence; its next run is scheduled. No new job or email was created. |
| Preserved safeguards | Custom TiDB marketplace baseline remains 3 members, 16 active listings, and $147,530. Free Launch remains active; Stripe live mode and payment enforcement remain inactive. |

## P0 Audit Remediation Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `91eb6f40` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `ad338c75` |
| Scope | Server-owned one-time Manus OAuth state cookie; preview-safe cookie consistency; refreshed existing shipment-reminder job with a successful zero-work HTTP 200 verification; secure provider-token encryption configuration and fail-closed provider callback guardrails. |
| Validation | Focused P0 suite: 41 tests passed across five files; TypeScript and production build passed. The complete suite retains only two pre-existing brittle mobile UI test-contract failures. |
| Preserved safeguards | No custom TiDB records/schema, marketplace data, Free Launch policy, Stripe sandbox configuration, subscription, provider account, or provider token was changed. The secure encryption-key value is not committed or recorded here. |

## P1 Audit Remediation Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `c67c1af5da185fe62543f20f3ef907b81133f231` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `5a1357a4` |
| Scope | Additive TiDB unique indexes for usernames, profiles, reports, watchlist entries, and mirrored favorites after zero-duplicate preflight; retry-safe sandbox Stripe failed events; server-derived PayPal payment obligations; public-contact throttling and anonymous attribution; targeted dependency remediation through Express 5 and Recharts 3. |
| Validation | 17 focused P0/P1 tests passed; TypeScript, production build, local custom-TiDB health, desktop public-route smoke checks, and canonical validation passed. The full suite has 421 passing and four skipped tests, with the two existing brittle mobile exact-string test failures still documented for separate P2 work. |
| Dependency posture | Final `pnpm audit --prod` reports zero critical, high, moderate, and low advisories. |
| Preserved safeguards | Marketplace baseline remained 3 members, 16 active listings, and $147,530. Free Launch remains active; Stripe stays sandbox-only; payment enforcement remains inactive; no external payment or provider account action was invoked. |

## P2 Audit Remediation Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `87048200` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `813e09e1` |
| Scope | Behavior-focused mobile responsive tests; guarded scheduled acceptance cleanup; Sign Up and Trade Room accessibility associations; lazy loading for infrequently used authenticated/administrator routes; minimal, validated 30-minute embedded-preview session persistence; and reconciliation of the previously deployed P0 preview-authentication components in canonical GitHub. |
| Validation | Full suite passed 141 files / 430 tests with four intentional skips; focused canonical P0/P2 suite passed 50 tests; TypeScript, production builds, clean production dependency audit, and desktop/mobile public-route visual checks passed. |
| Performance | Main production JavaScript fell from 3,749,720 bytes to 1,790,690 bytes (52.2% reduction); infrequently used routes remain available as separately loaded chunks. |
| Preserved safeguards | No marketplace, custom TiDB data/schema, Free Launch policy, Stripe sandbox configuration, payment-enforcement, subscription, or provider-account behavior was changed. |

## Second Deep-Audit P0 Remediation Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `dd8e305816d21f1ad82d47b41ad6bc89e456db5e` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `53429841` |
| Scope | Enforce saved profile visibility, inventory-value, and contact-request choices at public profile, member-search, inquiry, and direct-message boundaries; retain address data server-only for distance calculations; restore accepted Review status after mutual trade acceptance; preserve item locks until mutual Review confirmation starts Shipping; retain server-derived positive-cash PayPal verification at the intended Review stage. |
| Validation | Focused privacy, lifecycle, payment-authorization, and atomicity tests passed; TypeScript, production build, clean dependency audit, and public visual checks passed. The complete suite recorded only two unrelated external UPS/USPS endpoint timeouts. |
| Corrected audit point | Direct remediation review confirmed full street-address and postal-code data were already removed from member-search responses; the completed privacy repair addresses the confirmed preference-enforcement and inventory/contact boundaries. |
| Preserved safeguards | No custom TiDB record/schema changes, marketplace data changes, Free Launch policy change, Stripe sandbox configuration/subscription change, payment charge, provider-account action, or secret change occurred. |

## Second Deep-Audit P1 Remediation Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `cd2b3d129666ce7b680ba3f6b0cdbc7f936bb85d` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `d331268e` |
| Scope | Eight reviewed trade-artifact uniqueness protections after one approved duplicate-review cleanup; participant-specific message/inquiry archive retention; guarded receipt escalation; 15-second Resend/Twilio/PCGS timeout boundaries with sanitized failure telemetry; and core custom-TiDB-first startup validation. |
| Custom TiDB outcome | The sole approved data cleanup removed the newer row in one duplicate review pair; the oldest row was retained. The additive `0013` communication migration removed no correspondence body and mapped zero legacy shared inquiry deletions. Aggregate postchecks preserved 3 members, 16 active listings, and $147,530 active listing value. |
| Validation | WebDev full non-watch suite, TypeScript, production build, `pnpm audit --prod`, whitespace review, startup logs, and public smoke checks passed. Fresh canonical P1-focused tests, TypeScript, production build, dependency audit, and whitespace review passed. A fresh canonical full-suite attempt additionally surfaced pre-existing, unrelated legacy test-contract drift outside this P1 scope. |
| Preserved safeguards | Free Launch remains active; Stripe remains sandbox-only; payment enforcement remains inactive. No schedule was run or reconfigured, no provider message/payment action was invoked, and no secret value is recorded here. |

## Canonical Legacy Test-Contract Maintenance Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `ffdee059696a7834fc1c686ed1101e5e8b720a75` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `26790c47` |
| Scope | Six stale assertions across four canonical-only, migration-gated test files were aligned with the already-approved current behavior: Free Launch public listing details, both administrator trade participant names, successful sequential referral marking, and opt-in-only Pre-Launch Email review/confirmation. |
| Validation | A fresh canonical full suite passed 149 files / 461 tests with four intentional skips. TypeScript, production build, `pnpm audit --prod`, and whitespace review also passed. |
| Preserved safeguards | No WebDev application code was changed; the canonical-only test files remain excluded from the custom-TiDB WebDev migration boundary. No marketplace data/schema, payment configuration, provider policy/action, schedule, or secret changed. |

## Remaining Audit Reassessment Pair

| Record | Value |
|---|---|
| Canonical documentation commit | `ac6cbae815fe07b151ae7ca7810a5f8d0c7c98a7` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `32256c7a` |
| Scope | No-change reassessment of the remaining post-P1 recommendations: copy-only Privacy Policy alignment, trusted Stripe return-origin allowlisting before any live billing, preview OAuth guidance rather than bearer-token propagation, incremental use of the existing administrator guard, and a Stripe webhook-comment correction. |
| Outcome | P2A—truthful account-closure policy copy—is the recommended next approval. P2B—trusted return origins—must precede any future live-billing proposal. The other three items remain intentionally separate and lower-risk. |
| Preserved safeguards | No application behavior, custom TiDB data/schema, marketplace record, Stripe setting/action, provider action, schedule, or secret changed. |

## Hybrid Account-Closure Workflow Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `c6a1d972` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `30d4e799` |
| Scope | Guarded member account-closure request, additive custom-TiDB request/state schema, immediate closure only for clean non-administrator accounts, disabled future custom sessions, hidden active listings/public profile, and an administrator-only closure-request queue with count-only audit and documented close/decline decisions. |
| Custom TiDB outcome | The reviewed `0014_p2_account_closure_requests.sql` migration added two additive account-state fields and one request table. Aggregate postcheck confirmed 0 closure requests and 0 closed accounts during implementation, with 3 members, 16 active listings, $147,530 value, and all retained-record counts unchanged. |
| Validation | Focused account-closure/logout tests passed 8/8. WebDev full suite passed 147 files / 456 tests with four intended skips; TypeScript, production build, production dependency audit, whitespace review, and startup database validation passed. Fresh canonical focused account-closure/logout/reliability tests, TypeScript, build, audit, and whitespace checks passed. The canonical complete suite did not finish within the bounded run because slow external credential probes remained in progress; no account-closure regression was identified. |
| Preserved safeguards | No account, listing, trade, message, report, complaint, payment, provider, schedule, or secret was deleted or changed by validation. Free Launch remains active, Stripe remains sandbox-only, and payment enforcement remains inactive. |

## Third Deep-Audit Documentation Pair

| Record | Value |
|---|---|
| Canonical documentation commit | `09a293a3` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `60e902cc` |
| Scope | Evidence-based read-only third whole-code audit after the completed second-audit P0/P1 and hybrid account-closure work. |
| Outcome | The report identifies two P0 items (public visibility/closed-account read-path bypasses and the incompatible public OAuth session flow), five P1 safeguards, and five P2 hardening/testing items. |
| Validation | TypeScript, production build, production dependency audit, whitespace review, startup logs, and public-route smoke passed. The full local suite retained one environment-dependent IPQS credential-probe timeout. |
| Preserved safeguards | No runtime code, custom TiDB schema/data, marketplace record, payment setting/action, provider action, schedule, or secret changed during this audit. |

## Third Deep-Audit P0 Privacy and Sign-In Remediation Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `0a42d5f067d65f673a3589eb2bc16bb584a06972` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `372e9b4e` |
| Scope | Central `isPublicMemberEligible` helper applied to public listing feeds/details/similar/ranking cards, marketplace statistics, verified merchants, public completed-trade surfaces, and seller presence; explicit public-only formatting preserves private owner inventory/watchlists. Public sign-in controls now open the current-route custom credential modal rather than the incompatible legacy OAuth flow. |
| Validation | Focused P0/privacy/account-closure/session suite passed 18 tests. Full WebDev suite passed 149 files / 459 tests with four intentional skips and one skipped credential-probe file. Fresh canonical full suite passed 150 files / 471 tests with four intentional skips and one skipped credential-probe file. TypeScript, production build, `pnpm audit --prod`, whitespace review, startup checks, and public visual smoke passed. |
| Preserved safeguards | No custom TiDB schema/data, marketplace record, payment setting/action, provider action, schedule, or secret changed. Free Launch remains active; Stripe remains sandbox-only; payment enforcement remains inactive. |

## Third Deep-Audit P1 Email Safety Remediation Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `ce1364fc` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `282268db` |
| Scope | Shared transactional email HTML/text and header-safe subject encoding; additive `preLaunchBroadcastDeliveries` retry ledger with unique delivery key; stable administrator delivery-key UI; staging-safe public signup, recipient lookup, and delivery; and a process-local normalized email/source signup limiter. |
| Custom TiDB outcome | Reviewed additive `0015_p1_prelaunch_delivery_safety.sql` migration created the 10-column delivery ledger. Aggregate postcheck found 0 delivery records and retained 3 members, 16 active listings, $147,530 active value, 7 trade messages, and zero inquiries/direct messages/reports/complaints. |
| Validation | WebDev focused suite passed 22 tests; full suite passed 149 files / 470 tests with four intentional skips, plus TypeScript, production build, `pnpm audit --prod`, whitespace review, and clean runtime logs. Fresh canonical full suite passed 151 files / 482 tests with four intentional skips, plus TypeScript, build, audit, and whitespace checks. |
| Compatibility handling | The content-level merge retained newer canonical Pre-Launch recipient-selection and send-history behavior while applying the same delivery ledger, staging safeguards, encoding, and regression coverage. A canonical-only UI test was updated for the approved stable `deliveryKey` mutation shape. |
| Preserved safeguards | No email or broadcast was sent; no provider credential, payment setting/action, schedule, marketplace record, or secret changed. Free Launch remains active; Stripe remains sandbox-only; payment enforcement remains inactive. |

## Shared Market-Data Hardening Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `6df16b19` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `d388e864` |
| Scope | Shared market-data router now requires a signed-in Tradebilia member, preserves a larger administrator allowance, permits only the eBay source, bounds identifiers/search/source/cache/sales parameters, applies per-member and per-IP admission limits, and propagates one 15-second abort budget through eBay attempts and retry waits. |
| Test AI compatibility | The existing administrator-only Test AI Sandbox uses its separate protected router and is unchanged. The future Trade AI Analyzer can use this protected shared boundary. |
| Validation | No-provider-call focused tests passed 4/4. WebDev full suite passed 150 files / 474 tests with four intentional skips after a successful UPS retry. Fresh canonical full suite passed 152 files / 486 tests with four intentional skips. TypeScript, production build, `pnpm audit --prod`, and whitespace checks passed in both workspaces. |
| Preserved safeguards | No custom TiDB schema/data, marketplace record, payment setting/action, provider credential/action, schedule, or secret changed. Free Launch remains active; Stripe remains sandbox-only; payment enforcement remains inactive. |

## Fourth-Audit P0 Privacy, SQL, and Consent Remediation Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `cbff5297` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev checkpoint | `44e21dea` |
| Scope | Parameterized completed-trade category filtering with an explicit category enum; shared public-member eligibility for top-rated and completed-trade outputs; and a locked counterproposal comparison that clears both stale acceptances only when offered items or cash terms change. |
| Validation | Focused fourth-audit P0 suite passed 7 tests. WebDev full suite passed 151 files / 478 tests with four intentional skips; fresh canonical full suite passed 153 files / 490 tests with four intentional skips. TypeScript, production build, `pnpm audit --prod`, whitespace, secret-pattern review, and startup checks passed. |
| Preserved safeguards | No custom TiDB schema/data, marketplace record, payment setting/action, provider action, schedule, configuration, or secret changed. Free Launch remains active, Stripe remains sandbox-only, and payment enforcement remains inactive. |

## Fifth-Audit P0 and Administrator-Control Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `d6816efcda46449f75752b6955752c7663d7ae3e` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev recovery checkpoint | `2843b0c8` |
| Scope | Stable, de-duplicated all-listing locks and guarded active-state transitions for mutual trade acceptance; administrator-selected API Health clearing with audit logging; separated Operations queues and pending Feedback Safety review; intent-only administrator Fee Mode switch; admin-only search removal; larger accessible fictional guide captures. |
| Fee Mode safety | Defaults to Free Launch/Off and requires the current administrator password plus the exact state-specific phrase. Either position keeps `paymentEnforcementEnabled=0`; it cannot activate Checkout, collect cards, charge members, or restrict access. Existing Stripe sandbox behavior and canonical duplicate-subscription safeguards remain intact. |
| Validation | WebDev focused regression suite passed 4 files / 14 tests, TypeScript, production build, production dependency audit, and whitespace. Fresh canonical focused no-provider suite passed 8 files / 26 tests, including existing billing, sandbox Stripe, membership, and guide contracts; canonical TypeScript, production build, production dependency audit, and whitespace passed. |
| External-test qualification | The WebDev complete suite recorded 482 passing tests, 4 intentional skips, and one skipped file. Its only failure was the external UPS OAuth readiness probe timing out at the harness’s five-second limit; a single isolated retry also timed out. The probe and its production behavior were not changed or masked. |
| Preserved safeguards | No custom TiDB schema/data, marketplace record, membership record, payment action, provider configuration/action, schedule, or secret changed. |

## Feedback Safety Queue Visibility Repair Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `5ccd1ac1d48257f2d99a102fc91236cc9c37c818` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev recovery checkpoint | `004ffda8` |
| Root cause | Operations counted one pending `lowFeedbackFlags` record whose original member row no longer exists. The prior visible-queue query used an inner join and omitted that record. |
| Repair | The administrator queue now left-joins the member row, preserves the pending safety record, and identifies an orphaned record as **Archived member record** so an administrator can review or dismiss it deliberately. |
| Validation | Read-only aggregate diagnosis confirmed 1 pending record, 1 without a matching user, and 0 with a matching user. Focused WebDev and canonical administrator regressions passed 2 files / 6 tests; TypeScript, production build, and whitespace checks passed. |
| Preserved safeguards | No custom TiDB schema/data, marketplace record, membership record, payment action, provider configuration/action, schedule, or secret changed. |

## Full-Width Trade Room Guide Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `715a7badd6ff79e5f4bf146b410297435b784d39` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev recovery checkpoint | `2bd397cd` |
| Scope | All six fictional development-only Trade Room captures now use a near-full-page-width single-column sequence rather than a two-column card grid. The accessible enlargement dialog and fictional-data disclosure remain intact. |
| Readability handling | The on-page **Select to enlarge** affordance remains visible, and every capture loads eagerly so the complete sequence is available when the guide opens. |
| Validation | Desktop visual review confirmed all six stages render as large, readable full-width captures. Focused WebDev and canonical guide/control regressions passed 2 files / 8 tests; TypeScript, production build, and whitespace passed. |
| Preserved safeguards | No custom TiDB schema/data, marketplace record, membership record, payment action, provider configuration/action, schedule, or secret changed. |

## Image-Ready Trade Room Guide Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `ef17a5ff1f5d839792b6ebc74792e66f4c2c0e5f` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev recovery checkpoint | `29f12266` |
| Scope | Removed all fictional Trade Room images, image URLs, and enlargement controls after review established they were not actual Trade Room snapshots. The six written stage titles and descriptions remain as an ordered, image-ready guide. |
| Presentation safety | Every stage states **Actual Trade Room screenshot to be added**, and the page states that screenshots will be added only after Tradebilia supplies them. No placeholder is represented as a real Trade Room capture. |
| Validation | Focused WebDev and canonical guide/control regressions passed 2 files / 8 tests; TypeScript, production build, desktop visual review, and whitespace passed. |
| Preserved safeguards | No custom TiDB schema/data, marketplace record, membership record, payment action, provider configuration/action, schedule, or secret changed. |

## Administrator Guide Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `c25a8ac5b246216e0006a658f0be904ee4abda72` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev recovery checkpoint | `7ab529b2` |
| Scope | Added the static administrator-only Admin Guide tab to the existing dashboard using the shared accessible accordion component. It does not add a database query, mutation, administrative action, or a new route. |
| Content | Explains all 19 visible administrator workspaces plus Test AI Sandbox and Coming Soon Preview in plain language: what each area does, when to use it, and what to confirm before acting. |
| Validation | Focused source and canonical Admin Guide, Operations, and administrator-control regressions passed 3 files / 9 tests; TypeScript, production build, unauthenticated access-boundary review, and whitespace passed. |
| Preserved safeguards | No custom TiDB schema/data, marketplace record, membership record, payment action, provider configuration/action, schedule, or secret changed. |

## Administrator Dashboard Audit Pair

| Record | Value |
|---|---|
| Canonical documentation commit | `6cc0f2dd3d1ad0b02746a94761ed7ef339814b32` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev audit checkpoint | `a48d4f74` |
| Scope | Read-only `ADMIN_DASHBOARD_AUDIT_2026-08-28.md` covering all 20 visible administrator tabs, their supporting procedures, safe navigation consolidation, and prioritized missing capabilities. |
| Top findings | A data-migration-aware safe-deletion/retention policy is P1; add the existing Closure Requests queue to Operations as a separate narrow P1 read-only count/link; reframe/hide Settings placeholder and improve support/safety case ownership, pagination, and audit coverage as P2 work. |
| Validation | Existing focused administrator regressions passed 6 files / 13 tests; TypeScript, production build, and whitespace passed. No live provider, email, payment, schedule, setting, database, or administrator action was exercised. |
| Preserved safeguards | No application behavior, custom TiDB schema/data, marketplace record, membership record, payment/provider action, schedule, setting, or secret changed. |

## Retained-Record Administrator Safety and Closure Requests Operations Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `a02c856a7ff4d3cc7a5fed24084724de71d7c166` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev recovery checkpoint | `43da9001` |
| Scope | Disabled ordinary permanent deletion controls and legacy user/trade/ticket deletion procedures. Added reason-and-exact-phrase protected retained Account Archive, terminal Trade Archive, and Ticket Close & Retain procedures with central administrator activity entries and archive-visible filters. Added a read-only pending Closure Requests Operations count and direct link. |
| Record protection | No schema migration, database cleanup, or destructive action was used. Member archive reuses guarded closure safeguards; trade/ticket archive retains associated history. Ordinary permanent purge remains disabled and requires a separate exception-only approval. |
| Validation | Focused source and canonical retained-removal, account-closure, Operations, administrator-audit, participant, and guide regressions passed 7 files / 24 tests. TypeScript, production build, production dependency audit, and whitespace passed in both workspaces. |
| Preserved safeguards | No custom TiDB record/schema, marketplace record, membership record, payment/provider configuration or action, schedule, or secret changed. Free Launch remains active and payment enforcement remains inactive. |

## LinkedIn Public-Profile Image Resilience Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `4825a0fdec0afa8b8e085f4a64fadf09e0c1906a` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev recovery checkpoint | `4f6ef8b3` |
| Scope | Public profile LinkedIn card now asks a provider image for no referrer and replaces a failed/expired/hotlink-blocked image with an accessible connected-member initials avatar. |
| Validation | Focused source and canonical LinkedIn fallback/avatar-fit regressions passed 2 files / 5 tests; TypeScript, production build, production dependency audit, whitespace, and public Administrator profile visual review passed. |
| Preserved safeguards | No profile or LinkedIn connection data, database record/schema, marketplace record, payment/provider action, schedule, or secret changed. |

## Public External-Account Connection-Date Pair

| Record | Value |
|---|---|
| Canonical implementation commit | `647cf9888f0e13bc3fe16b5ca3c5f70ec261a36d` — normal push to GitHub `main`; no force push or history replacement. |
| Paired managed WebDev recovery checkpoint | `c2420aab` |
| Scope | The public-profile query now includes the existing Facebook connection timestamp, and connected eBay, Facebook, and LinkedIn cards consistently show a full Connected date when one is available. |
| Validation | Focused public-profile connection-date, LinkedIn fallback, and avatar-fit regressions passed 3 files / 7 tests; TypeScript, production build, production dependency audit, whitespace, and Administrator-profile visual review passed. |
| Preserved safeguards | No external account connection, profile value, database schema, marketplace record, payment/provider action, schedule, or secret changed. |

## Paqq USPS Tracking Assessment Pair

| Record | Value |
|---|---|
| Canonical documentation commit | This pairing record, the Paqq assessment, and the matching tracker update are included together in one normal GitHub `main` commit. No force push or history replacement is used. |
| Paired managed WebDev research checkpoint | `d86ed846` |
| Scope | Read-only assessment of Paqq’s scraper-first USPS approach, license notices, Docker/browser/scheduler requirements, security boundaries, maintenance signal, USPS terms fit, Tradebilia’s existing official USPS helper, and alternatives. |
| Recommendation | Do not install, embed, fork, or use Paqq for Tradebilia. Keep the official USPS outbound link now; treat any in-site official USPS API tracking as a separately authorized future scope. |
| Preserved safeguards | No Paqq code was installed or run. No USPS/provider call, application behavior, database record/schema, payment, schedule, setting, or secret changed. |
## Recent Trades Metadata and Readability Pair
| Record | Value |
|---|---|
| Canonical implementation commit | This pairing record, the homepage query/type/UI refinement, regression update, and matching tracker entry are included together in one normal GitHub `main` commit. No force push or history replacement is used. |
| Paired managed WebDev recovery checkpoint | `414cb76f` |
| Scope | Enlarged Recent Trades thumbnails to 96–112px and shows a stored positive grade, or otherwise normalized condition, with the stated listing value beside it beneath each exchanged-item title. |
| Validation | Full source suite passed 157 files / 495 tests with four intended skips and one skipped file; canonical focused Recent Trades tests, TypeScript, production build, production dependency audit, and whitespace passed. Desktop and mobile public homepage visual checks passed. |
| Preserved safeguards | Existing completed-trade, public-visibility, five-second rotation, reduced-motion, and item-detail click-through behavior remain intact. No database record/schema, payment/provider action, schedule, setting, or secret changed. |
## Recent Trades Grading-Company Metadata Pair
| Record | Value |
|---|---|
| Canonical implementation commit | This pairing record, the completed-trade payload/type/UI refinement, regression update, and matching tracker entry are included together in one normal GitHub `main` commit. No force push or history replacement is used. |
| Paired managed WebDev recovery checkpoint | `018a1d11` |
| Scope | Recent Trades now shows stored certification company plus positive grade where both exist (for example, PSA 10); it falls back to grade alone or normalized condition, with the stated value beside it. |
| Validation | Full source suite passed 156 files / 495 tests with four intended skips and one skipped file; canonical focused Recent Trades tests and TypeScript passed. Source production build, dependency audit, whitespace, and homepage visual review passed. |
| Preserved safeguards | No database record/schema, payment/provider action, schedule, setting, or secret changed. Existing public visibility, rotation, reduced-motion, and item-detail link behavior is unchanged. |

## Recent Trades Directional Layout Pair
| Record | Value |
|---|---|
| Canonical implementation commit | This pairing record, the compact Recent Trades directional-layout component, focused regression update, and matching tracker entry are included together in one normal GitHub `main` commit. No force push or history replacement is used. |
| Paired managed WebDev recovery checkpoint | `1c93c3d2` |
| Scope | Homepage Recent Trades now presents a compact From/To exchange summary with truthful item metadata, a trade-complete marker, desktop arrows that show both movement directions, and a mobile bidirectional cue. |
| Validation | Source full suite passed 156 files / 495 tests with four intended skips and one skipped file; canonical focused Recent Trades tests, TypeScript, production build, dependency audit, and whitespace passed. Source desktop and mobile visual reviews passed. |
| Preserved safeguards | No database record/schema, payment/provider action, schedule, setting, or secret changed. Existing public eligibility, five-second rotation, reduced-motion behavior, and item-detail links are retained. |

## Recent Trades Reference-Matched Layout Pair
| Record | Value |
|---|---|
| Canonical implementation commit | This pairing record, the reference-matched Recent Trades component, focused visual-contract regression update, and matching tracker entry are included together in one normal GitHub `main` commit. No force push or history replacement is used. |
| Paired managed WebDev recovery checkpoint | `43d69954` |
| Scope | Recent Trades now closely matches the supplied compact reference: From → You Gave → green trade-complete badge → You Received → To, with matching desktop arrow placement and a compact existing trade/date/value/verified footer. |
| Validation | Focused Recent Trades tests passed 5/5; complete source non-provider suite passed 151 files / 490 tests with three intended skips. Source TypeScript, production build, dependency audit, whitespace, and desktop/mobile visual checks passed. Canonical focused tests, TypeScript, production build, dependency audit, and whitespace passed. |
| Qualification | A separate source all-tests attempt did not emit a completion summary while external credential probes were in progress; it produced no assertion failure and was not treated as validation. |
| Preserved safeguards | No database record/schema, payment/provider action, schedule, setting, or secret changed. Existing public eligibility, five-second rotation, reduced-motion behavior, and listing links are retained. |

## Synchronization Rules

Before future GitHub-to-WebDev reconciliation, create a recovery checkpoint and an immutable GitHub backup tag. Before a reviewed WebDev change becomes canonical, merge only the relevant content into the current GitHub `main`, preserve any newer canonical work, use a normal commit/push, and record the associated checkpoint. Never force-push or replace the canonical repository wholesale.

## Trade Complete Stamp Asset Pair
| Record | Value |
|---|---|
| Source asset | User-supplied `/home/ubuntu/upload/pasted_file_RLnXkh_image.png`, preserved as `/home/ubuntu/webdev-static-assets/trade-complete-stamp.png` and copied to the project shared-files directory. |
| Durable WebDev URL | `/manus-storage/trade-complete-stamp_e8860371.png` |
| Use | Center completion marker in `RecentTradesCarousel.tsx`; accessible alt text is `Trade complete`; the footer's small generic verification icon remains unchanged. |
| Asset policy | The binary is kept outside the application repository and referenced only through the durable WebDev storage path. |

## Recent Trades Ticket-Style Redesign Pair
| Record | Value |
|---|---|
| Scope | The homepage Recent Trades card now uses a wider scalloped ticket treatment, full non-cropped member avatars, username-first identity labels, stored average ratings, truthful connected-platform/Tradebilia verification badges, dotted separators around the item and completion sections, direct item presentation without item bubbles or You Gave/You Received labels, and the larger supplied Trade Complete stamp. |
| Data contract | The public completed-trade query now returns existing usernames, visible average ratings/review counts, and existing eBay/Facebook/LinkedIn/PayPal/Tradebilia verification flags for both participants. No new schema or records were created. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop/mobile visual checks passed. |
| Preserved behavior | Completed-trade eligibility, truthful item grade/company-or-condition/value data, listing links, and five-second rotation remain intact. No payment, provider, schedule, setting, secret, or database write changed. |

## Recent Trades Ticket Refinement Pair
| Record | Value |
|---|---|
| Scope | The ticket card now uses a subtle green surface matching the completion stamp, a stronger contrasting green footer, functional previous/next arrows, no visible From/To labels, and larger 96–112px item images. |
| Preserved behavior | Username-first member identity, full non-cropped avatars, stored ratings, truthful verification badges, dotted ticket separators, direct item presentation, listing links, completed-trade eligibility, and five-second rotation remain intact. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop/mobile visual checks passed. No database, payment, provider, schedule, setting, or secret changed. |

## Homepage Loading Resilience Pair
| Record | Value |
|---|---|
| Issue | A slow marketplace feed could leave the entire homepage behind a blank loading spinner while other page content was ready to render. |
| Repair | Removed the homepage-wide `marketplaceQuery.isLoading` gate and retained section-level loading behavior, including Recent Trades’ own loading state. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and live desktop preview checks passed. No database, payment, provider, schedule, setting, or secret changed. |

## Recent Trades Transparent Stamp Pair
| Record | Value |
|---|---|
| Issue | The supplied Trade Complete stamp’s original opaque white canvas created a visible rectangle against the ticket’s light-green surface. |
| Repair | Generated a transparent-background derivative from the supplied stamp, uploaded it as `/manus-storage/trade-complete-stamp-transparent_9ec4b748.png`, and updated the component to use it without blend-mode styling. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop visual checks passed. No database, payment, provider, schedule, setting, or secret changed. |

## Recent Trades Mockup-to-Live Pair
| Record | Value |
|---|---|
| Request | Apply the supplied wide Recent Trades visual mockup’s exact ticket format and style to the live homepage section. |
| Implementation | The live card now uses the reference’s shallow ticket structure: full member/avatar-detail panels, ratings and truthful verification rows, dotted dividers, direct larger item presentation, centered transparent Trade Complete mark, distinct footer, arrows, and full main-column width. |
| Reference asset | Standalone mockup retained at `/home/ubuntu/webdev-static-assets/recent-trades-ticket-mockup.png` with reserved URL `/manus-storage/recent-trades-ticket-mockup_2144c0cd.png`; it is not used as production UI. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop/mobile visual checks passed. No data, payment, provider, schedule, setting, or secret changed. |

## Trade Complete Translucent Stamp Pair
| Record | Value |
|---|---|
| Request | Make the white interior areas of the Trade Complete logo translucent so the Recent Trades ticket surface shows through. |
| Asset | `/manus-storage/trade-complete-stamp-translucent_3f4e25b7.png` replaces the prior opaque-interior stamp asset. |
| Implementation | Recent Trades references the durable translucent PNG; its exterior remains transparent and the green stamp artwork/text is preserved. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop visual verification passed. No database, payment, provider, schedule, setting, or secret changed. |

## Below-Hero Homepage Refinement Pair
| Record | Value |
|---|---|
| Scope | Refine the public homepage content below the hero while keeping the hero, top bar, stats strip, and centered Recently Added/Recent Trades headings unchanged. |
| Implementation | Recently Added now uses denser reference-inspired cards with tighter spacing, flatter corners, slightly shorter image areas, and compact typography; existing Recent Trades, ranking panels, data contracts, and interactions remain intact. |
| Baseline | Stable pre-change WebDev checkpoint `1bc26b2a` preserved before implementation; changes are reversible through version history. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop visual verification passed. No database, payment, provider, schedule, setting, or secret changed. |

## Full Reference Treatment Pair
| Record | Value |
|---|---|
| Scope | Apply the supplied reference’s below-hero visual language while leaving the hero, top bar, stats strip, centered headings, and Recent Trades ticket unchanged. |
| Implementation | The public content shell now uses a warm content canvas, a full-height dark navy-to-purple collector-tools rail spanning the public three-row grid, violet rail hover states, and a materially denser Recently Added shelf with 126px/136px/146px responsive cards, 2px gaps, compact typography, flatter corners, and shorter image proportions. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop/mobile visual reviews passed. No database, payment, provider, schedule, setting, or secret changed. |
| Reversibility | Prior stable checkpoint `1bc26b2a` remains available for rollback. |

## Category, Stats, and Carousel Pair
| Record | Value |
|---|---|
| Scope | Match the uploaded reference’s category and stats bars while preserving the existing hero and top bar; improve Recently Added item visibility without changing the Recent Trades ticket. |
| Implementation | Category navigation now uses a compact icon-led dark navy bar with existing routes and active states preserved. Homepage statistics now use a deeper navy-to-purple gradient, brighter separators, compact white metrics, and full comma-formatted values. Recently Added items now use 150px/160px/172px responsive widths with larger image areas and readable metadata while retaining compact shelf density. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop/mobile visual reviews passed. No database, payment, provider, schedule, setting, or secret changed. |
| Protected | Hero, existing top bar, and centered Recently Added/Recent Trades headings remain unchanged. |

## Arrow-Free Recent Trades Pair
| Record | Value |
|---|---|
| Scope | Remove the left and right end controls from Recent Trades; automatic five-second fade rotation is the only navigation method. |
| Implementation | Removed ArrowLeft/ArrowRight imports, manual movement handler, and both end buttons. Preserved automatic interval rotation, fade transition timing, cleanup timers, reduced-motion handling, ticket layout, and item links. |
| Validation | Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop/mobile visual checks passed. |
| Protected | No database, payment, provider, schedule, setting, or secret changed. Hero, top bar, category bar, stats strip, centered headings, and ticket content remain unchanged. |

## 2026-08-29 Recent Trades blue seal and sizing refinement

- Live Recent Trades now references the user-supplied transparent blue seal at `/manus-storage/trade-complete-seal-blue-final_7bd19559.png`.
- Recent Trades item slots and completion seal are larger; the existing five-second fade-only rotation remains.
- Ticket outer edges use a stronger repeated perforation pattern matching the supplied reference.
- No database, payment, provider, schedule, setting, or secret changed.

## 2026-08-29 Recent Trades blue seal and sizing refinement

- Live Recent Trades now references the user-supplied transparent blue seal at `/manus-storage/trade-complete-seal-blue-final_7bd19559.png`.
- Recent Trades item slots and completion seal are larger; the existing five-second fade-only rotation remains.
- Ticket outer edges use a stronger repeated perforation pattern matching the supplied reference.
- No database, payment, provider, schedule, setting, or secret changed.

## 2026-08-29 Recent Trades blue-only readability refinement

- Recent Trades now uses blue-only UI colors with no green UI accents; the user-supplied transparent seal remains blue.
- Member avatars, usernames, ratings, verification rows, item imagery, metadata, and completion mark are larger. Recently Added restores the earlier 150px/160px/172px responsive item sizing.
- Automatic five-second fade-only rotation and reduced-motion handling remain unchanged; hero, top bar, category bar, stats strip, and other homepage areas remain unchanged.
- No database, payment, provider, schedule, setting, or secret changed.

## Final Recent Trades readability correction

The final card correction uses canonical display-name priority, aligned directional arrows, blue image surfaces, larger readable item imagery, the true-alpha high-resolution blue Trade Complete seal, and blue ticket outlines over repeated perforations. Member columns preserve full names, item details stack below their images, and the existing automatic five-second fade rotation and reduced-motion handling remain unchanged. No hero, top-bar, database, payment, provider, schedule, or secret changes were made.

## 2026-08-29 Recent Trades reference cleanup follow-up
- Removed the unrequested blue backing behind item images in both Recent Trades and Recently Added; image surfaces now inherit their intended light canvas/background.
- Kept item titles and metadata to the right of images on desktop, rebalanced member panels, and retained simple aligned directional arrows with truthful canonical display names.
- Refined ticket ends with repeated frayed/perforation cut-ins and a continuous blue outline over the outer edge.
- Preserved the high-resolution true-alpha blue Trade Complete seal, five-second fade-only rotation, reduced-motion behavior, locked hero/top bar, and all marketplace data.
- Focused homepage and movement tests passed 3/3; TypeScript, production build, dependency audit, whitespace, and desktop/mobile visual checks passed. No database, payment, provider, schedule, setting, or secret changed.

## Approved External Cash-Adjustment Workflow Pair

| Record | Value |
|---|---|
| Managed WebDev checkpoint | `dac254de` |
| Canonical implementation commit | `cfe38ff68809337c36208dce16fdcb0bc9b13ee9` — normal credential-safe push to GitHub `main`; no force push or history replacement. |
| Scope | Added private PayPal email, Venmo username, Cash App $cashtag, and one Zelle email or U.S. mobile destination to Account Setup and Account Settings. Accepted cash trades require payee method selection before disclosure to the payer, then payer Sent and payee Received confirmations. |
| Privacy and safeguards | Payment identifiers remain private from public profiles and ordinary Trade Room details. Only the payer sees the payee’s one selected destination after acceptance. Destination changes reset only pre-send terms and are blocked after Sent. Shipping is blocked until member-confirmed receipt; a dispute also blocks shipping for administrator review. |
| Administrator handling | Admin Billing displays masked cash-adjustment records. A phrase-confirmed identifier reveal is limited to active dispute review and is written to the trade activity log. |
| Data change | Reviewed additive custom TiDB columns/enums and cash-adjustment activity events only. No marketplace, listing, existing trade, membership, subscription, provider account, schedule, or secret was changed. |
| Validation | Focused external cash-adjustment, review-before-shipping, and category-navigation tests passed 10/10; TypeScript, production build, production dependency audit, whitespace, and database startup health passed. Credential-dependent UPS, Daily, and IPQS probes in a broader suite remain outside this feature validation. |
| Payment boundary | Tradebilia does not initiate, process, hold, insure, refund, or guarantee PayPal, Venmo, Cash App, or Zelle transfers. The Trade Room and Account Setup include this disclosure. |

## Global Member Avatar Treatment Pair

| Record | Value |
|---|---|
| Managed WebDev checkpoint | `f2e4aef2` |
| Canonical implementation commit | `5ef820e94c1fa5b42e791635ff7a7e0428db0ed1` — normal credential-safe push to GitHub `main`; no force push or history replacement. |
| Scope | Standardized all member-avatar renderers to use a blurred enlarged copy of the same source image behind a sharp, frame-filling foreground. The shared Avatar primitive now updates nine consumer files, and bespoke paths in Public Profile, Verified Merchants, Traders Showcase, and every Trade Room context use the same treatment. |
| Accessibility and safety | The decorative background is hidden from assistive technologies; the foreground retains meaningful alt text; no-photo fallbacks remain intact; image-error backgrounds hide safely. Listing media, provider logos, category graphics, and other non-avatar images are excluded. |
| Validation | Focused avatar, homepage, and responsive-layout regressions passed 15/15; TypeScript, production build, production dependency audit, source-diff whitespace check, and desktop/mobile representative visual reviews passed. |

## Owner-Safe Proposals and Category Card Refinement Pair

| Record | Value |
|---|---|
| Managed WebDev checkpoint | `9daa4122` |
| Canonical implementation commit | `746c114fe98e97bb887dbe56ee4c7e40e1208419` — normal credential-safe push to GitHub `main`; no force push or history replacement. |
| Scope | Category and Item Detail owners cannot initiate a trade proposal or message themselves. Both trade-proposal entry points now collect a personalized message rather than submitting a default sentence. Category cards display a larger grade/condition value and use Trader Rating terminology. |
| Safeguards | Server-side trade and direct-message self-action guards remain authoritative. Personalized messages are trimmed, limited to 1,000 characters, reset when the dialog closes, and required before submission. No data model, payment, provider, schedule, setting, or secret changed. |
| Validation | Focused listing-interaction and category tests, TypeScript, production build, production dependency audit, source-diff whitespace, and desktop/mobile category-card visual checks passed. |

## Explore All Parity and Truthful Carousel Metadata Pair

| Record | Value |
|---|---|
| Managed WebDev checkpoint | `7d3aa2b0` |
| Canonical implementation commit | `129c68e13bddc97ee2beea3eab14bbe7dba12157` — normal credential-safe push to GitHub `main`; no force push or history replacement. |
| Scope | Explore All receives the same owner-safe Trade control, required personalized proposal message, larger grade value, and Trader Rating wording as category pages. Category and Explore All gray-panel labels have stronger contrast. Recently Added displays a custom grading-company name in place of Other when stored and shows a Condition badge for ungraded items. |
| Data safety | The formatter exposes only the saved `customGradingCompany` value from structured item details; no fields are fabricated, and card values, existing listing navigation, and card height remain intact. |
| Validation | Focused Explore All, homepage, category-card, and listing-interaction tests, TypeScript, production build, dependency audit, changed-file whitespace, and desktop/mobile visual checks passed. |

## Simplified Ungraded Carousel Badge Pair

| Record | Value |
|---|---|
| Managed WebDev checkpoint | `d37d00bc` |
| Canonical implementation commit | `de5c8ef934178370d9b9d124bc6245f19161701a` — normal credential-safe push to GitHub `main`; no force push or history replacement. |
| Scope | Recently Added keeps category-colored metadata badges but removes the redundant Condition prefix for ungraded listings. The badge now presents only the stored condition value, such as Near Mint. |
| Data safety | Graded-item company and grade display, custom-company fallback, values, imagery, and card-height contract remain unchanged. No listing data, database schema, payment, provider, schedule, setting, or secret changed. |
| Validation | Focused homepage regression, TypeScript, production build, dependency audit, changed-file whitespace, and full homepage visual check passed. |

## Cross-Page Listing Actions Pair

| Record | Value |
|---|---|
| Managed WebDev checkpoint | `c2258544` |
| Canonical implementation commit | `3e3b52cb2475a83f049b77cbd9cf26fccb3f18fc` — normal credential-safe push to GitHub `main`; no force push or history replacement. |
| Scope | Explore All listing cards now include the same heart favorite action as category cards, and Category trade actions now show the Trade label alongside the icon so both pages use familiar, consistent controls. |
| Safeguards | Existing login redirect and optimistic watchlist refresh behavior are preserved; members cannot favorite their own listings, and existing self-trade restrictions remain intact. |
| Validation | Focused listing interaction and global search tests, TypeScript, production build, dependency audit, changed-file whitespace, and desktop/mobile Category and Explore All visual checks passed. |

## Profile Payment Destination Presentation Pair

| Record | Value |
|---|---|
| Managed WebDev checkpoint | `a4fd3923` |
| Canonical implementation commit | Recorded after the normal, credential-safe GitHub push that accompanies this manifest update. |
| Scope | Profile integrations presents one private Zelle destination field that accepts either an email address or U.S. mobile number, and labels PayPal, Venmo, Cash App, and Zelle destinations with the supplied official provider assets. |
| Data safety | The one Zelle field maps to the existing mutually exclusive protected email-or-phone server contract. Stored values, validation, privacy scope, direct-payment disclosure, and cash-trade safeguards remain unchanged. |
| Validation | Focused external-cash safeguards test, TypeScript, production build, dependency audit, changed-file whitespace, and source-level form review passed. |
