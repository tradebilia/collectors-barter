# Parse.bot Auction Sources Research

## Lelands
- Parse page: https://parse.bot/marketplace/c7c7ede6-ae6b-4e11-b281-0693582e7b80/lelands-com-api
- Scraper base: `https://api.parse.bot/scraper/d219970c-feb5-4d1a-a22e-9146392618be/`
- Endpoints: `search_sales` (5 credits; query, limit 1–5, sort, offset), `get_lot` (2 credits; source URL).
- Coverage: past sports card and memorabilia archive; useful for Sports Cards and Autographs.
- Fields: title, source URL, item/lot ID, category, description, images, auction name, status, final_amount, price_basis, buyer premium included, bid count, grader/grade, sale_date/sale_datetime, date precision.
- Gate: only `status=sold`, non-null final_amount, dated record, exact identity/grade/condition match, then visual/duplicate/currency checks. `final_amount` is buyer-premium-inclusive; date is auction-end precision.

## Pristine Auction
- Parse page: https://parse.bot/marketplace/d5b8a329-932a-42d5-8920-20234b6b9f45/pristineauction-com-api
- Scraper base: `https://api.parse.bot/scraper/90fb8e63-d89d-4d24-8445-c25ef960c168/`
- Endpoints: `search_lots` (1 credit; query, status, page), `get_lot` (2 credits; canonical URL).
- Coverage: sports-card lots through this Parse API.
- Fields: title, lot URL/ID, status, end time, image, current bid, bid count, sold, winning bid, buyer premium, total price, completed_at, price basis.
- Gate: search only discovers; detail must show `status=completed`, `sold=true`, winning bid, dated completed_at/end_time, exact identity/grade match, then visual/duplicate/currency checks. Use one consistent basis: hammer winning_bid or all-in total_price.

## Shared constraints
- These are independent Parse.bot wrappers, not official auction APIs.
- Active/open, unsold/unknown, catalog-only, failed-detail, title-only, or unclear-price-basis records remain context only.
- Parse pricing: https://parse.bot/pricing
- Implementation remains sandbox-only; no production Trade Room changes, database schema changes, migrations, or writes.
