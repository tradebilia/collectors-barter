import { FormEvent, useState } from "react";
import { MessageSquarePlus, Search, SlidersHorizontal, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

import { collectibleCategories } from "@/lib/constants";
import { forumCategoryLabels, getForumSubcategories, forumParentLevelSubcategory, forumParentLevelSubcategoryLabel } from "@shared/forum";

export function Forum() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "replies">("newest");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "unanswered" | "recent">("all");
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const utils = trpc.useUtils();

  const forumCategories = [
    { id: "general", label: forumCategoryLabels.general },
    ...collectibleCategories.map((cat) => ({ id: cat, label: forumCategoryLabels[cat] || cat })),
  ];
  const activeSubcategories = getForumSubcategories(selectedCategory);

  const { data: posts, isLoading } = trpc.market.getForumPosts.useQuery({
    category: selectedCategory,
    subcategory: selectedSubcategory,
    searchQuery: searchQuery.trim() || undefined,
    activityFilter,
    sortBy,
  });
  const { data: forumUpdates } = trpc.market.getMyForumNotifications.useQuery(undefined, { enabled: Boolean(user) });
  const markForumNotificationRead = trpc.market.markForumNotificationRead.useMutation();

  const openForumUpdate = async (notificationId: number, postId: number) => {
    await markForumNotificationRead.mutateAsync({ notificationId });
    await utils.market.getMyForumNotifications.invalidate();
    setLocation(`/forum/${postId}`);
  };

  const submitDiscussionSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchDraft.trim());
  };

  const clearDiscussionSearch = () => {
    setSearchDraft("");
    setSearchQuery("");
  };

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
        <div className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,28rem)] lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Collectors helping collectors</p>
            <h1 className="text-3xl font-serif font-medium tracking-tight">Forum Topics</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ask questions, share collecting knowledge, and exchange ideas across every category.</p>
          </div>
          <div className="flex flex-col gap-3">
            {user ? (
              <Button onClick={() => setShowNewTopicModal(true)} className="h-11 w-full gap-2 bg-primary text-primary-foreground shadow-sm sm:w-auto sm:self-end">
                <MessageSquarePlus className="h-4 w-4" /> Start a discussion
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground lg:text-right">Sign in to start a discussion.</p>
            )}
            <form onSubmit={submitDiscussionSearch} role="search" aria-label="Search forum discussions" className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5 shadow-sm">
              <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="forum-topic-search" className="sr-only">Search discussions</label>
              <input id="forum-topic-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={120} placeholder="Search discussions" className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground" />
              {searchDraft || searchQuery ? <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={clearDiscussionSearch} aria-label="Clear discussion search"><X className="h-4 w-4" /></Button> : null}
              <Button type="submit" size="sm" className="h-9 shrink-0 px-3">Search</Button>
            </form>
          </div>
        </div>

        {user && forumUpdates?.length ? (
          <div className="mb-6 rounded-lg border border-primary/25 bg-primary/5 p-4">
            <div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-semibold">Your topic updates</h2><span className="text-xs text-muted-foreground">{forumUpdates.filter((item) => !item.isRead).length} unread</span></div>
            <div className="space-y-2">{forumUpdates.slice(0, 4).map((item) => <button key={item.id} type="button" onClick={() => openForumUpdate(item.id, item.postId)} className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-background ${item.isRead ? "text-muted-foreground" : "bg-background font-medium"}`}>{item.replyAuthor} replied to “{item.postTitle || `Topic #${item.postId}`}”</button>)}</div>
          </div>
        ) : null}

        <section className="mb-6" aria-labelledby="forum-community-navigation">
          <div className="mb-3 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" /><h2 id="forum-community-navigation" className="text-sm font-semibold">Browse collector communities</h2></div>
          <div className="overflow-x-auto pb-2" role="tablist" aria-label="Forum categories">
            {forumCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSubcategory(null);
                }}
                role="tab"
                aria-selected={selectedCategory === cat.id}
                className={`mr-2 rounded-md px-4 py-2 whitespace-nowrap text-sm transition ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {activeSubcategories.length > 0 && (
          <div className="mb-6 rounded-lg border bg-card p-4" aria-label="Forum item types">
            <div className="mb-3 text-sm font-semibold">Browse {forumCategoryLabels[selectedCategory]} by item type</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedSubcategory(null)} className={`rounded px-3 py-1.5 text-sm ${selectedSubcategory === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>All {forumCategoryLabels[selectedCategory]}</button>
              {activeSubcategories.map((sub) => (
                <button key={sub.value} type="button" onClick={() => setSelectedSubcategory(sub.value)} className={`rounded px-3 py-1.5 text-sm ${selectedSubcategory === sub.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <section className="mb-5 border-y border-border py-4" aria-labelledby="forum-feed-controls">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 id="forum-feed-controls" className="font-semibold">Discussion feed</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Choose how the current community’s topics are shown.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort forum topics">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Sort:</span>
              {(["newest", "popular", "replies"] as const).map(sort => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  aria-pressed={sortBy === sort}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    sortBy === sort
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {sort === "replies" ? "Most replies" : sort.charAt(0).toUpperCase() + sort.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Topic activity filters">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Show:</span>
            {(["all", "unanswered", "recent"] as const).map((filter) => <button key={filter} type="button" onClick={() => setActivityFilter(filter)} aria-pressed={activityFilter === filter} className={`rounded-md px-3 py-1.5 text-sm ${activityFilter === filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{filter === "all" ? "All topics" : filter === "unanswered" ? "Unanswered" : "Recently active"}</button>)}
          </div>
        </section>

        {/* Topics List */}
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{posts?.length ?? 0} {posts?.length === 1 ? "topic" : "topics"} in this category</span>
          {!user && <span>Sign in to start a discussion.</span>}
        </div>
        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading topics...</div>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => (
              <article
                key={post.id}
                className="group border-b border-border/70 px-4 py-4 last:border-b-0 sm:px-5"
                onClick={() => setLocation(`/forum/${post.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setLocation(`/forum/${post.id}`);
                  }
                }}
                role="link"
                tabIndex={0}
                aria-label={`Open topic ${post.title || "Untitled"}`}
              >
                <div className="flex items-start gap-3">
                  <AuthorAvatar name={post.author?.name} avatarUrl={post.author?.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{post.author?.name || "Anonymous"}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleDateString()}</time>
                      {post.subcategory && <><span aria-hidden="true">·</span><span>{post.subcategory}</span></>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {!!post.isPinned && <span className="rounded bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">Pinned</span>}
                      {!!post.isSolved && <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">Solved</span>}
                      {!!post.isLocked && <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">Locked</span>}
                    </div>
                    <h3 className="mt-1 text-base font-semibold leading-6 text-foreground group-hover:text-primary sm:text-lg">{post.title || "(Untitled)"}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{post.content}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}</span>
                      <span>{post.viewCount} views</span>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No topics yet. Be the first to start a discussion!</div>
          )}
        </div>
      </div>

      {/* New Topic Modal */}
      {showNewTopicModal && user && (
        <NewTopicModal
          category={selectedCategory}
          subcategory={selectedSubcategory}
          onClose={() => setShowNewTopicModal(false)}
          onSuccess={() => {
            setShowNewTopicModal(false);
            // Refresh posts
          }}
        />
      )}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

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

function NewTopicModal({
  category,
  subcategory,
  onClose,
  onSuccess,
}: {
  category: string;
  subcategory: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const utils = trpc.useUtils();
  const createPostMutation = trpc.market.createForumPost.useMutation();
  const uploadPhotoMutation = trpc.market.uploadForumPostImage.useMutation();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!title.trim() || !content.trim()) {
      setFormError("Add a title and message before creating the topic.");
      return;
    }

    try {
      const created = await createPostMutation.mutateAsync({
        category,
        subcategory,
        title: title.trim(),
        content: content.trim(),
      });
      for (const [index, file] of photos.entries()) {
        const dataUrl = await readFileAsDataUrl(file);
        await uploadPhotoMutation.mutateAsync({
          postId: created.postId,
          fileName: file.name,
          mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          dataBase64: dataUrl,
          sortOrder: index,
        });
      }
      await utils.market.getForumPosts.invalidate();
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isUnexpectedServerError = /failed query|forumposts|database|foreign key/i.test(message);
      setFormError(isUnexpectedServerError
        ? "We could not create this topic right now. Please refresh the page and try again."
        : message || "Failed to create topic. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="new-topic-title">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Start a conversation</p>
              <h2 id="new-topic-title" className="mt-1 text-2xl font-bold">New Discussion Topic</h2>
            </div>
            <Button type="button" variant="ghost" onClick={onClose} aria-label="Close new topic dialog">Close</Button>
          </div>
          
          <div className="space-y-4">
            <div>
                <label htmlFor="forum-topic-title" className="mb-2 block text-sm font-medium">Title</label>
              <input
                type="text"
                id="forum-topic-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter topic title..."
                className="w-full px-3 py-2 border rounded-md"
                maxLength={255}
              />
            </div>

                         <div>
                 <label htmlFor="forum-topic-content" className="mb-2 block text-sm font-medium">Message</label>
              <textarea
                id="forum-topic-content"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Enter your message..."
                className="w-full px-3 py-2 border rounded-md h-32"
                maxLength={5000}
              />
            </div>

             <div>
               <label htmlFor="forum-topic-photos" className="mb-2 block text-sm font-medium">Photos (up to 6)</label>
               <input
                 id="forum-topic-photos"
                 type="file"
                 accept="image/jpeg,image/png,image/webp,image/gif"
                 multiple
                 onChange={(event) => {
                   const selected = Array.from(event.target.files || []).filter((file) => file.size <= 6 * 1024 * 1024).slice(0, 6);
                   setPhotos(selected);
                   if (selected.length !== (event.target.files?.length || 0)) setFormError("Choose up to 6 image files, each 6 MB or smaller.");
                 }}
                 className="w-full rounded-md border px-3 py-2 text-sm"
               />
               {photos.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{photos.length} photo{photos.length === 1 ? "" : "s"} ready to upload.</p>}
             </div>

             {formError && <p className="text-sm text-red-700" role="alert">{formError}</p>}

             <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPostMutation.isPending}>
                {createPostMutation.isPending ? "Creating..." : "Create Topic"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
