# Trade Flow - Stage 1: Trade Initiation Specification

**Version:** 1.0  
**Date:** June 14, 2026  
**Status:** Complete Specification (Ready for Implementation on 6/17/26)

---

## Overview

Stage 1 is the initial phase where a collector (User A) expresses interest in trading for another collector's (User B) item. This stage establishes the trade relationship, generates a unique reference number, and notifies User B of the interest. Stage 1 ends when User B either declines the proposal or chooses to proceed to Stage 2 (Negotiation).

---

## Stage 1 Flow Diagram

```
User A Views Item Detail
        ↓
User A Clicks "Trade Proposal" Button
        ↓
Confirmation Popup Appears
        ↓
System Creates Trade Reference (TR-MMDDYY-XXXXXX)
        ↓
Trade Alert Sent to User B
        ↓
User A Sees Confirmation
Button Changes to "Negotiating in Process"
        ↓
User B Receives Trade Alert
Bell Icon Flashes Yellow + Unread Count
        ↓
User B Can:
├─ Decline (with optional reason)
├─ View User A's Inventory (→ Stage 2)
└─ Send Message to User A
```

---

## Key Concepts

### Trade Reference Number
- **Format:** `TR-MMDDYY-XXXXXX` (e.g., TR-061426-000001)
- **Generation:** Sequential number generated at trade initiation
- **Persistence:** Remains constant throughout entire trade lifecycle
- **Visibility:** Shown to both users and admin
- **Purpose:** Unique identifier for audit trail, admin tracking, and dispute resolution

### Trade Alert
- **Definition:** Notification sent to User B when User A initiates a trade proposal
- **Trigger:** Immediate when User A clicks "Trade Proposal"
- **Content:** Item name, item picture, trade reference number, optional message from User A
- **Delivery:** Via trade alert icon (bell) in top navigation
- **Distinction:** Separate from regular messages (different notification system)

### Trade Status
At Stage 1, trades have one of two statuses:
- **`initiated`** - Trade proposal sent, awaiting User B response
- **`cancelled`** - Either user cancelled (reverts to `initiated` if User A re-initiates)

---

## User Flows

### User A: Initiating a Trade

**Prerequisites:**
- User A is logged in
- User A's account is NOT suspended
- User B's account is NOT suspended
- User A is NOT the owner of the item (no self-trades)

**Flow:**

1. User A navigates to item detail page
2. User A clicks "Trade Proposal" button
3. System validates:
   - User A is authenticated
   - User A's account is active (not suspended)
   - User B's account is active (not suspended)
   - User A ≠ User B (no self-trades)
4. If validation fails:
   - Show error message (e.g., "Account suspended - trading disabled")
   - Do not proceed
5. If validation passes:
   - System generates unique trade reference number (TR-MMDDYY-XXXXXX)
   - System creates trade record with status `initiated`
   - System sends trade alert to User B
   - System logs trade initiation to admin
   - Confirmation popup appears: "Trade proposal sent to [User B Name]"
   - Button changes to "Negotiating in Process"
   - User A can close popup and continue browsing

**Optional Message:**
- User A can optionally include a message with the trade proposal
- Message appears in the trade alert sent to User B
- Message is optional (not required to initiate)
- No character limit
- Message can include text only (no images at this stage)

**Button State After Initiation:**
- Button text changes from "Trade Proposal" to "Negotiating in Process"
- Button remains clickable (User A can view trade status)
- If User B declines, button reverts to "Trade Proposal"
- If User B proceeds to Stage 2, button remains "Negotiating in Process"

---

### User B: Receiving a Trade Alert

**Prerequisites:**
- User B is logged in (not required to receive alert, but needed to respond)
- Trade alert is delivered to User B's account

**Flow:**

1. User B receives trade alert notification
2. Trade alert icon (bell) in top navigation:
   - Becomes solid yellow
   - Flashes to draw attention
   - Shows unread count (e.g., "3" for 3 unread alerts)
3. User B clicks trade alert icon
4. User B is taken to Trade Alerts page (separate from Messages)
5. On Trade Alerts page, User B sees:
   - Folder structure: Pending | Declined | Completed
   - In "Pending" folder: All active trade proposals
   - Each proposal shows:
     - Item name and picture
     - Trade reference number
     - User A's name and avatar
     - Optional message from User A (if included)
     - Date/time alert was received
     - Action buttons: "View Inventory" or "Decline"
