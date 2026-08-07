# Tradebilia Platform TODO

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
- [ ] IMPROVEMENT: AI Analyzer results now format each item with its own paragraph/section — better organization and readability
- [x] IMPROVEMENT: AI Analyzer results now format each item with its own paragraph/section — better organization and readability

## Test AI Page (Admin Only)
- [x] FEATURE: Build Test AI page with two-panel item selector (inventory picker or cert ID + grading company)
- [x] FEATURE: Display eBay active listings per item on Test AI page (with metrics: avg, median, range, confidence)
- [x] FEATURE: Population report section (placeholder, ready for scraper hookup)
- [x] FEATURE: Other marketplace sales section (placeholder)
- [x] FEATURE: AI trade analysis at bottom using eBay metrics and item details
- [x] FEATURE: Admin-only route guard + link from Admin Dashboard
- [ ] FUTURE: Add eBay sold/completed history via eBay Finding API
- [ ] FUTURE: Wire population report scraper into Test AI page (CGC, PSA, BGS, PCGS, NGC, CBCS)
- [ ] FUTURE: Wire other marketplace scrapers (PWCC, Heritage, GoCollect, Comic Book Realm)
- [ ] FEATURE: Add per-item data source selector to Test AI page — each source toggles independently and shows only its specific data profile
- [x] FEATURE: Add per-item data source selector to Test AI page — each source toggles independently and shows only its specific data profile
