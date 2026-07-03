# ⚠️ CRITICAL: New Session Database Configuration

## IMPORTANT: Read This Before Starting Any New Session

### The Problem
Each new session may be provisioned with a **DIFFERENT DATABASE** by default. This means:
- ❌ You will lose all your data (users, inventory, trades)
- ❌ Your AdminTavani account won't exist
- ❌ All your items will be gone
- ❌ You'll have a fresh/empty database

### The Solution
You MUST configure new sessions to use the **PRIMARY DATABASE** that contains all your data.

---

## Primary Database (PRODUCTION - Use This!)

**Database Name:** `TzzwLt5FRwqjKKW5zhfchR`

**Full Connection String:**
```
mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={"rejectUnauthorized":true}
```

**Connection Details:**
- **Host:** gateway05.us-east-1.prod.aws.tidbcloud.com
- **Port:** 4000
- **Username:** 4ZXfWh5QbDJhQ4C.023db4f53938
- **Password:** 9gg6EhlcJlBPkKU3111k
- **Database:** TzzwLt5FRwqjKKW5zhfchR
- **Type:** TiDB Cloud (MySQL-compatible)
- **Region:** US East 1 (AWS)

### What's in This Database
✅ **7 Users** (including AdminTavani admin account)
✅ **Multiple Inventory Items** (Pokemon, Sports Cards, Vintage Toys, etc.)
✅ **31 Item Images** (all stored in git repo)
✅ **Trade History & Transactions**
✅ **User Profiles & Settings**
✅ **eBay Integration Data**

---

## For New Sessions: Step-by-Step Configuration

### Step 1: When New Session Starts
```bash
# Check what database you're connected to
echo $DATABASE_URL
```

### Step 2: Compare Database Names
Look for the database name in the connection string (the part after the last `/` and before the `?`).

**Examples:**
- ✅ Correct: `...4000/TzzwLt5FRwqjKKW5zhfchR?ssl=...` (THIS IS CORRECT)
- ❌ Wrong: `...4000/FnC86fHGa9vDKkrng5eofQ?ssl=...` (This is a fresh database - DO NOT USE)

### Step 3: If Database Name is Different
Update the DATABASE_URL to use the primary database:

```bash
export DATABASE_URL="mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={\"rejectUnauthorized\":true}"
```

### Step 4: Restart Dev Server
```bash
pnpm dev
```

### Step 5: Verify Connection
- ✅ Try logging in with AdminTavani
- ✅ Check that inventory items are visible
- ✅ Verify all images load correctly
- ✅ Check that you have 7 users in the database

---

## Project Identifiers (Same Across All Sessions)

| Property | Value |
|----------|-------|
| **VITE_APP_ID** | TzzwLt5FRwqjKKW5zhfchR |
| **Project Name** | collectors-barter |
| **Domain** | tradebilia-tzzwlt5f.manus.space |

---

## Common Issues & Solutions

### Issue: Login fails with "Failed query" error
```
Failed query: select `id`, `openId`, `username`, ... from `users` where `username` = ? limit ?
```
**Cause:** Database schema mismatch (using wrong database)
**Solution:** 
1. Check DATABASE_URL
2. Verify database name is `TzzwLt5FRwqjKKW5zhfchR`
3. Run migrations: `pnpm drizzle-kit migrate`

### Issue: AdminTavani account doesn't exist
**Cause:** Using wrong database
**Solution:** Update DATABASE_URL to primary database (see Step 3 above)

### Issue: No inventory items visible
**Cause:** Using wrong database
**Solution:** Update DATABASE_URL to primary database

### Issue: 403 CloudFront error
**Cause:** Network/firewall issue accessing database endpoint
**Solution:** Contact Manus support at https://help.manus.im

### Issue: Can't connect to database at all
**Cause:** Wrong credentials or network issue
**Solution:**
1. Verify DATABASE_URL is exactly correct
2. Check network connectivity
3. Contact Manus support

---

## Quick Reference: Database Names

| Database Name | Type | Use? |
|---|---|---|
| `TzzwLt5FRwqjKKW5zhfchR` | Production (has all data) | ✅ YES - USE THIS |
| `FnC86fHGa9vDKkrng5eofQ` | Fresh/Empty | ❌ NO - Don't use |
| Any other name | Unknown | ❌ NO - Don't use |

---

## Important Notes

1. **Always verify DATABASE_URL** before starting development
2. **Database is shared** - All sessions must use the same database
3. **This is critical** - Wrong database = loss of all data
4. **Images are in git** - All 31 item images are committed to `/client/public/images/`
5. **Secrets are auto-injected** - Most env vars are handled by Manus except DATABASE_URL

---

## Contact Support

If new sessions continue to get different databases:
- Go to: https://help.manus.im
- Explain: "New sessions are being provisioned with different database instances"
- Provide: Primary database name `TzzwLt5FRwqjKKW5zhfchR`
- Request: Configuration to ensure all sessions use the same database

---

**Last Updated:** July 3, 2026
**Status:** CRITICAL - Read before every new session