6. User B can:
   - **View Inventory:** Click to proceed to Stage 2 (view User A's items)
   - **Decline:** Click to reject the proposal (with optional reason)
   - **Send Message:** Click to send a message to User A (stays in trade thread)

---

### User B: Declining a Trade Proposal

**Flow:**

1. User B clicks "Decline" button on trade proposal
2. Optional decline reason dialog appears:
   - Text field for reason (optional, not required)
   - Placeholder: "Tell User A why you're declining (optional)"
   - Character limit: None
3. User B submits decline (with or without reason)
4. System updates trade status to `declined`
5. System sends trade alert to User A:
   - Alert type: "Trade Proposal Declined"
   - Content: "User B declined your proposal for [Item Name]"
   - If reason provided: Include reason in alert
6. User A receives notification and can:
   - View the decline reason (if provided)
   - Delete the notification from history (to avoid clutter)
   - Re-initiate a new trade proposal for the same item
7. For User B:
   - Proposal moves to "Declined" folder in Trade Alerts page
   - Can be deleted if desired

**Button State After Decline:**
- For User A: Button reverts to "Trade Proposal" (can re-initiate)
- For User B: Proposal shows as "Declined" in history

---

## Trade Alert Page Layout

### Page Structure

**Header:**
- Title: "Trade Alerts"
- Unread count badge (e.g., "3 Unread")
- Search/filter options (optional for future enhancement)

**Folder Navigation (Left Sidebar):**
- Pending (active proposals awaiting response)
- Declined (proposals User B declined)
- Completed (proposals that moved to Accepted status)

**Main Content Area:**
- List of trade proposals in selected folder
- Each proposal card shows:
  - Item thumbnail image
  - Item name
  - Trade reference number
  - User name and avatar
  - Optional message preview (first 50 characters)
  - Date received
  - Status badge
  - Action buttons

**Proposal Card Layout:**
```
┌─────────────────────────────────────────────────┐
│ [Item Image] [Item Name]                        │
│ Trade Ref: TR-061426-000001                      │
│ From: Pierre Turgeon (PT avatar)                 │
│ Message: "I'm very interested in this card..."   │
│ Received: June 14, 2026 at 2:15 PM              │
│                                                  │
│ [View Inventory] [Decline] [Send Message]       │
└─────────────────────────────────────────────────┘
```

---

## Data Model

### Trade Table (New/Updated)
```sql
CREATE TABLE trades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeReferenceNumber VARCHAR(20) UNIQUE NOT NULL, -- TR-MMDDYY-XXXXXX
  initiatorUserId INT NOT NULL REFERENCES users(id),
  recipientUserId INT NOT NULL REFERENCES users(id),
  requestedListingId INT NOT NULL REFERENCES listings(id),
  status ENUM('initiated', 'negotiating', 'accepted', 'shipped', 'completed', 'cancelled', 'disputed') DEFAULT 'initiated',
  initiatorMessage TEXT, -- Optional message from User A
  declineReason TEXT, -- Optional reason if User B declines
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_initiator (initiatorUserId),
  INDEX idx_recipient (recipientUserId),
  INDEX idx_status (status),
  INDEX idx_reference (tradeReferenceNumber)
);
```

### Trade Alert Notification Table (New)
```sql
CREATE TABLE tradeAlerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  recipientUserId INT NOT NULL REFERENCES users(id),
  alertType ENUM('initiated', 'declined', 'counterProposal', 'accepted', 'shipped', 'received', 'completed', 'cancelled') NOT NULL,
  message TEXT,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_recipient (recipientUserId),
  INDEX idx_trade (tradeId),
  INDEX idx_unread (recipientUserId, isRead)
);
```

### Trade Admin Log Table (New)
```sql
CREATE TABLE tradeAdminLog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeReferenceNumber VARCHAR(20) NOT NULL REFERENCES trades(tradeReferenceNumber),
  eventType ENUM('initiated', 'declined', 'negotiating', 'accepted', 'cancelled', 'completed') NOT NULL,
  initiatorUserId INT REFERENCES users(id),
  recipientUserId INT REFERENCES users(id),
  details JSON, -- Store proposal details, reasons, etc.
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_reference (tradeReferenceNumber),
  INDEX idx_event (eventType)
);
```

---

## API Procedures (tRPC)

### `market.initiateTradeProposal`

**Input:**
```typescript
{
  listingId: number;           // Item being requested
  message?: string;            // Optional message from User A
}
```

**Output:**
```typescript
{
  success: boolean;
  tradeId: number;
  tradeReferenceNumber: string; // TR-MMDDYY-XXXXXX
  message: string;              // Confirmation message
}
```

**Validation:**
- User must be authenticated
- User must not be suspended
- Listing owner must not be suspended
- User cannot trade with themselves
- Listing must exist and be active

**Side Effects:**
- Creates trade record with status `initiated`
- Creates trade alert for recipient
- Logs to admin trade log
- Updates trade alert icon unread count for recipient

**Error Cases:**
- `UNAUTHORIZED` - User not logged in
- `FORBIDDEN` - User's account suspended
- `FORBIDDEN` - Recipient's account suspended
- `FORBIDDEN` - Attempting self-trade
- `NOT_FOUND` - Listing not found
- `BAD_REQUEST` - Message exceeds limits (if any)

---

### `market.declineTradeProposal`

**Input:**
```typescript
{
  tradeId: number;
  reason?: string;             // Optional decline reason
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
- User must be the recipient of the trade proposal
- Trade must be in `initiated` status

**Side Effects:**
- Updates trade status to `declined`
- Creates trade alert for initiator
- Logs to admin trade log
- Clears unread status for this alert

**Error Cases:**
- `UNAUTHORIZED` - User not logged in
- `FORBIDDEN` - User is not the recipient
- `NOT_FOUND` - Trade not found
- `BAD_REQUEST` - Trade not in `initiated` status

---

### `market.getTradeAlerts`

**Input:**
```typescript
{
  folder: 'pending' | 'declined' | 'completed';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  alerts: Array<{
    id: number;
    tradeId: number;
    tradeReferenceNumber: string;
    itemName: string;
    itemImage: string;
    initiatorName: string;
    initiatorAvatar: string;
    message?: string;
    declineReason?: string;
    status: string;
    createdAt: Date;
    isRead: boolean;
  }>;
  unreadCount: number;
  totalCount: number;
}
```

**Validation:**
- User must be authenticated

**Side Effects:**
- Marks alerts as read when fetched (optional, can be explicit call)

---

### `market.markTradeAlertAsRead`

**Input:**
```typescript
{
  tradeAlertId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

---

## Notifications

### Trade Alert Icon Behavior

**Location:** Top navigation bar (bell icon)

**States:**
- **Default:** Gray bell icon with no badge
- **Unread Alerts:** Yellow bell icon with red badge showing count (e.g., "3")
- **New Alert:** Bell flashes yellow for 5 seconds when new alert arrives

**Interaction:**
- Click bell icon → Navigate to Trade Alerts page
- Badge shows total unread trade alerts
- Separate from message notifications (different icon/system)

### Trade Alert Notifications

**When Trade Initiated:**
- Recipient receives alert: "User A is interested in your [Item Name]"
- Alert shows trade reference number
- Alert shows optional message from User A (if included)
- Alert includes action buttons: "View Inventory" or "Decline"

**When Trade Declined:**
- Initiator receives alert: "User B declined your proposal for [Item Name]"
- Alert shows optional decline reason (if provided)
- Alert allows deletion to avoid clutter

**When Trade Moves to Stage 2:**
- No separate alert (user manually clicks "View Inventory")
- Trade reference number persists in trade thread

---

## Admin Dashboard

### Trade Reference Tab

**Access:** Admin Dashboard → Trade Management → Trade Reference

**Display:**
- List of all trade reference numbers
- Columns:
  - Trade Reference Number (TR-MMDDYY-XXXXXX)
  - Initiator Name
  - Recipient Name
  - Item Name
  - Status (initiated, negotiating, accepted, completed, cancelled, disputed)
  - Created Date
  - Last Updated Date

**Actions:**
- Click trade reference to view full trade details:
  - Current proposal (if in Stage 2+)
  - All messages/comments
  - Trade timeline
  - Current status
  - Ability to cancel trade if needed

**Filtering/Sorting:**
- Filter by status (initiated, negotiating, accepted, completed, cancelled, disputed)
- Filter by date range
- Sort by reference number, date, status

**Logging:**
- Admin can see:
  - Trade initiated (date/time)
  - Trade declined (if applicable)
  - Trade accepted (if applicable)
  - Trade completed (if applicable)
  - Trade cancelled (if applicable)

---

## Edge Cases & Error Handling

### Self-Trade Prevention
- System prevents User A from initiating trade with themselves
- Error message: "You cannot trade with yourself"

### Suspended Account Prevention
- If User A's account is suspended: Cannot initiate trades
- If User B's account is suspended: Cannot receive trades
- Error message: "Trading is disabled for suspended accounts"

### Item Removal During Stage 1
- If item is removed/delisted while trade is in `initiated` status:
  - Trade remains in system
  - User B still sees alert
  - When User B clicks "View Inventory", they see item is no longer available
  - Trade can be cancelled

### Multiple Proposals for Same Item
- User A can initiate multiple trades for the same item with different users
- User B can receive multiple proposals for the same item from different users
- Each proposal is independent with separate trade reference number
- Each has separate trade thread

### Re-initiation After Decline
- After User B declines, User A can re-initiate trade for same item
- New trade reference number is generated
- Treated as completely separate trade

### Notification Frequency
- If User B receives multiple proposals:
  - Each gets separate trade alert
  - Each triggers separate bell icon notification
  - Unread count increments for each

---

## Security Considerations

### Authorization
- Only authenticated users can initiate trades
- Only recipient can decline a proposal
- Only initiator can view their own initiated trades
- Only recipient can view received proposals

### Data Validation
- Trade reference number is unique and immutable
- Message content is sanitized (no XSS)
- User IDs are validated against authentication context

### Audit Trail
- All trade initiations logged to admin
- All declines logged with reason (if provided)
- Trade reference number enables full audit trail

---

## Performance Considerations

### Database Indexes
- Index on `initiatorUserId` for quick lookup of user's initiated trades
- Index on `recipientUserId` for quick lookup of user's received proposals
- Index on `status` for filtering by trade status
- Index on `tradeReferenceNumber` for admin lookups
- Composite index on `(recipientUserId, isRead)` for unread count queries

### Query Optimization
- Unread count query should use indexed composite key
- Trade alert list should paginate (limit 20 per page)
- Avoid N+1 queries when loading trade alerts with user/item details

---

## Testing Checklist

### Unit Tests
- [ ] Trade reference number generation (format, uniqueness)
- [ ] Self-trade prevention
- [ ] Suspended account prevention
- [ ] Trade initiation creates correct database records
- [ ] Trade decline updates status correctly
- [ ] Decline reason is optional

### Integration Tests
- [ ] End-to-end: Initiate trade → Receive alert → Decline
- [ ] End-to-end: Initiate trade → Receive alert → View inventory (Stage 2)
- [ ] Multiple proposals for same item
- [ ] Re-initiation after decline
- [ ] Admin can view trade reference

### UI/UX Tests
- [ ] Button changes to "Negotiating in Process" after initiation
- [ ] Trade alert icon flashes and shows unread count
- [ ] Trade alerts page shows correct folder structure
- [ ] Decline reason dialog is optional
- [ ] Confirmation popup appears after initiation

---

## Transition to Stage 2

**Trigger:** User B clicks "View Inventory" button on trade proposal

**What Happens:**
- Trade status changes from `initiated` to `negotiating`
- User B is shown User A's inventory
- Trade Summary panel appears
- Stage 2 begins (Negotiation & Proposal Building)

**Trade Reference Persistence:**
- Trade reference number remains the same
- Follows trade through all subsequent stages

---

## Summary

Stage 1 establishes the foundation for the trade workflow by:
1. Creating a unique trade reference number for audit trail
2. Sending a notification to the recipient
3. Allowing the recipient to decline or proceed to negotiation
4. Logging all activity for admin oversight
5. Preventing invalid trades (self-trades, suspended accounts)

Upon completion of Stage 1, the trade is ready to move to Stage 2 (Negotiation & Proposal Building) where both users will negotiate the specific items and cash amounts to exchange.

---

**Next:** See TRADE_FLOW_STAGE_2_SPECIFICATION.md for Negotiation & Proposal Building details.
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
# Trade Flow - Stage 3: Shipping & Verification Specification

**Version:** 1.0  
**Date:** June 14, 2026  
**Status:** Complete Specification (Ready for Implementation on 6/17/26)

---

## Overview

Stage 3 begins immediately after both users accept the proposal. In this stage, users exchange contact information, arrange shipping, track packages, and verify receipt of items. This stage involves sharing personal information, entering tracking numbers, and confirming receipt before moving to the final feedback stage.

---

## Stage 3 Flow Diagram

```
Both Users Accept Proposal
        ↓
Trade Status: accepted
        ↓
Trade Panel Updates
Contact Info Auto-Populated
(Name, Address, Email, Phone)
        ↓
Each User Has 5 Days to Ship
        ↓
User A Enters Tracking Number(s)
(Selects carrier, validates number)
        ↓
User B Gets Notification
"User A submitted tracking information"
        ↓
User B Enters Tracking Number(s)
        ↓
User A Gets Notification
"User B submitted tracking information"
        ↓
Both Users Have 15 Days to Click "Items Received"
        ↓
User A Clicks "Items Received"
(With confirmation dialog)
        ↓
User B Clicks "Items Received"
        ↓
Both Confirmed → Trade Status: completed
        ↓
Stage 4 Begins (Feedback & Ratings)
```

---

## Key Concepts

### Contact Information Sharing
- **Trigger:** Immediately after both users accept proposal
- **Source:** Auto-populated from user's account profile
- **Fields:** Full name, address (street, city, state, zip, country), email, phone
- **Visibility:** Both users see each other's information
- **Immutability:** Cannot be edited during trade (uses account profile data)

### Tracking Number Entry
- **Per Item:** Each item can have its own tracking number
- **Multiple Boxes:** If items shipped in multiple boxes, each gets separate tracking number
- **Carrier Selection:** User must select carrier (USPS, UPS, FedEx, DHL)
- **Validation:** Tracking number must be valid for selected carrier
- **Link Generation:** System generates clickable link to carrier's tracking page
- **Minimum:** At least 1 tracking number must be provided

### Items Received Confirmation
- **Requirement:** Both users must click "Items Received"
- **Timeline:** 15 days after tracking numbers entered
- **Confirmation Dialog:** Asks user to confirm they received items
- **Permanent:** Once clicked, cannot be undone
- **Notification:** Other user notified when items received confirmed

### Dispute Resolution
- **Complaint Filing:** User can file complaint if items damaged/missing
- **Timing:** Can file complaint during "Accepted" status or within 3 days after "Completed"
- **Information:** Include photos, description, trade ID, counterparty name
- **Admin Review:** Admin reviews and can mark as resolved or suspend/delete user
- **Status:** Trade moves to "Disputed" if complaint filed

---

## User Flows

### Contact Information Display

**Prerequisites:**
- Trade status is `accepted`
- Both users have accepted proposal

**Flow:**

1. Trade panel updates to show new section: "Shipping Information"
2. Each user sees their own information:
   - Full Name (from userProfiles.contactFullName)
   - Address (street, city, state, zip, country)
   - Email (from userProfiles.contactEmail)
   - Phone (from userProfiles.contactPhone)
3. Each user sees the other user's information:
   - Other user's full name
   - Other user's address
   - Other user's email
   - Other user's phone
4. Information is read-only (cannot be edited during trade)
5. Both users can use this information to arrange shipping

**Information Source:**
- All information comes from user's account profile
- Populated when user set up membership
- Same information used for all trades
- If user hasn't filled in profile, fields may be empty

---

### User A: Entering Tracking Numbers

**Prerequisites:**
- Trade status is `accepted`
- User A has 5 days to ship items

**Flow:**

1. User A ships items to User B
2. User A navigates to trade panel
3. User A sees "Tracking Information" section
4. For each item being shipped:
   - Item name and value shown
   - Checkbox next to item: "Item shipped in separate box"
   - When checkbox is checked, new input fields appear:
     - Carrier dropdown (USPS, UPS, FedEx, DHL)
     - Tracking number input field
5. User A selects carrier for first item
6. User A enters tracking number
7. System validates tracking number format for selected carrier
8. If valid:
   - Tracking number is accepted
   - Clickable link generated to carrier's tracking page
9. If invalid:
   - Error message: "Invalid tracking number for [Carrier]"
   - User must re-enter
10. User A can enter multiple tracking numbers (one per box)
11. User A must enter at least 1 tracking number
12. User A clicks "Submit Tracking Information"
13. System validates at least 1 tracking number provided
14. User B receives notification: "User A submitted tracking information"
15. Trade panel updates to show tracking numbers with clickable links

**Tracking Number Validation:**
- System validates format based on carrier
- USPS: 20-22 character alphanumeric
- UPS: 1Z followed by 16 digits
- FedEx: 12 or 14 digits
- DHL: 10-11 digits
- Validation must return valid link to carrier's tracking page

**Timestamp:**
- Tracking number entry is timestamped
- Timestamp shown in trade panel
- Used for 15-day receipt confirmation deadline

---

### User B: Viewing Tracking Information

**Prerequisites:**
- User A has submitted tracking numbers
- Trade status is `accepted`

**Flow:**

1. User B receives notification: "User A submitted tracking information"
2. User B navigates to trade panel
3. User B sees "Tracking Information" section
4. For each item User A shipped:
   - Item name shown
   - Carrier shown (USPS, UPS, FedEx, DHL)
   - Tracking number shown as clickable link
   - Timestamp of when tracking was submitted
5. User B can click tracking number to go to carrier's tracking page
6. User B can track package in real-time
7. User B ships their items to User A (same process)
8. User B enters tracking numbers for their items
9. User A receives notification: "User B submitted tracking information"

---

### Both Users: Items Received Confirmation

**Prerequisites:**
- Both users have submitted tracking numbers
- At least 15 days have NOT passed yet (within 15-day window)
- Trade status is `accepted`

**Flow:**

1. User A receives items from User B
2. User A navigates to trade panel
3. User A sees "Items Received" section
4. User A reviews items received
5. User A clicks "Items Received" button
6. Confirmation dialog appears:
   - "Please confirm you have received all items"
   - Shows list of items User A should have received
   - "Are you sure you want to confirm receipt?"
   - Warning: "This action is permanent and cannot be undone"
7. User A confirms
8. System records User A's receipt confirmation
9. User B receives notification: "User A confirmed receipt of items"
10. User B clicks "Items Received" button
11. Same confirmation dialog appears
12. User B confirms
13. System records User B's receipt confirmation
14. Both users have confirmed receipt
15. Trade status changes from `accepted` to `completed`
16. Stage 4 begins (Feedback & Ratings)

**Important:** Once either user clicks "Items Received", it is permanent and cannot be undone.

---

### Filing a Complaint

**Prerequisites:**
- Trade status is `accepted` OR within 3 days after `completed`
- User believes items are damaged, missing, or not as described

**Flow:**

1. User clicks "File Complaint" button in trade panel
2. Complaint form appears:
   - Description field (required): "What is the problem with the items?"
   - Photo upload (optional): Can upload up to 5 images (max 5MB each, images only)
   - Checkbox: "Items were damaged" / "Items missing" / "Items not as described"
3. User fills out complaint details
4. User uploads photos of damaged/missing items (if applicable)
5. User submits complaint
6. System creates complaint record
7. Trade status changes to `disputed`
8. Admin receives notification of new complaint
9. Admin can view:
   - Trade reference number
   - Trade details
   - Complaint description
   - Photos
   - Both users' information
10. Admin can:
    - Mark complaint as "Resolved"
    - Suspend user (if complaint is fraudulent)
    - Delete user (if repeated violations)
    - Add notes to complaint
11. Complaining user receives notification: "Complaint resolved" with admin notes

**Complaint Restrictions:**
- Can only file if trade is `accepted` or within 3 days of `completed`
- Cannot file after 3 days past completion
- Only one complaint per trade

---

## Trade Panel - Stage 3 Display

### Layout

```
┌──────────────────────────────────────────────────────────┐
│                    TRADE SUMMARY                         │
│  (Original proposal - read-only)                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  SHIPPING INFORMATION                                    │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  User A (You)                 User B                     │
│  ─────────────────────────────────────────────────────   │
│  Name: [Full Name]            Name: [Full Name]          │
│  Address: [Street]            Address: [Street]          │
│           [City, ST ZIP]                [City, ST ZIP]   │
│  Email: [email@...]           Email: [email@...]         │
│  Phone: [phone]               Phone: [phone]             │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  TRACKING INFORMATION                                    │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  User A Shipping:                                        │
│  ☐ Item 1 - [USPS] [123456789012345] (Submitted)        │
│  ☐ Item 2 - [UPS]  [1Z123456789012] (Submitted)         │
│                                                          │
│  User B Shipping:                                        │
│  ☐ Item 1 - [FedEx] [123456789012] (Submitted)          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ITEMS RECEIVED                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  You: [ ] Items Received                                 │
│  User B: [✓] Items Received (Confirmed June 14, 2:15 PM)│
│                                                          │
│  [File Complaint]                                        │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  MESSAGE THREAD                                          │
│  (All messages and updates)                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Data Model

### Trade Table (Updated)

```sql
ALTER TABLE trades ADD COLUMN (
  shippingDeadline TIMESTAMP, -- 5 days after accepted
  receiptDeadline TIMESTAMP,  -- 15 days after tracking submitted
  acceptedAt TIMESTAMP,       -- When both users accepted
  completedAt TIMESTAMP       -- When both confirmed receipt
);
```

### Tracking Information Table (New)

```sql
CREATE TABLE tradeTrackingNumbers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  userId INT NOT NULL REFERENCES users(id),
  listingId INT NOT NULL REFERENCES listings(id),
  carrier ENUM('USPS', 'UPS', 'FedEx', 'DHL') NOT NULL,
  trackingNumber VARCHAR(50) NOT NULL,
  trackingUrl VARCHAR(500), -- Generated URL to carrier
  submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_trade (tradeId),
  INDEX idx_user (userId)
);
```

### Items Received Confirmation Table (New)

```sql
CREATE TABLE tradeReceiptConfirmation (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  userId INT NOT NULL REFERENCES users(id),
  confirmedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_trade_user (tradeId, userId),
  INDEX idx_trade (tradeId)
);
```

### Trade Complaint Table (New)

```sql
CREATE TABLE tradeComplaints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  complaintUserId INT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  complaintType ENUM('damaged', 'missing', 'notAsDescribed') NOT NULL,
  photos JSON, -- Array of photo URLs
  status ENUM('filed', 'resolved', 'dismissed') DEFAULT 'filed',
  adminNotes TEXT,
  resolvedAt TIMESTAMP,
  resolvedByAdminId INT REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_trade (tradeId),
  INDEX idx_status (status)
);
```

---

## API Procedures (tRPC)

### `market.submitTrackingNumbers`

**Input:**
```typescript
{
  tradeId: number;
  trackingNumbers: Array<{
    listingId: number;
    carrier: 'USPS' | 'UPS' | 'FedEx' | 'DHL';
    trackingNumber: string;
  }>;
}
```

**Output:**
```typescript
{
  success: boolean;
  trackingUrls: Array<{
    listingId: number;
    trackingUrl: string;
  }>;
}
```

**Validation:**
- User must be authenticated
- User must be party to the trade
- Trade must be in `accepted` status
- At least 1 tracking number required
- Tracking number must be valid for carrier
- All listing IDs must be from user's side of trade

**Side Effects:**
- Creates tracking number records
- Generates tracking URLs
- Sends notification to other user
- Updates trade panel
- Logs to admin trade log

---

### `market.confirmItemsReceived`

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
- User must be party to the trade
- Trade must be in `accepted` status
- Both users must have submitted tracking numbers
- User must not have already confirmed receipt

**Side Effects:**
- Records receipt confirmation
- Sends notification to other user
- If both users confirmed: changes trade status to `completed`
- If both confirmed: triggers Stage 4 (Feedback)
- Logs to admin trade log

---

### `market.fileTradeComplaint`

**Input:**
```typescript
{
  tradeId: number;
  description: string;
  complaintType: 'damaged' | 'missing' | 'notAsDescribed';
  photoUrls?: string[];  // URLs of uploaded photos
}
```

**Output:**
```typescript
{
  success: boolean;
  complaintId: number;
}
```

**Validation:**
- User must be authenticated
- User must be party to the trade
- Trade must be `accepted` or within 3 days of `completed`
- Description required
- Photos must be images only, max 5MB each
- Only one complaint per trade

**Side Effects:**
- Creates complaint record
- Changes trade status to `disputed` (if still `accepted`)
- Sends notification to admin
- Logs to admin trade log

---

### `market.getTradeShippingInfo`

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
    status: string;
    shippingInfo: {
      userA: {
        name: string;
        address: string;
        email: string;
        phone: string;
      };
      userB: {
        name: string;
        address: string;
        email: string;
        phone: string;
      };
    };
    trackingNumbers: Array<{
      listingId: number;
      carrier: string;
      trackingNumber: string;
      trackingUrl: string;
      submittedBy: string;
      submittedAt: Date;
    }>;
    receiptConfirmations: {
      userA: { confirmed: boolean; confirmedAt?: Date };
      userB: { confirmed: boolean; confirmedAt?: Date };
    };
    receiptDeadline: Date;
  };
}
```

