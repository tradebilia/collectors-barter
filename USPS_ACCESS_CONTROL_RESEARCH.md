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

## Primary Sources

[1] [USPS API Access — Tracking API Access Control Changes](https://www.usps.com/business/api-access.htm)

[2] [USPS Tracking v3r2 / legacy tracking documentation](https://developers.usps.com/trackingv3)

[3] [USPS Tracking API Access Control Changes Release Overview](https://postalpro.usps.com/Tracking_APIAccess_Control_Changes_Release_Overview)

[4] [USPS Merchant Onboarding and Authorization Tech Guide](https://postalpro.usps.com/merchant-onboarding-guide)
