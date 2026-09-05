import { FormEvent, useState } from "react";
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Collectors helping collectors</p>
            <h1 className="text-3xl font-serif font-medium tracking-tight">Forum Topics</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ask questions, share collecting knowledge, and exchange ideas across every category.</p>
          </div>
          {user && (
            <Button onClick={() => setShowNewTopicModal(true)} className="shrink-0">
              New Topic
            </Button>
          )}
        </div>

        {user && forumUpdates?.length ? (
          <div className="mb-6 rounded-lg border border-primary/25 bg-primary/5 p-4">
            <div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-semibold">Your topic updates</h2><span className="text-xs text-muted-foreground">{forumUpdates.filter((item) => !item.isRead).length} unread</span></div>
            <div className="space-y-2">{forumUpdates.slice(0, 4).map((item) => <button key={item.id} type="button" onClick={() => openForumUpdate(item.id, item.postId)} className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-background ${item.isRead ? "text-muted-foreground" : "bg-background font-medium"}`}>{item.replyAuthor} replied to “{item.postTitle || `Topic #${item.postId}`}”</button>)}</div>
          </div>
        ) : null}

        {/* Category Tabs */}
        <div className="mb-6 overflow-x-auto pb-2" role="tablist" aria-label="Forum categories">
          {forumCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedSubcategory(null);
              }}
              role="tab"
              aria-selected={selectedCategory === cat.id}
              className={`mr-2 rounded px-4 py-2 whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

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

        <div className="mb-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_auto]" aria-label="Find forum topics">
          <div>
            <label htmlFor="forum-topic-search" className="sr-only">Search forum topics</label>
            <input id="forum-topic-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} maxLength={120} placeholder="Search titles and discussions" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Topic activity filters">
            {(["all", "unanswered", "recent"] as const).map((filter) => <button key={filter} type="button" onClick={() => setActivityFilter(filter)} aria-pressed={activityFilter === filter} className={`rounded px-3 py-2 text-sm ${activityFilter === filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{filter === "all" ? "All topics" : filter === "unanswered" ? "Unanswered" : "Recently active"}</button>)}
          </div>
        </div>

        {/* Sort Options */}
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Sort forum topics">
          {(["newest", "popular", "replies"] as const).map(sort => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              aria-pressed={sortBy === sort}
              className={`rounded px-3 py-1 text-sm transition ${
                sortBy === sort
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>

        {/* Topics List */}
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{posts?.length ?? 0} {posts?.length === 1 ? "topic" : "topics"} in this category</span>
          {!user && <span>Sign in to start a discussion.</span>}
        </div>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading topics...</div>
          ) : posts && posts.length > 0 ? (
            posts.map(post => (
              <Card
                key={post.id}
                className="p-4 cursor-pointer hover:shadow-lg transition"
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <AuthorAvatar name={post.author?.name} avatarUrl={post.author?.avatarUrl} />
                    <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {!!post.isPinned && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PINNED</span>}
                      {!!post.isSolved && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SOLVED</span>}
                      {!!post.isLocked && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">LOCKED</span>}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{post.title || "(Untitled)"}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      by {post.author?.name || "Anonymous"} • {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm line-clamp-2">{post.content}</p>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <div className="text-2xl font-bold text-primary">{post.replyCount}</div>
                    <div className="text-xs text-muted-foreground">replies</div>
                    <div className="text-xs text-muted-foreground mt-2">{post.viewCount} views</div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No topics yet. Be the first to start a discussion!
            </div>
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
      setFormError(error instanceof Error ? error.message : "Failed to create topic. Please try again.");
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