---

## Notifications

### Tracking Number Submitted

**Trigger:** User submits tracking numbers

**Content:**
- "User A submitted tracking information"
- Shows items and tracking numbers
- Includes clickable tracking links

---

### Items Received Confirmed

**Trigger:** User clicks "Items Received"

**Content:**
- "User A confirmed receipt of items"
- Timestamp of confirmation

---

### Both Items Received - Trade Completed

**Trigger:** Both users confirm receipt

**Content:**
- "Trade completed successfully"
- "Moving to feedback stage"
- Link to leave feedback

---

### Complaint Filed

**Trigger:** User files complaint

**Content (to Admin):**
- "New trade complaint filed"
- Trade reference number
- Complaint type (damaged, missing, not as described)
- Complaint description
- Photos (if uploaded)

**Content (to Complaining User):**
- "Complaint received and under review"
- Estimated resolution time

---

### Daily Reminder - Items Not Received

**Trigger:** Trade in `accepted` status for 30+ days without receipt confirmation

**Timeline:**
- Day 30: First daily reminder
- Day 31-onwards: Daily reminders
- Continues until: Items received confirmed OR trade cancelled OR complaint filed

**Content:**
- "Reminder: Please confirm receipt of items"
- Shows days since tracking submitted
- Link to confirm receipt

