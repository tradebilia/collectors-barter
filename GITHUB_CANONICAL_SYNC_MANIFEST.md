# Tradebilia Canonical GitHub Synchronization Manifest

**Status:** GitHub `main` is the canonical Tradebilia code history. Managed WebDev checkpoints remain the separate recovery history for the deployed project; they must not be force-pushed or used to overwrite newer GitHub commits.

## Verified Stripe Sandbox Checkout Pair

| Record | Value |
|---|---|
| Canonical repository | `tradebilia/collectors-barter` on `main` |
| Canonical sandbox implementation commit | `0d45ce25d94bec3c222da929fb57832e0730442b` |
| Paired managed WebDev checkpoint | `ca726dc7` |
| Runtime membership schema | Read-only audit confirmed the complete mixed-case custom TiDB membership foundation, including `userMemberships` and `membershipProviderEvents`; no migration or data repair was required. |
| Sandbox subscription audit | The completed administrator monthly sandbox Checkout persisted an active monthly membership record with Stripe customer/subscription references and processed provider events. Sensitive identifiers are intentionally not copied into this manifest. |
| Marketplace baseline | 3 members, 16 active listings, and $147,530 active listing value before and after audit. |
| Free Launch safeguards | `billingMode=free_launch`, `stripeBillingEnabled=0`, and `paymentEnforcementEnabled=0`. |
| Payment boundary | Administrator-only Stripe sandbox controls are present. No live payment, fee enforcement, member restriction, or external notification was enabled. |

## Synchronization Rules

Before future GitHub-to-WebDev reconciliation, create a recovery checkpoint and an immutable GitHub backup tag. Before a reviewed WebDev change becomes canonical, merge only the relevant content into the current GitHub `main`, preserve any newer canonical work, use a normal commit/push, and record the associated checkpoint. Never force-push or replace the canonical repository wholesale.
