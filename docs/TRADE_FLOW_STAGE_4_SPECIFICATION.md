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
