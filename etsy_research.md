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

## Account-only connection clarification

Etsy's `getMe` endpoint is authorized through `shops_r` and may return `404` for a valid Etsy account without a shop. Etsy OAuth access tokens begin with the authenticated member's numeric Etsy user ID, separated from the token value by a period. Tradebilia therefore uses that user-ID prefix with the documented `GET /v3/application/users/{user_id}` endpoint after consent, then treats the optional shop lookup independently. A connected account without a shop is truthfully presented as **Etsy Verified** without inventing shop metadata or merchant status. Public verification payloads expose only the boolean connection fact and connection timestamp; encrypted OAuth tokens and Etsy email remain server-side.

## Provider account-tenure fields

eBay's official `GetUser` response documents a `RegistrationDate`, so Tradebilia can truthfully preserve and display an eBay “Member since” date when it is returned. Meta's current Graph API User reference does not list an account-creation, registration-date, or member-since field for an authenticated personal Facebook profile; Tradebilia must not infer account age from the OAuth connection time. LinkedIn's current OpenID Connect profile claims are limited to identity and profile fields such as subject ID, name, profile picture, locale, and optional email/email verification; no account-creation or member-since field is available. Facebook and LinkedIn can therefore show only the date the account was connected to Tradebilia, not the age of the external account.

## Compact public-profile verification presentation

The public profile now presents connected providers in a compact wrapping **Verified Accounts** selector rather than as a vertical stack of full-size cards. The user can select one provider to inspect that provider's verified details; the eBay panel retains its meaningful reputation metrics. Etsy's panel displays the approved Etsy user ID, display name when returned, connection date, and optional shop name, status, avatar, and HTTPS shop link. Desktop and mobile visual checks confirmed that four connected providers remain compact and readable without crowding the profile.

## Verified Accts tab visual baseline

The pre-change public profile at desktop width kept Overview active, showed the compact Verified Accounts selector in the right column, and retained the existing profile header and overview layout. This baseline was captured before previewing the new Verified Accts tab. The new tab is implemented in `client/src/pages/PublicProfile.tsx` after Reviews and uses the existing privacy-filtered public provider fields.

## Verified Accts tab visual verification

The new Verified Accts tab rendered correctly at desktop width with four provider cards in a two-column grid, showing the eBay username/member year/feedback, Facebook identity, LinkedIn identity, and Etsy user ID/name plus the truthful no-shop message. At mobile width the cards stacked into readable full-width sections, and the tab navigation remained horizontally usable. Overview was restored as the default tab after the temporary visual checks.
