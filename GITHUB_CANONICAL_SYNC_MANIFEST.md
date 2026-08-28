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

## Synchronization Rules

Before future GitHub-to-WebDev reconciliation, create a recovery checkpoint and an immutable GitHub backup tag. Before a reviewed WebDev change becomes canonical, merge only the relevant content into the current GitHub `main`, preserve any newer canonical work, use a normal commit/push, and record the associated checkpoint. Never force-push or replace the canonical repository wholesale.
