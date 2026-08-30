import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Archive, BarChart3, BookOpen, Users, Package, Settings, Trash2, Flag, Mail, Search, ArrowUpDown, Calendar, ExternalLink, CheckCircle, XCircle, AlertTriangle, Ban, ShieldOff, ClipboardList, MessageSquare, TicketCheck, Send, ChevronDown, ChevronUp, Store, CloudUpload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatItemValue, formatWholeDollar } from "@/lib/tradebilia";
import { TopBar } from "@/components/TopBar";
import { ReferralsTab } from "@/components/ReferralsTab";
import { PreLaunchEmailTab } from "@/components/PreLaunchEmailTab";
import { R2MediaMigrationTab } from "@/components/R2MediaMigrationTab";
import { R2StorageHealthTab } from "@/components/R2StorageHealthTab";
import { AdminOperationsTab } from "@/components/AdminOperationsTab";
import { AccountClosureRequestsTab } from "@/components/AccountClosureRequestsTab";
import { Link, useLocation } from "wouter";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

function parseReportEvidenceForAdmin(raw?: string) {
  if (!raw) return { notes: "", listingReference: "", contactEmail: "", attachments: [] as Array<{ name: string; url: string }> };
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1) return {
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      listingReference: typeof parsed.listingReference === "string" ? parsed.listingReference : "",
      contactEmail: typeof parsed.contactEmail === "string" ? parsed.contactEmail : "",
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments.filter((item: any) => typeof item?.name === "string" && typeof item?.url === "string") : [],
    };
  } catch { /* Legacy evidence is plain text. */ }
  return { notes: raw, listingReference: "", contactEmail: "", attachments: [] as Array<{ name: string; url: string }> };
}

type BillingMemberRecord = {
  userId: number;
  displayName: string;
  planName: string;
  membershipStatus: string;
  billingTerm: string;
};

type BillingMemberSortField = "member" | "status" | "term";
type BillingMemberSortDirection = "asc" | "desc";

const MEMBERSHIP_STATUS_SORT_ORDER: Record<string, number> = {
  active: 10,
  past_due: 20,
  unpaid: 30,
  cancelled: 40,
  complimentary: 50,
  free_launch: 60,
};

const MEMBERSHIP_TERM_SORT_ORDER: Record<string, number> = {
  annual: 10,
  monthly: 20,
  complimentary: 30,
  none: 40,
};

export function sortBillingMembers(members: readonly BillingMemberRecord[], sortBy: BillingMemberSortField, sortDirection: BillingMemberSortDirection) {
  const direction = sortDirection === "asc" ? 1 : -1;
  return [...members].sort((left, right) => {
    const comparison = sortBy === "status"
      ? (MEMBERSHIP_STATUS_SORT_ORDER[left.membershipStatus] ?? 999) - (MEMBERSHIP_STATUS_SORT_ORDER[right.membershipStatus] ?? 999)
      : sortBy === "term"
        ? (MEMBERSHIP_TERM_SORT_ORDER[left.billingTerm] ?? 999) - (MEMBERSHIP_TERM_SORT_ORDER[right.billingTerm] ?? 999)
        : left.displayName.localeCompare(right.displayName);
    return comparison === 0 ? left.displayName.localeCompare(right.displayName) : comparison * direction;
  });
}

type AdminTradeSortField = "createdAt" | "lastActivityAt" | "status" | "requester" | "recipient" | "item";
type AdminTradeSortDirection = "asc" | "desc";

const ADMIN_TRADE_STATUS_ORDER: Record<string, number> = {
  pending: 10,
  negotiating: 20,
  accepted: 30,
  shipping: 40,
  shipped: 50,
  frozen: 60,
  disputed: 70,
  completed: 80,
  declined: 90,
  cancelled: 100,
};

export function filterAdminTrades(trades: readonly any[], searchTerm: string, statusFilter: string) {
  const query = searchTerm.trim().toLowerCase();
  return trades.filter((trade) => {
    const matchesStatus = statusFilter === "all" || String(trade.status ?? "") === statusFilter;
    const searchText = [
      trade.id,
      trade.tradeReferenceNumber,
      trade.referenceNumber,
      trade.requesterDisplayName,
      trade.recipientDisplayName,
      trade.listingTitle,
      trade.listingCategory,
      trade.status,
    ].filter(Boolean).join(" ").toLowerCase();
    return matchesStatus && (!query || searchText.includes(query));
  });
}

export function sortAdminTrades(trades: readonly any[], sortBy: AdminTradeSortField, sortDirection: AdminTradeSortDirection) {
  const direction = sortDirection === "asc" ? 1 : -1;
  return [...trades].sort((left, right) => {
    let comparison = 0;
    if (sortBy === "status") {
      comparison = (ADMIN_TRADE_STATUS_ORDER[String(left.status)] ?? 999) - (ADMIN_TRADE_STATUS_ORDER[String(right.status)] ?? 999);
    } else if (sortBy === "requester") {
      comparison = String(left.requesterDisplayName ?? "").localeCompare(String(right.requesterDisplayName ?? ""));
    } else if (sortBy === "recipient") {
      comparison = String(left.recipientDisplayName ?? "").localeCompare(String(right.recipientDisplayName ?? ""));
    } else if (sortBy === "item") {
      comparison = String(left.listingTitle ?? "").localeCompare(String(right.listingTitle ?? ""));
    } else {
      const leftTime = new Date(left[sortBy] ?? 0).getTime();
      const rightTime = new Date(right[sortBy] ?? 0).getTime();
      comparison = leftTime - rightTime;
    }
    return comparison === 0 ? Number(left.id ?? 0) - Number(right.id ?? 0) : comparison * direction;
  });
}

