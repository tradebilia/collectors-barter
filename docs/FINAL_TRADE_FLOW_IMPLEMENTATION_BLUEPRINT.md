# Trade Flow — Final Implementation Blueprint

**Version:** 3.0
**Date:** July 16, 2026
**Status:** Approved — Ready for Implementation (Manus 1.6 Max)

This document consolidates every decision from the brainstorming session on July 16, 2026, cross-referenced against `TRADE_FLOW_DECISIONS.md` and `TRADE_FLOW_OPEN_QUESTIONS.md` to ensure zero conflicts.

---

## Architecture Summary

The Trade Flow expands the existing `tradeProposals` table (per Decision 1). There is no new parent `trades` table. All new tables (`tradeAlerts`, `tradeTrackingNumbers`, `tradeReceiptConfirmation`, `tradeComplaints`) reference `tradeProposals.id`. The Trade Reference Number uses the simple sequential format `TR-000001` (per Decision 6).

---

## Page 1: The Trade Hub (Dashboard)

The Trade Hub is the central "Inbox" for all trade activity. It is accessed via the "My Trades" button on the main page and the yellow bell icon in the top navigation.

### Layout Structure

The page uses a 3-column Master-Detail layout. The right panel stays empty until a card in the center is clicked.

| Column | Width | Content |
|--------|-------|---------|
| Sidebar (Left) | 20% | 5 Folders: Negotiating, Accepted, Shipped, Declined, Completed |
| Inbox (Center) | 40% | High-density card list with search bar at top |
| Preview (Right) | 40% | Item image, trader reputation, verification badges, "Enter War Room" button |

### Center Column Card Design

Each card shows the following information in a compact format: User Avatar, Username, Trade Reference Number (TR-XXXXXX), contextual status label, "Last Active" timer, and an unread badge (red dot) for new messages or counter-offers. Cards requiring user action display an "ACTION NEEDED" tag with a yellow left-border highlight.

### Right Panel Preview

When a card is clicked, the right panel shows: a large image of the item in question, the item's listed value, the trader's star rating, their verification badges (eBay, Facebook, LinkedIn), their online status (green dot = online, red dot = offline), and a prominent "Enter War Room" button.

### Additional Features

A search bar at the top allows filtering by username or Trade Reference Number. Quick filter buttons (All, Unread, High Value) provide fast access to specific subsets. A "Bulk Actions" toggle enables selecting multiple cards for batch decline operations.

---

## Page 2: The War Room (Negotiation)

The War Room is the dedicated page where the actual trade is built, verified, and finalized. It is accessed by clicking "Enter War Room" from the Trade Hub.

### Header

The header contains the Trade Reference Number, a 5-stage progress tracker (Proposed, Negotiating, Accepted, Shipped, Completed), a "Back to Trade Hub" link, and the other user's online status. The auto-cancel countdown timer only appears when close to the 30-day limit (after 20 days of inactivity).

### The Trade Table (Top Section)

A split-screen comparison showing "Your Side" vs "Their Side." Each item card displays a thumbnail, title, listed price (large), and AI Market Value from eBay sold listings (smaller, below). Items can be removed with a small [X] button (instant, no confirmation). The table is collapsible—users can toggle between expanded (all items visible) and collapsed (total values only).

Below the items, separate cash input fields are provided: "Cash You Receive" and "Cash You Pay." When cash is included, the platform disclaimer is shown: "Tradebilia is not liable for cash transactions."

The Fairness Meter sits below the table as a visual bar comparing total values. It is grayed out until items exist on both sides. Next to it, the "AI Analyze" button triggers an inline analysis that appears in the chat timeline with a Trade Score (1-100) and a brief explanation.

### Service & Trust (Middle Section)

This section contains the Middle Man Service checkbox (both parties must agree before it takes effect), the other user's verification badges (LinkedIn, eBay, Facebook), and a "Start Video Call" button. Either user can initiate a video call; the other must accept. The video appears as a floating, draggable "Verification Window" with Take Snapshot, Mute, and Stop controls. Snapshots are saved directly into the Chat & Timeline.

