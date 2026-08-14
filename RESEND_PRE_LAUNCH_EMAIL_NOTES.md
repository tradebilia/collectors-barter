# Resend Pre-Launch Email Integration Notes

The Pre-Launch Email workspace uses Resend's contact and broadcast APIs so that opted-in Coming Soon subscribers receive a compliant marketing update with a provider-managed unsubscribe path.

## Verified API contract

| Capability | Contract used | Implementation implication |
|---|---|---|
| List opted-in recipients | `GET /contacts` supports pagination and returns `unsubscribed` state. | The admin workspace lists only contacts whose global `unsubscribed` state is false. |
| Create reusable recipient group | `POST /segments` creates a named segment. | The application uses a dedicated `Tradebilia Pre-Launch Updates` segment. |
| Enroll contacts | A contact can be created with `segments`, and an existing contact can be added by ID or email. | Existing Coming Soon contacts are enrolled when the admin prepares the mailing group; future signups are enrolled at creation. |
| Draft and send update | Resend broadcasts require a `segment_id`; create supports draft mode and an explicit `send` flag. | The application prepares a draft first and performs delivery only after the admin explicitly confirms send. |
| Recipient choice | Broadcasts use the selected segment and support Resend unsubscribe variables. | The email body includes Resend's unsubscribe URL placeholder rather than exposing recipient addresses to other recipients. |

## Sources

- [List Contacts](https://resend.com/docs/api-reference/contacts/list-contacts)
- [Create Segment](https://resend.com/docs/api-reference/segments/create-segment)
- [Add Contact to Segment](https://resend.com/docs/api-reference/contacts/add-contact-to-segment)
- [Create Contact](https://resend.com/docs/api-reference/contacts/create-contact)
- [Create Broadcast](https://resend.com/docs/api-reference/broadcasts/create-broadcast)
- [Send Broadcast](https://resend.com/docs/api-reference/broadcasts/send-broadcast)
