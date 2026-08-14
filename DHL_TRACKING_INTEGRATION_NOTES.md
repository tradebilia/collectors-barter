# DHL Tracking Integration Notes

## Credential and API distinction

The supplied API key was checked without exposing credentials against both MyDHL and Unified Tracking endpoints. MyDHL production and test endpoints returned `401`, while **Shipment Tracking - Unified** returned `200`. Therefore, this supplied key is a Unified Tracking subscription key, not a MyDHL Basic-authentication pair.

Shipment Tracking - Unified uses a `DHL-API-Key` subscription key sent to `https://api-eu.dhl.com/track/shipments`. The activated Test AI adapter uses that contract; the supplied secret is retained only in secure project settings and is not sent by the Unified Tracking request. [3]

## Privacy and intended-use constraint

The Unified Tracking API allows tracking of DHL shipments for a customer’s legitimate purposes but requires appropriate sender/consignee consent when the integrator acts on behalf of someone else. The Test AI adapter must remain read-only, must exclude proof-of-delivery/signature and precise address data, and must be restricted to the relevant authorized use case. [3]

## Next technical decision

The Test AI adapter uses the Unified Tracking endpoint associated with the supplied API key. A real DHL tracking number is still required to validate a live shipment response.

## References

[1] [DHL Express MyDHL API](https://developer.dhl.com/api-reference/dhl-express-mydhl-api?language_content_entity=en)

[2] [DHL Basic Authentication Guide](https://support-developer.dhl.com/support/solutions/articles/47001224429-how-to-authorize-a-mydhl-express-api-call-using-the-api-key-on-postman-)

[3] [DHL Shipment Tracking - Unified API](https://developer.dhl.com/tracking?language_content_entity=en)
