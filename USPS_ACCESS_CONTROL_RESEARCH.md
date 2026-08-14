# USPS Tracking API Access-Control Review

## Finding

USPS’s current API Access page distinguishes among three roles for Tracking API access. The applicable requirement depends on who owns the Mailer ID (MID) embedded in the shipped package’s barcode—not merely on whether OAuth credentials can obtain a token. [1]

| Role | USPS’s stated Tracking API path |
|---|---|
| **Shipper** | A business that creates its own labels using its own MID receives continued no-cost Tracking access after reviewing and accepting the updated Terms & Conditions in the USPS Business Portal. USPS does not state that this role must submit an IP Agreement inquiry. |
| **Platform / consolidator** | A label provider or consolidator needs shipper authorization through the USPS Business Portal and active Merchant Access Tokens for Tracking API access. |
| **Service provider / other** | A reporting, analytics, or similar service that accesses Tracking data for a shipper can obtain paid access for specific MIDs. USPS states that this requires MID authorization, an Enterprise Payment System account, a signed Order Form and IP Agreement, Business Portal permissions, and an Email Us inquiry. |

The same USPS page says Tracking API access controls began on April 1, 2026. It specifically states that Tracking API or Tracking Webhook access requires authorization for the MID in the package barcode or tracking number itself. [1]

## Application to Tradebilia

The OAuth client-credentials validation proves only that the consumer credentials are active. The observed Tracking v3r2 HTTP 403 shows that the specific tracking-number/MID access claim has not been authorized for the current app. That does **not** establish that an IP Agreement is always required: it is required if Tradebilia is categorized as a service provider accessing other shippers’ tracking data. If Tradebilia is instead the shipper and the shipment uses its own MID, the primary-source path is to accept the updated Terms & Conditions in the USPS Business Portal and refresh access claims/token before retesting.

USPS’s Merchant Onboarding and Authorization Tech Guide confirms a separate self-service path for a merchant working with a label provider: the merchant establishes its CRID, MID, and Enterprise Payment Account in the Business Portal, then authorizes the label provider there. This supports the conclusion that USPS uses different access paths by role rather than one universal IP Agreement request. [4]

## API Catalog Check

The public USPS API Catalog lists product documentation and the Tracking API is not shown on the first catalog page. The catalog does not display an add-product, enroll, or self-service Tracking activation control for unauthenticated visitors. Its public footer directs users to USPS API Support, while the separate USPS API Access page—not the catalog—contains the role-based Tracking access instructions. This supports treating the catalog as documentation discovery rather than an entitlement-management screen. [5]

The final catalog page exposes the UserInfo API, which USPS describes as the preferred way to view the claims granted to the current OAuth credentials, including CRIDs, MIDs, payment accounts, and permits. The Additional API Products page offers self-service access only for different services, such as Informed Visibility Mail Tracking & Reporting through the Business Customer Gateway. Neither page exposes a self-service enrollment or Tracking API entitlement control for package tracking. [6] [7]

## Primary Sources

