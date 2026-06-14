# Trade Flow - Stage 2: Negotiation & Proposal Building Specification

**Version:** 1.0  
**Date:** June 14, 2026  
**Status:** Complete Specification (Ready for Implementation on 6/17/26)

---

## Overview

Stage 2 is where the actual negotiation happens. User B reviews User A's inventory and proposes items and/or cash to exchange for User A's item. Both users can counter-propose multiple times until they reach mutual agreement. This stage involves complex proposal management, item selection, cash negotiation, and edit capabilities.

---

## Stage 2 Flow Diagram

```
User B Clicks "View Inventory"
        ↓
Trade Status: initiated → negotiating
        ↓
User B Sees User A's Inventory
(All items, organized by category tabs + search)
        ↓
User B Selects Items (Checkboxes)
        ↓
Trade Summary Updates in Real-Time
(Shows items + values + cash on each side)
        ↓
User B Adds Optional Cash Amount
        ↓
User B Clicks "Send Proposal"
        ↓
User A Gets Trade Alert
(Original message flagged as "updated")
        ↓
User A Reviews Proposal in Trade Panel
        ↓
User A Can:
├─ Accept (→ User B gets alert, must accept within 3 days)
├─ Reject (with optional message)
└─ Counter-Propose (select different items/cash)
        ↓
Back and Forth Until:
├─ Both Accept (→ Stage 3: Shipping)
├─ One Cancels (→ Trade Cancelled)
└─ 10 Days No Activity (→ Auto-Cancel)
```

---

## Key Concepts

### Current Proposal
- **Definition:** The most recent proposal sent by either user
- **Persistence:** Overwrites previous proposal when updated
- **Display:** Always shows the latest proposal in Trade Summary
- **History:** Message thread shows all comments/rejections, but only current proposal is displayed

### Trade Summary Panel
- **Location:** Right side of trade thread (persistent, always visible)
- **Content:** Visual representation of current proposal
- **Layout:**
  - Left side: User A (initiator) with items + cash
  - Right side: User B with items + cash
  - Arrows showing direction of exchange
  - Text summary: "User A receives [items/cash], User B receives [items/cash]"

### Proposal Edit vs. New Proposal
- **Edit:** User B can modify their proposal before User A responds
- **Resubmit:** When User B edits and resubmits, it overwrites the previous proposal
- **Alert:** User A gets ONE alert if they haven't read any updates; subsequent updates don't trigger new alerts until User A reads the current proposal

### Activity Definition
- **Counts as Activity:** Sending counter-proposal, modifying proposal, sending message
- **Does NOT Count:** Viewing the trade thread, viewing inventory
- **Purpose:** Determines auto-cancel timer (10 days of no activity)

### Auto-Cancel Mechanism
- **Timeline:**
  - Days 1-9: No notification
  - Day 10: Recipient gets notification "No activity in 10 days. Trade will auto-cancel in 4 days"
  - Day 14: Trade auto-cancels if no activity
- **Reset:** Any activity (counter-proposal, message, modification) resets the 10-day timer

---

## User Flows

### User B: Viewing Inventory & Creating Proposal

**Prerequisites:**
- Trade is in `negotiating` status
- User B has clicked "View Inventory" button

**Flow:**

1. User B clicks "View Inventory" button
2. System loads User A's inventory:
   - All items available
   - Organized by category tabs (+ "All" tab)
   - Search functionality available
3. Each item in list shows:
   - Item thumbnail
   - Item title
   - Item value (as entered by User A)
   - Clickable to view full details in popup
4. User B selects items using checkboxes:
   - Can select unlimited items
   - Can select same category or mixed categories
   - Can select items multiple times (if User A removes/re-adds item)
5. As User B selects items, Trade Summary updates in real-time:
   - Shows selected items on User B's side
   - Shows running total value for User B's side
   - Shows User A's original item on User A's side
   - Shows User A's item value
6. User B can add cash amount:
   - "User B Pays" field: User B offers cash to User A
   - "User A Pays" field: User B requests cash from User A
   - Both fields optional
   - Positive numbers only, decimals allowed
   - No min/max limits
   - Cash labeled with "Receive" (green) or "Pay" (red)
7. User B clicks "Send Proposal" button:
   - Button only enabled if at least one item selected OR cash suggested
   - Button disabled (grayed out) if nothing selected
8. Optional confirmation dialog:
   - Shows summary of proposal
   - Shows items, values, cash amounts
   - "Are you sure you want to send this proposal?"
9. User B can add optional message:
   - Message stays in message thread (not in proposal)
   - Optional, not required
   - No character limit
