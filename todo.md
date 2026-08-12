# Tradebilia Platform TODO


# Project TODO

## Session Transition Gate — Do Not Start New Feature Work
- [x] MIGRATION DECISION: Manus Support confirmed no documented method to bind a fresh Project task to the existing live WebDev project. The handoff now uses the selected controlled full production-to-staging snapshot migration model; do not start feature work until migration acceptance is complete.
- [x] RECOMMENDED STRATEGY: Rich authorized the safest path—a complete production-to-staging snapshot into an independent writable new WebDev project, while the current project remains production. The snapshot must include code, external database, static assets, customer media, compatible secure configuration, and guarded integrations; a later controlled delta/cutover remains separate.
- [x] HANDOFF WRITEUP: Finalized the practical exact-snapshot staging prerequisites, execution gates, testing boundaries, and later delta/cutover rules without creating the replacement project or changing production resources. Documentation regression coverage, TypeScript, tests, build, and whitespace validation pass.
- [x] SUPERSEDED MEDIA STRATEGY: Rich initially selected a deferred-media Option B approach, then clarified that the new project must begin as an exact complete working snapshot. The governing plan is now full static/customer-media replication into isolated staging before Phase B1 acceptance; production records and domains remain unchanged until later Phase B2 cutover.
- [ ] EXACT-SNAPSHOT STAGING GATE: Define a safe unpublished replacement-project bootstrap that begins as a complete working snapshot of the current production site: code, external-database records, static assets, listing photos, avatars, compatible secure configuration, and applicable integration settings. Rich must be able to create test users, items, trades, and messages in this isolated clone without affecting the live project. A later delta/cutover plan is still required before production switch.
- [ ] MIGRATION BLOCKER: Define and validate transfer procedures for GitHub code, external `CUSTOM_DATABASE_URL` live data, encryption/secrets, static design assets, database-backed listing/avatars, GitHub integration, and domain/deployment cutover before creating the replacement WebDev project.
- [x] MIGRATION REPORT: Produced `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md`, independently reviewed it across source/GitHub, database, media, secrets/OAuth, and domains/deployment, then added the verified findings, explicit unknowns, and go/no-go gates. 77/77 tests, TypeScript, and build pass.
- [ ] MIGRATION SAFETY GATES: Before any replacement project is created, obtain Rich’s media-strategy decision, a complete checksum-backed media manifest, external database integrity/backup evidence, scheduled-writer pause plan, GitHub linking decision, and both-domain/OAuth cutover plus rollback plan.
- [x] PREREQUISITE EVIDENCE: Revalidated all five handoff documents and the Session Transition Gate against current source, GitHub main, production homepage, runtime database-selection code, live writer schedule inventory, and project configuration. Repaired a stale opening sentence in the controlling report that incorrectly implied a deferred customer-media cutover; the document and regression coverage now consistently require full static/customer-media replication in Phase B1.
- [ ] DATABASE CLONE EVIDENCE: Obtain a provider-supported, writable isolated staging database cloned from a named production snapshot; record non-secret integrity, row-count, and write-isolation verification evidence before a replacement project is created.
- [ ] MEDIA MANIFEST EVIDENCE: Source manifest now contains 25 listing photos and 4 avatar records; 28 binaries were retrieved and SHA-256 checked, while one legacy avatar source route returned 403. Resolve that exception and verify all destination objects from the independent staging project before marking this gate complete.
- [ ] STAGING ISOLATION EVIDENCE: Produce an explicit pause/disable record for all scheduled writers and a per-integration staging override matrix covering email, SMS, payments, OAuth, and production-domain attachments.
- [x] STAGING SAFETY CONTROL: Added and tested a default-off `TRADEBILIA_STAGING_MODE` guard. A copied project with the flag enabled fails closed for outbound email, Twilio SMS, PayPal verification, OAuth callbacks, and all scheduled writers; the explicit production-default paths remain available when the flag is unset.
- [x] STAGING SAFETY COVERAGE: Added behavioral Vitest coverage for eBay, Facebook, and LinkedIn callback routes under `TRADEBILIA_STAGING_MODE=1`, plus production-default entry-path coverage for email, Twilio, PayPal, and scheduled writers. Focused suite: 38/38 passing.
- [ ] PROJECT BOOTSTRAP DECISION: Record the approved new-project name, independent GitHub-linking method, non-production domain/OAuth criteria, and rollback ownership before creating the replacement project.
- [x] STORAGE EVALUATION: Compared Manus-compatible independent object-storage providers. Cloudflare R2 is the recommended future external option, but Rich selected the project-to-project exact-snapshot path first.
- [x] FREE-TIER STORAGE REVIEW: Verified portable free-tier choices and production constraints. R2 is suitable for initial scale but is deferred under the selected Option B path.
- [x] R2 IMPACT ASSESSMENT: Mapped the contained server-side R2 adapter and one-time media migration impact; implementation is deferred while the project-to-project exact snapshot is completed.
- [x] R2 SETUP GATE: Documented user-owned R2 bucket, token, CORS, delivery-domain, and secure handoff requirements; setup is deferred until Rich elects the external-storage phase.
- [x] SUPERSEDED: Fresh-task validation proved that a Project task cannot be assumed to receive the active WebDev checkout/control surface. Manus Support confirmed no documented attachment procedure; use the new-WebDev migration report instead.
- [x] SUPERSEDED: Fresh-task evidence showed no active WebDev project action interface. Manus Support confirmed no documented fresh-task attachment workflow, so restart/bootstrap assumptions were removed from the migration path.
- [x] BOOTSTRAP CORRECTION: Resolved through evidence. Fresh-task continuation is unsupported; the controlled independent-project migration model now replaces the invalid bootstrap procedure.
- [ ] BLOCKER: Obtain Rich's explicit confirmation that the new session handoff is complete before starting any feature, scraper, AI Analyzer, or unrelated bug-fix work.
- [x] ADVERSARIAL AUDIT: Re-tested every claim from direct project, GitHub, shared-file, deployment, database, secret, storage, and acceptance-command evidence. Published `HANDOFF_ADVERSARIAL_AUDIT.md` with proven / expected-but-unproven / blocked-or-unknown labels. Unsupported cross-session claims are explicitly qualified and remain blocked on the fresh-session validation task.
- [x] HANDOFF PUBLISH BUG: Resolved. `HANDOFF_ADVERSARIAL_AUDIT.md` was added through a clean credential-safe GitHub commit after the untracked-file omission was detected. Re-check confirms it is present in GitHub and matches the project shared-file copy.
- [x] SECURITY: Verified `.project-config.json` is Git-ignored, untracked, absent from all Git history and `github/main`, and is not a source-file secret leak. Updated the handoff to forbid reading/copying/committing this platform-generated local metadata; follow a normal credential-rotation plan before production launch because earlier temporary drafts may have held values.
- [x] SECURITY VERIFICATION: Both handoff entry documents explicitly prohibit using `.project-config.json` as a handoff/secret source; a regression test verifies the warnings, and the final documentation suite passes.
- [x] FINAL REVIEW: Independently cross-checked SESSION_HANDOFF_GUIDE.md, NEXT_SESSION_QUICK_START.md, and IMAGE_ASSET_INVENTORY.md against the final project, GitHub, shared-file, storage, database, and secret continuity state. Corrected the checkpoint reference, token-safe Git check, content-based Git alignment rule, active Forge AI credential statement, read-only validation rule, and database-verification wording; 73/73 tests and TypeScript pass.
- [ ] DEFERRED AI CONFIGURATION: `TRADEBILIA_OPENAI_API_KEY` is documented for a planned direct OpenAI path, but the active LLM resolver currently returns the Forge key. Do not change provider selection until Rich approves the pre-launch AI model work.
- [x] AUDIT: Completed evidence-based review of repository/GitHub alignment, managed project identity, shared files, deployment, storage, external database selection, encryption/session configuration, and third-party integrations; reread and corrected all handoff documents. The authorized Barry Sanders photo cleanup is complete; only fresh-session acceptance and Rich’s approval remain as handoff blockers.
- [x] SECURITY: Removed the hardcoded external-database identifier fragment from `requireDb` logging and replaced it with environment-source-based redacted logging; typecheck and full tests pass.
- [x] DATABASE SAFETY: Corrected `drizzle.config.ts` so migration commands target `CUSTOM_DATABASE_URL` when configured, matching the live application database preference; covered by a regression test.
- [x] AUTHORIZED REPAIR: Removed only the obsolete broken secondary-photo record from listing `1110009` (Barry Sanders Score Rookie) after Rich selected removal on August 11, 2026. Guarded transaction removed exactly one record, retained the working cover photo, public detail no longer returns the broken path, and all 27 remaining audited public detail-media paths return 200.
- [x] SUPERSEDED: Fresh-task testing and Manus Support disproved the assumption that a task inside the Project can validate continuity with the active WebDev runtime. The historical result remains useful evidence for the current project only.
- [x] INVESTIGATION: Current-project audits verified 46 static assets, 25 listing-photo records, and 4 profile avatars using current `/manus-storage/...` paths. The replacement-project report requires a checksum-backed media migration; no cross-project continuity assumption remains.
- [x] SUPERSEDED: The fresh-task media validation is not a valid replacement-project test. Cross-project media validation now occurs only after approved migration manifest/restoration gates in `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md`.
- [x] HANDOFF: Completed the accurate storage and asset-reference audit, consolidated the master handoff documentation, and added the sanitized handoff package to durable project shared files.
- [x] HANDOFF: Audited 55 static asset references, preserved all 46 active references in a GitHub recovery release, and removed nine broken source references from executable UI code.
- [x] HANDOFF: Replaced broken ranking-title image links and the home hero wheel dependency with inline vector rendering, then verified the rendered hero pages.

