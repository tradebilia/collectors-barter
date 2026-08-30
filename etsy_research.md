# Etsy Open API Research

## Official sources reviewed

- Authentication: https://developer.etsy.com/documentation/essentials/authentication/
- API reference: https://developers.etsy.com/documentation/reference/

## Findings

Etsy Open API v3 requires an API key on every request. The key is sent in the `x-api-key` header as `keystring:shared_secret`. Endpoints that access private user data or perform writes additionally require an OAuth 2.0 token.

Etsy uses OAuth 2.0 Authorization Code Grants. The authorization URL is `https://www.etsy.com/oauth/connect`; the token URL shown in the official reference is `https://openapi.etsy.com/v3/public/oauth/token`. Etsy recommends a TLS callback URL, CSRF protection using `state`, and PKCE. The available scopes include `email_r`, `profile_r`, and `shops_r`, which are the relevant read scopes for identity and shop verification. The API reference lists User and Shop resources, including authenticated/private profile and shop information.

The safest Tradebilia design is to use Etsy OAuth for a member-initiated connection, never treat a typed Etsy username or shop URL as verified, encrypt refresh/access tokens server-side, store only the minimum imported metadata, and show an Etsy Verified badge only after a successful OAuth callback and authenticated Etsy API response. Likely importable metadata should be limited to the Etsy user/shop identifier, shop name, shop URL or canonical shop reference, avatar if returned, and shop status or basic public shop fields permitted by the granted scopes. Exact fields and endpoint authorization must be confirmed against the generated API reference before implementation.

The existing disabled Etsy connector in session configuration is a documentation/exploration connector, not proof that project credentials or OAuth are configured. It should not be enabled or reused for the application integration without confirming its purpose and settings.

## Implementation implications

The project will need an Etsy API keystring/shared secret pair, an Etsy OAuth client configuration, an HTTPS redirect URI registered in Etsy, and the least-privilege scopes needed for identity/shop verification. No secrets should be printed in chat or committed. A health check should use an authenticated current-user endpoint only after the credentials and member OAuth token are available.

## Verification boundary

A successful OAuth response proves that the member authorized the connected Etsy account and that Etsy returned the account identity. It does not prove that the member owns every shop, listing, or external contact they may later type elsewhere. Tradebilia should keep provider-connected status separate from any manually entered Etsy URL or username.
