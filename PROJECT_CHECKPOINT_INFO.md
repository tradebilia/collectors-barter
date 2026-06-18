# Tradebilia Project - Checkpoint & Reference Information

**Date:** June 17, 2026  
**Checkpoint Version:** bbc9c646  
**Status:** Stable - All bugs fixed, 151 tests passing

---

## Current Project Status

### ✅ Completed Features
- Top Rated Traders navigation (clickable trader entries)
- Admin referral deletion (individual + bulk delete)
- Filter optimization utilities (8 components)
- All pre-existing test failures fixed (100% pass rate)
- Duplicate referral requests fixed
- Filter clear button visual feedback fixed

### 📊 Test Results
- **Total Tests:** 151
- **Passed:** 151 ✅
- **Failed:** 0 ✅
- **Skipped:** 25
- **Pass Rate:** 100%

### 🔧 Technical Health
- TypeScript: No errors
- Build: No errors
- Dependencies: OK
- LSP: No errors

---

## Development Environment URLs

### Primary URLs
- **Dev Server:** https://3000-ipb973n2rhhm4b8ry81xm-522c8052.us1.manus.computer
- **Custom Domain:** tradebilia-tzzwlt5f.manus.space
- **Project Path:** /home/ubuntu/collectors-barter

### Admin Credentials (for testing)
- **Username:** AdminTavani
- **Password:** Fizz7718!!!!

---

## Key Project Files

### Database & Schema
- **Schema Definition:** `/home/ubuntu/collectors-barter/drizzle/schema.ts`
- **Database Helpers:** `/home/ubuntu/collectors-barter/server/db.ts`
- **Migrations:** `/home/ubuntu/collectors-barter/drizzle/migrations/`

### Backend
- **tRPC Routers:** `/home/ubuntu/collectors-barter/server/routers.ts`
- **Core Server:** `/home/ubuntu/collectors-barter/server/_core/`
- **Tests:** `/home/ubuntu/collectors-barter/server/*.test.ts`

### Frontend
- **Add Inventory Form:** `/home/ubuntu/collectors-barter/client/src/pages/AddInventory.tsx`
- **Category Page:** `/home/ubuntu/collectors-barter/client/src/pages/CategoryPage.tsx`
- **App Router:** `/home/ubuntu/collectors-barter/client/src/App.tsx`
- **Components:** `/home/ubuntu/collectors-barter/client/src/components/`

### Documentation
- **Project README:** `/home/ubuntu/collectors-barter/README.md`
- **Todo List:** `/home/ubuntu/collectors-barter/todo.md`
- **Add to Inventory Redesign Spec:** `/home/ubuntu/collectors-barter/ADD_TO_INVENTORY_REDESIGN_SPEC.md` (NEW)

---

## Git Information

### Repository
- **Owner:** tradebilia
- **Repo:** collectors-barter
- **Branch:** main
- **Latest Commit:** bbc9c646

### Recent Commits
1. **bbc9c646** - Fixed filter clear button visual feedback (Input component forwardRef)
2. **Previous** - Admin referral deletion feature + referral deduplication
3. **Previous** - Filter optimization utilities implementation

### How to Push Changes
```bash
cd /home/ubuntu/collectors-barter
git add -A
git commit -m "Your commit message"
git push origin main
```

---

## Database Information

### Connection
- **Database URL:** Stored in environment variable `DATABASE_URL`
- **Type:** MySQL/TiDB
- **Tables:** 20+ tables (users, listings, tradeProposals, etc.)

### Key Tables for Add to Inventory
- **listings** - Main collectible listings
  - Columns: id, ownerId, title, category, condition, grade, certificationCompany, estimatedValue, description, itemDetails (JSON), status, isActive, featured, viewCount, createdAt, updatedAt
  - **NEW:** itemType column (to be added during implementation)
  
- **listingPhotos** - Photos for listings
  - Columns: id, listingId, fileKey, imageUrl, altText, sortOrder, createdAt

- **draftListings** - Saved drafts
  - Stores draft data for users to continue later

---

## Recent Changes & Bug Fixes

### Latest Checkpoint (bbc9c646)
**Filter Clear Button Visual Feedback - FIXED**
- Problem: Clear button didn't visually clear input fields
- Root Cause: Input component wasn't using React.forwardRef
- Solution: Converted Input component to use forwardRef
- Result: Input fields now visually clear when filters are cleared
- Impact: Cosmetic fix, no data changes

