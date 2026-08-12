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
- [ ] Run the credential-dependent and non-staging integration checks only in a separately authorized environment; they are intentionally blocked here by `TRADEBILIA_STAGING_MODE=1` and absent external credentials.
- [x] Review the commit for credentials and prohibited files, then push only the fix and regression test to `main`.
- [ ] Report database-write status, validation counts, test results, and the pushed commit.
