# Forum Topic Creation Incident — 2026-09-05

## Confirmed live failure

Production runtime logs show that the active topic creation request reached the database using user ID `30002` and failed with MySQL error `ER_BAD_FIELD_ERROR` / `Unknown column 'subcategory' in 'field list'`.

## Root cause

The deployed app is connected to the existing Tradebilia custom database. Its `forumPosts` table has an older schema than the development-managed database that was previously inspected. The active compatibility insert still includes `subcategory`, which is not present in the live custom table.

## Safe next step

Use a read-only custom-database schema inspection that does not print the connection string or account data. Then make forum topic creation and forum reads compatible with the exact live baseline columns, avoiding destructive changes and preserving existing posts.