## Phase 1: Core Platform Setup
- [x] User authentication with Manus OAuth
- [x] Database schema for users, profiles, listings, trades, reviews
- [x] Basic navigation and routing structure

## Phase 2: User Profile & Account Management
- [x] Account setup flow (profile info, contact details, merchant setup)
- [x] Account settings page with tabs (profile, security, integrations, communications, preferences)
- [x] Profile picture upload and avatar generation from initials
- [x] User profile viewing (public profile page)

## Phase 3: Inventory Management
- [x] Add inventory page with category-based form fields
- [x] Photo upload (up to 10 photos per listing)
- [x] Listing status management (active, inactive, sold, traded)
- [x] Edit/delete listings
- [x] My inventory page showing all user listings

## Phase 4: Marketplace Search & Browse
- [x] Search listings by title, category, condition
- [x] Filter by category, condition, price range, grade
- [x] Browse recently added items
- [x] Listing detail page with photos, description, condition, value
- [x] Favorite items functionality

## Phase 5: Trading System
- [x] Initiate trade with another user
- [x] Counter proposals for trades
- [x] Trade status tracking (pending, accepted, shipped, received, completed)
- [x] Trade history and completed trades view
- [x] Shipping address collection during trade flow

## Phase 6: Messaging System
- [x] Send messages to other users
- [x] Message inbox/outbox
- [x] Conversation threads
- [x] Unread message indicators

