# Tradebilia Platform - Migration & PayPal Integration TODO

## Phase 1: Source File Migration
  - [x] Copy client/src (all pages, components, hooks, lib, contexts) from GitHub clone
  - [x] Copy server files (db.ts, routers.ts, tradeFlowRouter.ts, storage.ts, conventionScraper.ts) from GitHub clone
  - [x] Copy server/_core overrides (auth.ts, customAuth.ts, ebay.ts, email.ts, env.ts, llm.ts, etc.) from GitHub clone
  - [x] Copy shared/ directory from GitHub clone
  - [x] Copy drizzle/schema.ts and drizzle/relations.ts from GitHub clone
  - [x] Copy client/index.html (fonts, meta) from GitHub clone
  - [x] Copy package.json dependencies (bcryptjs, resend, jose, etc.) and install
  - [x] Copy patches/ from GitHub clone
  - [x] Verify dev server starts with no TypeScript errors after migration

## Phase 2: Database Schema Restoration
  - [x] Apply full 46-table schema via webdev_execute_sql
  - [x] Alter users table with all extended columns (displayName, bio, paypalEmail, etc.)
  - [x] Create tradePayments table (PayPal Phase 1)
  - [x] Verify all tables exist and schema matches drizzle/schema.ts

## Phase 3: PayPal Phase 1 Backend
  - [x] Create server/paypal.ts (OAuth 2.0 token + Transaction Search API)
  - [x] Add paypalEmail, paypalVerified, paypalVerifiedAt columns to users table in schema
  - [x] Create tradePayments table in schema
  - [x] Add payment router with getPayPalEmail, savePayPalEmail, verifyPayment, getPaymentStatus
  - [x] Register payment router in server/routers.ts
  - [ ] Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET secrets (requires user to provide)
  - [ ] Write vitest tests for payment router

## Phase 4: Account Settings PayPal Tab
  - [x] Add PayPal email card to Integrations tab in AccountSettings.tsx
  - [x] Wire savePayPalEmail mutation to save button
  - [x] Wire getPayPalEmail query to display current email
  - [ ] Show verified badge when paypalVerified is true (pending PayPal credentials)

## Phase 5: WarRoom Payment Step
  - [x] Add payment step to WarRoom.tsx (accepted stage, before shipping)
  - [x] Display seller's PayPal email and cash amount owed
  - [x] Add transaction ID input field
  - [x] Add liability disclaimer banner
  - [x] Block "Add Cash" button when user has no paypalEmail (toast to Account Settings)

## Phase 6: WarRoom Verification Wiring + Activity Log
  - [x] Wire trpc.payment.verifyPayment to transaction ID submit
  - [x] Show loading spinner during verification
  - [x] Display verified/failed result with appropriate UI
  - [x] Mark user as paypalVerified on success
  - [x] Log payment lifecycle events to trade activity log
  - [x] Update getTradeDetails to include partner paypalEmail in otherUser query

## Phase 7: QA & Delivery
  - [x] Run pnpm tsc --noEmit (zero TypeScript errors)
  - [x] Run pnpm test (1/1 tests pass)
- [ ] Take screenshots of key pages
- [ ] Save checkpoint
- [ ] Push to GitHub
