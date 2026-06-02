# Database Setup & Schema Documentation

## Overview

Tradebilia uses **MySQL** with **Drizzle ORM** for type-safe database operations. All database operations are defined in TypeScript and automatically generate migrations.

---

## Initial Database Setup

### 1. Create Database
```sql
CREATE DATABASE tradebilia;
USE tradebilia;
```

### 2. Apply Schema
The schema is defined in `drizzle/schema.ts`. To apply it:

```bash
# Generate migrations from schema
pnpm drizzle-kit generate

# Apply migrations to database
pnpm drizzle-kit migrate
```

### 3. Seed Initial Data (Optional)
```bash
# Run setup script to create admin user and initial data
node final-setup.js
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  avatar_url VARCHAR(255),
  bio TEXT,
  location VARCHAR(255),
  preferred_categories JSON,
  ebay_username VARCHAR(255),
  ebay_connected BOOLEAN DEFAULT FALSE,
  verification_level INT DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

### Listings Table
```sql
CREATE TABLE listings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  condition VARCHAR(50) NOT NULL,
  grade VARCHAR(20),
  year INT,
  estimated_value DECIMAL(10, 2),
  photos JSON,
  status VARCHAR(50) DEFAULT 'active',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Photos Table
```sql
CREATE TABLE photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  listing_id INT NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  storage_url VARCHAR(255) NOT NULL,
  display_order INT DEFAULT 0,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);
```

### Trades Table
```sql
CREATE TABLE trades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  initiator_id INT NOT NULL,
  recipient_id INT NOT NULL,
  initiator_listing_id INT NOT NULL,
  recipient_listing_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (initiator_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (initiator_listing_id) REFERENCES listings(id),
  FOREIGN KEY (recipient_listing_id) REFERENCES listings(id)
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  trade_id INT,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (trade_id) REFERENCES trades(id)
);
```

### Reports Table
```sql
CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reporter_id INT NOT NULL,
  reported_user_id INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (reported_user_id) REFERENCES users(id)
);
```

---

## Key Data Types & Conventions

### Timestamps
- **Stored as**: BIGINT (Unix timestamp in milliseconds)
- **Example**: 1717324800000 (June 2, 2024)
- **Conversion**: 
  - JavaScript: `Date.now()` or `new Date().getTime()`
  - SQL: `UNIX_TIMESTAMP() * 1000`

### Enums
- **User Roles**: `admin` | `user`
- **Listing Status**: `active` | `pending` | `completed` | `archived`
- **Trade Status**: `pending` | `accepted` | `rejected` | `completed` | `cancelled`
- **Conditions**: `mint` | `near_mint` | `excellent` | `very_good` | `good` | `fair` | `poor`
- **Categories**: `comics` | `sports_cards` | `vintage_toys` | `video_games` | `stamps` | `coins` | `pokemon` | `movies` | `autographs` | `disney_pins`

### JSON Fields
- **preferred_categories**: Array of category strings
  ```json
  ["comics", "sports_cards", "vintage_toys"]
  ```
- **photos**: Array of photo objects
  ```json
  [
    {
      "id": 1,
      "url": "/manus-storage/listing_123_photo_1.jpg",
      "order": 0
    }
  ]
  ```

---

## Current Test Data

### Admin Account
- **Username**: AdminTavani
- **Password**: (Set during setup)
- **Role**: admin

### Regular User
- **Username**: rtavani
- **Password**: (Set during setup)
- **Role**: user

---

## Migrations

### How Migrations Work
1. Modify `drizzle/schema.ts`
2. Run `pnpm drizzle-kit generate`
3. Review generated SQL in `drizzle/migrations/`
4. Apply: `pnpm drizzle-kit migrate`

### Recent Migrations
- Initial schema creation
- Added user authentication fields
- Added photo storage fields
- Added trade and message tables

---

## Backup & Recovery

### Backup Database
```bash
mysqldump -u user -p tradebilia > backup.sql
```

### Restore Database
```bash
mysql -u user -p tradebilia < backup.sql
```

---

## Performance Considerations

### Indexes
- Primary keys are auto-indexed
- Foreign keys should be indexed for joins
- Consider adding indexes on frequently queried fields:
  - `users.username`
  - `listings.category`
  - `listings.user_id`
  - `trades.status`

### Query Optimization
- Use Drizzle query builder for type-safe queries
- Avoid N+1 queries (use joins when possible)
- Paginate large result sets
- Cache frequently accessed data

---

## Common Database Operations

### Add a New User
```typescript
import { db } from "./db";
import { users } from "../drizzle/schema";

const newUser = await db.insert(users).values({
  username: "newuser",
  email: "user@example.com",
  password_hash: hashedPassword,
  created_at: Date.now(),
  updated_at: Date.now()
});
```

### Query Listings by Category
```typescript
import { eq } from "drizzle-orm";

const listings = await db
  .select()
  .from(listings)
  .where(eq(listings.category, "comics"))
  .limit(10);
```

### Update User Profile
```typescript
const updated = await db
  .update(users)
  .set({ bio: "New bio", updated_at: Date.now() })
  .where(eq(users.id, userId));
```

---

## Troubleshooting

### Migration Failed
- Check if database exists
- Verify credentials in DATABASE_URL
- Review migration SQL for syntax errors
- Check for constraint violations

### Connection Timeout
- Verify DATABASE_URL is correct
- Check network connectivity
- Ensure database server is running
- Check firewall rules

### Type Errors in Queries
- Ensure schema.ts is up to date
- Run `pnpm tsc --noEmit` to check types
- Verify field names and types match schema

---

## References

- **Drizzle Docs**: https://orm.drizzle.team/
- **MySQL Docs**: https://dev.mysql.com/doc/
- **Project Schema**: See `drizzle/schema.ts`

---

**Last Updated**: June 2, 2026
