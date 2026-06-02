# Large Files Storage Guide

## Overview

This document explains where large image files are stored and how to handle them when setting up the project in a new session.

---

## Large Image Files Location

### Stored in GitHub Repository
The following large image files (>1MB) are stored directly in the GitHub repository at:
```
client/public/images/
```

**Files:**
- `Auto2.png` (2.6MB) - Automotive/Collectible cars category image
- `Coins2.png` (3.0MB) - Coins category image
- `Stamps5.png` (3.2MB) - Stamps category image
- `VHS1.png` (2.7MB) - VHS/Media category image
- `VintageToys.png` (2.7MB) - Vintage Toys category image

### Why GitHub?
- **Seamless Handoff**: New sessions can clone the repository and have all files immediately
- **No External Dependencies**: No S3 URLs to manage or break between sessions
- **Version Control**: Files are tracked and recoverable
- **Self-Contained**: Everything needed is in one place

---

## New Session Setup

### Step 1: Clone Repository
```bash
gh repo clone tradebilia/collectors-barter
cd collectors-barter
```

### Step 2: Verify Large Files
After cloning, verify that all large image files are present:
```bash
ls -lh client/public/images/ | grep -E "Auto2|Coins2|Stamps5|VHS1|VintageToys"
```

Expected output:
```
-rw-r--r-- 1 user user 2.6M Jun  2 03:00 Auto2.png
-rw-r--r-- 1 user user 3.0M Jun  2 03:00 Coins2.png
-rw-r--r-- 1 user user 3.2M Jun  2 03:00 Stamps5.png
-rw-r--r-- 1 user user 2.7M Jun  2 03:00 VHS1.png
-rw-r--r-- 1 user user 2.7M Jun  2 03:00 VintageToys.png
```

### Step 3: Install and Run
```bash
pnpm install
pnpm dev
```

All large files should be immediately available in the running application.

---

## Manus Project Limitations

### Why Large Files Aren't in Manus Checkpoints
- Manus checkpoint system has a hard limit: files >1MB cannot be committed
- This is by design to keep deployment packages lean
- Large files must be stored externally (GitHub in this case)

### Workaround Strategy
1. **GitHub**: Stores all large files (permanent, accessible across sessions)
2. **Manus Checkpoint**: Stores project state and code (for deployment)
3. **New Session**: Clone from GitHub → all files present → ready to go

---

## File Usage in Application

### Where These Files Are Used
These large image files are referenced in the application for category backgrounds and visual assets:

- `Auto2.png` - Automotive category background
- `Coins2.png` - Coins category background
- `Stamps5.png` - Stamps category background
- `VHS1.png` - VHS/Media category background
- `VintageToys.png` - Vintage Toys category background (also used as logo)

### How They're Referenced
Files are referenced via relative paths in the code:
```jsx
<img src="/images/Auto2.png" alt="Automotive" />
```

The `/images/` path maps to `client/public/images/` during development.

---

## Deployment Considerations

### Manus Deployment
When deploying via Manus:
1. Large files are included in the deployment package
2. They're served from the deployed application
3. No additional configuration needed

### External Hosting
If deploying to external hosts (Vercel, Netlify, etc.):
1. Ensure large files are included in the build
2. Verify file paths are correct in production
3. Consider CDN optimization for large images

---

## Troubleshooting

### Missing Large Files After Clone
If large files are missing after cloning:
```bash
# Check git LFS status (if applicable)
git lfs status

# Re-download files
git lfs pull

# Or manually verify files exist
find client/public/images -size +1M -type f
```

### File Size Issues
If you need to reduce file sizes:
1. Compress images using ImageMagick or similar tools
2. Convert to WebP format (better compression)
3. Update file references in code
4. Test thoroughly before committing

---

## Best Practices

1. **Always Verify Files After Clone**: Check that all large files are present
2. **Document Changes**: If adding new large files, update this guide
3. **Version Control**: Keep large files in GitHub for consistency
4. **Backup Originals**: Keep original uncompressed files in `/home/ubuntu/webdev-static-assets/`
5. **Test in New Sessions**: Verify large files work correctly when setting up in new environments

---

## Future Improvements

### Potential Optimizations
1. **Image Compression**: Reduce file sizes without quality loss
2. **WebP Conversion**: Use modern image formats for better compression
3. **Lazy Loading**: Load large images only when needed
4. **CDN Integration**: Serve large files from a CDN for faster delivery
5. **Responsive Images**: Serve different sizes based on device

---

## Reference

- **GitHub Repository**: https://github.com/tradebilia/collectors-barter
- **Setup Guide**: See SETUP.md
- **Project Status**: See PROJECT_STATUS.md
- **Database Setup**: See DATABASE_SETUP.md

---

**Last Updated**: June 2, 2026
**Status**: Large files stored in GitHub for seamless handoff