### Interaction & Communication (Bottom Section)

The Inventory Browser opens as a slide-out panel from the side when clicked. It shows the other user's full inventory organized by category with search functionality. Users click items to add them to the trade table.

The Chat & Timeline is a single chronological feed that integrates both user messages and system events (e.g., "David added Charizard," "Video snapshot saved," "AI Trade Score: 87/100"). Messages have no character limit.

Private Notes are accessed via a slide-out drawer. These are "for your eyes only" and invisible to the other user.

### Footer Actions

The footer contains: "Get Opinion" (generates anonymous community voting link, only active when items are on both sides), "Decline" (opens free-text reason box), "Update Proposal" (saves changes to the current offer), and "Accept Trade" (launches the Trade Contract modal).

### First-Time Entry

When User B enters the War Room for the first time (from an inquiry), only the item they are interested in appears on "Your Side." "Their Side" is empty. The user can then click to open the Inventory Browser slide-out to add items, or simply request cash only.

---

## Page 3: The War Room — Shipping Stage

After both users confirm the Trade Contract, the War Room transforms. The Trade Table remains visible at the top (read-only, no [X] buttons). Below it, a Shipping Information section appears with auto-populated contact details for both users (from their profiles).

A Tracking section allows each user to select a carrier (USPS, UPS, FedEx, DHL, or "Other" with a free-text field) and enter tracking numbers. Submitted tracking numbers become clickable links to the carrier's tracking page.

The footer changes to show three options: "Items Received" (the happy path), "Received but Damaged" (triggers a complaint record), and "File Complaint" (a smaller link for other issues like wrong item or missing items).

If receipt is not confirmed within 15 days of tracking submission, the system automatically flags the trade for admin review and escalates to disputed status.

---

## Page 4: The Trade Contract (Modal)

A full-screen confirmation modal that appears after clicking "Accept Trade." It displays a clear summary of exactly what each user is giving and receiving, including items, cash amounts, and whether the Middle Man service is selected. The platform disclaimer is always shown when cash is involved.

The user must check a checkbox ("I understand that by confirming, I am locking in this trade") before the "Confirm & Lock" button becomes active. After User A confirms, User B has 72 hours to also confirm or the trade auto-cancels (per Q36).

---

## Page 5: The Trade Voting Page (Community)

An anonymous page where logged-in Tradebilia users can evaluate a trade. Generated via the "Get Opinion" button in the War Room. The link expires after 3 days.

The page shows an anonymous side-by-side comparison ("Trader A" vs "Trader B" with no real usernames), a 3-option verdict poll (Steal, Fair Trade, Pass), aggregated community results, and a comments section for detailed feedback.

---

## Page 6: Feedback (Blind Review)

After both users confirm receipt, the feedback form appears in the War Room. Users rate 4 categories (Trade Experience, Item Condition, Communication, Shipping Speed) on a 0-5 star scale. An optional written review and up to 5 photos can be added. Reviews are hidden until both users submit or 7 days pass (blind review per Q18/Q27). Reviews cannot be edited after submission, but photos can be added later by the reviewer (removed only by admin). Feedback is mandatory to fully close a trade.

---

## Pro Features (New from July 16 Brainstorming)

| Feature | Location | Status |
|---------|----------|--------|
| AI Trade Analyzer (eBay sold data) | War Room — inline below Fairness Meter | Phase 1 |
| Video Verification (WebRTC) | War Room — floating draggable window | Phase 1 |
| Middle Man Service | War Room — checkbox (mutual agreement) | Phase 1 (UI only, payment TBD) |
| Trade Voting (Community) | Separate page, 3-day expiry | Phase 1 |
| LinkedIn Verification | User profile + Trade Hub preview | Phase 1 |
| Private Notes (Slide-drawer) | War Room — personal scratchpad | Phase 1 |
| Collapsible Trade Table | War Room — expand/collapse toggle | Phase 1 |
| Live Grading Verification | War Room — auto-check cert numbers | Phase 2/3 |
| Integrated Shipping Labels | War Room — buy/print labels | Phase 2/3 |