function formatAdminTradeStatus(status: unknown) {
  return String(status ?? "unknown").replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAdminTradeDate(value: unknown) {
  return value ? new Date(String(value)).toLocaleString() : "Not recorded";
}

type AdminGuideEntry = {
  tab: string;
  summary: string;
  purpose: string;
  useWhen: string;
  caution: string;
};

const adminGuideEntries: readonly AdminGuideEntry[] = [
  { tab: "Stats", summary: "A quick picture of how the marketplace is doing.", purpose: "Shows high-level member, listing, value, and trade activity so you can understand the current size and activity of Tradebilia.", useWhen: "Use this for a fast health check, before planning a launch activity, or when you want to see whether the marketplace is growing.", caution: "This tab is for viewing information. It does not change members, listings, or trades." },
  { tab: "Billing", summary: "Membership status, future fee-planning, and direct cash-adjustment monitoring.", purpose: "Shows member membership information, lets you sort it by status or term, contains the Fee Mode launch-control setting, and shows masked PayPal, Venmo, Cash App, and Zelle cash-adjustment status for active trades.", useWhen: "Use it to understand membership status, review future fee plans, or investigate a direct-payment dispute. A payment destination can be revealed only with the exact confirmation phrase, and that access is written to the trade activity log.", caution: "Fee Mode is only a planning switch. Even when On, it does not turn on Checkout, collect a card, charge anyone, or restrict Free Launch access. Tradebilia does not process, hold, insure, refund, or guarantee member-to-member direct payments." },
  { tab: "Users", summary: "The main member-management workspace.", purpose: "Lists member accounts and their account information so an administrator can review a member, update permitted account details, and use available moderation actions.", useWhen: "Use it when a member needs help, when you need to review an account, or when an Operations queue sends you here.", caution: "Archive is not deletion: it requires a reason and the exact confirmation phrase, rechecks current blockers, closes sign-in access, and retains trade, support, and safety history." },
  { tab: "Listings", summary: "The catalogue-management workspace.", purpose: "Lists Tradebilia items and provides searching, sorting, review, and the available listing-management actions.", useWhen: "Use it to find a specific listing, investigate a report, check an item’s status, or address a listing that needs administrator attention.", caution: "Confirm the listing and the reason first. Removing or changing a listing can affect an active collector’s trade activity." },
  { tab: "Trades", summary: "The place to monitor exchanges in progress and completed trade records.", purpose: "Shows trade information, including both collectors involved, so you can follow the lifecycle of an exchange and review a trade when an issue is raised.", useWhen: "Use it for a trade dispute, a shipping or confirmation question, or when Operations identifies a trade follow-up item.", caution: "Only completed, declined, or cancelled trades may be archived. Archive requires a reason and exact phrase, retains every trade record, and keeps archived records available through the filter." },
  { tab: "Settings", summary: "Site-level administrative settings.", purpose: "Provides the available controls for Tradebilia configuration that affect how the platform is presented or managed.", useWhen: "Use it only when you intentionally need to review or update a saved platform setting.", caution: "Settings can have broad effects. Read the field description, confirm the intended value, and save only a deliberate change." },
  { tab: "Deleted", summary: "A reference view for deleted-account records.", purpose: "Helps you review accounts that have been deleted or closed so you can understand their prior platform status when handling a related question.", useWhen: "Use it when a former member contacts support or when you need to distinguish a deleted account from an active one.", caution: "A deleted or closed account is not the same as an open support request. Use Closure Requests for requests that still need a decision." },
  { tab: "Closure Requests", summary: "The controlled review queue for member account-closure requests.", purpose: "Shows closure requests, the count-only safety review, and the available approve-or-decline decision with a documented reason.", useWhen: "Use it when a member asks to close an account and the request appears in the queue.", caution: "Approve closure only after reviewing the account’s pending trade and safety context. Closure hides the profile and listings and blocks future sign-in; retained trade, report, and safety history is not erased." },
  { tab: "Reports", summary: "Member-submitted concerns that need review.", purpose: "Shows reports about members or trade-related concerns and their authorized details so you can review what was reported.", useWhen: "Use it when the Operations queue shows Member reports or when a collector reports a concern directly.", caution: "Treat reports as review items, not automatic proof. Use only the relevant authorized context and avoid exposing private information." },
  { tab: "Referrals", summary: "Referral requests and invitation management.", purpose: "Lets you manage the referral invitation template, review requests, select recipients, and use the available sending or deletion controls.", useWhen: "Use it when following up on referral requests or preparing the approved referral invitation message.", caution: "Email sending and deletion are real actions. Review selected recipients and the message before confirming a bulk action." },
  { tab: "Pre-Launch Email", summary: "A controlled launch-update email workspace.", purpose: "Lets you prepare a message for opted-in Coming Soon contacts, review the eligible recipient list, preview the email, and confirm a send.", useWhen: "Use it only when you are ready to communicate a launch update to contacts who chose to receive it.", caution: "A preview does not send email, but the final confirmed send does. Check the wording, recipient count, and opt-in audience carefully." },
  { tab: "Media Storage", summary: "Storage health and public-media maintenance.", purpose: "Shows safe storage-usage and health information for public photos and artwork, plus the separately controlled public-media migration tools.", useWhen: "Use it to monitor storage capacity, investigate public image coverage, or perform an approved public-media maintenance task.", caution: "The health report does not expose credentials or private evidence. Use migration controls only after reviewing their scope; they are not a general-purpose file browser." },
  { tab: "Conventions", summary: "Convention and event administration.", purpose: "Provides the workspace for maintaining convention information that Tradebilia members may use when planning collector activity.", useWhen: "Use it when you need to add, review, or maintain a convention/event entry.", caution: "Verify event details before publishing or changing them so members receive accurate dates, locations, and information." },
  { tab: "Mod Log", summary: "The history of moderation decisions.", purpose: "Shows a chronological record of administrator moderation actions, who performed them, the target, and the recorded reason.", useWhen: "Use it before handling a repeat issue, answering an internal question, or confirming what action was already taken.", caution: "This is an audit trail. It explains past actions but does not replace reviewing the current facts before making a new decision." },
  { tab: "Tickets", summary: "Support requests that need a response or resolution.", purpose: "Organizes incoming support tickets so administrators can review their status, priority, and available follow-up actions.", useWhen: "Use it when the Operations queue shows urgent support or when a member needs help that is not a report or trade case.", caution: "Close & retain requires a reason and exact phrase. It closes the ticket and removes it from the ordinary list, but keeps the original request and every reply available through the retained-ticket filter." },
  { tab: "Flagged", summary: "Content flags and Feedback Safety review in one workspace.", purpose: "Shows reported content for review and a separate Feedback Safety queue for low-feedback safety records, with deliberate review outcomes.", useWhen: "Use it when Operations shows Content flags or Feedback safety, or when reviewing a moderation concern about public content.", caution: "A flag identifies something to review; it is not an automatic conclusion. Choose Reviewed, Dismissed, or Action taken only after checking the appropriate context." },
  { tab: "Approvals", summary: "Marketplace-access approval queue.", purpose: "Shows accounts that can finish setup but require an administrator decision before they can use marketplace actions.", useWhen: "Use it when Operations shows Pending approvals or when reviewing an account awaiting marketplace access.", caution: "Approve or decline based on the account information shown. This decision affects whether the account can participate in marketplace activity." },
  { tab: "API Health", summary: "Sanitized diagnostic records for external-service failures.", purpose: "Shows recent provider/API failures without secrets, raw request data, or raw provider responses. You can select and clear only records you have reviewed.", useWhen: "Use it when a feature relying on an external service appears unavailable or when monitoring recurring technical failures.", caution: "Clear removes only the selected diagnostic records after confirmation and records the administrator action. It does not fix an external provider problem or alter marketplace records." },
  { tab: "Operations", summary: "A read-only command center for the main administrator work queues.", purpose: "Combines system health, action counts, Closure Requests, trade follow-up, timeline, launch readiness, and safe internal exports, then links you to the correct tab for action.", useWhen: "Start here for a daily review, to see what needs attention, or to open the related workspace from an action-queue count.", caution: "Operations summarizes and routes work; it does not itself resolve a closure request, report, change a trade, or send a message. Follow the link to the proper tab before acting." },
];

function AdminGuideTab() {
  return (
    <div className="space-y-5">
      <Card className="border-violet-200 bg-[linear-gradient(135deg,#f5f3ff_0%,#ffffff_58%,#f0f9ff_100%)]">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><BookOpen className="h-5 w-5" aria-hidden="true" /></div>
            <div><CardTitle>Admin Guide</CardTitle><CardDescription className="mt-1 max-w-3xl text-slate-700">A plain-language reference for the administrator dashboard. Open any section to see what that tab is for, when to use it, and what to double-check before you act.</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent><p className="rounded-lg border border-violet-100 bg-white/80 p-4 text-sm leading-6 text-slate-700"><strong className="text-slate-950">A simple way to use this dashboard:</strong> start with <strong className="text-slate-950">Operations</strong> for the day’s priorities, then open the listed workspace to review and act. Use the other tabs when you already know the type of task you need to complete.</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-xl">What each tab does</CardTitle><CardDescription>There are {adminGuideEntries.length} current administrator workspaces. This guide describes the tabs you can select in the dashboard navigation.</CardDescription></CardHeader>
        <CardContent>
          <Accordion type="multiple" className="rounded-xl border bg-card px-4">
            {adminGuideEntries.map((entry) => (
              <AccordionItem key={entry.tab} value={entry.tab} className="border-border">
                <AccordionTrigger className="py-5 hover:no-underline"><span><span className="block text-base font-semibold text-foreground">{entry.tab}</span><span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground">{entry.summary}</span></span></AccordionTrigger>
                <AccordionContent className="pb-5">
                  <dl className="grid gap-4 rounded-lg bg-muted/45 p-4 text-sm leading-6 md:grid-cols-3">
                    <div><dt className="font-semibold text-foreground">What it does</dt><dd className="mt-1 text-muted-foreground">{entry.purpose}</dd></div>
                    <div><dt className="font-semibold text-foreground">When to use it</dt><dd className="mt-1 text-muted-foreground">{entry.useWhen}</dd></div>
                    <div><dt className="font-semibold text-foreground">Before you act</dt><dd className="mt-1 text-muted-foreground">{entry.caution}</dd></div>
                  </dl>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-xl">Quick tools above the tabs</CardTitle><CardDescription>These are shortcuts, not administrator tabs.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border p-4"><p className="font-semibold">Test AI Sandbox</p><p className="mt-1 text-sm leading-6 text-muted-foreground">A separate administrator workspace for testing future Trade AI Analyzer work. It is not the live member-facing trade workflow.</p></div><div className="rounded-lg border p-4"><p className="font-semibold">Coming Soon Preview</p><p className="mt-1 text-sm leading-6 text-muted-foreground">A preview of the public Coming Soon experience. Use it to review presentation, not to manage members, trades, or platform records.</p></div></CardContent>
      </Card>
    </div>
  );
}

function AdminListingsTab({ listingsQuery }: { listingsQuery: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"refId" | "title" | "category" | "date" | "value" | "views" | "status" | "owner">("refId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedListingForDelete, setSelectedListingForDelete] = useState<any>(null);
  const [selectedListings, setSelectedListings] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const deleteMutation = trpc.market.adminDeleteListing.useMutation({
    onSuccess: () => {
      listingsQuery.refetch();
      setDeleteDialogOpen(false);
      setSelectedListingForDelete(null);
    },
  });

  const bulkDeleteMutation = trpc.market.adminBulkDeleteListings.useMutation({
    onSuccess: () => {
      listingsQuery.refetch();
      setBulkDeleteDialogOpen(false);
      setSelectedListings(new Set());
    },
  });

  const handleDeleteClick = (listing: any) => {
    setSelectedListingForDelete(listing);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (reason?: string) => {
    if (selectedListingForDelete) {
      await deleteMutation.mutateAsync({
        listingId: selectedListingForDelete.id,
        deletionReason: reason || undefined,
      });
    }
  };

  const handleToggleListingSelection = (listingId: number) => {
    const newSelected = new Set(selectedListings);
    if (newSelected.has(listingId)) {
      newSelected.delete(listingId);
    } else {
      newSelected.add(listingId);
    }
    setSelectedListings(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedListings.size === filteredAndSortedListings.length) {
      setSelectedListings(new Set());
    } else {
      const allIds = new Set(filteredAndSortedListings.map((l: any) => l.id));
      setSelectedListings(allIds);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedListings.size > 0) {
      setBulkDeleteDialogOpen(true);
    }
  };

  const handleConfirmBulkDelete = async (reason?: string) => {
    if (selectedListings.size > 0) {
      await bulkDeleteMutation.mutateAsync({
        listingIds: Array.from(selectedListings),
        deletionReason: reason || undefined,
      });
    }
  };

  const filteredAndSortedListings = useMemo(() => {
    if (!listingsQuery.data) return [];

    let filtered = (listingsQuery.data as any[]).filter((listing: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        listing.id.toString().includes(searchLower) ||
        listing.title.toLowerCase().includes(searchLower) ||
        listing.category.toLowerCase().includes(searchLower) ||
        listing.ownerProfile?.displayName?.toLowerCase().includes(searchLower)
      );
    });

    filtered.sort((a: any, b: any) => {
      let compareValue = 0;
      switch (sortBy) {
        case "refId":
          compareValue = a.id - b.id;
          break;
        case "title":
          compareValue = a.title.localeCompare(b.title);
          break;
        case "category":
          compareValue = a.category.localeCompare(b.category);
          break;
        case "date":
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "value":
          compareValue = (a.estimatedValue || 0) - (b.estimatedValue || 0);
          break;
        case "views":
          compareValue = (a.viewCount || 0) - (b.viewCount || 0);
          break;
        case "status":
          compareValue = (a.status || "").localeCompare(b.status || "");
          break;
        case "owner":
          compareValue = (a.ownerProfile?.displayName || "").localeCompare(b.ownerProfile?.displayName || "");
          break;
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [listingsQuery.data, searchTerm, sortBy, sortOrder]);

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listings Management</CardTitle>
        <CardDescription>
          Review, moderate, and manage collectible listings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Ref ID, Title, Category, or Owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>

        {selectedListings.size > 0 && (
          <div className="flex items-center gap-2 bg-accent/50 p-3 rounded border border-accent">
            <span className="text-sm font-medium">{selectedListings.size} selected</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDeleteClick}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected
            </Button>
          </div>
        )}

        {listingsQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading listings...</div>
        ) : filteredAndSortedListings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 px-4 w-12">
                    <Checkbox
                      checked={selectedListings.size === filteredAndSortedListings.length && filteredAndSortedListings.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left py-2 px-4 cursor-pointer hover:bg-accent/50" onClick={() => toggleSort("refId")}>
                    <div className="flex items-center gap-2">
                      Ref ID
                      {sortBy === "refId" && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left py-2 px-4 cursor-pointer hover:bg-accent/50" onClick={() => toggleSort("category")}>
                    <div className="flex items-center gap-2">
                      Category
                      {sortBy === "category" && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left py-2 px-4 cursor-pointer hover:bg-accent/50" onClick={() => toggleSort("title")}>
                    <div className="flex items-center gap-2">
                      Item Title
                      {sortBy === "title" && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left py-2 px-4 cursor-pointer hover:bg-accent/50" onClick={() => toggleSort("date")}>
                    <div className="flex items-center gap-2">
                      Created Date
                      {sortBy === "date" && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left py-2 px-4 cursor-pointer hover:bg-accent/50" onClick={() => toggleSort("value")}>
                    <div className="flex items-center gap-2">
                      Value
                      {sortBy === "value" && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left py-2 px-4 cursor-pointer hover:bg-accent/50" onClick={() => toggleSort("views")}>
                    <div className="flex items-center gap-2">
                      View Count
                      {sortBy === "views" && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left py-2 px-4 cursor-pointer hover:bg-accent/50" onClick={() => toggleSort("status")}>
                    <div className="flex items-center gap-2">
                      Status
                      {sortBy === "status" && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left py-2 px-4 cursor-pointer hover:bg-accent/50" onClick={() => toggleSort("owner")}>
                    <div className="flex items-center gap-2">
                      Username
                      {sortBy === "owner" && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedListings.map((listing: any) => (
                  <tr key={listing.id} className="border-b border-border hover:bg-accent/50">
                    <td className="py-2 px-4 w-12">
                      <Checkbox
                        checked={selectedListings.has(listing.id)}
                        onCheckedChange={() => handleToggleListingSelection(listing.id)}
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Link href={`/listings/${listing.id}`} className="text-blue-600 hover:text-blue-800 font-semibold">
                        #{listing.id}
                      </Link>
                    </td>
                    <td className="py-2 px-4">{listing.category}</td>
                    <td className="py-2 px-4 truncate max-w-xs">{listing.title}</td>
                    <td className="py-2 px-4">{new Date(listing.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-4">{formatItemValue(listing.estimatedValue)}</td>
                    <td className="py-2 px-4">{listing.viewCount || 0}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        listing.status === 'active' ? 'bg-green-500/20 text-green-700' : 'bg-gray-500/20 text-gray-700'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="py-2 px-4">{listing.ownerProfile?.displayName || `User ${listing.ownerId}`}</td>
                    <td className="py-2 px-4">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(listing)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No listings found</div>
        )}
        <div className="text-xs text-muted-foreground">
          Showing {filteredAndSortedListings.length} of {listingsQuery.data?.length || 0} listings
        </div>
      </CardContent>

      {selectedListingForDelete && (
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          itemCount={1}
          itemTitles={[selectedListingForDelete.title]}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteDialogOpen(false)}
          isLoading={deleteMutation.isPending}
        />
      )}

      {selectedListings.size > 0 && (
        <DeleteConfirmationDialog
          isOpen={bulkDeleteDialogOpen}
          itemCount={selectedListings.size}
          itemTitles={filteredAndSortedListings
            .filter((l: any) => selectedListings.has(l.id))
            .map((l: any) => l.title)}
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setBulkDeleteDialogOpen(false)}
          isLoading={bulkDeleteMutation.isPending}
        />
      )}
    </Card>
  );
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("statistics");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportResolutionNotes, setReportResolutionNotes] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [includeArchivedTrades, setIncludeArchivedTrades] = useState(false);
  const [tradeSearchTerm, setTradeSearchTerm] = useState("");
  const [tradeStatusFilter, setTradeStatusFilter] = useState("all");
  const [tradeSortBy, setTradeSortBy] = useState<AdminTradeSortField>("lastActivityAt");
  const [tradeSortDirection, setTradeSortDirection] = useState<AdminTradeSortDirection>("desc");
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const statsQuery = trpc.admin.getPlatformStatistics.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
  });
  const usersQuery = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
  });
  const listingsQuery = trpc.admin.getAllListings.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
  });
  const deletedAccountsQuery = trpc.admin.getDeletedAccounts.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
  });
  const tradesQuery = trpc.admin.getAllTrades.useQuery({ includeArchived: includeArchivedTrades }, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
  });
  const visibleAdminTrades = useMemo(() => {
    const filtered = filterAdminTrades((tradesQuery.data as any[]) ?? [], tradeSearchTerm, tradeStatusFilter);
    return sortAdminTrades(filtered, tradeSortBy, tradeSortDirection);
  }, [tradesQuery.data, tradeSearchTerm, tradeStatusFilter, tradeSortBy, tradeSortDirection]);
  const reportsQuery = trpc.admin.getReportedUsers.useQuery(
    { status: undefined, limit: 50, offset: 0 },
    {
      enabled: user?.role === "admin",
      refetchOnWindowFocus: true,
    }
  );
  const referralsQuery = trpc.admin.getAllReferrals.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
  });
  const suspendedUsersQuery = trpc.admin.getSuspendedUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
  });
  const archiveUserMutation = trpc.admin.archiveUser.useMutation();
  const archiveTradesMutation = trpc.admin.archiveTrade.useMutation({
    onSuccess: () => {
      tradesQuery.refetch();
      setTradeDeleteConfirmOpen(false);
      setTradeToDelete(null);
      setTradeArchiveReason("");
      setTradeArchivePhrase("");
      toast.success('Trade archived. Its records were retained.');
    },
    onError: (err) => {
      toast.error('Failed to archive trade: ' + err.message);
    },
  });
  const [tradeDeleteConfirmOpen, setTradeDeleteConfirmOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<any>(null);
  const [tradeArchiveReason, setTradeArchiveReason] = useState("");
  const [tradeArchivePhrase, setTradeArchivePhrase] = useState("");
  const updateReportStatusMutation = trpc.admin.updateReportStatus.useMutation();
  const updateUserMutation = trpc.admin.updateUser.useMutation();
  const updateReferralStatusMutation = trpc.admin.updateReferralStatus.useMutation();
  const suspendUserMutation = trpc.admin.suspendUser.useMutation();
  const unsuspendUserMutation = trpc.admin.unsuspendUser.useMutation();
  const verifyMerchantMutation = trpc.admin.verifyMerchant.useMutation();
  const warnUserMutation = trpc.admin.warnUser.useMutation();
  const banUserMutation = trpc.admin.banUser.useMutation();
  const unbanUserMutation = trpc.admin.unbanUser.useMutation();
  const bannedUsersQuery = trpc.admin.getBannedUsers.useQuery(undefined, { enabled: user?.role === 'admin' });
  const moderationLogQuery = trpc.admin.getModerationLog.useQuery(undefined, { enabled: user?.role === 'admin' });
  const pendingApprovalsQuery = trpc.admin.getPendingAccountApprovals.useQuery(undefined, { enabled: user?.role === 'admin', refetchOnWindowFocus: true });
  const apiHealthQuery = trpc.admin.getApiHealthEvents.useQuery(undefined, { enabled: user?.role === 'admin', refetchOnWindowFocus: true });
  const [selectedApiHealthEventIds, setSelectedApiHealthEventIds] = useState<Set<number>>(new Set());
  const [apiHealthClearConfirmOpen, setApiHealthClearConfirmOpen] = useState(false);
  const clearApiHealthEventsMutation = trpc.admin.clearApiHealthEvents.useMutation({
    onSuccess: (result) => {
      setSelectedApiHealthEventIds(new Set());
      setApiHealthClearConfirmOpen(false);
      apiHealthQuery.refetch();
      toast.success(`${result.clearedCount} API health event${result.clearedCount === 1 ? '' : 's'} cleared.`);
    },
    onError: (error) => toast.error(error.message),
  });
  const billingOverviewQuery = trpc.billing.getOverview.useQuery(undefined, { enabled: user?.role === "admin", refetchOnWindowFocus: true });
  const billingMembersQuery = trpc.billing.getMembers.useQuery(undefined, { enabled: user?.role === "admin", refetchOnWindowFocus: true });
  const externalCashAdjustmentsQuery = trpc.payment.listExternalCashAdjustmentsForAdmin.useQuery(undefined, { enabled: user?.role === "admin", refetchOnWindowFocus: true });
  const [cashRevealDialogOpen, setCashRevealDialogOpen] = useState(false);
  const [cashRevealPaymentId, setCashRevealPaymentId] = useState<number | null>(null);
  const [cashRevealPhrase, setCashRevealPhrase] = useState("");
  const [revealedCashIdentifier, setRevealedCashIdentifier] = useState<{ method: string; identifier: string } | null>(null);
  const revealCashIdentifierMutation = trpc.payment.revealExternalCashIdentifierForAdmin.useMutation({
    onSuccess: (result) => { setRevealedCashIdentifier(result); setCashRevealPhrase(""); toast.success("Payment identifier revealed and recorded in the trade activity log."); },
    onError: (error) => toast.error(error.message),
  });
  const [feeModeDialogOpen, setFeeModeDialogOpen] = useState(false);
  const [pendingFeeModeEnabled, setPendingFeeModeEnabled] = useState(false);
  const [feeModePassword, setFeeModePassword] = useState("");
  const [feeModePhrase, setFeeModePhrase] = useState("");
  const updateFeeModeMutation = trpc.billing.updateFeeMode.useMutation({
    onSuccess: (result) => {
      setFeeModeDialogOpen(false);
      setFeeModePassword("");
      setFeeModePhrase("");
      billingOverviewQuery.refetch();
      toast.success(`Fee Mode launch control is now ${result.enabled ? "On" : "Off"}. Payment enforcement remains inactive.`);
    },
    onError: (error) => toast.error(error.message),
  });
  const reviewApprovalMutation = trpc.admin.reviewAccountApproval.useMutation({
    onSuccess: () => pendingApprovalsQuery.refetch(),
    onError: (error) => toast.error(error.message),
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userArchiveReason, setUserArchiveReason] = useState("");
  const [userArchivePhrase, setUserArchivePhrase] = useState("");
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [referralStatusDialogOpen, setReferralStatusDialogOpen] = useState(false);
  const [referralStatus, setReferralStatus] = useState<string>("pending");
  const [referralNotes, setReferralNotes] = useState<string>("");
  const [selectedSuspendedUser, setSelectedSuspendedUser] = useState<any>(null);
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [warnMessage, setWarnMessage] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [userToAction, setUserToAction] = useState<any>(null);
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [userMerchantFilter, setUserMerchantFilter] = useState<'all' | 'pending' | 'verified' | 'none'>('all');
  const [userSortBy, setUserSortBy] = useState<'id' | 'username' | 'joined' | 'items' | 'status' | 'merchant'>('id');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [userSearch, setUserSearch] = useState('');
  const [billingSortBy, setBillingSortBy] = useState<BillingMemberSortField>("member");
  const [billingSortDirection, setBillingSortDirection] = useState<BillingMemberSortDirection>("asc");
  const sortedBillingMembers = sortBillingMembers(billingMembersQuery.data ?? [], billingSortBy, billingSortDirection);

  const handleDeleteUser = async () => {
    console.log('[handleDeleteUser] Starting delete, userToDelete:', userToDelete);
    if (!userToDelete) {
      console.log('[handleDeleteUser] No user to delete, returning');
      return;
    }
    try {
      const userId = parseInt(userToDelete.id, 10);
      await archiveUserMutation.mutateAsync({ userId, reason: userArchiveReason, confirmationPhrase: userArchivePhrase as "ARCHIVE MEMBER ACCOUNT" });
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      setUserArchiveReason("");
      setUserArchivePhrase("");
      usersQuery.refetch();
      toast.success("Account archived. Trade, support, and safety history was retained.");
    } catch (error) {
      console.error('[handleDeleteUser] Failed to delete user', error);
    }
  };

  const handleEditUser = () => {
    setEditMode(true);
    setEditFormData({ ...selectedUser });
  };

  const handleSaveUser = async () => {
    try {
      await updateUserMutation.mutateAsync({
        userId: selectedUser.id,
        ...editFormData,
      });
      setEditMode(false);
      setEditFormData(null);
      usersQuery.refetch();
      setSelectedUser(null);
    } catch (error) {
      console.error('[handleSaveUser] Failed to update user', error);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: string) => {
    try {
      await updateReportStatusMutation.mutateAsync({
        reportId,
        status: status as 'pending' | 'reviewed' | 'dismissed' | 'action_taken',
        adminNotes: reportResolutionNotes.trim() || undefined,
      });
      setSelectedReport(null);
      setReportResolutionNotes("");
      reportsQuery.refetch();
    } catch (error) {
      console.error('[handleUpdateReportStatus] Failed to update report status', error);
    }
  };

  const handleSuspendUser = async (userId: number, reason: string) => {
    try {
      await suspendUserMutation.mutateAsync({ userId, reason });
      suspendedUsersQuery.refetch();
      usersQuery.refetch();
      setSuspendDialogOpen(false);
      setSuspendReason('');
      setUserToAction(null);
    } catch (error) {
      console.error('[handleSuspendUser] Failed to suspend user', error);
    }
  };

  const handleUnsuspendUser = async (userId: number) => {
    try {
      await unsuspendUserMutation.mutateAsync({ userId });
      suspendedUsersQuery.refetch();
      usersQuery.refetch();
      setSelectedSuspendedUser(null);
    } catch (error) {
      console.error('[handleUnsuspendUser] Failed to unsuspend user', error);
    }
  };

  const handleBanUser = async (userId: number, reason: string) => {
    try {
      await banUserMutation.mutateAsync({ userId, reason });
      bannedUsersQuery.refetch();
      usersQuery.refetch();
      setBanDialogOpen(false);
      setBanReason('');
      setUserToAction(null);
    } catch (error) {
      console.error('[handleBanUser] Failed to ban user', error);
    }
  };

  const handleUnbanUser = async (userId: number) => {
    try {
      await unbanUserMutation.mutateAsync({ userId });
      bannedUsersQuery.refetch();
      usersQuery.refetch();
    } catch (error) {
      console.error('[handleUnbanUser] Failed to unban user', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Check if user is admin
  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Access Denied
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              You do not have permission to access the admin dashboard. Only administrators can view this page.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/";
            }}
            size="lg"
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar hideSearch />
      <div className="w-full px-6 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage platform users, listings, and settings
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href="/test-ai">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors">
                🧪 Test AI Sandbox
              </button>
            </Link>
            <Link href="/coming-soon">
              <button className="inline-flex items-center gap-2 rounded-lg border border-[#29A8FF]/50 bg-[#07142d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d2349]">
                <ExternalLink className="h-4 w-4" />
                Coming Soon Preview
              </button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1 p-1.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 h-auto">
            <TabsTrigger value="statistics" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Settings className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Package className="h-4 w-4" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Package className="h-4 w-4" />
              Trades
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Users className="h-4 w-4" />
              Deleted
            </TabsTrigger>
            <TabsTrigger value="account-closures" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <ShieldOff className="h-4 w-4" />
              Closure Requests
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Flag className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Mail className="h-4 w-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="pre-launch-email" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Send className="h-4 w-4" />
              Pre-Launch Email
            </TabsTrigger>
            <TabsTrigger value="media-storage" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <CloudUpload className="h-4 w-4" />
              Media Storage
            </TabsTrigger>
            <TabsTrigger value="conventions" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Calendar className="h-4 w-4" />
              Conventions
            </TabsTrigger>
            <TabsTrigger value="modlog" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <ClipboardList className="h-4 w-4" />
              Mod Log
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <TicketCheck className="h-4 w-4" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="flagged" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <Flag className="h-4 w-4" />
              Flagged
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <CheckCircle className="h-4 w-4" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="api-health" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <AlertTriangle className="h-4 w-4" />
              API Health
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <ClipboardList className="h-4 w-4" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="admin-guide" className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 whitespace-nowrap">
              <BookOpen className="h-4 w-4" />
              Admin Guide
            </TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Members"
                value={statsQuery.data?.totalMembers.toString() ?? "Loading..."}
                description="Active registered users"
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                title="Total Listings"
                value={statsQuery.data?.totalListings.toString() ?? "Loading..."}
                description="Active collectible items"
                icon={<Package className="h-4 w-4" />}
              />
              <StatCard
                title="Total Trades"
                value={statsQuery.data?.totalTrades.toString() ?? "Loading..."}
                description="Trade proposals"
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <StatCard
                title="Platform Value"
                value={statsQuery.data ? formatWholeDollar(statsQuery.data.totalValue) : "Loading..."}
                description="Total inventory value"
                icon={<BarChart3 className="h-4 w-4" />}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>
                  Key metrics and statistics about the Tradebilia platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Platform overview data will be displayed here with charts and detailed analytics.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="billing" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Membership &amp; Billing</CardTitle>
                <CardDescription>Free Launch is active. Stripe, checkout, card collection, and payment enforcement remain unavailable.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {billingOverviewQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading membership configuration…</p>
                ) : billingOverviewQuery.error ? (
                  <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Membership configuration is temporarily unavailable. Free Launch access remains unchanged.</p>
                ) : (
                  <>
                    <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Current status</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{billingOverviewQuery.data?.billing.statusLabel}</p>
                      <p className="mt-1 text-sm text-slate-700">{billingOverviewQuery.data?.billing.statusMessage}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Fee Mode launch control</p>
                          <p className="mt-1 text-base font-semibold text-slate-900">{billingOverviewQuery.data?.billing.feeModeEnabled ? "On" : "Off"}</p>
                          <p className="mt-1 max-w-2xl text-sm text-slate-700">This records future fee-mode intent only. It does not enable Stripe Checkout, charge anyone, or restrict access. A separate launch-readiness decision is required before payment enforcement.</p>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm"><span className="text-sm font-medium">Fee Mode</span><Switch checked={Boolean(billingOverviewQuery.data?.billing.feeModeEnabled)} onCheckedChange={(enabled) => { setPendingFeeModeEnabled(enabled); setFeeModePassword(""); setFeeModePhrase(""); setFeeModeDialogOpen(true); }} aria-label="Change Fee Mode launch control" /></div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {billingOverviewQuery.data?.billing.futureSubscriptionTerms.map((term) => (
                        <div key={term.code} className="rounded-lg border p-4">
                          <p className="font-semibold">{term.label}</p>
                          <p className="text-sm text-muted-foreground">Future Tradebilia Membership: {term.displayPrice}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-semibold">Member status monitoring</h3>
                        <div className="flex flex-wrap items-center gap-2" aria-label="Membership monitoring sort controls">
                          <span className="text-sm text-muted-foreground">Sort by</span>
                          <Select value={billingSortBy} onValueChange={(value) => setBillingSortBy(value as BillingMemberSortField)}>
                            <SelectTrigger className="w-[150px] bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="status">Status</SelectItem>
                              <SelectItem value="term">Billing term</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={billingSortDirection} onValueChange={(value) => setBillingSortDirection(value as BillingMemberSortDirection)}>
                            <SelectTrigger className="w-[130px] bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc">Ascending</SelectItem>
                              <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-3 overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[520px] text-sm">
                          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Member</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Term</th></tr></thead>
                          <tbody>
                            {sortedBillingMembers.map((member) => <tr key={member.userId} className="border-t"><td className="p-3 font-medium">{member.displayName}</td><td className="p-3">{member.planName}</td><td className="p-3">{member.membershipStatus}</td><td className="p-3">{member.billingTerm}</td></tr>)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>External Cash Adjustments</CardTitle>
                <CardDescription>Monitor direct PayPal, Venmo, Cash App, and Zelle cash adjustments. Tradebilia does not process, hold, or guarantee these payments; destinations remain masked unless an administrator records a dispute-related need to view them.</CardDescription>
              </CardHeader>
              <CardContent>
                {externalCashAdjustmentsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading external cash adjustments…</p> : externalCashAdjustmentsQuery.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Cash-adjustment monitoring is temporarily unavailable.</p> : (externalCashAdjustmentsQuery.data?.length ?? 0) === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No cash adjustments have been selected for a trade yet.</p> : <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Trade</th><th className="p-3">Payer → Payee</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3">Destination</th><th className="p-3">Action</th></tr></thead><tbody>{externalCashAdjustmentsQuery.data?.map((adjustment: any) => <tr key={adjustment.paymentId} className="border-t"><td className="p-3 font-medium">TR-{adjustment.proposalId}</td><td className="p-3">{adjustment.payerName} → {adjustment.payeeName}</td><td className="p-3">{formatWholeDollar(adjustment.amount)}</td><td className="p-3 capitalize">{String(adjustment.paymentMethod ?? "Not selected").replace("_", " ")}</td><td className="p-3 capitalize">{String(adjustment.status).replace("_", " ")}</td><td className="p-3 font-mono text-xs">{adjustment.paymentIdentifier}</td><td className="p-3"><Button variant="outline" size="sm" onClick={() => { setCashRevealPaymentId(adjustment.paymentId); setCashRevealPhrase(""); setRevealedCashIdentifier(null); setCashRevealDialogOpen(true); }} disabled={!adjustment.paymentMethod || adjustment.paymentIdentifier === "Not set"}>Audited reveal</Button></td></tr>)}</tbody></table></div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all user accounts including suspended and banned users.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 text-sm border border-border rounded-md bg-background w-48"
                      />
                    </div>
                    {/* Status Filter */}
                    <select
                      value={userStatusFilter}
                      onChange={e => setUserStatusFilter(e.target.value as any)}
                      className="text-sm border border-border rounded-md px-3 py-2 bg-background"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                      <option value="closed">Archived</option>
                    </select>
                    {/* Merchant Filter */}
                    <select
                      value={userMerchantFilter}
                      onChange={e => setUserMerchantFilter(e.target.value as any)}
                      className="text-sm border border-border rounded-md px-3 py-2 bg-background"
                    >
                      <option value="all">All Merchant Types</option>
                      <option value="pending">Merchants — Pending Review</option>
                      <option value="verified">Merchants — Verified</option>
                      <option value="none">Non-Merchants</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Pending merchant review alert */}
                {(() => {
                  const pendingCount = ((usersQuery.data as any[]) || []).filter(
                    (u: any) => u.isMerchant && !u.merchantVerified
                  ).length;
                  if (pendingCount === 0) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setUserMerchantFilter('pending')}
                      className="mb-4 w-full flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                        <Store className="h-4 w-4" />
                        {pendingCount} merchant{pendingCount !== 1 ? 's' : ''} awaiting verification
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Review now →</span>
                    </button>
                  );
                })()}
                {usersQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                ) : usersQuery.data && usersQuery.data.length > 0 ? (() => {
                  const filtered = (usersQuery.data as any[]).filter((u: any) => {
                    const matchSearch = !userSearch || [
                      u.id?.toString(), u.username, u.firstName, u.lastName, u.contactEmail
                    ].some(f => f?.toLowerCase().includes(userSearch.toLowerCase()));
                    const accountStatus = u.isAccountClosed ? 'closed' : u.isBanned ? 'banned' : u.isSuspended ? 'suspended' : 'active';
                    const matchStatus = userStatusFilter === 'all' || accountStatus === userStatusFilter;
                    const merchantState = !u.isMerchant ? 'none' : u.merchantVerified ? 'verified' : 'pending';
                    const matchMerchant = userMerchantFilter === 'all' || merchantState === userMerchantFilter;
                    return matchSearch && matchStatus && matchMerchant;
                  });
                  const sorted = [...filtered].sort((a: any, b: any) => {
                    let aVal: any, bVal: any;
                    if (userSortBy === 'id') { aVal = a.id; bVal = b.id; }
                    else if (userSortBy === 'username') { aVal = a.username?.toLowerCase(); bVal = b.username?.toLowerCase(); }
                    else if (userSortBy === 'joined') { aVal = a.createdAt; bVal = b.createdAt; }
                    else if (userSortBy === 'items') { aVal = a.itemsListed || 0; bVal = b.itemsListed || 0; }
                    else if (userSortBy === 'status') {
                      const order = { active: 0, suspended: 1, banned: 2, closed: 3 };
                      aVal = order[a.isAccountClosed ? 'closed' : a.isBanned ? 'banned' : a.isSuspended ? 'suspended' : 'active'];
                      bVal = order[b.isAccountClosed ? 'closed' : b.isBanned ? 'banned' : b.isSuspended ? 'suspended' : 'active'];
                    }
                    else if (userSortBy === 'merchant') {
                      // Pending first so the admin action queue surfaces at the top
                      const order = { pending: 0, verified: 1, none: 2 };
                      aVal = order[!a.isMerchant ? 'none' : a.merchantVerified ? 'verified' : 'pending'];
                      bVal = order[!b.isMerchant ? 'none' : b.merchantVerified ? 'verified' : 'pending'];
                    }
                    if (aVal < bVal) return userSortOrder === 'asc' ? -1 : 1;
                    if (aVal > bVal) return userSortOrder === 'asc' ? 1 : -1;
                    return 0;
                  });
                  const toggleSort = (col: typeof userSortBy) => {
                    if (userSortBy === col) setUserSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                    else { setUserSortBy(col); setUserSortOrder('asc'); }
                  };
                  const SortHeader = ({ col, label }: { col: typeof userSortBy, label: string }) => (
                    <th className="text-left py-2 px-4 cursor-pointer select-none hover:bg-accent/50" onClick={() => toggleSort(col)}>
                      <div className="flex items-center gap-1">{label}<ArrowUpDown className="h-3 w-3 opacity-50" /></div>
                    </th>
                  );
                  return (
                  <div className="overflow-x-auto">
                    <div className="text-xs text-muted-foreground mb-2">{sorted.length} user{sorted.length !== 1 ? 's' : ''} shown</div>
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <SortHeader col="id" label="User ID" />
                          <th className="text-left py-2 px-4">First Name</th>
                          <th className="text-left py-2 px-4">Last Name</th>
                          <SortHeader col="username" label="Display Name" />
                          <th className="text-left py-2 px-4">Email</th>
                          <SortHeader col="joined" label="Joined" />
                          <SortHeader col="items" label="Items" />
                          <th className="text-left py-2 px-4">Online</th>
                          <th className="text-left py-2 px-4">Role</th>
                          <SortHeader col="status" label="Status" />
                          <SortHeader col="merchant" label="Merchant" />
                          <th className="text-left py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((u: any) => {
                          const accountStatus = u.isAccountClosed ? 'closed' : u.isBanned ? 'banned' : u.isSuspended ? 'suspended' : 'active';
                          return (
                          <tr key={u.id} className={`border-b border-border hover:bg-accent/50 ${
                            accountStatus === 'banned' ? 'bg-red-50/50' : accountStatus === 'suspended' ? 'bg-yellow-50/50' : accountStatus === 'closed' ? 'bg-slate-50/70' : ''
                          }`}>
                            <td className="py-2 px-4 font-mono text-xs">{u.id}</td>
                            <td className="py-2 px-4">
                              <button onClick={() => setSelectedUser(u)} className="text-blue-600 hover:underline cursor-pointer">
                                {u.firstName || "-"}
                              </button>
                            </td>
                            <td className="py-2 px-4">
                              <button onClick={() => setSelectedUser(u)} className="text-blue-600 hover:underline cursor-pointer">
                                {u.lastName || "-"}
                              </button>
                            </td>
                            <td className="py-2 px-4 font-medium">{u.displayName || u.username || '-'}</td>
                            <td className="py-2 px-4 text-xs">{u.contactEmail || "-"}</td>
                            <td className="py-2 px-4 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                            <td className="py-2 px-4 text-center font-semibold">{u.itemsListed || 0}</td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                u.isOnline ? 'bg-green-500/20 text-green-700' : 'bg-gray-500/20 text-gray-700'
                              }`}>{u.isOnline ? 'Online' : 'Offline'}</span>
                            </td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                u.role === 'admin' ? 'bg-red-500/20 text-red-700' : 'bg-blue-500/20 text-blue-700'
                              }`}>{u.role}</span>
                            </td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                accountStatus === 'closed' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                accountStatus === 'banned' ? 'bg-red-100 text-red-700 border border-red-200' :
                                accountStatus === 'suspended' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                'bg-green-100 text-green-700 border border-green-200'
                              }`}>
                                {accountStatus === 'closed' ? 'Archived' : accountStatus === 'banned' ? '🚫 Banned' : accountStatus === 'suspended' ? '⏸ Suspended' : '✅ Active'}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              {!u.isMerchant ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : u.merchantVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  <CheckCircle className="h-3 w-3" /> Verified
                                </span>
                              ) : (
                                <button
                                  onClick={() => setSelectedUser(u)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors whitespace-nowrap"
                                  title="Click to review and verify this merchant"
                                >
                                  <Store className="h-3 w-3" /> Pending
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex flex-wrap gap-1">
                                <Button size="sm" variant="outline" onClick={() => setSelectedUser(u)}>Edit</Button>
                                {u.role !== 'admin' && accountStatus !== 'closed' && (
                                  <>
                                    {accountStatus !== 'banned' && (
                                      accountStatus === 'suspended' ? (
                                        <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                                          onClick={() => handleUnsuspendUser(u.id)}
                                          disabled={unsuspendUserMutation.isPending}>
                                          Unsuspend
                                        </Button>
                                      ) : (
                                        <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 hover:bg-orange-50"
                                          onClick={() => { setUserToAction(u); setSuspendDialogOpen(true); }}>
                                          Suspend
                                        </Button>
                                      )
                                    )}
                                    {accountStatus === 'banned' ? (
                                      <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50"
                                        onClick={() => handleUnbanUser(u.id)}
                                        disabled={unbanUserMutation.isPending}>
                                        Unban
                                      </Button>
                                    ) : (
                                      <Button size="sm" variant="destructive"
                                        onClick={() => { setUserToAction(u); setBanDialogOpen(true); }}>
                                        Ban
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-700 hover:bg-slate-50"
                                      onClick={() => { setUserToDelete(u); setDeleteConfirmOpen(true); }}>
                                      Archive
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  );
                })() : (
                  <div className="text-sm text-muted-foreground">No users found</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4 mt-6">
            <AdminListingsTab listingsQuery={listingsQuery} />
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Trades</CardTitle>
                <CardDescription>
                  Review trade records. Archiving retains every message, alert, tracking record, and history item while removing an eligible finished trade from the normal list.
                </CardDescription>
                <Button variant="outline" size="sm" className="mt-3 w-fit" onClick={() => setIncludeArchivedTrades((current) => !current)}>
                  {includeArchivedTrades ? "Hide archived records" : "Show archived records"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_210px_auto]">
                  <Input value={tradeSearchTerm} onChange={(event) => setTradeSearchTerm(event.target.value)} placeholder="Search trade ID, participant, item, or reference" aria-label="Search admin trades" />
                  <Select value={tradeStatusFilter} onValueChange={setTradeStatusFilter}>
                    <SelectTrigger aria-label="Filter trades by status"><SelectValue placeholder="All stages" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stages</SelectItem>
                      {Object.keys(ADMIN_TRADE_STATUS_ORDER).map((status) => <SelectItem key={status} value={status}>{formatAdminTradeStatus(status)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={tradeSortBy} onValueChange={(value) => setTradeSortBy(value as AdminTradeSortField)}>
                    <SelectTrigger aria-label="Sort trades by"><SelectValue placeholder="Sort trades" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastActivityAt">Last activity</SelectItem>
                      <SelectItem value="createdAt">Created date</SelectItem>
                      <SelectItem value="status">Stage</SelectItem>
                      <SelectItem value="requester">Requester</SelectItem>
                      <SelectItem value="recipient">Recipient</SelectItem>
                      <SelectItem value="item">Requested item</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setTradeSortDirection((current) => current === "asc" ? "desc" : "asc")} aria-label={`Sort ${tradeSortDirection === "asc" ? "descending" : "ascending"}`}><ArrowUpDown className="mr-2 h-4 w-4" />{tradeSortDirection === "asc" ? "Ascending" : "Descending"}</Button>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Showing {visibleAdminTrades.length} of {(tradesQuery.data as any[] | undefined)?.length ?? 0} loaded trade records. Use “Show archived records” to include retained archived trades.</div>
                {tradesQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading trades...</div>
                ) : visibleAdminTrades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2 px-4">ID / Reference</th>
                          <th className="text-left py-2 px-4">Requester</th>
                          <th className="text-left py-2 px-4">Recipient</th>
                          <th className="text-left py-2 px-4">Requested item</th>
                          <th className="text-left py-2 px-4">Stage</th>
                          <th className="text-left py-2 px-4">Last activity</th>
                          <th className="text-left py-2 px-4">Value / offered</th>
                          <th className="text-left py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleAdminTrades.map((trade: any) => (
                          <tr key={trade.id} className="border-b border-border hover:bg-accent/50">
                            <td className="py-2 px-4 font-mono text-xs"><div>#{trade.id}</div><div className="mt-1 text-[10px] text-muted-foreground">{trade.tradeReferenceNumber || trade.referenceNumber || "No reference"}</div></td>
                            <td className="py-2 px-4">{trade.requesterDisplayName || "-"}<div className="text-[10px] text-muted-foreground">ID {trade.requesterId}</div></td>
                            <td className="py-2 px-4">{trade.recipientDisplayName || "-"}<div className="text-[10px] text-muted-foreground">ID {trade.recipientId}</div></td>
                            <td className="py-2 px-4"><div>{trade.listingTitle || "-"}</div><div className="text-[10px] capitalize text-muted-foreground">{String(trade.listingCategory || "").replace(/_/g, " ") || "Category unavailable"}</div></td>
                            <td className="py-2 px-4">
                              <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                                trade.status === 'completed' ? 'bg-green-100 text-green-800' :
                                trade.status === 'pending' || trade.status === 'negotiating' ? 'bg-yellow-100 text-yellow-800' :
                                trade.status === 'declined' || trade.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                trade.status === 'disputed' || trade.status === 'frozen' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {formatAdminTradeStatus(trade.status)}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-xs">{formatAdminTradeDate(trade.lastActivityAt || trade.updatedAt || trade.createdAt)}</td>
                            <td className="py-2 px-4 text-xs"><div>{trade.requestedListingValue != null ? formatWholeDollar(Number(trade.requestedListingValue)) : "Value unavailable"}</div><div className="text-muted-foreground">{Number(trade.offeredItemCount || 0)} offered item{Number(trade.offeredItemCount || 0) === 1 ? "" : "s"}</div></td>
                            <td className="py-2 px-4"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => navigate(`/trade-room/${trade.id}?adminView=1`)} className="h-7 px-2 text-xs">Trade Room</Button><Button variant="destructive" size="sm" onClick={() => { setTradeToDelete(trade); setTradeDeleteConfirmOpen(true); }} disabled={archiveTradesMutation.isPending || trade.isArchived} className="h-7 px-2 text-xs"><Archive className="mr-1 h-3 w-3" />{trade.isArchived ? "Archived" : "Archive"}</Button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No trades found</div>
                )}
              </CardContent>
            </Card>

            {/* Trade Details Dialog */}
            <Dialog open={Boolean(selectedTrade)} onOpenChange={(open) => { if (!open) setSelectedTrade(null); }}>
              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Trade #{selectedTrade?.id} details</DialogTitle>
                  <DialogDescription>Administrator-only view of the complete trade record, including its current stage and recorded lifecycle events.</DialogDescription>
                </DialogHeader>
                {selectedTrade && (
                  <div className="space-y-5 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Stage</p><p className="mt-1 font-semibold">{formatAdminTradeStatus(selectedTrade.status)}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Trade reference</p><p className="mt-1 font-mono">{selectedTrade.tradeReferenceNumber || selectedTrade.referenceNumber || "Not assigned"}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Record state</p><p className="mt-1">{selectedTrade.isArchived ? "Archived record" : "Active record"}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Requester</p><p className="mt-1">{selectedTrade.requesterDisplayName || "Unknown"} <span className="text-muted-foreground">(ID {selectedTrade.requesterId})</span></p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Recipient</p><p className="mt-1">{selectedTrade.recipientDisplayName || "Unknown"} <span className="text-muted-foreground">(ID {selectedTrade.recipientId})</span></p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Requested item</p><p className="mt-1">{selectedTrade.listingTitle || "Unavailable"} <span className="text-muted-foreground">({String(selectedTrade.listingCategory || "").replace(/_/g, " ") || "category unavailable"})</span></p></div>
                    </div>
                    <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Requested item value</p><p className="mt-1 font-semibold">{selectedTrade.requestedListingValue != null ? formatWholeDollar(Number(selectedTrade.requestedListingValue)) : "Unavailable"}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Offered items</p><p className="mt-1 font-semibold">{Number(selectedTrade.offeredItemCount || 0)}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Cash adjustment</p><p className="mt-1 font-semibold">{formatWholeDollar(Number(selectedTrade.cashFromRequester || 0) + Number(selectedTrade.cashFromRecipient || 0))}</p></div>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Lifecycle dates</h4>
                      <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
                        {[['Created', selectedTrade.createdAt], ['Updated', selectedTrade.updatedAt], ['Last activity', selectedTrade.lastActivityAt], ['Responded', selectedTrade.respondedAt], ['Negotiating', selectedTrade.negotiatingAt], ['Accepted', selectedTrade.acceptedAt], ['Shipping', selectedTrade.shippingAt], ['Shipped', selectedTrade.shippedAt], ['Shipping deadline', selectedTrade.shippingDeadline], ['Receipt deadline', selectedTrade.receiptDeadline], ['Feedback deadline', selectedTrade.feedbackDeadline], ['Completed', selectedTrade.completedAt], ['Frozen', selectedTrade.frozenAt]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b py-1.5"><span className="text-muted-foreground">{label}</span><span className="text-right">{formatAdminTradeDate(value)}</span></div>)}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><h4 className="mb-1 font-semibold">Member message</h4><p className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3">{selectedTrade.note || selectedTrade.initiatorMessage || "No member message recorded."}</p></div>
                      <div><h4 className="mb-1 font-semibold">Status or freeze reason</h4><p className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3">{selectedTrade.declineReason || selectedTrade.frozenReason || "No status reason recorded."}</p></div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Requester cash</p><p className="mt-1">{formatWholeDollar(Number(selectedTrade.cashFromRequester || 0))}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Recipient cash</p><p className="mt-1">{formatWholeDollar(Number(selectedTrade.cashFromRecipient || 0))}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Middleman</p><p className="mt-1">{selectedTrade.middleManRequested ? (selectedTrade.middleManApproved ? "Requested and approved" : "Requested; pending approval") : "Not requested"}</p></div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            {/* Trade Archive Confirmation Dialog */}
            <Dialog open={tradeDeleteConfirmOpen} onOpenChange={setTradeDeleteConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archive Trade Record?</DialogTitle>
                  <DialogDescription>
                    This will archive trade <strong>#{tradeToDelete?.id}</strong> between <strong>{tradeToDelete?.requesterDisplayName || 'Unknown'}</strong> and <strong>{tradeToDelete?.recipientDisplayName || 'Unknown'}</strong> for item <strong>{tradeToDelete?.listingTitle || 'Unknown'}</strong>.
                    <br /><br />
                    It retains messages, alerts, items, tracking numbers, and all existing history. Only completed, declined, or cancelled trades are eligible.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div><label className="text-sm font-medium" htmlFor="trade-archive-reason">Reason</label><Textarea id="trade-archive-reason" value={tradeArchiveReason} onChange={(event) => setTradeArchiveReason(event.target.value)} maxLength={180} placeholder="Record why this finished trade should be archived." /></div>
                  <div><label className="text-sm font-medium" htmlFor="trade-archive-phrase">Type ARCHIVE TRADE RECORD to confirm</label><Input id="trade-archive-phrase" value={tradeArchivePhrase} onChange={(event) => setTradeArchivePhrase(event.target.value)} autoComplete="off" /></div>
                </div>
                <div className="flex gap-3 justify-end mt-4">
                  <Button variant="outline" onClick={() => setTradeDeleteConfirmOpen(false)} disabled={archiveTradesMutation.isPending}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => tradeToDelete && archiveTradesMutation.mutate({ tradeId: tradeToDelete.id, reason: tradeArchiveReason, confirmationPhrase: tradeArchivePhrase as "ARCHIVE TRADE RECORD" })}
                    disabled={archiveTradesMutation.isPending || tradeArchiveReason.trim().length < 10 || tradeArchivePhrase !== "ARCHIVE TRADE RECORD"}
                  >
                    {archiveTradesMutation.isPending ? 'Archiving...' : 'Archive & retain'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Deleted Accounts Tab */}
          <TabsContent value="deleted" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Deleted Accounts</CardTitle>
                <CardDescription>
                  Track deleted user accounts to prevent re-registration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deletedAccountsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading deleted accounts...</div>
                ) : deletedAccountsQuery.data && deletedAccountsQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2 px-4">Username</th>
                          <th className="text-left py-2 px-4">First Name</th>
                          <th className="text-left py-2 px-4">Last Name</th>
                          <th className="text-left py-2 px-4">Email</th>
                          <th className="text-left py-2 px-4">Deleted By</th>
                          <th className="text-left py-2 px-4">Deleted At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deletedAccountsQuery.data.map((account) => (
                          <tr key={account.id} className="border-b border-border hover:bg-accent/50">
                            <td className="py-2 px-4 font-mono text-xs">{account.username}</td>
                            <td className="py-2 px-4">{account.firstName || "-"}</td>
                            <td className="py-2 px-4">{account.lastName || "-"}</td>
                            <td className="py-2 px-4">{account.email || "-"}</td>
                            <td className="py-2 px-4 text-xs">{account.deletedBy}</td>
                            <td className="py-2 px-4 text-xs">
                              {account.deletedAt ? new Date(account.deletedAt).toLocaleDateString() : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No deleted accounts found</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account-closures" className="space-y-4 mt-6">
            <AccountClosureRequestsTab />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure platform parameters and features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Platform settings interface coming soon. You'll be able to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Configure platform parameters</li>
                    <li>Manage email templates</li>
                    <li>Set trading fees or commissions</li>
                    <li>Configure notification settings</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reported Users Tab */}
          <TabsContent value="reports" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-500" />
                  Reported Users
                </CardTitle>
                <CardDescription>
                  Review and manage user reports submitted by the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading reports...</div>
                ) : reportsQuery.data && (reportsQuery.data as any[]).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="py-2 px-4 font-semibold text-xs">Report ID</th>
                          <th className="py-2 px-4 font-semibold text-xs">Reported User</th>
                          <th className="py-2 px-4 font-semibold text-xs">Reason</th>
                          <th className="py-2 px-4 font-semibold text-xs">Status</th>
                          <th className="py-2 px-4 font-semibold text-xs">Date</th>
                          <th className="py-2 px-4 font-semibold text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportsQuery.data as any[]).map((report: any) => (
                          <tr key={report.id} className="border-b border-border hover:bg-accent/50">
                            <td className="py-2 px-4 font-mono text-xs font-semibold text-blue-500">{report.reportId}</td>
                            <td className="py-2 px-4">{report.reportedUserName}</td>
                            <td className="py-2 px-4 text-xs">{report.reason}</td>
                            <td className="py-2 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' :
                                report.status === 'reviewed' ? 'bg-blue-500/20 text-blue-700' :
                                report.status === 'dismissed' ? 'bg-gray-500/20 text-gray-700' :
                                'bg-red-500/20 text-red-700'
                              }`}>
                                {report.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-xs">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setReportResolutionNotes(report.adminNotes ?? "");
                                }}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No reports found</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4 mt-6">
            <ReferralsTab />
          </TabsContent>
          <TabsContent value="pre-launch-email" className="space-y-4 mt-6">
            <PreLaunchEmailTab />
          </TabsContent>
          <TabsContent value="media-storage" className="space-y-4 mt-6">
            <R2StorageHealthTab />
            <R2MediaMigrationTab />
          </TabsContent>
          <TabsContent value="conventions" className="space-y-4 mt-6">
            <ConventionsAdminTab />
          </TabsContent>

          {/* Suspended Users Tab */}
          <TabsContent value="suspended" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Suspended Users</CardTitle>
                <CardDescription>
                  Manage suspended user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suspendedUsersQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading suspended users...</div>
                ) : suspendedUsersQuery.data && suspendedUsersQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold">Username</th>
                          <th className="text-left py-3 px-4 font-semibold">Email</th>
                          <th className="text-left py-3 px-4 font-semibold">Role</th>
                          <th className="text-left py-3 px-4 font-semibold">Suspended At</th>
                          <th className="text-right py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspendedUsersQuery.data.map((user: any) => (
                          <tr key={user.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">{user.username}</td>
                            <td className="py-3 px-4">{user.contactEmail || '-'}</td>
                            <td className="py-3 px-4 capitalize">{user.role}</td>
                            <td className="py-3 px-4">
                              {user.suspendedAt ? new Date(user.suspendedAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnsuspendUser(user.id)}
                                disabled={unsuspendUserMutation.isPending}
                              >
                                Unsuspend
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No suspended users</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banned Users Tab */}
          <TabsContent value="banned" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Permanently Banned Users</CardTitle>
                <CardDescription>Users who have been permanently banned from the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {bannedUsersQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : bannedUsersQuery.data && bannedUsersQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold">Username</th>
                          <th className="text-left py-3 px-4 font-semibold">Display Name</th>
                          <th className="text-left py-3 px-4 font-semibold">Email</th>
                          <th className="text-left py-3 px-4 font-semibold">Banned At</th>
                          <th className="text-left py-3 px-4 font-semibold">Reason</th>
                          <th className="text-right py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(bannedUsersQuery.data as any[]).map((u: any) => (
                          <tr key={u.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-mono text-xs">{u.username}</td>
                            <td className="py-3 px-4">{u.displayName || '-'}</td>
                            <td className="py-3 px-4">{u.email || '-'}</td>
                            <td className="py-3 px-4 text-xs">{u.bannedAt ? new Date(u.bannedAt).toLocaleDateString() : '-'}</td>
                            <td className="py-3 px-4 text-xs max-w-[200px] truncate">{u.banReason || '-'}</td>
                            <td className="py-3 px-4 text-right">
                              <Button size="sm" variant="outline" className="border-green-500 text-green-600"
                                onClick={() => unbanUserMutation.mutate({ userId: u.id }, { onSuccess: () => { bannedUsersQuery.refetch(); usersQuery.refetch(); } })}
                                disabled={unbanUserMutation.isPending}
                              >
                                Remove Ban
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No banned users</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Log Tab */}
          <TabsContent value="modlog" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Moderation Audit Log</CardTitle>
                <CardDescription>A complete record of all moderation actions taken by admins</CardDescription>
              </CardHeader>
              <CardContent>
                {moderationLogQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : moderationLogQuery.data && moderationLogQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold">Date</th>
                          <th className="text-left py-3 px-4 font-semibold">Admin</th>
                          <th className="text-left py-3 px-4 font-semibold">Action</th>
                          <th className="text-left py-3 px-4 font-semibold">Target User</th>
                          <th className="text-left py-3 px-4 font-semibold">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(moderationLogQuery.data as any[]).map((log: any) => (
                          <tr key={log.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="py-3 px-4 font-medium">{log.adminName || log.adminUsername || '-'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                log.action === 'ban' ? 'bg-red-100 text-red-700' :
                                log.action === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                                log.action === 'suspend' ? 'bg-orange-100 text-orange-700' :
                                log.action === 'delete' ? 'bg-red-200 text-red-800' :
                                'bg-green-100 text-green-700'
                              }`}>{log.action}</span>
                            </td>
                            <td className="py-3 px-4">{log.targetName || log.targetUsername || `#${log.targetUserId}`}</td>
                            <td className="py-3 px-4 text-xs text-muted-foreground max-w-[250px] truncate">{log.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No moderation actions recorded yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4 mt-6">
            <SupportTicketsTab />
          </TabsContent>

          {/* Flagged Content Tab */}
          <TabsContent value="flagged" className="space-y-4 mt-6">
            <FlaggedContentTab />
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Account Approvals</CardTitle>
                <CardDescription>Accounts with an IPQS email-history estimate under one year can finish setup but need approval before marketplace actions.</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApprovalsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading approval queue…</p> : (pendingApprovalsQuery.data?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No pending account approvals.</p> : <div className="space-y-3">
                  {pendingApprovalsQuery.data?.map((review: any) => <div key={review.id} className="rounded-lg border p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div><p className="font-medium">{review.displayName || review.username || `User #${review.userId}`}</p><p className="text-sm text-muted-foreground">{review.email || "Email unavailable"} · Email history estimate: under one year</p><p className="text-xs text-muted-foreground mt-1">Email verified: {review.emailVerified ? "Yes" : "No"} · Phone verified: {review.phoneVerified ? "Yes" : "No"}</p></div>
                    <div className="flex gap-2"><Button size="sm" onClick={() => reviewApprovalMutation.mutate({ reviewId: review.id, status: 'approved' })} disabled={reviewApprovalMutation.isPending}>Approve marketplace access</Button><Button size="sm" variant="outline" onClick={() => reviewApprovalMutation.mutate({ reviewId: review.id, status: 'declined' })} disabled={reviewApprovalMutation.isPending}>Decline</Button></div>
                  </div>)}
                </div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-health" className="space-y-4 mt-6">
            <Card>
              <CardHeader><CardTitle>API Health</CardTitle><CardDescription>Recent sanitized external API failures. Keys, request payloads, and raw provider responses are never displayed.</CardDescription></CardHeader>
              <CardContent>
                {apiHealthQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading API health…</p> : (apiHealthQuery.data?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No recorded API failures.</p> : <><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm"><Checkbox checked={selectedApiHealthEventIds.size === (apiHealthQuery.data?.length ?? 0)} onCheckedChange={(checked) => setSelectedApiHealthEventIds(checked ? new Set((apiHealthQuery.data ?? []).map((event: any) => event.id)) : new Set())} aria-label="Select all API health events" />Select all visible</label><Button variant="destructive" size="sm" disabled={selectedApiHealthEventIds.size === 0 || clearApiHealthEventsMutation.isPending} onClick={() => setApiHealthClearConfirmOpen(true)}>Clear selected ({selectedApiHealthEventIds.size})</Button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Select</th><th className="p-2">Provider</th><th className="p-2">Operation</th><th className="p-2">Likely cause</th><th className="p-2">Status</th><th className="p-2">When</th></tr></thead><tbody>{apiHealthQuery.data?.map((event: any) => <tr key={event.id} className="border-b"><td className="p-2"><Checkbox checked={selectedApiHealthEventIds.has(event.id)} onCheckedChange={(checked) => setSelectedApiHealthEventIds((current) => { const next = new Set(current); checked ? next.add(event.id) : next.delete(event.id); return next; })} aria-label={`Select API health event ${event.id}`} /></td><td className="p-2 font-medium">{event.provider}</td><td className="p-2">{event.operation}</td><td className="p-2 capitalize">{event.failureClass.replaceAll('_', ' ')}</td><td className="p-2">{event.statusCode ?? '—'}</td><td className="p-2 whitespace-nowrap">{new Date(event.occurredAt).toLocaleString()}</td></tr>)}</tbody></table></div></>}
              </CardContent>
            </Card>
            <Dialog open={apiHealthClearConfirmOpen} onOpenChange={setApiHealthClearConfirmOpen}><DialogContent><DialogHeader><DialogTitle>Clear selected API health events?</DialogTitle><DialogDescription>This permanently removes only the {selectedApiHealthEventIds.size} selected sanitized health record{selectedApiHealthEventIds.size === 1 ? '' : 's'}. The administrator action is retained in the audit log.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setApiHealthClearConfirmOpen(false)}>Cancel</Button><Button variant="destructive" disabled={clearApiHealthEventsMutation.isPending} onClick={() => clearApiHealthEventsMutation.mutate({ eventIds: [...selectedApiHealthEventIds] })}>Clear selected records</Button></div></DialogContent></Dialog>
          </TabsContent>
          <TabsContent value="operations" className="space-y-4 mt-6">
            <AdminOperationsTab onNavigate={setActiveTab} />
          </TabsContent>
          <TabsContent value="admin-guide" className="space-y-4 mt-6">
            <AdminGuideTab />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={feeModeDialogOpen} onOpenChange={setFeeModeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn Fee Mode {pendingFeeModeEnabled ? "On" : "Off"}?</DialogTitle>
            <DialogDescription>This records the site’s future fee-mode intent only. It does not enable Stripe Checkout, charge members, or enforce paid access.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">For safety, verify your current administrator password and type <strong>{pendingFeeModeEnabled ? "ENABLE TRADEBILIA FEE MODE" : "DISABLE TRADEBILIA FEE MODE"}</strong> exactly.</div>
            <div className="space-y-2"><label className="text-sm font-medium" htmlFor="fee-mode-password">Current administrator password</label><Input id="fee-mode-password" type="password" value={feeModePassword} onChange={(event) => setFeeModePassword(event.target.value)} autoComplete="current-password" /></div>
            <div className="space-y-2"><label className="text-sm font-medium" htmlFor="fee-mode-phrase">Confirmation phrase</label><Input id="fee-mode-phrase" value={feeModePhrase} onChange={(event) => setFeeModePhrase(event.target.value)} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFeeModeDialogOpen(false)}>Cancel</Button><Button disabled={!feeModePassword || feeModePhrase.trim() !== (pendingFeeModeEnabled ? "ENABLE TRADEBILIA FEE MODE" : "DISABLE TRADEBILIA FEE MODE") || updateFeeModeMutation.isPending} onClick={() => updateFeeModeMutation.mutate({ enabled: pendingFeeModeEnabled, currentPassword: feeModePassword, confirmationPhrase: feeModePhrase })}>{updateFeeModeMutation.isPending ? "Verifying…" : `Confirm Fee Mode ${pendingFeeModeEnabled ? "On" : "Off"}`}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cashRevealDialogOpen} onOpenChange={setCashRevealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reveal a private payment destination?</DialogTitle>
            <DialogDescription>Use this only when a cash-adjustment dispute requires it. The reveal is recorded in the trade activity log. Tradebilia does not process or guarantee the payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {revealedCashIdentifier ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>{revealedCashIdentifier.method.replace("_", " ")}</strong><code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-xs">{revealedCashIdentifier.identifier}</code></div> : <><div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Type <strong>REVEAL CASH PAYMENT IDENTIFIER</strong> exactly to continue. Do not share the identifier outside the active dispute review.</div><div className="space-y-2"><label htmlFor="cash-reveal-phrase" className="text-sm font-medium">Confirmation phrase</label><Input id="cash-reveal-phrase" value={cashRevealPhrase} onChange={(event) => setCashRevealPhrase(event.target.value)} /></div></>}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCashRevealDialogOpen(false)}>Close</Button>{!revealedCashIdentifier && <Button disabled={cashRevealPaymentId === null || cashRevealPhrase.trim() !== "REVEAL CASH PAYMENT IDENTIFIER" || revealCashIdentifierMutation.isPending} onClick={() => cashRevealPaymentId && revealCashIdentifierMutation.mutate({ paymentId: cashRevealPaymentId, confirmationPhrase: "REVEAL CASH PAYMENT IDENTIFIER" })}>{revealCashIdentifierMutation.isPending ? "Revealing…" : "Reveal and record access"}</Button>}</div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Profile Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              User Profile Details
              {!editMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditUser}
                  className="ml-2"
                >
                  Edit
                </Button>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Username</p>
                  <p className="text-base">{selectedUser.username}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Email</p>
                  {editMode ? (
                    <input
                      type="email"
                      value={editFormData?.contactEmail || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                      className="w-full px-2 py-1 border border-border rounded text-sm"
                    />
                  ) : (
                    <p className="text-base">{selectedUser.contactEmail || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">First Name</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={editFormData?.firstName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                      className="w-full px-2 py-1 border border-border rounded text-sm"
                    />
                  ) : (
                    <p className="text-base">{selectedUser.firstName || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Last Name</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={editFormData?.lastName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                      className="w-full px-2 py-1 border border-border rounded text-sm"
                    />
                  ) : (
                    <p className="text-base">{selectedUser.lastName || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Display Name</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={editFormData?.displayName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                      className="w-full px-2 py-1 border border-border rounded text-sm"
                    />
                  ) : (
                    <p className="text-base">{selectedUser.displayName || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Role</p>
                  <p className="text-base capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Joined</p>
                  <p className="text-base">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">User ID</p>
                  <p className="text-base text-xs font-mono">{selectedUser.id}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Full Name</p>
                    {editMode ? (
                      <input
                        type="text"
                        value={editFormData?.contactFullName || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, contactFullName: e.target.value })}
                        className="w-full px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <p className="text-base">{selectedUser.contactFullName || "-"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Phone</p>
                    {editMode ? (
                      <input
                        type="tel"
                        value={editFormData?.contactPhone || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
                        className="w-full px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <p className="text-base">{selectedUser.contactPhone || "-"}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-muted-foreground">Address</p>
                    {editMode ? (
                      <input
                        type="text"
                        value={editFormData?.contactAddress || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, contactAddress: e.target.value })}
                        className="w-full px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <p className="text-base">{selectedUser.contactAddress || "-"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">City</p>
                    {editMode ? (
                      <input
                        type="text"
                        value={editFormData?.contactTown || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, contactTown: e.target.value })}
                        className="w-full px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <p className="text-base">{selectedUser.contactTown || "-"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">State</p>
                    {editMode ? (
                      <input
                        type="text"
                        value={editFormData?.contactState || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, contactState: e.target.value })}
                        className="w-full px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <p className="text-base">{selectedUser.contactState || "-"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Zip Code</p>
                    {editMode ? (
                      <input
                        type="text"
                        value={editFormData?.contactZipCode || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, contactZipCode: e.target.value })}
                        className="w-full px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <p className="text-base">{selectedUser.contactZipCode || "-"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Country</p>
                    {editMode ? (
                      <input
                        type="text"
                        value={editFormData?.contactCountry || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, contactCountry: e.target.value })}
                        className="w-full px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <p className="text-base">{selectedUser.contactCountry || "-"}</p>
                    )}
                  </div>
                </div>
              </div>

              {editMode && (
                <div className="border-t border-border pt-4 flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setEditFormData(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveUser}
                    disabled={updateUserMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              )}

              {/* Merchant Information */}
              {selectedUser.isMerchant && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-3">Merchant Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Store Name</p>
                      <p className="text-base">{selectedUser.storeName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Business License</p>
                      <p className="text-base">{selectedUser.businessLicense || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Tax ID</p>
                      <p className="text-base">{selectedUser.taxId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Business Email</p>
                      <p className="text-base">{selectedUser.businessEmail || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Business Phone</p>
                      <p className="text-base">{selectedUser.businessPhone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Business Website</p>
                      <p className="text-base">{selectedUser.businessWebsite || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-muted-foreground">Business Address</p>
                      <p className="text-base">{selectedUser.businessAddress || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-muted-foreground">Store Description</p>
                      <p className="text-base">{selectedUser.storeDescription || "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Account Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-accent/50 p-3 rounded">
                    <p className="text-xs text-muted-foreground">Total Items</p>
                    <p className="text-lg font-semibold">{selectedUser.itemsListed ?? 0}</p>
                  </div>
                  <div className="bg-accent/50 p-3 rounded">
                    <p className="text-xs text-muted-foreground">Warnings</p>
                    <p className="text-lg font-semibold">{selectedUser.warnCount ?? 0}</p>
                  </div>
                  <div className="bg-accent/50 p-3 rounded">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold">
                      {selectedUser.isBanned ? <span className="text-red-600">Banned</span> : selectedUser.isSuspended ? <span className="text-orange-500">Suspended</span> : <span className="text-green-600">Active</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Merchant Verification */}
              {selectedUser.isMerchant ? (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Merchant Verification</h3>
                    {selectedUser.merchantVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle className="h-3 w-3" /> Verified
                        {selectedUser.merchantVerifiedAt ? ` · ${new Date(selectedUser.merchantVerifiedAt).toLocaleDateString()}` : ''}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Pending review</span>
                    )}
                  </div>
                  {selectedUser.merchantVerified ? (
                    <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        verifyMerchantMutation.mutate({ userId: selectedUser.id, verified: false }, {
                          onSuccess: () => {
                            toast.success("Merchant verification revoked");
                            usersQuery.refetch();
                            setSelectedUser((u: any) => ({ ...u, merchantVerified: 0, merchantVerifiedAt: null }));
                          },
                          onError: (e: any) => toast.error(e.message || "Failed to revoke verification"),
                        });
                      }}
                      disabled={verifyMerchantMutation.isPending}
                    >
                      Revoke Verification
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        verifyMerchantMutation.mutate({ userId: selectedUser.id, verified: true }, {
                          onSuccess: () => {
                            toast.success("Merchant verified");
                            usersQuery.refetch();
                            setSelectedUser((u: any) => ({ ...u, merchantVerified: 1, merchantVerifiedAt: new Date().toISOString() }));
                          },
                          onError: (e: any) => toast.error(e.message || "Failed to verify merchant"),
                        });
                      }}
                      disabled={verifyMerchantMutation.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Verify Merchant
                    </Button>
                  )}
                </div>
              ) : null}

              {/* Moderation Actions */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Moderation Actions</h3>
                {selectedUser.role === 'admin' ? (
                  <p className="text-sm text-muted-foreground italic">Moderation actions cannot be applied to admin accounts.</p>
                ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    onClick={() => { setUserToAction(selectedUser); setWarnDialogOpen(true); }}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Warn
                  </Button>
                  {!selectedUser.isSuspended ? (
                    <Button size="sm" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => { setUserToAction(selectedUser); setSuspendDialogOpen(true); }}
                    >
                      <ShieldOff className="h-3.5 w-3.5 mr-1" /> Suspend
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => { unsuspendUserMutation.mutate({ userId: selectedUser.id }, { onSuccess: () => { usersQuery.refetch(); suspendedUsersQuery.refetch(); setSelectedUser((u: any) => ({ ...u, isSuspended: 0 })); } }); }}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Unsuspend
                    </Button>
                  )}
                  {!selectedUser.isBanned ? (
                    <Button size="sm" variant="outline" className="border-red-600 text-red-700 hover:bg-red-50"
                      onClick={() => { setUserToAction(selectedUser); setBanDialogOpen(true); }}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" /> Permanent Ban
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50"
                      onClick={() => { unbanUserMutation.mutate({ userId: selectedUser.id }, { onSuccess: () => { usersQuery.refetch(); bannedUsersQuery.refetch(); setSelectedUser((u: any) => ({ ...u, isBanned: 0 })); } }); }}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Remove Ban
                    </Button>
                  )}
                </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warn User Dialog */}
      <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Warn {userToAction?.displayName || userToAction?.username}</DialogTitle>
            <DialogDescription>This warning will be recorded and visible in the moderation log.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <textarea
              className="w-full border border-border rounded-lg p-3 text-sm min-h-[100px] resize-none"
              placeholder="Describe the reason for this warning..."
              value={warnMessage}
              onChange={(e) => setWarnMessage(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setWarnDialogOpen(false); setWarnMessage(""); }}>Cancel</Button>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" disabled={!warnMessage.trim() || warnUserMutation.isPending}
                onClick={() => {
                  if (!userToAction || !warnMessage.trim()) return;
                  warnUserMutation.mutate({ userId: userToAction.id, message: warnMessage.trim() }, {
                    onSuccess: () => { setWarnDialogOpen(false); setWarnMessage(""); usersQuery.refetch(); moderationLogQuery.refetch(); }
                  });
                }}
              >
                Send Warning
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Permanently Ban {userToAction?.displayName || userToAction?.username}</DialogTitle>
            <DialogDescription>This action will permanently ban the user. They will not be able to log in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <textarea
              className="w-full border border-red-300 rounded-lg p-3 text-sm min-h-[100px] resize-none"
              placeholder="Reason for permanent ban..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setBanDialogOpen(false); setBanReason(""); }}>Cancel</Button>
              <Button variant="destructive" disabled={!banReason.trim() || banUserMutation.isPending}
                onClick={() => {
                  if (!userToAction || !banReason.trim()) return;
                  handleBanUser(userToAction.id, banReason.trim());
                  moderationLogQuery.refetch();
                }}
              >
                Confirm Permanent Ban
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600">Suspend {userToAction?.displayName || userToAction?.username}</DialogTitle>
            <DialogDescription>The user's account will be suspended until manually lifted. Their listings will be deactivated and active trades will be frozen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <textarea
              className="w-full border border-orange-300 rounded-lg p-3 text-sm min-h-[100px] resize-none"
              placeholder="Reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setSuspendDialogOpen(false); setSuspendReason(''); }}>Cancel</Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={!suspendReason.trim() || suspendUserMutation.isPending}
                onClick={() => {
                  if (!userToAction || !suspendReason.trim()) return;
                  handleSuspendUser(userToAction.id, suspendReason.trim());
                  moderationLogQuery.refetch();
                }}
              >
                Confirm Suspension
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Review and manage this user report
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Report ID</p>
                  <p className="text-base font-mono text-blue-500">{selectedReport.reportId}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Status</p>
                  <p className="text-base capitalize">{selectedReport.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Reported User</p>
                  <p className="text-base">{selectedReport.reportedUserName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Reason</p>
                  <p className="text-base">{selectedReport.reason}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-muted-foreground">Description</p>
                  <p className="text-base whitespace-pre-wrap">{selectedReport.description}</p>
                </div>
                {selectedReport.evidence && (() => {
                  const evidence = parseReportEvidenceForAdmin(selectedReport.evidence);
                  return (
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-muted-foreground">Evidence</p>
                    {evidence.listingReference && <p className="text-sm">Reference: <span className="font-mono">{evidence.listingReference}</span></p>}
                    {evidence.contactEmail && <p className="text-sm">Follow-up: {evidence.contactEmail}</p>}
                    {evidence.notes && <p className="text-base whitespace-pre-wrap">{evidence.notes}</p>}
                    {evidence.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{evidence.attachments.map((file: any, index: number) => <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-blue-500/30 px-2 py-1 text-sm text-blue-500 hover:bg-blue-500/10"><ExternalLink className="h-3.5 w-3.5" />{file.name}</a>)}</div>}
                  </div>
                  );
                })()}
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Submitted</p>
                  <p className="text-base">{new Date(selectedReport.createdAt).toLocaleDateString()}</p>
                </div>
                {selectedReport.adminNotes && (
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-muted-foreground">Current Resolution Notes</p>
                    <p className="text-base whitespace-pre-wrap">{selectedReport.adminNotes}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Update Status</h3>
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-semibold text-muted-foreground" htmlFor="report-resolution-notes">Resolution Notes</label>
                  <Textarea id="report-resolution-notes" value={reportResolutionNotes} onChange={(event) => setReportResolutionNotes(event.target.value)} placeholder="Record the review outcome, evidence considered, or next action…" className="min-h-[96px]" maxLength={2000} />
                  <p className="mt-1 text-xs text-muted-foreground">Notes are saved with the status update and remain visible to administrators.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['reviewed', 'dismissed', 'action_taken'].map((status) => (
                    <Button
                      key={status}
                      variant={selectedReport.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateReportStatus(selectedReport.reportId, status)}
                      disabled={updateReportStatusMutation.isPending}
                    >
                      Mark as {status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Retained Account Archive Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Member Account</DialogTitle>
            <DialogDescription>
              This protected action closes sign-in access and hides the member profile and active listings while retaining trade, support, and safety history. It will not delete the account or records.
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Re-check current closure blockers before archiving</li>
                <li>Refuse active, disputed, suspended, banned, or administrator accounts</li>
                <li>Write the reason to the administrator activity log</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded p-3 my-4">
            <p className="text-sm font-semibold">User: {userToDelete?.username}</p>
            <p className="text-sm text-muted-foreground">Email: {userToDelete?.contactEmail}</p>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium" htmlFor="member-archive-reason">Reason</label><Textarea id="member-archive-reason" value={userArchiveReason} onChange={(event) => setUserArchiveReason(event.target.value)} maxLength={180} placeholder="Record why this account should be archived." /></div>
            <div><label className="text-sm font-medium" htmlFor="member-archive-phrase">Type ARCHIVE MEMBER ACCOUNT to confirm</label><Input id="member-archive-phrase" value={userArchivePhrase} onChange={(event) => setUserArchivePhrase(event.target.value)} autoComplete="off" /></div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteConfirmOpen(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={archiveUserMutation.isPending || userArchiveReason.trim().length < 10 || userArchivePhrase !== "ARCHIVE MEMBER ACCOUNT"}
            >
              {archiveUserMutation.isPending ? "Archiving..." : "Archive & retain"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Referral Status Dialog */}
      <Dialog open={referralStatusDialogOpen} onOpenChange={setReferralStatusDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Referral Request</DialogTitle>
            <DialogDescription>
              Collector: {selectedReferral?.collectorName} ({selectedReferral?.collectorEmail})
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Referrer</p>
                  <p className="text-sm">{selectedReferral.referrerName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedReferral.referrerEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Collector Focus</p>
                  <p className="text-sm">{selectedReferral.collectorFocus}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Date</p>
                  <p className="text-sm">{new Date(selectedReferral.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Message</p>
                <p className="text-sm bg-muted/50 p-3 rounded max-h-32 overflow-y-auto">{selectedReferral.message}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Status</label>
                <select
                  value={referralStatus}
                  onChange={(e) => setReferralStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Admin Notes</label>
                <textarea
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  placeholder="Add notes about this referral..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded text-sm h-24"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setReferralStatusDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await updateReferralStatusMutation.mutateAsync({
                        referralId: selectedReferral.id,
                        status: referralStatus as any,
                        adminNotes: referralNotes,
                      });
                      setReferralStatusDialogOpen(false);
                      referralsQuery.refetch();
                    } catch (error) {
                      console.error('Failed to update referral status:', error);
                    }
                  }}
                  disabled={updateReferralStatusMutation.isPending}
                >
                  {updateReferralStatusMutation.isPending ? "Saving..." : "Save Status"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConventionsAdminTab() {
  const utils = trpc.useUtils();
  const pendingQuery = trpc.conventions.pending.useQuery();
  const [scrapeResult, setScrapeResult] = useState<{ inserted: number; skipped: number; errors: number; byCategory: Record<string, number> } | null>(null);
  const approveMutation = trpc.conventions.approve.useMutation({
    onSuccess: () => { pendingQuery.refetch(); },
  });
  const rejectMutation = trpc.conventions.reject.useMutation({
    onSuccess: () => { pendingQuery.refetch(); },
  });
  const deleteMutation = trpc.conventions.delete.useMutation({
    onSuccess: () => { pendingQuery.refetch(); },
  });
  const scrapeMutation = trpc.conventions.scrape.useMutation({
    onSuccess: (result) => {
      setScrapeResult(result);
      pendingQuery.refetch();
    },
    onError: (e) => alert('Scrape failed: ' + e.message),
  });

  const pending = pendingQuery.data ?? [];

  return (
    <div className="space-y-4">
      {/* Scrape trigger */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div>
          <h3 className="font-semibold text-blue-900">Refresh Convention Data</h3>
          <p className="text-sm text-blue-700 mt-0.5">Scrapes all configured sources and inserts new upcoming conventions. Takes ~30 seconds.</p>
          {scrapeResult && (
            <p className="text-xs text-green-700 mt-1 font-medium">
              Last run: {scrapeResult.inserted} new events inserted, {scrapeResult.skipped} already existed, {scrapeResult.errors} errors.
              {Object.keys(scrapeResult.byCategory).length > 0 && (
                <> New by category: {Object.entries(scrapeResult.byCategory).map(([k, v]) => `${k}: ${v}`).join(', ')}</>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => scrapeMutation.mutate()}
          disabled={scrapeMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
        >
          <Calendar className="w-4 h-4" />
          {scrapeMutation.isPending ? 'Scraping...' : 'Run Scraper Now'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pending Convention Submissions</h3>
        <span className="text-sm text-gray-500">{pending.length} pending</span>
      </div>
      {pending.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No pending convention submissions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((conv: any) => (
            <div key={conv.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{conv.name}</h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{conv.category}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600 space-y-0.5">
                    <p>📅 {conv.startDate}{conv.endDate && conv.endDate !== conv.startDate ? ` – ${conv.endDate}` : ""}</p>
                    {(conv.city || conv.state || conv.country) && (
                      <p>📍 {[conv.city, conv.state, conv.country].filter(Boolean).join(", ")}</p>
                    )}
                    {conv.venue && <p>🏢 {conv.venue}</p>}
                    {conv.admission && <p>💵 {conv.admission}</p>}
                    {conv.website && (
                      <a href={conv.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-600 hover:underline">
                        <ExternalLink className="w-3 h-3" />{conv.website}
                      </a>
                    )}
                    {conv.description && <p className="text-gray-500 text-xs mt-1">{conv.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">Submitted by: {conv.submittedByName ?? "Anonymous"} · {new Date(conv.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate({ id: conv.id })}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate({ id: conv.id })}
                    disabled={rejectMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ id: conv.id })}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// ─── Support Tickets Tab ──────────────────────────────────────────────────────
function SupportTicketsTab() {
  const [includeArchivedTickets, setIncludeArchivedTickets] = useState(false);
  const ticketsQuery = trpc.admin.getAllTickets.useQuery({ includeArchived: includeArchivedTickets });
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ticketArchiveOpen, setTicketArchiveOpen] = useState(false);
  const [ticketArchiveReason, setTicketArchiveReason] = useState("");
  const [ticketArchivePhrase, setTicketArchivePhrase] = useState("");

  const repliesQuery = trpc.admin.getTicketReplies.useQuery(
    { ticketId: selectedTicket?.id ?? 0 },
    { enabled: !!selectedTicket }
  );

  const replyMutation = trpc.admin.replyToTicket.useMutation({
    onSuccess: () => {
      repliesQuery.refetch();
      ticketsQuery.refetch();
      setReplyText("");
      toast.success("Reply sent.");
    },
    onError: (e) => toast.error("Failed to send reply: " + e.message),
  });

  const updateStatusMutation = trpc.admin.updateTicketStatus.useMutation({
    onSuccess: () => {
      ticketsQuery.refetch();
      if (selectedTicket) setSelectedTicket((prev: any) => ({ ...prev, status: updateStatusMutation.variables?.status }));
      toast.success("Ticket status updated.");
    },
    onError: (e) => toast.error("Failed to update status: " + e.message),
  });

  const archiveTicketMutation = trpc.admin.archiveTicket.useMutation({
    onSuccess: () => {
      ticketsQuery.refetch();
      setSelectedTicket(null);
      setTicketArchiveOpen(false);
      setTicketArchiveReason("");
      setTicketArchivePhrase("");
      toast.success("Ticket closed and retained.");
    },
    onError: (e) => toast.error("Failed to close ticket: " + e.message),
  });

  const priorityColor: Record<string, string> = {
    urgent: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
  };

  const statusColor: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };

  const tickets = (ticketsQuery.data ?? []) as any[];
  const filtered = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Ticket List */}
      <div className="lg:col-span-1 space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TicketCheck className="h-4 w-4" />
                Support Tickets
                <span className="text-xs font-normal text-muted-foreground">({filtered.length})</span>
              </CardTitle>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setIncludeArchivedTickets((current) => !current)}>
              {includeArchivedTickets ? "Hide retained tickets" : "Show retained tickets"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {ticketsQuery.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading tickets...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No tickets found.</div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filtered.map((ticket: any) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${selectedTicket?.id === ticket.id ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{ticket.subject}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{ticket.submitterDisplayName || ticket.displayName || ticket.username || "Anonymous visitor"}</div>
                        <div className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColor[ticket.priority] ?? ""}`}>
                          {ticket.priority}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColor[ticket.status] ?? ""}`}>
                          {ticket.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail */}
      <div className="lg:col-span-2">
        {!selectedTicket ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center text-muted-foreground py-12">
              <TicketCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a ticket to view details and reply</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{selectedTicket.subject}</CardTitle>
                  <CardDescription className="mt-1">
                    From: <strong>{selectedTicket.submitterDisplayName || selectedTicket.displayName || selectedTicket.username || "Anonymous visitor"}</strong>
                    {(selectedTicket.submitterEmail || selectedTicket.email) && <span className="ml-1 text-xs">({selectedTicket.submitterEmail || selectedTicket.email})</span>}
                    {" · "}{new Date(selectedTicket.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(val) => updateStatusMutation.mutate({ ticketId: selectedTicket.id, status: val as any })}
                  >
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-slate-600 text-slate-700"
                    onClick={() => setTicketArchiveOpen(true)}
                    disabled={selectedTicket.isArchived}
                  >
                    <Archive className="h-3 w-3 mr-1" />
                    {selectedTicket.isArchived ? "Retained" : "Close & retain"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColor[selectedTicket.priority] ?? ""}`}>
                  {selectedTicket.priority} priority
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                  {selectedTicket.category}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Original message */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs font-medium mb-1 text-muted-foreground">Original Message</div>
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Replies */}
              {repliesQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading replies...</div>
              ) : (repliesQuery.data ?? []).length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Conversation</div>
                  {(repliesQuery.data as any[]).map((reply: any) => (
                    <div
                      key={reply.id}
                      className={`rounded-lg p-3 text-sm ${reply.isAdminReply ? "bg-primary/10 ml-4" : "bg-muted/50 mr-4"}`}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium">
                          {reply.isAdminReply ? "Admin" : (reply.displayName || reply.username)}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(reply.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Reply box */}
              {selectedTicket.status !== 'closed' && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="text-sm min-h-[80px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => replyMutation.mutate({ ticketId: selectedTicket.id, message: replyText })}
                      disabled={!replyText.trim() || replyMutation.isPending}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Send Reply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ ticketId: selectedTicket.id, status: 'resolved' })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={ticketArchiveOpen} onOpenChange={setTicketArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close & Retain Ticket</DialogTitle>
            <DialogDescription>This closes the ticket and removes it from the ordinary queue while retaining the original request and every reply. It cannot be used to erase support history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium" htmlFor="ticket-archive-reason">Reason</label><Textarea id="ticket-archive-reason" value={ticketArchiveReason} onChange={(event) => setTicketArchiveReason(event.target.value)} maxLength={180} placeholder="Record why this resolved ticket should be retained outside the normal queue." /></div>
            <div><label className="text-sm font-medium" htmlFor="ticket-archive-phrase">Type CLOSE AND RETAIN TICKET to confirm</label><Input id="ticket-archive-phrase" value={ticketArchivePhrase} onChange={(event) => setTicketArchivePhrase(event.target.value)} autoComplete="off" /></div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setTicketArchiveOpen(false)} disabled={archiveTicketMutation.isPending}>Cancel</Button><Button onClick={() => selectedTicket && archiveTicketMutation.mutate({ ticketId: selectedTicket.id, reason: ticketArchiveReason, confirmationPhrase: ticketArchivePhrase as "CLOSE AND RETAIN TICKET" })} disabled={archiveTicketMutation.isPending || ticketArchiveReason.trim().length < 10 || ticketArchivePhrase !== "CLOSE AND RETAIN TICKET"}>{archiveTicketMutation.isPending ? "Closing..." : "Close & retain"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Flagged Content Tab ──────────────────────────────────────────────────────
function FlaggedContentTab() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'reviewed' | 'dismissed' | 'actioned'>('pending');
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const flagsQuery = trpc.admin.getFlaggedContent.useQuery({ status: statusFilter });
  const lowFeedbackFlagsQuery = trpc.admin.getLowFeedbackFlags.useQuery();

  const reviewMutation = trpc.admin.reviewFlaggedContent.useMutation({
    onSuccess: () => {
      flagsQuery.refetch();
      toast.success("Flag updated.");
    },
    onError: (e) => toast.error("Failed to update flag: " + e.message),
  });
  const reviewLowFeedbackMutation = trpc.admin.reviewLowFeedbackFlag.useMutation({
    onSuccess: () => {
      lowFeedbackFlagsQuery.refetch();
      toast.success("Feedback safety record updated.");
    },
    onError: (error) => toast.error(error.message),
  });

  const contentTypeColor: Record<string, string> = {
    listing: "bg-blue-100 text-blue-800",
    user: "bg-purple-100 text-purple-800",
    trade: "bg-orange-100 text-orange-800",
  };

  const flags = (flagsQuery.data ?? []) as any[];
  const lowFeedbackFlags = (lowFeedbackFlagsQuery.data ?? []) as any[];

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Flagged Content
              <span className="text-xs font-normal text-muted-foreground">({flags.length})</span>
            </CardTitle>
            <div className="flex gap-2">
              {(['pending','reviewed','dismissed','actioned'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {flagsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading flagged content...</div>
          ) : flags.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No {statusFilter} flags.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {flags.map((flag: any) => (
                <div key={flag.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(flag.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${contentTypeColor[flag.contentType] ?? ""}`}>
                        {flag.contentType} #{flag.contentId}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{flag.reason}</div>
                        <div className="text-xs text-muted-foreground">
                          Flagged by {flag.flaggedByDisplayName || flag.flaggedByUsername} · {new Date(flag.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusFilter === 'pending' && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => reviewMutation.mutate({
                              flagId: flag.id,
                              action: 'dismissed',
                              adminNotes: adminNotes[flag.id],
                            })}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                            onClick={() => reviewMutation.mutate({
                              flagId: flag.id,
                              action: 'reviewed',
                              adminNotes: adminNotes[flag.id],
                            })}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Reviewed
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => reviewMutation.mutate({
                              flagId: flag.id,
                              action: 'actioned',
                              adminNotes: adminNotes[flag.id],
                            })}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Action Taken
                          </Button>
                        </div>
                      )}
                      {expanded.has(flag.id) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {expanded.has(flag.id) && (
                    <div className="border-t p-3 bg-muted/30 space-y-3">
                      {flag.description && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                          <p className="text-sm">{flag.description}</p>
                        </div>
                      )}
                      {flag.adminNotes && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Admin Notes</div>
                          <p className="text-sm">{flag.adminNotes}</p>
                        </div>
                      )}
                      {statusFilter === 'pending' && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Add Admin Notes (optional)</div>
                          <Textarea
                            placeholder="Notes about this flag..."
                            value={adminNotes[flag.id] ?? ""}
                            onChange={(e) => setAdminNotes((prev) => ({ ...prev, [flag.id]: e.target.value }))}
                            className="text-sm min-h-[60px]"
                          />
                        </div>
                      )}
                      {flag.reviewedByUsername && (
                        <div className="text-xs text-muted-foreground">
                          Reviewed by {flag.reviewedByUsername} on {new Date(flag.reviewedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Feedback Safety <span className="text-xs font-normal text-muted-foreground">({lowFeedbackFlags.length})</span></CardTitle>
          <CardDescription>Marketplace feedback records that require safety review. Operations lists these separately from member reports and content flags.</CardDescription>
        </CardHeader>
        <CardContent>
          {lowFeedbackFlagsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading feedback safety records…</p> : lowFeedbackFlags.length === 0 ? <p className="text-sm text-muted-foreground">No pending feedback safety records.</p> : <div className="space-y-2">{lowFeedbackFlags.map((flag: any) => <div key={flag.id} className="rounded-lg border p-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-medium">{flag.memberDisplayName}</p><p className="text-sm text-muted-foreground">Feedback score: {flag.feedbackScore} · {flag.feedbackPercentage}% positive</p>{flag.flaggedReason ? <p className="mt-1 text-xs text-muted-foreground">{flag.flaggedReason}</p> : null}<p className="mt-1 text-xs text-muted-foreground">Flagged {new Date(flag.flaggedAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => reviewLowFeedbackMutation.mutate({ flagId: flag.id, action: 'dismissed' })} disabled={reviewLowFeedbackMutation.isPending}>Dismiss</Button><Button size="sm" variant="outline" onClick={() => reviewLowFeedbackMutation.mutate({ flagId: flag.id, action: 'reviewed' })} disabled={reviewLowFeedbackMutation.isPending}>Reviewed</Button><Button size="sm" variant="destructive" onClick={() => reviewLowFeedbackMutation.mutate({ flagId: flag.id, action: 'action_taken' })} disabled={reviewLowFeedbackMutation.isPending}>Action taken</Button></div></div>)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
