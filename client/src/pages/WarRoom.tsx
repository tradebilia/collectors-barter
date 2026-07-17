/**
 * War Room — The dedicated negotiation page for a single trade.
 * Full-width layout (no sidebar) per our discussion.
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md (Page 2)
 */

import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import { toast } from "sonner";

type TradeStage = 'proposed' | 'negotiating' | 'accepted' | 'shipped' | 'completed';

function getStageFromStatus(status: string): TradeStage {
  switch (status) {
    case 'pending': return 'proposed';
    case 'negotiating': return 'negotiating';
    case 'accepted': return 'accepted';
    case 'shipped': return 'shipped';
    case 'completed': return 'completed';
    default: return 'proposed';
  }
}

const stages: TradeStage[] = ['proposed', 'negotiating', 'accepted', 'shipped', 'completed'];

export default function WarRoom() {
  const params = useParams<{ proposalId: string }>();
  const [, navigate] = useLocation();
  const proposalId = Number(params.proposalId);
  const utils = trpc.useUtils();

  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [cashReceive, setCashReceive] = useState('');
  const [cashPay, setCashPay] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractCheckbox, setContractCheckbox] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [trackingCarrier, setTrackingCarrier] = useState<string>('USPS');
  const [trackingCarrierOther, setTrackingCarrierOther] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [middleManRequested, setMiddleManRequested] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPC queries
  const tradeDetailsQuery = trpc.tradeFlow.getTradeDetails.useQuery(
    { proposalId },
    { enabled: proposalId > 0, refetchInterval: 10000 }
  );

  const messagesQuery = trpc.tradeFlow.getMessages.useQuery(
    { proposalId, limit: 100, offset: 0 },
    { enabled: proposalId > 0, refetchInterval: 5000 }
  );

  const privateNoteQuery = trpc.tradeFlow.getPrivateNote.useQuery(
    { proposalId },
    { enabled: proposalId > 0 }
  );

  const inventoryQuery = trpc.tradeFlow.getOtherUserInventory.useQuery(
    { proposalId, search: inventorySearch || undefined },
    { enabled: proposalId > 0 && isInventoryOpen }
  );

  // tRPC mutations
  const sendMessageMutation = trpc.tradeFlow.sendMessage.useMutation({
    onSuccess: () => { setMessageInput(''); utils.tradeFlow.getMessages.invalidate({ proposalId }); },
    onError: (err) => toast.error(err.message),
  });

  const sendProposalMutation = trpc.tradeFlow.sendTradeProposal.useMutation({
    onSuccess: () => { toast.success('Proposal updated!'); utils.tradeFlow.getTradeDetails.invalidate({ proposalId }); },
    onError: (err) => toast.error(err.message),
  });

  const acceptMutation = trpc.tradeFlow.acceptTradeProposal.useMutation({
    onSuccess: (data) => {
      if (data.mutualAcceptance) {
        toast.success('Trade accepted by both parties! Items are now locked.');
      } else {
        toast.success('You have accepted! Waiting for the other party to confirm within 72 hours.');
      }
      utils.tradeFlow.getTradeDetails.invalidate({ proposalId });
    },
    onError: (err) => toast.error(err.message),
  });

  const declineMutation = trpc.tradeFlow.declineTradeProposal.useMutation({
    onSuccess: () => { toast.success('Trade declined.'); navigate('/trade-hub'); },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.tradeFlow.cancelTrade.useMutation({
    onSuccess: () => { toast.success('Trade cancelled.'); navigate('/trade-hub'); },
    onError: (err) => toast.error(err.message),
  });

  const saveNoteMutation = trpc.tradeFlow.savePrivateNote.useMutation({
    onSuccess: () => toast.success('Note saved!'),
    onError: (err) => toast.error(err.message),
  });

  const enterWarRoomMutation = trpc.tradeFlow.enterWarRoom.useMutation({
    onSuccess: () => utils.tradeFlow.getTradeDetails.invalidate({ proposalId }),
  });

  const submitTrackingMutation = trpc.tradeFlow.submitTrackingNumbers.useMutation({
    onSuccess: () => { toast.success('Tracking number submitted!'); setTrackingNumber(''); utils.tradeFlow.getTradeDetails.invalidate({ proposalId }); },
    onError: (err) => toast.error(err.message),
  });

  const confirmReceiptMutation = trpc.tradeFlow.confirmItemsReceived.useMutation({
    onSuccess: () => { toast.success('Receipt confirmed!'); utils.tradeFlow.getTradeDetails.invalidate({ proposalId }); },
    onError: (err) => toast.error(err.message),
  });

  const fileComplaintMutation = trpc.tradeFlow.fileComplaint.useMutation({
    onSuccess: () => { toast.success('Complaint filed. Admin will review.'); utils.tradeFlow.getTradeDetails.invalidate({ proposalId }); },
    onError: (err) => toast.error(err.message),
  });

  const middleManMutation = trpc.tradeFlow.middleManService.useMutation({
    onSuccess: () => { toast.success('Middle Man preference updated!'); utils.tradeFlow.getTradeDetails.invalidate({ proposalId }); },
    onError: (err) => toast.error(err.message),
  });

  const generateVotingLinkMutation = trpc.tradeFlow.generateVotingLink.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/trade-vote/${data.token}`;
      navigator.clipboard.writeText(url);
      toast.success('Voting link copied to clipboard! Share it with the community.');
    },
    onError: (err) => toast.error(err.message),
  });

  // Enter war room on first load (transitions pending → negotiating)
  useEffect(() => {
    if (proposalId > 0) {
      enterWarRoomMutation.mutate({ proposalId });
    }
  }, [proposalId]);

  // Load private note into state
  useEffect(() => {
    if (privateNoteQuery.data?.noteContent) {
      setNoteInput(privateNoteQuery.data.noteContent);
    }
  }, [privateNoteQuery.data]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data]);

  // Derived data
  const trade = tradeDetailsQuery.data;
  const currentStage = trade ? getStageFromStatus(trade.proposal.status) : 'proposed';
  const currentStageIndex = stages.indexOf(currentStage);
  const isRequester = trade?.isRequester ?? false;
  const otherUser = trade?.otherUser;
  const messages = messagesQuery.data?.messages || [];

  // Separate items by owner
  const myItems = trade?.offeredListings?.filter((l: any) => l.ownerId === (isRequester ? trade.proposal.requesterId : trade.proposal.recipientId)) || [];
  const theirItems = trade?.offeredListings?.filter((l: any) => l.ownerId === (isRequester ? trade.proposal.recipientId : trade.proposal.requesterId)) || [];

  // The requested listing (the item that started the trade)
  const requestedListing = trade?.requestedListing;

  // Calculate total values
  const myTotalValue = myItems.reduce((sum: number, l: any) => sum + parseFloat(l.estimatedValue || '0'), 0);
  const theirTotalValue = theirItems.reduce((sum: number, l: any) => sum + parseFloat(l.estimatedValue || '0'), 0) + parseFloat(requestedListing?.estimatedValue || '0');

  // Fairness calculation
  const totalValue = myTotalValue + theirTotalValue;
  const fairnessPercent = totalValue > 0 ? Math.round((myTotalValue / totalValue) * 100) : 50;

  // Handlers
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate({ proposalId, message: messageInput.trim() });
  };

  const handleAccept = () => {
    setShowContractModal(true);
    setContractCheckbox(false);
  };

  const confirmAccept = () => {
    if (!contractCheckbox) {
      toast.error('You must check the confirmation box before proceeding.');
      return;
    }
    setShowContractModal(false);
    acceptMutation.mutate({ proposalId });
  };

  const handleDecline = () => {
    setShowDeclineModal(true);
  };

  const confirmDecline = () => {
    declineMutation.mutate({ proposalId, reason: declineReason || undefined });
    setShowDeclineModal(false);
  };

  const handleSaveNote = () => {
    saveNoteMutation.mutate({ proposalId, noteContent: noteInput });
  };

  const handleAddItemToTrade = (itemId: number) => {
    if (selectedItemIds.includes(itemId)) {
      toast.error('Item already added to trade');
      return;
    }
    setSelectedItemIds(prev => [...prev, itemId]);
    toast.success('Item added to trade table!');
  };

  const handleRemoveItemFromTrade = (itemId: number) => {
    setSelectedItemIds(prev => prev.filter(id => id !== itemId));
  };

  const handleUpdateProposal = () => {
    if (selectedItemIds.length === 0 && !cashPay && !cashReceive) {
      toast.error('Please add at least one item or cash amount to your proposal.');
      return;
    }
    sendProposalMutation.mutate({
      proposalId,
      offeredListingIds: selectedItemIds,
      cashFromProposer: cashPay ? parseFloat(cashPay) : undefined,
      cashFromRecipient: cashReceive ? parseFloat(cashReceive) : undefined,
    });
  };

  if (tradeDetailsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a2a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (tradeDetailsQuery.error) {
    return (
      <div className="min-h-screen bg-[#0a0a2a] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 text-lg">Error loading trade</p>
          <p className="text-gray-400 mt-2">{tradeDetailsQuery.error.message}</p>
          <button onClick={() => navigate('/trade-hub')} className="mt-4 px-4 py-2 bg-purple-600 rounded">Back to Trade Hub</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a2a] flex flex-col">
      {/* Global Top Bar */}
      <TopBar logoUrl="/images/tradebilia-logo.svg" searchPlaceholder="Search Tradebilia..." />

      {/* Header: Progress Tracker */}
      <header className="bg-[#1a1a4a] border-b border-gray-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/trade-hub')} className="text-purple-400 hover:text-purple-300 text-sm">
              ← Back to Trade Hub
            </button>
            <span className="text-white font-mono font-bold">
              {trade?.proposal?.tradeReferenceNumber || `TR-${String(proposalId).padStart(6, '0')}`}
            </span>
          </div>
          
          {/* 5-Stage Progress Tracker */}
          <div className="flex items-center gap-1">
            {stages.map((stage, i) => (
              <div key={stage} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${
                  i === currentStageIndex ? 'bg-purple-500 ring-2 ring-purple-300' :
                  i < currentStageIndex ? 'bg-green-500' : 'bg-gray-600'
                }`} />
                <span className={`text-xs capitalize ${
                  i === currentStageIndex ? 'text-purple-300 font-medium' : i < currentStageIndex ? 'text-green-400' : 'text-gray-500'
                }`}>{stage}</span>
                {i < 4 && <span className="text-gray-600 mx-1">→</span>}
              </div>
            ))}
          </div>

          {/* Other user's online status */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-gray-300 text-sm">{otherUser?.displayName || otherUser?.username || 'Trade Partner'}</span>
          </div>
        </div>
      </header>

      {/* Main Content — Full Width (no sidebar per our discussion) */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-4 space-y-4">

        {/* Trade Table (Collapsible) */}
        <section className="bg-[#1a1a4a] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Trade Table</h2>
            <button
              onClick={() => setIsTableCollapsed(!isTableCollapsed)}
              className="text-gray-400 text-sm hover:text-white transition"
            >
              {isTableCollapsed ? '▼ Expand' : '▲ Collapse'}
            </button>
          </div>

          {!isTableCollapsed && (
            <div className="grid grid-cols-11 gap-4">
              {/* Your Side */}
              <div className="col-span-5 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-blue-400 text-sm font-semibold uppercase">Your Side</h3>
                  <span className="text-green-400 font-bold">${myTotalValue.toLocaleString()}</span>
                </div>
                {myItems.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">No items offered yet. Browse their inventory to add items.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {myItems.map((item: any) => (
                      <div key={item.id} className="bg-[#0a0a2a] rounded p-2 relative group">
                        {item.photos?.[0]?.imageUrl && (
                          <img src={item.photos[0].imageUrl} alt={item.title} className="w-full h-20 object-contain rounded mb-1" />
                        )}
                        <p className="text-white text-xs truncate">{item.title}</p>
                        <p className="text-green-400 text-xs">${parseFloat(item.estimatedValue || '0').toLocaleString()}</p>
                        <button onClick={() => handleRemoveItemFromTrade(item.id)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fairness Meter (Center) */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <div className="w-2 h-32 bg-gray-700 rounded-full relative overflow-hidden">
                  <div
                    className={`absolute bottom-0 w-full rounded-full transition-all ${fairnessPercent > 55 ? 'bg-green-500' : fairnessPercent < 45 ? 'bg-red-500' : 'bg-yellow-500'}`}
                    style={{ height: `${fairnessPercent}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 mt-2">{fairnessPercent}%</span>
                <span className="text-[10px] text-gray-500">Fair</span>
              </div>

              {/* Their Side */}
              <div className="col-span-5 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-orange-400 text-sm font-semibold uppercase">Their Side</h3>
                  <span className="text-green-400 font-bold">${theirTotalValue.toLocaleString()}</span>
                </div>
                {/* Always show the requested listing */}
                <div className="grid grid-cols-2 gap-2">
                  {requestedListing && (
                    <div className="bg-[#0a0a2a] rounded p-2">
                      {requestedListing.photos?.[0]?.imageUrl && (
                        <img src={requestedListing.photos[0].imageUrl} alt={requestedListing.title} className="w-full h-20 object-contain rounded mb-1" />
                      )}
                      <p className="text-white text-xs truncate">{requestedListing.title}</p>
                      <p className="text-green-400 text-xs">${parseFloat(requestedListing.estimatedValue || '0').toLocaleString()}</p>
                    </div>
                  )}
                  {theirItems.map((item: any) => (
                    <div key={item.id} className="bg-[#0a0a2a] rounded p-2">
                      {item.photos?.[0]?.imageUrl && (
                        <img src={item.photos[0].imageUrl} alt={item.title} className="w-full h-20 object-contain rounded mb-1" />
                      )}
                      <p className="text-white text-xs truncate">{item.title}</p>
                      <p className="text-green-400 text-xs">${parseFloat(item.estimatedValue || '0').toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Collapsed view — just totals */}
          {isTableCollapsed && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-400">Your Side: <span className="text-green-400 font-bold">${myTotalValue.toLocaleString()}</span></span>
              <span className="text-gray-500">vs</span>
              <span className="text-orange-400">Their Side: <span className="text-green-400 font-bold">${theirTotalValue.toLocaleString()}</span></span>
            </div>
          )}

          {/* Cash Fields */}
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div>
              <label className="text-green-400 text-xs font-medium">Cash You Receive</label>
              <input
                type="number"
                value={cashReceive}
                onChange={(e) => setCashReceive(e.target.value)}
                className="w-full bg-[#0a0a2a] border border-gray-600 rounded px-3 py-1.5 text-white mt-1 text-sm"
                placeholder="$0"
                min="0"
              />
            </div>
            <div>
              <label className="text-red-400 text-xs font-medium">Cash You Pay</label>
              <input
                type="number"
                value={cashPay}
                onChange={(e) => setCashPay(e.target.value)}
                className="w-full bg-[#0a0a2a] border border-gray-600 rounded px-3 py-1.5 text-white mt-1 text-sm"
                placeholder="$0"
                min="0"
              />
            </div>
          </div>
          {(cashReceive || cashPay) && (
            <p className="text-[10px] text-yellow-500 mt-2 italic">
              Tradebilia is a marketplace that brings collectors together. We are not liable for any cash transactions.
            </p>
          )}

          {/* AI Analyze Button */}
          <div className="mt-3 flex justify-end">
            <button
              className={`px-4 py-1.5 rounded text-sm font-medium ${
                myItems.length > 0 || theirItems.length > 0
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              disabled={myItems.length === 0 && theirItems.length === 0}
            >
              ✨ AI Analyze Trade
            </button>
          </div>
        </section>

        {/* Service & Trust Bar */}
        <section className="bg-[#1a1a4a] rounded-lg p-3 flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={middleManRequested}
              onChange={(e) => {
                setMiddleManRequested(e.target.checked);
                middleManMutation.mutate({
                  proposalId,
                  action: e.target.checked ? 'request' : 'deselect',
                });
              }}
              className="rounded border-gray-500"
            />
            <span>Middle Man Service</span>
          </label>
          <span className="text-gray-600">|</span>
          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded">eBay ✓</span>
          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded">Facebook ✓</span>
          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded">LinkedIn ✓</span>
          <button
            onClick={() => setIsInventoryOpen(!isInventoryOpen)}
            className="ml-auto px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
          >
            🔍 Browse Inventory
          </button>
        </section>

        {/* Chat & Timeline */}
        <section className="bg-[#1a1a4a] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Chat & Timeline</h3>
            <button
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="px-3 py-1 rounded bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition"
            >
              📝 Private Notes
            </button>
          </div>
          
          {/* Messages Area */}
          <div className="h-64 overflow-y-auto border border-gray-700 rounded-lg p-3 mb-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.messageType === 'system' ? 'justify-center' : ''}`}>
                  {msg.messageType === 'system' ? (
                    <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">{msg.message}</span>
                  ) : (
                    <div className={`max-w-[70%] ${msg.senderId === (isRequester ? trade?.proposal.requesterId : trade?.proposal.recipientId) ? 'ml-auto' : ''}`}>
                      <div className={`rounded-lg px-3 py-2 ${
                        msg.senderId === (isRequester ? trade?.proposal.requesterId : trade?.proposal.recipientId)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 px-1">
                        {msg.senderDisplayName || msg.senderUsername} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-[#0a0a2a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendMessageMutation.isPending}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          </div>
        </section>
      </div>

      {/* Shipping Stage Section — only visible when status is accepted or shipped */}
      {(currentStage === 'accepted' || currentStage === 'shipped') && (
        <div className="max-w-7xl mx-auto w-full px-6 pb-4">
          <section className="bg-[#1a1a4a] rounded-lg p-6">
            <h3 className="text-white font-semibold text-lg mb-4">📦 Shipping & Tracking</h3>
            <p className="text-gray-400 text-sm mb-4">Each trader pays their own shipping. Submit your tracking number below.</p>

            {/* Tracking Input */}
            <div className="grid grid-cols-12 gap-3 mb-4">
              <div className="col-span-3">
                <label className="text-gray-400 text-xs">Carrier</label>
                <select
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                  className="w-full bg-[#0a0a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm mt-1"
                >
                  <option value="USPS">USPS</option>
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DHL">DHL</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {trackingCarrier === 'Other' && (
                <div className="col-span-3">
                  <label className="text-gray-400 text-xs">Carrier Name</label>
                  <input
                    type="text"
                    value={trackingCarrierOther}
                    onChange={(e) => setTrackingCarrierOther(e.target.value)}
                    placeholder="Enter carrier name"
                    className="w-full bg-[#0a0a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm mt-1"
                  />
                </div>
              )}
              <div className={trackingCarrier === 'Other' ? 'col-span-4' : 'col-span-7'}>
                <label className="text-gray-400 text-xs">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full bg-[#0a0a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm mt-1"
                />
              </div>
              <div className="col-span-2 flex items-end">
                <button
                  onClick={() => {
                    if (!trackingNumber.trim()) { toast.error('Please enter a tracking number'); return; }
                    submitTrackingMutation.mutate({
                      proposalId,
                      trackingNumbers: [{
                        listingId: requestedListing?.id || 0,
                        carrier: trackingCarrier as any,
                        carrierOther: trackingCarrier === 'Other' ? trackingCarrierOther : undefined,
                        trackingNumber: trackingNumber.trim(),
                      }],
                    });
                  }}
                  disabled={submitTrackingMutation.isPending || !trackingNumber.trim()}
                  className="w-full px-3 py-2 rounded bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  {submitTrackingMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Footer Actions — Changes based on stage */}
      <footer className="bg-[#1a1a4a] border-t border-gray-700 px-6 py-3 sticky bottom-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {(currentStage === 'accepted' || currentStage === 'shipped') ? (
            /* Shipping Stage Footer */
            <>
              <button
                onClick={() => confirmReceiptMutation.mutate({ proposalId, confirmationType: 'received' })}
                disabled={confirmReceiptMutation.isPending}
                className="px-5 py-2 rounded bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition"
              >
                ✅ Items Received
              </button>
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => confirmReceiptMutation.mutate({ proposalId, confirmationType: 'damaged' })}
                  disabled={confirmReceiptMutation.isPending}
                  className="px-4 py-2 rounded bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 transition"
                >
                  ⚠️ Received but Damaged
                </button>
                <button
                  onClick={() => {
                    const desc = window.prompt('Describe the issue:');
                    if (desc) fileComplaintMutation.mutate({ proposalId, description: desc, complaintType: 'other' });
                  }}
                  className="text-gray-400 text-sm underline hover:text-white transition"
                >
                  File Complaint
                </button>
              </div>
            </>
          ) : (
            /* Negotiation Stage Footer */
            <>
              <button
                onClick={() => generateVotingLinkMutation.mutate({ proposalId })}
                disabled={generateVotingLinkMutation.isPending || (myItems.length === 0 && selectedItemIds.length === 0)}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  (myItems.length > 0 || selectedItemIds.length > 0) && (theirItems.length > 0 || requestedListing)
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {generateVotingLinkMutation.isPending ? 'Generating...' : '📢 Get Community Opinion'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  className="px-4 py-2 rounded bg-red-600/80 text-white text-sm font-medium hover:bg-red-600 transition"
                >
                  ❌ Decline
                </button>
                <button
                  onClick={handleUpdateProposal}
                  disabled={sendProposalMutation.isPending || (selectedItemIds.length === 0 && !cashPay && !cashReceive)}
                  className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendProposalMutation.isPending ? 'Saving...' : '💾 Update Proposal'}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="px-5 py-2 rounded bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition disabled:opacity-50"
                >
                  ✅ Accept Trade
                </button>
              </div>
            </>
          )}
        </div>
      </footer>

      {/* Trade Contract Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a4a] rounded-lg p-6 max-w-lg w-full mx-4 border border-purple-500/30">
            <h3 className="text-white font-bold text-xl mb-4 text-center">Trade Contract</h3>
            <p className="text-gray-300 text-sm mb-4 text-center">Please verify the final terms of this trade:</p>

            {/* Summary */}
            <div className="bg-[#0a0a2a] rounded-lg p-4 mb-4 space-y-3">
              <div>
                <span className="text-blue-400 text-xs font-semibold uppercase">You Give:</span>
                <div className="text-white text-sm mt-1">
                  {selectedItemIds.length > 0 ? `${selectedItemIds.length} item(s)` : 'No items'}
                  {cashPay && ` + $${parseFloat(cashPay).toLocaleString()} cash`}
                </div>
              </div>
              <div>
                <span className="text-orange-400 text-xs font-semibold uppercase">You Receive:</span>
                <div className="text-white text-sm mt-1">
                  {requestedListing?.title || 'Requested item'}
                  {theirItems.length > 0 && ` + ${theirItems.length} more item(s)`}
                  {cashReceive && ` + $${parseFloat(cashReceive).toLocaleString()} cash`}
                </div>
              </div>
            </div>

            {/* Cash disclaimer */}
            {(cashPay || cashReceive) && (
              <p className="text-yellow-500 text-xs italic mb-4">
                Tradebilia is a marketplace that brings collectors together. We are not liable for any trades, items, or cash transactions that go wrong. All trades are conducted at the sole risk of the participating collectors.
              </p>
            )}

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={contractCheckbox}
                onChange={(e) => setContractCheckbox(e.target.checked)}
                className="mt-0.5 rounded border-gray-500"
              />
              <span className="text-gray-300 text-sm">
                I understand that by confirming, I am locking in this trade. Items will be reserved and I commit to shipping within the agreed timeframe.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowContractModal(false)}
                className="px-4 py-2 rounded bg-gray-700 text-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmAccept}
                disabled={!contractCheckbox || acceptMutation.isPending}
                className="px-6 py-2 rounded bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {acceptMutation.isPending ? 'Processing...' : 'Confirm & Lock Trade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a4a] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-bold text-lg mb-3">Decline Trade</h3>
            <p className="text-gray-400 text-sm mb-4">Are you sure you want to decline this trade? You can optionally provide a reason.</p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining (optional)..."
              className="w-full bg-[#0a0a2a] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 text-sm mb-4 h-24 resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeclineModal(false)} className="px-4 py-2 rounded bg-gray-700 text-gray-300 text-sm">Cancel</button>
              <button onClick={confirmDecline} className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium">Confirm Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* Private Notes Slide-out Drawer */}
      {isNotesOpen && (
        <div className="fixed top-0 right-0 h-full w-80 bg-[#1a1a4a] border-l border-gray-700 z-40 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">📝 Private Notes</h3>
            <button onClick={() => setIsNotesOpen(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="flex-1 p-4">
            <p className="text-xs text-gray-500 mb-3">Only you can see these notes. Use them to plan your negotiation strategy.</p>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Write your private notes here..."
              className="w-full h-64 bg-[#0a0a2a] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 text-sm resize-none"
            />
          </div>
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleSaveNote}
              disabled={saveNoteMutation.isPending}
              className="w-full px-4 py-2 rounded bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {saveNoteMutation.isPending ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      )}

      {/* Inventory Browser Slide-out */}
      {isInventoryOpen && (
        <div className="fixed top-0 left-0 h-full w-96 bg-[#1a1a4a] border-r border-gray-700 z-40 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">🔍 Their Inventory</h3>
            <button onClick={() => setIsInventoryOpen(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          {/* Search */}
          <div className="p-3 border-b border-gray-700">
            <input
              type="text"
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              placeholder="Search items..."
              className="w-full bg-[#0a0a2a] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm"
            />
          </div>
          {/* Items */}
          <div className="flex-1 p-3 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-3">Click items to add them to the trade table.</p>
            {inventoryQuery.isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin inline-block w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                <p className="text-gray-400 text-sm mt-2">Loading inventory...</p>
              </div>
            ) : (inventoryQuery.data?.items?.length || 0) === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No items found in their inventory.</p>
            ) : (
              <div className="space-y-2">
                {(inventoryQuery.data?.items || []).map((item: any) => {
                  const isAlreadyAdded = selectedItemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAddItemToTrade(item.id)}
                      disabled={isAlreadyAdded}
                      className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition ${
                        isAlreadyAdded
                          ? 'bg-green-900/30 border border-green-600 cursor-default'
                          : 'bg-[#0a0a2a] hover:bg-[#2a2a5a] border border-gray-700 hover:border-purple-500 cursor-pointer'
                      }`}
                    >
                      {item.primaryImage ? (
                        <img src={item.primaryImage} alt={item.title} className="w-12 h-12 object-contain rounded flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-500 text-xs">No img</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-green-400 text-xs font-medium">
                            ${parseFloat(item.estimatedValue || '0').toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-xs capitalize">{item.category?.replace('_', ' ')}</span>
                        </div>
                      </div>
                      {isAlreadyAdded && (
                        <span className="text-green-400 text-xs font-medium flex-shrink-0">✓ Added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
