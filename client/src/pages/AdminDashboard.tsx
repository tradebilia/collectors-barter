import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3, Users, Package, Settings, Trash2, Flag, Mail, Search, ArrowUpDown, Calendar, ExternalLink, CheckCircle, XCircle, AlertTriangle, Ban, ShieldOff, ClipboardList, MessageSquare, TicketCheck, Send, ChevronDown, ChevronUp, Store, CloudUpload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import { ReferralsTab } from "@/components/ReferralsTab";
import { PreLaunchEmailTab } from "@/components/PreLaunchEmailTab";
import { R2MediaMigrationTab } from "@/components/R2MediaMigrationTab";
import { R2StorageHealthTab } from "@/components/R2StorageHealthTab";
import { Link } from "wouter";
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
                    <td className="py-2 px-4">${(listing.estimatedValue || 0).toLocaleString()}</td>
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
  const [activeTab, setActiveTab] = useState("statistics");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportResolutionNotes, setReportResolutionNotes] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
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
  const tradesQuery = trpc.admin.getAllTrades.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
  });
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
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const deleteTradesMutation = trpc.admin.deleteTrade.useMutation({
    onSuccess: () => {
      tradesQuery.refetch();
      setTradeDeleteConfirmOpen(false);
      setTradeToDelete(null);
      toast.success('Trade deleted successfully. All associated records have been removed.');
    },
    onError: (err) => {
      toast.error('Failed to delete trade: ' + err.message);
    },
  });
  const [tradeDeleteConfirmOpen, setTradeDeleteConfirmOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<any>(null);
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
  const reviewApprovalMutation = trpc.admin.reviewAccountApproval.useMutation({
    onSuccess: () => pendingApprovalsQuery.refetch(),
    onError: (error) => toast.error(error.message),
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
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

  const handleDeleteUser = async () => {
    console.log('[handleDeleteUser] Starting delete, userToDelete:', userToDelete);
    if (!userToDelete) {
      console.log('[handleDeleteUser] No user to delete, returning');
      return;
    }
    try {
      const userId = parseInt(userToDelete.id, 10);
      console.log('[handleDeleteUser] Calling mutation with userId:', userId);
      const result = await deleteUserMutation.mutateAsync({ userId });
      console.log('[handleDeleteUser] Mutation result:', result);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      console.log('[handleDeleteUser] Refetching users and deleted accounts');
      usersQuery.refetch();
      deletedAccountsQuery.refetch();
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
      <TopBar />
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
                value={statsQuery.data ? `$${statsQuery.data.totalValue.toLocaleString()}` : "Loading..."}
                description="Total inventory value"
                icon={<BarChart3 className="h-4 w-4" />}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Marketplace ratios</CardTitle>
                <CardDescription>
                  Derived from the current member, listing, trade, and inventory-value totals.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average listing value</p><p className="mt-2 text-2xl font-semibold">{statsQuery.data?.totalListings ? `$${Math.round(statsQuery.data.totalValue / statsQuery.data.totalListings).toLocaleString()}` : "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Listings per member</p><p className="mt-2 text-2xl font-semibold">{statsQuery.data?.totalMembers ? (statsQuery.data.totalListings / statsQuery.data.totalMembers).toFixed(1) : "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trade proposals per member</p><p className="mt-2 text-2xl font-semibold">{statsQuery.data?.totalMembers ? (statsQuery.data.totalTrades / statsQuery.data.totalMembers).toFixed(1) : "—"}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
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
                    const accountStatus = u.isBanned ? 'banned' : u.isSuspended ? 'suspended' : 'active';
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
                      const order = { active: 0, suspended: 1, banned: 2 };
                      aVal = order[a.isBanned ? 'banned' : a.isSuspended ? 'suspended' : 'active'];
                      bVal = order[b.isBanned ? 'banned' : b.isSuspended ? 'suspended' : 'active'];
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
                          const accountStatus = u.isBanned ? 'banned' : u.isSuspended ? 'suspended' : 'active';
                          return (
                          <tr key={u.id} className={`border-b border-border hover:bg-accent/50 ${
                            accountStatus === 'banned' ? 'bg-red-50/50' : accountStatus === 'suspended' ? 'bg-yellow-50/50' : ''
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
                                accountStatus === 'banned' ? 'bg-red-100 text-red-700 border border-red-200' :
                                accountStatus === 'suspended' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                'bg-green-100 text-green-700 border border-green-200'
                              }`}>
                                {accountStatus === 'banned' ? '🚫 Banned' : accountStatus === 'suspended' ? '⏸ Suspended' : '✅ Active'}
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
                                {u.role !== 'admin' && (
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
                                    <Button size="sm" variant="destructive" className="bg-gray-700 hover:bg-gray-800"
                                      onClick={() => { setUserToDelete(u); setDeleteConfirmOpen(true); }}>
                                      Delete
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
                  Audit and manage all trades between users. Deleting a trade permanently removes all associated messages, alerts, and records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tradesQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading trades...</div>
                ) : tradesQuery.data && tradesQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2 px-4">ID</th>
                          <th className="text-left py-2 px-4">Requester</th>
                          <th className="text-left py-2 px-4">Recipient</th>
                          <th className="text-left py-2 px-4">Item</th>
                          <th className="text-left py-2 px-4">Status</th>
                          <th className="text-left py-2 px-4">Created</th>
                          <th className="text-left py-2 px-4">Completed</th>
                          <th className="text-left py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(tradesQuery.data as any[])?.map((trade: any) => (
                          <tr key={trade.id} className="border-b border-border hover:bg-accent/50">
                            <td className="py-2 px-4 font-mono text-xs">{trade.id}</td>
                            <td className="py-2 px-4">{trade.requesterUsername || "-"}</td>
                            <td className="py-2 px-4">{(trade as any).recipientUsername || "-"}</td>
                            <td className="py-2 px-4">{trade.listingTitle || "-"}</td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                trade.status === 'completed' ? 'bg-green-100 text-green-800' :
                                trade.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                trade.status === 'declined' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {trade.status}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-xs">
                              {trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : "-"}
                            </td>
                            <td className="py-2 px-4 text-xs">
                              {trade.completedAt ? new Date(trade.completedAt).toLocaleDateString() : "-"}
                            </td>
                            <td className="py-2 px-4">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => { setTradeToDelete(trade); setTradeDeleteConfirmOpen(true); }}
                                disabled={deleteTradesMutation.isPending}
                                className="h-7 px-2 text-xs"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </td>
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

            {/* Trade Delete Confirmation Dialog */}
            <Dialog open={tradeDeleteConfirmOpen} onOpenChange={setTradeDeleteConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600">Delete Trade Permanently?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete trade <strong>#{tradeToDelete?.id}</strong> between <strong>{tradeToDelete?.requesterUsername || 'Unknown'}</strong> and <strong>{(tradeToDelete as any)?.recipientUsername || 'Unknown'}</strong> for item <strong>{tradeToDelete?.listingTitle || 'Unknown'}</strong>.
                    <br /><br />
                    All associated messages, alerts, items, tracking numbers, and records will be removed. <strong>This cannot be undone.</strong>
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 justify-end mt-4">
                  <Button variant="outline" onClick={() => setTradeDeleteConfirmOpen(false)} disabled={deleteTradesMutation.isPending}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => tradeToDelete && deleteTradesMutation.mutate({ tradeId: tradeToDelete.id })}
                    disabled={deleteTradesMutation.isPending}
                  >
                    {deleteTradesMutation.isPending ? 'Deleting...' : 'Yes, Delete Trade'}
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

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Fee and commission controls will be added only if Tradebilia adopts a fee-based model.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>No platform fees are active. This area is reserved for future fee-based settings and other explicitly approved platform controls.</p>
                </div>
              </CardContent>
            </Card>
            <ConventionsAdminTab />
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
                {apiHealthQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading API health…</p> : (apiHealthQuery.data?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No recorded API failures.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Provider</th><th className="p-2">Operation</th><th className="p-2">Likely cause</th><th className="p-2">Status</th><th className="p-2">When</th></tr></thead><tbody>{apiHealthQuery.data?.map((event: any) => <tr key={event.id} className="border-b"><td className="p-2 font-medium">{event.provider}</td><td className="p-2">{event.operation}</td><td className="p-2 capitalize">{event.failureClass.replaceAll('_', ' ')}</td><td className="p-2">{event.statusCode ?? '—'}</td><td className="p-2 whitespace-nowrap">{new Date(event.occurredAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user account? This action will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Delete the user profile</li>
                <li>Delete all listings owned by this user</li>
                <li>Log the deletion for audit purposes</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded p-3 my-4">
            <p className="text-sm font-semibold">User: {userToDelete?.username}</p>
            <p className="text-sm text-muted-foreground">Email: {userToDelete?.contactEmail}</p>
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
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete Account"}
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
    onError: (e) => toast.error(`Convention refresh failed: ${e.message}`),
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
      {pendingQuery.isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Loading pending convention submissions…</p>
        </div>
      ) : pendingQuery.isError ? (
        <div className="text-center py-12 text-rose-600">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Pending convention submissions could not be loaded.</p>
        </div>
      ) : pending.length === 0 ? (
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
  const ticketsQuery = trpc.admin.getAllTickets.useQuery();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const deleteTicketMutation = trpc.admin.deleteTicket.useMutation({
    onSuccess: () => {
      ticketsQuery.refetch();
      setSelectedTicket(null);
      toast.success("Ticket deleted.");
    },
    onError: (e) => toast.error("Failed to delete ticket: " + e.message),
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
          </CardHeader>
          <CardContent className="p-0">
            {ticketsQuery.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading tickets...</div>
            ) : ticketsQuery.isError ? (
              <div className="p-4 text-sm text-rose-700">Support tickets could not be loaded. Refresh the page and try again.</div>
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
                        <div className="text-xs text-muted-foreground mt-0.5">{ticket.displayName || ticket.username}</div>
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
                    From: <strong>{selectedTicket.displayName || selectedTicket.username}</strong>
                    {selectedTicket.email && <span className="ml-1 text-xs">({selectedTicket.email})</span>}
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
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      if (window.confirm("Delete this support ticket and all of its replies permanently? This cannot be undone.")) {
                        deleteTicketMutation.mutate({ ticketId: selectedTicket.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
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
              ) : repliesQuery.isError ? (
                <div className="text-sm text-rose-700">Ticket replies could not be loaded.</div>
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
    </div>
  );
}

// ─── Flagged Content Tab ──────────────────────────────────────────────────────
function FlaggedContentTab() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'reviewed' | 'dismissed' | 'actioned'>('pending');
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const flagsQuery = trpc.admin.getFlaggedContent.useQuery({ status: statusFilter });

  const reviewMutation = trpc.admin.reviewFlaggedContent.useMutation({
    onSuccess: () => {
      flagsQuery.refetch();
      toast.success("Flag updated.");
    },
    onError: (e) => toast.error("Failed to update flag: " + e.message),
  });

  const contentTypeColor: Record<string, string> = {
    listing: "bg-blue-100 text-blue-800",
    user: "bg-purple-100 text-purple-800",
    trade: "bg-orange-100 text-orange-800",
  };

  const flags = (flagsQuery.data ?? []) as any[];

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
          ) : flagsQuery.isError ? (
            <div className="text-sm text-rose-700">Flagged content could not be loaded. Refresh the page and try again.</div>
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
    </div>
  );
}