---

## Edge-Case Logic (Finalized July 16)

### Value Visibility
The main display shows the User's Listed Price. A secondary line shows the AI Market Value (from eBay sold listings) in a smaller font for context.

### Middle Man Logistics
If one user requests the service, the other must click an "Approve Middle Man" button. The trade cannot move to the Accepted stage until both have agreed (or the request is deselected). Both users are charged a fee (payment method TBD).

### Dynamic Inventory Updates
If an item in a negotiation is sold or traded elsewhere, it is instantly removed from all other active trade tables. A system message is posted in the chat timeline: "Item [Name] is no longer available and has been removed from this proposal."

### Table Management
Users can toggle between Expanded (see all items) and Collapsed (see total value only) to save screen space during long negotiations with many items.

### Dispute Management
There is no manual "Dispute" button during negotiation. During the shipping stage, users have "Received but Damaged" (prominent button) and "File Complaint" (smaller link). The system automatically flags for admin review if receipt is not confirmed within 15 days.

### Online Status
Green dot = Online, Red dot = Offline. Shown in the Trade Hub preview panel and the War Room header.

### Suspension Mid-Trade
Per Q24, trades are frozen (not cancelled) when a user is suspended. They resume when the suspension is lifted.

### Item Deletion Mid-Trade
Per Q33, users can delete items during negotiation (which auto-cancels the trade with a system message). Deletion is blocked during accepted trades.


---

## Backend & Admin Rules (From Open Questions Audit)

The following rules do not affect page layouts but are critical for implementation logic. Each is sourced from `TRADE_FLOW_OPEN_QUESTIONS.md`.

### Marketplace Listing Behavior

Items that are in an active negotiation remain visible in the marketplace but display an **"In Trade"** badge. The item is only removed from the marketplace (status changed to `traded`) when both users formally accept the trade and it moves to the `accepted` stage. This allows multiple users to express interest in the same item simultaneously (per Q3).

### Item Editing Restrictions Mid-Trade

Once a listing is created, the title, description, and category are permanently locked. Only **photos** and **value** can be edited by the owner at any time. If the value is changed mid-negotiation, the Trade Summary in the War Room reflects the updated value in real-time. The other party will see the new value (per Q34).

### Profile & Rating Display Rules

All user profiles are always public and cannot be hidden (per Q29). A user's star rating only appears on their profile after they have at least **1 completed trade review** (per Q10). Before that, the profile shows "No ratings yet" (per Q28).

### Account Deletion Restriction

A user cannot delete their account while they have any active trades (status: `negotiating`, `accepted`, or `shipped`). The system blocks the deletion request and displays a message: "Please resolve all active trades before deleting your account" (per Q23).

### Suspended User Marketplace Visibility

When a user is suspended, all of their listings are **hidden from the marketplace** and search results. They reappear automatically when the suspension is lifted (per Q32).

### Admin Powers

Admins have the following capabilities during trade oversight:

- **Full Message Access**: Admins can read the complete trade message thread for any trade, including during complaint review (per Q22).
- **Force Status Override**: Admins can manually set any trade's status to `completed` or `cancelled` from the Admin Dashboard at any time, even without a formal complaint (per Q31).
- **Complaint Resolution**: When resolving a complaint, the admin chooses the final outcome — either `completed` (trade stands) or `cancelled` (trade voided). If cancelled, associated reviews are removed (per Q21).

### Review Persistence After Complaints

If a complaint is filed after a trade is completed, the existing reviews remain published and visible. Reviews are only removed if the admin decides to **cancel/void** the trade as part of the complaint resolution (per Q30).
