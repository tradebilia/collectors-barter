# Schema-drift repair handoff — October 27, 2026

## Scope approved by Rich

Repair the verified application/live-schema mismatches on the active new TiDB `test` database using additive, data-preserving changes only:

- add `music` to `conventionCategories.category`;
- expand `tradePayments.paymentMethod` to `paypal`, `venmo`, `cash_app`, and `zelle`;
- add `disputed` to `tradeProposals.status`;
- restore the expanded forum post/reply fields used by active moderation and reply paths;
- restore `forumReports`, `forumFollows`, and `forumNotifications` tables used by active forum paths.

The fresh live preflight confirmed that the application’s logical `payerId` and `payeeId` already map to the live physical columns `payerUserId` and `payeeUserId`, and `tradePayments.status` already includes `disputed`. It also confirmed that `conventionCategories.category` still lacked `music`, so that enum alteration remained in scope. Existing payment rows must remain unchanged.

## Artifact

`drizzle/0026_p0_schema_drift_repair.sql` contains the approved additive SQL. It contains no `DROP TABLE`, `DELETE`, `TRUNCATE`, or data-reset operation.

## Live-application status

The repair is **applied and verified** on the active application target `new` / database `test`. No selector, credential, writer, domain, or data setting was changed.

At approximately 19:56–19:57 ET on October 27, 2026, seven approved additive statements were applied through the runtime-attested connection, followed by the missing Music enum alteration. The attestation reported target `new`, database `test`, and sanitized connection fingerprint `d37760f59db4`. No row data was deleted or rewritten: `tradePayments` remained at 3 rows, `tradeProposals` at 6, and `forumReplies` at 37; the three newly created forum tables each started at 0 rows.

Final read-only verification confirmed the complete enum contracts, all six added forum post/reply columns, and the new `forumReports`, `forumFollows`, and `forumNotifications` tables. The live `__drizzle_migrations` ledger was not rewritten because it is known to be incomplete; migration-ledger reconciliation remains a separate controlled reliability task. Do not run ordinary blind migration replay against this database.

## Resume procedure

1. Retain the attested live-schema output and row-count evidence above.
2. Run the final focused/full validation gates and preview smoke checks.
3. Save a reversible WebDev checkpoint and update the canonical handoff/GitHub synchronization records.
