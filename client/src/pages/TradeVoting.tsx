/**
 * Trade Voting — Anonymous community evaluation page.
 * 
 * Layout:
 * - Anonymous side-by-side comparison (Trader A vs Trader B)
 * - 3-option verdict poll (Steal, Fair, Pass)
 * - Community results (pie chart / percentages)
 * - Comments section
 * - 3-day expiry countdown
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md (Page 5)
 * Reference: trade_flow_v2_wireframes.md (Section 5)
 */

import { useState } from "react";
import { useParams } from "wouter";

type Verdict = 'steal' | 'fair' | 'pass';

export default function TradeVoting() {
  const params = useParams<{ token: string }>();
  const linkToken = params.token;

  const [selectedVerdict, setSelectedVerdict] = useState<Verdict | null>(null);
  const [comment, setComment] = useState('');

  // TODO: Wire up tRPC queries
  // const votingResultsQuery = trpc.tradeFlow.getVotingResults.useQuery({ linkToken });
  // const castVoteMutation = trpc.tradeFlow.castVote.useMutation();

  const handleVote = () => {
    if (!selectedVerdict) return;
    // TODO: castVoteMutation.mutate({ linkToken, verdict: selectedVerdict, comment });
  };

  return (
    <div className="min-h-screen bg-[#0a0a2a] py-8 px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Community Trade Evaluation</h1>
          <p className="text-gray-400 mt-2">Help fellow collectors evaluate this trade</p>
          <p className="text-yellow-400 text-sm mt-1">⏰ This evaluation expires in 2 days, 14 hours</p>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Trader A */}
          <div className="bg-[#1a1a4a] rounded-lg p-6">
            <h2 className="text-white font-semibold mb-4">Trader A is Offering:</h2>
            {/* TODO: Render items from voting data */}
            <div className="space-y-3">
              <div className="bg-[#0a0a2a] rounded p-3 text-gray-400 text-sm">
                Items will appear here
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-300">Total Value: <span className="text-white font-bold">~$0</span></p>
            </div>
          </div>

          {/* Trader B */}
          <div className="bg-[#1a1a4a] rounded-lg p-6">
            <h2 className="text-white font-semibold mb-4">Trader B is Offering:</h2>
            {/* TODO: Render items from voting data */}
            <div className="space-y-3">
              <div className="bg-[#0a0a2a] rounded p-3 text-gray-400 text-sm">
                Items will appear here
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-300">Total Value: <span className="text-white font-bold">~$0</span></p>
            </div>
          </div>
        </div>

        {/* Verdict Buttons */}
        <div className="bg-[#1a1a4a] rounded-lg p-6 mb-8">
          <h3 className="text-white font-semibold mb-4 text-center">Your Verdict:</h3>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setSelectedVerdict('steal')}
              className={`px-6 py-3 rounded-lg font-semibold ${
                selectedVerdict === 'steal'
                  ? 'bg-green-600 text-white ring-2 ring-green-300'
                  : 'bg-green-900 text-green-300 hover:bg-green-800'
              }`}
            >
              🟢 Steal (Great for A)
            </button>
            <button
              onClick={() => setSelectedVerdict('fair')}
              className={`px-6 py-3 rounded-lg font-semibold ${
                selectedVerdict === 'fair'
                  ? 'bg-yellow-600 text-white ring-2 ring-yellow-300'
                  : 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
              }`}
            >
              🟡 Fair Trade
            </button>
            <button
              onClick={() => setSelectedVerdict('pass')}
              className={`px-6 py-3 rounded-lg font-semibold ${
                selectedVerdict === 'pass'
                  ? 'bg-red-600 text-white ring-2 ring-red-300'
                  : 'bg-red-900 text-red-300 hover:bg-red-800'
              }`}
            >
              🔴 Pass (Bad for A)
            </button>
          </div>
        </div>

        {/* Community Results */}
        <div className="bg-[#1a1a4a] rounded-lg p-6 mb-8">
          <h3 className="text-white font-semibold mb-4">Community Results</h3>
          {/* TODO: Render actual vote percentages */}
          <p className="text-gray-400 text-center">No votes yet. Be the first!</p>
        </div>

        {/* Comment Section */}
        <div className="bg-[#1a1a4a] rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Comments</h3>
          <div className="space-y-3 mb-4">
            {/* TODO: Render comments from votingResultsQuery */}
            <p className="text-gray-400 text-sm">No comments yet.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your comment..."
              className="flex-1 bg-[#0a0a2a] border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400"
            />
            <button
              onClick={handleVote}
              disabled={!selectedVerdict}
              className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
