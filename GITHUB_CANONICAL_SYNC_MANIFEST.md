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
| Canonical GitHub main validated for this reconciliation | `85f82901dbf854b091a3d1e426cbea60fa850b8b` |
| Managed WebDev reconciliation recovery checkpoint | `85605dc2` |

## Purpose and Recovery Rules

The external GitHub repository is the authoritative history for future Tradebilia code changes. The managed WebDev project retains independent checkpoint history for deployment recovery and must not be force-pushed into GitHub or used to overwrite newer GitHub work.

Before a future GitHub-to-WebDev reconciliation, create a fresh WebDev checkpoint and an immutable GitHub backup tag. Before a future WebDev change becomes canonical, commit and push the reviewed change to GitHub first, then apply the equivalent reviewed content to WebDev and checkpoint it. Record any new canonical baseline tag and paired recovery checkpoint in this document.

## Compatibility Boundary

The canonical GitHub repository contains a future membership foundation that relies on membership schema tables and migrations. Those tables are not part of the currently restored Tradebilia runtime schema. Therefore the following GitHub paths remain **migration-gated** and must not be imported into the live WebDev runtime until a separate explicit database-migration approval is granted:

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

No migration, seed, schema push, destructive action, or database write is authorized by this manifest. The restored custom TiDB data remains the runtime data source.

## Verified Compatible Baseline Content

The Member Directory title-artwork adjustment, its regression test, and the future membership/billing/verification planning document are present and identical in both repositories at this baseline.