## Phase 7: Reviews & Ratings
- [x] Leave reviews after completed trades
- [x] Rating system (overall, communication, shipping speed, item condition)
- [x] Review history and average rating calculation
- [x] Public profile displays ratings and recent reviews

## Phase 8: External Integrations
- [x] eBay account connection and data import
- [x] Facebook account connection
- [x] LinkedIn account connection
- [x] PayPal email integration
- [x] Display connected account info on public profile

## Phase 9: Admin Features
- [x] Admin dashboard with user management
- [x] Admin can edit user profiles and merchant status
- [x] Admin can view all listings and trades
- [x] Admin can manage users (suspend, ban, promote to admin)

## Phase 10: Notifications & Communications
- [x] Email notifications for trade events
- [x] Notification preferences (email, text)
- [x] Notification types: tradeInitiated, counterProposal, proposalAccepted, proposalRejected, itemsShipped, itemsReceived, feedbackReceived, systemUpdates, marketingEmails, messages
- [x] Each notification type has email and text toggles

## Phase 11: PublicProfile Header Enhancements
- [x] Add stats bar to profile header showing: items listed, completed trades, review count, online status
  - Display as 4 metric cards below username: Listed, Trades, Reviews, Status (Online/Away)
  - Online status computed from user.lastActivityAt (online if within 5 minutes)
