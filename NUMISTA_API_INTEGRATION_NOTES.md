# Numista API integration notes

## Verified sources

- Official API overview: https://en.numista.com/api/index.php
- Official API documentation: https://en.numista.com/api/doc/index.php
- Official pricing: https://en.numista.com/api/pricing.php
- Public client example cross-check: https://gist.githubusercontent.com/namachieli/7bb0271f415d796744ba47506c76146f/raw/

## Authentication

Numista's API uses the `Numista-API-Key` HTTP header. The authenticated v3 flow uses:

1. `GET https://api.numista.com/api/v3/oauth_token?grant_type=client_credentials&scope=view_types`
2. Header: `Numista-API-Key: <secret>`
3. Use the returned bearer token on subsequent v3 requests with both `Numista-API-Key` and `Authorization: Bearer <token>`.

The project stores `NUMISTA_API_KEY`, `NUMISTA_CLIENT_ID`, and `NUMISTA_CLIENT_NAME` only as secure server-side environment variables. Client ID/name are retained for the application user-agent/metadata; raw values must never be printed or committed.

## Live validation

The required secure credential test passed on 2026-10-07 UTC using the token flow above and `GET https://api.numista.com/api/v3/types/1`. The test reported only HTTP success and response shape; no secret or raw provider payload was logged.

## Search contract

Numista's documented catalogue endpoint is `GET /api/v3/types`. Search supports at least one of `q`, `issuer`, `catalogue`, `date`, or `year` according to official documentation/forum references. Type detail is `GET /api/v3/types/{type_id}`. Tradebilia should use structured coin fields to build a bounded catalogue query, retain Numista facts as reference/context, and not treat catalogue records as completed-sale evidence or valuation without explicit sale data.
