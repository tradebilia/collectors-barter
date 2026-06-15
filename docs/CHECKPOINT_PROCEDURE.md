# Checkpoint Procedure - Standard Process for All Future Sessions

**Effective Date:** June 15, 2026  
**Purpose:** Ensure every checkpoint includes complete documentation for seamless handoff to next session

---

## Pre-Checkpoint Checklist (Before webdev_save_checkpoint)

### 1. Update todo.md
- Mark all completed features as [x]
- Add any new bugs or features discovered as [ ] items
- Verify all items are accurate and up-to-date
- Review entire file for completeness

### 2. Verify Git Status
```bash
cd /home/ubuntu/collectors-barter
git status  # Should show "nothing to commit, working tree clean"
git log --oneline -5  # Verify recent commits
```

### 3. Commit All Changes
- All code changes committed
- All documentation updates committed
- No uncommitted changes remain

### 4. Create Session Handoff Document

**File:** `docs/NEXT_SESSION_PROMPT_[DATE].md`

**Required Sections:**
1. Current Status (Date, Checkpoint ID, Git Commit, Status, Dev Server, Build)
2. What's Working ✅ (All completed features)
3. What's NOT Working ❌ (Known issues)
4. Database Status (Schema, migrations, AUTO_INCREMENT)
5. Backup & Rollback Information (Git repos, checkpoint info, rollback commands)
6. Files to Read FIRST (Prioritized documentation)
7. Quick Start for Next Session (Clone, setup, start, access)
8. Important Notes for Next Session (What's done, what to watch for, next steps)
9. Session Summary (Features implemented, testing status, documentation status, backup status)

**Example Filename:** `docs/NEXT_SESSION_PROMPT_JUNE_15_2026.md`

### 5. Update ASSET_REFERENCE.md (if assets changed)
- All S3 URLs documented
- GitHub URLs included
- File IDs tracked
- Usage locations noted

### 6. Verify Documentation
- ASSET_REFERENCE.md is complete
- README.md is up-to-date
- All docs/ files are current
- No outdated information remains

### 7. Push to GitHub
```bash
git push github main  # Push all commits to GitHub
```

### 8. Save Webdev Checkpoint
```bash
webdev_save_checkpoint --description "Checkpoint: [Description of what was implemented]"
```

---

## Post-Checkpoint Checklist (After webdev_save_checkpoint)

### 1. Verify Checkpoint Saved
- Checkpoint ID displayed
- Git commit hash matches
- Status shows "Successfully saved"

### 2. Document Checkpoint Information
- Checkpoint ID recorded
- Git commit hash recorded
- Date recorded
- Description recorded

### 3. Final Verification
```bash
git log --oneline -1  # Verify latest commit
git status  # Verify clean working tree
```

---

## What to Include in Session Handoff Document

### Current Status Section
```
**Date:** [Today's date]
**Checkpoint ID:** [From webdev_save_checkpoint output]
**Git Commit:** [Full commit hash]
**Status:** [STABLE/TESTING/BROKEN]
**Dev Server:** [Running/Not running]
**Build:** [Succeeds/Has errors]
**Database:** [Status]
```

### What's Working Section
- List all implemented features with ✅
- Group by category (Core Features, Infrastructure, Branding, etc.)
- Include date if feature was added this session

### What's NOT Working Section
- List all known issues with ⚠️
- Include impact and workarounds
- Link to docs/KNOWN_ISSUES.md for full details

### Database Status Section
- Current schema version
- Latest migration file
- AUTO_INCREMENT values
- Any data issues

### Backup & Rollback Section
- Git repository URLs (S3 + GitHub)
- Checkpoint ID and Git commit
- Rollback commands
- Asset documentation status

### Quick Start Section
```bash
# Clone and setup
gh repo clone tradebilia/collectors-barter
cd collectors-barter
pnpm install

# Start dev server
pnpm dev

# Access application
# Dev URL: [URL]
# Admin Account: [Username]
# Test Account: [Username]
```

### Important Notes Section
- What's already done (so next session doesn't redo it)
- What to watch for (potential issues)
- Recommended next steps (prioritized)

### Session Summary Section
- Features implemented this session
- Testing status
- Documentation status
- Backup status

---

## Example Checkpoint Workflow

### Session Start
1. Read `docs/NEXT_SESSION_PROMPT_[PREVIOUS_DATE].md`
2. Review `docs/KNOWN_ISSUES.md`
3. Check `todo.md` for incomplete items

### During Session
1. Implement features
2. Write tests
3. Update documentation
4. Commit changes to Git

### Session End (Checkpoint Time)
1. Update `todo.md` - mark completed items as [x]
2. Verify `git status` is clean
3. Create `docs/NEXT_SESSION_PROMPT_[TODAY_DATE].md`
4. Update `ASSET_REFERENCE.md` if needed
5. Push to GitHub: `git push github main`
6. Save checkpoint: `webdev_save_checkpoint --description "..."`
7. Record checkpoint ID and Git commit hash

---

## Documentation Files to Keep Updated

| File | Update Frequency | Purpose |
|------|------------------|---------|
| todo.md | Every session | Track features and bugs |
| docs/NEXT_SESSION_PROMPT_[DATE].md | Every checkpoint | Handoff to next session |
| ASSET_REFERENCE.md | As needed | Track all S3 assets |
| docs/KNOWN_ISSUES.md | Every session | Document issues |
| docs/ROADMAP.md | Monthly | Update priorities |
| README.md | As needed | Project overview |

---

## Checkpoint Naming Convention

**Filename:** `docs/NEXT_SESSION_PROMPT_[MONTH]_[DAY]_[YEAR].md`

**Examples:**
- `docs/NEXT_SESSION_PROMPT_JUNE_15_2026.md`
- `docs/NEXT_SESSION_PROMPT_JULY_01_2026.md`
- `docs/NEXT_SESSION_PROMPT_DECEMBER_25_2026.md`

---

## Key Principles

1. **Every checkpoint must include a session handoff document**
   - Next session should never start without knowing what was done

2. **Documentation is as important as code**
   - A feature without documentation is incomplete

3. **Rollback must always be possible**
   - All code and migrations must be in Git
   - Checkpoint ID must be recorded

4. **Next session should be 100% seamless**
   - New developer should be able to start immediately
   - No guessing or digging through git history

5. **Keep documentation current**
   - Outdated documentation is worse than no documentation
   - Update docs as you implement features

---

## Checklist for Future Sessions

Before saving any checkpoint:

- [ ] All code committed to Git
- [ ] All tests passing
- [ ] todo.md updated with completed items
- [ ] Session handoff document created (docs/NEXT_SESSION_PROMPT_[DATE].md)
- [ ] ASSET_REFERENCE.md updated (if assets changed)
- [ ] All documentation reviewed and current
- [ ] GitHub push completed
- [ ] Checkpoint saved with description
- [ ] Checkpoint ID recorded
- [ ] Git commit hash recorded

---

## Questions?

Refer to:
- `docs/PROJECT_CONTEXT.md` - Project overview
- `docs/ROADMAP.md` - Development priorities
- `docs/KNOWN_ISSUES.md` - Known issues
- `ASSET_REFERENCE.md` - Asset documentation

Last Updated: June 15, 2026