- [x] Fix location display to use profile?.contactTown and profile?.contactState
  - Only show if BOTH town and state are available
  - Format as "Town, State"
- [x] Hide Pending Connections section on public profiles
- [x] Add Pending Connections section to AccountSettings Integrations tab
  - Shows all unconnected platforms (Facebook, PayPal, LinkedIn, eBay, WhatNot)
  - Displays as grid with platform logos and "Not connected" status

## Phase 12: AddInventory Photo Upload Enhancements
- [x] Add photo count indicator during upload showing "X of 10"
  - Display current count and limit in the photo upload panel
  - Update count in real-time as photos are added/removed
  - Disable upload button when 10 photos reached
  - Show "Maximum 10 photos reached" message when limit is hit

## Phase 13: Bug Fixes — Dead /images/ paths & eBay badge
- [x] Fix eBay verification badge on ItemDetail.tsx (shows Tradebilia logo, should show Ebaylogo_f6331705.png)
- [x] Fix TradePrintView.tsx logo to use /manus-storage/ path instead of broken /images/logos/ path
- [x] Remove dead /images/ fallbackRecentItems array from Home.tsx
- [x] Fix TRADEBILIA_LOGO_URL constant in tradebilia.ts to point to correct /manus-storage/ path (was /images/, now used by CategoryPage, MemberSearch, Messages)
- [x] Fix PAYPAL_MODE vs PAYPAL_ENV mismatch in paypal.ts (code read PAYPAL_MODE, injected secret is PAYPAL_ENV - now reads both)
- [x] Add DAILY_API_KEY secret for Daily.co video chat (key validated against Daily.co API - 200 OK, 2 tests passing)
- [x] Register /api/ebay/callback, /api/facebook/callback, /api/linkedin/callback Express routes in server/_core/index.ts (all three return 302 redirects correctly)
- [x] Set FACEBOOK_REDIRECT_URI and LINKEDIN_REDIRECT_URI env vars (set to tradebilia.manus.space callback paths, 2 vitest tests passing)

