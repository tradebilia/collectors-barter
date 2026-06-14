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
