/**
 * War Room — The dedicated negotiation page for a single trade.
 * 
 * Layout:
 * - Header: Trade Ref # + 5-Stage Progress Tracker + Back to Hub + Online Status
 * - Trade Table: Split-screen (Your Side vs Their Side) + Fairness Meter + AI Analyze
 * - Service & Trust: Middle Man checkbox + Verification badges + Video Call button
 * - Interaction: Inventory Browser (slide-out) + Floating Video Window + Chat & Timeline + Private Notes (slide-out)
 * - Footer: Get Opinion | Decline | Update Proposal | Accept Trade
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md (Page 2)
 * Reference: trade_flow_v2_wireframes.md (Section 2)
 */

import { useState } from "react";
import { useParams } from "wouter";

type TradeStage = 'proposed' | 'negotiating' | 'accepted' | 'shipped' | 'completed';

export default function WarRoom() {
  const params = useParams<{ proposalId: string }>();
  const proposalId = Number(params.proposalId);

  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);

  // TODO: Wire up tRPC queries
  // const tradeDetailsQuery = trpc.tradeFlow.getTradeDetails.useQuery({ proposalId });
  // const messagesQuery = trpc.tradeFlow.getMessages.useQuery({ proposalId });
  // const privateNoteQuery = trpc.tradeFlow.getPrivateNote.useQuery({ proposalId });

  const currentStage: TradeStage = 'negotiating'; // TODO: derive from tradeDetailsQuery

  return (
    <div className="min-h-screen bg-[#0a0a2a] flex flex-col">
      
      {/* Header: Progress Tracker */}
      <header className="bg-[#1a1a4a] border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/trade-hub" className="text-purple-400 hover:text-purple-300 text-sm">
              ← Back to Trade Hub
            </a>
            <span className="text-white font-mono font-bold">TR-000000</span>
          </div>
          
          {/* 5-Stage Progress Tracker */}
          <div className="flex items-center gap-2">
            {(['proposed', 'negotiating', 'accepted', 'shipped', 'completed'] as TradeStage[]).map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  stage === currentStage ? 'bg-purple-500 ring-2 ring-purple-300' :
                  i < (['proposed', 'negotiating', 'accepted', 'shipped', 'completed'].indexOf(currentStage))
                    ? 'bg-green-500' : 'bg-gray-600'
                }`} />
                <span className={`text-xs capitalize ${
                  stage === currentStage ? 'text-purple-300' : 'text-gray-500'
                }`}>{stage}</span>
                {i < 4 && <span className="text-gray-600">→</span>}
              </div>
            ))}
          </div>

          {/* Other user's online status */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-300 text-sm">David is Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-4 space-y-4">

        {/* Trade Table (Collapsible) */}
        <section className="bg-[#1a1a4a] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Trade Table</h2>
            <button
              onClick={() => setIsTableCollapsed(!isTableCollapsed)}
              className="text-gray-400 text-sm hover:text-white"
            >
              {isTableCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>

          {!isTableCollapsed && (
            <div className="grid grid-cols-2 gap-8">
              {/* Your Side */}
              <div className="border border-gray-600 rounded-lg p-4">
                <h3 className="text-gray-300 text-sm mb-3">Your Side</h3>
                {/* TODO: Render items from current proposal */}
                <p className="text-gray-500 text-sm">No items yet</p>
              </div>

              {/* Their Side */}
              <div className="border border-gray-600 rounded-lg p-4">
                <h3 className="text-gray-300 text-sm mb-3">Their Side</h3>
                {/* TODO: Render items from current proposal */}
                <p className="text-gray-500 text-sm">No items yet</p>
              </div>
            </div>
          )}

          {/* Cash Fields */}
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div>
              <label className="text-green-400 text-xs">Cash You Receive</label>
              <input type="number" className="w-full bg-[#0a0a2a] border border-gray-600 rounded px-3 py-1 text-white mt-1" placeholder="$0" />
            </div>
            <div>
              <label className="text-red-400 text-xs">Cash You Pay</label>
              <input type="number" className="w-full bg-[#0a0a2a] border border-gray-600 rounded px-3 py-1 text-white mt-1" placeholder="$0" />
            </div>
          </div>

          {/* Fairness Meter + AI Analyze */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 bg-gray-700 rounded-full h-3 relative">
              <div className="absolute left-1/2 top-0 h-3 w-0.5 bg-white" />
              {/* TODO: Dynamic position based on value comparison */}
            </div>
            <button className="px-3 py-1 rounded bg-purple-600 text-white text-sm opacity-50 cursor-not-allowed" disabled>
              ✨ AI Analyze
            </button>
          </div>
        </section>

        {/* Service & Trust */}
        <section className="bg-[#1a1a4a] rounded-lg p-4 flex items-center gap-6">
          <label className="flex items-center gap-2 text-gray-300 text-sm">
            <input type="checkbox" className="rounded" />
            Request Middle Man Service ($)
          </label>
          <span className="text-gray-500">|</span>
          <span className="text-green-400 text-sm">✓ LinkedIn Verified</span>
          <span className="text-green-400 text-sm">✓ eBay Verified</span>
          <button
            onClick={() => setIsVideoActive(true)}
            className="ml-auto px-3 py-1 rounded bg-blue-600 text-white text-sm"
          >
            📹 Start Video Call
          </button>
        </section>

        {/* Chat & Timeline */}
        <section className="bg-[#1a1a4a] rounded-lg p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Chat & Timeline</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                className="px-3 py-1 rounded bg-gray-700 text-gray-300 text-sm"
              >
                View Inventory
              </button>
              <button
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className="px-3 py-1 rounded bg-gray-700 text-gray-300 text-sm"
              >
                📝 Private Notes
              </button>
            </div>
          </div>
          
          {/* Messages Area */}
          <div className="h-64 overflow-y-auto border border-gray-700 rounded p-3 mb-3">
            {/* TODO: Render messages from messagesQuery */}
            <p className="text-gray-500 text-sm text-center">No messages yet. Start the conversation!</p>
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type message..."
              className="flex-1 bg-[#0a0a2a] border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400"
            />
            <button className="px-4 py-2 rounded bg-purple-600 text-white">Send</button>
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <footer className="bg-[#1a1a4a] border-t border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button className="px-4 py-2 rounded bg-gray-700 text-gray-300 opacity-50 cursor-not-allowed" disabled>
            📢 Get Opinion
          </button>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded bg-red-600 text-white">❌ Decline</button>
            <button className="px-4 py-2 rounded bg-blue-600 text-white">💾 Update Proposal</button>
            <button className="px-4 py-2 rounded bg-green-600 text-white">✅ Accept Trade</button>
          </div>
        </div>
      </footer>

      {/* TODO: Slide-out panels for Inventory Browser and Private Notes */}
      {/* TODO: Floating Video Window component */}
    </div>
  );
}