10. User B clicks "Send Proposal"
11. System updates Trade Summary with new proposal
12. User A gets trade alert: "User B sent a counter-proposal"
13. Original message gets flagged to show something has been updated

---

### User B: Editing Proposal Before User A Responds

**Prerequisites:**
- User B has sent a proposal
- User A has NOT yet responded (proposal still pending)
- Trade is in `negotiating` status

**Flow:**

1. User B can modify the proposal at any time while waiting for User A
2. User B can:
   - Add/remove items from proposal
   - Adjust cash amounts
   - Change selected items
3. User B clicks "Update Proposal" button (changes from "Send Proposal" after first submission)
4. System updates Trade Summary with new proposal
5. User A is NOT notified of every update
6. When User A views the trade:
   - They see the LATEST proposal only
   - Previous proposals are not shown (only current)
   - Message thread shows rejection/adjustment history

**Edit Restrictions:**
- Can only edit while User A has NOT responded
- Once User A sends a counter-proposal, User B can no longer edit
- User B must send a new counter-proposal instead

---

### User A: Reviewing & Responding to Proposal

**Prerequisites:**
- User B has sent a proposal
- Trade is in `negotiating` status

**Flow:**

1. User A receives trade alert: "User B sent a counter-proposal"
2. User A clicks alert or navigates to trade thread
3. User A sees Trade Summary with User B's proposal:
   - User B's items on right side
   - User B's cash (if any) on right side
   - User A's original item on left side
   - User A's requested cash (if any) on left side
4. User A can:
   - **Accept:** Accept the proposal as-is
   - **Reject:** Reject with optional message
   - **Counter-Propose:** Send their own counter-proposal

### User A: Accepting a Proposal

**Flow:**

1. User A reviews proposal and clicks "Accept Proposal" button
2. Confirmation dialog appears:
   - Shows final items User A is giving
   - Shows final items User A is receiving
   - Shows final cash amounts
   - "Are you sure you want to accept this trade?"
   - Includes warning: "You are locking in your commitment"
3. User A confirms acceptance
4. Trade status remains `negotiating` (not yet locked)
5. User B receives trade alert: "User A accepted your proposal - You have 3 days to accept"
6. User B must accept within 3 days:
   - Day 1-3: User B can accept
   - Day 3: If User B hasn't accepted, trade auto-cancels
   - Day 3: User B gets warning notification on Day 2
7. When User B accepts:
   - Trade status changes to `accepted`
   - Both users locked in
   - Stage 3 begins (Shipping & Verification)

**Important:** Once User A accepts, User A CANNOT remove items or modify their side of the proposal. Items are locked in.

### User A: Rejecting a Proposal

**Flow:**

1. User A clicks "Reject Proposal" button
2. Optional message dialog appears:
   - Text field for rejection reason/message
   - Optional, not required
   - No character limit
3. User A submits rejection (with or without message)
4. Message appears in message thread
5. User B receives trade alert: "User B rejected your proposal"
6. Trade remains in `negotiating` status
7. User B can:
   - Adjust their proposal and resubmit
   - Send a new counter-proposal
   - Send a message asking for clarification

### User A: Counter-Proposing

**Flow:**

1. User A wants to propose different items/cash
2. User A can:
   - View their own inventory
   - Select items from their inventory to add as "sweeteners"
   - Adjust cash amounts they're requesting or offering
3. User A clicks "Send Counter-Proposal"
4. Trade Summary updates with User A's new proposal
5. User B receives trade alert: "User A sent a counter-proposal"
6. User B can now:
   - Accept User A's counter-proposal
   - Reject and ask for adjustment
   - Send their own counter-proposal

---

## Trade Summary Display

### Layout

