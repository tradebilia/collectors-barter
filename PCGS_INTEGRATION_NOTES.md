# PCGS Test AI Integration Notes

## Official Contract

PCGS documents its Public API at <https://www.pcgs.com/publicapi/documentation>. All requests use HTTPS under `https://api.pcgs.com/publicapi/` and authenticate with an `Authorization: bearer <access token>` header. PCGS documents a default daily limit of 1,000 calls.

For a coin certification lookup, the official Swagger catalog at <https://api.pcgs.com/publicapi/swagger/ui/index> documents:

```text
GET /coindetail/GetCoinFactsByCertNo/{certNo}
```

The documented optional `retrieveAllData` flag returns expanded CoinFacts information. The response exposes the PCGS number, certificate number, coin name, year, denomination, mintage, grade, population, population higher, price-guide information, variety, images, and auction data when available.

For banknote certification numbers, the Swagger catalog also documents:

```text
GET /banknotedetail/GetBanknoteByCertNo?certNo={certNo}
```

The Test AI adapter must remain administrator-only and read-only. It uses `PCGS_API_TOKEN` as the primary server-side credential. An optional `PCGS_API_TOKEN_SECONDARY` may be configured as a separate server-side credential, but it is used only when an individual primary request times out or returns HTTP 429 rate limiting; it is not a fallback for HTTP 401/403, 5xx responses, invalid requests, empty results, or ordinary provider responses. Only one secondary attempt is made per request. No token value belongs in source, client code, logs, or documentation.

## Error Handling

PCGS documents that malformed inputs may return JSON with `IsValidRequest: false`, a valid no-result search returns `IsValidRequest: true` with `ServerMessage: "No data found"`, and a credential or server problem may present as HTTP 500. The Test AI UI should map these safely to actionable messages without exposing provider response internals or credentials.

## Sources

- <https://www.pcgs.com/publicapi/documentation>
- <https://www.pcgs.com/publicapi>
- <https://api.pcgs.com/publicapi/swagger/ui/index>
