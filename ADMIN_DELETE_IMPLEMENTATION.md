# Admin Delete Functionality Implementation Plan

## Overview
Implement admin delete functionality for listings with:
- ✅ Single item delete button
- ✅ Bulk delete with multi-select checkboxes
- ✅ Confirmation dialog with optional note field
- ✅ Audit log tracking all deletions

---

## Requirements

### Functional Requirements
1. **Single Item Delete**
   - Delete button on each listing row
   - Opens confirmation dialog
   - Deletes item and logs action

2. **Bulk Delete**
   - Checkboxes on each listing row
   - "Delete Selected" button (appears when items selected)
   - Confirmation dialog shows count of items to delete
   - Deletes all selected items and logs each action

3. **Confirmation Dialog**
   - Shows item details (title, reference ID, owner)
   - Shows count of items being deleted (for bulk)
   - Optional note field (for deletion reason)
   - Cancel and Confirm buttons
   - Confirmation button disabled until user confirms

4. **Audit Log**
   - Tracks: Admin ID, Item ID, Deletion timestamp, Optional note
   - Accessible to admins for review
   - Shows deletion history

---

## Implementation Steps

### Phase 1: Database Schema & Backend
**Step 1.1**: Add `deletion_audit_log` table to schema
```sql
CREATE TABLE deletion_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  item_id INT NOT NULL,
  item_title VARCHAR(255),
  item_owner_id INT,
  deletion_reason TEXT,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES user(id),
  FOREIGN KEY (item_id) REFERENCES inventory(id)
);
```

**Step 1.2**: Create tRPC procedure `admin.deleteItem`
- Input: itemId, deletionReason (optional)
- Validates admin role
- Logs to audit table
- Deletes from inventory table
- Returns success/error

**Step 1.3**: Create tRPC procedure `admin.deleteItems` (bulk)
- Input: itemIds[], deletionReason (optional)
- Validates admin role
- Loops through items, logs each, deletes each
- Returns count of deleted items

**Step 1.4**: Create tRPC query `admin.getAuditLog`
- Returns deletion audit log
- Filters by date range (optional)
- Paginates results

---

### Phase 2: Delete Confirmation Dialog Component
**Step 2.1**: Create `DeleteConfirmationDialog.tsx` component
- Props: isOpen, itemIds[], onConfirm, onCancel, isLoading
- Shows item details
- Shows count of items
- Has optional note field
- Confirm button disabled until user confirms

**Step 2.2**: Add styling and animations
- Modal overlay
- Smooth fade-in/out
- Button hover effects
- Error message display

---

### Phase 3: Single Item Delete
**Step 3.1**: Add delete button to listings table row
- Icon: Trash can
- Hover tooltip: "Delete item"
- Only visible to admins

**Step 3.2**: Connect delete button to dialog
- Click opens DeleteConfirmationDialog
- Shows single item details
- Calls `admin.deleteItem` on confirm

**Step 3.3**: Test single delete
- Delete one item
- Verify item removed from table
- Verify audit log entry created

---

### Phase 4: Bulk Delete
**Step 4.1**: Add checkboxes to listings table
- Checkbox in first column of each row
- "Select All" checkbox in header

**Step 4.2**: Add "Delete Selected" button
- Only appears when items are selected
- Shows count of selected items
- Disabled if no items selected

**Step 4.3**: Connect bulk delete to dialog
- Click opens DeleteConfirmationDialog
- Shows count of items
- Calls `admin.deleteItems` on confirm

**Step 4.4**: Test bulk delete
- Select multiple items
- Delete them
- Verify all removed from table
- Verify audit log entries created

---

### Phase 5: Audit Log Viewing
**Step 5.1**: Create `AuditLogTab.tsx` component
- Displays deletion history
- Columns: Admin, Item Title, Owner, Reason, Deleted At
- Sortable by date
- Filterable by admin

**Step 5.2**: Add "Audit Log" tab to admin page
- Accessible from admin listings page
- Shows recent deletions

**Step 5.3**: Test audit log
- Verify entries appear
- Verify correct data displayed
- Verify filtering works

---

### Phase 6: Testing & Checkpoint
**Step 6.1**: Manual testing
- Test single delete
- Test bulk delete
- Test confirmation dialog
- Test audit log

**Step 6.2**: Edge cases
- Delete item with trades in progress
- Delete item from user with multiple items
- Bulk delete with mixed categories

**Step 6.3**: Create checkpoint
- Save all changes
- Document what was implemented
- Ready for Item Detail page redesign

---

## Technical Details

### Database Changes
- Add `deletion_audit_log` table
- Run migration via `webdev_execute_sql`

### New Components
- `DeleteConfirmationDialog.tsx`
- `AuditLogTab.tsx`

### New tRPC Procedures
- `admin.deleteItem(itemId, deletionReason?)`
- `admin.deleteItems(itemIds[], deletionReason?)`
- `admin.getAuditLog(filters?)`

### Updated Components
- Admin listings table (add delete button, checkboxes)
- Admin page (add audit log tab)

---

## Estimated Time
- Phase 1: 2-3 hours
- Phase 2: 1-2 hours
- Phase 3: 1-2 hours
- Phase 4: 1-2 hours
- Phase 5: 1-2 hours
- Phase 6: 1 hour
- **Total: 7-12 hours**

---

## Success Criteria
- ✅ Single item delete works
- ✅ Bulk delete works
- ✅ Confirmation dialog shows correctly
- ✅ Optional note field works
- ✅ Audit log tracks all deletions
- ✅ No data loss or errors
- ✅ All tests pass
