# Project TODO

- [x] Clone `tradebilia/collectors-barter` into `/home/ubuntu/tradebilia-clone` and install locked dependencies.
- [x] Configure `CUSTOM_DATABASE_URL` only through secure project secret settings and set `TRADEBILIA_STAGING_MODE=1`.
- [x] Validate the shared database with read-only count queries before any write-capable activity.
- [x] Replace the currently incorrect secure database connection through project settings and repeat the read-only baseline validation.
- [x] Inspect `sendInquiryReply` and the existing test architecture for the sender-alert defect.
- [x] Correct inquiry unread-state behavior so only the reply recipient is alerted.
- [x] Add a focused Vitest regression test for sender and recipient unread-state handling.
- [x] Update the production inquiry unread-alert query to use participant-specific read state and verify the full reply-to-alert path.
- [x] Run applicable Vitest tests and TypeScript checks, targeting the established 91/91 baseline.
- [x] Document that credential-dependent and non-staging integration checks were intentionally not run because `TRADEBILIA_STAGING_MODE=1` and external credentials are absent in this approved isolated environment.
- [x] Review the commit for credentials and prohibited files, then push only the fix and regression test to `main`.
- [x] Report database-write status, validation counts, test results, and the pushed commit.
- [x] Replace the isolated WebDev scaffold with the committed Tradebilia repository application while excluding credentials, Git metadata, dependencies, migrations, and seed scripts.
- [x] Restart and verify that the temporary development homepage renders the real Tradebilia application without publishing or attaching a production domain.
- [x] Map the supplied hero background files to the homepage and category hero sections with broken links.
- [x] Upload the supplied hero assets to durable project storage and replace broken image/title references.
- [x] Verify the corrected homepage and affected category heroes in the deployed development site.
