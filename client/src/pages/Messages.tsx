import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLoginUrl } from "@/const";
import { loadPresenceMap, subscribeToPresence, updatePresence } from "@/lib/memberMessaging";
import { trpc } from "@/lib/trpc";
import { TRADEBILIA_LOGO_URL, tradebiliaCategories } from "@/lib/tradebilia";
import { ArrowRightLeft, Loader2, MailOpen, MessageSquareText, Send, ShieldCheck, UsersRound } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const folders = [
  { value: "all", label: "All Messages" },
  { value: "inquiries", label: "Item Inquiries" },
  { value: "direct", label: "Direct Messages" },
  { value: "unread", label: "Unread" },
  { value: "deleted", label: "Deleted" },
  // Trade-related folders removed per Decision 2 — trade activity is now in the Trade Hub
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "TB";
}

export default function Messages() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [folder, setFolder] = useState<(typeof folders)[number]["value"]>("all");
  const [activeThreadKey, setActiveThreadKey] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [directThreads, setDirectThreads] = useState<any[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<number, { displayName: string; updatedAt: number }>>({});

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const inquiriesQuery = trpc.market.getInquiries.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated }
  );

  const dbDirectThreadsQuery = trpc.market.getDirectMessageThreads.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 15000 });
  const activeDbThreadId = activeThreadKey?.startsWith('dbdirect-') ? Number(activeThreadKey.replace('dbdirect-', '')) : null;
  const dbMessagesQuery = trpc.market.getDirectMessages.useQuery(
    { threadId: activeDbThreadId ?? 0 },
    { enabled: isAuthenticated && !!activeDbThreadId, refetchInterval: 10000 }
  );
  const replyDirectMutation = trpc.market.replyDirectMessage.useMutation({
    onSuccess: async () => {
      setMessageDraft("");
      await utils.market.getDirectMessages.invalidate();
      await utils.market.getDirectMessageThreads.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const deleteDirectThreadMutation = trpc.market.deleteDirectThread.useMutation({
    onSuccess: async () => {
      setActiveThreadKey(null);
      await utils.market.getDirectMessageThreads.invalidate();
      toast.success('Conversation deleted');
    },
    onError: error => toast.error(error.message),
  });

  const sendTradeMessageMutation = trpc.market.sendTradeMessage.useMutation({
    onSuccess: async () => {
      setMessageDraft("");
      await utils.market.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const sendReplyMutation = trpc.market.sendReply.useMutation({
    onSuccess: async () => {
      setMessageDraft("");
      await utils.market.getReplies.invalidate();
      await utils.market.getInquiries.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const deletedInquiriesQuery = trpc.market.getDeleted.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const deleteInquiryMutation = trpc.market.deleteInquiry.useMutation({
    onSuccess: async () => {
      await utils.market.getInquiries.invalidate();
      await utils.market.getDeleted.invalidate();
      setActiveThreadKey(null);
    },
    onError: error => toast.error(error.message),
  });

  const emptyDeletedMutation = trpc.market.emptyDeleted.useMutation({
    onSuccess: async () => {
      await utils.market.getDeleted.invalidate();
      setActiveThreadKey(null);
      toast.success("Deleted folder emptied");
    },
    onError: error => toast.error(error.message),
  });


  // Sync DB direct threads into state
  useEffect(() => {
    if (dbDirectThreadsQuery.data) {
      setDirectThreads(dbDirectThreadsQuery.data);
    }
  }, [dbDirectThreadsQuery.data]);

  useEffect(() => {
    if (!user?.id) return;
    const presenceName = user.name ?? "Tradebilia Member";
    updatePresence(user.id, presenceName);
    const heartbeat = window.setInterval(() => updatePresence(user.id, presenceName), 5000);
    setPresenceMap(loadPresenceMap());
    const unsubscribe = subscribeToPresence(() => setPresenceMap(loadPresenceMap()));
    return () => {
      window.clearInterval(heartbeat);
      unsubscribe();
    };
  }, [user?.id, user?.name]);

  const proposals = useMemo(() => {
    const rows = dashboardQuery.data?.tradeProposals ?? [];
    return [...rows].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [dashboardQuery.data?.tradeProposals]);

  const inquiries = useMemo(() => {
    const rows = inquiriesQuery.data ?? [];
    return [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [inquiriesQuery.data]);

  const allThreads = useMemo(() => {
    const tradeThreads = proposals
      .filter(proposal => proposal.counterpart)
      .map(proposal => {
        const latestMessage = proposal.messages?.at(-1) as any;
        return {
          key: `trade-${proposal.id}`,
          kind: "trade" as const,
          updatedAt: proposal.updatedAt,
          unread: Boolean(latestMessage && latestMessage?.senderId !== user?.id),
          accepted: ["accepted", "completed"].includes(proposal.status),
          counterpartId: proposal.counterpart!.userId,
          counterpartName: proposal.counterpart!.displayName,
          counterpartAvatarUrl: proposal.counterpart!.avatarUrl ?? null,
          summary: latestMessage?.message ?? proposal.note ?? "No message yet.",
          proposal,
        };
      });

    const direct = directThreads.map((thread: any) => ({
      key: `dbdirect-${thread.threadId}`,
      kind: "direct" as const,
      updatedAt: new Date(thread.lastMessageAt).getTime(),
      unread: Number(thread.unreadCount) > 0,
      accepted: false,
      counterpartId: Number(thread.counterpartId),
      counterpartName: thread.counterpartName || `Collector ${thread.counterpartId}`,
      counterpartAvatarUrl: thread.counterpartAvatarUrl ?? null,
      summary: thread.latestBody ?? "Direct collector conversation",
      subject: thread.latestSubject ?? "",
      threadId: thread.threadId,
    }));

    return [...tradeThreads, ...direct].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [directThreads, proposals, user?.id]);

  const filteredThreads = useMemo(() => {
    if (folder === "inquiries") return [];
    return allThreads.filter((thread: any) => {
      if (folder === "direct") return thread.kind === "direct";
      if (folder === "unread") return thread.unread;
      return true;
    });
  }, [allThreads, folder]);

  const filteredInquiries = useMemo(() => {
    if (folder === "deleted") return deletedInquiriesQuery.data ?? [];
    if (folder === "inquiries") return inquiries;
    if (folder === "unread") return inquiries.filter(i => !i.isRead);
    if (folder === "all") return inquiries.filter(i => !i.deletedAt);
    return [];
  }, [inquiries, folder, deletedInquiriesQuery.data]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const directParam = params.get("direct");
    if (directParam) {
      const counterpartId = Number(directParam);
      // Find the DB thread for this counterpart
      const matchingThread = filteredThreads.find(
        (t: any) => t.kind === "direct" && t.counterpartId === counterpartId
      );
      if (matchingThread) {
        setActiveThreadKey(matchingThread.key);
      }
      // If no thread yet (first message just sent), it will appear after refetch
      return;
    }
    if (!filteredThreads.length && !filteredInquiries.length) {
      setActiveThreadKey(null);
      return;
    }
  }, [filteredThreads, filteredInquiries]);


  const activeThread = filteredThreads.find(thread => thread.key === activeThreadKey) ?? null;
  const activeInquiry = activeThreadKey?.startsWith('inquiry-') ? filteredInquiries.find(i => `inquiry-${i.id}` === activeThreadKey) : null;
  const activePresence = activeThread ? presenceMap[activeThread.counterpartId] : null;
  const activeOnline = activePresence ? Date.now() - activePresence.updatedAt < 15000 : false;

  const repliesQuery = trpc.market.getReplies.useQuery(
    { inquiryId: activeInquiry?.id ?? 0 },
    { enabled: isAuthenticated && !!activeInquiry }
  );


  const markInquiryAsReadMutation = trpc.market.markInquiryAsRead.useMutation({
    onSuccess: async () => {
      await utils.market.getInquiries.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (activeInquiry && !activeInquiry.isRead) {
      markInquiryAsReadMutation.mutate({ inquiryId: activeInquiry.id });
    }
  }, [activeInquiry?.id]);


  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to open your Tradebilia messages.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Subscriber accounts unlock direct collector conversations, proposal-thread audit comments, contact sharing after acceptance, and browser-based live presence updates.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>Subscriber Sign In</Button>
        </div>
      </div>
    );
  }

  const sendActiveMessage = () => {
    if (!activeThread || !user?.id) return;
    const trimmed = messageDraft.trim();
    if (!trimmed) return;

    if (activeThread.kind === "direct") {
      replyDirectMutation.mutate({ threadId: (activeThread as any).threadId, body: trimmed });
      return;
    }

    sendTradeMessageMutation.mutate({ proposalId: activeThread.proposal.id, message: trimmed });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a0d22_0%,#121c48_26%,#ede3d3_26%,#ede3d3_100%)] text-slate-950">
      <TopBar />
      <header className="border-b border-white/10 bg-[#00143A] text-white" style={{
        backgroundImage: 'url(/manus-storage/Background_48b923f1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="absolute inset-0 pointer-events-none" />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-4xl items-center justify-center">
            <img src="/manus-storage/Messages_2225db58.svg" alt="Messages" className="h-auto w-full" />
          </div>
        </div>
      </header>
      <CategoryBar />

      <main className="container py-8 lg:py-10">
        <div className="grid gap-6 xl:grid-cols-[240px_340px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-300/70 bg-white/82 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Messages</h2>
            <div className="mt-5 space-y-2">
              {folders.map(item => {
                const count = item.value === "all"
                  ? allThreads.length + inquiries.filter(i => !i.deletedAt).length
                  : item.value === "inquiries"
                    ? inquiries.length
                    : item.value === "direct"
                      ? allThreads.filter(thread => thread.kind === "direct").length
                      : item.value === "unread"
                        ? allThreads.filter(thread => thread.unread).length + inquiries.filter(i => !i.isRead).length
                        : item.value === "deleted"
                          ? (deletedInquiriesQuery.data ?? []).length
                          : allThreads.length;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFolder(item.value)}
                    className={`flex w-full items-center justify-between rounded-[1.25rem] border px-4 py-3 text-left transition ${folder === item.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-sm">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              Direct messages update live across open browser sessions using browser events, while Trade Proposal comments remain available in the same workspace for context.
            </div>
          </aside>

          <section className="rounded-[2rem] border border-slate-300/70 bg-white/82 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-2xl font-semibold text-slate-900">Message List</h2>
            </div>
            <ScrollArea className="h-[70vh] px-3 py-3">
              {dashboardQuery.isLoading || inquiriesQuery.isLoading ? (
                <div className="flex min-h-[18rem] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                </div>
              ) : (filteredThreads.length || filteredInquiries.length) ? (
                <div className="space-y-3">
                  {filteredInquiries.map(inquiry => (
                    <button
                      key={`inquiry-${inquiry.id}`}
                      type="button"
                      onClick={() => setActiveThreadKey(`inquiry-${inquiry.id}`)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${activeThreadKey === `inquiry-${inquiry.id}` ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-semibold">{inquiry.senderName || `Collector ${inquiry.senderId}`}</p>
                          <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${activeThreadKey === `inquiry-${inquiry.id}` ? "text-white/65" : "text-slate-500"}`}>
                            Item Inquiry
                          </p>
                        </div>
                        <Badge 
                          variant={activeThreadKey === `inquiry-${inquiry.id}` ? "secondary" : "outline"} 
                          className={`rounded-full capitalize ${
                            inquiry.isRead 
                              ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                              : "bg-yellow-400 text-slate-900 hover:bg-yellow-500"
                          }`}
                        >
                          {inquiry.isRead ? "seen" : "unread"}
                        </Badge>
                      </div>
                      <p className={`mt-3 line-clamp-2 text-sm leading-6 ${activeThreadKey === `inquiry-${inquiry.id}` ? "text-white/75" : "text-slate-600"}`}>{inquiry.subject}</p>
                      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em]">
                        <span>{new Date(inquiry.createdAt).toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                  {filteredThreads.map(thread => (
                    <button
                      key={thread.key}
                      type="button"
                      onClick={() => setActiveThreadKey(thread.key)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${thread.key === activeThreadKey ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-semibold">{thread.counterpartName}</p>
                          <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${thread.key === activeThreadKey ? "text-white/65" : "text-slate-500"}`}>
                            {thread.kind === "direct" ? "Direct collector message" : `Trade Proposal #${thread.proposal.id}`}
                          </p>
                        </div>
                        <Badge variant={thread.key === activeThreadKey ? "secondary" : "outline"} className="rounded-full capitalize">
                          {thread.kind === "direct" ? "direct" : thread.proposal.status}
                        </Badge>
                      </div>
                      <p className={`mt-3 line-clamp-2 text-sm leading-6 ${thread.key === activeThreadKey ? "text-white/75" : "text-slate-600"}`}>{thread.summary}</p>
                      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em]">
                        <span>{new Date(thread.updatedAt).toLocaleString()}</span>
                        {thread.unread ? <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Unread</span> : <span>Seen</span>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-sm leading-7 text-slate-600">There are no message threads in this folder yet.</div>
              )}
            </ScrollArea>
          </section>

          <section className="rounded-[2rem] border border-slate-300/70 bg-white/86 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            {activeInquiry ? (
              <div className="flex h-[70vh] flex-col">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border border-slate-200">
                        <AvatarImage src={activeInquiry.senderAvatarUrl ?? undefined} alt={activeInquiry.senderName || "Collector"} />
                        <AvatarFallback>{initials(activeInquiry.senderName || "Collector")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-3xl font-semibold text-slate-900">{activeInquiry.senderName || `Collector ${activeInquiry.senderId}`}</h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                          <Badge variant="outline" className="rounded-full capitalize">Item Inquiry</Badge>
                        </div>
                      </div>
                    </div>
                    {folder !== "deleted" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteInquiryMutation.mutate({ inquiryId: activeInquiry.id })}
                        disabled={deleteInquiryMutation.isPending}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1 px-6 py-5 overflow-hidden">
                  <div className="space-y-4 w-full">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600 break-words">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Subject</p>
                      <p className="mt-2 font-semibold text-slate-900 break-words">{activeInquiry.subject}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600 break-words">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Message</p>
                      <p className="mt-2 whitespace-pre-wrap text-slate-900 break-words">{activeInquiry.message}</p>
                    </div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {new Date(activeInquiry.createdAt).toLocaleString()}
                    </div>

                    {repliesQuery.data && repliesQuery.data.length > 0 && (
                      <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Replies</p>
                        {repliesQuery.data.map(reply => (
                          <div key={reply.id} className="rounded-[1.5rem] border border-slate-200 bg-blue-50 p-4 break-words">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 border border-slate-200">
                                <AvatarImage src={reply.senderAvatarUrl ?? undefined} alt={reply.senderName || "Collector"} />
                                <AvatarFallback>{initials(reply.senderName || "Collector")}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{reply.senderName || `Collector ${reply.senderId}`}</p>
                                <p className="text-xs text-slate-500">{new Date(reply.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t border-slate-200 px-6 py-5">
                  {folder === "deleted" ? (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => emptyDeletedMutation.mutate()}
                      disabled={emptyDeletedMutation.isPending}
                    >
                      Empty Deleted Folder
                    </Button>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <Input value={messageDraft} onChange={event => setMessageDraft(event.target.value)} placeholder="Reply to this inquiry..." className="h-12 bg-white" />
                      <Button className="h-12 rounded-full px-6" disabled={!messageDraft.trim() || sendReplyMutation.isPending} onClick={() => {
                        if (!activeInquiry || !user?.id) return;
                        const trimmed = messageDraft.trim();
                        if (!trimmed) return;
                        sendReplyMutation.mutate({ inquiryId: activeInquiry.id, message: trimmed });
                      }}>
                        <Send className="mr-2 h-4 w-4" />
                        Reply
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : activeThread ? (
              <div className="flex h-[70vh] flex-col">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border border-slate-200">
                        <AvatarImage src={activeThread.counterpartAvatarUrl ?? undefined} alt={activeThread.counterpartName} />
                        <AvatarFallback>{initials(activeThread.counterpartName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-3xl font-semibold text-slate-900">{activeThread.counterpartName}</h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                          <Badge variant="outline" className="rounded-full capitalize">{activeThread.kind === "direct" ? "Direct conversation" : activeThread.proposal.status}</Badge>
                          {activeOnline ? <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Online now</span> : null}
                          {activeThread.kind === "trade" ? <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1"><ShieldCheck className="h-4 w-4" />{activeThread.proposal.ownerRating?.averageRating?.toFixed(1) ?? "N/A"} rating</span> : <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1"><UsersRound className="h-4 w-4" />Collector direct line</span>}
                        </div>
                      </div>
                    </div>
                    {activeThread.kind === "direct" ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this conversation? This cannot be undone.')) {
                            deleteDirectThreadMutation.mutate({ threadId: (activeThread as any).threadId });
                          }
                        }}
                        disabled={deleteDirectThreadMutation.isPending}
                      >
                        Delete
                      </Button>
                    ) : activeThread.kind === "trade" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Requested listing</p>
                          <p className="mt-2 font-semibold text-slate-900">{activeThread.proposal.requestedListing?.title ?? "Listing unavailable"}</p>
                          {activeThread.proposal.contactDetails && activeThread.proposal.requestedListing?.id && (
                            <p className="mt-2 text-xs text-slate-600">Ref ID: #{activeThread.proposal.requestedListing.id}</p>
                          )}
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Selected items</p>
                          <p className="mt-2 font-semibold text-slate-900">{activeThread.proposal.offeredListings.length}</p>
                          {activeThread.proposal.contactDetails && activeThread.proposal.offeredListings.length > 0 && (
                            <p className="mt-2 text-xs text-slate-600">
                              Ref IDs: {activeThread.proposal.offeredListings.map((l: any) => `#${l.id}`).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {activeThread.kind === "trade" && activeThread.proposal.contactDetails ? (
                    <div className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Accepted trade contact sharing</p>
                      <p className="mt-2">
                        {(activeThread.proposal.contactDetails as any).fullName ?? activeThread.counterpartName}
                        {(activeThread.proposal.contactDetails as any).email ? ` · ${(activeThread.proposal.contactDetails as any).email}` : ""}
                        {(activeThread.proposal.contactDetails as any).phone ? ` · ${(activeThread.proposal.contactDetails as any).phone}` : ""}
                      </p>
                      {(activeThread.proposal.contactDetails as any).address ? <p>{(activeThread.proposal.contactDetails as any).address}</p> : null}
                    </div>
                  ) : null}
                </div>

                <ScrollArea className="flex-1 px-6 py-5">
                  <div className="space-y-4">
                    {activeThread.kind === "trade" && activeThread.proposal.note ? (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Opening note</p>
                        <p className="mt-2">{activeThread.proposal.note}</p>
                      </div>
                    ) : null}
                    {activeThread.kind === "direct" && (dbMessagesQuery.data ?? []).length > 0 && (
                      <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Subject</p>
                        <p className="mt-1 font-semibold text-slate-900">{(activeThread as any).subject || '(no subject)'}</p>
                      </div>
                    )}
                    {(activeThread.kind === "direct" ? (dbMessagesQuery.data ?? []) : activeThread.proposal.messages).length ? (activeThread.kind === "direct" ? (dbMessagesQuery.data ?? []) : activeThread.proposal.messages).map((message: any) => {
                      const ownMessage = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-[1.5rem] px-4 py-3 text-sm leading-7 shadow-sm ${ownMessage ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                            <p className="text-xs uppercase tracking-[0.18em] opacity-65">{ownMessage ? (user?.name ?? 'You') : (activeThread.counterpartName)}</p>
                            <p className="mt-2">{message.body ?? message.message}</p>
                            <p className="mt-2 text-[11px] uppercase tracking-[0.16em] opacity-55">{new Date(message.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-6 text-sm leading-7 text-slate-600">
                        No follow-up messages yet. Use the composer below to keep the conversation moving.
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t border-slate-200 px-6 py-5">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <Input value={messageDraft} onChange={event => setMessageDraft(event.target.value)} placeholder={activeThread.kind === "direct" ? "Write a direct member message" : "Add a trade note, shipping update, or negotiation reply"} className="h-12 bg-white" />
                    {activeThread.kind === "trade" ? (
                      <Button variant="outline" className="h-12 rounded-full bg-transparent" asChild>
                        <Link href={`/listings/${activeThread.proposal.requestedListing?.id ?? 0}`}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          View listing
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="h-12 rounded-full bg-transparent" asChild>
                        <Link href="/members">
                          <UsersRound className="mr-2 h-4 w-4" />
                          Member directory
                        </Link>
                      </Button>
                    )}
                    <Button className="h-12 rounded-full px-6" disabled={!messageDraft.trim() || sendTradeMessageMutation.isPending} onClick={sendActiveMessage}>
                      {sendTradeMessageMutation.isPending && activeThread.kind === "trade" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {activeThread.kind === "direct" ? "Send Message" : "Send Trade Message"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[70vh] items-center justify-center px-8 text-center">
                <div className="max-w-md space-y-4">
                  <MailOpen className="mx-auto h-10 w-10 text-slate-500" />
                  <h2 className="text-3xl font-semibold text-slate-900">Select a message thread.</h2>
                  <p className="text-base leading-8 text-slate-600">Choose any direct conversation or Trade Proposal thread to view the audit trail, status, and contact handoff details.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
