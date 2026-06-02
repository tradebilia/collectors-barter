# Manual Google Drive Upload Guide - Tradebilia Assets

**Objective:** Upload all 19 active image files to Google Drive with shareable links

**Estimated Time:** 15-20 minutes

**Files to Upload:** 19 images (total ~18MB)

---

## Step 1: Create Main Folder Structure

### 1.1 Create "Tradebilia Assets" Folder
1. Go to [Google Drive](https://drive.google.com)
2. Click **+ New** → **Folder**
3. Name: `Tradebilia Assets`
4. Press Enter
5. Open the folder (double-click)

### 1.2 Create Subfolders
Inside `Tradebilia Assets/`, create these folders:
- `Logos`
- `Category Backgrounds`
- `UI Icons`
- `Sample Listings`
- `Category Logos (Manus S3 Backups)`

**How to create folders:**
1. Click **+ New** → **Folder**
2. Enter folder name
3. Press Enter
4. Repeat for each folder

---

## Step 2: Create Category Background Subfolders

Inside `Category Backgrounds/`, create these 10 subfolders:
1. `Sports Cards`
2. `Comics`
3. `Pokemon`
4. `Video Games`
5. `Disney Pins`
6. `Vintage Toys`
7. `Coins`
8. `Stamps`
9. `Autographs`
10. `Movies`

---

## Step 3: Upload Files

### 3.1 Logos Folder
**Upload 1 file to `Tradebilia Assets/Logos/`:**

```
☐ tradebilia-logo.svg
  Location: /home/ubuntu/collectors-barter/client/public/images/tradebilia-logo.svg
  Size: 4.2K
```

**How to upload:**
1. Open `Tradebilia Assets/Logos/` folder
2. Click **+ New** → **File upload**
3. Select file from your computer
4. Wait for upload to complete

---

### 3.2 Category Backgrounds Folder

**Upload 10 files to `Tradebilia Assets/Category Backgrounds/{Subcategory}/`:**

#### Sports Cards/
```
☐ Sportscardwallpaper.webp
  Location: /home/ubuntu/collectors-barter/client/public/images/Sportscardwallpaper.webp
  Size: 439K
```

#### Comics/
```
☐ comics-background.webp
  Location: /home/ubuntu/collectors-barter/client/public/images/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp
  Size: 358K
```

#### Pokemon/
```
☐ pokemon-background.webp
  Location: /home/ubuntu/collectors-barter/client/public/images/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp
  Size: 386K
```

#### Video Games/
```
☐ video-games-background.webp
  Location: /home/ubuntu/collectors-barter/client/public/images/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp
  Size: 176K
```

#### Disney Pins/
```
☐ disney-pins-background.webp
  Location: /home/ubuntu/collectors-barter/client/public/images/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp
  Size: 277K
```

#### Vintage Toys/
```
☐ VintageToys.png
  Location: /home/ubuntu/collectors-barter/client/public/images/VintageToys.png
  Size: 2.7MB
```

#### Coins/
```
☐ Coins2.png
  Location: /home/ubuntu/collectors-barter/client/public/images/Coins2.png
  Size: 3.1MB
```

#### Stamps/
```
☐ Stamps5.png
  Location: /home/ubuntu/collectors-barter/client/public/images/Stamps5.png
  Size: 3.3MB
```

#### Autographs/
```
☐ Auto2.png
  Location: /home/ubuntu/collectors-barter/client/public/images/Auto2.png
  Size: 2.6MB
```

#### Movies/
```
☐ VHS1.png
  Location: /home/ubuntu/collectors-barter/client/public/images/VHS1.png
  Size: 2.7MB
```

---

### 3.3 UI Icons Folder

**Upload 6 files to `Tradebilia Assets/UI Icons/`:**

```
☐ AccountSettings.svg
  Location: /home/ubuntu/collectors-barter/client/public/images/AccountSettings.svg
  Size: 4.0K

☐ AccountSetup.svg
  Location: /home/ubuntu/collectors-barter/client/public/images/AccountSetup_7b72a15a.svg
  Size: 55K

☐ Add_To_Your_Inventory.svg
  Location: /home/ubuntu/collectors-barter/client/public/images/Add_To_Your_Inventory.svg
  Size: 4.0K

☐ Inbox.svg
  Location: /home/ubuntu/collectors-barter/client/public/images/Inbox.svg
  Size: 3.9K

☐ Inventory.svg
  Location: /home/ubuntu/collectors-barter/client/public/images/Myinventory_467a8c30.svg
  Size: 4.3K

☐ ReportUser.svg
  Location: /home/ubuntu/collectors-barter/client/public/images/ReportaUser_001357ab.svg
  Size: 3.9K
```

---

### 3.4 Sample Listings Folder

**Upload 1 file to `Tradebilia Assets/Sample Listings/`:**

```
☐ mainpage.jpg
  Location: /home/ubuntu/collectors-barter/client/public/images/Mainpage.jpg
  Size: 111K
```

---

### 3.5 Category Logos (Manus S3 Backups) Folder

**Upload 3 files to `Tradebilia Assets/Category Logos (Manus S3 Backups)/`:**

```
☐ Comics4.png
  Location: /home/ubuntu/collectors-barter/client/public/images/Comics4_ef989684.png
  Size: Unknown

☐ SportsCards1.png
  Location: /home/ubuntu/collectors-barter/client/public/images/SportsCards1_ff8b8611.png
  Size: Unknown

☐ VintageToys.png
  Location: /home/ubuntu/collectors-barter/client/public/images/VintageToys_dcc69e1c.png
  Size: Unknown
```

---

## Step 4: Generate Shareable Links

For **each file** you uploaded, generate a shareable link:

### 4.1 How to Generate a Shareable Link

1. In Google Drive, find the file
2. Right-click on the file
3. Select **Share**
4. Change access to **Viewer** (read-only)
5. Make sure "Anyone with the link" is selected
6. Click **Copy link**
7. Paste the link into the checklist below

### 4.2 Link Format

Each link will look like:
```
https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
```

Example (your test file):
```
https://drive.google.com/file/d/1_qAnyhdFWkjRpEF-JDlVKuspq2-PS9d_/view?usp=sharing
```

---

## Step 5: Provide Links to Me

Once you've uploaded all files and generated shareable links, provide them in this format:

```
Logos:
- tradebilia-logo.svg: https://drive.google.com/file/d/...

Category Backgrounds - Sports Cards:
- Sportscardwallpaper.webp: https://drive.google.com/file/d/...

Category Backgrounds - Comics:
- comics-background.webp: https://drive.google.com/file/d/...

[etc.]
```

Or simply paste all the links and I'll organize them.

---

## Upload Checklist

### Logos (1 file)
- [ ] tradebilia-logo.svg → Link: _______________

### Category Backgrounds (10 files)

**Sports Cards:**
- [ ] Sportscardwallpaper.webp → Link: _______________

**Comics:**
- [ ] comics-background.webp → Link: _______________

**Pokemon:**
- [ ] pokemon-background.webp → Link: _______________

**Video Games:**
- [ ] video-games-background.webp → Link: _______________

**Disney Pins:**
- [ ] disney-pins-background.webp → Link: _______________

**Vintage Toys:**
- [ ] VintageToys.png → Link: _______________

**Coins:**
- [ ] Coins2.png → Link: _______________

**Stamps:**
- [ ] Stamps5.png → Link: _______________

**Autographs:**
- [ ] Auto2.png → Link: _______________

**Movies:**
- [ ] VHS1.png → Link: _______________

### UI Icons (6 files)
- [ ] AccountSettings.svg → Link: _______________
- [ ] AccountSetup.svg → Link: _______________
- [ ] Add_To_Your_Inventory.svg → Link: _______________
- [ ] Inbox.svg → Link: _______________
- [ ] Inventory.svg → Link: _______________
- [ ] ReportUser.svg → Link: _______________

### Sample Listings (1 file)
- [ ] mainpage.jpg → Link: _______________

### Category Logos (Manus S3 Backups) (3 files)
- [ ] Comics4.png → Link: _______________
- [ ] SportsCards1.png → Link: _______________
- [ ] VintageToys.png → Link: _______________

---

## Verification

After uploading all files and generating links:

- [ ] All 19 files uploaded to Google Drive
- [ ] All files have shareable links (Viewer access)
- [ ] Links are in correct folders
- [ ] Links work when tested in browser
- [ ] No files are missing

---

## Next Steps

1. ✅ Complete the upload checklist above
2. ✅ Provide all shareable links
3. → I'll create ASSET_MAPPING.md with all URLs
4. → I'll update website code with new URLs
5. → I'll verify all pages render correctly
6. → Create final handoff documentation
7. → Commit to GitHub

---

**Status:** Ready for manual upload

**Questions?** Let me know if you need help with any step!