## Phase 14: Git History Reconciliation (GitHub <-> Manus)
- [x] Create pre-merge safety backup branch (pre-merge-backup) and tag (pre-github-merge)
- [x] Audit GitHub-only files: 830 non-node_modules, only ~46 real .ts/.tsx sources
- [x] Confirm market data core modules already exist in Manus with Manus-side bug fixes (tradeRoomAI invokeLLM response extraction, requestedItemValue.estimated, downlevelIteration-safe Array.from)
- [x] Establish that the two histories are UNRELATED (no merge-base); GitHub HEAD 2026-07-28 predates Manus root 2026-08-04, so GitHub is an older snapshot, not an ahead branch
- [x] Verify Manus is a feature superset: tRPC procs 60 vs 59, db.ts exports 103 vs 102, schema tables 46 vs 39, tradeFlow procs 57 vs 54 — zero GitHub-only items in any surface
- [x] Verify all GitHub-only npm deps (@daily-co/daily-js, playwright, bcrypt) are unused even in GitHub's own source; morgan only used by GitHub index.ts
- [x] Decide against `git merge --allow-unrelated-histories` (would drag in 52k node_modules + 800 stale .md reports and revert 74 files to older/buggier versions)
- [x] Port genuine gap 2: vitest.setup.ts dotenv loader + wire setupFiles into vitest.config.ts
- [x] Write vitest coverage for the health route and the cron-only auth guard on scheduled routes
- [x] Verify TypeScript clean (tsc --noEmit exit 0) and run the full vitest suite (13/13 passing)
- [x] Upgrade route tests from source-string assertions to behavioral tests: mount the real Express handlers and assert /health 200-vs-503 and cron 403-vs-success paths
- [x] Upgrade route tests from source-string assertions to behavioral tests: mount the real Express handlers and assert /health 200-vs-503 and cron 403-vs-success paths (26 tests, all passing)
- [x] Archive GitHub's old history to a `github-history-archive` branch on GitHub before overwriting main
- [x] Force-push the Manus tree to GitHub main so the repo mirrors the live site (c0495603 confirmed identical)
- [x] BUG (pre-existing, live): tradeProposals.status enum lacks 'disputed' but fileComplaint (tradeFlowRouter.ts:822) writes it — throws under STRICT_TRANS_TABLES. Add 'disputed' to the enum via migration
- [x] Port genuine gap 1: 4 missing Express routes into server/_core/index.ts (/health, /api/scheduled/cleanupExpiredDrafts, /api/scheduled/referralDigest, /api/scheduled/tradeReminders)
- [x] Harden ported cron endpoints: 403 (not 500) on auth failure, require isCron AND taskUid, never trust req.body
- [x] Register 3 project-level Heartbeat crons so the ported endpoints actually fire
- [x] Add vitest coverage for scheduled route registration/authorization + disputed enum regression (server/scheduledRoutes.test.ts, 8 tests)
- [x] Upgrade route tests from source-string assertions to behavioral tests: mount the real Express handlers and assert /health 200-vs-503 and cron 403-vs-success paths
- [x] BUG FIX: Trade room — own items (offeredListings) showed no images because getTradeDetails fetched photos per listing but dropped them from the return spread; added photos: (l as any).photos || [] to the offeredListings map
- [x] BUG FIX: Your Inventory modal in trade room showed no images because formatListings returned photos as strings [url] instead of objects [{imageUrl, altText}], breaking the modal's item.photos[0].imageUrl access pattern
- [x] FEATURE: Add condition/grade badge to inventory modal item cards so users see what they're offering
- [x] BUG FIX: SearchResults.tsx was accessing photos[0] as a string but now gets objects; added typeof check to handle both formats
- [x] BUG FIX: Trade Hub verification badges now show correct verified accounts (eBay, Facebook, LinkedIn) instead of checking for ID existence
- [x] FEATURE: Add PayPal verification badge to Trade Hub (shows only when paypalVerified = 1)
- [x] BUG FIX: eBay IDVerified parsing now handles "true", "1", and case-insensitive variants (was only checking for exact string "true")
- [x] BUG FIX: eBay OAuth redirect URI now uses correct HTTPS callback URL instead of hardcoded RuName
- [x] INFRASTRUCTURE: Switched eBay OAuth from sandbox to production endpoints
- [x] CHANGE: eBay badge now shows when account is connected (ebayUsername set) instead of requiring IDVerified flag which eBay rarely sets

## Pre-Launch Checklist
- [ ] PRE-LAUNCH: Upgrade AI Analyzer to a better LLM model (e.g., GPT-4o via valid OpenAI key or Claude) before going live — currently using Manus Forge as interim solution
- [x] BUG FIX: Trade room timeline now shows current display names instead of stored usernames
- [x] REFACTOR: AI Analyzer now accepts item data from client instead of querying DB — analyzes fresh UI state, not stale persisted data
- [x] POLISH: All email notifications now use the Tradebilia logo image header (matching referral email style) instead of text
- [x] DUPLICATE RECORD: AI Analyzer results format each item with its own paragraph/section; completion is recorded in the following item.
- [x] IMPROVEMENT: AI Analyzer results now format each item with its own paragraph/section — better organization and readability

