# Tradebilia Project - Complete Documentation

**Project Name:** collectors-barter (Tradebilia)  
**Last Updated:** June 10, 2026  
**Version:** 8c37cf7a  
**Status:** Production Ready

---

## Project Overview

Tradebilia is a peer-to-peer collectors trading exchange platform built with React 19, Express 4, tRPC 11, and Tailwind CSS 4. The platform enables collectors to list items, browse categories, propose trades, and communicate with other collectors in real-time.

**Live Domain:** https://tradebilia-tzzwlt5f.manus.space

## ⚠️ CRITICAL: Database Configuration for New Sessions

**Primary Database (PRODUCTION):** `TzzwLt5FRwqjKKW5zhfchR`

**Connection String:**
```
mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={"rejectUnauthorized":true}
```

**⚠️ IMPORTANT:** Each new session may get a DIFFERENT database. Always verify DATABASE_URL matches above.

**See:** `NEW_SESSION_DATABASE_CONFIG.md` for complete setup instructions.

---

## Technology Stack

- **Frontend:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui
- **Backend:** Express 4 + tRPC 11 + Node.js
- **Database:** MySQL/TiDB with Drizzle ORM
- **Authentication:** Manus OAuth 2.0
- **Storage:** S3 (Manus built-in)
- **Real-time:** WebSocket-based messaging and presence
- **Testing:** Vitest

---

## Project Structure

```
collectors-barter/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities and helpers
│   │   ├── App.tsx           # Main app component
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   └── index.html            # HTML template
├── server/                    # Express backend
│   ├── routers.ts            # tRPC procedures
│   ├── db.ts                 # Database queries
│   ├── auth.logout.test.ts   # Test examples
│   └── _core/                # Framework internals
├── drizzle/                   # Database schema
│   ├── schema.ts             # Table definitions
│   └── migrations/           # SQL migrations
├── storage/                   # S3 helpers
├── shared/                    # Shared types
├── .env                       # Environment variables
├── package.json              # Dependencies
├── pnpm-lock.yaml            # Lock file
└── README.md                 # Project README
```

---

## Key Features Implemented

### Core Trading Platform
- ✅ User authentication with Manus OAuth
- ✅ Collectible item listings with photos
- ✅ 10 category pages (Comics, Sports Cards, Vintage Toys, Video Games, Stamps, Coins, Pokemon, Movies, Autographs, Disney Pins)
- ✅ Advanced filtering by condition, grade, year, etc.
- ✅ Trade Proposals system
- ✅ Real-time messaging between collectors
- ✅ Ratings and Reviews
- ✅ Watchlist functionality
- ✅ Member profiles and search
- ✅ Trade History tracking

### Recent Fixes & Improvements
- ✅ Fixed bidirectional messaging (users can see inquiries they sent)
- ✅ Fixed reply authorization (both sender and recipient can reply)
- ✅ Implemented per-user read status for messages
- ✅ Integrated animated Tradebilia logo in top bar
- ✅ Fixed filter state isolation across categories
- ✅ Dynamic market value calculations
- ✅ Category-specific background colors

---

## Database Schema

### Key Tables
- `users` - User accounts and profiles
- `listings` - Collectible items for trade
- `tradeProposals` - Trade requests between users
- `tradeMessages` - Messages within trade proposals
- `itemInquiries` - General inquiries between members
- `inquiryReplies` - Replies to inquiries
- `ratings` - Trade ratings and reviews
- `watchlist` - Saved listings

### Recent Schema Changes
- Added `senderIsRead` and `recipientIsRead` to `itemInquiries` table (June 10, 2026)
- Enables per-user read status tracking for messages

---

## Environment Variables

### System-Provided (Auto-Injected)
```
DATABASE_URL=mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={"rejectUnauthorized":true}
VITE_APP_ID=TzzwLt5FRwqjKKW5zhfchR
JWT_SECRET=(auto-injected)
OAUTH_SERVER_URL=(auto-injected)
VITE_OAUTH_PORTAL_URL=(auto-injected)
OWNER_OPEN_ID=(auto-injected)
OWNER_NAME=(auto-injected)
BUILT_IN_FORGE_API_URL=(auto-injected)
BUILT_IN_FORGE_API_KEY=(auto-injected)
VITE_FRONTEND_FORGE_API_KEY=(auto-injected)
VITE_FRONTEND_FORGE_API_URL=(auto-injected)
```

