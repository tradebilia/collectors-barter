import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { formatWholeDollar } from "@/lib/tradebilia";
import { formatTradeContactPhone } from "@/lib/tradePrint";

function formatSelectedPaymentMethod(method?: string | null) {
  return method
    ? method.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Selected Direct Method";
}

export default function TradePrintView() {
  const params = useParams<{ id: string }>();
  const proposalId = parseInt(params.id || "0");
  const { user } = useAuth();

  const tradeDetailsQuery = trpc.tradeFlow.getTradeDetails.useQuery(
    { proposalId },
    { enabled: proposalId > 0 }
  );
  const cashAdjustmentContextQuery = trpc.payment.getCashAdjustmentContext.useQuery(
    { proposalId },
    { enabled: proposalId > 0 }
  );

  const trade = tradeDetailsQuery.data;
  const isRequester = trade?.isRequester ?? false;
  const myUserId = trade ? (isRequester ? trade.proposal.requesterId : trade.proposal.recipientId) : null;

  const requestedListing = trade?.requestedListing;
  const offeredListings = trade?.offeredListings || [];

  const myOfferedItems = offeredListings.filter((l: any) => l.ownerId === myUserId);
  const theirOfferedItems = offeredListings.filter((l: any) => l.ownerId !== myUserId);

  const myItems = isRequester
    ? myOfferedItems
    : [requestedListing, ...myOfferedItems].filter(Boolean);
  const theirItems = isRequester
    ? [requestedListing, ...theirOfferedItems].filter(Boolean)
    : theirOfferedItems;

  const myContact = (trade as any)?.myContactInfo;
  const theirContact = (trade as any)?.theirContactInfo;
  const myDisplayName = (user as any)?.displayName || user?.name || 'Trader 1';
  const theirDisplayName = (trade?.otherUser as any)?.displayName || 'Trader 2';

  const serverMyCash = isRequester
    ? parseFloat((trade?.proposal as any)?.cashFromRequester || '0') || 0
    : parseFloat((trade?.proposal as any)?.cashFromRecipient || '0') || 0;
  const serverTheirCash = isRequester
    ? parseFloat((trade?.proposal as any)?.cashFromRecipient || '0') || 0
    : parseFloat((trade?.proposal as any)?.cashFromRequester || '0') || 0;
  const paymentMethodByPayer = new Map<string, string | null>(
    ((cashAdjustmentContextQuery.data as any)?.obligations ?? []).map((obligation: any): [string, string | null] => [
      String(obligation.payerId),
      typeof obligation.payment?.paymentMethod === "string" ? obligation.payment.paymentMethod : null,
    ])
  );
  const myCashPaymentMethod = paymentMethodByPayer.get(String(myUserId));
  const theirCashPaymentMethod = paymentMethodByPayer.get(String(isRequester ? trade?.proposal?.recipientId : trade?.proposal?.requesterId));

  const acceptedAt = (trade?.proposal as any)?.acceptedAt;
  const acceptedDate = acceptedAt
    ? new Date(acceptedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const tradeRef = (trade?.proposal as any)?.tradeReferenceNumber || `TB-${String(proposalId).padStart(5, '0')}`;

  useEffect(() => {
    if (trade) {
      document.title = `Trade Confirmation ${tradeRef}`;
    }
  }, [trade, tradeRef]);

  if (tradeDetailsQuery.isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-white text-gray-600">Loading trade details...</div>;
  }

  if (!trade) {
    return <div className="flex items-center justify-center min-h-screen bg-white text-red-600">Trade not found.</div>;
  }

  const ContactBlock = ({ contact, displayName }: { contact: any; displayName: string }) => (
    <div className="text-center">
      <p className="font-black text-2xl text-gray-900">{contact?.contactFullName || displayName}</p>
      <p className="text-gray-500 text-sm">Display Name: {displayName}</p>
      {contact?.contactAddress && (
        <div className="mt-2 text-gray-700 text-base leading-relaxed">
          <p>{contact.contactAddress}</p>
          <p>{[contact.contactTown, contact.contactState, contact.contactZipCode].filter(Boolean).join(', ')}</p>
          {contact.contactCountry && <p>{contact.contactCountry}</p>}
        </div>
      )}
      {contact?.contactEmail && <p className="text-gray-700 text-base mt-1">{contact.contactEmail}</p>}
      {contact?.contactPhone && <p className="text-gray-700 text-base">{formatTradeContactPhone(contact.contactPhone)}</p>}
    </div>
  );

  const ItemCard = ({ item }: { item: any }) => (
    <div className="text-center">
      <div className="w-full bg-gray-100 rounded-lg overflow-hidden mb-2 border border-gray-200" style={{ height: '200px' }}>
        {item?.photos?.[0]?.imageUrl
          ? <img src={item.photos[0].imageUrl} className="w-full h-full object-contain" alt={item.title} />
          : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
        }
      </div>
      <p className="text-gray-900 font-semibold text-xs leading-tight">{item?.title}</p>
      <p className="text-gray-400 text-[10px] font-mono mt-0.5">Ref # {String(item?.id || '').padStart(5, '0')}</p>

    </div>
  );

  return (
    <div className="bg-[#f5f0e8] min-h-screen font-serif print:bg-white">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b-2 border-gray-800 pb-4">
          <div>
            <div>
              <p className="font-black text-2xl text-gray-900 tracking-tight">TRADEBILIA</p>
              <p className="text-gray-500 text-xs">Collectors Trading Exchange</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="print:hidden px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            Print
          </button>
        </div>

        {/* Trade Accepted Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-[#1a4a2e] uppercase tracking-widest mb-2">Trade Accepted</h1>
          <div className="w-24 h-0.5 bg-[#b8960c] mx-auto" />
        </div>

        {/* Confirmation Box */}
        <div className="border-2 border-[#b8960c] rounded-lg p-5 mb-8 bg-white">
          <p className="text-gray-800 text-sm mb-1"><span className="font-semibold">Trade Confirmation #</span> {tradeRef}</p>
          <p className="text-gray-800 text-sm mb-3"><span className="font-semibold">Date Accepted</span>&nbsp;&nbsp;&nbsp;{acceptedDate}</p>
          <p className="text-[#1a7a3e] font-semibold text-sm">✓ Accepted — Both Parties Confirmed</p>
        </div>

        {/* Traders */}
        <div className="grid grid-cols-2 gap-0 mb-8 border border-gray-300 rounded-lg overflow-hidden bg-white">
          <div className="p-5 border-r border-gray-300">
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-3 text-center">Trader 1</p>
            <ContactBlock contact={myContact} displayName={myDisplayName} />
          </div>
          <div className="p-5">
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-3 text-center">Trader 2</p>
            <ContactBlock contact={theirContact} displayName={theirDisplayName} />
          </div>
        </div>

        {/* Items */}
        <div className="flex gap-4 items-start mb-8">
          {/* My Items */}
          <div className="flex-1">
            <div className={`grid gap-3 ${myItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {myItems.map((item: any) => item && <ItemCard key={item.id} item={item} />)}
              {serverMyCash > 0 && (
                <div className="text-center">
                  <p className="text-green-700 font-extrabold text-lg mt-2">+ {formatWholeDollar(serverMyCash)} Cash PAID via {formatSelectedPaymentMethod(myCashPaymentMethod)}</p>
                </div>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="flex self-stretch items-center justify-center shrink-0 px-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          {/* Their Items */}
          <div className="flex-1">
            <div className={`grid gap-3 ${theirItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {theirItems.map((item: any) => item && <ItemCard key={item.id} item={item} />)}
              {serverTheirCash > 0 && (
                <div className="text-center">
                  <p className="text-green-700 font-extrabold text-lg mt-2">+ {formatWholeDollar(serverTheirCash)} Cash PAID via {formatSelectedPaymentMethod(theirCashPaymentMethod)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Statement */}
        <p className="text-center text-gray-700 text-sm font-medium mb-6 border-t border-gray-300 pt-6">
          This trade has been mutually accepted and finalized.
        </p>

        {/* Disclaimer */}
        <div className="border-t border-gray-300 pt-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            <span className="font-semibold">Notes</span><br />
            Tradebilia is a marketplace platform and is not liable for trades gone wrong. Each trader is responsible for their own shipping costs. Both parties agreed to the terms of this trade.
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex items-center justify-center gap-6 mt-8 text-gray-400 text-xs">
          <span>Terms</span>
          <span>Privacy</span>
          <span>Contact Support</span>
        </div>
      </div>
    </div>
  );
}
