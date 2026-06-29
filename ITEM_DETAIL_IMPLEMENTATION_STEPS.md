# Item Detail Page Implementation - Step-by-Step Plan

## Overview
This plan breaks down the Item Detail page updates into small, testable steps. Each step can be implemented, tested, and rolled back independently if needed.

---

## PHASE 1: UI Components (Steps 1-3)

### Step 1: Create ShareButtons Component
**File**: `client/src/components/ShareButtons.tsx`
- Create a reusable ShareButtons component
- Include: Facebook, Twitter/X, Copy Link buttons
- Add hover effects and styling
- **Test**: Component renders correctly with all buttons visible
- **Rollback**: Delete the component file

### Step 2: Create SaveButton Component (Heart Icon + Counter)
**File**: `client/src/components/SaveButton.tsx`
- Create SaveButton component with heart icon
- Display counter showing total saves
- Add toggle functionality (outline/solid red)
- Add hover effects
- **Test**: Heart toggles between outline and solid, counter displays
- **Rollback**: Delete the component file

### Step 3: Create CollapsibleSection Component
**File**: `client/src/components/CollapsibleSection.tsx`
- Create reusable collapsible section component
- Props: title, children, defaultOpen (boolean)
- Add smooth collapse/expand animation
- **Test**: Sections collapse and expand smoothly
- **Rollback**: Delete the component file

---

## PHASE 2: Database & Backend (Steps 4-6)

### Step 4: Add save_count Column to Items Table
**File**: `drizzle/schema.ts`
- Add `save_count: integer().default(0)` to items table
- Run migration: `pnpm drizzle-kit generate`
- Execute migration SQL via `webdev_execute_sql`
- **Test**: Database migration succeeds, column exists
- **Rollback**: Revert migration SQL

### Step 5: Create Saves Tracking Table
**File**: `drizzle/schema.ts`
- Create `itemSaves` table with: id, itemId, userId, createdAt
- Add unique constraint on (itemId, userId)
- Run migration and apply SQL
- **Test**: Table created successfully
- **Rollback**: Revert migration SQL

### Step 6: Add Backend Procedures for Saves
**File**: `server/routers.ts`
- Add `items.toggleSave` procedure (toggle save status)
- Add `items.getSaveCount` procedure (get total saves)
- Add `items.isUserSaved` procedure (check if current user saved)
- **Test**: Procedures work in tRPC client
- **Rollback**: Remove procedures from routers.ts

---

## PHASE 3: ItemDetail Updates (Steps 7-10)

### Step 7: Remove Unnecessary Fields from Quick Info
**File**: `client/src/pages/ItemDetail.tsx`
- Remove "Listing status" field from quick info grid
- Remove "Saved by you" field from quick info grid
- Keep: Condition, Estimated Value, Listed Date
- **Test**: Fields removed, page still displays correctly
- **Rollback**: Restore removed fields

### Step 8: Add SaveButton to Photo Section
**File**: `client/src/pages/ItemDetail.tsx`
- Import SaveButton component
- Position heart icon + counter in bottom-right of photo
- Connect to `items.toggleSave` mutation
- Display save count from database
- **Test**: Heart icon appears, toggle works, counter updates
- **Rollback**: Remove SaveButton component

### Step 9: Add ShareButtons to Quick Info Card
**File**: `client/src/pages/ItemDetail.tsx`
- Import ShareButtons component
- Add share section below action buttons
- Implement share functionality (Facebook, Twitter, Copy Link)
- **Test**: Share buttons appear, click triggers share actions
- **Rollback**: Remove ShareButtons component

### Step 10: Make Owner Section Clickable
**File**: `client/src/pages/ItemDetail.tsx`
- Wrap owner section in Link component
- Link to `/profile/[userId]` route
- Add hover effects (background change, lift effect)
- **Test**: Clicking owner navigates to profile page
- **Rollback**: Remove Link wrapper

---

## PHASE 4: Details Panel Reorganization (Steps 11-13)

### Step 11: Split Details Panel into Sections
**File**: `client/src/pages/ItemDetail.tsx`
- Reorganize Details panel into 3 sections:
  - "Details" (Required fields)
  - "Additional Details" (Recommended + Optional fields)
  - "Shipping" (Shipping fields)
