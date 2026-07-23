/**
 * Trade Hub — The central dashboard for all trade activity.
 * 
 * Layout: TopBar → Hero Section (TradeHub.svg) → CategoryBar → 3-Column Interface
 * - Sidebar (Left): 5 Folders (Negotiating, Accepted, Shipped, Declined, Completed)
 * - Inbox (Center): High-density card list with search/filters
 * - Preview (Right): Item image, trader reputation, "Enter War Room" button
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md (Page 1)
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

const TRADE_HUB_LOGO_URL = "/images/TradeHub.svg";

type TradeFolder = 'proposal' | 'negotiating' | 'accepted' | 'shipped' | 'declined' | 'completed';

const folderLabels: Record<TradeFolder, string> = {
  proposal: 'Proposals',
  negotiating: 'Negotiating',
  accepted: 'Accepted',
  shipped: 'Shipped',
  declined: 'Declined',
  completed: 'Completed',
};

const folderIcons: Record<TradeFolder, string> = {
  proposal: '📨',
  negotiating: '💬',
  accepted: '✅',
  shipped: '📦',
  declined: '❌',
  completed: '🏆',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function TradeHub() {
  const [, navigate] = useLocation();
  const [activeFolder, setActiveFolder] = useState<TradeFolder>('proposal');
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // tRPC queries
  const tradeAlertsQuery = trpc.tradeFlow.getTradeAlerts.useQuery(
    { folder: activeFolder, limit: 20, offset: 0 },
    { refetchInterval: 30000 }
  );

  const unreadCountQuery = trpc.tradeFlow.getUnreadTradeAlertCount.useQuery(
    undefined,
    { refetchInterval: 15000 }
  );

  // Find the selected trade from the list
  const selectedTrade = tradeAlertsQuery.data?.trades?.find((t: any) => t.id === selectedTradeId);

  // Filter trades by search
  const filteredTrades = tradeAlertsQuery.data?.trades?.filter((t: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.tradeReferenceNumber?.toLowerCase().includes(q) ||
      t.otherUser?.username?.toLowerCase().includes(q) ||
      t.otherUser?.displayName?.toLowerCase().includes(q) ||
      t.listing?.title?.toLowerCase().includes(q)
    );
  }) || [];

  const markAlertsAsReadMutation = trpc.tradeFlow.markAlertsAsRead.useMutation({
    onSuccess: () => {
      tradeAlertsQuery.refetch();
      unreadCountQuery.refetch();
    },
  });

  const handleSelectTrade = (tradeId: number) => {
    setSelectedTradeId(tradeId);
    // Mark alerts as read when the preview is opened
    markAlertsAsReadMutation.mutate({ proposalId: tradeId });
  };

  const handleEnterWarRoom = (proposalId: number) => {
    navigate(`/war-room/${proposalId}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-foreground">
      <TopBar logoUrl="/images/tradebilia-logo.svg" searchPlaceholder="Search Tradebilia..." />

      <main className="pb-24">
        {/* Hero Section — same background as main page */}
        <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
          backgroundImage: 'url(/images/Mainpage.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}>
          <div className="container relative flex h-48 items-center justify-center py-0 sm:h-56 lg:h-64">
            <div className="flex w-full items-center justify-center" style={{ maxWidth: '1200px' }}>
              <img
                src={TRADE_HUB_LOGO_URL}
                alt="Trade Hub"
                className="h-auto w-full"
                style={{ maxWidth: '1100px' }}
              />
            </div>
          </div>
        </section>

        <CategoryBar />

        {/* Trade Hub Content */}
        <div className="bg-[#0a0a2a] min-h-[calc(100vh-400px)]">
          {/* Toolbar */}
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search by User or TR#..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-sm bg-[#1a1a4a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {unreadCountQuery.data?.count ? (
                <span className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                  {unreadCountQuery.data.count} unread
                </span>
              ) : null}
            </div>
          </div>

          {/* 3-Column Layout */}
          <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-12 gap-4">
            
            {/* Sidebar — Folders */}
            <aside className="col-span-2 space-y-1">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Trade Status</h3>
              {(Object.keys(folderLabels) as TradeFolder[]).map((folder) => (
                <button
                  key={folder}
                  onClick={() => { setActiveFolder(folder); setSelectedTradeId(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    activeFolder === folder
                      ? 'bg-purple-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-[#1a1a4a]'
                  }`}
                >
                  <span>{folderIcons[folder]}</span>
                  <span>{folderLabels[folder]}</span>
                </button>
              ))}
            </aside>

            {/* Center — Inbox Feed */}
            <main className="col-span-5 bg-[#1a1a4a] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
                  {folderLabels[activeFolder]}
                  {filteredTrades.length > 0 && (
                    <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {filteredTrades.length}
                    </span>
                  )}
                </h2>
                <span className="text-xs text-gray-400">Sort by: Last Active</span>
              </div>

              <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                {tradeAlertsQuery.isLoading ? (
                  <div className="text-center text-gray-400 py-12">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-sm">Loading trades...</p>
                  </div>
                ) : filteredTrades.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 px-4">
                    <p className="text-lg mb-1">No trades in this folder</p>
                    <p className="text-sm">Start trading by browsing the marketplace!</p>
                  </div>
                ) : (
                  filteredTrades.map((trade: any) => (
                    <button
                      key={trade.id}
                      onClick={() => handleSelectTrade(trade.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#2a2a5a] transition-colors ${
                        selectedTradeId === trade.id ? 'bg-[#2a2a5a] border-l-4 border-purple-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {trade.otherUser?.displayName?.[0] || trade.otherUser?.username?.[0] || '?'}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium text-sm truncate">
                              {trade.otherUser?.displayName || trade.otherUser?.username || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {timeAgo(trade.lastActivityAt || trade.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-purple-400 font-mono">
                              {trade.tradeReferenceNumber || `TR-${String(trade.id).padStart(6, '0')}`}
                            </span>
                            {trade.unreadCount > 0 && (
                              <span className="bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded font-bold">
                                ACTION NEEDED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </main>

            {/* Right — Preview Panel */}
            <aside className="col-span-5 bg-[#1a1a4a] rounded-lg p-5">
              {selectedTrade === null || selectedTrade === undefined ? (
                <div className="text-center text-gray-400 py-16">
                  <div className="text-4xl mb-3 opacity-50">📋</div>
                  <p className="text-lg">Select a trade to preview details</p>
                  <p className="text-sm mt-1">Click on a trade in the inbox to see more information</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Trade Ref Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg">Trade Preview</h3>
                    <span className="text-purple-400 font-mono text-sm">
                      {selectedTrade.tradeReferenceNumber || `TR-${String(selectedTrade.id).padStart(6, '0')}`}
                    </span>
                  </div>

                  {/* Item Image */}
                  {selectedTrade.listing?.image && (
                    <div className="rounded-lg overflow-hidden bg-[#0a0a2a] p-2">
                      <img
                        src={selectedTrade.listing.image}
                        alt={selectedTrade.listing.title}
                        className="w-full h-48 object-contain rounded"
                      />
                    </div>
                  )}

                  {/* Item Details */}
                  <div>
                    <h4 className="text-white font-semibold">{selectedTrade.listing?.title || 'Unknown Item'}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-green-400 font-bold">
                        ${parseFloat(selectedTrade.listing?.value || '0').toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {selectedTrade.listing?.category?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Trader Info */}
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {selectedTrade.otherUser?.displayName?.[0] || selectedTrade.otherUser?.username?.[0] || '?'}
                        </div>
                        {/* Online Status: Green = online, Red = offline */}
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1a4a] bg-red-500" title="Offline" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {selectedTrade.otherUser?.displayName || selectedTrade.otherUser?.username}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          {selectedTrade.otherUser?.avgRating && (
                            <span className="text-yellow-400">
                              ★ {parseFloat(selectedTrade.otherUser.avgRating).toFixed(1)}
                            </span>
                          )}
                          {selectedTrade.otherUser?.reviewCount > 0 && (
                            <span className="text-gray-400">
                              ({selectedTrade.otherUser.reviewCount} reviews)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Verification Badges — only show platforms the user has actually verified */}
                    {(selectedTrade.otherUser?.ebayVerified || selectedTrade.otherUser?.facebookVerified || selectedTrade.otherUser?.linkedinVerified) && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">Verified on:</span>
                        {selectedTrade.otherUser?.ebayVerified && (
                          <span className="px-2 py-0.5 bg-red-900/50 text-red-300 text-xs rounded font-semibold" title="eBay Verified">eBay</span>
                        )}
                        {selectedTrade.otherUser?.facebookVerified && (
                          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded font-semibold" title="Facebook Verified">Facebook</span>
                        )}
                        {selectedTrade.otherUser?.linkedinVerified && (
                          <span className="px-2 py-0.5 bg-sky-900/50 text-sky-300 text-xs rounded font-semibold" title="LinkedIn Verified">LinkedIn</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Initial message — shown for Proposals */}
                  {activeFolder === 'proposal' && selectedTrade.note && (
                    <div className="bg-[#0a0a2a] rounded-lg p-4 border border-purple-900/40">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                        </svg>
                        Initial Message
                      </p>
                      <p className="text-gray-200 text-sm leading-relaxed italic">"{selectedTrade.note}"</p>
                    </div>
                  )}

                  {/* Decline Reason — shown when trade is declined/cancelled and a reason was provided */}
                  {selectedTrade.declineReason && (activeFolder === 'declined') && (
                    <div className="bg-red-950/40 rounded-lg p-4 border border-red-800/40">
                      <p className="text-red-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        Decline Reason
                      </p>
                      <p className="text-red-200 text-sm leading-relaxed italic">"{selectedTrade.declineReason}"</p>
                    </div>
                  )}

                  {/* Status Info */}
                  <div className="bg-[#0a0a2a] rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className="text-white ml-2 capitalize">{selectedTrade.status}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Items:</span>
                        <span className="text-white ml-2">{selectedTrade.itemCount || 0} offered</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Direction:</span>
                        <span className="text-white ml-2 capitalize">{selectedTrade.direction}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <span className="text-white ml-2">{timeAgo(selectedTrade.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Enter War Room Button */}
                  <button
                    onClick={() => handleEnterWarRoom(selectedTrade.id)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-purple-500/25 text-center"
                  >
                    {activeFolder === 'proposal' ? '📨 View Proposal' : '⚔️ Enter War Room'}
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    {activeFolder === 'proposal' ? 'Review and respond to this trade proposal' : 'Secure negotiation space'}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
