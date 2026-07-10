# Trade Flow — Architectural Decisions & Conflict Resolutions

**Version:** 2.0  
**Date:** July 10, 2026  
**Status:** Approved — Ready for Implementation (after July 17, 2026)

---

## Overview

This document records the final architectural decisions made by Rich (product owner) and Manus (AI engineer) to resolve all conflicts between the original `COMPLETE_TRADE_FLOW_SPECIFICATION.md` and the existing codebase. These decisions supersede the original spec where they conflict.

---

## Decision 1: Database Model — Expand `tradeProposals`, Do NOT Create a New `trades` Table

**Original Spec:** Create a new parent `trades` table; `tradeProposals` becomes a child.

**Decision:** ✅ **Expand the existing `tradeProposals` table.**

**Rationale:** The entire codebase (inbox, dashboard, messages, reviews) is built around `tradeProposals.id`. Creating a new parent table would require rewriting all existing trade logic and migrating existing data, with significant risk of breaking the inbox.

**Implementation Plan:**
- Add new columns to `tradeProposals`:
  - `tradeReferenceNumber VARCHAR(20) UNIQUE` — e.g., `TR-000001`
  - `negotiatingAt TIMESTAMP NULL`
  - `acceptedAt TIMESTAMP NULL`
  - `shippingDeadline TIMESTAMP NULL` — 5 days after accepted
  - `receiptDeadline TIMESTAMP NULL` — 15 days after tracking submitted
  - `feedbackDeadline TIMESTAMP NULL` — 7 days after completed
  - `lastActivityAt TIMESTAMP`
  - `initiatorMessage TEXT NULL` — optional message at initiation
  - `declineReason TEXT NULL`
- Expand `status` enum to include: `pending`, `negotiating`, `accepted`, `shipped`, `completed`, `cancelled`, `disputed`, `declined`
- All new trade tables (`tradeAlerts`, `tradeTrackingNumbers`, `tradeReceiptConfirmation`, `tradeComplaints`) will reference `tradeProposals.id` (not a new `trades.id`)
- Rename references in code: where the spec says "tradeId", it means `proposalId` in the existing schema

---

## Decision 2: Trade Alerts — Separate Page, NOT Inside Messages

**Original Spec:** New "Trade Alerts" page with a dedicated yellow bell icon in the top nav, completely separate from Messages.

**Decision:** ✅ **Build a fully separate Trade Alerts page. Remove trade proposal logic from the Messages page.**

**Rationale:** Separating system-generated trade alerts from user-to-user chat messages is cleaner long-term. The Messages page should be for direct human communication only.

**Implementation Plan:**
- Build new `/trade-alerts` page with folder structure: Pending | Declined | Completed
- Add a dedicated trade bell icon to the top navigation (separate from the existing mail icon)
- The bell turns solid yellow and flashes when there are unread trade alerts
- Remove the "Trade" folder and all trade proposal rendering from `Messages.tsx`
- `Messages.tsx` will only show item inquiries and direct messages going forward
- The existing `tradeMessages` (chat within a trade thread) will be accessible from the Trade Alerts page, not Messages
- Add new `tradeAlerts` table to the database (as specified in the architecture doc)

---

## Decision 3: User Suspension System

**Original Spec:** Check if users are suspended before allowing trades. No implementation existed.

**Decision:** ✅ **Add `isSuspended` to `users` table. Add Suspend/Unsuspend UI to Admin Dashboard.**

**Rationale:** Suspension is a necessary safety feature. Tracking suspension history provides an audit trail for dispute resolution.

**Implementation Plan:**
- Add `isSuspended TINYINT(1) DEFAULT 0` to the `users` table
- Add `suspendedAt TIMESTAMP NULL` to the `users` table
- Add `suspendedReason TEXT NULL` to the `users` table
- Add `suspendedBy INT NULL` (admin user ID) to the `users` table
- In the Admin Dashboard:
  - Add a **"Suspend" button** on the existing Users tab (next to each user row)
  - Clicking Suspend opens a modal to enter a reason, then sets `isSuspended = 1`
  - Add a new **"Suspended Users" tab** that lists all currently suspended users with:
    - Username, display name, suspension date, reason, suspended by
    - A **"Remove Suspension"** button that sets `isSuspended = 0` and clears suspension fields
