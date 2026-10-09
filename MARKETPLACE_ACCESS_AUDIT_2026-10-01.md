
## Adapter implementation contracts verified

- Nate D. Sanders: ordinary GET title search `https://natedsanders.com/catalog.aspx?searchby=3&searchvalue={title}`. Closed result/lot pages expose stable `...-LOT{inventoryId}.aspx` links, `This lot is closed for bidding`, ended date, public `ItemImages` URLs, numeric final price, and explicit `Final prices include buyers premium.`. `Pass` and non-numeric/zero values are not completed sales.