## Test AI Page (Admin Only)
- [x] FEATURE: Build Test AI page with two-panel item selector (inventory picker or cert ID + grading company)
- [x] FEATURE: Display eBay active listings per item on Test AI page (with metrics: avg, median, range, confidence)
- [x] FEATURE: Population report section (placeholder, ready for scraper hookup)
- [x] FEATURE: Other marketplace sales section (placeholder)
- [x] FEATURE: AI trade analysis at bottom using eBay metrics and item details
- [x] FEATURE: Admin-only route guard + link from Admin Dashboard
- [x] ENHANCEMENT: Update eBay search query logic to handle comics with issue number (comicTitle #issueNumber + grading/condition)
- [x] ENHANCEMENT: Update eBay search query logic to handle sports cards (year + manufacturer + player + cardNumber + grading/condition)
- [x] BUG FIX: eBay search now filters results by grade (extracts grade from query, filters listings to match ±0.3 tolerance)
- [x] ENHANCEMENT: Update eBay search query logic to handle video games (gameTitle + platform + grading/condition)
- [ ] TESTING PHASE: Test eBay search logic in Test AI page for comics and sports cards before applying to production AI Analyzer
- [ ] PRODUCTION: Once testing complete, apply same eBay search specs to production AI Analyzer in Trade Room
- [ ] FUTURE: Add eBay sold/completed history via eBay Finding API
- [x] FEATURE: Integrate Parse.bot PSA API into Test AI page (get_cert_full + get_cert_sales endpoints)
- [x] FEATURE: Integrate Parse.bot Beckett API into Test AI page (get_graded_card_details — BGS cert lookup with sub-grades, label color, population) — labeled "Parse.bot (Beckett Data)"
- [ ] FUTURE: Wire population report scraper into Test AI page (CGC, PCGS, NGC, CBCS)
- [ ] FUTURE: Wire other marketplace scrapers (PWCC, Heritage, GoCollect, Comic Book Realm)

## Phone Verification (Twilio Verify)
- [x] FEATURE: Twilio Verify SMS phone verification on Account Setup step 1 — "Push to receive Code" button beside phone field, 6-digit code input + "Verify" button below, green Verified badge on success
- [x] FEATURE: Backend server/twilio.ts wrapper (sendVerificationCode, checkVerificationCode, normalizePhone to E.164, maskPhone) + auth.sendPhoneCode / auth.verifyPhoneCode tRPC procedures
- [x] FEATURE: Account creation is now gated on real phone verification (previously a stub that faked success)
- [x] TESTS: server/twilio.test.ts — 10 tests covering live Twilio credential validation, E.164 normalization, and phone masking

## Merchant Verification
- [x] SCHEMA: Added merchantVerified / merchantVerifiedAt / merchantVerifiedBy to users table (isMerchant + store fields already lived in userProfiles)
- [x] BUG FIX: Removed duplicate isMerchant from users table in Drizzle schema — it already existed in userProfiles, and the duplicate broke every users query (ER_BAD_FIELD_ERROR)
- [x] FEATURE: admin.verifyMerchant tRPC mutation (admin-only) supporting both verify and revoke
- [x] FEATURE: Admin Users tab — Merchant Information panel + verification status badge + Verify / Revoke buttons with toasts
- [x] FEATURE: "Merchant Verified" badge on public profile beside display name
- [x] BUG FIX: ItemDetail "Verified on:" row now includes merchantVerified in its render condition — a merchant with no social accounts previously showed no badge at all
- [x] BUG FIX: Removed misleading duplicate Merchant Verified badge nested inside the eBay Reputation Card (only rendered for eBay-connected users and implied eBay verified them)
- [x] FEATURE: /verified-merchants directory page listing verified merchants with store name, location, item count, website
- [x] BUG FIX: VerifiedMerchants page — replaced nested anchor (wouter Link wrapping an <a>) with a keyboard-accessible div, and normalized businessWebsite URLs missing a protocol
- [x] FEATURE: "Verified Merchants Only" filter on category pages + verifiedMerchantsOnly in the marketplace feed schema and query
- [x] FEATURE: Verified Merchants link in the home sidebar
- [x] TESTS: server/merchantVerification.test.ts — 8 tests covering admin-only authorization, revoke path, public directory access, and feed filter validation
- [x] FEATURE: Admin Users table now has a sortable "Merchant" column with three states — Verified (green), Pending (amber, click to open the user), and — for non-merchants
- [x] FEATURE: Admin Users tab merchant filter dropdown (All / Pending Review / Verified / Non-Merchants) so pending applications can be isolated
- [x] FEATURE: Amber "N merchants awaiting verification" banner above the users table that jumps straight to the pending filter
- [x] TESTS: 4 more tests covering merchant-state classification (including stale merchantVerified on a non-merchant) and that getAllUsers exposes isMerchant + merchantVerified on every row
- [ ] FUTURE: Merchant reviews / seller ratings aggregate on verified merchant profiles
- [ ] FUTURE: Log merchant verify/revoke actions to the moderation audit log

## Category Page Zero-Results Bug
- [x] BUG: All category pages show "0 results" / stuck spinner. Root cause: CategoryPage sends all 30 filter keys, and superjson encodes the 28 unused ones as explicit `undefined` in the batch URL. The combined batch URL exceeds httpBatchLink's `maxURLLength: 2000`, so the client falls back to POST, and tRPC v11 rejects POST on query procedures with 405 METHOD_NOT_SUPPORTED — so the feed never resolves.
- [x] FIX: Omit empty/undefined filters from CategoryPage `queryInput` so the request stays a compact GET
- [x] Remove the temporary [CATDEBUG] console.log diagnostic from CategoryPage.tsx
- [x] TESTS: Regression test asserting the category feed query input contains no undefined-valued keys and stays well under the batch URL limit (server/categoryFeed.test.ts, 12 tests)
- [x] VERIFIED (manual, screenshots + direct API calls — not automated end-to-end): All 10 category pages render listings (sports_cards 4, comics 2, coins 2, and 1 each for vintage_toys, video_games, stamps, pokemon, movies, autographs, disney_pins); hero stat bars populate; keyword/manufacturer/valueMin/gradingService filters and the Verified Merchants Only toggle behave correctly; home page carousel unaffected
- [ ] FUTURE: Add automated end-to-end (Playwright) coverage for category page rendering + filter behavior, so this regression is caught without manual screenshots

## Verified Merchants Page & Filter UX
- [x] FEATURE: Add hero section to Verified Merchants page using uploaded VerifiedMerchants.webp logo and same background as home page hero (Background_48b923f1.jpg). Category bar sits directly below hero per design constraint.
- [x] FEATURE: Added subtitle strip below category bar on Verified Merchants page with trust copy.
- [x] UX: Moved "Verified Merchants Only" filter from buried sidebar position to an instant-apply chip inline with "Showing N results". Chip applies the filter immediately on click (no Search button needed), resets when category changes, and is always visible above the grid.
- [x] CLEANUP: Removed verifiedMerchantsOnlyLocal state — chip now writes directly to submittedFilters, which is safe since the URL-length bug is fixed.
- [x] CLEANUP: Removed the stray checkdb.mjs debug script from the project root

## Bugs Found During Messages Page Testing
- [x] BUG FIX: Messages page title "Direct Lines, Trusted Conversations" increased to match the home page hero title scale.
- [x] BUG FIX: Reply sender display now uses the sender displayName instead of fallback "Collector <ID>".
- [ ] BUG: Sender of a message receives an alert notification when they send a reply — ROOT CAUSE: sendInquiryReply marks inquiry as unread (isRead=0) but doesn't specify for whom. The inquiry is marked unread for BOTH the recipient AND the sender, triggering an alert for the sender. FIX: Only mark as unread for the original inquiry sender (the recipient of the reply), not for the replier.
