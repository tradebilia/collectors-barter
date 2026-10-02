# Sirius Sports Auctions Adapter — 2026-10-02

## Source

- Public prices-realized page: https://siriussportsauctions.com/auctionresults.aspx
- Public lot detail pattern: `https://siriussportsauctions.com/LotDetail.aspx?inventoryid=...`
- Category mapping: **Sports Cards only**

## Public contract observed

The results page is a standard ASP.NET form (`POST /auctionresults.aspx`) with:

- hidden `__VIEWSTATE`, `__VIEWSTATEGENERATOR`, and `__EVENTVALIDATION` fields;
- auction selector `ctl00$ContentPlaceHolder$AuctionSelector$AuctionDDL`;
- search text `ctl00$ContentPlaceHolder$SearchTB`;
- search mode `ctl00$ContentPlaceHolder$SearchByDDL` (`3` = Title & Description);
- submit `ctl00$ContentPlaceHolder$GoBtn`;
- all-auctions selector value `-1`.

The public results grid is `#SearchGrid` with columns:

`Auction Name | Lot Number | Title | Min Bid | Final Price | Status`

Rows expose public links to both `AuctionResults.aspx?auctionid=...` and `LotDetail.aspx?inventoryid=...`.

A public lot detail page exposes:

- lot title and description;
- `This lot is closed for bidding` / `Bidding ended on ...`;
- `Final prices include buyers premium.: $...`;
- auction close date;
- public image URL when available.

The live page returned HTTP 200 during the read-only audit. No anti-bot bypass, login, or protected workflow was used.

## Adapter rules

1. Construct a bounded structured query from title plus sports-card fields such as player, set, year, and card number.
2. Search all public archived auctions using Title & Description mode.
3. Cap candidate rows at eight and follow only their public lot-detail URLs.
4. Admit a valuation candidate only when the detail page confirms:
   - explicit closed/ended status;
   - a positive final price;
   - a valid close date;
   - identity-compatible title/description;
   - grade-compatible text when a target grade is supplied.
5. Treat Sirius final price as USD realized price **including buyer premium** and preserve this basis in provenance.
6. Keep all other rows visible as context-only evidence with an exclusion reason.
7. Preserve provider errors and return them without attempting retries or access bypasses.

## Validation

- Parser and admission regression tests cover form construction, result rows, lot-detail parsing, sold admission, missing close data, and grade mismatch.
- The adapter is wired into Test AI source applicability, source highlighting, evidence review, visual review, canonical provenance, and analyzer comparable input.