**⚠️ CRITICAL:** DATABASE_URL may differ in new sessions. Always verify it matches the primary database above.

---

## Git Repository

**Repository:** tradebilia/collectors-barter  
**Branch:** main  
**Remote:** origin (GitHub)

### Recent Commits
```
8c37cf7 - Checkpoint: Integrated AnimatedLogoSmall70 component into the TopBar
6ad0c44 - Checkpoint: Fixed critical bug in messaging system (bidirectional)
8bc2576 - Checkpoint: Fixed trade proposal messaging
e9c08fb - Checkpoint: Fixed Total Market Value statistic
493ab51 - Checkpoint: Fixed Clear all filters button
ef04828 - Checkpoint: Fixed filter state persistence across categories
```

### Git Workflow
1. All changes are committed to the main branch
2. Checkpoints are created after significant features
3. Git history is preserved for audit trail
4. No force pushes or destructive operations

---

## S3 Storage & Asset References

### Static Assets Location
- **Local Storage:** `/home/ubuntu/webdev-static-assets/`
- **S3 Bucket:** Manus built-in S3 storage
- **Access Pattern:** `/manus-storage/{key}` URLs

### Asset Categories
- **Item Photos:** Uploaded by users via Add Inventory flow
- **Category Wallpapers:** Sports Cards collage, etc.
- **Logo Files:** Tradebilia animated and static logos
- **Background Images:** Category-specific backgrounds

### Asset Upload Process
```bash
# Upload file to S3
manus-upload-file --webdev path/to/file.png

# Returns URL like:
# /manus-storage/image_a1b2c3d4.png

# Use in code:
<img src="/manus-storage/image_a1b2c3d4.png" />
```

---

## Deployment & Publishing

### Current Deployment
- **Platform:** Manus WebDev
- **Domain:** tradebilia-tzzwlt5f.manus.space
- **Status:** Active and running
- **Auto-deploy:** On git push to main

### Publishing Workflow
1. Create checkpoint via `webdev_save_checkpoint`
2. Click "Publish" button in Management UI
3. Changes deploy automatically to production

### Build Process
- Frontend: Vite build → optimized bundle
- Backend: Express server → Node.js runtime
- Database: Drizzle migrations applied automatically

---

## Testing

### Test Files
- `server/auth.logout.test.ts` - Authentication tests
- `server/inquiry-reply.test.ts` - Messaging system tests

### Running Tests
```bash
pnpm test                    # Run all tests
pnpm test server/auth       # Run specific test file
```

### Test Coverage
- Authentication flows
- Messaging system (bidirectional)
- Read status tracking
- Trade proposal lifecycle
- Filter state management

---

## Development Workflow

