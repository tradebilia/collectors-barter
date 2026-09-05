import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const forumSource = readFileSync(new URL("../client/src/pages/Forum.tsx", import.meta.url), "utf8");
const topicSource = readFileSync(new URL("../client/src/pages/ForumTopic.tsx", import.meta.url), "utf8");
const moderationQueueSource = readFileSync(new URL("../client/src/components/ForumModerationQueue.tsx", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("Collectors Forum UX contracts", () => {
  it("exposes accessible category and sort controls and keyboard topic navigation", () => {
    expect(forumSource).toContain('role="tablist" aria-label="Forum categories"');
    expect(forumSource).toContain('role="tab"');
    expect(forumSource).toContain("aria-selected={selectedCategory === cat.id}");
    expect(forumSource).toContain('role="group" aria-label="Sort forum topics"');
    expect(forumSource).toContain("aria-pressed={sortBy === sort}");
    expect(forumSource).toContain('role="link"');
    expect(forumSource).toContain('tabIndex={0}');
  });

  it("refreshes topic data after mutations and uses inline errors instead of alerts", () => {
    expect(forumSource).toContain("await utils.market.getForumPosts.invalidate();");
    expect(forumSource).toContain('role="alert"');
    expect(forumSource).not.toContain("alert(\"Please fill in all fields\")");
    expect(forumSource).not.toContain("alert(\"Failed to create topic\")");
    expect(forumSource).toContain("We could not create this topic right now. Please refresh the page and try again.");
    expect(topicSource).toContain("utils.market.getForumPostDetail.invalidate({ postId })");
    expect(topicSource).toContain("utils.market.getForumReplies.invalidate({ postId })");
    expect(topicSource).not.toContain("alert(\"Please enter a reply\")");
    expect(topicSource).not.toContain("alert(\"Failed to add reply\")");
  });

  it("enforces owner-only forum editing and deletion", () => {
    expect(topicSource).toContain("const isPostOwner = Boolean(user && post && Number(user.id) === Number(post.userId));");
    expect(topicSource).toContain("updatePostMutation.mutateAsync");
    expect(topicSource).toContain("deletePostMutation.mutateAsync");
    expect(dbSource).toContain("You can only edit your own post.");
    expect(dbSource).toContain("You can only delete your own post.");
    expect(topicSource).toContain("Edit post");
    expect(topicSource).toContain("Delete post");
    expect(dbSource).toContain("if (existing[0].userId !== userId) throw new Error(\"You can only edit your own post.\");");
    expect(dbSource).toContain("if (existing[0].userId !== userId) throw new Error(\"You can only delete your own post.\");");
  });

  it("keeps hero sizing consistent and renders author identity data", () => {
    expect(forumSource).toContain('className="flex w-full max-w-7xl scale-110 items-center justify-center"');
    expect(topicSource).toContain('className="flex w-full max-w-7xl scale-110 items-center justify-center"');
    expect(topicSource).toContain("<AuthorAvatar name={post.author?.name} avatarUrl={post.author?.avatarUrl} />");
    expect(topicSource).toContain("<AuthorAvatar name={reply.author?.name} avatarUrl={reply.author?.avatarUrl} />");
    expect(dbSource).toContain("COALESCE(NULLIF(${userProfiles.displayName}, ''), NULLIF(${users.displayName}, ''), ${users.name}, 'Anonymous')");
    expect(dbSource).toContain("COALESCE(${userProfiles.avatarUrl}, ${users.avatarUrl})");
    expect(dbSource).toContain("if (user.openId)");
    expect(dbSource).toContain("authorId = persistedUser.id;");
    expect(dbSource).toContain('const schemaMode = await getForumPostsSchemaMode(db);');
    expect(dbSource).toContain('schemaMode === "expanded"');
    expect(dbSource).toContain("INSERT INTO forumPosts (userId, category, title, content)");
    expect(dbSource).toContain("sameNameAccounts.length !== 1");
    expect(routerSource).toContain("[Forum] Topic creation failed");
    expect(routerSource).toContain("We could not create this topic right now. Please refresh the page and try again.");
  });

  it("supports item-type subcategories and validated photo attachments", () => {
    expect(forumSource).toContain("getForumSubcategories(selectedCategory)");
    expect(forumSource).toContain('id="forum-topic-photos"');
    expect(forumSource).toContain('accept="image/jpeg,image/png,image/webp,image/gif"');
    expect(forumSource).toContain("slice(0, 6)");
    expect(topicSource).toContain("post.attachments?.length > 0");
    expect(dbSource).toContain("A forum post can include up to 6 photos.");
  });

  it("supports reporting, following, and admin moderation without weakening ownership checks", () => {
    expect(topicSource).toContain("createForumReport");
    expect(topicSource).toContain("toggleForumFollow");
    expect(topicSource).toContain("moderateForumPost");
    expect(topicSource).toContain('user?.role === "admin"');
    expect(dbSource).toContain("forum_post_${input.action}");
    expect(dbSource).toContain("status: \"removed\"");
    expect(dbSource).toContain("You have already reported this post.");
  });

  it("supports reply photos, optional listing links, and persisted follow notifications", () => {
    expect(topicSource).toContain('id="forum-reply-photos"');
    expect(topicSource).toContain('id="forum-reply-listing"');
    expect(topicSource).toContain("uploadForumReplyImage");
    expect(topicSource).toContain("/listings/${reply.listingId}");
    expect(dbSource).toContain("A forum reply can include up to 6 photos.");
    expect(dbSource).toContain("forumNotifications");
    expect(dbSource).toContain("INSERT INTO forumReplies (postId, userId, content)");
  });

  it("supports search, activity filters, and a dedicated administrator forum queue", () => {
    expect(forumSource).toContain('id="forum-topic-search"');
    expect(forumSource).toContain('role="search" aria-label="Search forum discussions"');
    expect(forumSource).toContain("submitDiscussionSearch");
    expect(forumSource).toContain("Start a discussion");
    expect(forumSource).toContain("Browse collector communities");
    expect(forumSource).toContain("Discussion feed");
    expect(forumSource).toContain("Most replies");
    expect(forumSource).toContain("activityFilter");
    expect(dbSource).toContain("searchQuery?.trim()");
    expect(dbSource).toContain('activityFilter === "unanswered"');
    expect(dbSource).toContain('activityFilter === "recent"');
    expect(dbSource).toContain("getForumReportsForAdmin");
    expect(moderationQueueSource).toContain("Forum Moderation Queue");
    expect(moderationQueueSource).toContain("Remove post");
    expect(moderationQueueSource).toContain("Restore");
    expect(forumSource).toContain("Your topic updates");
    expect(forumSource).toContain("getMyForumNotifications");
    expect(readFileSync(new URL("./routers.ts", import.meta.url), "utf8")).toContain("openId: ctx.user.openId");
  });

  it("provides labeled forms and a useful topic-not-found recovery state", () => {
    expect(forumSource).toContain('aria-modal="true"');
    expect(forumSource).toContain('htmlFor="forum-topic-title"');
    expect(forumSource).toContain('htmlFor="forum-topic-content"');
    expect(topicSource).toContain("Topic not found");
    expect(topicSource).toContain("Browse forum topics");
  });
});
