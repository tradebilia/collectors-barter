# ReefAPI Marketplace Source Validation — 2026-10-01

## Credential

- Project secret: `REEF_API_KEY` (server-side only; value is not stored in this document).
- Authentication: `x-api-key` header to `https://api.reefapi.com`.
- Envelope: `{ ok, data, meta, error }`.
- Calls are read-only POST requests; failed/blocked calls are not charged according to the provider documentation.
- Required credential smoke test: `POST /catawiki/v1/categories` with `{ level: 1, language: "en" }` passed in `server/reefApiSecret.test.ts`.

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

## Catawiki

Source: https://reefapi.com/catawiki-api

- Base API: `https://api.reefapi.com/catawiki/v1`.
- Endpoints: `search`, `product/detail`, `lot/bids`, `auction/lots`, `category/products`, `categories`, `suggest`.
- All listed endpoints cost 1 credit.
- Search returns open lots; closed auction lots are obtained with `auction/lots` or `product/detail` using a lot/auction ID.
- Closed lots distinguish `is_sold`, `sold_price`, reserve status, bid history, dates, auction IDs, lot IDs, title, URL, image, and currency.
- Tradebilia adapter plan: bounded title search, then bounded detail/auction-lot retrieval only when a closed lot identifier is available; retain only `is_sold=true` and positive `sold_price` records with deterministic identity matching. Never treat current bid, estimate, or reserve-not-met lot as a completed sale.
- Important limitation: the published keyword search is for open lots, so a closed-sale adapter requires a second bounded lookup path and must fail closed when no closed auction identifier is returned.

## Non-selected ReefAPI surfaces

- Movies & TV and Music Metadata are metadata/streaming surfaces, not collectible sale evidence.
- Steam is digital-store pricing, not physical collectible resale evidence.
- Facebook Marketplace is local asking-price inventory without reliable completed-sale history.
- Discogs supplies release metadata and current asking listings, not completed sales.

No API key value, account credential, or private response is recorded in this document.

## Auctionet

Source: https://reefapi.com/auctionet-api

- Base API: `https://api.reefapi.com/auctionet/v1`.
- Adapter endpoint: `POST /auctionet/v1/search` with `{ query, status: "ended", sort: "sold_only_recent", page: 1, max_results: 12, locale: "en" }`.
- Result fields include `item_id`, stable Auctionet URL, title, description, house, category, `status`, `outcome`, `is_sold`, currency, `final_bid`, dates, and images.
- Tradebilia retains only `status=ended`, `is_sold=true`, positive `final_bid`, explicit USD currency, and deterministic identity matches. ReefAPI explicitly does not convert currencies.
- Buyer-premium treatment is not established, so Auctionet records remain context-only and cannot directly change canonical valuation.
- Live smoke test passed through ReefAPI using `pokemon cards`: 12 bounded ended lots returned; none passed the strict USD-plus-identity admission for that run, and all were retained as non-admitted context rather than treated as valuation evidence.
