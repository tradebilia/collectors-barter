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
