import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const forumSource = readFileSync(new URL("../client/src/pages/Forum.tsx", import.meta.url), "utf8");
const topicSource = readFileSync(new URL("../client/src/pages/ForumTopic.tsx", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

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
  });

  it("provides labeled forms and a useful topic-not-found recovery state", () => {
    expect(forumSource).toContain('aria-modal="true"');
    expect(forumSource).toContain('htmlFor="forum-topic-title"');
    expect(forumSource).toContain('htmlFor="forum-topic-content"');
    expect(topicSource).toContain("Topic not found");
    expect(topicSource).toContain("Browse forum topics");
  });
});