**Admin Notification:**
- After 30 days, admin also gets notification
- "Trade [Reference] pending receipt confirmation for 30 days"

---

## Admin Dashboard

### Trade Reference Tab - Stage 3 View

**When Admin Clicks Trade Reference:**

**Display:**
- Trade Reference Number
- Status: `accepted` or `disputed`
- Shipping Information:
  - User A's contact info
  - User B's contact info
- Tracking Information:
  - All tracking numbers
  - Carriers
  - Timestamps
  - Tracking links
- Receipt Confirmations:
  - User A: Confirmed/Not Confirmed (with timestamp)
  - User B: Confirmed/Not Confirmed (with timestamp)
- Complaints (if any):
  - Complaint description
  - Photos
  - Status (filed, resolved, dismissed)
  - Admin notes

**Admin Actions:**
- View full details
- View tracking links
- View complaint photos
- Mark complaint as resolved
- Suspend user (if needed)
- Delete user (if needed)
- Add notes to complaint
- Cancel trade (if needed)

---

## Edge Cases & Error Handling

### Tracking Number Validation Failure

**Scenario:** User enters invalid tracking number for selected carrier

**Behavior:**
- Error message: "Invalid tracking number for [Carrier]"
- Tracking number not accepted
- User must re-enter valid number

### Multiple Boxes - Tracking Number Per Box

**Scenario:** User A ships items in 3 different boxes

**Behavior:**
- User A checks "Item shipped in separate box" for each item
- User A enters separate tracking number for each box
- Each tracking number has its own carrier selection
- All tracking numbers submitted together
- Trade panel shows all tracking numbers

### Items Received - Permanent Confirmation

**Scenario:** User A clicks "Items Received" but realizes they haven't actually received items yet

**Behavior:**
- Confirmation is permanent
- Cannot be undone
- User must file complaint if items not received
- Admin can review complaint and take action

### Complaint After Completion

**Scenario:** Both users confirmed receipt (trade completed), but User A discovers damaged items

**Behavior:**
- User A can file complaint within 3 days of completion
- After 3 days: Cannot file complaint
- Trade status changes to `disputed`
- Admin reviews and takes action

### No Tracking Numbers Submitted

**Scenario:** 5 days pass but neither user submitted tracking numbers

**Behavior:**
- Trade remains in `accepted` status
- No auto-cancel at 5-day mark
- Daily reminders after 30 days
- Either user can still submit tracking numbers
- Trade doesn't move to completed until both confirm receipt

### Dispute During Shipping

**Scenario:** User A files complaint before User B confirms receipt

**Behavior:**
- Trade status changes to `disputed`
- User B cannot confirm receipt while disputed
- Admin must resolve complaint first
- After resolution: Trade can move to completed or cancelled

---

## Security Considerations

### Contact Information Privacy
- Contact information only visible to the other party in the trade
- Not visible to public
- Not visible to other users
- Sanitized to prevent injection attacks

### Tracking Number Validation
- Tracking numbers validated against carrier formats
- Prevents invalid/fake tracking numbers
- Links generated safely (no injection)

### Complaint Photos
- Photos scanned for malware
- File type validated (images only)
- Size limited (max 5MB)
- Stored securely

### Authorization
- Only trade parties can submit tracking numbers
- Only trade parties can confirm receipt
- Only trade parties can file complaints
- Only admins can resolve complaints

---

## Performance Considerations

### Database Indexes
- Index on `(tradeId, userId)` for tracking numbers
- Index on `tradeId` for receipt confirmations
- Index on `status` for complaint queries
- Index on `createdAt` for daily reminder queries

### Query Optimization
- Load shipping info with single query
- Batch load tracking numbers
- Paginate complaints (if many per trade)

---

## Testing Checklist

### Unit Tests
- [ ] Tracking number validation for each carrier
- [ ] Tracking URL generation
- [ ] Receipt confirmation is permanent
- [ ] Complaint filing within 3-day window
- [ ] Auto-cancel after 10 days no activity (Stage 2 carryover)

### Integration Tests
- [ ] End-to-end: Submit tracking → Confirm receipt → Complete
- [ ] End-to-end: File complaint → Admin resolve
- [ ] Multiple tracking numbers for multiple items
- [ ] Daily reminders after 30 days
- [ ] Complaint after completion (within 3 days)

### UI/UX Tests
- [ ] Contact information auto-populated correctly
- [ ] Tracking number entry with carrier selection
- [ ] Tracking links clickable and working
- [ ] Confirmation dialog shows correct items
- [ ] Complaint form accepts photos

---

## Transition to Stage 4

**Trigger:** Both users confirm receipt

**What Happens:**
1. Trade status changes from `accepted` to `completed`
2. Stage 4 begins (Feedback & Ratings)
3. Both users get notification: "Trade completed - Please leave feedback"
4. Feedback panel appears in trade thread
5. Users have 7 days to leave feedback
6. Daily reminders if feedback not left

**Trade Reference Persistence:**
- Trade reference number remains the same
- Follows trade through final stage

---

## Summary

Stage 3 is the fulfillment phase where:
1. Contact information is automatically shared
2. Users enter tracking numbers with carrier validation
3. Users track packages in real-time
4. Users confirm receipt of items
5. Disputes can be filed if items damaged/missing
6. Admin can review and resolve complaints
7. Daily reminders ensure timely completion
8. Trade moves to completed when both confirm receipt

Upon completion of Stage 3, the trade moves to Stage 4 (Feedback & Ratings) where users rate their trading experience and provide feedback about the other user.

---

**Next:** See TRADE_FLOW_STAGE_4_SPECIFICATION.md for Feedback & Ratings details.
# Trade Flow - Stage 4: Feedback & Ratings Specification

**Version:** 1.0  
**Date:** June 14, 2026  
**Status:** Complete Specification (Ready for Implementation on 6/17/26)

---

## Overview

Stage 4 is the final phase of the trade workflow where both users rate their trading experience and provide feedback about each other. This stage is critical for building trust and reputation in the Tradebilia community. Feedback is public and visible on user profiles, helping other collectors make informed decisions about trading with specific users.

---

## Stage 4 Flow Diagram

```
Both Users Confirm Receipt
        ↓
Trade Status: completed
        ↓
Stage 4 Begins
        ↓
Feedback Panel Appears
        ↓
User A Leaves Feedback:
├─ 0-5 Star Rating (required)
├─ Trade Experience Rating
├─ Item Condition Rating
├─ Communication Rating
├─ Shipping Speed Rating
├─ Optional Text Review
└─ Optional Photo Upload
        ↓
User B Gets Notification
"User A left feedback"
        ↓
User B Leaves Feedback
(Same process)
        ↓
Both Feedback Submitted
        ↓
Feedback Visible on Profiles
        ↓
Trade Fully Completed
        ↓
Users Can Delete Trade from History (Optional)
```

---

## Key Concepts

### Feedback Ratings
- **Scale:** 0-5 stars
- **Categories:**
  1. Trade Experience (overall satisfaction)
  2. Item Condition (items as described)
  3. Communication (responsiveness, clarity)
  4. Shipping Speed (how quickly items shipped)
  5. Overall Rating (average of above)
- **Mandatory:** At least one rating required (0-5 stars)
- **Public:** All ratings visible on user profile

### Feedback Review
- **Optional:** Text review is optional (not required)
- **Length:** No character limit
- **Content:** User's experience with the trade and other user
- **Public:** Visible on user profile and trade history
- **Permanent:** Cannot be edited after submission

### Feedback Photos
- **Optional:** Can upload photos with feedback
- **Quantity:** Up to 5 photos per feedback
- **Size:** Max 5MB per photo
- **Format:** Images only (JPEG, PNG, WebP, etc.)
- **Purpose:** Show items received, condition, etc.
- **Public:** Visible on user profile

### Feedback Visibility
- **Public:** All feedback is public
- **Shows User ID:** Feedback shows reviewer's user ID
- **On Profile:** Feedback appears on user's profile
- **In Trade History:** Feedback appears in completed trade history
- **Searchable:** Admin can search feedback

### Mandatory Feedback
- **Requirement:** Both users must leave feedback
- **Enforcement:** Daily reminders if not submitted
- **Deadline:** 7 days to submit
- **After 7 Days:** Trade stays in "Completed" status, but user gets daily reminders
- **No Auto-Completion:** Trade does not auto-complete after 7 days

---

## User Flows

### User A: Leaving Feedback

**Prerequisites:**
- Trade status is `completed`
- Both users have confirmed receipt
- User A hasn't already left feedback

**Flow:**

1. Trade panel updates to show "Feedback" section
2. User A sees feedback form:
   - Trade summary (items exchanged)
   - Other user's info (User B name, avatar)
   - Rating scales for 4 categories
   - Text review box
   - Photo upload section
3. User A rates Trade Experience (0-5 stars):
   - 5 stars: Excellent trade experience
   - 4 stars: Good trade experience
   - 3 stars: Average trade experience
   - 2 stars: Poor trade experience
   - 1 star: Very poor trade experience
   - 0 stars: Terrible trade experience
4. User A rates Item Condition (0-5 stars):
   - 5 stars: Items exactly as described
   - 4 stars: Items mostly as described
   - 3 stars: Items somewhat as described
   - 2 stars: Items not as described
   - 1 star: Items significantly not as described
   - 0 stars: Items completely not as described
5. User A rates Communication (0-5 stars):
   - 5 stars: Excellent communication
   - 4 stars: Good communication
   - 3 stars: Average communication
   - 2 stars: Poor communication
   - 1 star: Very poor communication
   - 0 stars: No communication
6. User A rates Shipping Speed (0-5 stars):
   - 5 stars: Shipped immediately
   - 4 stars: Shipped quickly
   - 3 stars: Shipped in reasonable time
   - 2 stars: Shipped slowly
   - 1 star: Shipped very slowly
   - 0 stars: Never shipped