### Previous Major Fixes
1. **Duplicate Referral Requests** - Deduplication logic added
2. **All Pre-existing Test Failures** - 18 failures fixed, now 100% pass rate
3. **Admin Referral Deletion** - Individual and bulk delete working

---

## Upcoming Work: Add to Inventory Redesign

### Overview
Major enhancement to the Add to Inventory form with:
- Two-level categorization (Category → Item Type)
- Dynamic form fields based on item type
- 30+ field combinations
- Conditional field logic
- Collapsible sections

### Current Phase
**PLANNING PHASE** - Specification complete, awaiting implementation approval

### Specification Document
- **Location:** `/home/ubuntu/collectors-barter/ADD_TO_INVENTORY_REDESIGN_SPEC.md`
- **Status:** Complete and detailed
- **Covers:** All decisions, pending questions, implementation phases, database changes

### Key Decisions Made
- Migrate all existing listings to new structure
- Collapsible sections for Recommended/Optional fields
- Hide conditional fields completely (no grayed-out state)
- Store "Other" values same as dropdown values
- Validate "Other" values to prevent duplicates
- White asterisks for required fields
- Form resets on category/item type change

### Pending Questions
- [ ] What happens after "Save as Draft" click?
- [ ] Item Type filter UI: dropdown, checkboxes, or toggles?
- [ ] Invalid grading companies: disabled or hidden?
- [ ] Quantity field: always editable, disabled for singles, or hidden for singles?
- [ ] Collection/Lot visual indicator: style, banner, or silent?

---

## Testing & QA

### Current Test Suite
- **Framework:** Vitest
- **Coverage:** Unit tests for auth, database operations, tRPC procedures
- **Location:** `/home/ubuntu/collectors-barter/server/*.test.ts`
- **Run Tests:** `pnpm test`

### Key Test Files
- `server/auth.logout.test.ts` - Reference test file
- `server/db.test.ts` - Database operation tests
- `server/routers.test.ts` - tRPC procedure tests

### Running Tests
```bash
cd /home/ubuntu/collectors-barter
pnpm test                    # Run all tests
pnpm test -- --watch        # Watch mode
pnpm test -- --coverage     # With coverage report
```

---

## Deployment & Hosting

### Current Hosting
- **Mode:** Autoscale (serverless)
- **Platform:** Manus built-in hosting
- **Domain:** tradebilia-tzzwlt5f.manus.space
- **Publish Button:** Available in Management UI (requires checkpoint)

### How to Publish
1. Create checkpoint: `webdev_save_checkpoint`
2. Click "Publish" button in Management UI
3. Select checkpoint to publish
4. Confirm deployment

---

## Important Notes

### ⚠️ Critical Reminders
1. **Database is NOT recoverable** - Exercise extreme caution with destructive SQL
2. **All static assets** must be uploaded via `manus-upload-file --webdev`
3. **No local file storage** - Use S3 for all media files
4. **Environment variables** - Manage via `webdev_request_secrets`
5. **Git commits** - Always create checkpoint before major changes

### 🔐 Security
- OAuth authentication via Manus
- JWT session cookies
- Protected procedures for admin operations
- Role-based access control (user vs admin)

### 📱 Responsive Design
- Mobile-first approach
- Tailwind CSS 4 with OKLCH colors
- Tested on mobile, tablet, desktop

---

## Contact & Support

### For Issues
- Check `.manus-logs/` directory for error logs
- Review todo.md for known issues
- Use `webdev_debug` for complex issues

### For Questions About Implementation
- Refer to ADD_TO_INVENTORY_REDESIGN_SPEC.md
- Check field_specifications.md for detailed field info
- Review discussion decisions in specification

---

## File Attachments & References

### Specification Documents
- **Field Specifications:** `/home/ubuntu/upload/field_specifications.md`
- **Add to Inventory Redesign:** `/home/ubuntu/collectors-barter/ADD_TO_INVENTORY_REDESIGN_SPEC.md`

### Project Shared Files (from project context)
- 2022 Charizard V.png
- 1986-87 Michael Jordan.jpg
- 1999 Charizard - Holo.png
- 2019 Sun & Moon.png
- 1981 Joe Montana.png
- 1990 Martin Brodeur.png
- Star Wars 1.png
- 1980 Rickey Henderson.png
- 1976 Walter Payton.png
- Edge of Spider-Verse 2.png

---

**Last Updated:** June 17, 2026  
**Next Review:** After Add to Inventory redesign implementation  
**Checkpoint Status:** ✅ STABLE - Ready for fallback
