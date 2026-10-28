# Schema index reconciliation handoff — October 27, 2026

## Audit result

A second all-table comparison was run against the runtime-attested `new` / `test` TiDB database after migration 0027. All 66 application tables exist. After the direct-message repair, no code-required columns are missing and no code-required enum values are missing. The only extra live table is the expected `__drizzle_migrations` ledger. Extra legacy columns remain in `tradePayments`, `tradeProposals`, `userReports`, and `users`; they are not missing-code defects and were not removed.

The comparison found 106 declared index entries whose column signatures were absent from the live database. One was a duplicate `(userId)` signature declared twice on `userRatingSummary`, so the repair required 105 distinct additive index signatures. This was schema/index drift and a performance/scaling risk, not a data-loss failure.

## Important distinction

Do not treat the original 106 entries as 106 independent application bugs. Index creation is a live DDL operation that can consume resources and affect table availability. Migration `0028_p0_secondary_index_reconciliation.sql` applied the 105 distinct missing signatures idempotently to `new/test`; one duplicate signature was skipped because the equivalent index was already present. Do not run blind Drizzle replay because the live migration ledger is incomplete.

## Recommended order

1. `listings`, `forumPosts`, `forumReplies`, `itemInquiries`, and `inquiryReplies` because they support high-frequency browsing, search, and communications.
2. `tradeProposals`, `tradeProposalItems`, `tradeActivityLog`, `tradeAlerts`, `tradeMessages`, `tradePayments`, and tracking tables because they support active trade workflows.
3. Authentication, referrals, moderation, membership, and archival tables.
4. Remove or formally document any indexes that are intentionally obsolete only after query-plan evidence and code review.

Each batch should use a read-only preflight, verify no equivalent index already exists by column signature, apply only additive indexes, record timing/errors, and repeat `EXPLAIN` plus route smoke tests afterward.

## Current status

- Direct-message item linkage repair: applied and verified in migration `0027_p0_direct_message_item_link.sql`.
- Broad index reconciliation: applied as 105 distinct additive indexes through migration 0028; one duplicate signature was skipped.
- Migration ledger: intentionally not rewritten.
- Credentials, selectors, scheduled writers, domains, and application data: unchanged.
