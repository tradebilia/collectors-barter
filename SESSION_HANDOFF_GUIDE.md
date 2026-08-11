# Tradebilia Master Session Handoff Guide

> **Handoff status:** Feature work is paused. A new session must complete the acceptance checklist in this guide and obtain Rich’s approval before changing functionality.

This document is the single source of truth for continuing the **Tradebilia** project in a new session. It intentionally records credential **names, owners, status, and restoration instructions**, but it never contains a raw API key, password, or database connection string. Secrets belong in the project’s secure Secrets configuration, not GitHub.

| Project record | Current value |
|---|---|
| GitHub source of truth | [`tradebilia/collectors-barter`](https://github.com/tradebilia/collectors-barter) |
| Production site | [tradebilia.manus.space](https://tradebilia.manus.space) |
| Latest asset-repair checkpoint | `8ad4c8c5` |
| Static-asset recovery release | [`tradebilia-static-assets-2026-08-11`](https://github.com/tradebilia/collectors-barter/releases/tag/tradebilia-static-assets-2026-08-11) |
| Feature-work status | **Blocked pending new-session acceptance and Rich’s explicit approval** |

## 1. Non-Negotiable First Rule

Do **not** start CGC work, Test AI changes, production AI Analyzer work, merchant enhancements, or unrelated bug fixes until every acceptance check in Section 8 is complete and Rich explicitly confirms that the new session is correctly set up. The only permitted work before that confirmation is restoring, testing, documenting, and correcting the handoff itself.

## 2. What Persists—and What Does Not

Tradebilia deliberately uses more than one storage boundary. Treating them as interchangeable caused prior handoff confusion.

| Boundary | What belongs there | What persists | New-session instruction |
|---|---|---|---|
| **GitHub repository** | Source code, schema, tests, documentation, release-backed static recovery archive | Yes | Clone `main`, verify a clean working tree, and push every approved code change to `github/main`. |
| **Project object storage** (`/manus-storage/...`) | Static design assets, listing photographs, user avatars, uploaded files | Project-scoped; not part of Git history | Keep runtime paths in object storage. Do **not** put live user images into GitHub. |
| **External CUSTOM database** | Live users, profiles, listings, messages, trades, merchant status, photo/asset URLs | Yes, if reconnecting to the intended database | Restore the correct `CUSTOM_DATABASE_URL` securely before use. Confirm it targets the intended production/staging database. |
| **Manus-managed database** | Template/platform database only unless deliberately used | Not the live Tradebilia dataset | Do not mistake it for the external live database. Do not run a live-data migration against it. |
| **Sandbox runtime** | `node_modules`, dev-server state, logs, `/tmp`, browser state, downloaded local copies | No guarantee | Reinstall dependencies, reauthenticate as required, and regenerate local-only artifacts. |
| **Secrets configuration** | API keys, OAuth secrets, database credentials | Must be re-established/verified securely | Use the secure project Secrets flow; never add literal values to Markdown, source, commits, issues, or chat logs. |

The server mounts a project storage proxy before tRPC and Vite handling, so `/manus-storage/...` paths are served through the application runtime rather than from the repository. Database-backed listing and avatar URLs therefore must remain in object storage and in the external database’s metadata.

## 3. Asset Strategy and Recovery Plan

### Current operating model

The application has **46 active static `/manus-storage` references**. All 46 were retrieved, archived, and attached to the GitHub recovery release above.

| Recovery artifact | Verified value |
|---|---|
| Release asset | `tradebilia-static-assets-2026-08-11.tar.gz` |
| SHA-256 | `182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c` |
| Release contents | 46 current static design assets, retained by their original source filenames |
| Deliberately excluded | Database-backed listing photographs, member avatars, and other user-generated media |

The checksum, filename, and release link are the integrity controls; consult the release page for the displayed archive size.

### Why the archive is a backup, not a new runtime CDN

Static design files can be recovered from the GitHub release if project storage is unavailable. Runtime URLs should remain `/manus-storage/...` because the application’s project storage is designed for serving assets and because user-uploaded content must not be checked into source control. GitHub is a durable code and recovery record, not a database or customer-media store.

### Known repaired asset faults

Nine prior static source objects returned `403`. They are no longer referenced by executable code. Five ranking-page title images and the home page’s wheel image were replaced with inline SVG rendering; stale long-logo paths were redirected to a verified current Tradebilia title asset. Home and all four ranking hero variants were visually checked after the repair.

If a static asset breaks in a new session, download the recovery archive, verify its checksum, re-upload only the affected static asset through project storage, update the corresponding path in source, run the tests and visual checks, and checkpoint. Never replace a customer listing or avatar from the archive because those items were intentionally excluded.

## 4. Database: Live Data and Safe Reconnection

Tradebilia’s live data is stored in an **external MySQL/TiDB-compatible database** selected through `CUSTOM_DATABASE_URL`. It contains real users, listings, profile records, messages, trades, and media URLs. The Manus-managed `DATABASE_URL` is not a substitute for that live data source.

| Requirement | Safe rule |
|---|---|
| Connection target | Obtain the intended `CUSTOM_DATABASE_URL` from Rich or the database provider through a secure channel. Do not copy it into this guide. |
| Connection format | `mysql://<user>:<password>@<host>:<port>/<database>?ssl=<provider settings>` |
| Before writes or migrations | Confirm environment, host, database name, backup status, and intended schema change. |
| Schema source | `drizzle/schema.ts` is the code contract. |
| Live schema changes | Generate and review SQL first. Apply only after confirming that the executor targets the **external** database, not the Manus-managed one. |
| Data recovery | The external database provider’s backups are the recovery mechanism. Local sandbox files are not backups. |

At handoff time, known live data includes marketplace listings across all 10 categories and a pending merchant `rtavani` / “Crazy Al’s Comics.” Do not assume sample counts remain fixed; use them only as a sanity check after reconnecting.

## 5. Credential Registry — Names, Status, and Restoration

The following table consolidates every credential family used or configured in the project. **Raw values are intentionally omitted.** Restore values using the secure project Secrets interface or the relevant provider console.

| Environment variable(s) | Owner / source | Current purpose | Status / next-session handling |
|---|---|---|---|
| `CUSTOM_DATABASE_URL` | Rich / external database provider | Connects the server to real Tradebilia data | **Critical.** Confirm the host and database before use. The new session may require a new value. |
| `EBAY_PROD_CLIENT_ID`, `EBAY_PROD_CLIENT_SECRET` | eBay Developer account | Production eBay OAuth and Browse API | Restore if eBay functionality is being tested. Verify the configured HTTPS callback URLs before changing OAuth. |
| `SOLD_COMPS_API_KEY` | Sold-Comps account | Historical sold-comps data in Test AI | Working during this session. Restore securely; rotate before production if desired. |
| `PARSE_BOT_API_KEY` | Parse.bot account | PSA and Beckett data in Test AI | Working during this session. UI labels are **Parse.bot (PSA Data)** and **Parse.bot (Beckett Data)**. |
| `PSA_API_TOKEN` | PSA account | Direct PSA API, when approved | Not currently validated. Do not replace Parse.bot data flow with it until independently tested. |
| `PCGS_API_TOKEN`, `GO_COLLECT_API_KEY` | Respective providers | Future collection-data integrations | Treat as future/conditional. Do not begin implementation before handoff approval. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Twilio Console / Verify service | Mandatory SMS phone verification in account setup | Working in this session. Restore the matching three values together and test a real verification in a safe account flow. |
| `TRADEBILIA_OPENAI_API_KEY` | Rich’s AI provider account | Trade-analysis integration | Current Test AI and analyzer credential. Do not change production AI Analyzer logic until Rich confirms Test AI validation is complete. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` | PayPal developer account | PayPal connection / payment configuration | Restore only when PayPal features are tested. Code supports legacy `PAYPAL_MODE` fallback. |
| `RESEND_API_KEY` | Resend account | Email notification delivery | Restore before email tests. The shared Tradebilia logo header is required for all notification emails. |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI` | Facebook developer account | Facebook connection/OAuth | Conditional. Verify redirect URL exactly before enabling. |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | LinkedIn developer account | LinkedIn connection/OAuth | Conditional. Verify redirect URL exactly before enabling. |
| `DAILY_API_KEY` | Daily.co account | Video-chat integration | Restore only if that flow is being exercised. |
| `ENCRYPTION_KEY`, `JWT_SECRET` | Project security configuration | OAuth token encryption and session signing | **Critical.** Never replace casually; rotating can invalidate encrypted tokens or active sessions. |
| `BUILT_IN_FORGE_API_KEY`, `BUILT_IN_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL` | Platform-provided | Forge/LLM/storage platform integration | Provided by the project platform; do not hardcode. |
| `DATABASE_URL`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `VITE_OAUTH_PORTAL_URL`, `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | Platform/project configuration | Framework OAuth, database, and analytics plumbing | Platform-managed unless a session setup explicitly requires an update. |

### Security note

An early draft credential reference was removed before the final GitHub handoff push. A direct audit confirmed that file did **not** exist in `github/main`. As a prudent measure, rotate the Twilio Auth Token, Sold-Comps key, Parse.bot key, and any other credential that was ever placed in a temporary draft before production launch. Do not commit secret values—even to a private repository—because Git history is difficult to purge reliably.

## 6. Current Functional Status

| Area | Status at handoff |
|---|---|
| Category marketplace | Fixed. All 10 category pages render after compacting tRPC filter input to prevent GET-to-POST fallback. |
| Merchant verification | Complete: admin verify/revoke, public badges, directory, and instant category filter chip. No merchant is yet verified, so the chip correctly yields no listings until an admin approves one. |
| Account setup | Complete: final-submit-only profile creation and mandatory Twilio Verify phone step. |
| Test AI sandbox | Test-only: eBay, Sold-Comps, Parse.bot PSA, Parse.bot Beckett, and grading-company certificate routing are implemented. Do not port logic to the production Trade Room AI Analyzer without Rich’s explicit approval. |
| Messages | Hero title and reply display name are fixed. **Open defect:** the replier receives an unread alert for their own inquiry reply. It is documented in `todo.md` and must stay paused until handoff approval. |
| Static asset resilience | Repaired and backed up as described in Section 3. |

## 7. Important Technical Rules

1. Use `pnpm` and run the established test suite before and after any change.
2. Run `npx tsc --noEmit` after TypeScript changes.
3. Create or update a Vitest test for every behavior change; screenshots are supplemental, not a substitute.
4. Update `todo.md` before coding new requested work, and mark work complete immediately after verification.
5. Create a checkpoint before final delivery. Auto-publish is enabled, so each checkpoint is live.
6. Push the same verified commit to `github/main`; compare local `HEAD` with `github/main` afterward.
7. Do not seed fake reviews, ratings, testimonials, or customer data.
8. Preserve the animated Tradebilia top-bar branding. The rotating category word is intentional.

## 8. New-Session Acceptance Checklist

The new session must complete this checklist **in order**. Stop and ask Rich if any check fails.

| Step | Required evidence |
|---|---|
| 1. Clone the project | `git remote -v` identifies `tradebilia/collectors-barter`; `git status --short` is clean. |
| 2. Read before acting | Read this guide, `NEXT_SESSION_QUICK_START.md`, `IMAGE_ASSET_INVENTORY.md`, and the top “Session Transition Gate” in `todo.md`. |
| 3. Install dependencies | `pnpm install --frozen-lockfile` completes successfully. |
| 4. Restore secure configuration | Required secrets are present through the project Secrets interface; no raw values are added to files. Confirm `CUSTOM_DATABASE_URL` points to the intended external database. |
| 5. Compile and test | `npx tsc --noEmit` succeeds and `pnpm test` passes. Record the real total rather than assuming a historical count. |
| 6. Start and inspect the application | The dev server starts. Confirm no server/database connection errors in `.manus-logs/devserver.log`. |
| 7. Exercise critical paths | Home, a category page, Messages (authenticated), Verified Merchants, Admin Users (admin), and Test AI load without console errors. Verify category pages return listings and hero assets render. |
| 8. Verify storage | Confirm active static assets load. If a static object fails, compare its filename with the GitHub recovery archive and use the checksum before re-uploading. Do not migrate user media to GitHub. |
| 9. Verify source alignment | `git status --short` is clean; `git rev-parse HEAD` equals `git rev-parse github/main` after any approved handoff-only patch. |
| 10. Obtain approval | Show Rich the result and wait for explicit confirmation that the handoff is complete. Only then remove the feature-work block in `todo.md`. |

## 9. References

[1] [Tradebilia source repository](https://github.com/tradebilia/collectors-barter)
[2] [Static asset recovery release](https://github.com/tradebilia/collectors-barter/releases/tag/tradebilia-static-assets-2026-08-11)
[3] [Live Tradebilia site](https://tradebilia.manus.space)