- Trade initiation logic must check `isSuspended` for both the initiator and recipient

---

## Decision 4: Scheduled Job Runner for Daily Reminders

**Original Spec:** Daily reminder alerts for overdue trades (10-day, 20-day, 30-day warnings).

**Decision:** ✅ **Add a scheduled daily task using the Manus platform scheduler.**

**Implementation Plan:**
- Create a new protected endpoint: `POST /api/cron/trade-reminders`
- The endpoint sweeps the `tradeProposals` table for:
  - Trades in `accepted` status with `shippingDeadline` approaching (5-day, 2-day, 0-day warnings)
  - Trades in `shipped` status with `receiptDeadline` approaching
  - Trades in `negotiating` status with no activity for 10, 20, 30 days (auto-cancel at 30)
- For each match, create a `tradeAlerts` record for the relevant user(s)
- Register this endpoint as a daily scheduled task via `manus-config schedule`

---

## Decision 5: Trade Reviews — 4-Column Rating System

**Original Spec:** 4 separate rating columns + calculated overall average.

**Decision:** ✅ **Replace the existing single `rating` column with 4 new columns.**

**Rationale:** Zero real trade reviews currently exist in the database, so migration risk is minimal.

**Implementation Plan:**
- Drop the existing `rating INT` column from `tradeReviews`
- Add the following columns:
  - `tradeExperienceRating INT` (0–5)
  - `itemConditionRating INT` (0–5)
  - `communicationRating INT` (0–5)
  - `shippingSpeedRating INT` (0–5)
  - `overallRating DECIMAL(2,1)` — calculated as average of the 4 above
- Update the `leaveTradeReview` function in `db.ts` and the review form in the frontend
- Add a `userRatingSummary` table (as specified in architecture doc) to cache aggregated ratings per user

---

## Decision 6: Trade Reference Number Format

**Original Spec:** `TR-MMDDYY-XXXXXX` (date-based, e.g., `TR-061426-000001`)

**Decision:** ✅ **Use simple sequential format: `TR-000001`, `TR-000002`, etc.**

**Rationale:** Date-based formats can cause collisions across timezones and make ordering ambiguous. A simple auto-increment prefix is collision-proof, easy to read, and easier to implement.

**Implementation Plan:**
- Generate `tradeReferenceNumber` by querying `MAX(id)` from `tradeProposals` at creation time and zero-padding to 6 digits with `TR-` prefix
- Example: `TR-000001`, `TR-000042`, `TR-001337`
- This number is assigned once at creation and never changes

---

## Additional Open Questions (To Discuss Before July 17)

See `TRADE_FLOW_OPEN_QUESTIONS.md` for unresolved questions that still need product decisions.

---

## Summary of New Database Tables Required

| Table | Purpose | References |
|---|---|---|
| `tradeAlerts` | Trade-specific notifications (bell icon) | `tradeProposals.id` |
| `tradeTrackingNumbers` | Shipping tracking per user per trade | `tradeProposals.id` |
| `tradeReceiptConfirmation` | Receipt confirmation per user per trade | `tradeProposals.id` |
| `tradeComplaints` | Dispute/complaint filings | `tradeProposals.id` |
| `userRatingSummary` | Cached aggregated ratings per user | `users.id` |

## Summary of Modified Tables

| Table | Changes |
|---|---|
| `tradeProposals` | Add 10+ new columns; expand status enum |
| `tradeReviews` | Replace single `rating` with 4 sub-ratings + `overallRating` |
| `users` | Add `isSuspended`, `suspendedAt`, `suspendedReason`, `suspendedBy` |
