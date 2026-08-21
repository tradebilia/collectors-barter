# Third-Pass Reliability Audit — 2026-08-21

## Purpose and outcome

This third independent reliability pass reviewed Tradebilia after the second-pass privacy, authorization, route, verification, cache-action, and pre-launch operational repairs. Eight functional areas were examined independently and each reported candidate was then re-checked against the current source before any change was made. The review found no remaining P0 issue. It identified three additional unauthorized trade procedures, one atomicity defect in draft deletion, and two provider-resilience inconsistencies. All six confirmed, safe defects were repaired in this release.

| Result | Count | Meaning |
|---|---:|---|
| Repaired in this release | 6 | Confirmed defects with a safe code-only correction and regression coverage. |
| Already repaired or refuted | 5 | Audit candidates that were stale, did not reproduce in current code, or were protected by an existing control. |
| Deferred design or policy work | 4 | Valid follow-up topics that require a schema migration, retention rule, or explicit account-lifecycle decision. |
| P0 defects remaining | 0 | No confirmed critical privacy or authorization issue remains from this pass. |

## Repairs completed

### Earlier second-pass remediation validated in this release

The earlier fixes remain present and covered. Public profile retrieval now uses a narrow public projection and a server-calculated online boolean instead of returning email addresses or raw activity timestamps. Inquiry-reply retrieval requires the caller to be a sender or recipient, and only a participant may file a trade complaint. Broken authentication return links now use the supported login entry point, the local-only account-setup email-verification bypass was removed, and the market-data cache-clear action is administrator-only and reports its actual availability.

Pre-launch recipient enrollment remains bounded to five concurrent Resend membership calls. Recipient-list failures now create only sanitized API Health telemetry; they do not expose provider credentials, recipient data, or raw provider payloads.

### New third-pass repairs

| Severity | Confirmed issue | Repair | Regression coverage |
|---|---|---|---|
| P1 | A signed-in nonparticipant could request counterpart inventory for a known trade ID. | `getOtherUserInventory` now loads the proposal and rejects anyone who is neither participant. | `server/thirdPassReliabilityRepairs.test.ts` verifies the gate. |
| P2 | A nonparticipant could change a middleman workflow state for a known trade ID. | `middleManService` now rejects nonparticipants before any trade update. | `server/thirdPassReliabilityRepairs.test.ts` verifies the gate. |
| P2 | A nonparticipant could create a community voting link for a known trade ID. | `generateVotingLink` now rejects nonparticipants before creating a link. | `server/thirdPassReliabilityRepairs.test.ts` verifies the gate. |
| P2 | Draft deletion removed the parent before its photo records and did not use a transaction. | `deleteDraft` now deletes associated photo rows first inside a database transaction, then deletes the parent draft. | `server/thirdPassReliabilityRepairs.test.ts` verifies transaction use and safe order. |
| P2 | The reachable market-data layer cached custom-duration data but considered every result stale after one hour. | Cache freshness now uses the requested `cacheMaxAgeMinutes`, matching the value used when the cache entry is written. | `server/thirdPassReliabilityRepairs.test.ts` verifies the requested-duration contract. |
| P2 | The reachable eBay acquisition path declared timeout and retry settings but did not apply them. | Both eBay request paths now use a bounded helper with a 30-second timeout, three attempts, and retry only for transient HTTP failures or request exceptions. | `server/thirdPassReliabilityRepairs.test.ts` executes a 503-to-200 retry scenario. |

## Findings re-checked and not treated as new defects

The independent review initially reported public-profile email exposure, inquiry-reply access, trade-complaint access, a missing `/signin` route, and a local account-setup email bypass. Direct source inspection confirmed that the first three were already corrected by the second-pass changes. The password pages no longer navigate to `/signin`; they use the supported login entry point. The active Account Setup email-verification control invokes the server-side verification mutation, so the historic local-only bypass is absent.

The report also raised concerns about mobile filtering, role checks, and public support tickets. The mobile sidebars are already replaced by mobile-only filter drawers without changing desktop layouts. Administrative report procedures enforce an administrator role check, and public support-ticket submission is intentional while ticket management remains administrator-only.

## Deferred decisions and non-destructive follow-up work

| Topic | Why it remains deferred | Required decision before implementation |
|---|---|---|
| Session revocation after password change or recovery | Existing sessions use stateless signed credentials. Immediately invalidating all existing sessions requires a session-version or server-side session record design. | Confirm whether every password change should sign out all devices, and approve the required data-model change. |
| Dedicated draft-photo storage | `listingPhotos.listingId` formally references active `listings.id`, while draft workflows currently reuse the photo table. A robust fix needs a dedicated draft-photo relation or an approved schema redesign. | Approve a non-destructive schema migration and migration plan; no migration was run in this release. |
| Report-evidence retention and cleanup | Private evidence is correctly isolated from public R2 storage, but automatic cleanup after dismissal or expiry needs a legal and moderation retention policy. | Define retention duration, dismissal behavior, and deletion/audit requirements before scheduled cleanup is introduced. |
| Owner-notification fallback and retry policy | Provider failures are classified safely in API Health. Retrying or escalating owner alerts changes notification volume and must have a delivery policy. | Define retry count, delay, escalation channel, and duplicate-suppression policy. |

The earlier deferred policy decisions also remain unchanged: per-user message and inquiry deletion, account closure handling, email retry behavior, and rich-draft data-model expansion require explicit product decisions. No migration, seed script, destructive action, or database write was performed for this audit work.

## Validation record

All post-repair code was validated locally with TypeScript checking, focused regression suites, the complete Vitest suite, a production build, and whitespace validation.

| Check | Result |
|---|---|
| Focused third-pass tests | 4 passing, including an executed transient eBay retry. |
| Second- and third-pass focused security/reliability tests | 16 passing. |
| Full regression suite | 363 passing, 4 skipped, across 114 test files. |
| TypeScript | Passed with `pnpm check`. |
| Production build | Passed with `pnpm build`. |
| Diff whitespace check | Passed with `git diff --check`. |

The production build continues to emit a pre-existing large-client-chunk advisory. It does not fail the build and is a performance optimization opportunity rather than a functional or security defect.

## Files changed by this remediation set

The core repairs are in `server/routers.ts`, `server/db.ts`, `server/tradeFlowRouter.ts`, `server/preLaunchEmail.ts`, `server/_core/marketDataRouter.ts`, `server/_core/marketDataOrchestrator.ts`, and `server/_core/ebayDataAcquisition.ts`. The route and account-setup corrections are in `client/src/pages/PublicProfile.tsx`, `Home.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, and `AccountSetup.tsx`. Regression coverage is in `server/secondPassP0Security.test.ts`, `server/secondPassP1Reliability.test.ts`, `server/preLaunchEmail.test.ts`, and `server/thirdPassReliabilityRepairs.test.ts`.
