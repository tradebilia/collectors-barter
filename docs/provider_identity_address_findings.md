# Provider identity/address research notes

## eBay

The official eBay Identity API documentation states that it returns data for an authenticated user based on OAuth scopes. Non-confidential data such as eBay user ID is available under the default scope, while confidential data such as address, email, and phone depends on the OAuth scope used. Source: https://developer.ebay.com/develop/api/buy/identity_api

## Meta/Facebook

The official Graph API User documentation lists public profile fields such as ID, first name, last name, name, picture, and short name. It lists email as available when a valid email exists and a current location field requiring the user_location permission. It does not list a postal/mailing address as a normal exposed User field. Source: https://developers.facebook.com/docs/graph-api/reference/user/

These notes are preliminary and must be cross-checked against current provider scopes, app review requirements, and the specific OAuth connections configured for Tradebilia before implementation.

## Privacy boundary

Any future comparison should be opt-in, minimize data, avoid storing provider addresses where possible, and return only a private match/mismatch/unavailable result. It should never expose one user’s provider address to another participant.

## Date

Research captured 2026-09-14.

## References

1. [eBay Identity API](https://developer.ebay.com/develop/api/buy/identity_api)
2. [Meta Graph API User](https://developers.facebook.com/docs/graph-api/reference/user/)

## LinkedIn

The official LinkedIn Profile API is restricted to approved developers and returns the authenticated member’s profile subject to privacy settings. The documented default profile sample contains identity, headline, vanity name, and profile picture fields. Location is represented as a geoLocation/display name; the documented profile API does not provide a postal/mailing address as a normal field. LinkedIn also limits storage of returned profile data to the authenticated member with permission. Source: https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api

## Etsy

The official Etsy Open API requires OAuth-scoped access. The reference site is dynamically rendered in the browser, and search results indicate that Etsy documents a user-address endpoint, but address access should be treated as scope- and use-case-dependent until the exact endpoint contract is confirmed from the generated reference. Etsy is therefore a possible but not yet confirmed source for a user’s address; it should not be assumed available from a basic account connection. Source: https://developers.etsy.com/documentation/reference/

## PayPal

The official PayPal Orders API payer definition documents a payer address object with billing-address fields such as address lines, administrative areas, postal code, and country code. This is documented in the Orders/payment context, not as a general-purpose “read the user’s PayPal account settings” identity endpoint. A PayPal address comparison would therefore be appropriate only when the user explicitly authorizes a checkout/order or other permitted PayPal flow that returns the address. Source: https://developer.paypal.com/api/orders/v2/definitions/payer

## Discogs

The official Discogs API documents authenticated user identity/profile, marketplace, order, collection, and inventory surfaces. The available documentation reviewed does not establish a general authenticated-user postal-address field for account comparison. Discogs should therefore be treated as unsuitable for address matching; it is useful for music identity/catalog data instead. Source: https://www.discogs.com/developers
