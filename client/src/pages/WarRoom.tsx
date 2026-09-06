/**
 * Trade Room — The dedicated negotiation page for a single trade.
 * Full-width layout (no sidebar) per our discussion.
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md (Page 2)
 */

import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/_core/hooks/useAuth";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { toast } from "sonner";
import { VideoChatPanel } from "@/components/VideoChatPanel";
import { getNegotiationTurnState } from "@/lib/tradeNegotiationTurn";
import { deriveShippingDeadline, downloadTradeReceipt } from "@/lib/tradeReceipt";
import { buildUspsTrackingUrl } from "@shared/uspsTrackingLink";
import { formatItemValue, formatWholeDollar } from "@/lib/tradebilia";
import { buildTradeProposalItemPayload } from "@/lib/tradeProposalItems";
import { getTradeProposalRevision, isIncomingProposalRevision } from "@/lib/tradeRoomSync";
import { getLockedShipmentItems } from "@/lib/shippingItems";

type TradeStage = 'proposed' | 'negotiating' | 'accepted' | 'shipping' | 'shipped' | 'review' | 'completed' | 'disputed';

function getStageFromStatus(status: string, reviewCount = 0): TradeStage {
  switch (status) {
    case 'pending': return 'proposed';       // Stage 1: initial inquiry
    case 'negotiating': return 'negotiating'; // Stage 2: proposals being exchanged
    case 'accepted': return 'accepted';       // Stage 3: review & finalize
    case 'shipping': return 'shipping';       // Stage 4: enter tracking numbers
    case 'shipped': return 'shipped';         // Stage 5: confirm receipt
        case 'completed': return reviewCount >= 2 ? 'completed' : 'review'; // Stage 6: mutual review, then completion
    case 'disputed':  return 'disputed';       // Conditional administrator dispute review

    default: return 'proposed';
  }
}

