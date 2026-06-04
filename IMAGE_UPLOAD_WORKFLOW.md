# Image Upload Workflow - MANDATORY PROCESS

## Critical Rule: ALWAYS Document Uploaded Images

**EVERY TIME** an image is uploaded to S3, it MUST be documented in ASSET_REFERENCE.md with:
1. S3 URL path
2. File ID
3. GitHub link to where it's used in code
4. Description and metadata

This is NOT optional. This is a required step that must happen immediately after upload.

## Workflow Steps

### Step 1: Upload Image to S3
```bash
manus-upload-file --webdev /path/to/image.png
```

**Output will show:**
```
Storage Path: /manus-storage/ImageName_fileID.png
```

### Step 2: IMMEDIATELY Update Code
Replace old image paths with new S3 URLs in the code files.

### Step 3: IMMEDIATELY Commit to Git
```bash
git add -A
git commit -m "Update: [description] - S3 URL: /manus-storage/ImageName_fileID.png"
```

### Step 4: IMMEDIATELY Document in ASSET_REFERENCE.md

**Add to the appropriate section:**
- Category Title Images
- Category Background Images
- Integration Logos
- Other Assets

**Documentation must include:**
```markdown
| Name | S3 URL | File ID | Location | GitHub Link |
|------|--------|---------|----------|-------------|
| ImageName | `/manus-storage/ImageName_fileID.png` | fileID | File.tsx:lineNumber | https://github.com/tradebilia/collectors-barter/blob/main/client/src/path/File.tsx#LlineNumber |
```

### Step 5: Commit Documentation
```bash
git add ASSET_REFERENCE.md
git commit -m "Document: [image name] with S3 URL and GitHub link"
```

### Step 6: Create Checkpoint
```bash
webdev_save_checkpoint
```

## Why This Matters

1. **Traceability:** Know exactly which S3 URLs are used where
2. **Version Control:** GitHub links show the exact code using each image
3. **Maintenance:** Easy to find and update images in the future
4. **Consistency:** All assets documented in one place
5. **Recovery:** Can quickly restore images if needed

## Documentation Template

### For Category Images
```markdown
#### [Category Name] Title
- **S3 Path:** `/manus-storage/[Name]_[fileID].png`
- **File ID:** [fileID]
- **Upload Date:** YYYY-MM-DD
- **Description:** [Description of image]
- **Used in:** `client/src/pages/CategoryPage.tsx` (line XXX)
- **Code reference:** `src="/manus-storage/[Name]_[fileID].png"`
- **GitHub Link:** https://github.com/tradebilia/collectors-barter/blob/main/client/src/pages/CategoryPage.tsx#LXXX
```

### For Integration Logos
```markdown
#### [Service Name] Logo
- **S3 Path:** `/manus-storage/[Name]_[fileID].png`
- **File ID:** [fileID]
- **Upload Date:** YYYY-MM-DD
- **Description:** [Description of logo]
- **Used in:** `client/src/components/[Component].tsx` (line XXX)
- **Code reference:** `src="/manus-storage/[Name]_[fileID].png"`
- **GitHub Link:** https://github.com/tradebilia/collectors-barter/blob/main/client/src/components/[Component].tsx#LXXX
```

## Checklist for Every Image Upload

- [ ] Image uploaded to S3 via `manus-upload-file --webdev`
- [ ] S3 URL and File ID noted from upload output
- [ ] Code updated with new S3 URL
- [ ] Changes committed to git with clear message
- [ ] ASSET_REFERENCE.md updated with full documentation
- [ ] Documentation committed to git
- [ ] Checkpoint created
- [ ] Verified: Image displays correctly in browser
- [ ] Verified: GitHub link points to correct line in code

## Important Notes

1. **Never skip documentation** - This is as important as the code change
2. **Always include GitHub links** - These show exactly where images are used
3. **Use consistent formatting** - Keep ASSET_REFERENCE.md organized
4. **Document immediately** - Don't wait until later
5. **Verify GitHub links** - Make sure they point to the correct line numbers

## Related Files

- `ASSET_REFERENCE.md` - Master documentation of all assets
- `GIT_WORKFLOW.md` - Git workflow rules
- `DEVELOPMENT_CHECKLIST.md` - General development checklist

---

**Last Updated:** 2026-06-04
**Status:** MANDATORY - All developers must follow this workflow
**Enforced By:** Manus AI Agent
