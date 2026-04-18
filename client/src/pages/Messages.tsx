import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLoginUrl } from "@/const";
import { listDirectThreads, loadPresenceMap, sendDirectMessage, subscribeToDirectMessaging, subscribeToPresence, updatePresence } from "@/lib/memberMessaging";
import { trpc } from "@/lib/trpc";
import { TRADEBILIA_LOGO_URL, tradebiliaCategories } from "@/lib/tradebilia";
import { ArrowRightLeft, Loader2, MailOpen, MessageSquareText, Send, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const folders = [
  { value: "all", label: "All Messages" },
  { value: "direct", label: "Direct Messages" },
  { value: "trade", label: "Trade-related" },
  { value: "unread", label: "Unread" },
  { value: "accepted", label: "Accepted Trades" },
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
  const [directThreads, setDirectThreads] = useState<ReturnType<typeof listDirectThreads>>([]);
  const [presenceMap, setPresenceMap] = useState<Record<number, { displayName: string; updatedAt: number }>>({});

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const sendTradeMessageMutation = trpc.market.sendTradeMessage.useMutation({
    onSuccess: async () => {
      setMessageDraft("");
      await utils.market.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!user?.id) return;
    const loadThreads = () => setDirectThreads(listDirectThreads(user.id));
    loadThreads();
    const unsubscribe = subscribeToDirectMessaging(loadThreads);
    return unsubscribe;
  }, [user?.id]);

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

  const allThreads = useMemo(() => {
    const tradeThreads = proposals.map(proposal => {
      const latestMessage = proposal.messages.at(-1);
      return {
        key: `trade-${proposal.id}`,
        kind: "trade" as const,
        updatedAt: proposal.updatedAt,
        unread: Boolean(latestMessage && latestMessage.senderId !== user?.id),
        accepted: ["accepted", "completed"].includes(proposal.status),
        counterpartId: proposal.counterpart.userId,
        counterpartName: proposal.counterpart.displayName,
        counterpartAvatarUrl: proposal.counterpart.avatarUrl ?? null,
        summary: latestMessage?.message ?? proposal.note ?? "No message yet.",
        proposal,
      };
    });

    const direct = directThreads.map(thread => {
      const latestMessage = thread.messages.at(-1);
      return {
        key: `direct-${thread.counterpartId}`,
        kind: "direct" as const,
        updatedAt: thread.updatedAt,
        unread: Boolean(latestMessage && latestMessage.senderId !== user?.id),
        accepted: false,
        counterpartId: thread.counterpartId,
        counterpartName: thread.counterpartName,
        counterpartAvatarUrl: thread.counterpartAvatarUrl,
        summary: latestMessage?.message ?? "Direct collector conversation",
        thread,
      };
    });

    return [...tradeThreads, ...direct].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [directThreads, proposals, user?.id]);

  const filteredThreads = useMemo(() => {
    return allThreads.filter(thread => {
      if (folder === "direct") return thread.kind === "direct";
      if (folder === "trade") return thread.kind === "trade";
      if (folder === "unread") return thread.unread;
      if (folder === "accepted") return thread.kind === "trade" && thread.accepted;
      return true;
    });
  }, [allThreads, folder]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const directParam = params.get("direct");
    if (directParam) {
      setActiveThreadKey(`direct-${directParam}`);
      return;
    }
    if (!filteredThreads.length) {
      setActiveThreadKey(null);
      return;
    }
    if (!activeThreadKey || !filteredThreads.some(item => item.key === activeThreadKey)) {
      setActiveThreadKey(filteredThreads[0].key);
    }
  }, [activeThreadKey, filteredThreads]);

  const activeThread = filteredThreads.find(thread => thread.key === activeThreadKey) ?? null;
  const activePresence = activeThread ? presenceMap[activeThread.counterpartId] : null;
  const activeOnline = activePresence ? Date.now() - activePresence.updatedAt < 15000 : false;

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
      sendDirectMessage({
        currentUserId: user.id,
        currentUserName: user.name ?? "Tradebilia Member",
        counterpartId: activeThread.thread.counterpartId,
        counterpartName: activeThread.thread.counterpartName,
        counterpartAvatarUrl: activeThread.thread.counterpartAvatarUrl,
        message: trimmed,
      });
      setMessageDraft("");
      return;
    }

    sendTradeMessageMutation.mutate({ proposalId: activeThread.proposal.id, message: trimmed });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a0d22_0%,#121c48_26%,#ede3d3_26%,#ede3d3_100%)] text-slate-950">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white">
        <div className="container py-8 lg:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-auto w-full max-w-[34rem]" />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.34em] text-white/70">Trade communications</p>
              <h1 className="mt-3 text-5xl font-semibold leading-tight text-white sm:text-6xl">A dedicated inbox for direct collector messages, proposal threads, and accepted-trade handoff.</h1>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[24rem]">
              {[
                ["Threads", String(allThreads.length)],
                ["Unread", String(allThreads.filter(thread => thread.unread).length)],
                ["Direct", String(allThreads.filter(thread => thread.kind === "direct").length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 text-center backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">{label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <nav className="border-t border-white/10 bg-black/35 backdrop-blur-sm">
          <div className="container grid overflow-hidden md:grid-cols-5 xl:grid-cols-10">
            {tradebiliaCategories.map(category => (
              <Link
                key={category.value}
                href={`/category/${category.value}`}
                className="border-b border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/10 lg:text-[11px]"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="container py-8 lg:py-10">
        <div className="grid gap-6 xl:grid-cols-[240px_340px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-300/70 bg-white/82 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Inbox Folders</h2>
            <div className="mt-5 space-y-2">
              {folders.map(item => {
                const count = item.value === "all"
                  ? allThreads.length
                  : item.value === "direct"
                    ? allThreads.filter(thread => thread.kind === "direct").length
                    : item.value === "trade"
                      ? allThreads.filter(thread => thread.kind === "trade").length
                      : item.value === "unread"
                        ? allThreads.filter(thread => thread.unread).length
                        : allThreads.filter(thread => thread.kind === "trade" && thread.accepted).length;
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
              {dashboardQuery.isLoading ? (
                <div className="flex min-h-[18rem] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                </div>
              ) : filteredThreads.length ? (
                <div className="space-y-3">
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
            {activeThread ? (
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
                          {activeThread.kind === "trade" ? <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1"><ShieldCheck className="h-4 w-4" />{activeThread.proposal.counterpartRating.averageRating.toFixed(1)} rating</span> : <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1"><UsersRound className="h-4 w-4" />Collector direct line</span>}
                        </div>
                      </div>
                    </div>
                    {activeThread.kind === "trade" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Requested listing</p>
                          <p className="mt-2 font-semibold text-slate-900">{activeThread.proposal.requestedListing?.title ?? "Listing unavailable"}</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Selected items</p>
                          <p className="mt-2 font-semibold text-slate-900">{activeThread.proposal.offeredListings.length}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {activeThread.kind === "trade" && activeThread.proposal.contactDetails ? (
                    <div className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Accepted trade contact sharing</p>
                      <p className="mt-2">
                        {activeThread.proposal.contactDetails.fullName ?? activeThread.counterpartName}
                        {activeThread.proposal.contactDetails.email ? ` · ${activeThread.proposal.contactDetails.email}` : ""}
                        {activeThread.proposal.contactDetails.phone ? ` · ${activeThread.proposal.contactDetails.phone}` : ""}
                      </p>
                      {activeThread.proposal.contactDetails.address ? <p>{activeThread.proposal.contactDetails.address}</p> : null}
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
                    {(activeThread.kind === "direct" ? activeThread.thread.messages : activeThread.proposal.messages).length ? (activeThread.kind === "direct" ? activeThread.thread.messages : activeThread.proposal.messages).map(message => {
                      const ownMessage = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-[1.5rem] px-4 py-3 text-sm leading-7 shadow-sm ${ownMessage ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                            <p className="text-xs uppercase tracking-[0.18em] opacity-65">{"senderDisplayName" in message ? message.senderDisplayName : message.senderName}</p>
                            <p className="mt-2">{message.message}</p>
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
