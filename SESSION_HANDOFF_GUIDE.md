# Tradebilia Master Session Handoff Guide

> **Migration status:** Feature work is paused. Manus Support confirmed that a fresh Project task cannot be documented as attaching to the active published WebDev project. This guide is now a reference inventory for the **current** project; `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md` is the controlling document for any replacement WebDev project.

This document records the current Tradebilia project’s credential **names, owners, status, and restoration requirements**, but it never contains a raw API key, password, or database connection string. Secrets belong in secure project configuration, not GitHub. It is not a procedure for binding a new task to this live WebDev project.

After reading this guide, read `HANDOFF_ADVERSARIAL_AUDIT.md` and then `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md`. The migration report supersedes any older wording in this guide that assumes a fresh task can access the current WebDev checkout or project-scoped storage.

| Project record | Current value |
|---|---|
| GitHub source of truth | [`tradebilia/collectors-barter`](https://github.com/tradebilia/collectors-barter) |
| Production site | [tradebilia.manus.space](https://tradebilia.manus.space) |
| Latest handoff/media checkpoint | Use the existing project’s **Version history** panel; do not rely on a checkpoint ID inside a static handoff document because every later validation checkpoint supersedes it. |
| Static-asset recovery release | [`tradebilia-static-assets-2026-08-11`](https://github.com/tradebilia/collectors-barter/releases/tag/tradebilia-static-assets-2026-08-11) |
| Feature-work status | **Blocked pending controlled new-WebDev migration design, execution, acceptance, and Rich’s explicit approval** |

## 1. Critical Platform Limitation

> **Do not assume a fresh Project task can continue the active Tradebilia WebDev project.** The fresh-task validation proved that Project context and shared files are available, but the active WebDev checkout and controls are not. Manus Support confirmed no documented attachment workflow.

The current WebDev project—not simply its Git repository—is the boundary that owns Tradebilia’s deployed application, managed object-storage namespace, project configuration, GitHub integration, and domains. A replacement WebDev project is a separate environment and does not automatically inherit `/manus-storage/...` media, domain bindings, GitHub integration, or live-data configuration. Use the staged migration gates in `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md`; do not create the replacement project until the media strategy and platform blockers are approved.

## 2. Non-Negotiable First Rule

Do **not** start CGC work, Test AI changes, production AI Analyzer work, merchant enhancements, or unrelated bug fixes until every acceptance check in Section 9 is complete and Rich explicitly confirms that the new session is correctly set up. The only permitted work before that confirmation is restoring, testing, documenting, and correcting the handoff itself.

### Validation is read-only until Rich approves

On the first pass through the acceptance checklist, do not edit source code, alter database records, run migrations, re-upload/delete/move media, change secrets or connectors, modify deployment settings, create a checkpoint, or push to GitHub. Collect evidence and report any discrepancy to Rich first. Only Rich may authorize a corrective handoff action; unrelated development remains blocked even after a handoff correction.

## 3. What Persists—and What Does Not

Tradebilia deliberately uses more than one storage boundary. Treating them as interchangeable caused prior handoff confusion.

| Boundary | What belongs there | What persists | New-session instruction |
|---|---|---|---|
| **GitHub repository** | Source code, schema, tests, documentation, release-backed static recovery archive | Yes | Lock a known `main` commit as the new-project code baseline. New WebDev GitHub integration does not transfer automatically; do not assume simultaneous auto-sync to the same branch is safe. |
| **Project object storage** (`/manus-storage/...`) | Static design assets, listing photographs, user avatars, uploaded files | Project-scoped; not part of Git history | A replacement WebDev project does not inherit these paths. Static assets have a release backup; customer media requires a checksum-backed manifest and an approved migration strategy. Do **not** put live user images into GitHub. |
| **External CUSTOM database** | Live users, profiles, listings, messages, trades, merchant status, photo/asset URLs | Yes, if reconnecting to the intended database | Restore the correct `CUSTOM_DATABASE_URL` securely before use. Confirm it targets the intended production/staging database. |
| **Manus-managed database** | Template/platform database only unless deliberately used | Not the live Tradebilia dataset | Do not mistake it for the external live database. Do not run a live-data migration against it. |
| **Sandbox runtime** | `node_modules`, dev-server state, logs, `/tmp`, browser state, downloaded local copies | No guarantee | Reinstall dependencies, reauthenticate as required, and regenerate local-only artifacts. |
| **Secrets configuration** | API keys, OAuth secrets, database credentials | Must be re-established/verified securely | Use the secure project Secrets flow; never add literal values to Markdown, source, commits, issues, or chat logs. |

The server mounts a project storage proxy before tRPC and Vite handling, so `/manus-storage/...` paths are served through the application runtime rather than from the repository. The proxy obtains a signed URL using the current project’s Forge credentials. Database-backed listing and avatar URLs therefore must remain in object storage and in the external database’s metadata.

> **Verified on August 11, 2026:** production returned `200` for all 46 static design-asset paths, all 15 marketplace cover-image paths, and both marketplace avatar paths sampled across the 10 public categories. A deeper public listing-detail review initially found one obsolete 403 secondary photo. With Rich’s authorization, that one database record was removed while preserving the listing’s working cover photo; the remaining **27 public detail-media paths were rechecked and all returned `200`**. The evidence strongly supports same-project continuity, but the fresh-session acceptance checklist must still repeat representative static, listing, and avatar checks.

## 4. Asset Strategy and Recovery Plan

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

### The August 4 re-upload incident—what it means

The asset-restoration commits on August 4 replaced prior background and title paths that no longer existed in the current project storage. For example, the pre-restoration Comics background path now returns `403`, while the restored `ComicsBackground_798a970b.webp` returns `200`. That was a **project-storage migration/rebuild issue**, not ordinary chat-session loss.

For individual listing photos, the application stores a `/manus-storage/listings/...` URL in the external database. A replacement WebDev project has a different storage namespace, so existing photo/avatars require a dedicated media migration. Do not update the live database paths until the approved migration strategy, maintenance controls, checksum manifest, and rollback plan are in place.

### Authorized live-media cleanup completed during the audit

The obsolete secondary photo record for listing `1110009`, **Barry Sanders Score Rookie**, referenced a 403 storage object. With Rich’s authorization on August 11, 2026, exactly that one record was removed in a guarded transaction. The listing retained its working cover photo, the removed path no longer appears in public listing detail, and all 27 remaining audited public detail-media paths returned `200`.

### Known repaired asset faults

Nine prior static source objects returned `403`. They are no longer referenced by executable code. Five ranking-page title images and the home page’s wheel image were replaced with inline SVG rendering; stale long-logo paths were redirected to a verified current Tradebilia title asset. Home and all four ranking hero variants were visually checked after the repair.

If a static asset breaks in the current project, use the recovery archive only after verifying its checksum. For a replacement WebDev project, follow the static and customer-media sequence in the migration report. Never replace a customer listing or avatar from the static archive because those items were intentionally excluded.

## 5. Database: Live Data and Safe Reconnection

Tradebilia’s live data is stored in an **external MySQL/TiDB-compatible database** selected through `CUSTOM_DATABASE_URL`. It contains real users, listings, profile records, messages, trades, and media URLs. The Manus-managed `DATABASE_URL` is not a substitute for that live data source.

| Requirement | Safe rule |
|---|---|
| Connection target | Obtain the intended `CUSTOM_DATABASE_URL` from Rich or the database provider through a secure channel. Do not copy it into this guide. |
| Connection format | `mysql://<user>:<password>@<host>:<port>/<database>?ssl=<provider settings>` |
| Before writes or migrations | Confirm environment, host, database name, backup status, and intended schema change. |
| Schema source | `drizzle/schema.ts` is the code contract. |
| Live schema changes | `drizzle.config.ts` now prefers `CUSTOM_DATABASE_URL`, matching the app runtime. Generate and review SQL first, then confirm the executor targets the **external** database—not the Manus-managed one—before applying anything. |
| Data recovery | The external database provider’s backups are the recovery mechanism. Local sandbox files are not backups. |

At handoff time, known live data includes marketplace listings across all 10 categories and a pending merchant `rtavani` / “Crazy Al’s Comics.” Do not assume sample counts remain fixed; use them only as a sanity check after reconnecting.

## 6. Credential Registry — Names, Status, and Restoration

The following table consolidates every credential family used or configured in the project. **Raw values are intentionally omitted.** Restore values using the secure project Secrets interface or the relevant provider console.

| Environment variable(s) | Owner / source | Current purpose | Status / next-session handling |
|---|---|---|---|
| `CUSTOM_DATABASE_URL` | Rich / external database provider | Connects the server to real Tradebilia data | **Critical.** First verify the existing project secret points to the intended host and database. Restore the exact intended value securely only if it is absent or invalid; never substitute the Manus-managed `DATABASE_URL`. |
| `EBAY_PROD_CLIENT_ID`, `EBAY_PROD_CLIENT_SECRET` | eBay Developer account | Production eBay OAuth and Browse API | Restore if eBay functionality is being tested. Verify the configured HTTPS callback URLs before changing OAuth. |
| `SOLD_COMPS_API_KEY` | Sold-Comps account | Historical sold-comps data in Test AI | Working during this session. Restore securely; rotate before production if desired. |
| `PARSE_BOT_API_KEY` | Parse.bot account | PSA and Beckett data in Test AI | Working during this session. UI labels are **Parse.bot (PSA Data)** and **Parse.bot (Beckett Data)**. |
| `PSA_API_TOKEN` | PSA account | Direct PSA API, when approved | Not currently validated. Do not replace Parse.bot data flow with it until independently tested. |
| `PCGS_API_TOKEN`, `GO_COLLECT_API_KEY` | Respective providers | Future collection-data integrations | Treat as future/conditional. Do not begin implementation before handoff approval. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Twilio Console / Verify service | Mandatory SMS phone verification in account setup | Working in this session. Restore the matching three values together and test a real verification in a safe account flow. |
| `TRADEBILIA_OPENAI_API_KEY` | Rich’s AI provider account | Planned direct OpenAI production path | **Not active in the current resolver.** The implementation currently returns the Forge key even when this value exists. Do not alter AI-provider behavior or port Test AI logic until Rich confirms testing is complete. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` | PayPal developer account | PayPal connection / payment configuration | Restore only when PayPal features are tested. Code supports legacy `PAYPAL_MODE` fallback. |
| `RESEND_API_KEY` | Resend account | Email notification delivery | Restore before email tests. The shared Tradebilia logo header is required for all notification emails. |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI` | Facebook developer account | Facebook connection/OAuth | Conditional. Verify redirect URL exactly before enabling. |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | LinkedIn developer account | LinkedIn connection/OAuth | Conditional. Verify redirect URL exactly before enabling. |
| `DAILY_API_KEY` | Daily.co account | Video-chat integration | Restore only if that flow is being exercised. |
| `ENCRYPTION_KEY`, `JWT_SECRET` | Project security configuration | OAuth token encryption and session signing | **Critical.** Never replace casually; rotating can invalidate encrypted tokens or active sessions. |
| `BUILT_IN_FORGE_API_KEY`, `BUILT_IN_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL` | Platform-provided | Current Forge LLM and storage integration | The active LLM resolver currently uses the Forge key. Provided by the project platform; do not hardcode. |
| `DATABASE_URL`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `VITE_OAUTH_PORTAL_URL`, `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | Platform/project configuration | Framework OAuth, database, and analytics plumbing | Platform-managed unless a session setup explicitly requires an update. |

### Security note

An early draft credential reference was removed before the final GitHub handoff push. A direct audit confirmed that file did **not** exist in `github/main`. As a prudent measure, rotate the Twilio Auth Token, Sold-Comps key, Parse.bot key, and any other credential that was ever placed in a temporary draft before production launch. Do not commit secret values—even to a private repository—because Git history is difficult to purge reliably.

The managed workspace also contains a platform-generated `.project-config.json` file with raw injected runtime settings. It is intentionally ignored by Git and is absent from GitHub history; it is **not** a handoff document or a safe source for copying secrets. Do not open, copy, attach, print, or commit it, and do not ask Rich to paste it. The new session should verify secret **presence** only through the secure project configuration or environment-variable names.

## 7. Current Functional Status

| Area | Status at handoff |
|---|---|
| Category marketplace | Fixed. All 10 category pages render after compacting tRPC filter input to prevent GET-to-POST fallback. |
| Merchant verification | Complete: admin verify/revoke, public badges, directory, and instant category filter chip. No merchant is yet verified, so the chip correctly yields no listings until an admin approves one. |
| Account setup | Complete: final-submit-only profile creation and mandatory Twilio Verify phone step. |
| Test AI sandbox | Test-only: eBay, Sold-Comps, Parse.bot PSA, Parse.bot Beckett, and grading-company certificate routing are implemented. Do not port logic to the production Trade Room AI Analyzer without Rich’s explicit approval. |
| Messages | Hero title and reply display name are fixed. **Open defect:** the replier receives an unread alert for their own inquiry reply. It is documented in `todo.md` and must stay paused until handoff approval. |
| Static and public media resilience | All 46 static source references resolve and are release-backed; all 27 remaining public listing-detail/owner media paths audited after the authorized Barry Sanders cleanup return `200`. |

## 8. Important Technical Rules

1. Use `pnpm` and run the established test suite before and after any change.
2. Run `npx tsc --noEmit` after TypeScript changes.
3. Create or update a Vitest test for every behavior change; screenshots are supplemental, not a substitute.
4. Update `todo.md` before coding new requested work, and mark work complete immediately after verification.
5. Create a checkpoint before final delivery. Auto-publish is enabled, so each checkpoint is live.
6. Push the same verified commit to `github/main`; compare local `HEAD` with `github/main` afterward.
7. Do not seed fake reviews, ratings, testimonials, or customer data.
8. Preserve the animated Tradebilia top-bar branding. The rotating category word is intentional.

## 9. Current-Project Reference Checks

These checks apply only while working in the current active WebDev project. They are **not** a bootstrap method for a fresh Project task.

| Step | Required evidence |
|---|---|
| 1. Verify source alignment | Confirm the working tree content matches approved GitHub `main`; do not require checkpoint commit hashes to match GitHub hashes. |
| 2. Verify live configuration | Confirm `CUSTOM_DATABASE_URL` is the intended external database and required secret **names** are present; never inspect/copy `.project-config.json` or raw values. |
| 3. Verify current health | Run the established type, test, build, health, static-asset, and representative listing/avatar checks. |
| 4. Migration decision | Before any replacement WebDev action, use `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md` and obtain Rich’s explicit decision on media strategy, maintenance/cutover, and unresolved platform questions. |

When inspecting a Git remote, use a sanitized display that removes any embedded credential. Do not print, copy, or record a token-bearing remote URL in documentation, logs, or chat.

## 10. References

[1] [Tradebilia source repository](https://github.com/tradebilia/collectors-barter)
[2] [Static asset recovery release](https://github.com/tradebilia/collectors-barter/releases/tag/tradebilia-static-assets-2026-08-11)
[3] [Live Tradebilia site](https://tradebilia.manus.space)
[4] `HANDOFF_ADVERSARIAL_AUDIT.md` in the project root and project shared files
