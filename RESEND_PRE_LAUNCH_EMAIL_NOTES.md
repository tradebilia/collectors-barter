# Resend Pre-Launch Email Integration Notes

The Pre-Launch Email workspace uses Resend's contact and broadcast APIs so that opted-in Coming Soon subscribers receive a compliant marketing update with a provider-managed unsubscribe path.

## Verified API contract

| Capability | Contract used | Implementation implication |
|---|---|---|
| List opted-in recipients | `GET /contacts` supports pagination and returns `unsubscribed` state. | The admin workspace lists only contacts whose global `unsubscribed` state is false. |
| Create reusable recipient group | `POST /segments` creates a named segment. | The application uses a dedicated `Tradebilia Pre-Launch Updates` segment. |
| Enroll contacts | A contact can be created with `segments`, and an existing contact can be added by ID or email. | Existing Coming Soon contacts are enrolled when the admin prepares the mailing group; future signups are enrolled at creation. |
| Draft and send update | Resend broadcasts require a `segment_id`; create supports draft mode and an explicit `send` flag. | The application prepares a draft first and performs delivery only after the admin explicitly confirms send. A local unique delivery ledger records the administrator, draft hash, result, and delivery state before provider submission. |
| Recipient choice | Broadcasts use the selected segment and support Resend unsubscribe variables. | The email body includes Resend's unsubscribe URL placeholder rather than exposing recipient addresses to other recipients. |

## Delivery safety controls

The administrative Pre-Launch workspace generates one UUID delivery key when draft content changes and retains it for the confirmed send/retry. Before Resend is contacted, Tradebilia claims that unique key in the local delivery ledger. A confirmed broadcast retry returns its recorded identifier and recipient count without sending again. A `sending` or `uncertain` delivery is deliberately not auto-replayed, because Resend documents idempotency for email and batch-email endpoints but not broadcast create/send endpoints.

When `TRADEBILIA_STAGING_MODE` is enabled, public signup, recipient retrieval, and broadcast delivery return before any Resend request. The public signup procedure also applies a process-local limit using normalized email plus request source. These controls complement, rather than replace, Resend’s duplicate-contact handling in production.

## Sources

- [List Contacts](https://resend.com/docs/api-reference/contacts/list-contacts)
- [Create Segment](https://resend.com/docs/api-reference/segments/create-segment)
- [Add Contact to Segment](https://resend.com/docs/api-reference/contacts/add-contact-to-segment)
- [Create Contact](https://resend.com/docs/api-reference/contacts/create-contact)
- [Create Broadcast](https://resend.com/docs/api-reference/broadcasts/create-broadcast)
- [Send Broadcast](https://resend.com/docs/api-reference/broadcasts/send-broadcast)
- [Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
