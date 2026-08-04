import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

export function ForumTopic() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/forum/:postId");
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");

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

  const handleAddReply = async () => {
    if (!replyContent.trim()) {
      alert("Please enter a reply");
      return;
    }

    try {
      await addReplyMutation.mutateAsync({
        postId,
        content: replyContent.trim(),
      });
      setReplyContent("");
      // Refresh replies
    } catch (error) {
      alert("Failed to add reply");
    }
  };

  if (!match) return null;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      {/* Hero Section */}
      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(/manus-storage/Mainpage_d3f8b6f0.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-4xl items-center justify-center -ml-32">
            <img
              src="/images/forum-title.svg"
              alt="Collector's Forum"
              className="h-auto w-full max-h-[300px]"
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
            <Card className="p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{post.title || "(Untitled)"}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{post.author?.name || "Anonymous"}</span>
                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                    <span>{post.viewCount} views</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!!post.isPinned && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PINNED</span>}
                  {!!post.isSolved && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SOLVED</span>}
                  {!!post.isLocked && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">LOCKED</span>}
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                <p>{post.content}</p>
              </div>
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
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {reply.author?.avatarUrl ? (
                          <img
                              src={reply.author?.avatarUrl || ""}
                              alt={reply.author?.name || "User"}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold">{reply.author?.name?.charAt(0) || "?"}</span>
                          )}
                        </div>
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
                <h3 className="text-lg font-semibold mb-4">Add Your Reply</h3>
                <textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Enter your reply..."
                  className="w-full px-3 py-2 border rounded-md h-24 mb-4"
                  maxLength={2000}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleAddReply}
                    disabled={addReplyMutation.isPending}
                  >
                    {addReplyMutation.isPending ? "Posting..." : "Post Reply"}
                  </Button>
                </div>
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
          <div className="text-center py-8">Topic not found</div>
        )}
      </div>
    </div>
  );
}
