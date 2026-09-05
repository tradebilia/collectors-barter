import { FormEvent, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { FileText, ImagePlus, Video, X } from "lucide-react";
import { forumSubcategoryLabels } from "@shared/forum";

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

function readForumFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

export function ForumTopic() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/forum/:postId");
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replyListingId, setReplyListingId] = useState("");
  const [replyPhotos, setReplyPhotos] = useState<File[]>([]);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [replyParentName, setReplyParentName] = useState<string | null>(null);
  const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [reportDetails, setReportDetails] = useState("");
  const [topicError, setTopicError] = useState("");
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
  const uploadReplyPhotoMutation = trpc.market.uploadForumReplyImage.useMutation();
  const updatePostMutation = trpc.market.updateForumPost.useMutation();
  const deletePostMutation = trpc.market.deleteForumPost.useMutation();
  const reportPostMutation = trpc.market.createForumReport.useMutation();
  const followPostMutation = trpc.market.toggleForumFollow.useMutation();
  const moderatePostMutation = trpc.market.moderateForumPost.useMutation();
  const { data: isFollowing } = trpc.market.isFollowingForumPost.useQuery({ postId }, { enabled: Boolean(user && postId) });
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

  const handleReportPost = async (event: FormEvent) => {
    event.preventDefault();
    setTopicError("");
    try {
      await reportPostMutation.mutateAsync({ postId, reason: reportReason, details: reportDetails.trim() || undefined });
      setReportDetails("");
      setShowReportForm(false);
    } catch (error) {
      setTopicError(error instanceof Error ? error.message : "Could not submit the report.");
    }
  };

  const handleToggleFollow = async () => {
    setTopicError("");
    try {
      await followPostMutation.mutateAsync({ postId });
      await utils.market.isFollowingForumPost.invalidate({ postId });
    } catch (error) {
      setTopicError(error instanceof Error ? error.message : "Could not update topic follow status.");
    }
  };

  const handleModerate = async (action: "remove" | "restore" | "pin" | "unpin") => {
    setTopicError("");
    try {
      await moderatePostMutation.mutateAsync({ postId, action, reason: action === "remove" ? "Removed by administrator moderation." : undefined });
      await Promise.all([utils.market.getForumPostDetail.invalidate({ postId }), utils.market.getForumPosts.invalidate()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setTopicError(/failed query|forumposts|database|unknown column/i.test(message)
        ? "Could not update this post right now. Please refresh and try again."
        : message || "Could not update moderation status.");
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

  const beginReplyTo = (replyId: number, authorName: string) => {
    setReplyParentId(replyId);
    setReplyParentName(authorName);
    setReplyError("");
    setIsReplyComposerOpen(true);
    window.requestAnimationFrame(() => document.getElementById(`forum-reply-content-${replyId}`)?.focus());
  };

  const beginReplyToTopic = () => {
    setReplyParentId(null);
    setReplyParentName(null);
    setReplyError("");
    setIsReplyComposerOpen(true);
    window.requestAnimationFrame(() => document.getElementById("forum-reply-content-topic")?.focus());
  };

  const clearReplyTarget = () => {
    setReplyParentId(null);
    setReplyParentName(null);
    setIsReplyComposerOpen(false);
  };

  const handleAddReply = async (event: FormEvent) => {
    event.preventDefault();
    setReplyError("");
    if (!replyContent.trim()) {
      setReplyError("Write a reply before posting.");
      return;
    }

    try {
      const created = await addReplyMutation.mutateAsync({
        postId,
        listingId: replyListingId.trim() ? Number(replyListingId) : undefined,
        parentReplyId: replyParentId ?? undefined,
        content: replyContent.trim(),
      });
      for (const [index, file] of replyPhotos.entries()) {
        const dataUrl = await readForumFileAsDataUrl(file);
        await uploadReplyPhotoMutation.mutateAsync({ replyId: created.replyId, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "video/mp4", dataBase64: dataUrl, sortOrder: index });
      }
      setReplyContent("");
      setReplyListingId("");
      setReplyPhotos([]);
      clearReplyTarget();
      await Promise.all([
        utils.market.getForumPostDetail.invalidate({ postId }),
        utils.market.getForumReplies.invalidate({ postId }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setReplyError(/failed query|unknown column|forumrepl(?:y|ies)|database/i.test(message)
        ? "Could not post your reply right now. Please refresh and try again."
        : message || "Failed to add reply. Please try again.");
    }
  };

  const renderInlineReplyComposer = (targetKey: string) => {
    const isTopicTarget = targetKey === "topic";
    const isTargetOpen = isReplyComposerOpen && (isTopicTarget ? replyParentId === null : replyParentId === Number(targetKey));
    if (!post || !isTargetOpen || !user || post.isLocked) return null;
    const composerId = `forum-reply-content-${targetKey}`;
    const mediaInputId = `forum-reply-media-${targetKey}`;
    const videoInputId = `forum-reply-video-${targetKey}`;
    const insertFormatting = () => setReplyContent((current) => `${current}${current ? " " : ""}**bold text**`);
    return (
      <form onSubmit={handleAddReply} className="mt-3 rounded-xl border border-border bg-muted/25 p-3 shadow-sm">
        <div className="mb-2 text-sm text-muted-foreground">Replying to <strong className="text-foreground">{isTopicTarget ? post.author?.name || "the topic" : replyParentName || "this member"}</strong></div>
        <label htmlFor={composerId} className="sr-only">Your reply</label>
        <textarea id={composerId} value={replyContent} onChange={(event) => setReplyContent(event.target.value)} placeholder="Write a reply..." className="min-h-20 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm" maxLength={2000} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <label htmlFor="forum-reply-listing" className="sr-only">Optional Tradebilia item number</label>
            <input id="forum-reply-listing" inputMode="numeric" value={replyListingId} onChange={(event) => setReplyListingId(event.target.value.replace(/\D/g, ""))} placeholder="Item # (optional)" className="h-8 w-32 rounded-md border bg-background px-2 text-xs" />
            <input id={mediaInputId} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(event) => { const selected = Array.from(event.target.files || []).filter((file) => file.size <= 10 * 1024 * 1024).slice(0, 6); setReplyPhotos((current) => [...current.filter((file) => file.type === "video/mp4"), ...selected].slice(0, 6)); if (selected.length !== (event.target.files?.length || 0)) setReplyError("Choose up to 6 image or GIF files, each 10 MB or smaller."); }} />
            <input id={videoInputId} type="file" accept="video/mp4" className="sr-only" onChange={(event) => { const selected = Array.from(event.target.files || []).filter((file) => file.size <= 10 * 1024 * 1024).slice(0, 1); setReplyPhotos((current) => [...current.filter((file) => file.type !== "video/mp4"), ...selected].slice(0, 6)); if (selected.length !== (event.target.files?.length || 0)) setReplyError("Choose one MP4 video up to 10 MB."); }} />
            <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => document.getElementById(mediaInputId)?.click()}><ImagePlus className="h-4 w-4" aria-hidden="true" /> Photos / GIF</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => document.getElementById(videoInputId)?.click()}><Video className="h-4 w-4" aria-hidden="true" /> Video</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground" onClick={insertFormatting}><FileText className="h-4 w-4" aria-hidden="true" /> Format</button>
            {replyPhotos.length > 0 && <span className="text-xs text-muted-foreground">{replyPhotos.length} attached</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={clearReplyTarget}><X className="mr-1 h-4 w-4" aria-hidden="true" />Cancel</Button>
            <Button type="submit" size="sm" disabled={addReplyMutation.isPending}>{addReplyMutation.isPending ? "Posting..." : "Reply"}</Button>
          </div>
        </div>
        {replyError && <p className="mt-2 text-sm text-red-700" role="alert">{replyError}</p>}
      </form>
    );
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
              {topicError && <p className="mb-4 text-sm text-red-700" role="alert">{topicError}</p>}
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

                  {post.subcategory && <span className="mb-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{forumSubcategoryLabels[post.subcategory] || post.subcategory}</span>}
                  {post.status === "removed" ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">This post was removed by moderation.</div>
                  ) : (
                    <>
                      <div className="prose prose-sm max-w-none"><p>{post.content}</p></div>
                      {post.attachments?.length > 0 && (
                        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Post photos">
                          {post.attachments.map((photo) => <img key={photo.id} src={photo.imageUrl} alt={photo.altText || "Forum post photo"} className="aspect-square w-full rounded-lg border object-cover" />)}
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
                    {user && !post.isLocked && <Button type="button" variant="outline" onClick={beginReplyToTopic}>Reply</Button>}
                    {user && <Button type="button" variant="outline" onClick={handleToggleFollow}>{followPostMutation.isPending ? "Saving..." : isFollowing ? "Following topic" : "Follow topic"}</Button>}
                    {user && !isPostOwner && <Button type="button" variant="outline" onClick={() => setShowReportForm((current) => !current)}>Report post</Button>}
                    {user?.role === "admin" && <>
                      <Button type="button" variant="outline" onClick={() => handleModerate(post.status === "removed" ? "restore" : "remove")}>{post.status === "removed" ? "Restore post" : "Remove post"}</Button>
                      <Button type="button" variant="outline" onClick={() => handleModerate(post.isPinned ? "unpin" : "pin")}>{post.isPinned ? "Unpin announcement" : "Pin announcement"}</Button>
                    </>}
                  </div>
                  {showReportForm && <form onSubmit={handleReportPost} className="mt-4 rounded-md border bg-muted/30 p-4">
                    <label htmlFor="forum-report-reason" className="mb-2 block text-sm font-medium">Why are you reporting this post?</label>
                    <select id="forum-report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mb-3 w-full rounded-md border px-3 py-2 text-sm"><option value="inappropriate">Inappropriate content</option><option value="spam">Spam or promotion</option><option value="harassment">Harassment</option><option value="misinformation">Misleading information</option></select>
                    <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Optional details" maxLength={2000} className="mb-3 h-20 w-full rounded-md border px-3 py-2 text-sm" />
                    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowReportForm(false)}>Cancel</Button><Button type="submit" disabled={reportPostMutation.isPending}>{reportPostMutation.isPending ? "Sending..." : "Send report"}</Button></div>
                  </form>}

                  {renderInlineReplyComposer("topic")}

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
                <div className="mb-8 divide-y divide-border/70 border-y border-border/70">
                  {replies.map(reply => (
                    <article key={reply.id} className={`py-4 ${reply.parentReplyId ? "ml-6 border-l-2 border-l-primary/30 pl-4 sm:ml-10" : ""}`}>
                      <div className="flex items-start gap-3">
                        <AuthorAvatar name={reply.author?.name} avatarUrl={reply.author?.avatarUrl} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <h3 className="font-semibold text-foreground">{reply.author?.name || "Anonymous"}</h3>
                            <span aria-hidden="true">·</span>
                            <time dateTime={new Date(reply.createdAt).toISOString()}>{new Date(reply.createdAt).toLocaleString()}</time>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{reply.content}</p>
                          {reply.listingId && <button type="button" className="mt-2 text-xs font-semibold text-primary underline" onClick={() => setLocation(`/listings/${reply.listingId}`)}>View linked item #{reply.listingId}</button>}
                          {reply.attachments?.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{reply.attachments.map((media) => media.mimeType === "video/mp4" ? <video key={media.id} src={media.imageUrl} controls preload="metadata" className="aspect-video w-full rounded-md border bg-black" aria-label={media.altText || "Forum reply video"} /> : <img key={media.id} src={media.imageUrl} alt={media.altText || "Forum reply photo"} className="aspect-square w-full rounded-md border object-cover" />)}</div>}
                          {user && !post.isLocked && <button type="button" className="mt-3 inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-primary" onClick={() => beginReplyTo(reply.id, reply.author?.name || "this member")}>Reply</button>}
                          {renderInlineReplyComposer(String(reply.id))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground mb-8">
                  No replies yet. Be the first to respond!
                </div>
              )}
            </div>

            {!user ? (
              <Card className="p-6 text-center">
                <p className="mb-4">Sign in to reply to this topic</p>
                <Button onClick={() => setLocation("/")}>Sign In</Button>
              </Card>
            ) : post.isLocked ? (
              <Card className="p-6 text-center bg-red-50">
                <p>This topic is locked and no new replies can be added.</p>
              </Card>
            ) : null}
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
