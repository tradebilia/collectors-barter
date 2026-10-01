
## Adapter implementation contracts verified

- Stephen Album Rare Coins: ordinary GET to `https://www.sarc.auction/auctionlist.aspx?dv=2`; completed archive rows expose `Bidding Has Concluded`, stable auction URLs ending `_as{auctionId}`, and lot-list pages use `_p2` suffixes. Lot detail pages expose canonical URLs ending `_i{lotId}`, title, public image, `SOLD`, numeric USD hammer in `itemprop=price`, separate `itemprop=priceCurrency=USD`, sold timestamp, and separate `+ buyer's premium` text. Buyer premium is not included in the stored hammer amount.
- Nate D. Sanders: ordinary GET title search `https://natedsanders.com/catalog.aspx?searchby=3&searchvalue={title}`. Closed result/lot pages expose stable `...-LOT{inventoryId}.aspx` links, `This lot is closed for bidding`, ended date, public `ItemImages` URLs, numeric final price, and explicit `Final prices include buyers premium.`. `Pass` and non-numeric/zero values are not completed sales.
