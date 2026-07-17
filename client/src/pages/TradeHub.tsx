/**
 * Trade Hub — The central dashboard for all trade activity.
 * 
 * Layout: Global Top Bar → Hero Section → Category Bar → 3-Column Interface
 * - Sidebar (Left): 5 Folders (Negotiating, Accepted, Shipped, Declined, Completed)
 * - Inbox (Center): High-density card list with search/filters
 * - Preview (Right): Item image, trader reputation, "Enter War Room" button
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md (Page 1)
 * Reference: trade_flow_v2_wireframes.md (Section 1)
 */

import { useState } from "react";

type TradeFolder = 'negotiating' | 'accepted' | 'shipped' | 'declined' | 'completed';

export default function TradeHub() {
  const [activeFolder, setActiveFolder] = useState<TradeFolder>('negotiating');
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);

  // TODO: Wire up tRPC queries
  // const tradeAlertsQuery = trpc.tradeFlow.getTradeAlerts.useQuery({ folder: activeFolder });
  // const unreadCountQuery = trpc.tradeFlow.getUnreadTradeAlertCount.useQuery();

  return (
    <div className="min-h-screen bg-[#0a0a2a]">
      {/* Global Top Bar — handled by parent layout */}
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#1a1a4a] to-[#2a2a6a] py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Trade Hub</h1>
          <p className="text-gray-300 mt-2">Manage all your active trades in one place</p>
        </div>
      </section>

      {/* Category Bar — TODO: Reuse shared CategoryBar component */}
      
      {/* Trade Hub Toolbar */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by User or TR#..."
          className="flex-1 bg-[#1a1a4a] border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400"
        />
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-gray-700 text-gray-300 text-sm">All</button>
          <button className="px-3 py-1 rounded bg-gray-700 text-gray-300 text-sm">Unread</button>
          <button className="px-3 py-1 rounded bg-gray-700 text-gray-300 text-sm">High Value</button>
        </div>
        <button className="px-3 py-1 rounded bg-gray-700 text-gray-300 text-sm">Bulk Actions</button>
      </div>

      {/* 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-12 gap-4">
        
        {/* Sidebar — Folders */}
        <aside className="col-span-2 bg-[#1a1a4a] rounded-lg p-4">
          <nav className="space-y-2">
            {(['negotiating', 'accepted', 'shipped', 'declined', 'completed'] as TradeFolder[]).map((folder) => (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`w-full text-left px-3 py-2 rounded capitalize text-sm ${
                  activeFolder === folder
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {folder}
              </button>
            ))}
          </nav>
        </aside>

        {/* Center — Inbox Feed */}
        <main className="col-span-5 bg-[#1a1a4a] rounded-lg p-4 space-y-3">
          {/* TODO: Map over tradeAlertsQuery.data */}
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">No trades yet</p>
            <p className="text-sm mt-2">Start trading by browsing the marketplace!</p>
          </div>
        </main>

        {/* Right — Preview Panel */}
        <aside className="col-span-5 bg-[#1a1a4a] rounded-lg p-4">
          {selectedTradeId === null ? (
            <div className="text-center text-gray-400 py-12">
              <p>Select a trade to preview details</p>
            </div>
          ) : (
            <div>
              {/* TODO: Show item image, trader info, verification badges, Enter War Room button */}
              <p className="text-white">Trade #{selectedTradeId} selected</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
