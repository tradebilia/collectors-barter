import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const forumSource = readFileSync(new URL("../client/src/pages/Forum.tsx", import.meta.url), "utf8");
const topicSource = readFileSync(new URL("../client/src/pages/ForumTopic.tsx", import.meta.url), "utf8");

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

  it("provides labeled forms and a useful topic-not-found recovery state", () => {
    expect(forumSource).toContain('aria-modal="true"');
    expect(forumSource).toContain('htmlFor="forum-topic-title"');
    expect(forumSource).toContain('htmlFor="forum-topic-content"');
    expect(topicSource).toContain("Topic not found");
    expect(topicSource).toContain("Browse forum topics");
  });
});
