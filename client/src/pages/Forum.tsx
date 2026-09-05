import { FormEvent, useState } from "react";
import { ImagePlus, MessageSquarePlus, Search, SlidersHorizontal, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

import { collectibleCategories } from "@/lib/constants";
import { forumCategoryLabels, getForumSubcategories, forumParentLevelSubcategory, forumParentLevelSubcategoryLabel } from "@shared/forum";

function parseForumTimestamp(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value < 100000000000 ? value * 1000 : value);
  const stringValue = String(value);
  const mysqlDateTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
  return new Date(mysqlDateTime.test(stringValue) ? `${stringValue.replace(" ", "T")}Z` : stringValue);
}
function formatForumLocalTimestamp(value: string | number | Date): string {
  return parseForumTimestamp(value).toLocaleString();
}

const forumCategoryTones: Record<string, { active: string; inactive: string }> = {
  general: { active: "border-2 border-slate-900 bg-slate-700 text-white", inactive: "border-2 border-slate-400 bg-slate-100 text-slate-900 hover:bg-slate-200" },
  comics: { active: "border-2 border-rose-900 bg-rose-700 text-white", inactive: "border-2 border-rose-400 bg-rose-100 text-rose-950 hover:bg-rose-200" },
  sports_cards: { active: "border-2 border-blue-900 bg-blue-700 text-white", inactive: "border-2 border-blue-500 bg-blue-200 text-blue-950 hover:bg-blue-300" },
  vintage_toys: { active: "border-2 border-orange-900 bg-orange-600 text-white", inactive: "border-2 border-orange-500 bg-orange-200 text-orange-950 hover:bg-orange-300" },
  video_games: { active: "border-2 border-emerald-900 bg-emerald-700 text-white", inactive: "border-2 border-emerald-500 bg-emerald-200 text-emerald-950 hover:bg-emerald-300" },
  stamps: { active: "border-2 border-violet-900 bg-violet-700 text-white", inactive: "border-2 border-violet-400 bg-violet-100 text-violet-950 hover:bg-violet-200" },
  coins: { active: "border-2 border-teal-900 bg-teal-700 text-white", inactive: "border-2 border-teal-500 bg-teal-200 text-teal-950 hover:bg-teal-300" },
  pokemon: { active: "border-2 border-yellow-700 bg-yellow-400 text-slate-950", inactive: "border-2 border-yellow-500 bg-yellow-200 text-yellow-950 hover:bg-yellow-300" },
  movies: { active: "border-2 border-red-900 bg-red-700 text-white", inactive: "border-2 border-red-400 bg-red-100 text-red-950 hover:bg-red-200" },
  autographs: { active: "border-2 border-orange-900 bg-orange-600 text-white", inactive: "border-2 border-orange-500 bg-orange-200 text-orange-950 hover:bg-orange-300" },
  disney_pins: { active: "border-2 border-cyan-900 bg-cyan-700 text-white", inactive: "border-2 border-cyan-500 bg-cyan-200 text-cyan-950 hover:bg-cyan-300" },
};

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
        <div className="mb-7 flex flex-col gap-4">
          <div className="max-w-2xl">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Collectors helping collectors</p>
            <h1 className="text-3xl font-serif font-medium tracking-tight">Forum Topics</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ask questions, share collecting knowledge, and exchange ideas across every category.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {user ? (
              <Button onClick={() => setShowNewTopicModal(true)} className="h-11 w-full gap-2 bg-[#0f766e] text-white shadow-sm hover:bg-[#115e59] sm:w-auto">
                <MessageSquarePlus className="h-4 w-4" /> Start a discussion
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to start a discussion.</p>
            )}
            <form onSubmit={submitDiscussionSearch} role="search" aria-label="Search forum discussions" className="flex w-full items-center gap-2 rounded-lg border border-border bg-white p-1.5 shadow-sm sm:max-w-md">
              <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="forum-topic-search" className="sr-only">Search discussions</label>
              <input id="forum-topic-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={120} placeholder="Search discussions" className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground" />
              {searchDraft || searchQuery ? <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={clearDiscussionSearch} aria-label="Clear discussion search"><X className="h-4 w-4" /></Button> : null}
              <Button type="submit" size="sm" className="h-9 shrink-0 bg-slate-800 px-3 text-white hover:bg-slate-700">Search</Button>
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
                className={`mr-2 rounded-md px-4 py-2 whitespace-nowrap text-sm font-medium transition ${selectedCategory === cat.id ? (forumCategoryTones[cat.id]?.active || "bg-slate-700 text-white") : (forumCategoryTones[cat.id]?.inactive || "bg-slate-100 text-slate-700 hover:bg-slate-200")}`}
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

        <section className="mb-5 flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between" aria-label="Forum topic filters">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Topic activity filters">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Show:</span>
            {["all", "unanswered", "recent"].map((filter) => <button key={filter} type="button" onClick={() => setActivityFilter(filter as typeof activityFilter)} aria-pressed={activityFilter === filter} className={`rounded-md px-3 py-1.5 text-sm ${activityFilter === filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{filter === "all" ? "All topics" : filter === "unanswered" ? "Unanswered" : "Recently active"}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort forum topics">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Sort:</span>
            {(["newest", "popular", "replies"] as const).map(sort => <button key={sort} type="button" onClick={() => setSortBy(sort)} aria-pressed={sortBy === sort} className={`rounded-md px-3 py-1.5 text-sm transition ${sortBy === sort ? "bg-slate-800 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{sort === "replies" ? "Most replies" : sort.charAt(0).toUpperCase() + sort.slice(1)}</button>)}
          </div>
        </section>

        {/* Topics List */}
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{posts?.length ?? 0} {posts?.length === 1 ? "topic" : "topics"} in this category</span>
          {!user && <span>Sign in to start a discussion.</span>}
        </div>
        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
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
                      <time dateTime={parseForumTimestamp(post.createdAt).toISOString()}>{formatForumLocalTimestamp(post.createdAt)}</time>
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

function getForumImageMimeType(file: File): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  const normalizedType = file.type.toLowerCase();
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(normalizedType)) return normalizedType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const extension = file.name.toLowerCase().split(".").pop();
  const byExtension: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
  const fallback = extension ? byExtension[extension] : undefined;
  if (!fallback) throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  return fallback;
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
          mimeType: getForumImageMimeType(file),
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
                className="w-full rounded-md border bg-white px-3 py-2"
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
                className="h-32 w-full rounded-md border bg-white px-3 py-2"
                maxLength={5000}
              />
            </div>

             <div>
               <label htmlFor="forum-topic-photos" className="mb-2 block text-sm font-medium">Insert an image (up to 6)</label>
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
                 className="sr-only"
               />
               <button type="button" onClick={() => document.getElementById("forum-topic-photos")?.click()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                 <ImagePlus className="h-4 w-4" aria-hidden="true" /> Insert image
               </button>
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
