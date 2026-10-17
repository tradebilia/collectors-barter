# PriceCharting Official API Research — October 17, 2026

Tradebilia has owner authorization to use PriceCharting video-game data. This note records the externally verified provider contract before implementation.

## Supported current-guide fields

PriceCharting's paid Prices API exposes a single product record by product ID, UPC, or query. For video games, documented fields include `loose-price`, `cib-price`, `new-price`, `graded-price`, `box-only-price`, `manual-only-price`, `sales-volume`, `product-name`, `console-name`, `release-date`, `id`, and `upc`. Price amounts are integer cents. These condition buckets must remain distinct:

- Loose: ungraded game only, without box or manual.
- CIB: ungraded game with original box and manual.
- New: ungraded factory-sealed game.
- Graded: graded brand-new sealed game.
- Box Only: original empty box only.
- Manual Only: original manual only.

The public Pokémon Silver page additionally shows a Graded CIB guide row. The documented official API field list does not identify a distinct Graded CIB key, so the implementation must preserve it only when a supported official field is actually returned rather than inventing a value.

## Historic sales limitation

PriceCharting's official API documentation states that its Prices API and CSV download support current item values in conditions/grades, but not historic prices or historic sales. The public item page visibly provides condition-tabbed sold-listing rows, but a normal direct server request from the Tradebilia sandbox returned a Cloudflare CAPTCHA challenge. Tradebilia will not bypass that protection. Therefore the initial official integration retrieves only licensed structured current-guide data and clearly says that direct historical tab rows are not available through the configured API path.

## Tradebilia policy boundary

This source remains read-only context for Video Games at 0% direct Tradebilia valuation weight. It must not create a completed-sale record, current-value market-evidence count, historical-trend row, or analyzer comparable. No database storage is added. Requests must be bounded, server-only, authenticated using a securely stored `PRICECHARTING_API_TOKEN`, and rate-limited to PriceCharting's documented maximum of one API call per second.

## Sources

- Official API documentation: https://www.pricecharting.com/api-documentation
- Official Terms of Service: https://www.pricecharting.com/page/terms-of-service
- Price-guide terms: https://www.pricecharting.com/page/guide-terms-of-service
- Verified direct page reference: https://www.pricecharting.com/game/gameboy-color/pokemon-silver
