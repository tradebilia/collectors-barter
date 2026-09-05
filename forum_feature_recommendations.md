# Collectors Forum Feature Roadmap

## Approved first release

The first release adds category-specific item-type navigation, validated image attachments, user ownership controls, administrator moderation, reporting, pinned announcements, and topic-follow foundations. Collections / Lots remains a parent-category-level option instead of becoming a normal item-type subcategory.

| Capability | First-release behavior | Protection or limit |
|---|---|---|
| Item-type subcategories | Parent categories expose item-specific filters such as Single Comics, Original Art, and Graded Cards. | The server validates category/subcategory combinations. |
| Collections / Lots | Remains available as a parent-level discussion option. | It is not forced into a narrow item-type branch. |
| Photos | A topic may include up to six images. | JPEG, PNG, WebP, and GIF; maximum 6 MB per image; durable storage metadata is saved in the database. |
| User controls | Authors may edit or delete their own topics. | Ownership is checked server-side as well as in the UI. |
| Reports | Signed-in users may report another user’s topic. | Duplicate pending reports from the same reporter are rejected. |
| Moderation | Administrators may remove, restore, pin, or unpin a topic. | Removal is soft-deletion with reason, administrator identity, and activity-log entry. |
| Follow foundation | Signed-in users may follow or unfollow a topic. | A unique user/topic constraint prevents duplicate follows. |

## Recommended next releases

The next highest-value additions are followed-topic notifications, full-text search with unanswered and recently active filters, accepted answers for identification and valuation questions, edit history, rate limiting and spam protection, report queues in the admin dashboard, and lightweight reactions or bookmarks. These should follow real usage patterns so the forum does not become overloaded with controls before participation grows.

A good later-stage moderation feature is a transparent “removed by moderation” state with an appeal path and a dedicated admin queue. A good later-stage discovery feature is a category landing page that shows popular, unanswered, and recently active topics separately. Marketplace links should be optional and contextual rather than automatically embedded in every discussion.
