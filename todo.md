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
- [ ] Set FACEBOOK_REDIRECT_URI and LINKEDIN_REDIRECT_URI env vars (required for OAuth code exchange to succeed)
