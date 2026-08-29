# External payment destination verification findings

PayPal’s documented Venmo integration is a payment-session integration for eligible businesses and consumers; the reviewed material does not provide a public, no-payment endpoint for checking whether an arbitrary saved Venmo username belongs to a user. Cash App’s official Partner API documentation is oriented around partner onboarding, customer identity, and payment flows, not a public $cashtag existence lookup for arbitrary member-entered destinations.

Tradebilia should therefore keep the current privacy-safe behavior: validate format, require member confirmation that the destination belongs to them, show the destination only to the accepted cash-trade partner, and record member-confirmed payment status. A public profile-page probe would not prove ownership and would be unreliable for PayPal email addresses, Cash App cashtags, Venmo usernames, and Zelle destinations. Provider OAuth or provider-supported identity verification could be considered later, but it would require eligible provider agreements, user authorization, additional secrets, and a separate security review; it should not be represented as implemented by this UI change.

## Sources

- PayPal Developer, “Integrate Venmo with PayPal's JavaScript SDK v6”: https://developer.paypal.com/venmo
- Cash App Developer, “API Integration Quickstart”: https://developers.cash.app/cash-app-pay-partner-api/guides/technical-guides/integrating-with-cash-app-pay/api-integration-quickstart