7. System calculates Overall Rating (average of 4 ratings)
8. User A optionally writes text review:
   - Text field for review
   - No character limit
   - Can describe experience, items, user, etc.
9. User A optionally uploads photos:
   - Photo upload button
   - Can upload up to 5 photos
   - Each photo max 5MB
   - Images only (JPEG, PNG, WebP, etc.)
10. User A clicks "Submit Feedback"
11. Confirmation dialog:
    - Shows all ratings
    - Shows text review preview
    - Shows number of photos
    - "Are you sure you want to submit this feedback?"
    - Warning: "Feedback is permanent and cannot be edited"
12. User A confirms
13. Feedback is submitted and becomes public immediately
14. User B receives notification: "User A left feedback for your trade"
15. Feedback appears on User A's profile
16. Feedback appears in trade history

---

### User B: Viewing Feedback & Leaving Their Own

**Prerequisites:**
- User A has left feedback
- Trade status is `completed`
- User B hasn't already left feedback

**Flow:**

1. User B receives notification: "User A left feedback for your trade"
2. User B navigates to trade panel
3. User B sees User A's feedback:
   - User A's ratings (0-5 stars for each category)
   - Overall rating (average)
   - Text review (if provided)
   - Photos (if uploaded)
   - User A's user ID
   - Timestamp of when feedback was left
4. User B can view User A's feedback but cannot respond or dispute
5. User B sees feedback form for their own feedback
6. User B leaves feedback using same process as User A
7. User B submits feedback
8. User A receives notification: "User B left feedback for your trade"
9. Both feedbacks now visible on both users' profiles

---

## Feedback Form Layout

### Feedback Submission Form

