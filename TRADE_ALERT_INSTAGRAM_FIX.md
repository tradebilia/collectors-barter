# Instagram Trade Alert Fix

**Date:** 2026-09-21  
**WebDev checkpoint:** `bf7c8966`  
**Scope:** Completed-trade social graphics for Instagram

## Summary

The Instagram completed-trade graphic now uses the same cinematic Trade Alert composition as the landscape formats while adapting the layout to the 1080 × 1080 canvas. The exchange mark is centered in the horizontal channel between the two traded-item columns rather than being placed below the item captions. The category-specific split scene remains visible on both sides, item titles are larger for mobile readability, and the cash indicator is separated below the exchange mark.

## Implemented behavior

- The Instagram exchange mark is positioned at `imageY + imageHeight * 0.68`, which places it between the two item columns.
- Pinterest retains its separate vertically stacked tall-format placement.
- Instagram item titles use a 22 px base size, compared with 15 px for landscape formats.
- The `+ CASH INCLUDED` label remains below the exchange mark with clear spacing.
- Existing category-aware stage selection is preserved, including the midpoint split for mixed-category trades.
- The existing transparent TRADED mockup asset remains the exchange-mark source; no customer media or private trade metadata is embedded in the graphic.

## Files changed

- `client/src/lib/socialGraphicExport.ts` — Instagram exchange-mark position and tall-format caption sizing.
- `client/src/lib/socialGraphicExport.test.ts` — Regression coverage for the Instagram layout contract.
- `TRADE_ALERT_INSTAGRAM_FIX.md` — This implementation and validation record.

## Validation

The following checks passed before checkpointing and Git handoff:

- Focused Vitest coverage for `client/src/lib/socialGraphicExport.test.ts` and `server/tradeAlertThemes.test.ts`.
- TypeScript validation with `pnpm check`.
- Production build with `pnpm build`.
- Whitespace validation with `git diff --check`.
- Full-resolution browser inspection of the actual 1080 × 1080 Instagram canvas.

The visual review confirmed that the exchange mark is centered between the item columns, the item titles are readable, the split category backgrounds remain visible, and no graphic elements overlap.

## Data and deployment safety

No database writes, migrations, seed scripts, destructive scripts, scheduled jobs, external notifications, or production-domain changes were performed. The development WebDev project was checkpointed but not published or attached to the production domain. No secrets or customer media were added to source control.

## Git handoff

The WebDev checkpoint is saved as `bf7c8966`. Because the isolated WebDev checkout and `canonical/main` have divergent histories, this work should be reviewed from the dedicated Git branch pushed for this handoff rather than force-pushed over GitHub `main`.

> The dedicated branch is intentionally used to preserve GitHub history and avoid a destructive force push.
