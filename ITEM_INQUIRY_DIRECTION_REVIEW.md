# Item Inquiry Direction Review

## Screenshot evidence

The supplied screenshot is a 1,871 × 555 panoramic capture, reviewed in four overlapping left-to-right crops. In the first two crops, the selected **Item Inquiries** folder contains a card headed **Rtavani**, followed by **Item Inquiry**, a listing reference, subject text, timestamp, and a **Seen** badge.

The list card does not state whether the signed-in user sent the initial inquiry or received it. A counterpart-only heading therefore makes an outgoing inquiry appear as if it was received from that counterpart.

In the third crop, the detail panel is headed **Rtavani** and marked only as **Item Inquiry**. It shows the subject, message body, and timestamp; it similarly has no direction language such as “You sent this inquiry to Rtavani.” The final crop contains only the delete action and no additional participant-role information.

## Confirmed issue

The UI is correctly resolving the counterpart’s display name but is using that name without any directional context. This is a presentation problem rather than a sender-identity-resolution problem.

## Recommended direction model

Use the signed-in user’s role in the inquiry to make direction explicit everywhere an item inquiry appears.

| Context | Inquiry sent by the signed-in user | Inquiry received by the signed-in user |
| --- | --- | --- |
| List-card headline | `To: Rtavani` | `From: Administrator` |
| Direction badge | `Sent` with an outbound-arrow icon | `Received` with an inbound-arrow icon |
| Status language | `Delivered` or `Read` | `Unread` or `Read` |
| Detail heading | `Inquiry to Rtavani` | `Inquiry from Administrator` |
| Supporting sentence | `You sent this item inquiry on …` | `Received on …` |

The existing **Item Inquiries** folder should remain the unified conversation list, avoiding a duplicate or hidden message system. Add compact **Received** and **Sent** subfilters beneath it so a user can review either group without losing the complete view. The default remains the unified list, with no message preselected.

For the reported example, the card would read **To: Rtavani**, carry a **Sent** badge, and the detail header would say **Inquiry to Rtavani** with the sentence **You sent this item inquiry on 8/12/2026 at 3:38 PM.** This removes the misleading impression that Rtavani authored the original message.
