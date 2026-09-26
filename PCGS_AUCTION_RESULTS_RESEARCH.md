# PCGS Auction Prices Realized API

Source: https://api.pcgs.com/publicapi/swagger

## Official endpoint used
- `GET https://api.pcgs.com/publicapi/coindetail/GetAPRByCertNo/{CertNo}`
- Authentication: `Authorization: bearer <PCGS access token>`
- The API documentation describes this as Auction Prices Realized data for a coin using its certification number.

## Returned fields
Top-level: `PCGSNo`, `CertNo`, `Name`, `Grade`, `Year`, `Denomination`, `Auctions`, `IsValidRequest`, `ServerMessage`.

Each auction record can include: `Service`, `Date`, `Auctioneer`, `LotNo`, `LotNumV2`, `SaleName`, `CertNo`, `Price`, `IsCAC`, and `AuctionLotUrl`.

## Tradebilia handling
- The adapter is read-only and server-side.
- Results are certification-matched and surfaced as completed-auction evidence candidates.
- They remain subject to Tradebilia date, price, currency, duplicate, and evidence-quality gates before influencing deterministic valuation.
- CoinFacts certification, population, and price-guide data remain context and are not treated as auction sales.
