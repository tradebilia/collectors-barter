# 🎉 Tradebilia Complete Handoff Guide

## Quick Start (2 Commands)

```bash
# 1. Clone from GitHub
git clone https://github.com/tradebilia/collectors-barter.git /home/ubuntu/collectors-barter

# 2. Run the complete handoff script
cd /home/ubuntu/collectors-barter
bash COMPLETE_HANDOFF.sh
```

That's it! The script handles everything.

---

## ⚠️ Important: Broken Image URLs

**When you clone the project, your database will have 21 broken image URLs.**

These are stored as `/images/...` paths but should be `/manus-storage/...` paths. The `COMPLETE_HANDOFF.sh` script will automatically fix all 21 of them for you.

---

## What the Script Does

The `COMPLETE_HANDOFF.sh` script automates the entire setup process:

1. ✅ Installs all dependencies with pnpm
2. ✅ Sets up environment variables (.env file)
3. ✅ Verifies database connection
4. ✅ **FIXES ALL 21 BROKEN IMAGE URLs** in the database (converts `/images/...` to `/manus-storage/...`)
5. ✅ Collects database statistics
6. ✅ Verifies git configuration
7. ✅ Provides complete summary and next steps

---

## Manual Setup (If Script Fails)

If `COMPLETE_HANDOFF.sh` encounters issues, follow these manual steps:

### Step 1: Install Dependencies
```bash
cd /home/ubuntu/collectors-barter
pnpm install
```

### Step 2: Create .env File
Create `/home/ubuntu/collectors-barter/.env` with these values:

```env
# OAuth Configuration
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
VITE_APP_ID=TzzwLt5FRwqjKKW5zhfchR
JWT_SECRET=2fTBz7ETgrcQ28xdigDHm2

# Database Configuration
DATABASE_URL=mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={"rejectUnauthorized":true}
DRIZZLE_DATABASE_URL=mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={"rejectUnauthorized":true}

# Manus API Configuration
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=${BUILT_IN_FORGE_API_KEY}

# Frontend Configuration
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=${VITE_FRONTEND_FORGE_API_KEY}
```

### Step 3: Fix ALL 21 Broken Image URLs (CRITICAL)

**Your new session will have 21 broken image URLs that MUST be fixed.**

Broken URLs look like:
- `/images/Amazing Spider-Man 129.png`
- `/images/1985 Mark McGwire.jpg`
- `/images/1782949430583-0n37yl-Coin-lot-1.jpg`

They need to be converted to:
- `/manus-storage/listings/1/1782872450609-rfwm2b-Amazing-Spider-Man-129_772c5bbc.png`

**Option A: Using MySQL command line (RECOMMENDED)**
```bash
mysql -h gateway05.us-east-1.prod.aws.tidbcloud.com \
  -u 4ZXfWh5QbDJhQ4C.023db4f53938 \
  -p9gg6EhlcJlBPkKU3111k \
  -D TzzwLt5FRwqjKKW5zhfchR \
  -e "UPDATE listingPhotos SET imageUrl = CONCAT('/manus-storage/', fileKey) WHERE imageUrl NOT LIKE '/manus-storage/%';"
```

**Option B: Using Manus webdev SQL tool**
```sql
UPDATE listingPhotos 
SET imageUrl = CONCAT('/manus-storage/', fileKey) 
WHERE imageUrl NOT LIKE '/manus-storage/%';
```

**Verification:** After running the fix, verify all images are fixed:
```bash
mysql -h gateway05.us-east-1.prod.aws.tidbcloud.com \
  -u 4ZXfWh5QbDJhQ4C.023db4f53938 \
  -p9gg6EhlcJlBPkKU3111k \
  -D TzzwLt5FRwqjKKW5zhfchR \
  -e "SELECT COUNT(*) as fixed FROM listingPhotos WHERE imageUrl LIKE '/manus-storage/%'; SELECT COUNT(*) as broken FROM listingPhotos WHERE imageUrl NOT LIKE '/manus-storage/%';"
```

Expected result:
- `fixed: 21`
- `broken: 0`

### Step 4: Start Dev Server
```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

---

## Verification Checklist

After setup, verify these features work:

- [ ] Hero section displays with background image
- [ ] Category navigation shows all 10 categories
- [ ] Items display with images (all fixed!)
- [ ] Collector's Forum link appears in left sidebar
- [ ] Admin dashboard is accessible
- [ ] Database connection is working
- [ ] No TypeScript errors in console

---

## Database Statistics

Expected data after setup:
- **Listings:** 10
- **Photos:** 21 (all with fixed /manus-storage/ URLs after running the fix)
- **Users:** Multiple
- **Forum Posts:** Multiple

**CRITICAL:** If you see any photos with `/images/` URLs instead of `/manus-storage/`, you MUST run the SQL fix from Step 3 above.

---

## Troubleshooting

### Images Still Don't Load
- Clear browser cache: `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
- Verify database fix was applied: Check that all imageUrl entries start with `/manus-storage/`

### OAuth Fails
- Verify `OAUTH_SERVER_URL=https://api.manus.im` is set
- Restart dev server: `pnpm dev`

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Check MySQL credentials are valid
- Ensure you have internet access to TiDB Cloud

### Script Permission Denied
```bash
chmod +x COMPLETE_HANDOFF.sh
bash COMPLETE_HANDOFF.sh
```

---

## Repository Information

**Source Repositories:**
- **Primary:** Manus webdev repo (S3-based, for internal sessions)
- **Secondary:** GitHub (https://github.com/tradebilia/collectors-barter.git)

**Latest Commit:** 8244990 - "Add COMPLETE_HANDOFF.sh - fixes all 21 broken image URLs dynamically"

---

## Next Steps After Setup

1. Start the dev server: `pnpm dev`
2. Test all features work (see Verification Checklist)
3. Implement new features:
   - Real-time WebSocket notifications for trade proposals
   - User reputation/rating system based on completed trades
   - Advanced search filters (price range, condition, grading company)

---

## Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Review the script output for specific error messages
3. Verify all environment variables are set correctly
4. Check database connectivity

---

**Happy trading! 🎉**