### Local Development
```bash
cd /home/ubuntu/collectors-barter

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Database Migrations
```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migration via webdev_execute_sql
webdev_execute_sql "SELECT * FROM migrations"
```

### Code Changes
1. Update schema in `drizzle/schema.ts`
2. Generate migration: `pnpm drizzle-kit generate`
3. Apply migration via `webdev_execute_sql`
4. Update backend in `server/db.ts` and `server/routers.ts`
5. Update frontend in `client/src/pages/` or `client/src/components/`
6. Write tests in `server/*.test.ts`
7. Run tests: `pnpm test`
8. Create checkpoint: `webdev_save_checkpoint`

---

## Known Issues & Limitations

### Cosmetic Issues
- Clear button doesn't visually clear input fields (state IS reset correctly)
- Low priority - functionality works as expected

### Feature Limitations
- Upcoming Convention page deferred (awaiting source data)
- Real-time presence requires active WebSocket connection
- File uploads limited to 16MB

---

## Performance Considerations

- Vite HMR for instant dev reload
- Optimized React renders with proper dependencies
- Database query optimization with Drizzle
- S3 storage for scalable file serving
- Tailwind CSS 4 with PurgeCSS for minimal bundle

---

## Security

- OAuth 2.0 authentication via Manus
- Session cookies with JWT signing
- HTTPS enforced on production
- SQL injection prevention via Drizzle ORM
- CORS properly configured
- Environment variables never committed

---

## Monitoring & Logs

### Log Files
- `.manus-logs/devserver.log` - Server startup and errors
- `.manus-logs/browserConsole.log` - Frontend console output
- `.manus-logs/networkRequests.log` - HTTP requests
- `.manus-logs/sessionReplay.log` - User interactions

### Health Checks
- Dev server status: `webdev_check_status`
- Build errors: `pnpm build`
- TypeScript errors: `pnpm tsc --noEmit`

---

## Asset Management

### All Item Images (31 total)
**Location:** `/client/public/images/`
**Storage:** All committed to git repo
**Categories:**
- 19 S3-uploaded images (Megatron, Trump, Star Wars, SuperMario3, Coins, etc.)
- 12 original images (Daredevil, Charizard, Joe Montana, etc.)

**Naming Format:** `{timestamp}-{randomId}-{itemName}_{hash}.{ext}`

**See:** `ITEM_IMAGES_INVENTORY.md` and `FILE_RENAME_MAPPING.md`

## Support & Maintenance

### Common Tasks

**Add a new feature:**
1. Update schema in `drizzle/schema.ts`
2. Generate and apply migration
3. Add database helpers in `server/db.ts`
4. Add tRPC procedure in `server/routers.ts`
5. Add UI in `client/src/pages/` or `client/src/components/`
6. Write tests in `server/*.test.ts`
7. Create checkpoint

**Fix a bug:**
1. Identify root cause
2. Write test that reproduces issue
3. Fix the code
4. Verify test passes
5. Create checkpoint

**Deploy changes:**
1. Ensure all tests pass: `pnpm test`
2. Create checkpoint: `webdev_save_checkpoint`
3. Click "Publish" in Management UI

---

## New Session Setup Checklist

**BEFORE starting any new session, read:** `NEW_SESSION_DATABASE_CONFIG.md`

1. [ ] Verify DATABASE_URL: `echo $DATABASE_URL`
2. [ ] Check database name is `TzzwLt5FRwqjKKW5zhfchR`
3. [ ] If different, update DATABASE_URL (see NEW_SESSION_DATABASE_CONFIG.md)
4. [ ] Restart dev server: `pnpm dev`
5. [ ] Test login with AdminTavani
6. [ ] Verify inventory items visible
7. [ ] Check images load correctly

## Contact & Resources

- **Repository:** https://github.com/tradebilia/collectors-barter
- **Live Site:** https://tradebilia-tzzwlt5f.manus.space
- **Manus Support:** https://help.manus.im
- **Project Owner:** Rich
- **Last Updated:** July 3, 2026
- **Database:** TzzwLt5FRwqjKKW5zhfchR (primary)

---

## Appendix: Recent Major Fixes

### Messaging System Bug Fix (June 9-10, 2026)

**Issue:** Users couldn't see inquiries they sent; only received inquiries were visible.

**Root Cause:** `getInquiriesByUser()` only returned inquiries where user was recipient.

**Solution:**
1. Updated `getInquiriesByUser()` to return inquiries where user is EITHER sender OR recipient
2. Added `senderIsRead` and `recipientIsRead` columns to track per-user read status
3. Updated `sendInquiryReply()` to only mark recipient as unread (sender doesn't get notified)
4. Frontend updated to check correct read status field based on user's role

**Result:** Bidirectional messaging now works perfectly. Users can:
- See inquiries they sent AND received
- Reply to inquiries they initiated
- Get notifications only for new messages from other users
- See proper read/unread status

**Files Modified:**
- `server/db.ts` - Updated query and reply logic
- `drizzle/schema.ts` - Added new columns
- `client/src/pages/Messages.tsx` - Updated read status logic
- `server/inquiry-reply.test.ts` - Added test coverage

---

**End of Documentation**