const formatTradeRoomDate = (value: unknown) => value ? new Date(String(value)).toLocaleString() : 'Not recorded';
const formatTradeRoomStatus = (status: unknown) => String(status ?? 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const stages: { key: TradeStage; label: string; sub: string }[] = [
  { key: 'proposed',    label: 'Propose',   sub: 'Trade Created'   },
  { key: 'negotiating', label: 'Negotiate', sub: 'Refine Details'  },
  { key: 'accepted',    label: 'Finalize',  sub: 'Finalize Terms'  },
  { key: 'shipping',    label: 'Shipping & Payment',  sub: 'Fulfill Agreement'  },
    { key: 'shipped',     label: 'Confirm',   sub: 'Confirm Receipt' },
  { key: 'review',      label: 'Review',   sub: 'Rate Your Trade'  },
  { key: 'completed',   label: 'Complete',  sub: 'Trade Complete'  },
];


function TradeRoomAvatar({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-md" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      <img src={src} alt={alt} className="relative z-10 h-full w-full object-fill" />
    </div>
  );
}

// ── Event type config ────────────────────────────────────────────────────────
const formatTimelineDetails = (event: any, fallbackLabel: string) => {
  if (event.eventType === 'cash_payment_method_selected') {
    try {
      const parsed = typeof event.details === 'string' ? JSON.parse(event.details) : event.details;
      const method = parsed?.method ? formatTradeRoomStatus(parsed.method) : 'payment method';
      return `Selected ${method} as payment method`;
    } catch {
      return 'Selected payment method';
    }
  }
  return event.details || fallbackLabel;
};

const eventConfig: Record<string, { color: string; icon: string; label: string }> = {
  trade_created:      { color: 'bg-blue-500',   icon: '🤝', label: 'Trade Created' },
  partner_joined:     { color: 'bg-indigo-500', icon: '🚪', label: 'Entered Trade Room' },
  item_added:         { color: 'bg-green-500',  icon: '➕', label: 'Item Added' },
  item_removed:       { color: 'bg-red-500',    icon: '➖', label: 'Item Removed' },
  cash_added:         { color: 'bg-emerald-500',icon: '💵', label: 'Cash Added' },
  cash_removed:       { color: 'bg-orange-500', icon: '💸', label: 'Cash Removed' },
  proposal_sent:      { color: 'bg-blue-400',   icon: '📤', label: 'Counter Offer Sent' },
  proposal_accepted:  { color: 'bg-green-400',  icon: '✅', label: 'Proposal Accepted' },
  proposal_declined:  { color: 'bg-red-400',    icon: '❌', label: 'Proposal Declined' },
  trade_cancelled:    { color: 'bg-gray-500',   icon: '🚫', label: 'Trade Cancelled' },
  tracking_submitted: { color: 'bg-yellow-500', icon: '📦', label: 'Tracking Submitted' },
  items_received:     { color: 'bg-teal-500',   icon: '📬', label: 'Items Received' },
  trade_completed:    { color: 'bg-purple-500', icon: '🏆', label: 'Trade Completed' },
  disputed:           { color: 'bg-red-500',    icon: '⚠️', label: 'Dispute Review Requested' },
  message_sent:       { color: 'bg-sky-400',    icon: '💬', label: 'Message Sent' },
  system_message:     { color: 'bg-slate-400',  icon: 'ℹ️', label: 'System Notice' },
};

function TimelineTab({ proposalId, adminView = false }: { proposalId: number; adminView?: boolean }) {
  const timelineQuery = trpc.tradeFlow.getTimeline.useQuery(
    { proposalId, adminView },
    { enabled: proposalId > 0, refetchInterval: 10000 }
  );
  const events: any[] = timelineQuery.data?.events || [];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <h3 className="text-white text-sm font-semibold mb-4">Trade Timeline</h3>
      {timelineQuery.isLoading && (
        <p className="text-gray-500 text-xs text-center py-4">Loading timeline...</p>
      )}
      {timelineQuery.isError && (
        <p className="text-red-300 text-xs text-center py-4">Timeline activity could not be loaded.</p>
      )}
      {!timelineQuery.isLoading && events.length === 0 && (
        <p className="text-gray-600 text-xs text-center py-8">No activity yet. Start negotiating!</p>
      )}
      <div className="space-y-4">
        {events.map((event: any, i: number) => {
          const cfg = eventConfig[event.eventType] || { color: 'bg-gray-500', icon: '•', label: event.eventType };
          const time = event.createdAt
            ? new Date(event.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '';
          return (
            <div key={event.id || i} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full ${cfg.color} mt-1.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold">{event.actorName}</p>
                <p className="text-gray-300 text-xs">{formatTimelineDetails(event, cfg.label)}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminReadOnlyTradeRoom({ trade, messages, proposalId, onBack }: { trade: any; messages: any[]; proposalId: number; onBack: () => void }) {
  const proposal = trade.proposal;
  const requester = trade.requesterUser || {};
  const recipient = trade.otherUser || {};
  const requestedListing = trade.requestedListing;
  const trackingNumbers = trade.trackingNumbers || [];
  const receiptConfirmations = trade.receiptConfirmations || [];
  const isCompleted = proposal.status === 'completed';
  const requesterItems = (trade.offeredListings || []).filter((item: any) => item.ownerId === proposal.requesterId);
  const recipientItems = [requestedListing, ...(trade.offeredListings || []).filter((item: any) => item.ownerId === proposal.recipientId)].filter(Boolean);
  const displayName = (person: any, fallback: string) => person.displayName || person.name || person.username || fallback;
  const itemCard = (item: any) => <div key={item.id} className="rounded-lg border border-gray-600 bg-[#0f0f1a] p-3"><p className="font-semibold text-white">{item.title || 'Untitled item'}</p><p className="mt-1 text-xs text-gray-400">{item.category || 'Uncategorized'} · {formatWholeDollar(Number(item.estimatedValue || 0))}</p></div>;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      <TopBar hideSearch />
      <div className="border-b border-amber-500/40 bg-amber-950/40 px-4 py-2 text-center text-xs font-semibold text-amber-200">Administrator read-only view — trade actions, messages, payments, and edits are disabled.</div>
      <main className="mx-auto max-w-6xl space-y-5 p-4 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs uppercase tracking-widest text-blue-300">Trade Room inspection</p><h1 className="mt-1 text-2xl font-black">{proposal.tradeReferenceNumber || `Trade #${proposalId}`}</h1><p className="mt-1 text-sm text-gray-400">Current stage: <span className="font-semibold text-white">{formatTradeRoomStatus(proposal.status)}</span></p>{isCompleted && <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-950/50 px-3 py-1.5 text-sm font-bold text-emerald-200"><span aria-hidden="true">✓</span> Completed deal</div>}</div>
          <button type="button" onClick={onBack} className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800">Back to Admin Trades</button>
        </div>
        <section className="grid gap-4 md:grid-cols-2">
          {[{ label: 'Requester', person: requester, items: requesterItems }, { label: 'Recipient', person: recipient, items: recipientItems }].map(({ label, person, items }) => <div key={label} className="rounded-xl border border-gray-600 bg-[#16213e] p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-sm font-bold">{person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" /> : displayName(person, label).charAt(0).toUpperCase()}</div><div><p className="text-xs uppercase tracking-wide text-gray-400">{label}</p><p className="font-bold">{displayName(person, label)}</p><p className="text-xs text-gray-500">User ID: {person.id || (label === 'Requester' ? proposal.requesterId : proposal.recipientId)}</p></div></div><div className="mt-4 space-y-2">{items.length ? items.map(itemCard) : <p className="text-sm text-gray-500">No items recorded for this side.</p>}</div></div>)}
        </section>
        <section className="rounded-xl border border-gray-600 bg-[#16213e] p-5"><h2 className="text-lg font-bold">Trade record</h2><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs uppercase text-gray-500">Created</p><p>{formatTradeRoomDate(proposal.createdAt)}</p></div><div><p className="text-xs uppercase text-gray-500">Updated</p><p>{formatTradeRoomDate(proposal.updatedAt)}</p></div><div><p className="text-xs uppercase text-gray-500">Last activity</p><p>{formatTradeRoomDate(proposal.lastActivityAt)}</p></div><div><p className="text-xs uppercase text-gray-500">Cash adjustment</p><p>{formatWholeDollar(Number(proposal.cashFromRequester || 0) + Number(proposal.cashFromRecipient || 0))}</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase text-gray-500">Member message</p><p className="mt-1 whitespace-pre-wrap rounded-lg border border-gray-700 bg-[#0f0f1a] p-3 text-sm text-gray-200">{proposal.note || proposal.initiatorMessage || 'No member message recorded.'}</p></div><div><p className="text-xs uppercase text-gray-500">Status reason</p><p className="mt-1 whitespace-pre-wrap rounded-lg border border-gray-700 bg-[#0f0f1a] p-3 text-sm text-gray-200">{proposal.declineReason || proposal.frozenReason || 'No status reason recorded.'}</p></div></div></section>
        <section className="rounded-xl border border-gray-600 bg-[#16213e] p-5"><h2 className="text-lg font-bold">Final fulfillment</h2><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs uppercase text-gray-500">Completed</p><p className="mt-1 font-semibold">{formatTradeRoomDate(proposal.completedAt)}</p></div><div><p className="text-xs uppercase text-gray-500">Shipping records</p><p className="mt-1 font-semibold">{trackingNumbers.length}</p></div><div><p className="text-xs uppercase text-gray-500">Receipt confirmations</p><p className="mt-1 font-semibold">{receiptConfirmations.length}</p></div><div><p className="text-xs uppercase text-gray-500">Final cash adjustment</p><p className="mt-1 font-semibold">{formatWholeDollar(Number(proposal.cashFromRequester || 0) + Number(proposal.cashFromRecipient || 0))}</p></div></div>{trackingNumbers.length > 0 && <div className="mt-4"><p className="text-xs uppercase text-gray-500">Shipment history</p><div className="mt-2 space-y-2">{trackingNumbers.map((tracking: any) => <div key={tracking.id} className="rounded-lg border border-gray-700 bg-[#0f0f1a] p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-white">{tracking.itemTitle || 'Trade item'} · {tracking.carrierOther || tracking.carrier || 'Carrier unavailable'}</span><span className="text-xs text-gray-400">{formatTradeRoomDate(tracking.submittedAt)}</span></div><p className="mt-1 text-gray-300">Tracking: {tracking.trackingNumber}</p></div>)}</div></div>}{receiptConfirmations.length > 0 && <div className="mt-4"><p className="text-xs uppercase text-gray-500">Receipt history</p><div className="mt-2 space-y-2">{receiptConfirmations.map((receipt: any) => <div key={`${receipt.userId}-${receipt.confirmedAt}`} className="flex flex-wrap justify-between gap-2 rounded-lg border border-gray-700 bg-[#0f0f1a] p-3 text-sm"><span className="text-gray-200">{receipt.userId === proposal.requesterId ? 'Requester' : 'Recipient'} · {receipt.confirmationType === 'damaged' ? 'Reported damaged' : 'Confirmed received'}</span><span className="text-xs text-gray-400">{formatTradeRoomDate(receipt.confirmedAt)}</span></div>)}</div></div>}</section>
        <section className="rounded-xl border border-gray-600 bg-[#16213e] p-5"><h2 className="text-lg font-bold">Trade messages</h2>{messages.length ? <div className="mt-3 space-y-2">{messages.map((message: any) => <div key={message.id} className="rounded-lg border border-gray-700 bg-[#0f0f1a] p-3"><div className="flex justify-between gap-3 text-xs text-gray-500"><span>{message.senderDisplayName || message.senderUsername || 'Member'}</span><span>{formatTradeRoomDate(message.createdAt)}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">{message.message || message.content}</p></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No messages recorded.</p>}</section>
      </main>
    </div>
  );
}

export default function WarRoom() {
  const params = useParams<{ proposalId: string }>();
  const [, navigate] = useLocation();
  const proposalId = Number(params.proposalId);
  const adminViewRequested = new URLSearchParams(window.location.search).get('adminView') === '1';
  const utils = trpc.useUtils();

  const [isTheirInventoryOpen, setIsTheirInventoryOpen] = useState(false);
  const [isMyInventoryOpen, setIsMyInventoryOpen] = useState(false);
  const [inventoryCategory, setInventoryCategory] = useState<string>('All');
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<number[]>([]);
  const [quickViewItemId, setQuickViewItemId] = useState<number | null>(null);
  // Pending items added locally before proposal is submitted
  const [pendingTheirItems, setPendingTheirItems] = useState<any[]>([]);
  const [pendingMyItems, setPendingMyItems] = useState<any[]>([]);
  // Track server-persisted items that the user has removed locally (before submitting)
  const [removedItemIds, setRemovedItemIds] = useState<number[]>([]);
  // Tracking number inputs for Stage 3
  const [trackingInputs, setTrackingInputs] = useState<{listingId: number; carrier: string; trackingNumber: string}[]>([]);
  const [confirmedTrackingIds, setConfirmedTrackingIds] = useState<number[]>([]);
  const [resetTrackingIds, setResetTrackingIds] = useState<number[]>([]);
  // Review/rating form for Stage 5
  const [reviewRatings, setReviewRatings] = useState({ tradeExperience: 0, itemCondition: 0, communication: 0, shippingSpeed: 0 });
  const [reviewText, setReviewText] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showVideoChatModal, setShowVideoChatModal] = useState(false);
  const [videoRoomUrl, setVideoRoomUrl] = useState<string | null>(null);
  const [videoRoomLoading, setVideoRoomLoading] = useState(false);
  const [videoBannerDismissed, setVideoBannerDismissed] = useState(false);
  const [videoStatusMessage, setVideoStatusMessage] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [contractCheckbox, setContractCheckbox] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [cashPay, setCashPay] = useState('');
  const [cashReceive, setCashReceive] = useState('');
  // Cash sweetener modal state
  const [showCashModal, setShowCashModal] = useState<'my' | 'their' | null>(null);
  const [cashInput, setCashInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'timeline'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Payment step state, kept separately for each payer obligation.
  const [transactionReferenceByPayer, setTransactionReferenceByPayer] = useState<Record<number, string>>({});
  const [incomingProposalNotice, setIncomingProposalNotice] = useState(false);
  const latestProposalRevisionRef = useRef<string | null>(null);

  // ── tRPC queries ──────────────────────────────────────────────────────────
  const tradeDetailsQuery = trpc.tradeFlow.getTradeDetails.useQuery(
    { proposalId, adminView: adminViewRequested },
    { enabled: proposalId > 0, refetchInterval: 10000 }
  );

  const messagesQuery = trpc.tradeFlow.getMessages.useQuery(
    { proposalId, limit: 100, offset: 0, adminView: adminViewRequested },
    { enabled: proposalId > 0, refetchInterval: 5000 }
  );

  // Their inventory (browse what they have to request)
  // Always fetch ALL items — category/search filtering is done client-side
  const theirInventoryQuery = trpc.tradeFlow.getOtherUserInventory.useQuery(
    { proposalId },
    { enabled: proposalId > 0 && isTheirInventoryOpen }
  );

  // My own inventory for the "Add from Your Inventory" modal
  const myDashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isMyInventoryOpen,
    staleTime: 30000,
  });

  // Quick View: fetch full listing detail for the selected item
  const quickViewQuery = trpc.market.listingDetail.useQuery(
    { listingId: quickViewItemId! },
    { enabled: quickViewItemId !== null, staleTime: 60000 }
  );

  // ── tRPC mutations ────────────────────────────────────────────────────────
  const sendMessageMutation = trpc.tradeFlow.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput('');
      utils.tradeFlow.getMessages.invalidate({ proposalId });
    },
    onError: (err) => toast.error(err.message),
  });

  const sendProposalMutation = trpc.tradeFlow.sendTradeProposal.useMutation({
    onSuccess: () => {
      toast.success('Proposal sent!');
      utils.tradeFlow.getTradeDetails.invalidate({ proposalId });
      // Clear pending/removed items — they'll now come from the server
      setPendingMyItems([]);
      setPendingTheirItems([]);
      setRemovedItemIds([]);
      setCashPay('');
      setCashReceive('');
      void utils.payment.getCashAdjustmentContext.invalidate({ proposalId });
    },
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

  const disputeMutation = trpc.tradeFlow.markTradeDisputed.useMutation({
    onSuccess: async (data) => {
      setShowDisputeModal(false);
      await utils.tradeFlow.getTradeDetails.invalidate({ proposalId });
      await utils.tradeFlow.getTimeline.invalidate({ proposalId });
      toast.success(data.alreadyDisputed ? 'This trade is already under dispute review.' : 'Trade marked disputed. Please complete the report with supporting details.');
    },
    onError: (error) => toast.error(error.message),
  });

  const declineMutation = trpc.tradeFlow.declineTradeProposal.useMutation({
    onSuccess: () => { toast.success('Trade declined.'); navigate('/trade-hub'); },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.tradeFlow.cancelTrade.useMutation({
    onSuccess: () => { toast.success('Trade cancelled.'); navigate('/trade-hub'); },
    onError: (err) => toast.error(err.message),
  });

  const submitTrackingMutation = trpc.tradeFlow.submitTrackingNumbers.useMutation({
    onSuccess: () => {
      toast.success('Tracking information submitted!');
      utils.tradeFlow.getTradeDetails.invalidate({ proposalId });
      setTrackingInputs([]);
      setConfirmedTrackingIds([]);
      setResetTrackingIds([]);
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmReceiptMutation = trpc.tradeFlow.confirmItemsReceived.useMutation({
    onSuccess: () => {
      toast.success('Receipt confirmed!');
      utils.tradeFlow.getTradeDetails.invalidate({ proposalId });
    },
    onError: (err) => toast.error(err.message),
  });

  const proceedToShippingMutation = trpc.tradeFlow.proceedToShipping.useMutation({
    onSuccess: () => {
      toast.success('Proceeding to Shipping stage!');
      utils.tradeFlow.getTradeDetails.invalidate({ proposalId });
    },
    onError: (err) => toast.error(err.message),
  });

  const leaveReviewMutation = trpc.tradeFlow.leaveTradeReview.useMutation({
    onSuccess: () => {
      toast.success('Review submitted! Thank you. Redirecting to Trade Hub...');
      utils.tradeFlow.getTradeDetails.invalidate({ proposalId });
      setTimeout(() => navigate('/trade-hub'), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  const markAlertsAsReadMutation = trpc.tradeFlow.markAlertsAsRead.useMutation({
    onSuccess: () => {
      // Invalidate the unread count so the bell badge updates immediately
      utils.tradeFlow.getUnreadTradeAlertCount.invalidate();
    },
  });

  const getOrCreateVideoRoomMutation = trpc.tradeFlow.getOrCreateVideoRoom.useMutation();
  const analyzeTradeWithAIMutation = trpc.tradeFlow.analyzeTradeWithAI.useMutation();
  const dismissVideoCallMutation = trpc.tradeFlow.dismissVideoCall.useMutation();
  const endVideoCallMutation = trpc.tradeFlow.endVideoCall.useMutation();
  const joinVideoCallMutation = trpc.tradeFlow.joinVideoCall.useMutation();
  // External cash-adjustment step. Identifiers are returned only to accepted-trade participants who owe cash.
  const cashAdjustmentContextQuery = trpc.payment.getCashAdjustmentContext.useQuery(
    { proposalId },
    { enabled: proposalId > 0 && !adminViewRequested, refetchInterval: 10000, refetchOnWindowFocus: true }
  );
  const invalidateCashAdjustment = () => {
    void cashAdjustmentContextQuery.refetch();
    void utils.tradeFlow.getTradeDetails.invalidate({ proposalId });
    void utils.tradeFlow.getTimeline.invalidate({ proposalId });
  };
  const selectCashAdjustmentMethodMutation = trpc.payment.selectCashAdjustmentMethod.useMutation({ onSuccess: () => { toast.success('Payment method selected for this trade.'); invalidateCashAdjustment(); }, onError: (err) => toast.error(err.message) });
  const markCashAdjustmentSentMutation = trpc.payment.markCashAdjustmentSent.useMutation({ onSuccess: () => { toast.success('Marked as sent. Your trade partner must confirm receipt.'); invalidateCashAdjustment(); }, onError: (err) => toast.error(err.message) });
  const confirmCashAdjustmentReceivedMutation = trpc.payment.confirmCashAdjustmentReceived.useMutation({ onSuccess: () => { toast.success('Receipt confirmed.'); invalidateCashAdjustment(); }, onError: (err) => toast.error(err.message) });

  // ── Effects ───────────────────────────────────────────────────────────────
  // Mark alerts as read when entering the Trade Room; do NOT auto-transition stage
  useEffect(() => {
    if (proposalId > 0 && !adminViewRequested) {
      markAlertsAsReadMutation.mutate({ proposalId });
    }
  }, [proposalId]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const { user: currentUser } = useAuth();
  const isAdminReadOnly = adminViewRequested && currentUser?.role === 'admin';
  const trade = tradeDetailsQuery.data;
  const hasOfferedItems = (trade?.offeredListings?.length ?? 0) > 0;
  const currentStage = trade ? getStageFromStatus(trade.proposal.status, Number((trade as any).reviewCount ?? 0)) : 'proposed';
  const visibleStages = currentStage === 'disputed' ? [...stages, { key: 'disputed' as const, label: 'Disputed', sub: 'Under Review' }] : stages;
  const currentStageIndex = visibleStages.findIndex(s => s.key === currentStage);
  const isRequester = trade?.isRequester ?? false;
  const otherUser = trade?.otherUser;
  const messages = (messagesQuery.data?.messages || []) as any[];
  const myReview = (trade as any)?.myReview || null;

  // Reset dismissed state when a new call is started (dailyRoomStartedBy changes)
  const dailyRoomStartedBy = (trade?.proposal as any)?.dailyRoomStartedBy;
  useEffect(() => {
    if (!dailyRoomStartedBy) {
      // Call was dismissed or ended — reset buttons and close panel for everyone
      setVideoBannerDismissed(true);
      setShowVideoChatModal(false);
      setVideoRoomUrl(null);
    } else if (dailyRoomStartedBy !== myUserId) {
      // A new call was started by the other user — show the join buttons
      setVideoBannerDismissed(false);
    }
  }, [dailyRoomStartedBy]);

  // Watch messages for a video call decline and show it next to the Video Chat button
  // (must be after messages declaration)
  useEffect(() => {
    if (!messages.length) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg?.messageType === 'system' &&
      typeof lastMsg?.message === 'string' &&
      lastMsg.message.includes('declined the video call')
    ) {
      setVideoStatusMessage('Call declined');
      const timer = setTimeout(() => setVideoStatusMessage(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [messages]);
  const myUserId = trade ? (isAdminReadOnly ? trade.proposal.requesterId : (isRequester ? trade.proposal.requesterId : trade.proposal.recipientId)) : null;
  const partnerHasAccepted = (trade as any)?.partnerHasAccepted ?? false;
  const myHasAccepted = (trade as any)?.myHasAccepted ?? false;

  // The persisted last proposal determines whose turn it is. Local edits only
  // affect whether the current proposal can be accepted, not the responder turn.
  const lastProposedBy = (trade?.proposal as any)?.lastProposedBy;

  // Current user display info
  const adminRequester = isAdminReadOnly ? (trade as any)?.requesterUser : null;
  const myDisplayName = adminRequester?.displayName || adminRequester?.name || adminRequester?.username || (currentUser as any)?.displayName || currentUser?.name || currentUser?.username || 'You';
  const myAvatarUrl = adminRequester?.avatarUrl || ((currentUser as any)?.avatarUrl || null);
  const myInitial = myDisplayName.charAt(0).toUpperCase();

  // Other user display info
  const theirDisplayName = otherUser?.displayName || otherUser?.username || 'Trade Partner';
  const theirAvatarUrl = otherUser?.avatarUrl || null;
  const theirInitial = theirDisplayName.charAt(0).toUpperCase();

  // ── Sides logic ───────────────────────────────────────────────────────────
  // requestedListing = the item that was originally requested (owned by recipient)
  // If I am the requester:  requestedListing → Their Side (they own it)
  // If I am the recipient:  requestedListing → My Side (I own it)
  const requestedListing = trade?.requestedListing;

  // offeredListings are items added to the trade by both parties
  const myOfferedItems = trade?.offeredListings?.filter(
    (l: any) => l.ownerId === myUserId
  ) || [];
  const theirOfferedItems = trade?.offeredListings?.filter(
    (l: any) => l.ownerId !== myUserId
  ) || [];

  // Build the full "my side" and "their side" arrays
  // Merge server items with locally pending items (added but not yet submitted)
  // Also filter out items the user has locally removed (before submitting counter offer)
  const removedSet = new Set(removedItemIds);
  const serverMyItems: any[] = (isRequester
    ? myOfferedItems
    : [requestedListing, ...myOfferedItems].filter(Boolean)
  ).filter((i: any) => !removedSet.has(i?.id));

  const serverTheirItems: any[] = (isRequester
    ? [requestedListing, ...theirOfferedItems].filter(Boolean)
    : theirOfferedItems
  ).filter((i: any) => !removedSet.has(i?.id));

  // Merge pending items (deduplicate by id)
  const existingIds = new Set([...serverMyItems, ...serverTheirItems].map((i: any) => i?.id).filter(Boolean));
  const myItems: any[] = [
    ...serverMyItems,
    ...pendingMyItems.filter(i => !existingIds.has(i.id)),
  ];
  const theirItems: any[] = [
    ...serverTheirItems,
    ...pendingTheirItems.filter(i => !existingIds.has(i.id)),
  ];
  const hasIncomingPhysicalItems = theirItems.length > 0;

  const storedShippingDeadline = (trade?.proposal as any)?.shippingDeadline;
  const shippingDeadline = deriveShippingDeadline(
    storedShippingDeadline,
    (trade?.proposal as any)?.shippingAt || (trade?.proposal as any)?.acceptedAt,
  );
  const receiptAvailable = Boolean(trade && ['accepted', 'shipping', 'shipped', 'completed', 'disputed'].includes(currentStage));
  const canReportTradeIssue = Boolean(receiptAvailable && otherUser?.id);
  const canRequestDisputeReview = Boolean(receiptAvailable && currentStage !== 'disputed');
  const openTradeIssueReport = () => {
    if (!otherUser?.id) return;
    const query = new URLSearchParams({
      reportedUserId: String(otherUser.id),
      member: otherUser.username || theirDisplayName,
      reference: (trade?.proposal as any)?.tradeReferenceNumber || `Proposal #${proposalId}`,
      tradeIssue: '1',
    });
    navigate(`/report-user?${query.toString()}`);
  };

  // Cash sweeteners — from server (already submitted) + local pending (not yet submitted)
  // Perspective-aware: if I am the requester, MY cash = cashFromRequester; if I am the recipient, MY cash = cashFromRecipient
  const serverMyCash = isRequester
    ? parseFloat((trade?.proposal as any)?.cashFromRequester || '0') || 0
    : parseFloat((trade?.proposal as any)?.cashFromRecipient || '0') || 0;
  const serverTheirCash = isRequester
    ? parseFloat((trade?.proposal as any)?.cashFromRecipient || '0') || 0
    : parseFloat((trade?.proposal as any)?.cashFromRequester || '0') || 0;
  // Local pending cash (entered but not yet submitted)
  // cashPay/cashReceive = '' means "not touched"; '0' means "user explicitly cleared it"
  const cashPayTouched = cashPay !== '';
  const cashReceiveTouched = cashReceive !== '';
  const localMyCash = cashPayTouched ? (parseFloat(cashPay) || 0) : serverMyCash;
  const localTheirCash = cashReceiveTouched ? (parseFloat(cashReceive) || 0) : serverTheirCash;
  // Use local if touched, otherwise fall back to server value
  const myCash = cashPayTouched ? localMyCash : serverMyCash;
  const theirCash = cashReceiveTouched ? localTheirCash : serverTheirCash;
  const cashAdjustmentContext = cashAdjustmentContextQuery.data as any;
  const sharedPaymentMethods = (cashAdjustmentContext?.sharedMethods ?? []) as Array<{ method: string; label: string }>;
  const partnerPaymentMethods = (cashAdjustmentContext?.partnerMethods ?? []) as Array<{ method: string; label: string }>;
  const getAcceptedCashMethodLabel = (payerId?: number | null) => {
    const paymentMethod = (cashAdjustmentContext?.obligations ?? []).find((obligation: any) => String(obligation.payerId) === String(payerId ?? ''))?.payment?.paymentMethod;
    return paymentMethod
      ? String(paymentMethod).replace('_', ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())
      : 'Selected Direct Method';
  };
  const partnerPaymentMethodLabels = partnerPaymentMethods.map((method) => method.label).join(", ");
  const hasSharedPaymentMethod = sharedPaymentMethods.length > 0;
  const paymentMethodMismatchMessage = partnerPaymentMethodLabels
    ? `${theirDisplayName} currently accepts ${partnerPaymentMethodLabels}. Add a matching payment method in your Profile, or discuss another payment option with ${theirDisplayName} before including cash.`
    : `${theirDisplayName} has not enabled a direct cash payment method. Add matching payment methods in Profile, or discuss another payment option with ${theirDisplayName} before including cash.`;

  // Detect if the user has made ANY local modifications to the trade
  // (adding/removing items, changing cash) — if so, they can't accept the current proposal
  const hasLocalChanges = (
    pendingMyItems.length > 0 ||
    pendingTheirItems.length > 0 ||
    removedItemIds.length > 0 ||
    (cashPayTouched && localMyCash !== serverMyCash) ||
    (cashReceiveTouched && localTheirCash !== serverTheirCash)
  );

  const negotiationTurn = getNegotiationTurnState({
    currentStage,
    lastProposedBy,
    myUserId,
    isRequester,
    hasLocalChanges,
  });
  const iCanAccept = negotiationTurn.canAcceptCurrentProposal;
  const canSubmitProposal = negotiationTurn.canSubmitProposal && !incomingProposalNotice;
  const proposalRevision = getTradeProposalRevision(trade?.proposal as any);

  const loadIncomingProposalTerms = () => {
    setPendingMyItems([]);
    setPendingTheirItems([]);
    setRemovedItemIds([]);
    setSelectedItemIds([]);
    setCashPay('');
    setCashReceive('');
    setIncomingProposalNotice(false);
    void tradeDetailsQuery.refetch();
    toast.success('Loaded your trade partner’s latest proposal.');
  };

  useEffect(() => {
    if (!proposalRevision || !myUserId) return;
    const previousRevision = latestProposalRevisionRef.current;
    latestProposalRevisionRef.current = proposalRevision;
    if (!isIncomingProposalRevision({
      previousRevision,
      nextRevision: proposalRevision,
      lastProposedBy,
      myUserId,
      isNegotiating: currentStage === 'proposed' || currentStage === 'negotiating',
    })) {
      return;
    }

    if (hasLocalChanges) {
      setIncomingProposalNotice(true);
      return;
    }

    toast.info(`${theirDisplayName} sent a new proposal. The Trade Room has been refreshed.`);
  }, [proposalRevision, lastProposedBy, myUserId, currentStage, hasLocalChanges, theirDisplayName]);

  // Calculate total values (items + cash)
  const myItemsValue = myItems.reduce((sum: number, l: any) => sum + parseFloat(l?.estimatedValue || '0'), 0);
  const theirItemsValue = theirItems.reduce((sum: number, l: any) => sum + parseFloat(l?.estimatedValue || '0'), 0);
  const myTotalValue = myItemsValue + myCash;
  const theirTotalValue = theirItemsValue + theirCash;

  const downloadCurrentReceipt = () => {
    if (!trade || !receiptAvailable) return;
    downloadTradeReceipt({
      tradeReference: (trade.proposal as any)?.tradeReferenceNumber || `TR-${proposalId}`,
      status: currentStage,
      createdAt: (trade.proposal as any)?.createdAt,
      acceptedAt: (trade.proposal as any)?.acceptedAt,
      shippingDeadline,
      mySide: {
        name: myDisplayName,
        contactName: (trade as any)?.myContactInfo?.contactFullName,
        items: myItems,
        cash: serverMyCash,
        tracking: ((trade as any)?.trackingNumbers || []).filter((entry: any) => entry.userId === myUserId),
      },
      theirSide: {
        name: theirDisplayName,
        contactName: (trade as any)?.theirContactInfo?.contactFullName,
        items: theirItems,
        cash: serverTheirCash,
        tracking: ((trade as any)?.trackingNumbers || []).filter((entry: any) => entry.userId !== myUserId),
      },
    });
    toast.success("Trade receipt downloaded.");
  };

  // Fairness calculation
  // "In your favor" = you RECEIVE more than you GIVE (their side is worth more)
  // Meter: LEFT = You Favor, CENTER = Fair, RIGHT = They Favor
  // Slider moves LEFT when their side is worth more (you get the better deal)
  const totalValue = myTotalValue + theirTotalValue;
  const bothSidesHaveItems = myTotalValue > 0 && theirTotalValue > 0; // includes cash
  // theirSharePercent: % of total value on their side (= what you receive)
  const theirSharePercent = bothSidesHaveItems ? Math.round((theirTotalValue / totalValue) * 100) : 50;
  // sliderPos: 0% = far left (You Favor), 100% = far right (They Favor)
  // Their share high → you favor → slider LEFT → sliderPos = 100 - theirShare
  const sliderPos = 100 - theirSharePercent;
  // Display percentage = what % of total value you are RECEIVING
  const displayPercent = theirSharePercent;
  // imbalancePercent = how far the deal is from 50/50, from the perspective of who benefits
  // e.g. you give $8100, receive $1650 → myShare=83%, imbalance=83% in their favor
  const myShareOfTotal = 100 - theirSharePercent; // % of total value YOU give away
  const imbalancePercent = Math.abs(myShareOfTotal - 50) + 50; // how dominant the bigger side is
  const fairnessLabel = !bothSidesHaveItems ? 'Add items to both sides to calculate' :
                        myShareOfTotal > 55 ? `In their favor` :
                        myShareOfTotal < 45 ? `In your favor` : 'Roughly fair';

  // ── Dynamic item layout helpers ──────────────────────────────────────────
  // Returns Tailwind grid-cols class based on item count
  const getGridCols = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-3';
  };

  // Returns Tailwind image height class based on item count
  // 1 item = very tall, more items = progressively shorter
  const getImgHeight = (count: number) => {
    if (count === 1) return 'h-72 sm:h-96 lg:h-[24rem]'; // single item fills its proposal side before the grid becomes multi-item
    if (count === 2) return 'h-48';   // ~192px
    if (count <= 4) return 'h-36';   // ~144px
    if (count <= 6) return 'h-28';   // ~112px
    return 'h-20';                    // ~80px for 7+
  };

  const getItemCardSpacing = (count: number) => count === 1 ? 'min-h-[31rem] p-4' : 'p-2.5';
  const getItemTitleClass = (count: number) => count === 1
    ? 'text-base font-semibold leading-snug line-clamp-3'
    : 'text-[11px] font-medium leading-tight line-clamp-2';
  const getItemValueClass = (count: number) => count === 1
    ? 'text-xl font-black mt-2'
    : 'text-sm font-bold mt-1';

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  const confirmDecline = () => {
    declineMutation.mutate({ proposalId, reason: declineReason || undefined });
    setShowDeclineModal(false);
  };

  const handleAddItemToTrade = (itemId: number, itemData?: any) => {
    if (itemId === requestedListing?.id) {
      toast.error('The original requested item is already in this trade.');
      return;
    }
    if (selectedItemIds.includes(itemId)) {
      toast.error('Item already in trade');
      return;
    }
    setSelectedItemIds(prev => [...prev, itemId]);
    // Add to the correct side immediately. Items owned by the acting member
    // are offers; counterparty-owned items are additional requests.
    if (itemData) {
      if (itemData.ownerId === myUserId) {
        setPendingMyItems(prev => [...prev.filter(i => i.id !== itemId), itemData]);
      } else {
        setPendingTheirItems(prev => [...prev.filter(i => i.id !== itemId), itemData]);
      }
    }
    toast.success('Item added to trade table!');
  };

  const handleRemoveItemFromTrade = (itemId: number) => {
    setSelectedItemIds(prev => prev.filter(id => id !== itemId));
    setPendingMyItems(prev => prev.filter(i => i.id !== itemId));
    setPendingTheirItems(prev => prev.filter(i => i.id !== itemId));
    // If this is a server-persisted item, track it as removed so it's excluded on submit
    const isServerItem = itemId === requestedListing?.id || (trade?.offeredListings || []).some((l: any) => l.id === itemId);
    if (isServerItem) {
      setRemovedItemIds(prev => [...prev, itemId]);
    }
  };

  const handleUpdateProposal = () => {
    const { offeredListingIds, requestedListingIds } = buildTradeProposalItemPayload({
      myOfferedItems,
      theirOfferedItems,
      pendingMyItems,
      pendingTheirItems,
      removedItemIds,
      originalRequestedListingId: requestedListing?.id,
    });
    const allItemIds = [...offeredListingIds, ...requestedListingIds];

    if (allItemIds.length === 0 && !cashPay && !cashReceive && serverMyCash === 0 && serverTheirCash === 0) {
      toast.error('Please add at least one item or cash amount to your proposal.');
      return;
    }
    sendProposalMutation.mutate({
      proposalId,
      offeredListingIds,
      requestedListingIds,
      includeOriginalRequestedListing: requestedListing?.id ? !removedItemIds.includes(requestedListing.id) : false,
      cashFromProposer: cashPay ? parseFloat(cashPay) : (serverMyCash > 0 ? serverMyCash : undefined),
      cashFromRecipient: cashReceive ? parseFloat(cashReceive) : (serverTheirCash > 0 ? serverTheirCash : undefined),
    });
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  if (tradeDetailsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (tradeDetailsQuery.error) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 text-lg">Error loading trade</p>
          <p className="text-gray-400 mt-2">{tradeDetailsQuery.error.message}</p>
          <button onClick={() => navigate('/trade-hub')} className="mt-4 px-4 py-2 bg-blue-600 rounded">
            Back to Trade Hub
          </button>
        </div>
      </div>
    );
  }

  if (isAdminReadOnly && trade) {
    return <AdminReadOnlyTradeRoom trade={trade} messages={messages} proposalId={proposalId} onBack={() => navigate('/admin')} />;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="trade-room-shell flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#0f0f1a]">
      {/* Top Bar — compact mode (no search) */}
      <TopBar hideSearch />
      {isAdminReadOnly && (
        <div className="border-b border-amber-500/40 bg-amber-950/40 px-4 py-2 text-center text-xs font-semibold text-amber-200">
          Administrator read-only view — trade actions, messages, payments, and edits are disabled.
        </div>
      )}

      {/* Progress Tracker Header */}
      <header className="border-b border-gray-600 bg-[#16213e] px-4 py-3 lg:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Left: Trade ID */}
          <div className="flex min-w-0 items-center gap-3 xl:min-w-[200px]">
            <span className="text-gray-400 text-sm">Trade ID:</span>
            <span className="text-white font-mono text-sm font-bold">
              {trade?.proposal?.tradeReferenceNumber || `#TB-${String(proposalId).padStart(5, '0')}`}
            </span>
          </div>

          {/* Center: trade progress tracker; dispute is appended only when applicable */}
          <div className="flex min-w-max items-center overflow-x-auto pb-2 lg:pb-0">
            {visibleStages.map((stage, i) => (
              <div key={stage.key} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i === currentStageIndex
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                      : i < currentStageIndex
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-gray-800 text-gray-600'
                  }`}>{i + 1}</div>
                  <div>
                    <p className={`text-sm font-semibold leading-tight ${
                      i === currentStageIndex ? 'text-white' : i < currentStageIndex ? 'text-gray-400' : 'text-gray-600'
                    }`}>{stage.label}</p>
                    <p className={`text-[10px] leading-tight ${
                      i === currentStageIndex ? 'text-blue-300' : 'text-gray-600'
                    }`}>{stage.sub}</p>
                  </div>
                </div>
                {i < visibleStages.length - 1 && (
                  <div className={`w-12 h-px mx-3 border-t border-dashed ${
                    i < currentStageIndex ? 'border-gray-500' : 'border-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Right: Leave + Settings */}
          <div className="flex min-w-0 items-center gap-3 xl:min-w-[200px] xl:justify-end">
            <button
              onClick={() => navigate('/trade-hub')}
              className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Leave Trade Room
            </button>

          </div>
        </div>
      </header>

      {/* Main Layout: Trade Table (left) + Chat/Timeline (right) */}
      <div className="trade-room-workspace flex min-h-0 flex-1 flex-col overflow-visible">

        {/* Center: Trade Table or Post-Acceptance View */}
        <div className="trade-room-content flex flex-1 flex-col overflow-visible p-4 custom-scrollbar">
          {incomingProposalNotice && (
            <div data-testid="incoming-proposal-notice" className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.12)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Your trade partner sent updated terms.</p>
                <p className="mt-0.5 text-xs text-amber-100/80">Your unsent changes are protected. Load their proposal when you are ready to review it.</p>
              </div>
              <button type="button" onClick={loadIncomingProposalTerms} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-300 active:scale-[0.97]">
                Load Updated Terms
              </button>
            </div>
          )}

          {/* ── STAGE 3+: Review / Shipping / Confirm / Completed ── */}
          {(currentStage === 'accepted' || currentStage === 'shipping' || currentStage === 'shipped' || currentStage === 'review' || currentStage === 'completed') && (() => {
            const allItems = [...myItems, ...theirItems];
            const myTracking = (trade?.trackingNumbers || []).filter((t: any) => t.userId === myUserId);
            const theirTracking = (trade?.trackingNumbers || []).filter((t: any) => t.userId !== myUserId);
            const tradeItemTitleById = new Map([...myItems, ...theirItems].map((item: any) => [Number(item.id), item.title]));
            const getTrackingItemTitle = (tracking: any) => tracking.itemTitle || tradeItemTitleById.get(Number(tracking.listingId)) || 'Trade item';
            const myContact = (trade as any)?.myContactInfo;
            const theirContact = (trade as any)?.theirContactInfo;
            const myReceiptConfirmed = (trade as any)?.myReceiptConfirmed;
            const theirReceiptConfirmed = (trade as any)?.theirReceiptConfirmed;
            const cashReceiptObligations = ((cashAdjustmentContext?.obligations ?? []) as Array<any>).filter((obligation) => obligation.role === 'payee');

            const getTrackingUrl = (carrier: string, number: string) => {
              if (carrier === 'USPS') return buildUspsTrackingUrl(number);
              if (carrier === 'UPS') return `https://www.ups.com/track?tracknum=${number}`;
              if (carrier === 'FedEx') return `https://www.fedex.com/fedextrack/?trknbr=${number}`;
              if (carrier === 'DHL') return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${number}`;
              return null;
            };

            const acceptedAt = (trade?.proposal as any)?.acceptedAt;
            const acceptedDate = acceptedAt ? new Date(acceptedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
            const myReviewHasSingleItem = myItems.length === 1;
            const theirReviewHasSingleItem = theirItems.length === 1;
            const tradeRef = (trade?.proposal as any)?.tradeReferenceNumber || `#TB-${String(proposalId).padStart(5, '0')}`;

            return (
              <div className="flex flex-col gap-4 flex-1">

                {/* TRADE ACCEPTED Banner */}
                <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/30 border border-green-500/40 rounded-xl p-5 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-green-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-green-300 text-xl font-black uppercase tracking-widest">Trade Accepted</h1>
                        <p className="text-green-400/70 text-xs mt-0.5">Both parties have agreed. Items are locked.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-mono font-bold text-lg">{tradeRef}</p>
                      {acceptedDate && <p className="text-gray-400 text-xs mt-0.5">Accepted on {acceptedDate}</p>}
                    </div>
                  </div>
                </div>

                {/* Trade Summary Card — hidden on Shipping stage */}
                {currentStage !== 'shipping' && <div className="bg-[#16213e] border border-gray-600 rounded-xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white font-bold text-lg">Items Being Traded</h2>
                    <span className="px-3 py-1 bg-green-900/30 border border-green-500/30 text-green-400 text-xs font-bold rounded-full">LOCKED</span>
                  </div>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
                    {/* Your Items */}
                    <div className={`flex-1 space-y-2 ${myReviewHasSingleItem ? 'lg:min-w-0' : ''}`}>
                      <div className="flex items-center gap-2 mb-3">
                        {myAvatarUrl ? <TradeRoomAvatar src={myAvatarUrl} alt="" className="h-6 w-6 rounded-full bg-slate-800" /> : <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">{myInitial}</div>}
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-wide">{myDisplayName}</p>
                      </div>
                      {myItems.map((item: any) => (
                        <div key={item.id} className={`flex gap-3 bg-[#0f0f1a] border border-gray-700 rounded-lg ${myReviewHasSingleItem ? 'flex-col p-4' : 'items-center p-2'}`}>
                          {item.photos?.[0]?.imageUrl
                            ? <img src={item.photos[0].imageUrl} className={`${myReviewHasSingleItem ? 'w-full h-72' : 'w-28 h-28'} object-contain rounded-lg bg-[#0a0a1a] shrink-0`} alt={item.title} />
                            : <div className={`${myReviewHasSingleItem ? 'w-full h-72' : 'w-28 h-28'} bg-[#0a0a1a] rounded-lg flex items-center justify-center text-gray-600 text-xs shrink-0`}>No image</div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-white font-semibold leading-tight ${myReviewHasSingleItem ? 'text-xl' : 'text-base'}`}>{item.title}</p>
                            <p className="text-gray-200 text-base font-mono mt-1">Ref # {String(item.id).padStart(5, '0')}</p>

                          </div>
                        </div>
                      ))}
                      {myCash > 0 && (
                        <p className="pl-2 text-sm font-bold text-green-400">+ {formatWholeDollar(myCash)} Cash PAID via {getAcceptedCashMethodLabel(myUserId)}</p>
                      )}
                    </div>
                    {/* Exchange Arrow */}
                    <div className="flex shrink-0 items-center justify-center lg:self-stretch">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.75} stroke="currentColor" className="my-auto h-12 w-12 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                    </div>
                    {/* Their Items */}
                    <div className={`flex-1 space-y-2 ${theirReviewHasSingleItem ? 'lg:min-w-0' : ''}`}>
                      <div className="flex items-center gap-2 mb-3">
                        {theirAvatarUrl ? <TradeRoomAvatar src={theirAvatarUrl} alt="" className="h-6 w-6 rounded-full bg-slate-800" /> : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-[10px] font-bold">{theirInitial}</div>}
                        <p className="text-gray-200 text-sm font-bold uppercase tracking-wide">{theirDisplayName}</p>
                      </div>
                      {theirItems.map((item: any) => (
                        <div key={item.id} className={`flex gap-3 bg-[#0f0f1a] border border-gray-700 rounded-lg ${theirReviewHasSingleItem ? 'flex-col p-4' : 'items-center p-2'}`}>
                          {item.photos?.[0]?.imageUrl
                            ? <img src={item.photos[0].imageUrl} className={`${theirReviewHasSingleItem ? 'w-full h-72' : 'w-28 h-28'} object-contain rounded-lg bg-[#0a0a1a] shrink-0`} alt={item.title} />
                            : <div className={`${theirReviewHasSingleItem ? 'w-full h-72' : 'w-28 h-28'} bg-[#0a0a1a] rounded-lg flex items-center justify-center text-gray-600 text-xs shrink-0`}>No image</div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-white font-semibold leading-tight ${theirReviewHasSingleItem ? 'text-xl' : 'text-sm'}`}>{item.title}</p>
                            <p className="text-gray-200 text-base font-mono mt-1">Ref # {String(item.id).padStart(5, '0')}</p>

                          </div>
                        </div>
                      ))}
                      {theirCash > 0 && (
                        <p className="pl-2 text-sm font-bold text-green-400">+ {formatWholeDollar(theirCash)} Cash PAID via {getAcceptedCashMethodLabel(otherUser?.id)}</p>
                      )}
                    </div>
                  </div>
                </div>}

                {/* Contact Info Card — hidden on Shipping stage */}
                {currentStage !== 'shipping' && <div className="bg-[#16213e] border border-gray-600 rounded-xl p-7 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-900/30 border border-blue-500/20 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-2xl">Shipping Information</h2>
                      <p className="text-gray-300 text-sm">Contact details for arranging shipment. Keep this information confidential.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {[{ label: 'Your Info', contact: myContact, color: 'purple' }, { label: `${theirDisplayName}'s Info`, contact: theirContact, color: 'blue' }].map(({ label, contact, color }) => (
                      <div key={label} className="bg-[#0f0f1a] border border-white/40 rounded-xl p-6">
                        <p className={`text-${color}-400 text-sm font-bold uppercase tracking-wide mb-4`}>{label}</p>
                        {contact ? (
                          <div className="space-y-3 text-base">
                            {/* Full Name */}
                            <div className="flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 mt-0.5 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                              </svg>
                              <p className="text-white text-lg font-semibold">{contact.contactFullName || contact.name || <span className="text-gray-600 italic">Name not provided</span>}</p>
                            </div>
                            {/* Address */}
                            <div className="flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 mt-0.5 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                              </svg>
                              <div className="text-gray-200 text-base leading-7">
                                {contact.contactAddress ? (
                                  <>
                                    <p>{contact.contactAddress}</p>
                                    <p>{[contact.contactTown, contact.contactState, contact.contactZipCode].filter(Boolean).join(', ')}</p>
                                    {contact.contactCountry && <p>{contact.contactCountry}</p>}
                                  </>
                                ) : (
                                  <span className="text-gray-600 italic">Address not provided</span>
                                )}
                              </div>
                            </div>
                            {/* Email */}
                            <div className="flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 mt-0.5 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                              </svg>
                              <p className="text-gray-200 text-base break-words">{contact.contactEmail || <span className="text-gray-600 italic">Email not provided</span>}</p>
                            </div>
                            {/* Phone */}
                            <div className="flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 mt-0.5 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z" />
                              </svg>
                              <p className="text-gray-200 text-base">{contact.contactPhone || <span className="text-gray-600 italic">Phone not provided</span>}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-600 text-xs italic">Loading contact info...</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>}

                {/* ── SHIPPING STAGE: Focused two-column tracking layout ── */}
                {currentStage === 'shipping' && (() => {
                  const { myItems: myShippingItems, theirItems: theirShippingItems } = getLockedShipmentItems({
                    requestedListing,
                    offeredListings: trade?.offeredListings || [],
                    viewerUserId: myUserId,
                  });
                  const myTrackingByListingId = new Map(myTracking.map((tracking: any) => [tracking.listingId, tracking]));
                  const theirTrackingByListingId = new Map(theirTracking.map((tracking: any) => [tracking.listingId, tracking]));
                  const myItemsShipped = myShippingItems.length > 0 && myShippingItems.every((item) => myTrackingByListingId.has(item.id) && !resetTrackingIds.includes(item.id));
                  const theirItemsShipped = theirShippingItems.length > 0 && theirShippingItems.every((item) => theirTrackingByListingId.has(item.id));
                  return (
                    <div className="w-full min-h-[38rem] bg-[#16213e] border border-orange-500/40 rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.1)] overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-white font-bold text-lg">Shipping Stage</h2>
                            <p className="text-gray-400 text-xs">Enter your tracking info. Both parties must ship to proceed.</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold rounded-full animate-pulse">ACTION REQUIRED</span>
                      </div>

                      {/* Two-column tracking area */}
                      <div className="grid grid-cols-1 divide-y divide-gray-700 lg:grid-cols-2 lg:divide-x lg:divide-y-0">

                        {/* LEFT: Your shipment */}
                        <div className="min-w-0 p-6 lg:p-7">
                          <div className="flex items-center gap-2 mb-4">
                            {myAvatarUrl ? <TradeRoomAvatar src={myAvatarUrl} alt="" className="h-6 w-6 rounded-full bg-slate-800" /> : <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">{myInitial}</div>}
                            <p className="text-blue-300 text-sm font-bold uppercase tracking-wide">You — {myDisplayName}</p>
                            {myItemsShipped ? <span className="ml-auto text-green-400 text-xs font-bold">✓ Shipped</span> : <span className="ml-auto text-orange-300 text-xs font-bold">{myTrackingByListingId.size}/{myShippingItems.length} tracked</span>}
                          </div>

                          <div data-testid="shipping-my-items" className="space-y-3">
                            {myShippingItems.map((item: any) => {
                              const submittedTracking = resetTrackingIds.includes(item.id) ? undefined : myTrackingByListingId.get(item.id) as any;
                              const inp = trackingInputs.find(t => t.listingId === item.id) || { listingId: item.id, carrier: 'USPS', trackingNumber: '' };
                              const isConfirmed = !resetTrackingIds.includes(item.id) && confirmedTrackingIds.includes(item.id);
                              if (submittedTracking) {
                                const url = getTrackingUrl(submittedTracking.carrier, submittedTracking.trackingNumber);
                                return <div key={item.id} className="rounded-lg border border-green-500/20 bg-green-900/10 p-4">
                                  <div className="mb-1 flex items-center gap-2"><span className="rounded bg-green-900/40 px-2 py-0.5 text-xs font-bold text-green-400">{submittedTracking.carrier}</span><span className="min-w-0 flex-1 text-base font-semibold text-gray-200">{item.title}</span></div>
                                  <p className="mb-2 font-mono text-sm text-white">{submittedTracking.trackingNumber}</p>
                                  <div className="flex items-center justify-between gap-3"><div>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline">Track on {submittedTracking.carrier} →</a>}</div><button type="button" onClick={() => { setResetTrackingIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]); setConfirmedTrackingIds(prev => prev.filter(id => id !== item.id)); setTrackingInputs(prev => [...prev.filter(t => t.listingId !== item.id), { listingId: item.id, carrier: submittedTracking.carrier, trackingNumber: submittedTracking.trackingNumber }]); }} className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/20">Reset</button></div>
                                </div>;
                              }
                              if (isConfirmed) {
                                return <div key={item.id} className="rounded-xl border border-blue-400/40 bg-blue-900/10 p-5">
                                  <div className="mb-2 flex items-center gap-3"><span className="rounded bg-blue-900/40 px-2 py-0.5 text-xs font-bold text-blue-200">Ready</span><span className="min-w-0 flex-1 text-base font-semibold text-white">{item.title}</span></div>
                                  <p className="font-mono text-sm text-blue-100">{inp.carrier} · {inp.trackingNumber}</p>
                                  <button type="button" onClick={() => { setConfirmedTrackingIds(prev => prev.filter(id => id !== item.id)); setResetTrackingIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]); }} className="mt-3 rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/20">Reset</button>
                                </div>;
                              }
                              return (
                                  <div key={item.id} className="bg-[#0f0f1a] border border-gray-700 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-2">
                                      {item.photos?.[0]?.imageUrl
                                        ? <img src={item.photos[0].imageUrl} className="w-20 h-20 object-contain rounded-lg bg-[#0a0a1a]" alt={item.title} />
                                        : <div className="w-20 h-20 bg-[#0a0a1a] rounded-lg flex items-center justify-center text-gray-600 text-xs">?</div>
                                      }
                                      <p className="text-white text-base font-semibold leading-snug flex-1 min-w-0">{item.title}</p>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                      <select
                                        value={inp.carrier}
                                        onChange={(e) => setTrackingInputs(prev => {
                                          const existing = prev.filter(t => t.listingId !== item.id);
                                          return [...existing, { ...inp, carrier: e.target.value }];
                                        })}
                                        className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 shrink-0"
                                      >
                                        {['USPS', 'UPS', 'FedEx', 'DHL', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                      <input
                                        type="text"
                                        placeholder="Paste tracking #"
                                        value={inp.trackingNumber}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          let detectedCarrier = inp.carrier;
                                          const cleanVal = val.replace(/\s/g, '').toUpperCase();
                                          if (cleanVal.startsWith('1Z') && cleanVal.length === 18) detectedCarrier = 'UPS';
                                          else if ((cleanVal.length === 22 && cleanVal.startsWith('9')) || (cleanVal.length === 20 && cleanVal.startsWith('4'))) detectedCarrier = 'USPS';
                                          else if ((cleanVal.length === 12 || cleanVal.length === 15) && !cleanVal.startsWith('4') && !cleanVal.startsWith('9')) detectedCarrier = 'FedEx';
                                          else if (cleanVal.length === 10) detectedCarrier = 'DHL';
                                          setTrackingInputs(prev => {
                                            const existing = prev.filter(t => t.listingId !== item.id);
                                            return [...existing, { ...inp, trackingNumber: val, carrier: detectedCarrier }];
                                          });
                                        }}
                                        className="flex-1 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono"
                                      />
                                      <button type="button" disabled={!inp.trackingNumber.trim()} onClick={() => { setConfirmedTrackingIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]); setResetTrackingIds(prev => prev.filter(id => id !== item.id)); }} className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Enter</button>
                                    </div>
                                  </div>
                                );
                            })}
                            {myShippingItems.length === 0 && <p className="text-xs italic text-gray-600">No locked items recorded for your side.</p>}
                          </div>
                        </div>

                        {/* RIGHT: Their shipment */}
                        <div className="min-w-0 p-6 lg:p-7">
                          <div className="flex items-center gap-2 mb-4">
                            {theirAvatarUrl ? <TradeRoomAvatar src={theirAvatarUrl} alt="" className="h-6 w-6 rounded-full bg-slate-800" /> : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-[10px] font-bold">{theirInitial}</div>}
                            <p className="text-gray-200 text-sm font-bold uppercase tracking-wide">{theirDisplayName}</p>
                            {theirItemsShipped ? <span className="ml-auto text-green-400 text-xs font-bold">✓ Shipped</span> : <span className="ml-auto text-gray-500 text-xs font-bold">{theirTrackingByListingId.size}/{theirShippingItems.length} tracked</span>}
                          </div>

                          <div data-testid="shipping-counterparty-locked-items" className="mb-4 space-y-3 rounded-xl border border-gray-700 bg-[#0f0f1a] p-5">
                            <p className="text-sm font-bold uppercase tracking-wide text-gray-300">Items {theirDisplayName} is sending</p>
                            {theirShippingItems.length > 0 ? theirShippingItems.map((item: any) => {
                              const itemTracking = theirTrackingByListingId.get(item.id) as any;
                              return <div key={item.id} className="flex items-center gap-4 rounded-lg border border-gray-700 bg-[#16213e] p-4">
                                {item.photos?.[0]?.imageUrl ? <img src={item.photos[0].imageUrl} className="h-20 w-20 shrink-0 rounded-lg bg-[#0a0a1a] object-contain" alt={item.title} /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#0a0a1a] text-sm text-gray-500">No image</div>}
                                <div className="min-w-0 flex-1"><p className="text-base font-semibold leading-snug text-white">{item.title}</p><p className="mt-1 font-mono text-sm text-gray-300">Ref # {String(item.id).padStart(5, '0')}</p><p className={itemTracking ? "mt-2 text-sm font-semibold text-green-400" : "mt-2 text-sm font-semibold text-gray-400"}>{itemTracking ? "Tracking submitted" : "Awaiting tracking"}</p></div>
                              </div>;
                            }) : <p className="text-sm italic text-gray-500">No locked items recorded for this side.</p>}
                          </div>

                          {theirTracking.length > 0 ? (
                            <div className="space-y-2">
                              {theirTracking.map((t: any, i: number) => {
                                const url = getTrackingUrl(t.carrier, t.trackingNumber);
                                return (
                                  <div key={i} className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-[10px] font-bold rounded">{t.carrier}</span>
                                      <span className="text-gray-200 text-sm font-semibold truncate">{getTrackingItemTitle(t)}</span>
                                    </div>
                                    <p className="text-white text-base font-mono font-semibold mb-2 break-all">{t.trackingNumber}</p>
                                    {url && (
                                      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 text-xs hover:underline">
                                        Track on {t.carrier} →
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-32 text-center">
                              <svg className="animate-spin w-6 h-6 text-gray-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-gray-500 text-xs">Waiting for {theirDisplayName}</p>
                              <p className="text-gray-600 text-[10px] mt-1">to submit their tracking number</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status bar */}
                      <div className="flex items-center gap-3 px-6 py-3 bg-[#0f0f1a] border-t border-gray-700">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          myItemsShipped ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-red-900/20 border border-red-500/40 text-red-300'
                        }`}>
                          {myItemsShipped ? '✓' : '⏳'} {myDisplayName}: <span className={myItemsShipped ? 'text-green-400' : 'text-red-300'}>{myItemsShipped ? 'Tracking Numbers submitted' : 'Tracking Numbers not submitted'}</span>
                        </div>
                        <div className="w-px h-4 bg-gray-700" />
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          theirItemsShipped ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-red-900/20 border border-red-500/40 text-red-300'
                        }`}>
                          {theirItemsShipped ? '✓' : '○'} {theirDisplayName}: <span className={theirItemsShipped ? 'text-green-400' : 'text-red-300'}>{theirItemsShipped ? 'Tracking Numbers submitted' : 'Tracking Numbers not submitted'}</span>
                        </div>
                        {myItemsShipped && theirItemsShipped && (
                          <p className="ml-auto text-green-400 text-xs font-bold">🚚 Both packages on the way!</p>
                        )}
                        {shippingDeadline && (!myItemsShipped || !theirItemsShipped) && (
                            <p className={`ml-auto text-lg font-extrabold uppercase tracking-wide animate-pulse ${shippingDeadline.getTime() < Date.now() ? 'text-red-300' : 'text-orange-200'}`}>
                            Ship by {shippingDeadline.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ── SHIPPED / COMPLETED: Compact tracking summary + receipt confirmation ── */}
                {(currentStage === 'shipped' || currentStage === 'review' || currentStage === 'completed') && (
                  <div className="relative z-0 w-full flex-none bg-[#16213e] border border-gray-600 rounded-xl p-5 shadow-xl">
                    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
                      <div className="w-9 h-9 rounded-lg bg-green-900/30 border border-green-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-lg">{allItems.length > 0 ? 'Tracking & Receipt' : 'Cash Receipt'}</h2>
                        <p className="text-gray-400 text-xs">{allItems.length > 0 ? 'Follow the submitted tracking while you wait to receive your items and any cash owed.' : 'No items require shipping for this cash-only agreement. Confirm cash receipt once it arrives.'}</p>
                      </div>
                      <span className="self-start px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold rounded-full sm:ml-auto sm:self-auto">{allItems.length > 0 ? 'TRACKING SUBMITTED' : 'PAYMENT SENT'}</span>
                    </div>
                    {allItems.length > 0 && <div className="grid grid-cols-1 gap-4 mb-4 lg:grid-cols-2">
                      <div className="min-w-0">
                        <p className="text-blue-400 text-xs font-bold mb-2">Your Tracking</p>
                        {myTracking.map((t: any, i: number) => {
                          const url = getTrackingUrl(t.carrier, t.trackingNumber);
                          return (
                            <div key={i} className="bg-green-900/10 border border-green-500/20 rounded-lg p-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 text-[10px] font-bold">{t.carrier}</span>
                                <span className="text-gray-200 text-sm font-semibold flex-1 min-w-0 truncate">{getTrackingItemTitle(t)}</span>
                                <span className="text-gray-200 text-base font-mono font-semibold flex-1 break-all">{t.trackingNumber}</span>
                                {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline shrink-0">Track →</a>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-300 text-xs font-bold mb-2">{theirDisplayName}'s Tracking</p>
                        {theirTracking.map((t: any, i: number) => {
                          const url = getTrackingUrl(t.carrier, t.trackingNumber);
                          return (
                            <div key={i} className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-400 text-[10px] font-bold">{t.carrier}</span>
                                <span className="text-gray-200 text-sm font-semibold flex-1 min-w-0 truncate">{getTrackingItemTitle(t)}</span>
                                <span className="text-gray-200 text-base font-mono font-semibold flex-1 break-all">{t.trackingNumber}</span>
                                {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline shrink-0">Track →</a>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>}

                    {/* Receipt confirmation */}
                    {currentStage === 'shipped' && (
                      <div className="pt-4 border-t border-gray-700">
                        <p className="text-white text-sm font-bold mb-1">Confirm Receipt</p>
                        <p className="text-gray-400 text-xs mb-3">Confirm only what you actually received. The trade completes after every applicable item and cash receipt confirmation is recorded.</p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                            myReceiptConfirmed ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-gray-800 border border-gray-700 text-gray-500'
                          }`}>
                            {myReceiptConfirmed ? '✓' : '○'} {myDisplayName}: {myReceiptConfirmed ? 'Received' : 'Pending'}
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                            theirReceiptConfirmed ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-gray-800 border border-gray-700 text-gray-500'
                          }`}>
                            {theirReceiptConfirmed ? '✓' : '○'} {theirDisplayName}: {theirReceiptConfirmed ? 'Received' : 'Pending'}
                          </div>
                        </div>
                        {cashReceiptObligations.length > 0 && <div className="mt-3 space-y-2">{cashReceiptObligations.map((obligation) => { const status = obligation.payment?.status ?? 'pending'; return <div key={`cash-receipt-${obligation.payerId}`} className={`rounded-lg border px-3 py-2 text-xs ${status === 'received' || status === 'verified' ? 'border-green-500/30 bg-green-900/20 text-green-300' : 'border-amber-500/30 bg-amber-950/30 text-amber-100'}`}>{status === 'received' || status === 'verified' ? `✓ You confirmed ${formatWholeDollar(obligation.amount)} cash received.` : status === 'sent' ? `Cash receipt awaiting your confirmation: ${formatWholeDollar(obligation.amount)} from ${theirDisplayName}.` : `Waiting for ${theirDisplayName} to mark ${formatWholeDollar(obligation.amount)} sent.`}</div>; })}</div>}
                      </div>
                    )}

                    {/* Completed — leave review */}
                    {(currentStage === 'review' || currentStage === 'completed') && (
                      <div className="pt-4 border-t border-gray-700">
                        <p className="text-white text-sm font-bold mb-3">Leave a Review for {theirDisplayName}</p>
                        {myReview ? (
                          <p className="rounded-lg border border-green-500/30 bg-green-900/20 px-3 py-2 text-xs text-green-300">✓ Your review has been submitted and is locked for this trade.</p>
                        ) : <>
                        {(['tradeExperience', 'itemCondition', 'communication', 'shippingSpeed'] as const).map(key => (
                          <div key={key} className="flex items-center justify-between mb-2">
                            <p className="text-gray-400 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(star => (
                                <button key={star} onClick={() => setReviewRatings(r => ({...r, [key]: star}))}
                                  className={`text-lg ${reviewRatings[key] >= star ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <textarea
                          placeholder="Write a review (optional)..."
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          className="w-full mt-2 bg-[#0f0f1a] border border-gray-600 text-white text-xs rounded-lg p-3 focus:outline-none focus:border-blue-500 resize-none"
                          rows={3}
                        />
                        </>}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })()}

            {/* Trade Table Card — stretches to fill available height */}
            {(currentStage === 'proposed' || currentStage === 'negotiating') && <div className="bg-[#16213e] border border-gray-600 rounded-xl p-5 shadow-xl flex flex-col flex-1">

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-900/30 border border-blue-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Trade Table</h2>
                    <p className="text-gray-400 text-xs">Negotiate fairly and close with confidence.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Video status message — shown to the left of the Video Chat button */}
                  {videoStatusMessage && (
                    <span className="text-xs text-red-400 font-medium animate-pulse">{videoStatusMessage}</span>
                  )}
                  <button
                    onClick={async () => {
                      if (showVideoChatModal && videoRoomUrl) {
                        // End the call — close panel and clear state in DB for both users
                        setShowVideoChatModal(false);
                        setVideoRoomUrl(null);
                        try { await endVideoCallMutation.mutateAsync({ proposalId }); } catch (_) {}
                        return;
                      }
                      setVideoRoomLoading(true);
                      try {
                        const result = await getOrCreateVideoRoomMutation.mutateAsync({ proposalId });
                        setVideoRoomUrl(result.roomUrl);
                        setShowVideoChatModal(true);
                        // If this user is joining (not starting), post a joined message
                        // Must have an explicit non-null dailyRoomStartedBy that belongs to the OTHER user
                        const existingStartedBy = (trade?.proposal as any)?.dailyRoomStartedBy;
                        const isJoining = !!existingStartedBy && existingStartedBy !== myUserId;
                        if (isJoining) {
                          try { await joinVideoCallMutation.mutateAsync({ proposalId }); } catch (_) {}
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to start video chat');
                      } finally {
                        setVideoRoomLoading(false);
                      }
                    }}
                    className={`px-4 py-2 border rounded-lg transition text-sm flex items-center gap-2 font-medium ${
                      showVideoChatModal && videoRoomUrl
                        ? 'bg-red-600/20 text-red-400 border-red-500/30 hover:bg-red-600 hover:text-white'
                        : (trade?.proposal as any)?.dailyRoomUrl && myUserId && !showVideoChatModal && !videoBannerDismissed && (trade?.proposal as any)?.dailyRoomStartedBy !== myUserId
                          ? 'bg-green-600/20 text-green-400 border-green-500/30 hover:bg-green-600 hover:text-white animate-pulse'
                          : 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600 hover:text-white'
                    }`}
                    disabled={videoRoomLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    {showVideoChatModal && videoRoomUrl
                      ? 'End Video'
                      : (trade?.proposal as any)?.dailyRoomUrl && myUserId && !videoBannerDismissed && (trade?.proposal as any)?.dailyRoomStartedBy !== myUserId
                        ? 'Join Video Chat'
                        : 'Video Chat'
                    }
                  </button>

                  {/* Dismiss button — only shown to the non-caller when a call is active and not yet dismissed */}
                  {(trade?.proposal as any)?.dailyRoomUrl && myUserId && !showVideoChatModal && !videoBannerDismissed && (trade?.proposal as any)?.dailyRoomStartedBy !== myUserId && (
                    <button
                      onClick={async () => {
                        setVideoBannerDismissed(true);
                        try {
                          await dismissVideoCallMutation.mutateAsync({ proposalId });
                        } catch (_) {}
                      }}
                      className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white rounded-lg transition text-sm font-medium"
                    >
                      Dismiss
                    </button>
                  )}

                </div>
              </div>

              {/* Three-column layout: Your Side | Fairness + AI | Their Side */}
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-11">

                {/* ── YOUR SIDE ── */}
                <div className="flex flex-col overflow-hidden rounded-xl border border-gray-600 bg-[#0f0f1a] p-4 lg:col-span-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      {myAvatarUrl ? (
                        <TradeRoomAvatar src={myAvatarUrl} alt={myDisplayName} className="h-8 w-8 rounded-full border border-blue-500/40 bg-slate-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold border border-blue-500/40">{myInitial}</div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-white text-base font-extrabold leading-tight">{myDisplayName}</p>
                          {myUserId && <OnlineIndicator sellerId={myUserId} size="large" className="scale-75 origin-left" />}
                        </div>
                          <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Your Side</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-2xl font-black tracking-tight leading-none">{formatWholeDollar(myTotalValue)}</p>
                      <p className="text-blue-400/60 text-[10px] font-bold uppercase tracking-widest mt-1">Total Value</p>
                    </div>
                  </div>

                  {myItems.length === 0 ? (
                    <p className="text-gray-600 text-sm py-8 text-center">No items on your side yet.</p>
                  ) : (
                    <div className={`grid ${getGridCols(myItems.length)} gap-3 flex-1 content-start ${myItems.length >= 7 ? 'overflow-y-auto custom-scrollbar' : ''}`}>
                      {myItems.map((item: any) => {
                        const isLocked = false;
                        const isOriginalRequestedItem = item.id === requestedListing?.id;
                        return (
                        <div key={item.id} className={`bg-[#0f3460] border rounded-lg relative group ${getItemCardSpacing(myItems.length)} ${isOriginalRequestedItem ? 'border-blue-500/40' : 'border-gray-600'}`}>
                          {isOriginalRequestedItem && (
                            <div className="absolute top-1.5 left-1.5 bg-blue-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 z-10">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                              Original request
                            </div>
                          )}
                          {item.photos?.[0]?.imageUrl ? (
                            <img src={item.photos[0].imageUrl} alt={item.title} className={`w-full ${getImgHeight(myItems.length)} object-contain rounded mb-2 bg-[#0f0f1a]`} />
                          ) : (
                            <div className={`w-full ${getImgHeight(myItems.length)} bg-gray-800 rounded mb-2 flex items-center justify-center text-gray-600 text-xs`}>No Image</div>
                          )}
                          <p className={`text-white ${getItemTitleClass(myItems.length)}`}>{item.title}</p>
                          <p className={`text-blue-400 ${getItemValueClass(myItems.length)}`}>{formatItemValue(item.estimatedValue)}</p>
                          {!isLocked && canSubmitProposal && (currentStage === 'proposed' || currentStage === 'negotiating') && (
                            <button
                              onClick={() => handleRemoveItemFromTrade(item.id)}
                              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >×</button>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Cash sweetener line item */}
                  {myCash > 0 && (
                    <div className="mt-3 flex items-center justify-between bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 text-lg">💵</span>
                        <div>
                          <p className="text-green-400 text-xs font-bold">+ {formatWholeDollar(myCash)} Cash</p>
                          <p className="text-gray-500 text-[10px]">Added to sweeten the deal</p>
                        </div>
                      </div>
                      {canSubmitProposal && (currentStage === 'proposed' || currentStage === 'negotiating') && (
                        <button
                          onClick={() => { setCashInput(String(myCash)); setShowCashModal('my'); }}
                          className="text-gray-500 hover:text-white text-xs transition"
                          title="Edit cash amount"
                        >Edit</button>
                      )}
                    </div>
                  )}

                  {canSubmitProposal && (currentStage === 'proposed' || currentStage === 'negotiating') && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => { setInventorySearch(''); setIsMyInventoryOpen(true); }}
                        className="flex-1 py-2.5 border border-dashed border-gray-700 rounded-lg text-blue-400 hover:text-blue-300 hover:border-blue-500 transition text-sm flex items-center justify-center gap-2"
                      >
                        + Add Item
                      </button>
                      {canSubmitProposal && <button onClick={() => { setCashInput(myCash > 0 ? String(myCash) : ''); setShowCashModal('my'); }} className="flex-1 py-2.5 border border-dashed border-green-700/50 rounded-lg text-green-500 hover:text-green-400 hover:border-green-500 transition text-sm flex items-center justify-center gap-2">💵 {myCash > 0 ? 'Adjust Cash' : 'Add Cash'}</button>}
                    </div>
                  )}
                </div>

                {/* ── MIDDLE: Fairness Meter + AI Analyzer ── */}
                <div className="flex flex-col gap-4 overflow-hidden lg:col-span-3">
                  {/* Fairness Meter */}
                  <div className="bg-[#0f0f1a] border border-gray-600 rounded-xl p-5 text-center flex-1 flex flex-col justify-center">
                    {myHasAccepted && currentStage === 'negotiating' && (
                      <div className="mb-4 px-3 py-3 rounded-lg flex flex-col items-center justify-center gap-1 bg-blue-500/15 border border-blue-400/50 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.2)] animate-pulse">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          Waiting for their confirmation
                        </div>
                        <p className="text-[10px] text-blue-400/70">You accepted — awaiting partner</p>
                      </div>
                    )}
                    {partnerHasAccepted && !myHasAccepted && currentStage === 'negotiating' && (
                      <div className="mb-4 px-3 py-3 rounded-lg flex flex-col items-center justify-center gap-1 bg-green-500/15 border border-green-400/50 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-pulse">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          Your partner accepted!
                        </div>
                        <p className="text-[10px] text-green-400/70">Click Accept Trade below to confirm</p>
                      </div>
                    )}
                    {!partnerHasAccepted && !myHasAccepted && currentStage === 'negotiating' && (
                      <div className={`mb-4 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider animate-pulse ${
                        negotiationTurn.status === 'your-turn'
                          ? 'bg-green-500/10 border border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        {negotiationTurn.status === 'your-turn' ? 'Your Turn to Respond' : 'Awaiting Their Response'}
                      </div>
                    )}
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-1">
                      FAIRNESS METER
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                      </svg>
                    </p>

                    {!bothSidesHaveItems ? (
                      <p className="text-gray-500 text-xs px-2">Add items to both sides to calculate fairness</p>
                    ) : (
                      <>
                        {/* Percentage display — show the dominant side's share */}
                        {/* e.g. You give $8100, receive $1650 → myShareOfTotal=83% → show 83% In their favor */}
                        <p className="text-5xl font-bold text-blue-400 mb-1">
                          {Math.max(myShareOfTotal, theirSharePercent)}%
                        </p>

                        {/* Label */}
                        <p className={`text-sm font-semibold mb-5 ${
                          myShareOfTotal > 55 ? 'text-red-400' :
                          myShareOfTotal < 45 ? 'text-green-400' : 'text-blue-400'
                        }`}>{fairnessLabel}</p>

                        {/* Gradient slider bar */}
                        <div className="w-full h-2.5 rounded-full relative" style={{ background: 'linear-gradient(to right, #ec4899, #a855f7, #3b82f6)' }}>
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-all"
                            style={{ left: `calc(${sliderPos}% - 3px)` }}
                          />
                        </div>
                        <div className="flex justify-between text-gray-600 text-[10px] mt-2 mb-4">
                          <span>You Favor</span>
                          <span>Fair</span>
                          <span>They Favor</span>
                        </div>

                        {/* Value amounts */}
                        <div className="flex justify-between text-xs border-t border-gray-800 pt-3">
                          <div className="text-left">
                            <p className="text-gray-500 text-[10px] mb-0.5">You Give</p>
                            <p className="text-blue-400 font-bold">{formatWholeDollar(myTotalValue)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500 text-[10px] mb-0.5">You Receive</p>
                            <p className="text-blue-400 font-bold">{formatWholeDollar(theirTotalValue)}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* AI Analyzer */}
                  <div className="bg-[#0f0f1a] border border-gray-600 rounded-xl p-4 flex-1 flex flex-col overflow-y-auto">
                    {!aiAnalysis && !aiAnalysisLoading && (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                          </svg>
                        </div>
                        <p className="text-white text-xs font-bold uppercase tracking-widest mb-1">AI ANALYZER</p>
                        <p className="text-gray-500 text-[10px] mb-4 px-2">Get AI insights, real eBay market data, and negotiation tips.</p>
                        <button
                          onClick={async () => {
                            setAiAnalysisLoading(true);
                            setAiAnalysis(null);
                            try {
                              const result = await analyzeTradeWithAIMutation.mutateAsync({
                                proposalId,
                                myItems: myItems.map(i => ({
                                  id: i.id,
                                  title: i.title,
                                  category: i.category,
                                  grade: i.grade,
                                  condition: i.condition,
                                  estimatedValue: parseFloat(i.estimatedValue || '0'),
                                  itemDetails: i.itemDetails,
                                })),
                                theirItems: theirItems.map(i => ({
                                  id: i.id,
                                  title: i.title,
                                  category: i.category,
                                  grade: i.grade,
                                  condition: i.condition,
                                  estimatedValue: parseFloat(i.estimatedValue || '0'),
                                  itemDetails: i.itemDetails,
                                })),
                                myCash,
                                theirCash,
                              });
                              setAiAnalysis(result);
                            } catch (err: any) {
                              toast.error(err.message || 'AI analysis failed');
                            } finally {
                              setAiAnalysisLoading(false);
                            }
                          }}
                          className="w-full py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                          </svg>
                          Analyze Trade
                        </button>
                      </div>
                    )}

                    {aiAnalysisLoading && (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-400 text-xs text-center">Fetching eBay market data<br/>and analyzing trade...</p>
                      </div>
                    )}

                    {aiAnalysis && !aiAnalysisLoading && (
                      <div key={JSON.stringify(aiAnalysis)} className="space-y-3 text-xs">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <p className="text-white text-[10px] font-bold uppercase tracking-widest">AI ANALYSIS</p>
                          <button
                            onClick={async () => {
                              setAiAnalysisLoading(true);
                              setAiAnalysis(null);
                            try {
                              const result = await analyzeTradeWithAIMutation.mutateAsync({
                                proposalId,
                                myItems: myItems.map(i => ({
                                  id: i.id,
                                  title: i.title,
                                  category: i.category,
                                  grade: i.grade,
                                  condition: i.condition,
                                  estimatedValue: parseFloat(i.estimatedValue || '0'),
                                  itemDetails: i.itemDetails,
                                })),
                                theirItems: theirItems.map(i => ({
                                  id: i.id,
                                  title: i.title,
                                  category: i.category,
                                  grade: i.grade,
                                  condition: i.condition,
                                  estimatedValue: parseFloat(i.estimatedValue || '0'),
                                  itemDetails: i.itemDetails,
                                })),
                                myCash,
                                theirCash,
                              });
                              setAiAnalysis(result);
                              } catch (err: any) {
                                toast.error(err.message || 'AI analysis failed');
                              } finally {
                                setAiAnalysisLoading(false);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md text-[10px] font-bold hover:bg-blue-600 hover:text-white transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Re-analyze
                          </button>
                        </div>

                        {/* VERDICT AT TOP - PROMINENT */}
                        <div className={`rounded-lg px-4 py-3 text-center font-bold text-lg ${
                          aiAnalysis.fairnessScore >= 6 ? 'bg-green-900/50 text-green-200 border-2 border-green-600' :
                          aiAnalysis.fairnessScore <= 4 ? 'bg-red-900/50 text-red-200 border-2 border-red-600' :
                          'bg-blue-900/50 text-blue-200 border-2 border-blue-600'
                        }`}>
                          {aiAnalysis.verdict}
                          <div className="text-[12px] font-normal opacity-80 mt-1">Fairness Score: {aiAnalysis.fairnessScore}/10 | Confidence: {aiAnalysis.confidenceScore}%</div>
                        </div>

                        {/* Summary */}
                        <p className="text-gray-300 leading-relaxed text-sm">{aiAnalysis.summary}</p>

                        {/* Comparison Table - Dynamic Totals */}
                        {(() => {
                          const myTotal = (myItems?.reduce((sum: number, item: any) => sum + (parseFloat(item?.estimatedValue) || 0), 0) || 0) + (localMyCash || 0);
                          const theirTotal = (theirItems?.reduce((sum: number, item: any) => sum + (parseFloat(item?.estimatedValue) || 0), 0) || 0) + (localTheirCash || 0);
                          const gap = myTotal - theirTotal;
                          return (
                            <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                              <p className="text-gray-400 text-[10px] font-bold uppercase mb-2">Quick Comparison</p>
                              <div className="grid grid-cols-3 gap-2 text-[11px]">
                                <div>
                                  <p className="text-gray-500 uppercase text-[9px] mb-1">Your Total</p>
                                  <p className="text-cyan-300 font-semibold">{formatWholeDollar(myTotal)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 uppercase text-[9px] mb-1">Their Total</p>
                                  <p className="text-amber-300 font-semibold">{formatWholeDollar(theirTotal)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 uppercase text-[9px] mb-1">Gap</p>
                                  <p className={gap > 0 ? 'text-green-300 font-semibold' : gap < 0 ? 'text-red-300 font-semibold' : 'text-blue-300 font-semibold'}>{formatWholeDollar(gap)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* My items insight - per-item breakdown */}
                        <div className="bg-blue-900/20 rounded-lg p-2.5 border border-blue-800/30 space-y-3">
                          <p className="text-blue-400 text-[10px] font-bold uppercase">Your Items</p>
                          {typeof aiAnalysis.myItemInsights === 'object' && !Array.isArray(aiAnalysis.myItemInsights) ? (
                            Object.entries(aiAnalysis.myItemInsights).map(([itemName, insight]: [string, any]) => (
                              <div key={itemName} className="space-y-1.5 pb-2 border-b border-blue-800/20 last:border-b-0 last:pb-0">
                                {/* Item name heading */}
                                <p className="text-cyan-300 text-sm font-semibold">{itemName}</p>
                                {/* Insight */}
                                <p className="text-gray-300 text-[13px] leading-relaxed">{insight}</p>
                                {/* Strengths & Weaknesses for this item */}
                                {(aiAnalysis.myItemStrengths?.[itemName]?.length > 0 || aiAnalysis.myItemWeaknesses?.[itemName]?.length > 0) && (
                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    {aiAnalysis.myItemStrengths?.[itemName]?.length > 0 && (
                                      <div>
                                        <p className="text-green-400 text-[9px] font-bold uppercase mb-1">✅ Strengths</p>
                                        <ul className="space-y-0.5">
                                          {aiAnalysis.myItemStrengths[itemName].map((s: string, i: number) => (
                                            <li key={i} className="text-gray-400 text-[9px] leading-tight">• {s}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {aiAnalysis.myItemWeaknesses?.[itemName]?.length > 0 && (
                                      <div>
                                        <p className="text-red-400 text-[9px] font-bold uppercase mb-1">⚠️ Risks</p>
                                        <ul className="space-y-0.5">
                                          {aiAnalysis.myItemWeaknesses[itemName].map((w: string, i: number) => (
                                            <li key={i} className="text-gray-400 text-[9px] leading-tight">• {w}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Future Potential for this item */}
                                {aiAnalysis.myItemFuturePotential?.[itemName] && (
                                  <div className="pt-1 bg-blue-950/30 rounded p-1.5">
                                    <p className="text-blue-300 text-[9px] font-semibold uppercase mb-1">📈 Future Potential</p>
                                    <p className="text-gray-300 text-[11px] font-mono leading-relaxed">{aiAnalysis.myItemFuturePotential[itemName]}</p>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-300 leading-relaxed">{aiAnalysis.myItemInsights}</p>
                          )}
                        </div>

                        {/* THEIR ITEMS FIRST (what you're receiving) */}
                        <div className="bg-gray-800/40 rounded-lg p-2.5 border border-gray-700/30 space-y-3">
                          <p className="text-gray-400 text-[10px] font-bold uppercase">Their Items</p>
                          {typeof aiAnalysis.theirItemInsights === 'object' && !Array.isArray(aiAnalysis.theirItemInsights) ? (
                            Object.entries(aiAnalysis.theirItemInsights).map(([itemName, insight]: [string, any]) => (
                              <div key={itemName} className="space-y-1.5 pb-2 border-b border-gray-700/20 last:border-b-0 last:pb-0">
                                {/* Item name heading */}
                                <p className="text-amber-300 text-sm font-semibold">{itemName}</p>
                                {/* Insight */}
                                <p className="text-gray-300 text-[13px] leading-relaxed">{insight}</p>
                                {/* Strengths & Weaknesses for this item */}
                                {(aiAnalysis.theirItemStrengths?.[itemName]?.length > 0 || aiAnalysis.theirItemWeaknesses?.[itemName]?.length > 0) && (
                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    {aiAnalysis.theirItemStrengths?.[itemName]?.length > 0 && (
                                      <div>
                                        <p className="text-green-400 text-[9px] font-bold uppercase mb-1">✅ Strengths</p>
                                        <ul className="space-y-0.5">
                                          {aiAnalysis.theirItemStrengths[itemName].map((s: string, i: number) => (
                                            <li key={i} className="text-gray-400 text-[9px] leading-tight">• {s}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {aiAnalysis.theirItemWeaknesses?.[itemName]?.length > 0 && (
                                      <div>
                                        <p className="text-red-400 text-[9px] font-bold uppercase mb-1">⚠️ Risks</p>
                                        <ul className="space-y-0.5">
                                          {aiAnalysis.theirItemWeaknesses[itemName].map((w: string, i: number) => (
                                            <li key={i} className="text-gray-400 text-[9px] leading-tight">• {w}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Future Potential for this item */}
                                {aiAnalysis.theirItemFuturePotential?.[itemName] && (
                                  <div className="pt-1 bg-gray-900/30 rounded p-1.5">
                                    <p className="text-blue-300 text-[9px] font-semibold uppercase mb-1">📈 Future Potential</p>
                                    <p className="text-gray-300 text-[11px] font-mono leading-relaxed">{aiAnalysis.theirItemFuturePotential[itemName]}</p>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-300 leading-relaxed">{aiAnalysis.theirItemInsights}</p>
                          )}
                        </div>

                        {/* Negotiation tip */}
                        <div className="bg-yellow-900/20 rounded-lg p-2.5 border border-yellow-700/30">
                          <p className="text-yellow-400 text-[10px] font-bold uppercase mb-1">💡 Tip</p>
                          <p className="text-gray-300 leading-relaxed">{aiAnalysis.negotiationTip}</p>
                        </div>

                        {/* Cross-category comparison */}
                        {aiAnalysis.crossCategoryComparison && (
                          <div className="bg-purple-900/20 rounded-lg p-2.5 border border-purple-700/30">
                            <p className="text-purple-400 text-[10px] font-bold uppercase mb-1">⚖️ Head-to-Head Comparison</p>
                            <p className="text-gray-300 leading-relaxed">{aiAnalysis.crossCategoryComparison}</p>
                          </div>
                        )}

                        {/* Confidence score + eBay data indicator */}
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-gray-600 text-[9px]">
                            {aiAnalysis.ebayDataUsed ? '📊 Live eBay data' : '📊 Estimated values only'}
                          </p>
                          {aiAnalysis.confidenceScore && (
                            <div className="flex items-center gap-1">
                              <p className="text-gray-600 text-[9px]">Data confidence:</p>
                              <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                aiAnalysis.confidenceScore >= 8 ? 'bg-green-900/40 text-green-400' :
                                aiAnalysis.confidenceScore >= 6 ? 'bg-yellow-900/40 text-yellow-400' :
                                'bg-red-900/40 text-red-400'
                              }`}>
                                {aiAnalysis.confidenceScore}/10
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── THEIR SIDE ── */}
                <div className="flex flex-col overflow-hidden rounded-xl border border-gray-600 bg-[#0f0f1a] p-4 lg:col-span-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      {theirAvatarUrl ? (
                        <TradeRoomAvatar src={theirAvatarUrl} alt={theirDisplayName} className="h-8 w-8 rounded-full border border-gray-600 bg-slate-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-xs font-bold border border-gray-600">{theirInitial}</div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-white text-base font-extrabold leading-tight">{theirDisplayName}</p>
                          {otherUser?.id && <OnlineIndicator sellerId={otherUser.id} size="large" className="scale-75 origin-left" />}
                        </div>
                        <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Their Side</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-2xl font-black tracking-tight leading-none">{formatWholeDollar(theirTotalValue)}</p>
                      <p className="text-blue-400/60 text-[10px] font-bold uppercase tracking-widest mt-1">Total Value</p>
                    </div>
                  </div>

                  {theirItems.length === 0 ? (
                    <p className="text-gray-600 text-sm py-8 text-center">No items on their side yet.</p>
                  ) : (
                    <div className={`grid ${getGridCols(theirItems.length)} gap-3 flex-1 content-start ${theirItems.length >= 7 ? 'overflow-y-auto custom-scrollbar' : ''}`}>
                      {theirItems.map((item: any) => {
                        const isLocked = false;
                        const isOriginalRequestedItem = item.id === requestedListing?.id;
                        return (
                        <div key={item.id} className={`bg-[#0f3460] border rounded-lg relative group ${getItemCardSpacing(theirItems.length)} ${isOriginalRequestedItem ? 'border-blue-500/40' : 'border-gray-600'}`}>
                          {isOriginalRequestedItem && (
                            <div className="absolute top-1.5 left-1.5 bg-blue-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 z-10">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                              Original request
                            </div>
                          )}
                          {item.photos?.[0]?.imageUrl ? (
                            <img src={item.photos[0].imageUrl} alt={item.title} className={`w-full ${getImgHeight(theirItems.length)} object-contain rounded mb-2 bg-[#0f0f1a]`} />
                          ) : (
                            <div className={`w-full ${getImgHeight(theirItems.length)} bg-gray-800 rounded mb-2 flex items-center justify-center text-gray-600 text-xs`}>No Image</div>
                          )}
                          <p className={`text-white ${getItemTitleClass(theirItems.length)}`}>{item.title}</p>
                          <p className={`text-blue-400 ${getItemValueClass(theirItems.length)}`}>{formatItemValue(item.estimatedValue)}</p>
                          {!isLocked && canSubmitProposal && (currentStage === 'proposed' || currentStage === 'negotiating') && (
                            <button
                              onClick={() => handleRemoveItemFromTrade(item.id)}
                              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              title="Remove from trade"
                            >×</button>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Cash sweetener line item */}
                  {theirCash > 0 && (
                    <div className="mt-3 flex items-center justify-between bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 text-lg">💵</span>
                        <div>
                          <p className="text-green-400 text-xs font-bold">+ {formatWholeDollar(theirCash)} Cash</p>
                          <p className="text-gray-500 text-[10px]">Added to sweeten the deal</p>
                        </div>
                      </div>
                      {canSubmitProposal && (currentStage === 'proposed' || currentStage === 'negotiating') && (
                        <button
                          onClick={() => { setCashInput(String(theirCash)); setShowCashModal('their'); }}
                          className="text-gray-500 hover:text-white text-xs transition"
                          title="Edit cash amount"
                        >Edit</button>
                      )}
                    </div>
                  )}

                  {canSubmitProposal && (currentStage === 'proposed' || currentStage === 'negotiating') && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => { setInventorySearch(''); setInventoryCategory('All'); setIsTheirInventoryOpen(true); }}
                        className="flex-1 py-2.5 border border-dashed border-gray-700 rounded-lg text-blue-400 hover:text-blue-300 hover:border-blue-500 transition text-sm flex items-center justify-center gap-2"
                      >
                        + Browse User Items
                      </button>
                      {canSubmitProposal && <button onClick={() => { setCashInput(theirCash > 0 ? String(theirCash) : ''); setShowCashModal('their'); }} className="flex-1 py-2.5 border border-dashed border-green-700/50 rounded-lg text-green-500 hover:text-green-400 hover:border-green-500 transition text-sm flex items-center justify-center gap-2">💵 {theirCash > 0 ? 'Adjust Cash' : 'Add Cash'}</button>}
                    </div>
                  )}
                </div>
              </div>

            </div>}

        </div>

        {/* Right Column: Chat + Timeline as a card */}
        <div className="trade-room-chat-rail flex min-h-[34rem] w-full flex-shrink-0 flex-col p-4">
          <div className="trade-room-chat-card bg-[#16213e] border border-gray-600 rounded-xl flex flex-col flex-1 overflow-hidden shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-gray-600 rounded-t-xl overflow-hidden">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3.5 text-sm font-semibold transition ${activeTab === 'chat' ? 'text-blue-400 border-b-2 border-blue-500 bg-[#16213e]' : 'text-gray-500 hover:text-gray-300'}`}
            >Chat</button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-3.5 text-sm font-semibold transition ${activeTab === 'timeline' ? 'text-blue-400 border-b-2 border-blue-500 bg-[#16213e]' : 'text-gray-500 hover:text-gray-300'}`}
            >Timeline</button>
          </div>

          {activeTab === 'chat' && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Partner header */}
              <div className="p-4 border-b border-gray-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theirAvatarUrl ? (
                    <TradeRoomAvatar src={theirAvatarUrl} alt={theirDisplayName} className="h-9 w-9 rounded-full border border-gray-600 bg-slate-800" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm font-bold">
                      {theirInitial}
                    </div>
                  )}
                  <div>
                    <p className="text-white text-sm font-semibold">{theirDisplayName}</p>
                    {otherUser?.id && <OnlineIndicator sellerId={otherUser.id} />}
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {messagesQuery.isLoading && (
                  <p className="text-gray-500 text-sm text-center py-4">Loading messages...</p>
                )}
                {messages.length === 0 && !messagesQuery.isLoading && (
                  <p className="text-gray-600 text-sm text-center py-8">No messages yet. Start the conversation!</p>
                )}
                {messages.map((msg: any, idx: number) => {
                  const isMine = msg.senderId === myUserId;
                  // Append 'Z' to treat the stored UTC timestamp correctly across all browsers
                  const time = msg.createdAt ? new Date(msg.createdAt.endsWith('Z') ? msg.createdAt : msg.createdAt + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  // Only show avatar on the last consecutive message from the same sender
                  const nextMsg = messages[idx + 1];
                  const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {/* Their avatar — left side */}
                      {!isMine && (
                        <div className="w-7 h-7 flex-shrink-0 mb-0.5">
                          {isLastInGroup ? (
                            theirAvatarUrl
                              ? <div className="relative h-7 w-7 overflow-hidden rounded-full border border-gray-600 bg-slate-800"><img src={theirAvatarUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-md" onError={(event) => { event.currentTarget.style.display = "none"; }} /><img src={theirAvatarUrl} alt={theirDisplayName} className="relative z-10 h-full w-full object-fill" /></div>
                              : <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white text-[10px] font-bold border border-gray-500">{theirInitial}</div>
                          ) : (
                            <div className="w-7 h-7" /> /* spacer to keep alignment */
                          )}
                        </div>
                      )}
                      <div className={`max-w-[80%] p-3 rounded-xl text-sm leading-relaxed ${
                        isMine 
                          ? 'bg-blue-600 text-white border border-blue-500 rounded-tr-sm shadow-[0_2px_8px_rgba(37,99,235,0.3)]' 
                          : 'bg-white text-gray-900 border border-gray-200 rounded-xl rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                      }`}>
                        <p className={`text-[10px] mb-1 font-semibold ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>{time}</p>
                        <p className="font-medium">{msg.message || msg.content}</p>
                      </div>
                      {/* My avatar — right side */}
                      {isMine && (
                        <div className="w-7 h-7 flex-shrink-0 mb-0.5">
                          {isLastInGroup ? (
                            myAvatarUrl
                              ? <div className="relative h-7 w-7 overflow-hidden rounded-full border border-blue-500/60 bg-slate-800"><img src={myAvatarUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-md" onError={(event) => { event.currentTarget.style.display = "none"; }} /><img src={myAvatarUrl} alt={myDisplayName} className="relative z-10 h-full w-full object-fill" /></div>
                              : <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold border border-blue-500/60">{myInitial}</div>
                          ) : (
                            <div className="w-7 h-7" /> /* spacer */
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-3 pb-4 pt-3 border-t border-gray-600 shrink-0">
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 pr-2 shadow-sm">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent text-gray-900 text-sm focus:outline-none placeholder:text-gray-400"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  />
                  <button className="text-gray-400 hover:text-gray-600 p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                    </svg>
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
                    className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition disabled:opacity-50 shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 ml-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <TimelineTab proposalId={proposalId} adminView={isAdminReadOnly} />
          )}
          </div>
        </div>
      </div>

      {currentStage === 'negotiating' && (myCash > 0 || theirCash > 0) && (
        <section className="mx-4 mb-4 rounded-xl border border-blue-500/40 bg-[#16213e] p-4 shadow-xl sm:mx-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Cash payment method</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">Choose a member-provided method during negotiation. Review shows the method name only; private payment destinations remain hidden until Step 4.</p>
            </div>
            {hasSharedPaymentMethod ? <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-200">Shared: {sharedPaymentMethods.map((method) => method.label).join(', ')}</span> : <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-200">No shared method</span>}
          </div>
          {cashAdjustmentContextQuery.isLoading && <p className="mt-3 text-xs text-slate-400">Checking compatible payment methods…</p>}
          {!cashAdjustmentContextQuery.isLoading && !hasSharedPaymentMethod && <p className="mt-3 rounded-lg border border-amber-600/40 bg-amber-950/30 px-3 py-2.5 text-xs leading-relaxed text-amber-100">{paymentMethodMismatchMessage}</p>}
          {!cashAdjustmentContextQuery.isLoading && hasSharedPaymentMethod && <div className="mt-3 grid gap-3 xl:grid-cols-2">{(cashAdjustmentContext?.obligations ?? []).map((obligation: any) => {
            const payment = obligation.payment as any;
            const iAmPayee = obligation.role === 'payee';
            const selectedMethod = sharedPaymentMethods.find((method) => method.method === payment?.paymentMethod);
            return <div key={obligation.payerId} className="rounded-lg border border-slate-600 bg-slate-950/40 p-3"><p className="text-xs font-bold text-white">{iAmPayee ? `You will receive ${formatWholeDollar(obligation.amount)} from ${theirDisplayName}` : `You will send ${formatWholeDollar(obligation.amount)} to ${theirDisplayName}`}</p>{iAmPayee ? <><p className="mt-1 text-xs text-slate-300">Select how you want to receive this payment.</p><div className="mt-2 flex flex-wrap gap-2">{sharedPaymentMethods.map((method) => <button key={method.method} type="button" onClick={() => selectCashAdjustmentMethodMutation.mutate({ proposalId, method: method.method as any })} disabled={selectCashAdjustmentMethodMutation.isPending} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${payment?.paymentMethod === method.method ? 'border-blue-400 bg-blue-500/20 text-white' : 'border-slate-600 text-slate-200 hover:border-blue-400'}`}>{payment?.paymentMethod === method.method ? 'Selected: ' : ''}{method.label}</button>)}</div>{payment?.paymentMethod && <p className="mt-2 text-xs text-emerald-300">{selectedMethod?.label || 'Compatible method'} selected. Your destination remains private until Step 4.</p>}</> : <p className="mt-2 text-xs text-slate-300">{payment?.paymentMethod ? `${selectedMethod?.label || 'A compatible method'} selected by ${theirDisplayName}. The private destination will appear in Step 4.` : `Waiting for ${theirDisplayName} to select a compatible method before either member can accept.`}</p>}</div>;
          })}</div>}
        </section>
      )}

      {/* Sticky Footer Action Bar */}
      <div className="sticky bottom-0 z-30 border-t border-gray-700 bg-[#0f0f1a] px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4">

          {/* Stage 1: Propose — only Decline + Send Proposal */}
          {currentStage === 'proposed' && (
            <>
              <button
                onClick={() => setShowDeclineModal(true)}
                className="px-8 py-3 border border-gray-700 text-gray-400 rounded-lg font-semibold hover:bg-red-900/20 hover:border-red-700 hover:text-red-400 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Decline
              </button>
              {canSubmitProposal ? (
                <button
                  onClick={handleUpdateProposal}
                  className="px-14 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  Send Proposal
                </button>
              ) : (
                <p className="max-w-sm text-center text-sm text-gray-400">Waiting for the listing owner to respond. You can decline this inquiry at any time.</p>
              )}
            </>
          )}

          {/* Stage 2: Negotiating */}
          {currentStage === 'negotiating' && (
            <>
              <button
                onClick={() => setShowDeclineModal(true)}
                className="px-8 py-3 border border-gray-700 text-gray-400 rounded-lg font-semibold hover:bg-red-900/20 hover:border-red-700 hover:text-red-400 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Decline
              </button>
              {canSubmitProposal ? (
                <button
                  onClick={handleUpdateProposal}
                  disabled={!hasLocalChanges}
                  className={`px-14 py-3 rounded-lg font-bold transition flex items-center gap-2 ${
                    hasLocalChanges
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  Counter Offer
                </button>
              ) : (
                <p className="max-w-sm text-center text-sm text-gray-400">Your proposal is awaiting the other member’s response. You can decline this trade at any time.</p>
              )}
              {(iCanAccept || partnerHasAccepted) && !myHasAccepted && (
                <button
                  onClick={handleAccept}
                  className={`px-8 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                    partnerHasAccepted
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-pulse border border-green-400'
                      : 'border border-green-700 text-green-400 hover:bg-green-900/20'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Accept Trade
                </button>
              )}
            </>
          )}

          {/* Step 3: Review — final terms and mutual approval only. */}
          {(currentStage === 'accepted' || currentStage === 'shipping') && (
            <>
              {currentStage === 'shipping' && (
              <>
              {/* Step 4: Shipping — direct cash settlement and shipment fulfilment. */}
              {(myCash > 0 || theirCash > 0) && (() => {
                const obligations = (cashAdjustmentContextQuery.data?.obligations ?? []) as Array<any>;

                return <div className="mb-3 flex w-full flex-col gap-3">
                  <div className="rounded-xl border border-blue-500/40 bg-[#16213e] px-5 py-4 text-sm text-slate-200"><p className="text-base font-bold text-white">Cash payment & shipping tasks</p><p className="mt-1 text-sm leading-relaxed text-slate-300">The member sending cash must complete the payment and mark it sent. The receiving member confirms the cash in Step 5. Each member’s card below shows the current amount, method, and next action.</p></div>
                  {cashAdjustmentContextQuery.isLoading && <p className="rounded-lg border border-slate-600 bg-slate-950/40 px-4 py-3 text-xs text-slate-300">Loading payment steps…</p>}
                  {cashAdjustmentContextQuery.isError && <p className="rounded-lg border border-red-600/40 bg-red-900/20 px-4 py-3 text-xs text-red-200">Payment steps could not be loaded. Please refresh the Trade Room or try again.</p>}
                  {cashAdjustmentContextQuery.isSuccess && obligations.length === 0 && <p className="rounded-lg border border-slate-600 bg-slate-950/40 px-4 py-3 text-xs text-slate-300">No direct cash settlement is required for this trade.</p>}
                  <div className="grid w-full gap-3 xl:grid-cols-2">{obligations.map((context) => {
                    const payment = context.payment as any;
                    const paymentStatus = payment?.status ?? 'pending';
                    const iAmPayer = context.role === 'payer';
                    const iAmPayee = context.role === 'payee';
                    const cashAmount = Number(context.amount ?? 0);
                    const providerUrl = payment?.paymentMethod === 'paypal' ? 'https://www.paypal.com/' : payment?.paymentMethod === 'venmo' ? 'https://venmo.com/' : payment?.paymentMethod === 'cash_app' ? 'https://cash.app/' : payment?.paymentMethod === 'zelle' ? 'https://www.zellepay.com/' : null;
                    const statusLabel = paymentStatus === 'received' ? 'Recipient confirmed received' : paymentStatus === 'sent' ? 'Awaiting receipt confirmation' : paymentStatus === 'disputed' ? 'Dispute open' : paymentStatus === 'method_selected' ? 'Method selected' : 'Method needed';
                    const transactionReference = transactionReferenceByPayer[context.payerId] ?? '';
                    return <div key={context.payerId} className={`rounded-xl border p-4 shadow-xl ${paymentStatus === 'received' ? 'border-green-500/50 bg-[#16213e]' : paymentStatus === 'disputed' ? 'border-red-500/60 bg-[#241b2a]' : 'border-blue-500/40 bg-[#16213e]'}`}>
                      <div className="mb-3 flex items-center gap-2"><span className="text-lg">💵</span><h3 className="text-sm font-bold text-white">{iAmPayer ? `Send ${formatWholeDollar(cashAmount)} to ${theirDisplayName}` : `Receive ${formatWholeDollar(cashAmount)} from ${theirDisplayName}`}</h3><span className="ml-auto rounded-full border border-slate-600 bg-slate-950/40 px-2 py-0.5 text-[11px] font-medium text-slate-200">{statusLabel}</span></div>
                      {iAmPayee && <div className="space-y-3"><p className="text-xs text-slate-300">{payment?.paymentMethod ? `${String(payment.paymentMethod).replace('_', ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())} was selected in Step 2. Your private destination remains hidden here.` : 'A compatible method must be selected in Step 2 before payment can be sent.'}</p>{paymentStatus === 'sent' && <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">Your partner marked this payment sent. Confirm that the cash arrived in Step 5, Confirm Receipt.</p>}{paymentStatus === 'received' && <p className="text-xs font-medium text-green-300">✓ You confirmed cash receipt. This is a member confirmation, not provider verification.</p>}</div>}
                      {iAmPayer && <div className="space-y-3">{payment?.paymentMethod && payment?.paymentIdentifier ? <><div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-600 bg-slate-950/40 px-3 py-2"><span className="text-xs font-bold text-blue-300">{String(payment.paymentMethod).replace('_', ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())}</span><span className="text-xs text-slate-300">Send to:</span><code className="text-xs font-bold text-white">{payment.paymentIdentifier}</code><button onClick={() => { void navigator.clipboard?.writeText(payment.paymentIdentifier); toast.success('Payment destination copied.'); }} className="ml-auto text-xs font-semibold text-blue-300 hover:text-blue-200">Copy</button>{providerUrl && <a href={providerUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-300 hover:text-blue-200">Open provider</a>}</div>{paymentStatus === 'method_selected' && <div className="flex flex-wrap gap-2"><input type="text" placeholder="Optional payment reference" value={transactionReference} onChange={(event) => setTransactionReferenceByPayer((current) => ({ ...current, [context.payerId]: event.target.value }))} className="min-w-[13rem] flex-1 rounded-lg border border-gray-600 bg-[#0f0f1a] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none" /><button onClick={() => { if (window.confirm(`Confirm that you sent ${formatWholeDollar(cashAmount)} to ${theirDisplayName} through ${String(payment.paymentMethod).replace('_', ' ')}. Tradebilia does not process or verify this external payment.`)) markCashAdjustmentSentMutation.mutate({ proposalId, transactionReference: transactionReference.trim() || undefined }); }} disabled={markCashAdjustmentSentMutation.isPending} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">I sent it</button></div>}{paymentStatus === 'sent' && <p className="text-xs text-amber-200">Payment marked sent. {theirDisplayName} confirms cash receipt in Step 5.</p>}{paymentStatus === 'received' && <p className="text-xs font-medium text-green-300">✓ {theirDisplayName} confirmed receipt. This is a member confirmation, not provider verification.</p>}</> : <p className="rounded-lg border border-slate-600 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">The recipient selects a compatible private payment method during Step 2.</p>}</div>}
                      {paymentStatus === 'disputed' && <p className="mt-2 text-xs text-red-200">A cash-adjustment dispute is open for administrator review. Do not continue shipping until it is resolved.</p>}
                    </div>;
                  })}</div>
                  <div className="flex items-start gap-2 rounded-lg border border-amber-600/50 bg-amber-900/30 px-4 py-2.5"><span className="mt-0.5 text-base text-amber-400">⚠️</span><p className="text-xs leading-relaxed text-amber-200"><strong>Tradebilia does not process payments.</strong> PayPal, Venmo, Cash App, and Zelle transfers are made directly between members. Tradebilia does not hold, insure, refund, or guarantee direct payments.</p></div>
                </div>;
              })()}
              </>
              )}
              {currentStage === 'accepted' && (
              <>
              <button
                onClick={() => window.open(`/trade-print/${proposalId}`, '_blank')}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                Print Confirmation
              </button>
              {!myHasAccepted ? (
                <button
                  onClick={() => {
                    proceedToShippingMutation.mutate({ proposalId });
                  }}
                  disabled={proceedToShippingMutation.isPending}
                  className={`px-10 py-3 rounded-lg font-bold transition flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 ${
                    partnerHasAccepted 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white animate-pulse' 
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  {proceedToShippingMutation.isPending ? 'Processing...' : 'Confirm & Proceed to Shipping'}
                </button>
              ) : (
                <div className="px-6 py-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg font-semibold flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Waiting for partner to confirm...
                </div>
              )}
              </>
              )}
            </>
          )}

          {/* Stage 4: Shipping — submit tracking */}
          {currentStage === 'shipping' && (() => {
            const myTracking = (trade?.trackingNumbers || []).filter((t: any) => t.userId === myUserId);
            const { myItems: myShippingItems } = getLockedShipmentItems({ requestedListing, offeredListings: trade?.offeredListings || [], viewerUserId: myUserId });
            const myTrackingById = new Map(myTracking.map((entry: any) => [entry.listingId, entry]));
            const allMyTrackingReady = myShippingItems.length > 0 && myShippingItems.every((item: any) => {
              const saved = myTrackingById.has(item.id) && !resetTrackingIds.includes(item.id);
              const draft = confirmedTrackingIds.includes(item.id) && Boolean(trackingInputs.find(t => t.listingId === item.id)?.trackingNumber.trim());
              return saved || draft;
            });
            const pendingCashSteps = (cashAdjustmentContextQuery.data?.obligations ?? []).filter((obligation: any) => !['received', 'verified'].includes(obligation.payment?.status ?? 'pending')).length;
            return (
              <>
                <p className="text-orange-300 text-sm flex items-center gap-2 font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  {myTracking.length > 0 ? pendingCashSteps > 0 ? `Tracking submitted — ${pendingCashSteps} cash step${pendingCashSteps === 1 ? '' : 's'} still required above` : `Tracking submitted — waiting for ${theirDisplayName} to finish Shipping` : 'Ship your items and enter your tracking number above'}
                </p>
                {myShippingItems.length > 0 && (myTracking.length === 0 || resetTrackingIds.length > 0) && (
                  <button
                    onClick={() => {
                      if (!allMyTrackingReady) { toast.error('Press Enter to lock every tracking number before submitting.'); return; }
                      const validTracking = myShippingItems.map((item: any) => {
                        const draft = trackingInputs.find(t => t.listingId === item.id);
                        const saved = myTrackingById.get(item.id) as any;
                        return draft && confirmedTrackingIds.includes(item.id) ? { listingId: item.id, carrier: draft.carrier as any, trackingNumber: draft.trackingNumber } : saved ? { listingId: item.id, carrier: saved.carrier as any, trackingNumber: saved.trackingNumber } : null;
                      }).filter(Boolean) as Array<{listingId: number; carrier: any; trackingNumber: string}>;
                      if (validTracking.length !== myShippingItems.length) { toast.error('Enter and confirm a tracking number for every item.'); return; }
                      submitTrackingMutation.mutate({ proposalId, trackingNumbers: validTracking });
                    }}
                    disabled={!allMyTrackingReady || submitTrackingMutation.isPending}
                    className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    Submit Tracking
                  </button>
                )}
              </>
            );
          })()}

          {/* Step 5: Confirm Receipt — retain tracking above and confirm only what arrived. */}
          {currentStage === 'shipped' && (() => {
            const myReceiptConfirmed = (trade as any)?.myReceiptConfirmed;
            const cashReceiptObligations = ((cashAdjustmentContext?.obligations ?? []) as Array<any>).filter((obligation) => obligation.role === 'payee');
            const waitingCashReceipts = cashReceiptObligations.filter((obligation) => ['sent'].includes(obligation.payment?.status ?? 'pending'));
            const alreadyConfirmedCashReceipts = cashReceiptObligations.filter((obligation) => ['received', 'verified'].includes(obligation.payment?.status ?? 'pending'));
            return (
              <>
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  {hasIncomingPhysicalItems ? 'Tracking is available above. Confirm each item only after it arrives.' : 'No physical items are expected in this cash-only agreement.'}
                </p>
                {hasIncomingPhysicalItems && !myReceiptConfirmed ? (
                  <button
                    onClick={() => confirmReceiptMutation.mutate({ proposalId, confirmationType: 'received' })}
                    disabled={confirmReceiptMutation.isPending}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    I Received My Items
                  </button>
                ) : hasIncomingPhysicalItems ? (
                  <p className="text-green-400 text-sm flex items-center gap-2">✓ You confirmed receipt — waiting for {theirDisplayName}</p>
                ) : null}
                {waitingCashReceipts.map((obligation) => (
                  <button key={`confirm-cash-${obligation.payerId}`} onClick={() => confirmCashAdjustmentReceivedMutation.mutate({ proposalId })} disabled={confirmCashAdjustmentReceivedMutation.isPending} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>I Received {formatWholeDollar(obligation.amount)} Cash</button>
                ))}
                {alreadyConfirmedCashReceipts.map((obligation) => <p key={`confirmed-cash-${obligation.payerId}`} className="text-green-400 text-sm flex items-center gap-2">✓ You confirmed {formatWholeDollar(obligation.amount)} cash received.</p>)}
              </>
            );
          })()}

          {/* Stage 5: Completed — leave review */}
          {(currentStage === 'review' || currentStage === 'completed') && (myReview ? (
            <p className="text-green-300 text-sm flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Review submitted and locked</p>
          ) : (
            <>
              <p className="text-green-400 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Trade completed!
              </p>
              <button
                onClick={() => leaveReviewMutation.mutate({
                  proposalId,
                  tradeExperienceRating: reviewRatings.tradeExperience,
                  itemConditionRating: reviewRatings.itemCondition,
                  communicationRating: reviewRatings.communication,
                  shippingSpeedRating: reviewRatings.shippingSpeed,
                  review: reviewText || undefined,
                })}
                disabled={leaveReviewMutation.isPending || Object.values(reviewRatings).every(v => v === 0)}
                className="px-8 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
              >
                ★ Submit Review
              </button>
            </>
          ))}

          {currentStage === 'disputed' && (
            <p className="text-red-200 text-sm flex items-center gap-2 font-semibold">
              <span aria-hidden="true">⚠</span> This trade is under administrator dispute review. Trade changes and completion actions are paused.
            </p>
          )}
          </div>
          {receiptAvailable && (
            <section aria-label="Trade documents and support actions" className="flex w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-blue-500/15 bg-[#0a0a14] p-2 sm:justify-start sm:p-3">
              <button type="button" onClick={downloadCurrentReceipt} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-900/20 px-3 py-2 text-xs font-semibold text-blue-200 transition hover:bg-blue-900/40 sm:w-auto"><span aria-hidden="true">↓</span> Download Trade Receipt (PDF)</button>
              {canReportTradeIssue && <button type="button" onClick={openTradeIssueReport} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20 sm:w-auto"><span aria-hidden="true">!</span> Report a Trade Issue</button>}
              {canRequestDisputeReview && <button type="button" onClick={() => setShowDisputeModal(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/45 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 sm:w-auto"><span aria-hidden="true">⚠</span> Request Dispute Review</button>}
            </section>
          )}
        </div>
        <p className="text-center mt-2 text-gray-600 text-xs flex items-center justify-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-green-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Secure Trade Room • All data is encrypted end-to-end
        </p>
      </div>

      {/* MODALS */}

      {/* Their Inventory Modal — browse partner's items by category with checkboxes */}
      {isTheirInventoryOpen && (() => {
        // Helper: format category slug to Title Case
        const formatCat = (cat: string) =>
          cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const existingTheirTradeItemIds = new Set(theirItems.map((item: any) => item?.id).filter(Boolean));
        const allItems: any[] = (theirInventoryQuery.data?.items || []).filter((item: any) => !existingTheirTradeItemIds.has(item?.id));

        // Build category list from ALL items (regardless of current filter)
        const rawCategories = Array.from(new Set(allItems.map((i: any) => i.category).filter(Boolean))) as string[];
        const categories = ['All', ...rawCategories];

        // Client-side filter by selected category + search
        const visibleItems = allItems.filter((item: any) => {
          const matchesCat = inventoryCategory === 'All' || item.category === inventoryCategory;
          const matchesSearch = !inventorySearch || item.title?.toLowerCase().includes(inventorySearch.toLowerCase());
          return matchesCat && matchesSearch;
        });

        const toggleItem = (id: number) => {
          setSelectedInventoryItems(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          );
        };

        const handleAddSelected = () => {
          if (selectedInventoryItems.length === 0) {
            toast.error('Please select at least one item.');
            return;
          }
          selectedInventoryItems.forEach(id => {
            const itemData = allItems.find((i: any) => i.id === id);
            handleAddItemToTrade(id, itemData);
          });
          setSelectedInventoryItems([]);
          setIsTheirInventoryOpen(false);
          setInventorySearch('');
          setInventoryCategory('All');
        };

        const qvItem = quickViewItemId !== null ? allItems.find((i: any) => i.id === quickViewItemId) : null;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#16213e] border-2 border-white/80 rounded-xl w-11/12 max-w-6xl h-[min(85dvh,52rem)] max-h-[calc(100dvh-2rem)] shadow-2xl flex overflow-hidden">

              {/* Main inventory browser */}
              <div className="flex flex-col flex-1 min-w-0">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {theirAvatarUrl ? (
                    <TradeRoomAvatar src={theirAvatarUrl} alt={theirDisplayName} className="h-10 w-10 rounded-full border border-gray-600 bg-slate-800" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm font-bold">{theirInitial}</div>
                  )}
                  <div>
                    <h2 className="text-white text-lg font-bold">{theirDisplayName}'s Inventory</h2>
                    <p className="text-gray-400 text-xs mt-0.5">Select additional items you want to request from {theirDisplayName}.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsTheirInventoryOpen(false); setInventorySearch(''); setInventoryCategory('All'); setSelectedInventoryItems([]); }}
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category Tabs — always all visible, click to filter in-place */}
              <div className="flex flex-wrap border-b border-gray-700 flex-shrink-0 bg-[#16213e]">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setInventoryCategory(cat)}
                    className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition flex-shrink-0 border-b-2 ${
                      inventoryCategory === cat
                        ? 'text-blue-300 border-blue-400 bg-blue-950/40'
                        : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {formatCat(cat)}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-700 flex-shrink-0 bg-[#16213e]">
                <input
                  type="text"
                  placeholder={`Search ${theirDisplayName}'s inventory...`}
                  className="w-full px-4 py-2.5 rounded-lg bg-white text-slate-900 border border-slate-300 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none text-sm"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
              </div>

              {/* Items Grid */}
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                {theirInventoryQuery.isLoading ? (
                  <p className="text-gray-500 text-sm text-center py-12">Loading inventory...</p>
                ) : visibleItems.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-12">No items found.</p>
                ) : (
                  <div className="grid grid-cols-5 gap-4">
                    {visibleItems.map((item: any) => {
                      const isSelected = selectedInventoryItems.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`bg-[#0f0f1a] border-2 rounded-xl p-3 flex flex-col transition ${
                            isSelected
                              ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                              : quickViewItemId === item.id
                                ? 'border-blue-500'
                                : 'border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex justify-end mb-1">
                            <button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); toggleItem(item.id); }}
                              aria-label={`Request ${item.title}`}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition ${
                                isSelected ? 'bg-blue-600 border-blue-500' : 'border-gray-600 bg-transparent hover:border-gray-400'
                              }`}
                            >
                              {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-white">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </button>
                          </div>
                          {/* Image — click to open item detail popup */}
                          <div
                            className="cursor-pointer group/img relative"
                            onClick={(e) => { e.stopPropagation(); setQuickViewItemId(item.id); }}
                            title="Click to view item details"
                          >
                            {item.primaryImage ? (
                              <img src={item.primaryImage} alt={item.title} className="w-full h-28 object-contain rounded mb-3 bg-[#16213e] group-hover/img:opacity-80 transition" />
                            ) : (
                              <div className="w-full h-28 bg-gray-800 rounded mb-3 flex items-center justify-center text-gray-600 text-xs group-hover/img:bg-gray-700 transition">No Image</div>
                            )}
                            {/* Hover overlay hint */}
                            <div className="absolute inset-0 rounded mb-3 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition bg-black/30">
                              <span className="text-white text-[10px] font-semibold bg-black/60 px-2 py-1 rounded">View Details</span>
                            </div>
                          </div>
                          {/* Title */}
                          <p className="text-white text-xs font-semibold line-clamp-2 leading-tight mb-1">{item.title}</p>
                          {/* Value */}
                          <p className="text-blue-400 text-sm font-bold mt-auto">{formatItemValue(item.estimatedValue)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer: add requested items */}
              <div className="px-6 py-4 border-t border-gray-700 flex-shrink-0 flex items-center justify-between bg-[#16213e]">
                <p className="text-gray-400 text-sm">
                  {selectedInventoryItems.length > 0
                    ? <span className="text-blue-400 font-semibold">{selectedInventoryItems.length} requested item{selectedInventoryItems.length > 1 ? 's' : ''} selected</span>
                    : 'Select items you want to request'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedInventoryItems([])}
                    className="px-4 py-2 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelected}
                    disabled={selectedInventoryItems.length === 0}
                    className={`px-8 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
                      selectedInventoryItems.length > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Requested Items
                  </button>
                </div>
              </div>

              </div>{/* end main browser */}

            </div>
          </div>
        );
      })()}

      {/* Item Detail Popup Modal — opens when clicking an item image in the inventory browser */}
      {quickViewItemId !== null && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-11/12 max-w-5xl h-[min(90dvh,52rem)] max-h-[calc(100dvh-2rem)] shadow-2xl overflow-hidden flex flex-col">
            {/* Modal header bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-700 flex-shrink-0">
              <p className="text-white text-sm font-semibold">Item Detail</p>
              <button
                onClick={() => setQuickViewItemId(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Iframe rendering the actual item detail page */}
            <iframe
              src={`/listings/${quickViewItemId}`}
              className="flex-1 w-full border-0"
              title="Item Detail"
            />
          </div>
        </div>
      )}

      {/* My Inventory Modal — same format as Their Inventory Modal */}
      {isMyInventoryOpen && (() => {
        const formatCat = (cat: string) =>
          cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const existingMyTradeItemIds = new Set(myItems.map((item: any) => item?.id).filter(Boolean));
        const allMyItems: any[] = (myDashboardQuery.data?.ownListings || []).filter(
          (l: any) => (l.status === 'active' || l.isActive) && !existingMyTradeItemIds.has(l?.id)
        );

        // Build category list from all my items
        const myRawCategories = Array.from(new Set(allMyItems.map((i: any) => i.category).filter(Boolean))) as string[];
        const myCategories = ['All', ...myRawCategories];

        // Client-side filter by selected category + search
        const myVisibleItems = allMyItems.filter((item: any) => {
          const matchesCat = inventoryCategory !== 'All' ? item.category === inventoryCategory : true;
          const matchesSearch = !inventorySearch || item.title?.toLowerCase().includes(inventorySearch.toLowerCase());
          return matchesCat && matchesSearch;
        });

        const toggleMyItem = (id: number) => {
          setSelectedInventoryItems(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          );
        };

        const handleAddMySelected = () => {
          if (selectedInventoryItems.length === 0) {
            toast.error('Please select at least one item.');
            return;
          }
          selectedInventoryItems.forEach(id => {
            const itemData = allMyItems.find((i: any) => i.id === id);
            handleAddItemToTrade(id, itemData);
          });
          setSelectedInventoryItems([]);
          setIsMyInventoryOpen(false);
          setInventorySearch('');
          setInventoryCategory('All');
        };

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#16213e] border-2 border-white/80 rounded-xl w-11/12 max-w-6xl h-[min(85dvh,52rem)] max-h-[calc(100dvh-2rem)] shadow-2xl flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {myAvatarUrl ? (
                    <TradeRoomAvatar src={myAvatarUrl} alt={myDisplayName} className="h-10 w-10 rounded-full border border-blue-500/40 bg-slate-800" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">{myInitial}</div>
                  )}
                  <div>
                    <h2 className="text-white text-lg font-bold">Your Inventory</h2>
                    <p className="text-gray-400 text-xs mt-0.5">Select items you want to offer — they will appear on Your Side</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsMyInventoryOpen(false); setInventorySearch(''); setInventoryCategory('All'); setSelectedInventoryItems([]); }}
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap border-b border-gray-700 flex-shrink-0 bg-[#0f0f1a]">
                {myCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setInventoryCategory(cat)}
                    className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition flex-shrink-0 border-b-2 ${
                      inventoryCategory === cat
                        ? 'text-blue-300 border-blue-400 bg-blue-950/40'
                        : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {formatCat(cat)}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-700 flex-shrink-0 bg-[#16213e]">
                <input
                  type="text"
                  placeholder="Search your inventory..."
                  className="w-full px-4 py-2.5 rounded-lg bg-white text-slate-900 border border-slate-300 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none text-sm"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
              </div>

              {/* Items Grid */}
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                {myDashboardQuery.isLoading ? (
                  <p className="text-gray-500 text-sm text-center py-12">Loading your inventory...</p>
                ) : myVisibleItems.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-12">No items found.</p>
                ) : (
                  <div className="grid grid-cols-5 gap-4">
                    {myVisibleItems.map((item: any) => {
                      const isSelected = selectedInventoryItems.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`bg-[#0f0f1a] border-2 rounded-xl p-3 flex flex-col transition ${
                            isSelected
                              ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                              : quickViewItemId === item.id
                                ? 'border-blue-500'
                                : 'border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          {/* Checkbox top-right */}
                          <div className="flex justify-end mb-1">
                            <div
                              onClick={(e) => { e.stopPropagation(); toggleMyItem(item.id); }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition ${
                                isSelected ? 'bg-blue-600 border-blue-500' : 'border-gray-600 bg-transparent hover:border-gray-400'
                              }`}
                            >
                              {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-white">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                          </div>
                          {/* Image — click to open item detail popup */}
                          <div
                            className="cursor-pointer group/img relative"
                            onClick={(e) => { e.stopPropagation(); setQuickViewItemId(item.id); }}
                            title="Click to view item details"
                          >
                            {item.photos?.[0]?.imageUrl ? (
                              <img src={item.photos[0].imageUrl} alt={item.title} className="w-full h-28 object-contain rounded mb-3 bg-[#16213e] group-hover/img:opacity-80 transition" />
                            ) : (
                              <div className="w-full h-28 bg-gray-800 rounded mb-3 flex items-center justify-center text-gray-600 text-xs group-hover/img:bg-gray-700 transition">No Image</div>
                            )}
                            <div className="absolute inset-0 rounded mb-3 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition bg-black/30">
                              <span className="text-white text-[10px] font-semibold bg-black/60 px-2 py-1 rounded">View Details</span>
                            </div>
                          </div>
                          {/* Title */}
                          <p className="text-white text-xs font-semibold line-clamp-2 leading-tight mb-1">{item.title}</p>
                          {/* Condition/Grade Badge */}
                          {(item.grade || item.condition) && (
                            <p className="text-gray-300 text-xs mb-1">
                              {item.grade ? `Grade ${item.grade}` : item.conditionLabel || item.condition}
                            </p>
                          )}
                          {/* Value */}
                          <p className="text-blue-400 text-sm font-bold mt-auto">{formatItemValue(item.estimatedValue)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer: Add To Trade button */}
              <div className="px-6 py-4 border-t border-gray-700 flex-shrink-0 flex items-center justify-between bg-[#0f0f1a]">
                <p className="text-gray-400 text-sm">
                  {selectedInventoryItems.length > 0
                    ? <span className="text-blue-400 font-semibold">{selectedInventoryItems.length} item{selectedInventoryItems.length > 1 ? 's' : ''} selected</span>
                    : 'Click items to select them'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedInventoryItems([])}
                    className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm hover:bg-gray-800 transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleAddMySelected}
                    disabled={selectedInventoryItems.length === 0}
                    className={`px-8 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
                      selectedInventoryItems.length > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add To Trade
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Add Cash Modal */}
      {showCashModal !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-[#16213e] border border-gray-600 rounded-xl p-6 w-11/12 max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💵</span>
                <div>
                  <h2 className="text-white text-lg font-bold">
                    {showCashModal === 'my' ? 'Add Cash to Your Side' : 'Add Cash to Their Side'}
                  </h2>
                  <p className="text-gray-400 text-xs">
                    {showCashModal === 'my'
                      ? 'Sweeten the deal by adding cash to your offer'
                      : 'Request cash from them to balance the trade'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCashModal(null)} className="text-gray-400 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!cashAdjustmentContextQuery.isLoading && !hasSharedPaymentMethod && <p className="mb-4 rounded-lg border border-amber-600/40 bg-amber-950/30 px-3 py-2.5 text-xs leading-relaxed text-amber-100">{paymentMethodMismatchMessage}</p>}
            {hasSharedPaymentMethod && <p className="mb-4 rounded-lg border border-blue-500/30 bg-blue-950/30 px-3 py-2.5 text-xs leading-relaxed text-blue-100">Shared payment methods with {theirDisplayName}: <strong>{sharedPaymentMethods.map((method) => method.label).join(', ')}</strong>. The recipient selects one after the cash terms are proposed.</p>}

            <div className="relative mb-5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                className="w-full pl-7 pr-4 py-3 bg-[#0f0f1a] border border-gray-600 rounded-lg text-white text-lg font-bold focus:border-green-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              {/* Remove cash button */}
              {((showCashModal === 'my' && myCash > 0) || (showCashModal === 'their' && theirCash > 0)) && (
                <button
                  onClick={() => {
                    if (showCashModal === 'my') setCashPay('0');
                    else setCashReceive('0');
                    setShowCashModal(null);
                    setCashInput('');
                  }}
                  className="px-4 py-2.5 border border-red-700/50 text-red-400 rounded-lg text-sm hover:bg-red-900/20 transition"
                >Remove</button>
              )}
              <button
                onClick={() => setShowCashModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-400 rounded-lg text-sm hover:bg-gray-800 transition"
              >Cancel</button>
              <button
                onClick={() => {
                  const amount = parseFloat(cashInput);
                  if (isNaN(amount) || amount < 0) {
                    toast.error('Please enter a valid amount.');
                    return;
                  }
                  if (amount > 0 && !cashAdjustmentContextQuery.isLoading && !hasSharedPaymentMethod) {
                    toast.error(paymentMethodMismatchMessage);
                    return;
                  }
                  if (showCashModal === 'my') setCashPay(String(amount));
                  else setCashReceive(String(amount));
                  setShowCashModal(null);
                  setCashInput('');
                  toast.success(`${formatWholeDollar(amount)} cash added to the trade.`);
                }}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Video Chat Panel — inline overlay at bottom of page */}
      {showVideoChatModal && videoRoomUrl && (
        <VideoChatPanel
          roomUrl={videoRoomUrl}
          displayName={myDisplayName}
          onClose={() => { setShowVideoChatModal(false); setVideoRoomUrl(null); }}
        />
      )}

      {/* Video Room Loading Overlay */}
      {videoRoomLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#16213e] border border-gray-700 rounded-xl p-8 text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Starting video room...</p>
            <p className="text-gray-400 text-sm mt-1">This only takes a moment</p>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#16213e] border border-gray-700 rounded-xl p-6 w-11/12 max-w-md shadow-2xl">
            <h2 className="text-white text-xl font-bold mb-2">Decline Trade</h2>
            <p className="text-gray-400 text-sm mb-5">Are you sure? You can optionally provide a reason.</p>
            <textarea
              className="w-full p-3 rounded-lg bg-[#0f0f1a] text-white border border-gray-700 mb-5 focus:border-blue-500 focus:outline-none text-sm resize-none"
              rows={3}
              placeholder="Reason for declining (optional)"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeclineModal(false)} className="px-5 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition text-sm font-medium">Cancel</button>
              <button onClick={confirmDecline} className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">Decline Trade</button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Contract Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#16213e] border border-gray-700 rounded-xl p-8 w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h2 className="text-white text-2xl font-bold">Trade Contract</h2>
            </div>
            <div className="bg-[#0f0f1a] rounded-lg p-5 border border-gray-700 text-gray-300 text-sm space-y-3 mb-6 h-56 overflow-y-auto custom-scrollbar">
              <p>This Trade Contract is entered into by and between the Proposer and the Recipient, effective upon mutual acceptance.</p>
              <p><strong>1. Agreement to Exchange:</strong> Both parties agree to exchange the items as detailed in the Trade Table. Each party warrants they are the rightful owner of the items they are offering.</p>
              <p><strong>2. Item Condition:</strong> All items are exchanged "as is." Both parties acknowledge they have reviewed item descriptions and images.</p>
              <p><strong>3. Shipping:</strong> Both parties agree to ship their respective items within 3 business days of mutual acceptance. Tracking information must be shared promptly.</p>
              <p><strong>4. Valuation:</strong> Estimated values are for informational purposes only and do not constitute a guarantee of market value.</p>
              <p><strong>5. Mutual Acceptance:</strong> This contract becomes binding upon mutual acceptance by both parties. Items will be locked from further modification.</p>
              <p><strong>6. Disputes:</strong> Any disputes will be handled through Tradebilia's dispute resolution process.</p>
            </div>
            <div className="flex items-center mb-6 bg-blue-900/10 p-4 rounded-lg border border-blue-900/30">
              <input
                type="checkbox"
                id="contract-checkbox"
                className="h-5 w-5 text-blue-600 rounded border-gray-600 bg-[#0f0f1a] focus:ring-blue-500"
                checked={contractCheckbox}
                onChange={(e) => setContractCheckbox(e.target.checked)}
              />
              <label htmlFor="contract-checkbox" className="ml-3 text-white text-sm font-medium cursor-pointer">
                I have read and agree to the terms of the Trade Contract.
              </label>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowContractModal(false)} className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition font-medium text-sm">Cancel</button>
              <button
                onClick={confirmAccept}
                disabled={!contractCheckbox}
                className={`px-8 py-3 rounded-lg font-bold transition text-sm flex items-center gap-2 ${
                  contractCheckbox ? 'bg-green-600 text-white hover:bg-green-700 shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Sign & Accept
              </button>
            </div>
          </div>
        </div>
      )}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-400/45 bg-[#16213e] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Request dispute review?</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">This pauses the Trade Room and notifies your partner that administrator review was requested. You can then submit supporting details through Report a Trade Issue.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDisputeModal(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700">Cancel</button>
              <button type="button" onClick={() => disputeMutation.mutate({ proposalId })} disabled={disputeMutation.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{disputeMutation.isPending ? 'Requesting…' : 'Mark Trade Disputed'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
