# ReefAPI Marketplace Source Validation — 2026-10-01

## Credential

- Project secret: `REEF_API_KEY` (server-side only; value is not stored in this document).
- Authentication: `x-api-key` header to `https://api.reefapi.com`.
- Envelope: `{ ok, data, meta, error }`.
- Calls are read-only POST requests; failed/blocked calls are not charged according to the provider documentation.

## TCGplayer

Source: https://reefapi.com/tcgplayer-api

- Base API: `https://api.reefapi.com/tcgplayer/v1`.
- Endpoints: `search`, `product/detail`, `product/listings`, `product/sales`, `product/price_history`, `sets`, `games`.
- All listed endpoints cost 1 credit.
- Search can identify products by query/game/set/rarity/product type and returns product identity, set, number, rarity, image, and product URL.
- Product sales returns the latest five sales shown by TCGplayer without an account, including sold timestamp, price, shipping, currency, quantity, condition, printing, language, listing type, and title.
- Product detail also exposes market price by SKU/condition/printing, latest sales, and listing counts.
- Tradebilia adapter plan: one bounded search, followed by bounded product/detail calls for matched products; retain only provider-confirmed sales with positive USD price, sale timestamp, condition/printing metadata, and deterministic identity matching. Results remain source context-only and never directly change canonical valuation.
- Important limitation: sales are limited to the latest five per product, so this is recent-sale evidence, not a full historical archive.

## Non-selected ReefAPI surfaces

- Movies & TV and Music Metadata are metadata/streaming surfaces, not collectible sale evidence.
- Steam is digital-store pricing, not physical collectible resale evidence.
- Facebook Marketplace is local asking-price inventory without reliable completed-sale history.
- Discogs supplies release metadata and current asking listings, not completed sales.

No API key value, account credential, or private response is recorded in this document.
