/**
 * Trade Voting Page — Anonymous community evaluation of a trade.
 * 
 * Accessed via a token-based URL: /trade-vote/:token
 * Link expires after 3 days. Requires login to vote.
 * Shows anonymous "Trader A" vs "Trader B" (no real usernames).
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md (Page 5)
 */

import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function TradeVoting() {
  const params = useParams<{ token: string }>();
  const token = params.token || '';
  const { user } = useAuth();
  const [selectedVerdict, setSelectedVerdict] = useState<'steal' | 'fair' | 'pass' | null>(null);
  const [comment, setComment] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  // Query voting results
  const votingResultsQuery = trpc.tradeFlow.getVotingResults.useQuery(
    { linkToken: token },
    { enabled: !!token && !!user }
  );

  // Cast vote mutation
  const castVoteMutation = trpc.tradeFlow.castVote.useMutation({
    onSuccess: () => {
      toast.success('Your vote has been recorded!');
      setHasVoted(true);
      votingResultsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleVote = () => {
    if (!selectedVerdict) {
      toast.error('Please select a verdict before voting.');
      return;
    }
    castVoteMutation.mutate({
      linkToken: token,
      verdict: selectedVerdict,
      comment: comment || undefined,
    });
  };

  const results = votingResultsQuery.data;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-foreground">
      <TopBar logoUrl="https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg" searchPlaceholder="Search Tradebilia..." />

      <main className="pb-24">
        {/* Hero Section */}
        <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
          backgroundImage: 'url(https://assets.tradebilia.com/Background_48b923f1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}>
          <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
            <div className="flex w-full max-w-6xl items-center justify-center">
              <img src="https://assets.tradebilia.com/CommunityTradeEvaluation_cdf4fef4.webp" alt="Community Trade Evaluation" className="h-auto w-full" />
            </div>
          </div>
        </section>

        <CategoryBar />

        {/* Main Content */}
        <div className="bg-[#0a0a2a] min-h-[calc(100vh-300px)]">
          <div className="max-w-3xl mx-auto px-4 py-8">

            {/* Not logged in */}
            {!user && (
              <div className="bg-[#1a1a4a] rounded-lg p-8 text-center">
                <p className="text-white text-lg mb-2">Login Required</p>
                <p className="text-gray-400 text-sm">You must be logged in to vote on trades.</p>
              </div>
            )}

            {/* Loading */}
            {user && votingResultsQuery.isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                <p className="text-gray-400 mt-3">Loading trade details...</p>
              </div>
            )}

            {/* Error */}
            {user && votingResultsQuery.error && (
              <div className="bg-[#1a1a4a] rounded-lg p-8 text-center">
                <p className="text-red-400 text-lg mb-2">Unable to load trade</p>
                <p className="text-gray-400 text-sm">{votingResultsQuery.error.message}</p>
              </div>
            )}

            {/* Voting UI */}
            {user && results && !hasVoted && (
              <div className="space-y-6">
                {/* Anonymous Header */}
                <div className="bg-[#1a1a4a] rounded-lg p-6 text-center">
                  <h2 className="text-white text-xl font-bold mb-2">Is This a Fair Trade?</h2>
                  <p className="text-gray-400 text-sm">Help the community by evaluating this trade proposal. All identities are anonymous.</p>
                </div>

                {/* Anonymous Side-by-Side Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1a1a4a] rounded-lg p-5">
                    <h3 className="text-blue-400 font-semibold text-sm uppercase mb-3 text-center">Trader A Offers</h3>
                    <div className="space-y-2">
                      {results.tradeDetails?.traderA?.items?.length > 0 ? (
                        results.tradeDetails.traderA.items.map((item: any, i: number) => (
                          <div key={i} className="bg-[#0a0a2a] rounded p-2 flex items-center justify-between">
                            <span className="text-white text-sm truncate">{item.title}</span>
                            <span className="text-green-400 text-xs font-medium">${parseFloat(item.value || '0').toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm text-center">No items</p>
                      )}
                      {results.tradeDetails?.traderA?.cash > 0 && (
                        <div className="bg-[#0a0a2a] rounded p-2 flex items-center justify-between">
                          <span className="text-white text-sm">Cash</span>
                          <span className="text-green-400 text-xs font-medium">${parseFloat(results.tradeDetails.traderA.cash).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#1a1a4a] rounded-lg p-5">
                    <h3 className="text-orange-400 font-semibold text-sm uppercase mb-3 text-center">Trader B Offers</h3>
                    <div className="space-y-2">
                      {results.tradeDetails?.traderB?.items?.length > 0 ? (
                        results.tradeDetails.traderB.items.map((item: any, i: number) => (
                          <div key={i} className="bg-[#0a0a2a] rounded p-2 flex items-center justify-between">
                            <span className="text-white text-sm truncate">{item.title}</span>
                            <span className="text-green-400 text-xs font-medium">${parseFloat(item.value || '0').toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm text-center">No items</p>
                      )}
                      {results.tradeDetails?.traderB?.cash > 0 && (
                        <div className="bg-[#0a0a2a] rounded p-2 flex items-center justify-between">
                          <span className="text-white text-sm">Cash</span>
                          <span className="text-green-400 text-xs font-medium">${parseFloat(results.tradeDetails.traderB.cash).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verdict Selection */}
                <div className="bg-[#1a1a4a] rounded-lg p-6">
                  <h3 className="text-white font-semibold mb-4 text-center">Your Verdict</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setSelectedVerdict('steal')}
                      className={`p-4 rounded-lg border-2 text-center transition ${
                        selectedVerdict === 'steal'
                          ? 'border-green-500 bg-green-900/30'
                          : 'border-gray-600 hover:border-green-500/50'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🟢</span>
                      <span className="text-white font-semibold text-sm">Steal</span>
                      <p className="text-gray-500 text-xs mt-1">Great for one side</p>
                    </button>
                    <button
                      onClick={() => setSelectedVerdict('fair')}
                      className={`p-4 rounded-lg border-2 text-center transition ${
                        selectedVerdict === 'fair'
                          ? 'border-yellow-500 bg-yellow-900/30'
                          : 'border-gray-600 hover:border-yellow-500/50'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🟡</span>
                      <span className="text-white font-semibold text-sm">Fair Trade</span>
                      <p className="text-gray-500 text-xs mt-1">Balanced deal</p>
                    </button>
                    <button
                      onClick={() => setSelectedVerdict('pass')}
                      className={`p-4 rounded-lg border-2 text-center transition ${
                        selectedVerdict === 'pass'
                          ? 'border-red-500 bg-red-900/30'
                          : 'border-gray-600 hover:border-red-500/50'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🔴</span>
                      <span className="text-white font-semibold text-sm">Pass</span>
                      <p className="text-gray-500 text-xs mt-1">Bad deal</p>
                    </button>
                  </div>
                </div>

                {/* Comment */}
                <div className="bg-[#1a1a4a] rounded-lg p-6">
                  <label className="text-gray-300 text-sm font-medium block mb-2">Comment (optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your reasoning or advice..."
                    className="w-full bg-[#0a0a2a] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 text-sm h-20 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleVote}
                  disabled={!selectedVerdict || castVoteMutation.isPending}
                  className="w-full px-6 py-3 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {castVoteMutation.isPending ? 'Submitting...' : 'Submit Vote'}
                </button>
              </div>
            )}

            {/* Results (shown after voting) */}
            {user && results && hasVoted && (
              <div className="space-y-6">
                <div className="bg-[#1a1a4a] rounded-lg p-6 text-center">
                  <h2 className="text-white text-xl font-bold mb-2">Thank You for Voting!</h2>
                  <p className="text-gray-400 text-sm">Here are the community results so far:</p>
                </div>

                {/* Results Bars */}
                <div className="bg-[#1a1a4a] rounded-lg p-6 space-y-4">
                  <h3 className="text-white font-semibold mb-3">Community Verdict ({results.total} votes)</h3>
                  
                  {/* Steal */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-green-400">🟢 Steal</span>
                      <span className="text-gray-400">{results.steal.count} ({results.steal.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${results.steal.percentage}%` }} />
                    </div>
                  </div>

                  {/* Fair */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-yellow-400">🟡 Fair Trade</span>
                      <span className="text-gray-400">{results.fair.count} ({results.fair.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div className="bg-yellow-500 h-3 rounded-full transition-all" style={{ width: `${results.fair.percentage}%` }} />
                    </div>
                  </div>

                  {/* Pass */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-red-400">🔴 Pass</span>
                      <span className="text-gray-400">{results.pass.count} ({results.pass.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div className="bg-red-500 h-3 rounded-full transition-all" style={{ width: `${results.pass.percentage}%` }} />
                    </div>
                  </div>
                </div>

                {/* Comments */}
                {results.comments.length > 0 && (
                  <div className="bg-[#1a1a4a] rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-3">Community Comments</h3>
                    <div className="space-y-3">
                      {results.comments.map((c: any, i: number) => (
                        <div key={i} className="bg-[#0a0a2a] rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              c.verdict === 'steal' ? 'bg-green-900 text-green-300' :
                              c.verdict === 'fair' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-red-900 text-red-300'
                            }`}>
                              {c.verdict}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">{c.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