```
┌──────────────────────────────────────────────────────────┐
│                    LEAVE FEEDBACK                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Trade Summary:                                          │
│  You received: [Item 1, Item 2]                          │
│  You gave: [Item 3]                                      │
│                                                          │
│  Feedback for: User B (User ID: 12345)                   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  RATINGS (Required - at least one)                       │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Trade Experience:  ☆ ☆ ☆ ☆ ☆                           │
│  Item Condition:    ☆ ☆ ☆ ☆ ☆                           │
│  Communication:     ☆ ☆ ☆ ☆ ☆                           │
│  Shipping Speed:    ☆ ☆ ☆ ☆ ☆                           │
│                                                          │
│  Overall Rating: ★★★★☆ (4.0 stars)                      │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  REVIEW (Optional)                                       │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  [Text area for review]                                  │
│  "Share your experience with this user..."               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PHOTOS (Optional)                                       │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  [Upload Photos] (Max 5 photos, 5MB each)                │
│  [Photo 1] [Photo 2] [Photo 3]                           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Submit Feedback] [Cancel]                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## User Profile - Feedback Display

### Feedback Section on Profile

**Location:** User's public profile page

**Display:**
- **Average Rating:** Large display (e.g., "4.5 ★")
- **Number of Trades:** "Completed 23 trades"
- **Feedback Breakdown:**
  - 5-star: X reviews
  - 4-star: X reviews
  - 3-star: X reviews
  - 2-star: X reviews
  - 1-star: X reviews
  - 0-star: X reviews
- **Recent Feedback:** Last 10 feedback reviews
- **Each Feedback Shows:**
  - Reviewer's user ID
  - Star rating (0-5)
  - Text review (if provided)
  - Photos (if uploaded)
  - Date feedback was left
  - Trade reference number (for context)

### Feedback Sorting/Filtering
- Sort by: Newest, Oldest, Highest Rating, Lowest Rating
- Filter by: All ratings, 5-star, 4-star, 3-star, 2-star, 1-star, 0-star

---

## Data Model

### Trade Review Table (Updated)

```sql
CREATE TABLE tradeReviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  reviewerId INT NOT NULL REFERENCES users(id),
  revieweeId INT NOT NULL REFERENCES users(id),
  
  -- Ratings (0-5 stars)
  tradeExperienceRating INT NOT NULL CHECK (tradeExperienceRating BETWEEN 0 AND 5),
  itemConditionRating INT NOT NULL CHECK (itemConditionRating BETWEEN 0 AND 5),
  communicationRating INT NOT NULL CHECK (communicationRating BETWEEN 0 AND 5),
  shippingSpeedRating INT NOT NULL CHECK (shippingSpeedRating BETWEEN 0 AND 5),
  overallRating DECIMAL(2,1), -- Average of above 4 ratings
  
  -- Review content
  reviewText TEXT, -- Optional text review
  photos JSON, -- Array of photo URLs
  
  -- Metadata
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_trade_reviewer (tradeId, reviewerId),
  INDEX idx_reviewee (revieweeId),
  INDEX idx_created (createdAt),
  INDEX idx_overall (overallRating)
);
```

### User Profile Rating Summary Table (New)

```sql
CREATE TABLE userRatingSummary (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE REFERENCES users(id),
  
  -- Aggregated stats
  totalReviews INT DEFAULT 0,
  averageRating DECIMAL(2,1) DEFAULT 0,
  
  -- Breakdown by rating
  fiveStarCount INT DEFAULT 0,
  fourStarCount INT DEFAULT 0,
  threeStarCount INT DEFAULT 0,
  twoStarCount INT DEFAULT 0,
  oneStarCount INT DEFAULT 0,
  zeroStarCount INT DEFAULT 0,
  
  -- Last updated
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_average (averageRating)
);
```

---

## API Procedures (tRPC)

### `market.submitTradeReview`

**Input:**
```typescript
{
  tradeId: number;
  tradeExperienceRating: number;      // 0-5
  itemConditionRating: number;        // 0-5
  communicationRating: number;        // 0-5
  shippingSpeedRating: number;        // 0-5
  reviewText?: string;                // Optional
  photoUrls?: string[];               // Optional, max 5
}
```

**Output:**
```typescript
{
  success: boolean;
  review: {
    id: number;
    tradeId: number;
    overallRating: number;
    createdAt: Date;
  };
}
```

**Validation:**
- User must be authenticated
- User must be party to the trade
- Trade must be in `completed` status
- User must not have already left feedback
- At least one rating must be provided (0-5)
- All ratings must be 0-5 integers
- Photos must be images only, max 5MB each
- Max 5 photos

**Side Effects:**
- Creates review record
- Calculates overall rating (average of 4 ratings)
- Updates user rating summary
- Sends notification to other user
- Makes feedback public immediately
- Logs to admin trade log

---

### `market.getTradeReviews`

**Input:**
```typescript
{
  tradeId: number;
}
```

**Output:**
```typescript
{
  reviews: Array<{
    id: number;
    reviewerId: number;
    reviewerUserId: string;
    tradeExperienceRating: number;
    itemConditionRating: number;
    communicationRating: number;
    shippingSpeedRating: number;
    overallRating: number;
    reviewText?: string;
    photos?: string[];
    createdAt: Date;
  }>;
}
```

---

### `market.getUserRatingSummary`

**Input:**
```typescript
{
  userId: number;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest';
  filterBy?: number; // 0-5 for specific rating
}
```

**Output:**
```typescript
{
  summary: {
    userId: number;
    totalReviews: number;
    averageRating: number;
    fiveStarCount: number;
    fourStarCount: number;
    threeStarCount: number;
    twoStarCount: number;
    oneStarCount: number;
    zeroStarCount: number;
  };
  recentReviews: Array<{
    id: number;
    tradeId: number;
    tradeReferenceNumber: string;
    reviewerId: number;
    overallRating: number;
    reviewText?: string;
    photos?: string[];
    createdAt: Date;
  }>;
}
```

---

## Notifications

### Feedback Left Notification

**Trigger:** User leaves feedback

**Content:**
- "User A left feedback for your trade"
- Link to view feedback
- Shows rating (0-5 stars)

**Delivery:** Immediate

---

### Feedback Reminder - Daily

**Trigger:** 7+ days since trade completed without feedback submitted

**Timeline:**
- Day 1-6: No reminder
- Day 7+: Daily reminder
- Continues until: Feedback submitted

**Content:**
- "Reminder: Please leave feedback for your trade"
- Shows trade reference number
- Shows other user's name
- Link to leave feedback

---

## Admin Dashboard

### Trade Reference Tab - Stage 4 View

**When Admin Clicks Trade Reference:**

**Display:**
- Trade Reference Number
- Status: `completed`
- Both Users' Feedback:
  - Reviewer ID
  - All ratings (0-5 for each category)
  - Overall rating
  - Text review (if provided)
  - Photos (if uploaded)
  - Timestamp
- Feedback Summary:
  - Both users have left feedback
  - Or one/both still pending

**Admin Actions:**
- View all feedback details
- View photos
- Remove inappropriate feedback (if needed)
- Flag feedback for review
- Issue warnings to users (if needed)

---

## Edge Cases & Error Handling

### Feedback After Dispute

**Scenario:** Trade had a complaint/dispute that was resolved

**Behavior:**
- Users can still leave feedback
- Feedback is not affected by dispute
- Feedback shows on profile regardless of dispute history

### Negative Feedback

**Scenario:** User A leaves 0-star feedback for User B

**Behavior:**
- Feedback is immediately public
- Shows on User B's profile
- Affects User B's average rating
- User B cannot dispute or remove it
- User B can request admin to review if inappropriate

### Feedback Editing Request

**Scenario:** User A left feedback but wants to edit it

**Behavior:**
- Feedback cannot be edited after submission
- User A can request admin to edit (with reason)
- Admin can edit if justified
- Timestamp shows when edited

### No Feedback After 7 Days

**Scenario:** User A doesn't leave feedback after 7 days

**Behavior:**
- Trade stays in `completed` status
- User A gets daily reminders
- Trade does not auto-complete or change status
- User A can leave feedback anytime (no deadline)

### Both Users Leave Feedback Simultaneously

**Scenario:** Both users submit feedback at same time

**Behavior:**
- Both feedbacks processed independently
- Both become public immediately
- Both users notified
- No conflict or ordering issue

---

## Security Considerations

### Feedback Content Moderation
- Text reviews scanned for inappropriate content
- Photos scanned for inappropriate content
- Flagged content reviewed by admin
- Abusive feedback can be removed

### Photo Security
- Photos scanned for malware
- File type validated (images only)
- Size limited (max 5MB)
- Stored securely

### Authorization
- Only trade parties can leave feedback
- Only reviewee can see their feedback
- Feedback cannot be edited after submission
- Only admin can modify feedback

### Spam Prevention
- Users cannot leave multiple feedbacks for same trade
- Users cannot spam feedback on profiles
- Abusive patterns flagged for admin review

---

## Performance Considerations

### Database Indexes
- Index on `(revieweeId, createdAt)` for profile feedback queries
- Index on `overallRating` for sorting
- Index on `tradeId` for trade feedback queries
- Composite index on `(userId, createdAt)` for recent feedback

### Query Optimization
- Cache user rating summary (update on each new review)
- Paginate feedback (load 10 per page)
- Use indexed queries for sorting/filtering

### Caching
- Cache user average rating
- Cache feedback breakdown (5-star, 4-star, etc.)
- Invalidate cache when new feedback submitted

---

## Testing Checklist

### Unit Tests
- [ ] Rating validation (0-5 range)
- [ ] Overall rating calculation (average of 4 ratings)
- [ ] User rating summary aggregation
- [ ] Feedback uniqueness (one per user per trade)
- [ ] Photo upload validation (images only, max 5MB)

### Integration Tests
- [ ] End-to-end: Submit feedback → Appears on profile
- [ ] End-to-end: Both users submit feedback
- [ ] Daily reminders after 7 days
- [ ] Rating summary updates correctly
- [ ] Feedback sorting and filtering

### UI/UX Tests
- [ ] Star rating selection works
- [ ] Overall rating calculates correctly
- [ ] Photo upload accepts images
- [ ] Confirmation dialog shows correct summary
- [ ] Feedback appears on profile immediately
- [ ] Feedback visible in trade history

---

## Trade Completion

**After Stage 4:**

The trade is now fully completed. Users can:
- View completed trade in history
- View feedback exchanged
- Delete trade from history (optional)
- Reference trade for future disputes

**Trade Reference Persistence:**
- Trade reference number remains in system forever
- Can be referenced for audit trail
- Admin can always access full trade history

---

## Summary

Stage 4 is the reputation-building phase where:
1. Both users rate their trading experience
2. Feedback is public and visible on profiles
3. Ratings are aggregated for user reputation
4. Feedback helps other collectors make informed decisions
5. Mandatory feedback ensures accountability
6. Daily reminders encourage timely feedback
7. Feedback is permanent and cannot be edited
8. Admin can moderate inappropriate feedback

Upon completion of Stage 4, the trade is fully completed and archived. The trade reference number remains in the system for audit purposes, and feedback becomes part of each user's permanent reputation record.

---

## Complete Trade Lifecycle Summary

| Stage | Status | Duration | Key Activities | Outcome |
|-------|--------|----------|-----------------|---------|
| 1 | `initiated` | Immediate | Trade proposal sent, recipient decides | Accept or decline |
| 2 | `negotiating` | Up to 14 days | Proposal negotiation, counter-proposals | Mutual acceptance |
| 3 | `accepted` | Up to 45 days | Shipping, tracking, receipt verification | Both confirm receipt |
| 4 | `completed` | Up to 7+ days | Feedback and ratings | Trade archived |

---

**End of Trade Flow Specification**

All 4 stages are now fully documented and ready for implementation on 6/17/26.
# Trade Flow - Complete Architecture & System Design

**Version:** 1.0  
**Date:** June 14, 2026  
**Status:** Complete Specification (Ready for Implementation on 6/17/26)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [API Procedures](#api-procedures)
4. [Notification System](#notification-system)
5. [Admin Logging](#admin-logging)
6. [Data Flow](#data-flow)
7. [State Machine](#state-machine)
8. [Error Handling](#error-handling)
9. [Performance Optimization](#performance-optimization)
10. [Security](#security)

---

## System Overview

### Trade Flow Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      TRADE SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND (React)                                           │
│  ├─ Item Detail Page (Trade Proposal Button)               │
│  ├─ Trade Alerts Page (Pending, Declined, Completed)       │
│  ├─ Trade Panel (Negotiation, Shipping, Feedback)          │
│  ├─ User Profile (Ratings & Feedback)                      │
│  └─ Admin Dashboard (Trade Management)                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  API LAYER (tRPC)                                           │
│  ├─ market.initiateTradeProposal                           │
│  ├─ market.declineTradeProposal                            │
│  ├─ market.sendTradeProposal                               │
│  ├─ market.acceptTradeProposal                             │
│  ├─ market.rejectTradeProposal                             │
│  ├─ market.submitTrackingNumbers                           │
│  ├─ market.confirmItemsReceived                            │
│  ├─ market.fileTradeComplaint                              │
│  ├─ market.submitTradeReview                               │
│  └─ [Additional procedures...]                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BUSINESS LOGIC LAYER (server/db.ts)                       │
│  ├─ Trade creation & validation                            │
│  ├─ Proposal management                                    │
│  ├─ Shipping & receipt handling                            │
│  ├─ Complaint management                                   │
│  ├─ Feedback aggregation                                   │
│  └─ Admin logging                                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DATABASE LAYER (MySQL/TiDB)                               │
│  ├─ trades                                                 │
│  ├─ tradeProposals                                         │
│  ├─ tradeMessages                                          │
│  ├─ tradeAlerts                                            │
│  ├─ tradeTrackingNumbers                                   │
│  ├─ tradeReceiptConfirmation                               │
│  ├─ tradeComplaints                                        │
│  ├─ tradeReviews                                           │
│  ├─ userRatingSummary                                      │
│  ├─ tradeAdminLog                                          │
│  └─ proposalReadStatus                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NOTIFICATION SYSTEM                                        │
│  ├─ Trade Alerts (Bell Icon)                               │
│  ├─ Email Notifications                                    │
│  ├─ In-App Notifications                                   │
│  └─ Daily Reminders                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Complete Schema Design

#### 1. Trades Table (Core Trade Record)

```sql
CREATE TABLE trades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeReferenceNumber VARCHAR(20) UNIQUE NOT NULL, -- TR-MMDDYY-XXXXXX
  initiatorUserId INT NOT NULL REFERENCES users(id),
  recipientUserId INT NOT NULL REFERENCES users(id),
  requestedListingId INT NOT NULL REFERENCES listings(id),
  
  -- Status progression
  status ENUM(
    'initiated',      -- Stage 1: Proposal sent
    'negotiating',    -- Stage 2: Negotiation in progress
    'accepted',       -- Stage 3: Both accepted, shipping
    'completed',      -- Stage 4: Receipt confirmed
    'cancelled',      -- Trade cancelled by either user
    'disputed'        -- Complaint filed
  ) DEFAULT 'initiated',
  
  -- Optional message from initiator
  initiatorMessage TEXT,
  
  -- Decline reason (if declined)
  declineReason TEXT,
  
  -- Timestamps for each stage
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  initiatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  negotiatingAt TIMESTAMP,
  acceptedAt TIMESTAMP,
  completedAt TIMESTAMP,
  cancelledAt TIMESTAMP,
  
  -- Deadlines
  shippingDeadline TIMESTAMP,    -- 5 days after accepted
  receiptDeadline TIMESTAMP,     -- 15 days after tracking submitted
  feedbackDeadline TIMESTAMP,    -- 7 days after completed
  
  -- Activity tracking for auto-cancel
  lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_initiator (initiatorUserId),
  INDEX idx_recipient (recipientUserId),
  INDEX idx_status (status),
  INDEX idx_reference (tradeReferenceNumber),
  INDEX idx_created (createdAt)
);
```

#### 2. Trade Proposals Table

```sql
CREATE TABLE tradeProposals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  proposerId INT NOT NULL REFERENCES users(id),
  
  -- Proposal data (JSON for flexibility)
  proposalData JSON NOT NULL,
  -- Structure:
  -- {
  --   "proposedListingIds": [123, 456],
  --   "cashFromProposer": 25,
  --   "cashFromRecipient": 10,
  --   "message": "Optional message"
  -- }
  
  -- Status of this specific proposal
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  isCurrentProposal BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_trade (tradeId),
  INDEX idx_current (tradeId, isCurrentProposal),
  INDEX idx_proposer (proposerId)
);
```

#### 3. Trade Messages Table

```sql
CREATE TABLE tradeMessages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  senderId INT NOT NULL REFERENCES users(id),
  
  message TEXT NOT NULL,
  messageType ENUM(
    'regular',           -- Normal user message
    'rejection',         -- Proposal rejection
    'proposalUpdate',    -- Proposal was updated
    'trackingSubmitted', -- Tracking numbers submitted
    'itemsReceived',     -- Items received confirmed
    'complaintFiled'     -- Complaint filed
  ) DEFAULT 'regular',
  
  -- Additional context
  rejectionReason TEXT,
  proposalId INT REFERENCES tradeProposals(id),
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_trade (tradeId),
  INDEX idx_sender (senderId),
  INDEX idx_type (messageType)
);
```

#### 4. Trade Alerts Table

```sql
CREATE TABLE tradeAlerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  recipientUserId INT NOT NULL REFERENCES users(id),
  
  alertType ENUM(
    'initiated',         -- Trade proposal sent
    'declined',          -- Trade proposal declined
    'counterProposal',   -- Counter-proposal sent
    'accepted',          -- Proposal accepted
    'rejected',          -- Proposal rejected
    'trackingSubmitted', -- Tracking numbers submitted
    'itemsReceived',     -- Items received confirmed
    'complaintFiled',    -- Complaint filed
    'feedbackLeft'       -- Feedback left
  ) NOT NULL,
  
  message TEXT,
  isRead BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_recipient (recipientUserId),
  INDEX idx_trade (tradeId),
  INDEX idx_unread (recipientUserId, isRead),
  INDEX idx_created (createdAt)
);
```

#### 5. Trade Tracking Numbers Table

```sql
CREATE TABLE tradeTrackingNumbers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  userId INT NOT NULL REFERENCES users(id),
  listingId INT NOT NULL REFERENCES listings(id),
  
  carrier ENUM('USPS', 'UPS', 'FedEx', 'DHL') NOT NULL,
  trackingNumber VARCHAR(50) NOT NULL,
  trackingUrl VARCHAR(500),
  
  isValid BOOLEAN DEFAULT TRUE,
  validatedAt TIMESTAMP,
  
  submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_trade (tradeId),
  INDEX idx_user (userId),
  INDEX idx_listing (listingId)
);
```

#### 6. Trade Receipt Confirmation Table

```sql
CREATE TABLE tradeReceiptConfirmation (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  userId INT NOT NULL REFERENCES users(id),
  
  confirmedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_trade_user (tradeId, userId),
  INDEX idx_trade (tradeId)
);
```

#### 7. Trade Complaints Table

```sql
CREATE TABLE tradeComplaints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  complaintUserId INT NOT NULL REFERENCES users(id),
  
  description TEXT NOT NULL,
  complaintType ENUM('damaged', 'missing', 'notAsDescribed') NOT NULL,
  photos JSON, -- Array of photo URLs
  
  status ENUM('filed', 'resolved', 'dismissed') DEFAULT 'filed',
  adminNotes TEXT,
  
  resolvedAt TIMESTAMP,
  resolvedByAdminId INT REFERENCES users(id),
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_trade (tradeId),
  INDEX idx_status (status),
  INDEX idx_created (createdAt)
);
```

#### 8. Trade Reviews Table

```sql
CREATE TABLE tradeReviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeId INT NOT NULL REFERENCES trades(id),
  reviewerId INT NOT NULL REFERENCES users(id),
  revieweeId INT NOT NULL REFERENCES users(id),
  
  -- Ratings (0-5)
  tradeExperienceRating INT NOT NULL CHECK (tradeExperienceRating BETWEEN 0 AND 5),
  itemConditionRating INT NOT NULL CHECK (itemConditionRating BETWEEN 0 AND 5),
  communicationRating INT NOT NULL CHECK (communicationRating BETWEEN 0 AND 5),
  shippingSpeedRating INT NOT NULL CHECK (shippingSpeedRating BETWEEN 0 AND 5),
  overallRating DECIMAL(2,1),
  
  -- Review content
  reviewText TEXT,
  photos JSON,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_trade_reviewer (tradeId, reviewerId),
  INDEX idx_reviewee (revieweeId),
  INDEX idx_created (createdAt),
  INDEX idx_overall (overallRating)
);
```

#### 9. User Rating Summary Table

```sql
CREATE TABLE userRatingSummary (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE REFERENCES users(id),
  
  totalReviews INT DEFAULT 0,
  averageRating DECIMAL(2,1) DEFAULT 0,
  
  fiveStarCount INT DEFAULT 0,
  fourStarCount INT DEFAULT 0,
  threeStarCount INT DEFAULT 0,
  twoStarCount INT DEFAULT 0,
  oneStarCount INT DEFAULT 0,
  zeroStarCount INT DEFAULT 0,
  
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_average (averageRating)
);
```

#### 10. Proposal Read Status Table

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

#### 11. Trade Admin Log Table

```sql
CREATE TABLE tradeAdminLog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tradeReferenceNumber VARCHAR(20) NOT NULL REFERENCES trades(tradeReferenceNumber),
  
  eventType ENUM(
    'initiated',
    'declined',
    'counterProposal',
    'accepted',
    'rejected',
    'negotiating',
    'trackingSubmitted',
    'itemsReceived',
    'completed',
    'cancelled',
    'complaintFiled',
    'complaintResolved',
    'feedbackSubmitted'
  ) NOT NULL,
  
  initiatorUserId INT REFERENCES users(id),
  recipientUserId INT REFERENCES users(id),
  
  details JSON, -- Event-specific details
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_reference (tradeReferenceNumber),
  INDEX idx_event (eventType),
  INDEX idx_created (createdAt)
);
```

---

## API Procedures

### Complete tRPC Router Structure

```typescript
// Market Router - Trade Procedures
router.market = {
  // Stage 1: Trade Initiation
  initiateTradeProposal: protectedProcedure
    .input(z.object({
      listingId: z.number(),
      message: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  declineTradeProposal: protectedProcedure
    .input(z.object({
      tradeId: z.number(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  getTradeAlerts: protectedProcedure
    .input(z.object({
      folder: z.enum(['pending', 'declined', 'completed']),
      limit: z.number().optional(),
      offset: z.number().optional()
    }))
    .query(async ({ ctx, input }) => {
      // Implementation
    }),

  // Stage 2: Negotiation
  sendTradeProposal: protectedProcedure
    .input(z.object({
      tradeId: z.number(),
      proposedListingIds: z.array(z.number()),
      cashFromProposer: z.number().optional(),
      cashFromRecipient: z.number().optional(),
      message: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  acceptTradeProposal: protectedProcedure
    .input(z.object({
      tradeId: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  rejectTradeProposal: protectedProcedure
    .input(z.object({
      tradeId: z.number(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  getTradeDetails: protectedProcedure
    .input(z.object({
      tradeId: z.number()
    }))
    .query(async ({ ctx, input }) => {
      // Implementation
    }),

  // Stage 3: Shipping & Verification
  submitTrackingNumbers: protectedProcedure
    .input(z.object({
      tradeId: z.number(),
      trackingNumbers: z.array(z.object({
        listingId: z.number(),
        carrier: z.enum(['USPS', 'UPS', 'FedEx', 'DHL']),
        trackingNumber: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  confirmItemsReceived: protectedProcedure
    .input(z.object({
      tradeId: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  fileTradeComplaint: protectedProcedure
    .input(z.object({
      tradeId: z.number(),
      description: z.string(),
      complaintType: z.enum(['damaged', 'missing', 'notAsDescribed']),
      photoUrls: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  // Stage 4: Feedback
  submitTradeReview: protectedProcedure
    .input(z.object({
      tradeId: z.number(),
      tradeExperienceRating: z.number().min(0).max(5),
      itemConditionRating: z.number().min(0).max(5),
      communicationRating: z.number().min(0).max(5),
      shippingSpeedRating: z.number().min(0).max(5),
      reviewText: z.string().optional(),
      photoUrls: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  getTradeReviews: protectedProcedure
    .input(z.object({
      tradeId: z.number()
    }))
    .query(async ({ ctx, input }) => {
      // Implementation
    }),

  getUserRatingSummary: publicProcedure
    .input(z.object({
      userId: z.number(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      sortBy: z.enum(['newest', 'oldest', 'highest', 'lowest']).optional(),
      filterBy: z.number().optional()
    }))
    .query(async ({ input }) => {
      // Implementation
    })
};

// Admin Router - Trade Management
router.admin = {
  getAllTrades: adminProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional()
    }))
    .query(async ({ input }) => {
      // Implementation
    }),

  getTradeByReference: adminProcedure
    .input(z.object({
      tradeReferenceNumber: z.string()
    }))
    .query(async ({ input }) => {
      // Implementation
    }),

  resolveTradeComplaint: adminProcedure
    .input(z.object({
      complaintId: z.number(),
      resolution: z.enum(['resolved', 'dismissed']),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    })
};
```

---

## Notification System

### Notification Types & Triggers

| Event | Recipient | Alert Type | Trigger |
|-------|-----------|-----------|---------|
| Trade Initiated | Recipient | `initiated` | User A clicks Trade Proposal |
| Trade Declined | Initiator | `declined` | User B declines proposal |
| Counter-Proposal | Recipient | `counterProposal` | User sends proposal |
| Proposal Accepted | Recipient | `accepted` | User accepts proposal |
| Proposal Rejected | Recipient | `rejected` | User rejects proposal |
| Tracking Submitted | Recipient | `trackingSubmitted` | User submits tracking numbers |
| Items Received | Recipient | `itemsReceived` | User confirms receipt |
| Complaint Filed | Admin | `complaintFiled` | User files complaint |
| Feedback Left | Recipient | `feedbackLeft` | User submits feedback |

### Notification Delivery Channels

1. **Trade Alert Icon (Bell)**
   - In-app notification
   - Shows unread count
   - Flashes on new alert
   - Separate from messages

2. **In-App Notification**
   - Toast notification
   - Appears when user is active
   - Dismissible

3. **Email Notification** (Optional)
   - Sent for important events
   - Daily digest option
   - Configurable in preferences

4. **Daily Reminders**
   - Sent for pending actions
   - After specific time periods
   - Encourages timely completion

---

## Admin Logging

### Log Entry Structure

```typescript
interface TradeAdminLogEntry {
  id: number;
  tradeReferenceNumber: string;
  eventType: string;
  initiatorUserId?: number;
  recipientUserId?: number;
  details: {
    // Event-specific details
    proposalId?: number;
    itemsProposed?: Array<{ listingId, title, value }>;
    cashAmounts?: { from, to };
    reason?: string;
    complaintType?: string;
    trackingNumbers?: Array<{ carrier, number }>;
    ratings?: { experience, condition, communication, shipping };
    // ... etc
  };
  createdAt: Date;
}
```

### Logged Events

1. **Trade Initiated**
   - Initiator, Recipient, Item
   - Optional message

2. **Trade Declined**
   - Reason (if provided)

3. **Proposal Sent**
   - Proposer, Items, Cash amounts

4. **Proposal Accepted/Rejected**
   - Reason (if provided)

5. **Tracking Submitted**
   - Tracking numbers, Carriers

6. **Items Received**
   - Timestamp

7. **Complaint Filed**
   - Type, Description, Photos

8. **Feedback Submitted**
   - Ratings, Review text

---

## Data Flow

### Complete Trade Lifecycle Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: TRADE INITIATION                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User A: Click "Trade Proposal"                              │
│   ↓                                                         │
│ Frontend: Call initiateTradeProposal()                      │
│   ↓                                                         │
│ Backend: Validate (auth, not suspended, not self-trade)     │
│   ↓                                                         │
│ Database: Create trades record (status: initiated)          │
│   ↓                                                         │
│ Database: Create tradeAlerts record                         │
│   ↓                                                         │
│ Database: Create tradeAdminLog entry                        │
│   ↓                                                         │
│ Notification: Send to User B (bell icon)                    │
│   ↓                                                         │
│ Frontend: Show confirmation popup to User A                 │
│   ↓                                                         │
│ Frontend: Change button to "Negotiating in Process"         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: NEGOTIATION                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User B: Click "View Inventory"                              │
│   ↓                                                         │
│ Frontend: Load User A's inventory                           │
│   ↓                                                         │
│ Backend: Update trades status (initiated → negotiating)     │
│   ↓                                                         │
│ User B: Select items, add cash, click "Send Proposal"       │
│   ↓                                                         │
│ Frontend: Call sendTradeProposal()                          │
│   ↓                                                         │
│ Backend: Validate proposal data                             │
│   ↓                                                         │
│ Database: Create tradeProposals record                      │
│   ↓                                                         │
│ Database: Mark previous proposal as not current             │
│   ↓                                                         │
│ Database: Create tradeMessages record (proposalUpdate)      │
│   ↓                                                         │
│ Database: Create tradeAlerts record                         │
│   ↓                                                         │
│ Database: Update proposalReadStatus                         │
│   ↓                                                         │
│ Notification: Send to User A (if not read previous)         │
│   ↓                                                         │
│ Frontend: Update Trade Summary in real-time                 │
│                                                             │
│ [Back and forth until mutual acceptance]                    │
│                                                             │
│ User A: Click "Accept Proposal"                             │
│   ↓                                                         │
│ Frontend: Show confirmation dialog                          │
│   ↓                                                         │
│ Frontend: Call acceptTradeProposal()                        │
│   ↓                                                         │
│ Database: Mark proposal as accepted                         │
│   ↓                                                         │
│ Database: Create tradeAlerts record                         │
│   ↓                                                         │
│ Notification: Send to User B (3-day acceptance window)      │
│   ↓                                                         │
│ User B: Click "Accept Proposal" within 3 days               │
│   ↓                                                         │
│ Database: Update trades status (negotiating → accepted)     │
│   ↓                                                         │
│ Database: Set shipping deadlines                            │
│   ↓                                                         │
│ Frontend: Show Shipping Information section                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: SHIPPING & VERIFICATION                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User A: Ship items, enter tracking numbers                  │
│   ↓                                                         │
│ Frontend: Call submitTrackingNumbers()                      │
│   ↓                                                         │
│ Backend: Validate tracking numbers with carrier             │
│   ↓                                                         │
│ Database: Create tradeTrackingNumbers records               │
│   ↓                                                         │
│ Database: Generate tracking URLs                            │
│   ↓                                                         │
│ Database: Create tradeAlerts record                         │
│   ↓                                                         │
│ Notification: Send to User B                                │
│   ↓                                                         │
│ User B: Receives items, clicks "Items Received"             │
│   ↓                                                         │
│ Frontend: Show confirmation dialog                          │
│   ↓                                                         │
│ Frontend: Call confirmItemsReceived()                       │
│   ↓                                                         │
│ Database: Create tradeReceiptConfirmation record            │
│   ↓                                                         │
│ Notification: Send to User A                                │
│   ↓                                                         │
│ User A: Clicks "Items Received"                             │
│   ↓                                                         │
│ Database: Create tradeReceiptConfirmation record            │
│   ↓                                                         │
│ Database: Update trades status (accepted → completed)       │
│   ↓                                                         │
│ Frontend: Show Feedback section                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: FEEDBACK & RATINGS                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User A: Rate and review, click "Submit Feedback"            │
│   ↓                                                         │
│ Frontend: Call submitTradeReview()                          │
│   ↓                                                         │
│ Backend: Validate ratings (0-5)                             │
│   ↓                                                         │
│ Database: Create tradeReviews record                        │
│   ↓                                                         │
│ Database: Calculate overall rating                          │
│   ↓                                                         │
│ Database: Update userRatingSummary                          │
│   ↓                                                         │
│ Database: Create tradeAlerts record                         │
│   ↓                                                         │
│ Notification: Send to User B                                │
│   ↓                                                         │
│ Frontend: Show feedback on profile                          │
│   ↓                                                         │
│ User B: Leaves feedback (same process)                      │
│   ↓                                                         │
│ Trade fully completed                                       │
│ Trade reference archived for audit trail                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## State Machine

### Trade Status Transitions

```
┌─────────────┐
│  initiated  │ ← Trade proposal sent
└──────┬──────┘
       │
       ├─→ [DECLINE] ──→ Trade ends (can re-initiate)
       │
       └─→ [VIEW INVENTORY] ──→ ┌──────────────┐
                                │ negotiating  │ ← Proposals exchanged
                                └──────┬───────┘
                                       │
                                       ├─→ [CANCEL] ──→ Trade ends
                                       │
                                       ├─→ [AUTO-CANCEL] ──→ Trade ends (10 days no activity)
                                       │
                                       └─→ [BOTH ACCEPT] ──→ ┌──────────┐
                                                             │ accepted │ ← Shipping phase
                                                             └──────┬───┘
                                                                    │
                                                                    ├─→ [CANCEL] ──→ Trade ends
                                                                    │
                                                                    ├─→ [FILE COMPLAINT] ──→ ┌──────────┐
                                                                    │                        │ disputed │
                                                                    │                        └──────────┘
                                                                    │
                                                                    └─→ [BOTH CONFIRM RECEIPT] ──→ ┌───────────┐
                                                                                                    │ completed │ ← Feedback phase
                                                                                                    └───────────┘
```

### Proposal Status Transitions

```
┌─────────────┐
│   pending   │ ← Proposal sent
└──────┬──────┘
       │
       ├─→ [ACCEPT] ──→ ┌──────────┐
       │                │ accepted │
       │                └──────────┘
       │
       └─→ [REJECT] ──→ [SEND NEW PROPOSAL] ──→ ┌─────────┐
                                                 │ pending │ (new proposal)
                                                 └─────────┘
```

---

## Error Handling

### Error Codes & Messages

| Code | Message | Cause | Recovery |
|------|---------|-------|----------|
| `UNAUTHORIZED` | User not logged in | No auth token | User must log in |
| `FORBIDDEN` | Account suspended | User account suspended | Admin must unsuspend |
| `FORBIDDEN` | Cannot trade with yourself | Self-trade attempt | Choose different item |
| `NOT_FOUND` | Trade not found | Invalid trade ID | Check trade reference |
| `BAD_REQUEST` | Invalid tracking number | Tracking format invalid | Re-enter valid number |
| `BAD_REQUEST` | At least one item required | Empty proposal | Select items or add cash |
| `CONFLICT` | Trade already has feedback | Duplicate feedback | Cannot submit again |
| `INTERNAL_ERROR` | Database error | DB connection issue | Retry operation |

### Validation Rules

1. **Trade Initiation**
   - User must be authenticated
   - User must not be suspended
   - Recipient must not be suspended
   - User cannot trade with themselves
   - Listing must exist and be active

2. **Proposal Sending**
   - At least one item OR cash required
   - All listing IDs must exist
   - All listings must belong to correct user
   - Cash amounts must be positive
   - User must be recipient of trade

3. **Tracking Numbers**
   - At least one tracking number required
   - Tracking number must be valid for carrier
   - Carrier must be selected
   - Tracking number must form valid link

4. **Receipt Confirmation**
   - Both users must have submitted tracking
   - User must not have already confirmed
   - Trade must be in `accepted` status

5. **Feedback Submission**
   - At least one rating required (0-5)
   - All ratings must be 0-5 integers
   - User must not have already left feedback
   - Trade must be in `completed` status
   - Photos must be images only, max 5MB

---

## Performance Optimization

### Database Optimization

1. **Indexes**
   ```sql
   -- Trade lookups
   CREATE INDEX idx_initiator ON trades(initiatorUserId);
   CREATE INDEX idx_recipient ON trades(recipientUserId);
   CREATE INDEX idx_status ON trades(status);
   
   -- Proposal lookups
   CREATE INDEX idx_trade_current ON tradeProposals(tradeId, isCurrentProposal);
   
   -- Alert lookups
   CREATE INDEX idx_recipient_unread ON tradeAlerts(recipientUserId, isRead);
   
   -- Rating lookups
   CREATE INDEX idx_reviewee_rating ON tradeReviews(revieweeId, overallRating);
   
   -- Admin log lookups
   CREATE INDEX idx_reference_event ON tradeAdminLog(tradeReferenceNumber, eventType);
   ```

2. **Query Optimization**
   - Load current proposal only (not all historical)
   - Paginate message threads (50 per page)
   - Use composite indexes for common queries
   - Cache user rating summary

3. **Caching Strategy**
   - Cache user average rating (invalidate on new review)
   - Cache trade details (invalidate on status change)
   - Cache unread alert count (invalidate on new alert)

### Frontend Optimization

1. **Real-Time Updates**
   - Use WebSocket for live Trade Summary updates
   - Update proposal display as items selected
   - Show real-time unread count

2. **Lazy Loading**
   - Load trade alerts on demand
   - Paginate message thread
   - Load photos on demand

3. **Caching**
   - Cache trade details locally
   - Cache user profile data
   - Cache inventory list

---

## Security

### Authorization

1. **Trade Operations**
   - Only authenticated users can initiate trades
   - Only recipient can decline/accept/reject proposals
   - Only trade parties can submit tracking/confirm receipt
   - Only trade parties can file complaints
   - Only trade parties can leave feedback

2. **Admin Operations**
   - Only admins can view all trades
   - Only admins can resolve complaints
   - Only admins can moderate feedback

3. **Data Access**
   - Users can only see their own trades
   - Contact information only visible to trade parties
   - Feedback is public but shows user ID

### Data Protection

1. **Input Validation**
   - All inputs validated server-side
   - Message content sanitized (no XSS)
   - Tracking numbers validated against carrier formats
   - Photo uploads scanned for malware

2. **Data Encryption**
   - Contact information encrypted at rest
   - Sensitive data encrypted in transit (HTTPS)
   - Database credentials encrypted

3. **Audit Trail**
   - All trade events logged
   - Admin can view complete history
   - Trade reference number enables full audit

---

## Summary

The Trade Flow system is a comprehensive, multi-stage trading platform with:

- **4 Distinct Stages:** Initiation, Negotiation, Shipping, Feedback
- **Complex State Machine:** Handles all possible trade states and transitions
- **Real-Time Notifications:** Keeps users informed of all trade activity
- **Admin Oversight:** Complete logging and complaint resolution
- **Reputation System:** Public feedback and ratings for trust building
- **Error Handling:** Comprehensive validation and error messages
- **Performance Optimization:** Indexed queries and caching strategy
- **Security:** Authorization, data protection, and audit trail

All stages are fully specified and ready for implementation on 6/17/26.

---

**Document References:**
- See TRADE_FLOW_STAGE_1_SPECIFICATION.md for Stage 1 details
- See TRADE_FLOW_STAGE_2_SPECIFICATION.md for Stage 2 details
- See TRADE_FLOW_STAGE_3_SPECIFICATION.md for Stage 3 details
- See TRADE_FLOW_STAGE_4_SPECIFICATION.md for Stage 4 details
