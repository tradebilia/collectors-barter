# Mercari Sold-Comps field audit — 2026-11-10

## Official response contract

Sources:

- [SoldComps Mercari search documentation](https://sold-comps.com/docs#mercari-search)
- [SoldComps OpenAPI specification](https://api.sold-comps.com/openapi.json)

The official `GET /v1/mercari` response documents these top-level fields:

- `keyword`
- `page`
- `count`
- `totalResults`
- `totalItems`
- `hasNextPage`
- `marketplace` (`mercari`)
- `scrapedAt`
- `items`

Each Mercari item documents these fields:

- `itemId` — required string
- `url` — required string
- `title` — required string
- `price` — required string, dollars with two decimal places
- `currency` — required enum, `USD`
- `originalPrice` — required but nullable string
- `condition` — required but nullable string
- `conditionId` — required but nullable number
- `status` — required enum, `sold` or `active`
- `imageUrl` — required but nullable string
- `thumbnailUrl` — required but nullable string
- `sellerId` — required but nullable string
- `brand` — required but nullable string
- `categoryId` — required but nullable number
- `categoryName` — required but nullable string
- `marketplace` — required enum, `mercari`

The documented request parameter `sold` defaults to `true`; `sold=true` means sold listings and `sold=false` means active listings. The official Mercari item schema does **not** document a sale date, accepted-offer amount, final transaction amount separate from `price`, buyer premium, shipping, tax, or a separate post-visual identity token.

## What this means for valuation

Mercari **does provide a provider identity**: `itemId`. It also provides a required listing URL: `url`. Therefore, the correct policy is not to exclude all Mercari records. A Mercari record can be considered for valuation only if the actual returned `itemId` and `url` survive server-side from retrieval through final sealing.

Mercari does **not** provide a documented sale date. The existing approved Mercari policy therefore needs to keep sale date as `Unknown` and use the signed `sold=true` exception. It must not invent a date or claim that `price` is independently verified as a final accepted-offer amount.

## Tradebilia’s current adapter contract

`server/soldCompsAdditionalMarketData.ts` currently requires `itemId`, `title`, and `price` at normalization. It creates the internal `saleId` as `mercari:<itemId>`, preserves the provider URL through `url`, `itemUrl`, `itemWebUrl`, `link`, and `href` aliases, and retains `rawMetadata`/`providerMetadata`. The adapter also captures bounded observation fields including status, price, originalPrice, currency, date aliases, identity aliases, URLs, images, condition, category, brand, seller-related data, and other metadata.

`server/testAIRouter.ts` later attempts to carry the original `saleId` and provider URL into `sealMercariFinalVisualListing`. The final approval path requires a meaningful transaction identity, USD positive price, sold-mode signed policy, visual match, server-final identity approval, no lot/conflict, and no evidence reasons.

## Discrepancy exposed by the live card

The live card reported:

> Observed transaction ID or listing URL unavailable

That is not evidence that Mercari lacks those fields. The official contract says both `itemId` and `url` are returned and the adapter requires `itemId`. It indicates one of these implementation/runtime problems instead:

1. The specific provider row returned by the live request did not contain the documented fields despite the normal contract.
2. The fields were present at retrieval but were lost or replaced during a later row overlay, transport, or final-analysis handoff.
3. The browser was showing a stale run or a server process that did not include the latest identity-preservation checkpoint.
4. The final identity sanitizer rejected the value after it was transformed, rather than receiving the original `itemId`.

This must be resolved by logging/displaying a server-owned field-presence diagnostic at each boundary: retrieval, normalized adapter row, visual candidate, final sealing input, and final analysis input. Raw credentials must never be logged, and the actual provider values need not be exposed in the UI; presence plus a safe type/length/fingerprint is sufficient.

## Decision

Do **not** globally exclude Mercari. Do **not** create a synthetic replacement ID. First prove where the documented `itemId` or `url` is lost. If the real Sold-Comps response for a row genuinely lacks both fields, that row must be excluded before valuation and shown as “Mercari did not return the required item ID or listing URL.” If the fields exist but are lost internally, repair the handoff and retain the item for valuation under the existing sold=true and unknown-date safeguards.