[1] [USPS API Access — Tracking API Access Control Changes](https://www.usps.com/business/api-access.htm)

[2] [USPS Tracking v3r2 / legacy tracking documentation](https://developers.usps.com/trackingv3)

[3] [USPS Tracking API Access Control Changes Release Overview](https://postalpro.usps.com/Tracking_APIAccess_Control_Changes_Release_Overview)

[4] [USPS Merchant Onboarding and Authorization Tech Guide](https://postalpro.usps.com/merchant-onboarding-guide)

[5] [USPS API Catalog](https://developers.usps.com/apis)

[6] [USPS API Catalog — UserInfo](https://developers.usps.com/apis?page=3)

[7] [USPS Additional API Products](https://developers.usps.com/additional-APIs)

## Supplied Legacy Endpoint Comparison

The supplied example uses the legacy `GET /tracking/v3/tracking/{trackingNumber}` contract. USPS’s current v3r2 documentation instead specifies `POST /tracking/v3r2/tracking` with an array request body; Tradebilia already uses that current contract. [8] The legacy v3 documentation itself labels v3 as legacy and directs users to migrate to v3r2. [2]

A read-only, sanitized comparison using the same valid tracking number and the configured credentials returned HTTP 403 from **both** endpoints. USPS returned the same cause in each case: the requested MID is not authorized for the relevant Tracking endpoint and it refers users to the IP Agreement inquiry route. Therefore, changing from v3r2 to the legacy v3 request does not bypass the authorization control.

[8] [USPS Tracking v3r2 Documentation](https://developers.usps.com/trackingv3r2)

## Track & Confirm Web Tools Page

The supplied Track & Confirm page is useful historical documentation, but it describes USPS Web Tools `TrackV2` access and carries a January 22, 2025 version date. The page itself instructs users to obtain a MID and request Web Tools access. [9] USPS’s current API Access page separately links to a March 5, 2026 **End of USPS Web Tools Tracking** notice and directs current package-tracking access decisions to the role-based Tracking API Access Control Changes section. [1] [10]

The supplied page therefore does not provide a bypass for the current v3r2 access control. It reinforces that programmatic tracking has always been credentialed, while the current policy now adds MID-based authorization for third-party tracking data.

[9] [USPS Track & Confirm API — Web Tools User Guide](https://www.usps.com/business/web-tools-apis/track-and-confirm-api.htm)

[10] [USPS End of Web Tools Tracking Notice](https://postalpro.usps.com/node/14962)

## Additional Self-Service Review

USPS Getting Started states that the default API product includes **Tracking**, which explains why the configured Consumer Key and Consumer Secret successfully obtain a token whose configured scope includes tracking. It does not state that default product enrollment grants authorization to every third-party sender MID. [11]

The current OAuth documentation expressly distinguishes token issuance from resource access: each API validates the token and scope, and may apply further resource-specific validations. This is consistent with the observed state—valid OAuth authentication followed by a Tracking endpoint 403. [12]

USPS’s official Web Tools page states that the entire Web Tools platform was retired on January 25, 2026 and directs developers to the modern USPS APIs. Therefore, legacy Web Tools registration is not a durable alternative. [13]

The USPS maintained API examples state that a CRID and MID are needed to obtain an access token, but they do not document a self-service method for authorizing an app to track arbitrary third-party sender MIDs. [14]

[11] [USPS Getting Started](https://developers.usps.com/getting-started)

[12] [USPS OAuth 2.0 Documentation](https://developers.usps.com/Oauth)

[13] [USPS Web Tools APIs Retirement Notice](https://www.usps.com/business/web-tools-apis/)

[14] [USPS Official API Examples](https://github.com/USPS/api-examples)

## GitHub and Aggregator Assessment

GitHub contains useful tracking **helpers**, but no legitimate free repository can grant access to every carrier’s private tracking data merely by supplying a universal token. The maintained `stores-com/bloodhound` package normalizes several carrier responses, but its own configuration requires carrier-specific credentials, including a DHL API key, FedEx key and secret, UPS client credentials, and a USPS user ID. [16]

GitHub packages such as `jkeen/tracking_number`, `darkain/php-tracking-urls`, and `philipnewcomer/linkify-tracking` are useful for detecting a tracking-number format or generating an official carrier tracking URL. They do not retrieve live tracking events and therefore require no carrier API access. [17] [18] [19]

AfterShip is a legitimate multi-carrier aggregation service. Its current official documentation requires an AfterShip API key, and creating a tracking record causes AfterShip to retrieve its own carrier updates. Its current pricing lists Tracking Essentials from $29/month and API/webhook access under Premium from $59/month; this is not a free production API path. [20] [21]

[16] [stores-com/bloodhound](https://github.com/stores-com/bloodhound)

[17] [jkeen/tracking_number](https://github.com/jkeen/tracking_number)

[18] [darkain/php-tracking-urls](https://github.com/darkain/php-tracking-urls)

[19] [philipnewcomer/linkify-tracking](https://github.com/philipnewcomer/linkify-tracking)

[20] [AfterShip Tracking API Quick Start](https://www.aftership.com/docs/tracking/quickstart/api-quick-start)

[21] [AfterShip Tracking Pricing](https://www.aftership.com/pricing/tracking)

EasyPost is another legitimate universal API, but not a free standalone tracker for packages Tradebilia did not ship: its 2026 pricing lists basic tracking at $0.01–$0.03 per shipment, and its support documentation lists $0.03 for a standalone USPS tracker and $0.02 for other standalone carrier trackers. Trackers are free only for labels bought through EasyPost. [22] [23]

Shippo similarly lists $0.01 per unique tracking number created outside Shippo, while tracking is included for shipments created through Shippo. [24] 17TRACK’s current public pricing presents a 14-day trial and paid plans starting at $9/month; its API quota page lists paid volume packs. [25] [26]

[22] [EasyPost Pricing](https://www.easypost.com/pricing/)

[23] [EasyPost Billing & Payments](https://support.easypost.com/hc/en-us/articles/360042414212-Billing-Payments)

[24] [Shippo Subscription Plan Overview](https://support.goshippo.com/hc/en-us/articles/360003855652-Shippo-Subscription-Plan-Overview)

[25] [17TRACK Pricing](https://www.17track.com/en/pricing)

[26] [17TRACK Tracking API](https://www.17track.net/en/api)

## Focused Review: USPS Tracking v3r2 Documentation

The current USPS Tracking v3r2 page confirms that Tradebilia’s implementation uses the correct public contract: `POST /tracking`, a JSON array containing one to 35 `trackingNumber` values, and OAuth authorization. The same page explicitly documents **403 Forbidden** as a supported response and provides the standard `{ apiVersion, error: { code, message, errors } }` error shape. [27]

The page does not expose an additional Tracking-specific catalog checkbox, license selector, or self-service mechanism for third-party MIDs. It is an endpoint contract page, not an access-entitlement page. The successful Tradebilia OAuth token already fulfills its stated OAuth requirement; the observed 403 is consistent with the separate MID access-control policy in the USPS Tracking Access Control Tech Sheet. [15] [27]

[27] [USPS Tracking v3r2 Documentation](https://developers.usps.com/trackingv3r2)

## Tracking Access Control Tech Sheet — Self-Service Paths

The official USPS **Package Tracking Access Control** Tech Sheet identifies two distinct authorization paths that were not fully exposed in the HTML API Access summary:

1. **MID authorization:** A shipper grants a service provider full access to that shipper’s MID by directly contacting the USPS Customer Access Technology (CAT) team at `https://emailus.usps.com/s/web-tools-inquiry`.
2. **Tracking-only authorization:** A shipper directs the service provider to the USPS Business Portal, uses **Quick Actions → IP Agreements**, authorizes the provider, and sends the service provider the MID-owner URL. The service provider can then request approval to track packages for that shipper’s MIDs.

The same Tech Sheet states that, after April 1, 2026, service providers require authorization to track packages for select MIDs. The Tracking-only process is the documented self-service Business Portal route that may avoid the generic initial Email Us inquiry, but it requires cooperation from the MID owner and access is limited to that owner’s MIDs. [15]

[15] [USPS Package Tracking Access Control Tech Sheet](https://postalpro.usps.com/mnt/glusterfs/2026-03/Tracking%20Access%20Control.pdf)

The Tech Sheet’s detailed pages clarify the sequence. For a service provider, the **initial** paid Tracking-data-access relationship requires an Email Us request, an EPA account, an Order Form and IP Agreement, Business Portal account configuration, and then merchant tracking authorization. Once that relationship exists, the **merchant/MID owner** can self-serve the per-MID delegation in the Business Portal by granting Tracking Access to the provider. The service provider can only retrieve package barcodes bearing MIDs for which it has been granted access. [15]

This exposes a useful but limited alternative: the sender can authorize Tradebilia for their own MID through the Business Portal once Tradebilia is an approved service provider. It is not a recipient-driven self-service path, and it cannot grant Tradebilia access to an unrelated sender’s package without that sender’s authorization.

The Tech Sheet also confirms that the self-service **merchant/platform authorization** applies to platforms, consolidators, and label providers that generate labels or manifests and maintain active merchant access tokens. Tradebilia does not generate USPS labels, so that no-cost platform path does not apply to its current feature. [15]

The Tech Sheet’s Service Providers section separately states that providers tracking packages for delegated MIDs, when they did not generate the label or manifest, are charged per tracking lookup. It explicitly identifies a public tracking website that accepts any USPS package as a paid tracking-data use case. This is the closest documented classification for Tradebilia’s current “member supplies any tracking number” design. [15]

For that public-tracking use case, the Tech Sheet explicitly lists the same required sequence: contact USPS via **Email Us** to initiate the Order Form and IP Agreement process; establish an EPA; sign the Order Form and IP Agreement; receive Business Portal account configuration; and direct MID-owning merchants to the Business Portal to delegate tracking authorization. The guide does not identify a separate self-service route that skips the initial USPS contact for a public site tracking arbitrary USPS packages. [15]

## Public-Site Scraping and No-Fee Alternative

USPS’s current developer terms expressly prohibit using USPS services or `usps.com` for **datamining or datascraping purposes**, circumventing technology that protects content, and uses outside the shipping/mailing purposes permitted by the applicable license. [28] The general USPS website terms also limit the public site to personal, non-commercial use unless USPS expressly grants permission. [29]

Tradebilia should therefore not scrape the USPS Tracking page or emulate an interactive browser session to bypass the carrier’s API authorization controls. Doing so risks account or IP blocking and conflicts with USPS’s published terms.

The compliant no-fee alternative is a direct, user-initiated link to the official USPS Tracking page, which accepts a single tracking number and lets USPS render its own result. This preserves the familiar public tracking experience without copying or storing USPS tracking data in Tradebilia. [30]

[28] [USPS Developer API Terms and Conditions](https://developers.usps.com/terms-and-conditions)

[29] [USPS General Terms of Use](https://about.usps.com/termsofuse.htm)

[30] [USPS Tracking](https://m.usps.com/m/TrackConfirmAction)
