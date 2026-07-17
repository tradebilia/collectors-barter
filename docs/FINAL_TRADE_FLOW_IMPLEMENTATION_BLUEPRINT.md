
---

## Final Edge-Case Decisions (July 16, 2026)

### 1. Value Visibility
- **Main Display**: Shows the User's **Listed Price**.
- **Secondary Display**: Shows the **AI Market Value** (eBay sold listings) in a smaller font below the main price for context.

### 2. Middle Man Logistics
- **Mutual Agreement**: If one user requests the service, the other must click an **"Approve Middle Man"** button.
- **Dependency**: The trade cannot move to the `Accepted` stage until both have agreed on the service (or it is deselected).

### 3. Dynamic Inventory Updates
- **Automatic Removal**: If an item in a negotiation is sold or traded elsewhere, it is **instantly removed** from all other active trade tables.
- **System Notification**: A log is added to the chat timeline: *"Item [Name] is no longer available and has been removed from this proposal."*

### 4. Table Management
- **Collapsible Table**: Users can toggle between **Expanded** (see all items) and **Collapsed** (see total value only) to save screen space during long negotiations.

### 5. Dispute Management
- **Admin Flagging**: There is no manual "Dispute" button for users. Instead, the system automatically flags the trade for **Admin Review** if receipt is not confirmed within 15 days of shipping.
