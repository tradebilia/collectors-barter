# Sold-Comps Integration Notes

## Official contract reviewed

Source: <https://sold-comps.com/docs>

Sold-Comps documents a single authenticated GET request for eBay completed listings:

```text
GET https://api.sold-comps.com/v1/scrape?keyword=<query>&count=<1-240>
Authorization: Bearer sc_<key>
```

The documented optional parameters used by Tradebilia are `ebaySite=ebay.com` and `sortOrder=endedRecently`. A successful response contains an `items` array whose fields include `soldPrice`, `soldCurrency`, `shippingPrice`, `endedAt`, `url`, `thumbnailUrl`, `sellerUsername`, and `condition`.

The provider documents HTTP `401` for an absent or invalid key, `429` for rate-limit or quota exhaustion, and `502`/`503` as transient upstream conditions. The free tier is documented as allowing 100 searches per month, so validation should use a single bounded read-only lookup.

## Tradebilia configuration finding

The project secret is named `SOLID_COMPS_API_KEY`, while the prior Test AI code read only `SOLD_COMPS_API_KEY`. The Test AI UI therefore returned “Sold-Comps API key not configured” before making a provider request. The integration accepts both variable names, preferring the standardized `SOLD_COMPS_API_KEY` name when available, without exposing either secret.
