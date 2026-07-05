# TypeScript Maintenance Guide

**Status:** The codebase reached **zero TypeScript errors** on July 5, 2026, and a guard rail keeps it that way.

## The Guard Rail

A git pre-commit hook runs the TypeScript compiler before every commit. If any error exists, the commit is blocked with a clear message. This prevents the situation that previously occurred, where 31 errors silently accumulated and disabled the compiler's ability to catch real bugs.

The hook lives at `scripts/pre-commit-check.sh` and is installed into `.git/hooks/pre-commit`. Because git hooks are not cloned with the repository, **run `bash scripts/install-hooks.sh` once after every fresh clone** (this line belongs in any session-start instructions).

To check for errors manually at any time, run `pnpm check` (or `npx tsc --noEmit`).

## The Schema Regeneration Gotcha

The file `drizzle/schema.ts` ends with a block that exports the `User` and `InsertUser` types. These exports are consumed throughout the server (`db.ts`, `customAuth.ts`, `context.ts`, `sdk.ts`).

> **WARNING:** If you ever regenerate the schema with `drizzle-kit` (e.g., `pnpm db:push` or `drizzle-kit pull`), the generated file will NOT include this block, and roughly 30 errors will instantly reappear. Re-add the block at the end of the regenerated file:
>
> ```ts
> export type User = typeof users.$inferSelect;
> export type InsertUser = typeof users.$inferInsert;
> ```

The block in the current file carries an inline comment saying the same thing.

## The Timestamp Convention

All timestamp columns in the schema use drizzle's `{ mode: 'string' }`, meaning the database layer reads and writes **strings** in MySQL DATETIME format (`YYYY-MM-DD HH:MM:SS`), not JavaScript `Date` objects.

Two helpers in `server/db.ts` enforce this convention:

| Helper | Purpose |
|---|---|
| `mysqlNow()` | Current timestamp as a MySQL DATETIME string. Use for `createdAt`/`updatedAt`/`respondedAt`-style writes. |
| `toMysqlDateTime(date)` | Convert a JS `Date` into the MySQL string format. Use when a Date arrives from external input. |

Rules of thumb when writing new database code:

1. **Writing** a timestamp column: pass `mysqlNow()` or `toMysqlDateTime(...)`, never a raw `new Date()`.
2. **Reading** a timestamp column: the value is a string. If a function's public contract promises a `Date`, convert at the boundary with `new Date(value)`.
3. If the compiler says `Type 'Date' is not assignable to type 'string'`, that is this convention at work — apply rule 1.
