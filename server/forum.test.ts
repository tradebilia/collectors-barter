import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireDb } from "./db";
import { createForumPost, getForumPosts, getForumPostById, addForumReply } from "./db";
import { eq } from "drizzle-orm";

describe("Forum Functionality", () => {
  let testUserId: number;
  let testPostId: number;

  beforeAll(async () => {
    const db = await requireDb();
    const { users } = await import("../drizzle/schema");

    const result = await db.insert(users).values({
      email: `forum-test-${Date.now()}@test.com`,
      displayName: "Forum Tester",
      role: "user",
    });

    testUserId = result[0].insertId as number;
  });

  afterAll(async () => {
    const db = await requireDb();
    const { users, forumPosts, forumReplies } = await import("../drizzle/schema");

    await db.delete(forumReplies).where(eq(forumReplies.userId, testUserId));
    await db.delete(forumPosts).where(eq(forumPosts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should create a forum post", async () => {
    const result = await createForumPost(
      { id: testUserId, name: "Forum Tester" },
      {
        category: "comics",
        title: "Best Comic Grading Companies",
        content: "What are your favorite comic grading companies?",
      }
    );

    expect(result.postId).toBeGreaterThan(0);
    testPostId = result.postId;
  });

  it("should retrieve forum post by ID", async () => {
    const post = await getForumPostById(testPostId);
    expect(post).toBeDefined();
    expect(post?.id).toBe(testPostId);
  });

  it("should add a reply to a forum post", async () => {
    const result = await addForumReply(
      { id: testUserId, name: "Forum Tester" },
      {
        postId: testPostId,
        content: "I prefer PSA grading for comics",
      }
    );

    expect(result.replyId).toBeGreaterThan(0);
  });

  it("should retrieve forum posts", async () => {
    const posts = await getForumPosts("comics", "newest");
    expect(Array.isArray(posts)).toBe(true);
  });
});
