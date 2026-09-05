import { FormEvent, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

function AuthorAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted" aria-hidden="true">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-muted-foreground">{name?.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </div>
  );
}

export function ForumTopic() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/forum/:postId");
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState("");
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const utils = trpc.useUtils();

  const postId = params?.postId ? parseInt(params.postId) : 0;

  const { data: post, isLoading: postLoading } = trpc.market.getForumPostDetail.useQuery(
    { postId },
    { enabled: !!postId }
  );

  const { data: replies, isLoading: repliesLoading } = trpc.market.getForumReplies.useQuery(
    { postId },
    { enabled: !!postId }
  );

  const addReplyMutation = trpc.market.addForumReply.useMutation();
  const updatePostMutation = trpc.market.updateForumPost.useMutation();
  const deletePostMutation = trpc.market.deleteForumPost.useMutation();
  const isPostOwner = Boolean(user && post && Number(user.id) === Number(post.userId));

  const beginEditPost = () => {
    if (!post) return;
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
    setEditError("");
    setDeleteError("");
    setIsEditingPost(true);
  };

  const handleUpdatePost = async (event: FormEvent) => {
    event.preventDefault();
    setEditError("");
    if (editTitle.trim().length < 3 || editContent.trim().length < 10) {
      setEditError("Use a title with at least 3 characters and a message with at least 10 characters.");
      return;
    }
    try {
      await updatePostMutation.mutateAsync({
        postId,
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      await utils.market.getForumPostDetail.invalidate({ postId });
      setIsEditingPost(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to update your post. Please try again.");
    }
  };

  const handleDeletePost = async () => {
    setDeleteError("");
    try {
      await deletePostMutation.mutateAsync({ postId });
      await utils.market.getForumPosts.invalidate();
      setLocation("/forum");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete your post. Please try again.");
      setShowDeleteConfirm(false);
    }
  };

  const handleAddReply = async (event: FormEvent) => {
    event.preventDefault();
    setReplyError("");
    if (!replyContent.trim()) {
      setReplyError("Write a reply before posting.");
      return;
    }

    try {
      await addReplyMutation.mutateAsync({
        postId,
        content: replyContent.trim(),
      });
      setReplyContent("");
      await Promise.all([
        utils.market.getForumPostDetail.invalidate({ postId }),
        utils.market.getForumReplies.invalidate({ postId }),
      ]);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "Failed to add reply. Please try again.");
    }
  };

  if (!match) return null;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      {/* Hero Section */}
      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(https://assets.tradebilia.com/Background_23084d14.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-7xl scale-110 items-center justify-center">
            <img
              src="https://assets.tradebilia.com/Collectorsforum_7dba7bdd.svg"
              alt="Collector's Forum"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <CategoryBar />

      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => setLocation("/forum")} className="mb-6">
          ← Back to Forum
        </Button>

        {postLoading ? (
          <div className="text-center py-8">Loading topic...</div>
        ) : post ? (
          <>
            {/* Original Post */}
            <Card className="mb-8 p-6">
              {isEditingPost ? (
                <form onSubmit={handleUpdatePost} className="space-y-4">
                  <div>
                    <label htmlFor="forum-edit-title" className="mb-2 block text-sm font-medium">Topic title</label>
                    <input
                      id="forum-edit-title"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="w-full rounded-md border px-3 py-2"
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <label htmlFor="forum-edit-content" className="mb-2 block text-sm font-medium">Message</label>
                    <textarea
                      id="forum-edit-content"
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      className="h-36 w-full rounded-md border px-3 py-2"
                      maxLength={5000}
                    />
                  </div>
                  {editError && <p className="text-sm text-red-700" role="alert">{editError}</p>}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditingPost(false)}>Cancel</Button>
                    <Button type="submit" disabled={updatePostMutation.isPending}>
                      {updatePostMutation.isPending ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <AuthorAvatar name={post.author?.name} avatarUrl={post.author?.avatarUrl} />
                      <div className="min-w-0">
                        <h1 className="mb-2 text-3xl font-bold">{post.title || "(Untitled)"}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>{post.author?.name || "Anonymous"}</span>
                          <span>{new Date(post.createdAt).toLocaleString()}</span>
                          <span>{post.viewCount} views</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      {!!post.isPinned && <span className="text-xs rounded bg-yellow-100 px-2 py-1 text-yellow-800">PINNED</span>}
                      {!!post.isSolved && <span className="text-xs rounded bg-green-100 px-2 py-1 text-green-800">SOLVED</span>}
                      {!!post.isLocked && <span className="text-xs rounded bg-red-100 px-2 py-1 text-red-800">LOCKED</span>}
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p>{post.content}</p>
                  </div>

                  {isPostOwner && (
                    <div className="mt-6 border-t pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">You can edit or delete your own topic.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={beginEditPost}>Edit post</Button>
                          <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm((current) => !current)}>
                            Delete post
                          </Button>
                        </div>
                      </div>
                      {showDeleteConfirm && (
                        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                          <p className="text-sm text-red-900">Delete this topic and its replies? This cannot be undone.</p>
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>Keep post</Button>
                            <Button type="button" onClick={handleDeletePost} disabled={deletePostMutation.isPending} className="bg-red-700 text-white hover:bg-red-800">
                              {deletePostMutation.isPending ? "Deleting..." : "Confirm delete"}
                            </Button>
                          </div>
                        </div>
                      )}
                      {deleteError && <p className="mt-3 text-sm text-red-700" role="alert">{deleteError}</p>}
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Replies */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Replies ({post.replyCount})</h2>

              {repliesLoading ? (
                <div className="text-center py-8">Loading replies...</div>
              ) : replies && replies.length > 0 ? (
                <div className="space-y-4 mb-8">
                  {replies.map(reply => (
                    <Card key={reply.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <AuthorAvatar name={reply.author?.name} avatarUrl={reply.author?.avatarUrl} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{reply.author?.name || "Anonymous"}</h3>
                            <span className="text-xs text-muted-foreground">
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{reply.content}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground mb-8">
                  No replies yet. Be the first to respond!
                </div>
              )}
            </div>

            {/* Add Reply */}
            {user && !post.isLocked ? (
              <Card className="p-6">
                <form onSubmit={handleAddReply}>
                  <h3 className="mb-1 text-lg font-semibold">Add Your Reply</h3>
                  <p className="mb-4 text-sm text-muted-foreground">Keep the conversation useful and respectful for fellow collectors.</p>
                  <label htmlFor="forum-reply-content" className="sr-only">Your reply</label>
                  <textarea
                    id="forum-reply-content"
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    placeholder="Enter your reply..."
                    className="mb-4 h-24 w-full rounded-md border px-3 py-2"
                    maxLength={2000}
                  />
                  {replyError && <p className="mb-3 text-sm text-red-700" role="alert">{replyError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={addReplyMutation.isPending}>
                      {addReplyMutation.isPending ? "Posting..." : "Post Reply"}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : !user ? (
              <Card className="p-6 text-center">
                <p className="mb-4">Sign in to reply to this topic</p>
                <Button onClick={() => setLocation("/")}>Sign In</Button>
              </Card>
            ) : (
              <Card className="p-6 text-center bg-red-50">
                <p>This topic is locked and no new replies can be added.</p>
              </Card>
            )}
          </>
        ) : (
          <Card className="mx-auto max-w-xl p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Collectors Forum</p>
            <h1 className="mt-2 font-serif text-3xl">Topic not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">This discussion may have been removed or the link may be incomplete.</p>
            <Button variant="outline" onClick={() => setLocation("/forum")} className="mt-6">Browse forum topics</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