```
┌──────────────────────────────────────────────────────────┐
│                    TRADE SUMMARY                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  User A (Initiator)        ←→        User B             │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Items Offered:                  Items Offered:         │
│  • [Item 1] - $50                • [Item 1] - $75       │
│  • [Item 2] - $100               • [Item 2] - $50       │
│  Total: $150                     Total: $125            │
│                                                          │
│  Cash:                           Cash:                  │
│  Receive: $25 (green)            Pay: $25 (red)         │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Summary:                                                │
│  User A receives [Item 1, Item 2, $25 cash]             │
│  User B receives [Item 1, Item 2, pays $25 cash]        │
│                                                          │
│  [Accept] [Reject] [Counter-Propose]                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Display Rules

- **Left Side (User A):** Always shows User A (initiator)
- **Right Side (User B):** Always shows User B
- **Items:** Show thumbnail, title, and value
- **Cash:** Labeled "Receive" (green) or "Pay" (red)
- **Arrows:** Show direction of exchange
- **Text Summary:** Clear English description of exchange
- **Current Proposal Only:** Always shows latest proposal, not history

---

## Inventory Viewing

### User B Viewing User A's Inventory

**Display:**
- All items from User A's inventory
- Organized by category tabs (+ "All" tab)
- Each item shows:
  - Thumbnail
  - Title
  - Value (as entered by User A)
  - Condition (if available)
  - Grade (if available)
- Search functionality available

**Item Details Popup:**
- Clicking item shows full details in popup:
  - Full item description
  - Condition
  - Grade
  - All images
  - Value
  - Checkbox to add/remove from proposal (optional)
- Can close popup and checkbox from main list instead

**Item Availability:**
- Shows ALL items from User A's inventory
- Includes items already in other trade proposals
- Includes items already in accepted trades
- No filtering of "unavailable" items at this stage

### User A Adding Sweetener Items

**When User A Counter-Proposes:**
- User A can add additional items from their own inventory
- Acts as "sweetener" to make deal more attractive
- User A can select from their own inventory
- Can add items they already offered (if User B removed them)
- Items appear on User A's side of Trade Summary

---

## Message Thread

### Message Thread Display

**Location:** Below Trade Summary in trade panel

**Content:**
- All messages between User A and User B
- Chronological order (oldest to newest)
- Each message shows:
  - Sender name
  - Timestamp (date and time)
  - Message text
  - Proposal update notifications (flagged messages)

**Message Types:**
1. **Regular Message:** User comment/question
2. **Rejection Message:** "User X rejected proposal" + optional reason
3. **Proposal Update Notification:** "User X updated proposal at 2:15 PM"

**Message Sending:**
- Either user can send messages at any time
- Messages optional (not required for negotiation)
- No character limit
- Messages stay in thread permanently
- Messages do NOT trigger new alerts (only proposal changes do)

---

## Proposal Notification Logic

### Alert Frequency

**Scenario 1: User B sends multiple updates, User A hasn't read any**
- User B sends Proposal 1 → User A gets alert
- User B updates to Proposal 2 → NO new alert
- User B updates to Proposal 3 → NO new alert
- User A only gets 1 alert for all updates
- When User A opens trade, they see Proposal 3 (latest)

**Scenario 2: User B sends update, User A reads it, User B sends another**
- User B sends Proposal 1 → User A gets alert
- User A reads Proposal 1
- User B updates to Proposal 2 → User A gets NEW alert
- User A sees Proposal 2 (latest)

**Implementation:**
- Track if User A has read the current proposal
- Only send new alert if proposal changes AND User A has read the previous one

---

## Data Model

### Trade Proposal Table (Updated)

```sql
CREATE TABLE tradeProposals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  proposerId INT NOT NULL REFERENCES users(id), -- Who sent this proposal
  proposalData JSON NOT NULL, -- Structured proposal data
  -- proposalData structure:
  -- {
  --   "proposedItems": [
  --     { "listingId": 123, "title": "...", "value": 50 }
  --   ],
  --   "cashFromProposer": 25,      -- Cash proposer offers
  --   "cashFromRecipient": 10,     -- Cash proposer requests
  --   "message": "Optional message"
  -- }
  isCurrentProposal BOOLEAN DEFAULT TRUE, -- Only one current per trade
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_trade (tradeId),
  INDEX idx_current (tradeId, isCurrentProposal)
);
```

### Trade Message Table (Already Exists)

```sql
CREATE TABLE tradeMessages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  senderId INT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  messageType ENUM('regular', 'rejection', 'proposalUpdate') DEFAULT 'regular',
  rejectionReason TEXT, -- If messageType = 'rejection'
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_trade (tradeId),
  INDEX idx_sender (senderId)
);
```

### Proposal Read Status Table (New)

```sql
CREATE TABLE proposalReadStatus (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  userId INT NOT NULL REFERENCES users(id),
  lastReadProposalId INT REFERENCES tradeProposals(id),
  isRead BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP,
  
  UNIQUE KEY unique_trade_user (tradeId, userId),
  INDEX idx_trade (tradeId)
);
```

---

## API Procedures (tRPC)

### `market.sendTradeProposal`

**Input:**
```typescript
{
  tradeId: number;
  proposedListingIds: number[];    // Items User B is offering
  cashFromProposer?: number;       // Cash User B offers to User A
  cashFromRecipient?: number;      // Cash User B requests from User A
  message?: string;                // Optional message
}
```

**Output:**
```typescript
{
  success: boolean;
  proposal: {
    id: number;
    tradeId: number;
    proposedItems: Array<{ listingId, title, value }>;
    cashFromProposer?: number;
    cashFromRecipient?: number;
    createdAt: Date;
  };
}
```

**Validation:**
- User must be authenticated
- User must be recipient of trade (User B)
- Trade must be in `negotiating` status
- At least one item OR cash must be provided
- Cash amounts must be positive numbers
- All listing IDs must exist and be from User A

**Side Effects:**
- Creates new trade proposal record
- Marks previous proposal as not current
- Creates trade message (proposal update notification)
- Sends trade alert to User A (if they haven't read current proposal)
- Logs to admin trade log

---

### `market.acceptTradeProposal`

**Input:**
```typescript
{
  tradeId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Validation:**
- User must be authenticated
- User must be recipient of current proposal
- Trade must be in `negotiating` status
- Current proposal must exist

**Side Effects:**
- Marks proposal as `accepted`
- Sends trade alert to other user: "User X accepted your proposal - You have 3 days to accept"
- Starts 3-day acceptance timer
- Logs to admin trade log

---

### `market.rejectTradeProposal`

**Input:**
```typescript
{
  tradeId: number;
  reason?: string;  // Optional rejection reason
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Validation:**
- User must be authenticated
- User must be recipient of current proposal
- Trade must be in `negotiating` status

**Side Effects:**
- Creates trade message with rejection reason
- Sends trade alert to other user: "User X rejected your proposal"
- Trade remains in `negotiating` status
- Logs to admin trade log

---

### `market.getTradeDetails`

**Input:**
```typescript
{
  tradeId: number;
}
```

**Output:**
```typescript
{
  trade: {
    id: number;
    tradeReferenceNumber: string;
    initiatorId: number;
    recipientId: number;
    requestedListingId: number;
    status: string;
    currentProposal: {
      id: number;
      proposedItems: Array<{ listingId, title, value }>;
      cashFromProposer?: number;
      cashFromRecipient?: number;
      createdAt: Date;
      createdBy: string;
    };
    messages: Array<{
      id: number;
      senderId: number;
      senderName: string;
      message: string;
      messageType: string;
      createdAt: Date;
    }>;
    userHasReadCurrentProposal: boolean;
  };
}
```

---

## Notifications

### Trade Alert: Counter-Proposal Sent

**Trigger:** User B sends a proposal

**Content:**
- "User B sent a counter-proposal"
- Link to view trade
- Preview of proposal (optional)

**Frequency:**
- Only if User A hasn't read the previous proposal
- Multiple updates don't trigger multiple alerts

---

### Trade Alert: Proposal Rejected

**Trigger:** User A rejects User B's proposal

**Content:**
- "User B rejected your proposal"
- Optional rejection reason (if provided)
- Link to view trade

---

### Trade Alert: Proposal Accepted

**Trigger:** User A accepts User B's proposal

**Content:**
- "User A accepted your proposal - You have 3 days to accept"
- Shows proposal details
- Link to accept/reject

---

### Auto-Cancel Warning

**Trigger:** 10 days of no activity

**Timeline:**
- Day 10: Recipient gets notification
  - "No activity in 10 days. Trade will auto-cancel in 4 days"
  - Link to view trade
- Day 14: Trade auto-cancels if no activity

**Reset:** Any activity (proposal, message, modification) resets the 10-day timer

---

## Admin Dashboard

### Trade Reference Tab - Stage 2 View

**When Admin Clicks Trade Reference:**

**Display:**
- Trade Reference Number
- Initiator and Recipient names
- Original item being traded
- Current Status: `negotiating`
- Current Proposal:
  - Items from each side
  - Cash amounts from each side
  - Who sent current proposal
  - When it was sent
- Message Thread:
  - All messages and proposal updates
  - Chronological order
  - Timestamps
- Trade Timeline:
  - When initiated
  - When moved to negotiating
  - All proposal updates
  - All rejections
  - All modifications

**Admin Actions:**
- View full proposal details
- View message thread
- Cancel trade if needed
- No editing of proposals

---

## Edge Cases & Error Handling

### Item Removal During Negotiation

**Scenario:** User A has Item X in trade with User B, and Item X is also in a proposal with User C

**When User A's Trade with User C is Accepted:**
- Item X is removed from User B's proposal
- User B gets trade alert: "Item X was removed from your proposal"
- Trade remains in `negotiating` status
- User B can adjust their proposal (remove Item X, select different items)

### Multiple Simultaneous Negotiations

**Scenario:** User A is negotiating with User B AND User C for different items

**Behavior:**
- Each trade is completely independent
- Each has separate trade reference number
- Each has separate proposal thread
- Items can be in multiple proposals simultaneously
- Once trade is accepted with one user, items are locked for that trade

### Proposal Editing After Rejection

**Scenario:** User A rejects User B's proposal with message "Need better items"

**Behavior:**
- User B can immediately edit their proposal
- User B doesn't need to wait for User A to acknowledge rejection
- User B resubmits updated proposal
- User A gets trade alert for the update

### Cash-Only Trade

**Scenario:** User B proposes just $100 cash (no items) for User A's $100 item

**Behavior:**
- Allowed and treated as valid proposal
- Trade Summary shows: "User A receives $100 cash, User B receives [Item]"
- Both users can accept/reject like any other proposal

### Sweetener Item Already Offered

**Scenario:** User A originally offered Item X, User B proposed Item Y + $50, User A counter-proposes Item X + Item Z + $25

**Behavior:**
- Allowed - User A can re-offer Item X as part of counter-proposal
- Trade Summary shows all items clearly
- No restriction on re-offering items

### Proposal Confirmation Dialog

**When User Clicks "Send Proposal" or "Accept":**
- Confirmation dialog shows:
  - All items on each side
  - All cash amounts
  - Clear summary
  - "Are you sure?" confirmation
- User must confirm before action completes

---

## Security Considerations

### Authorization
- Only recipient can send proposals
- Only recipient can reject proposals
- Only either user can send messages
- Only initiator can view User A's inventory
- Only recipient can view User A's inventory

### Data Validation
- Listing IDs must exist and belong to correct user
- Cash amounts must be positive numbers
- No negative values allowed
- Message content sanitized (no XSS)

### Audit Trail
- All proposals logged with timestamp and user ID
- All rejections logged with reason (if provided)
- All modifications logged
- Admin can see full history

---

## Performance Considerations

### Database Indexes
- Index on `(tradeId, isCurrentProposal)` for quick lookup of current proposal
- Index on `tradeId` for message queries
- Index on `(tradeId, userId)` for proposal read status

### Query Optimization
- Load current proposal only (not all historical proposals)
- Paginate message thread (load newest 50 first)
- Use composite indexes for common queries

---

## Testing Checklist

### Unit Tests
- [ ] Proposal creation with items and cash
- [ ] Proposal update overwrites previous
- [ ] Cash-only proposals allowed
- [ ] Sweetener items can be re-offered
- [ ] Rejection with optional reason
- [ ] Acceptance with confirmation

### Integration Tests
- [ ] End-to-end: Select items → Send proposal → Accept
- [ ] End-to-end: Send proposal → Reject → Counter-propose
- [ ] Multiple proposals for same item
- [ ] Item removal cascade when trade accepted
- [ ] Auto-cancel after 10 days no activity
- [ ] Proposal alert frequency (single alert for multiple updates)

### UI/UX Tests
- [ ] Trade Summary updates in real-time as items selected
- [ ] Cash fields labeled "Receive" (green) and "Pay" (red)
- [ ] "Send Proposal" button disabled when nothing selected
- [ ] "Update Proposal" button appears after first submission
- [ ] Confirmation dialogs show correct summary
- [ ] Message thread shows proposal update notifications

---

## Transition to Stage 3

**Trigger:** Both users accept the proposal

**What Happens:**
1. User A accepts proposal
2. User B gets alert with 3-day acceptance window
3. User B accepts within 3 days
4. Trade status changes from `negotiating` to `accepted`
5. Both users are locked in (cannot modify)
6. Stage 3 begins (Shipping & Verification)
7. Trade panel updates to show shipping information section

**Trade Reference Persistence:**
- Trade reference number remains the same
- Follows trade through all subsequent stages

---

## Summary

Stage 2 is the heart of the trade negotiation where:
1. Users propose items and cash amounts
2. Both users can counter-propose multiple times
3. Proposals are editable until the other user responds
4. Auto-cancel after 10 days of inactivity
5. Mutual acceptance required to lock in the trade
6. 3-day window for second user to accept after first user accepts
7. All activity logged for admin oversight

Upon mutual acceptance, the trade moves to Stage 3 (Shipping & Verification) where users exchange shipping information and tracking numbers.

---

**Next:** See TRADE_FLOW_STAGE_3_SPECIFICATION.md for Shipping & Verification details.