- Use CollapsibleSection component for each
- **Test**: All three sections appear, data displays correctly
- **Rollback**: Revert to original Details panel

### Step 12: Make Description Section Collapsible
**File**: `client/src/pages/ItemDetail.tsx`
- Wrap Description in CollapsibleSection component
- Set defaultOpen={true}
- **Test**: Description section collapses/expands
- **Rollback**: Remove CollapsibleSection wrapper

### Step 13: Set Mobile Defaults for Collapsible Sections
**File**: `client/src/pages/ItemDetail.tsx`
- Add responsive logic to CollapsibleSection
- Desktop: Details & Additional Details default OPEN
- Mobile: Optional sections default CLOSED
- **Test**: Sections collapse/expand correctly on mobile
- **Rollback**: Remove responsive logic

---

## PHASE 5: Responsive Design (Steps 14-15)

### Step 14: Optimize Details Grid for Mobile
**File**: `client/src/pages/ItemDetail.tsx`
- Change Details grid from 3 columns to 1 column on mobile
- Add responsive breakpoints (< 768px)
- **Test**: Details grid displays correctly on mobile
- **Rollback**: Remove responsive styles

### Step 15: Test Full Responsive Experience
**File**: All ItemDetail components
- Test on desktop (1200px+), tablet (768px-1024px), mobile (< 768px)
- Verify all sections, buttons, and icons display correctly
- Check touch interactions on mobile
- **Test**: All responsive breakpoints work
- **Rollback**: Adjust responsive styles as needed

---

## PHASE 6: Testing & QA (Steps 16-18)

### Step 16: Write Unit Tests
**File**: `server/routers.test.ts`, `client/src/components/*.test.ts`
- Test SaveButton component (toggle, counter)
- Test ShareButtons component (all buttons render)
- Test CollapsibleSection component (collapse/expand)
- Test backend procedures (toggleSave, getSaveCount, isUserSaved)
- **Test**: All tests pass
- **Rollback**: Delete test files

### Step 17: Manual Testing
- Test save functionality (click heart, verify counter updates)
- Test share functionality (click share buttons)
- Test collapsible sections (expand/collapse, animations)
- Test owner section click (navigate to profile)
- Test on different devices/browsers
- **Test**: All features work as expected
- **Rollback**: Fix bugs or revert changes

### Step 18: Performance & Accessibility
- Check page load time
- Verify keyboard navigation works
- Check color contrast for accessibility
- Test with screen readers
- **Test**: Page meets performance and accessibility standards
- **Rollback**: Optimize as needed

---

## PHASE 7: Final Checkpoint (Step 19)

### Step 19: Create Final Checkpoint
- Run all tests
- Verify all features work
- Document all changes
- Create checkpoint for deployment
- **Test**: Checkpoint created successfully
- **Rollback**: Use `webdev_rollback_checkpoint` if needed

---

## Summary

| Phase | Steps | Focus | Estimated Time |
|-------|-------|-------|-----------------|
| **1** | 1-3 | UI Components | 2-3 hours |
| **2** | 4-6 | Database & Backend | 2-3 hours |
| **3** | 7-10 | ItemDetail Updates | 3-4 hours |
| **4** | 11-13 | Details Panel | 2-3 hours |
| **5** | 14-15 | Responsive Design | 1-2 hours |
| **6** | 16-18 | Testing & QA | 3-4 hours |
| **7** | 19 | Final Checkpoint | 0.5 hours |
| **TOTAL** | 19 | | **14-20 hours** |

---

## Checkpoint Strategy

- **After Step 3**: Checkpoint UI components
- **After Step 6**: Checkpoint backend changes
- **After Step 10**: Checkpoint ItemDetail updates
- **After Step 13**: Checkpoint Details panel reorganization
- **After Step 15**: Checkpoint responsive design
- **After Step 18**: Checkpoint testing complete
- **After Step 19**: Final checkpoint for deployment

Each checkpoint allows you to review changes and rollback if needed before moving to the next phase.

---

## Next Steps

1. Review this plan
2. Confirm you want to proceed with Step 1
3. Start implementation
4. Test each step
5. Create checkpoint after each phase
