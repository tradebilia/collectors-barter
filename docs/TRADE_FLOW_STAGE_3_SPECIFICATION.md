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
