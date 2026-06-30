import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

import { collectibleCategories } from "../../../drizzle/schema";

export function Forum() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "replies">("newest");
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);

  const forumCategories = [
    { id: "general", label: "General Discussion" },
    ...collectibleCategories.map((cat) => ({
      id: cat,
      label: cat.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    })),
  ];

  const { data: posts, isLoading } = trpc.market.getForumPosts.useQuery({
    category: selectedCategory,
    sortBy,
  });

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <CategoryBar />
      
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 text-center">
        <h1 className="text-4xl font-bold mb-2">Collector's Forum</h1>
        <p className="text-lg opacity-90">Join discussions with fellow collectors</p>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Forum Topics</h2>
          {user && (
            <Button onClick={() => setShowNewTopicModal(true)}>
              New Topic
            </Button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {forumCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 mb-6">
          {(["newest", "popular", "replies"] as const).map(sort => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-3 py-1 text-sm rounded transition ${
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
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading topics...</div>
          ) : posts && posts.length > 0 ? (
            posts.map(post => (
              <Card
                key={post.id}
                className="p-4 cursor-pointer hover:shadow-lg transition"
                onClick={() => setLocation(`/forum/${post.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.isPinned && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PINNED</span>}
                      {post.isSolved && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SOLVED</span>}
                      {post.isLocked && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">LOCKED</span>}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{post.title || "(Untitled)"}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      by {post.author?.name || "Anonymous"} • {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm line-clamp-2">{post.content}</p>
                  </div>
                  <div className="text-right ml-4">
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

function NewTopicModal({
  category,
  onClose,
  onSuccess,
}: {
  category: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const createPostMutation = trpc.market.createForumPost.useMutation();

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Please fill in all fields");
      return;
    }

    try {
      await createPostMutation.mutateAsync({
        category,
        title: title.trim(),
        content: content.trim(),
      });
      onSuccess();
    } catch (error) {
      alert("Failed to create topic");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">New Discussion Topic</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter topic title..."
                className="w-full px-3 py-2 border rounded-md"
                maxLength={255}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Enter your message..."
                className="w-full px-3 py-2 border rounded-md h-32"
                maxLength={5000}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createPostMutation.isPending}
              >
                {createPostMutation.isPending ? "Creating..." : "Create Topic"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
