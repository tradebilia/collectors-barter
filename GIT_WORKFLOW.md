# Git Workflow Guide - Prevent Reversion Errors

## Critical Issue: Manus Checkpoint System Git Interference

The Manus checkpoint system can interfere with git state, causing uncommitted changes to be reverted. This document provides the permanent fix.

## The Problem

1. File edits are made (changes in working directory)
2. Manus checkpoint system runs git operations in background
3. Working directory is reset to git HEAD (losing uncommitted changes)
4. Commits capture old content instead of new edits

## The Permanent Solution: Commit-First Workflow

### Rule 1: ALWAYS Commit Before Checkpoint

**CORRECT WORKFLOW:**
```
1. Edit files (via file tool or shell)
2. git add -A && git commit -m "descriptive message"
3. Verify: git show HEAD (check commit has correct content)
4. webdev_save_checkpoint
```

**WRONG WORKFLOW (DO NOT DO THIS):**
```
1. Edit files
2. webdev_save_checkpoint (WITHOUT committing first)
3. git add && git commit (commits wrong content)
```

### Rule 2: Verify Commits Immediately

After every commit, verify the content is correct:

```bash
# For single file changes
git show HEAD:path/to/file.tsx | grep "search_term"

# For multiple files
git show HEAD --stat
```

### Rule 3: Never Use Checkpoint as a Backup

- Checkpoints capture git state, not working directory state
- Always commit to git first
- Checkpoint is for publishing, not for saving uncommitted work

## Implementation Checklist

For every change session:

- [ ] Make file edits
- [ ] Run: `git add -A && git commit -m "Clear message"`
- [ ] Run: `git show HEAD` to verify content
- [ ] Only then: `webdev_save_checkpoint`
- [ ] Verify: Check the checkpoint captures correct state

## Emergency Recovery

If reversion happens:

1. Check git log: `git log --oneline -10`
2. Check working directory: `git status`
3. If working directory is wrong: `git checkout HEAD -- .` (restore from git)
4. If git history is wrong: Use `git reflog` to find correct commit
5. Reset to correct commit: `git reset --hard <commit-hash>`

## Project-Specific Notes

This project uses:
- tRPC backend with TypeScript
- React 19 frontend
- Drizzle ORM for database
- Manus OAuth integration

All changes must flow through git before checkpoint creation.

## Common Scenarios

### Scenario 1: File Edit, Need to Commit

```bash
# After editing via file tool
cd /home/ubuntu/collectors-barter
git add -A
git commit -m "Update: [specific change description]"
git show HEAD  # Verify
webdev_save_checkpoint  # Now safe
```

### Scenario 2: Multiple Files Changed

```bash
# Edit multiple files
git add -A
git commit -m "Update: [feature name] - [specific changes]"

# Verify each file
git show HEAD:client/src/pages/File1.tsx | grep "search_term"
git show HEAD:client/src/components/File2.tsx | grep "search_term"

webdev_save_checkpoint
```

### Scenario 3: Reversion Detected

```bash
# If you notice changes reverted
git status  # Check what's different
git diff    # See the differences
git checkout HEAD -- .  # Restore from git
git log -1  # Check last commit
```

## Prevention Tips

1. **Commit frequently** - Don't wait to commit multiple changes
2. **Use descriptive messages** - Makes it easy to find correct commits
3. **Verify after commit** - Always check `git show HEAD`
4. **Never rely on working directory** - Always commit first
5. **Use git reflog** - Can recover from most mistakes

---

**Last Updated:** 2026-06-04
**Status:** Active - All developers must follow this workflow
