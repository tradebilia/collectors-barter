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
