# Tradebilia Canonical GitHub Synchronization Manifest

**Status:** GitHub `main` is the canonical Tradebilia code history. Managed WebDev checkpoints remain the separate recovery history for the deployed project; they must not be force-pushed or used to overwrite newer GitHub commits.

## Verified Stripe Sandbox Checkout Pair

| Record | Value |
|---|---|
| Canonical repository | `tradebilia/collectors-barter` on `main` |
| Canonical sandbox implementation commit | `0d45ce25d94bec3c222da929fb57832e0730442b` |
| Paired managed WebDev checkpoint | `ca726dc7` |
| Sandbox period mapping correction | Canonical commit `48003d5802ae1662465e9f8aa999eda37a07d9de`; managed checkpoint `82c76148`. |
| Same-tab Checkout and duplicate guard | Canonical commit `d87a453bf9de22bbff6cc837dd5ffc4906044ba1`; managed checkpoint `12f56cb8`. |
| Runtime membership schema | Read-only audit confirmed the complete mixed-case custom TiDB membership foundation, including `userMemberships` and `membershipProviderEvents`; no migration or data repair was required. |
| Sandbox subscription audit | The completed administrator monthly sandbox Checkout persisted an active monthly membership record with Stripe customer/subscription references and processed provider events. Sensitive identifiers are intentionally not copied into this manifest. |
| Marketplace baseline | 3 members, 16 active listings, and $147,530 active listing value before and after audit. |
| Free Launch safeguards | `billingMode=free_launch`, `stripeBillingEnabled=0`, and `paymentEnforcementEnabled=0`. |
| Payment boundary | Administrator-only Stripe sandbox controls are present. No live payment, fee enforcement, member restriction, or external notification was enabled. |

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

## Synchronization Rules

Before future GitHub-to-WebDev reconciliation, create a recovery checkpoint and an immutable GitHub backup tag. Before a reviewed WebDev change becomes canonical, merge only the relevant content into the current GitHub `main`, preserve any newer canonical work, use a normal commit/push, and record the associated checkpoint. Never force-push or replace the canonical repository wholesale.
