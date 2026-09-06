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
    expect(topicSource).toContain("Could not post your reply right now. Please refresh and try again.");
    expect(routerSource).toContain("Could not post your reply right now. Please refresh and try again.");
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
    expect(topicSource).toContain("<AuthorAvatar name={reply.author?.name} avatarUrl={reply.author?.avatarUrl} avatarRef=");
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
    expect(routerSource).toContain("content: z.string().min(1).max(5000)");
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
    expect(dbSource).toContain('if (schemaMode === "legacy")');
    expect(dbSource).toContain('removalMode: "permanent" as const');
    expect(dbSource).toContain("await db.delete(forumReplies).where(eq(forumReplies.postId, input.postId));");
    expect(dbSource).toContain("This older forum record cannot be restored after removal.");
    expect(topicSource).toContain('Could not update this post right now. Please refresh and try again.');
  });

  it("supports reply photos, optional listing links, and persisted follow notifications", () => {
    expect(topicSource).toContain('type="file" accept="image/jpeg,image/png,image/webp,image/gif"');
    expect(topicSource).toContain('id="forum-reply-listing"');
    expect(topicSource).toContain("uploadForumReplyImage");
    expect(topicSource).toContain("/listings/${reply.listingId}");
    expect(dbSource).toContain("A forum reply can include up to 6 photos.");
    expect(dbSource).toContain("forumNotifications");
    expect(dbSource).toContain("INSERT INTO forumReplies (postId, userId, content)");
    expect(dbSource).toContain("INSERT INTO forumReplies (postId, userId, parentReplyId, content)");
  });

  it("uses a compact discussion-row hierarchy with inline reply actions", () => {
    expect(topicSource).toContain("<div className=\"mb-8\">");
    expect(topicSource).not.toContain("divide-y divide-border/70");
    expect(topicSource).not.toContain("divide-y divide-border/60");
    expect(topicSource).toContain("const renderReplyTree = (parentReplyId: number | null, depth: number)");
    expect(topicSource).toContain("childReplies.length > 0");
    expect(topicSource).toContain("${depth > 0 ? \"ml-6\" : \"\"}");
    expect(topicSource).toContain("threadContainerRef");
    expect(topicSource).toContain("replyAvatarRefs");
    expect(topicSource).toContain("getBoundingClientRect");
    expect(topicSource).toContain("M ${parentPoint.x} ${parentPoint.y} V ${point.y} H ${point.x}");
    expect(topicSource).toContain("strokeWidth=\"1.5\"");
    expect(topicSource).toContain("text-slate-400");
    expect(topicSource).toContain("parseForumTimestamp");
    expect(topicSource).toContain("formatForumLocalTimestamp");
    expect(topicSource).toContain("formatRelativeForumTime");
    expect(topicSource).toContain('stringValue.replace(" ", "T")}Z');
    expect(forumSource).toContain("formatForumLocalTimestamp");
    expect(forumSource).not.toContain("toLocaleDateString");
    expect(topicSource).not.toContain("formatRelativeTime");
    expect(topicSource).toContain("bg-slate-100 p-3 shadow-sm");
    expect(topicSource).toContain("border border-slate-300 bg-white px-3 py-2 text-sm");
    expect(topicSource).toContain("collapsedReplyIds.has(control.replyId) ? \"+\" : \"−\"");
    expect(topicSource).toContain("strokeLinecap=\"round\"");
    expect(topicSource).toContain("strokeLinejoin=\"round\"");
    expect(topicSource).toContain("threadGeometry.controls.map");
    expect(topicSource).toContain("style={{ left: control.x, top: control.y }}");
    expect(topicSource).toContain("parentPoint.y + (connectorEndY - parentPoint.y) / 2");
    expect(topicSource).toContain("collapsedReplyIds");
    expect(topicSource).toContain("aria-expanded={!collapsedReplyIds.has(control.replyId)}");
    expect(topicSource).toContain("Show {childReplies.length}");
    expect(topicSource).toContain("whitespace-pre-wrap text-sm leading-6");
    expect(topicSource).toContain("hover:text-primary");
  });

  it("supports direct replies to the topic and replies to individual members", () => {
    expect(topicSource).toContain("replyParentId");
    expect(topicSource).toContain("beginReplyTo");
    expect(topicSource).toContain("renderInlineReplyComposer");
    expect(topicSource).toContain("handleAddReply = async (event: FormEvent, parentReplyId: number | null)");
    expect(topicSource).toContain("handleAddReply(event, isTopicTarget ? null : Number(targetKey))");
    expect(topicSource).toContain("contentEditable");
    expect(topicSource).toContain("document.execCommand(\"bold\")");
    expect(topicSource).toContain("contentEditableToMarkdown");
    expect(topicSource).toContain("renderForumContent");
    expect(topicSource).toContain('Replying to <strong className="text-foreground">');
    expect(topicSource).toContain("Insert image");
    expect(topicSource).toContain("replyPhotos.map((file) => file.name)");
    expect(topicSource).toContain('text-sm font-bold leading-5 text-foreground');
    expect(forumSource).toContain('useState<"activity" | "newest" | "popular" | "replies">("activity")');
    expect(forumSource).toContain('sort === "activity" ? "Recently active"');
    expect(dbSource).toContain('desc(forumPosts.updatedAt)');
    expect(dbSource).toContain('updatedAt: mysqlNow()');
    expect(topicSource).toContain('accept="video/mp4"');
    expect(topicSource).toContain("Choose one MP4 video up to 10 MB.");
    expect(topicSource).toContain('media.mimeType === "video/mp4"');
    expect(routerSource).toContain('"video/mp4"');
    expect(dbSource).toContain("mimeType: string");
    expect(dbSource).toContain("parentReplyId?: number | null");
    expect(dbSource).toContain("The reply you are responding to is no longer available.");
    expect(dbSource).toContain("getForumRepliesCapabilities(db)");
    expect(dbSource).toContain("hasParentReplyId: columns.has(\"parentReplyId\")");
    expect(dbSource).toContain("hasListingId: columns.has(\"listingId\")");
    expect(dbSource).toContain("hasAttachmentsTable: Number(attachmentTableRows?.[0]?.tableCount ?? 0) === 1");
    expect(dbSource).toContain("const attachments = replyCapabilities.hasAttachmentsTable");
    expect(dbSource).toContain("parentReplyId: replyCapabilities.hasParentReplyId ? forumReplies.parentReplyId : sql<number | null>`NULL`");
  });

  it("supports search, activity filters, and a dedicated administrator forum queue", () => {
    expect(forumSource).toContain('id="forum-topic-search"');
    expect(forumSource).toContain('role="search" aria-label="Search forum discussions"');
    expect(forumSource).toContain("submitDiscussionSearch");
    expect(forumSource).toContain("Start a discussion");
    expect(forumSource).toContain("Browse collector communities");
    expect(forumSource).not.toContain("Discussion feed");
    expect(forumSource).toContain('aria-label="Forum topic sorting"');
    expect(forumSource).toContain("bg-white p-1.5 shadow-sm");
    expect(forumSource).toContain("forumCategoryTones");
    expect(forumSource).toContain("Most replies");
    expect(dbSource).toContain("searchQuery?.trim()");
    expect(dbSource).toContain('sortBy === "activity"');
    expect(dbSource).toContain('desc(forumPosts.updatedAt)');
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
