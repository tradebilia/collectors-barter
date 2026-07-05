# System and Code Performance Audit Report

**Date:** July 5, 2026
**Target:** Tradebilia (`collectors-barter`) Dev Environment

This document outlines the findings of a comprehensive audit of the sandbox system resources, running processes, open ports, and the application codebase, with a specific focus on identifying bottlenecks, memory leaks, and patterns that could cause major slowness.

## 1. System Resources & Processes Audit

The underlying sandbox and dev server are currently in excellent health. The major slowness experienced previously was strictly an application-layer bug (the infinite mutation loop fixed earlier) and not a system-level resource constraint.

*   **CPU and Load Average:** The system has 6 CPU cores. The load average is currently `0.31 / 0.54 / 0.35`, which is exceptionally healthy (anything under 6.0 is safe). The Node.js dev server (`pnpm dev`) spikes to ~60-70% CPU for a few seconds during a hot-module reload (HMR) but quickly settles back to ~7% CPU at steady state. There are no runaway or zombie processes.
*   **Memory Usage:** Out of 3.9 GB total memory, 1.78 GB is in use and 2.15 GB is available. Swap space (2.0 GB) is completely unused. The dev server consumes approximately 228 MB of RAM at rest. The high memory pressure warning occasionally seen during TypeScript compilation (`tsc`) is transient and resolves immediately after the process exits. There is no evidence of a systemic memory leak.
*   **Disk Space:** The root filesystem is at 23% utilization (8.7 GB used of 40 GB), leaving ample room for operations.
*   **Ports and Listeners:** Port `3000` is correctly bound to the single active Node process. There are no duplicate instances of the dev server, no port squatting, and no orphaned listeners. A check of network connections showed a small number of `CLOSE-WAIT` sockets originating from the browser during the earlier request storm, which are harmless and will be reaped by the OS kernel.

## 2. Codebase Performance Audit

A review of the server-side logic (`server/db.ts`, `server/routers.ts`) and client-side data fetching patterns revealed several areas that currently impact latency or pose significant risks as the database grows.

### High Priority: Sequential Queries in `getListingDetail`
The `market.listingDetail` endpoint takes ~0.43 seconds to resolve. A review of `getListingDetail` shows that it executes **8 sequential database round-trips**. It awaits the listing details, then the owner profile, then similar items, then photos, then watchlist status, etc., one after the other. Because most of these queries do not depend on each other, wrapping them in a `Promise.all` could cut the endpoint's latency by up to 60%, bringing it closer to 0.15 seconds.

### High Priority: Inefficient Feed Queries (`market.feed`)
The homepage feed is currently the slowest public endpoint, taking ~0.92 seconds to load. This is caused by two architectural choices:
1.  **Correlated Subqueries:** The primary photo for each listing is fetched using a correlated subquery in the `SELECT` clause (`select imageUrl from listingPhotos where listingId = listings.id limit 1`). This runs for every row returned.
2.  **Missing Indexes:** The query filters on `status = 'active'` and orders by `createdAt DESC`, but there is no composite index for `(status, isActive, createdAt)`. Additionally, filtering by `keyword` uses `LIKE '%kw%'` across text and JSON columns, resulting in full table scans. While this performs acceptably with 13 items, it will degrade severely when the marketplace scales to thousands of listings.

### Medium Priority: Aggressive Client-Side Polling
The application generates a constant hum of background database load from logged-in users:
1.  The `TopRightIcons` component polls the `auth.unreadCounts` endpoint every 5 seconds with a `staleTime` of 0. This results in 12 requests per minute per active user.
2.  The `Home.tsx` page redundantly polls the exact same unread counts every 30 seconds.
3.  The `market.dashboard` query refetches with `staleTime: 0` on every mount, triggering 6 parallel database queries.

### Medium Priority: N+1 Query in Trade Proposals
In `selectTradeProposalItems` (line 738 of `server/db.ts`), there is a `for` loop that executes a `SELECT` query for each selected listing ID one by one. While this is a low-traffic path, it is a classic N+1 vulnerability that should be refactored to use an `inArray` bulk lookup.

### Low Priority: Base64 Image Upload Memory Footprint
The server accepts image uploads as Base64 strings with a 50 MB Express JSON payload limit. Because Node.js must hold the Base64 string and the resulting binary Buffer in memory simultaneously, a 20 MB image upload temporarily consumes roughly 50 MB of RAM. A few concurrent large uploads could pressure the 4 GB sandbox limit. This is acceptable for now but should eventually be replaced with direct-to-S3 presigned URLs.

## 3. Recommendations

To ensure the application remains fast as user traffic and inventory grow, the following actions are recommended:

1.  **Parallelize Detail Queries:** Refactor `getListingDetail` to use `Promise.all` for independent database lookups.
2.  **Optimize the Feed:** Add a composite index on `(status, isActive, createdAt)` to the `listings` table. Replace the correlated subquery for primary photos with a separate batched lookup or a `LEFT JOIN`.
3.  **Tune Polling:** Increase the polling interval for `unreadCounts` in `TopRightIcons` to 30 seconds, add a reasonable `staleTime`, and remove the duplicate polling logic from `Home.tsx`.
4.  **Batch Trade Lookups:** Refactor the loop in `selectTradeProposalItems` to fetch all requested listings in a single query using `inArray`.
