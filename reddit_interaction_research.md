# Reddit Interaction Research

## Sources

1. Reddit Help, “Post Actions - Lock, NSFW, and Spoiler”: https://support.reddithelp.com/hc/en-us/articles/15484642147988-Post-Actions-Lock-NSFW-and-Spoiler
2. Reddit Help, “Community settings”: https://support.reddithelp.com/hc/en-us/articles/15484546290068-Community-settings
3. Reddit Help, “How do I report a community?”: https://support.reddithelp.com/hc/en-us/articles/360058311612-How-do-I-report-a-community

## Key Findings

Reddit treats posting, searching, feed discovery, and moderation as separate interaction layers. Its comment model supports direct replies and nested threads, with compact author metadata, a message body, and an inline action row. The action row commonly exposes voting, reply, share, and an overflow menu rather than placing these actions in large cards or separate panels.

Reddit’s comment composer is compact and context-aware. When replying to a particular comment, the composer identifies the target and stays inline near the discussion. Media actions such as image, GIF, and formatting controls are attached to the composer instead of being presented as a large upload form above the conversation.

Reddit supports member editing/deleting of their own comments and moderators’ separate post actions such as locking, removing, restoring, and handling reports. Community settings control whether media and other post/comment features are available. Reports are treated as moderation inputs rather than ordinary member actions.

The main design lesson for Tradebilia is to adopt the interaction hierarchy—not Reddit’s branding: compact author row, content, inline action strip, nested replies, contextual composer, and a separate moderation layer. Tradebilia should retain its category taxonomy, collectible item links, verified identity presentation, and administrator ownership rules.

## Tradebilia Comparison

Tradebilia already supports topic creation, nested reply targets, reply photos, optional item links, owner-only edit/delete, reports, follows, and administrator moderation. Its current reply rows are now compact, but the interaction row is still incomplete compared with the supplied Reddit reference: there is no vote control, no share action, and no compact inline media/formatting toolbar inside the reply composer.

## Recommendation Matrix

| Reddit pattern | Tradebilia decision | Rationale |
|---|---|---|
| Compact author row and message body | Adopt | This is clear and reduces visual weight. |
| Nested replies with a visible vertical relationship | Adopt | It matches the user’s requirement to reply to a member response. |
| Upvote/downvote controls | Adapt | Use a helpfulness reaction or upvote first; avoid downvotes until moderation and abuse rules are mature. |
| Reply action | Adopt | Keep the target banner and add the action inline beside the reply. |
| Share action | Adopt | Share a stable topic or reply link through the native share sheet where available, with copy-link fallback. |
| Image/GIF/formatting composer shortcuts | Adapt | Use image upload and basic formatting first. Do not add a third-party GIF search until policy, storage, and moderation are defined. |
| Overflow menu | Adapt | Use it for Edit/Delete when the current user owns the content, Report for other members’ content, and moderator actions for admins. |
| Karma and public reputation | Defer | Tradebilia should use verified identity, collector categories, and helpful reactions rather than copying Reddit karma. |
| Reddit-style anonymity | Omit | It conflicts with Tradebilia’s trust and authenticity goals. |

The appropriate next step is a discussion and approval of this interaction model, not another partial visual rewrite. The intended result is a compact action row beneath each topic/reply and a smaller contextual composer with clearly labeled image, formatting, and share-related actions.

## Clarified Tradebilia Direction

Rich wants to retain only the organizational benefit of Reddit-style communities while continuing to study Reddit’s overall simplicity. Tradebilia will keep its own parent categories and item-type subcategories as the primary navigation model. The current comparison therefore focuses on hierarchy and formatting: a clear community header, uncomplicated topic rows, compact metadata, readable reply indentation, and a straightforward path from category to subcategory to topic.

The review does not authorize copying Reddit’s voting, karma, anonymity, awards, or other platform-specific mechanics. Those features remain out of scope unless separately approved. Reddit’s official guidance confirms that its broader product separates posting/commenting, media insertion, community navigation, and moderation into distinct interaction layers; Tradebilia can learn from that separation while keeping its own category system and trust-oriented identity model.
