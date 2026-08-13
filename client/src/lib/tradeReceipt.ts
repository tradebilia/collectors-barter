import { jsPDF } from "jspdf";

export type ReceiptItem = {
  title: string;
  referenceNumber?: string | null;
  estimatedValue?: string | number | null;
};

export type TradeReceiptInput = {
  tradeReference: string;
  status: string;
  createdAt?: string | Date | null;
  acceptedAt?: string | Date | null;
  shippingDeadline?: string | Date | null;
  mySide: { name: string; contactName?: string | null; items: ReceiptItem[]; cash: number; tracking: Array<{ carrier: string; trackingNumber: string }> };
  theirSide: { name: string; contactName?: string | null; items: ReceiptItem[]; cash: number; tracking: Array<{ carrier: string; trackingNumber: string }> };
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function deriveShippingDeadline(shippingDeadline?: string | Date | null, shippingStartedAt?: string | Date | null): Date | null {
  if (shippingDeadline) return new Date(shippingDeadline);
  if (!shippingStartedAt) return null;
  const derived = new Date(shippingStartedAt);
  derived.setUTCDate(derived.getUTCDate() + 3);
  return derived;
}

export function buildTradeReceiptLines(receipt: TradeReceiptInput): string[] {
  const formatDate = (value?: string | Date | null) => value ? new Date(value).toLocaleDateString() : "Not available";
  const sideLines = (label: string, side: TradeReceiptInput["mySide"]) => [
    label,
    `Participant: ${side.contactName || side.name}`,
    ...side.items.map((item) => `• ${item.title}${item.referenceNumber ? ` (Ref. ${item.referenceNumber})` : ""} — ${currency.format(Number(item.estimatedValue || 0))}`),
    ...(side.cash > 0 ? [`Cash contribution: ${currency.format(side.cash)}`] : []),
    `Tracking: ${side.tracking.length ? side.tracking.map((tracking) => `${tracking.carrier} ${tracking.trackingNumber}`).join(", ") : "Not submitted"}`,
  ];

  return [
    "TRADEBILIA TRADE RECEIPT",
    `Trade reference: ${receipt.tradeReference}`,
    `Status: ${receipt.status}`,
    `Created: ${formatDate(receipt.createdAt)}`,
    `Accepted: ${formatDate(receipt.acceptedAt)}`,
    `Shipping deadline: ${formatDate(receipt.shippingDeadline)}`,
    "",
    ...sideLines("YOUR SIDE", receipt.mySide),
    "",
    ...sideLines("TRADE PARTNER SIDE", receipt.theirSide),
    "",
    "This receipt records the Trade Room terms and shipment information shown when it was downloaded.",
  ];
}

export function downloadTradeReceipt(receipt: TradeReceiptInput): void {
  const document = new jsPDF({ unit: "pt", format: "letter" });
  const lines = buildTradeReceiptLines(receipt);
  let y = 54;
  for (const line of lines) {
    const wrapped = document.splitTextToSize(line, 500) as string[];
    if (y + wrapped.length * 16 > 740) {
      document.addPage();
      y = 54;
    }
    document.setFontSize(line === "TRADEBILIA TRADE RECEIPT" ? 18 : 10);
    document.setFont("helvetica", line === "TRADEBILIA TRADE RECEIPT" || line === "YOUR SIDE" || line === "TRADE PARTNER SIDE" ? "bold" : "normal");
    document.text(wrapped, 54, y);
    y += wrapped.length * 16 + 5;
  }
  document.save(`${receipt.tradeReference.replace(/[^a-z0-9_-]/gi, "-")}-receipt.pdf`);
}
