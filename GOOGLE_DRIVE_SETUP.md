# Google Drive Setup Guide - Tradebilia Assets

**Purpose:** Migrate all media assets to Google Drive for session-independent, persistent storage.

**Status:** Ready for upload

---

## Why Google Drive?

✅ **Session-Independent URLs** - Links work across all Manus sessions  
✅ **Version Control** - File history preserved  
✅ **Reliable Access** - No session-specific context needed  
✅ **Easy Sharing** - Shareable links for team collaboration  
✅ **Backup** - Automatic cloud backup of all assets  

---

## Google Drive Folder Structure

Create this folder hierarchy in your Google Drive:

```
Tradebilia Assets/
│
├── 📁 Logos/
│   ├── tradebilia-logo.svg
│   ├── paypal-logo.png
│   ├── facebook-logo.png
│   └── ebay-logo.png
│
├── 📁 Category Backgrounds/
│   ├── 📁 Sports Cards/
│   │   └── Sportscardwallpaper.webp
│   ├── 📁 Comics/
│   │   └── comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp
│   ├── 📁 Pokemon/
│   │   └── pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp
│   ├── 📁 Video Games/
│   │   └── video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp
│   ├── 📁 Disney Pins/
│   │   └── disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp
│   ├── 📁 Vintage Toys/
│   │   └── VintageToys.png
│   ├── 📁 Coins/
│   │   └── Coins2.png
│   ├── 📁 Stamps/
│   │   └── Stamps5.png
│   ├── 📁 Autographs/
│   │   └── Auto2.png
│   └── 📁 Movies/
│       └── VHS1.png
│
├── 📁 UI Icons/
│   ├── AccountSettings.svg
│   ├── AccountSetup.svg
│   ├── Add_To_Your_Inventory.svg
│   ├── Inbox.svg
│   ├── Inventory.svg
│   └── ReportUser.svg
│
├── 📁 Sample Listings/
│   ├── sports-cards.png
│   ├── vintage-toys.png
│   ├── comics.png
│   └── mainpage.jpg
│
└── 📁 Category Logos (Manus S3 Backups)/
    ├── Comics4_ef989684.png
    ├── SportsCards1_ff8b8611.png
    └── VintageToys_dcc69e1c.png
```

---

## Step-by-Step Upload Instructions

### Step 1: Create Main Folder
1. Go to Google Drive (drive.google.com)
2. Click **+ New** → **Folder**
3. Name it: `Tradebilia Assets`
4. Open the folder

### Step 2: Create Subfolders
Inside `Tradebilia Assets/`, create these folders:
- `Logos`
- `Category Backgrounds`
- `UI Icons`
- `Sample Listings`
- `Category Logos (Manus S3 Backups)`

### Step 3: Create Category Subfolders
Inside `Category Backgrounds/`, create:
- `Sports Cards`
- `Comics`
- `Pokemon`
- `Video Games`
- `Disney Pins`
- `Vintage Toys`
- `Coins`
- `Stamps`
- `Autographs`
- `Movies`

### Step 4: Upload Files

**From your local machine:**

1. Navigate to `/home/ubuntu/collectors-barter/client/public/images/`
2. Upload files to their corresponding folders:

**Logos folder:**
```
tradebilia-logo.svg
paypal-logo_62835ee7.png
facebook-logo_1fd22cc7.png
ebay-logo_b3d303cb.png
```

**Category Backgrounds subfolders:**
```
Sports Cards/
  → Sportscardwallpaper.webp

Comics/
  → comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp

Pokemon/
  → pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp

Video Games/
  → video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp

Disney Pins/
  → disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp

Vintage Toys/
  → VintageToys.png

Coins/
  → Coins2.png

Stamps/
  → Stamps5.png

Autographs/
  → Auto2.png

Movies/
  → VHS1.png
```

**UI Icons folder:**
```
AccountSettings.svg
AccountSetup_7b72a15a.svg
Add_To_Your_Inventory.svg
Inbox.svg
Myinventory_467a8c30.svg
ReportaUser_001357ab.svg
```

**Sample Listings folder:**
```
sportscards2_50e2e734.png
Vintagetoys2_b56d7fdc.png
Comicpage2_6d086599.png
Mainpage.jpg
```

**Category Logos (Manus S3 Backups) folder:**
```
Comics4_ef989684.png
SportsCards1_ff8b8611.png
VintageToys_dcc69e1c.png
```

### Step 5: Generate Shareable Links

For each file, generate a shareable link:

1. Right-click file → **Share**
2. Change permission to **Viewer** (read-only)
3. Copy the link
4. Paste into `ASSET_MAPPING.md` (created in next phase)

**Link Format:**
```
https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
```

---

## File Locations on Local Machine

All files are located in:
```
/home/ubuntu/collectors-barter/client/public/images/
/home/ubuntu/collectors-barter/backgrounds/
```

### Quick Copy Commands

If uploading from the sandbox:

```bash
# List all images to upload
ls -lh /home/ubuntu/collectors-barter/client/public/images/

# List background images
ls -lh /home/ubuntu/collectors-barter/backgrounds/
```

---

## Sharing Settings

**Recommended Settings for All Files:**

- **Access Level:** Viewer (read-only)
- **Sharing:** Anyone with the link
- **No password required**
- **No expiration date**

This ensures:
- ✅ Files are accessible from any session
- ✅ URLs never break
- ✅ No authentication required
- ✅ Read-only prevents accidental edits

---

## After Upload

Once all files are uploaded to Google Drive:

1. ✅ Generate shareable links for each file
2. ✅ Create `ASSET_MAPPING.md` with old→new URL mappings
3. ✅ Update website code with Google Drive URLs
4. ✅ Verify all pages render correctly
5. ✅ Commit changes to GitHub
6. ✅ Create handoff documentation

---

## Verification Checklist

After uploading all files, verify:

- [ ] All 23 active images uploaded to Google Drive
- [ ] Folder structure matches the guide above
- [ ] Each file has a shareable link
- [ ] Links are set to "Viewer" (read-only)
- [ ] Links work when tested in browser
- [ ] No files are missing
- [ ] File names match original names

---

## Next Steps

1. ✅ Create folder structure in Google Drive
2. ✅ Upload all active images
3. ✅ Generate shareable links
4. → Create `ASSET_MAPPING.md` with URL mappings
5. → Update website code with new URLs
6. → Verify all pages render
7. → Create handoff documentation
8. → Commit to GitHub

---

**Status:** Ready for manual upload to Google Drive

**Estimated Time:** 15-20 minutes

**Note:** This process ensures 100% session continuity. Google Drive links are persistent and will work perfectly in new sessions.
