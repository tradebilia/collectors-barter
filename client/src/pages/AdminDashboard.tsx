import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3, Users, Package, Settings, Trash2, Flag, Mail, Search, ArrowUpDown, Calendar, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import { ReferralsTab } from "@/components/ReferralsTab";
import { Link } from "wouter";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

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
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const updateReportStatusMutation = trpc.admin.updateReportStatus.useMutation();
  const updateUserMutation = trpc.admin.updateUser.useMutation();
  const updateReferralStatusMutation = trpc.admin.updateReferralStatus.useMutation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [referralStatusDialogOpen, setReferralStatusDialogOpen] = useState(false);
  const [referralStatus, setReferralStatus] = useState<string>("pending");
  const [referralNotes, setReferralNotes] = useState<string>("");

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
      });
      setSelectedReport(null);
      reportsQuery.refetch();
    } catch (error) {
      console.error('[handleUpdateReportStatus] Failed to update report status', error);
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage platform users, listings, and settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 gap-1">
            <TabsTrigger value="statistics" className="flex items-center gap-1 text-xs px-2 py-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1 text-xs px-2 py-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-1 text-xs px-2 py-1">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Listings</span>
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex items-center gap-1 text-xs px-2 py-1">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Trades</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 text-xs px-2 py-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-1 text-xs px-2 py-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Deleted</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1 text-xs px-2 py-1">
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-1 text-xs px-2 py-1">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
            <TabsTrigger value="conventions" className="flex items-center gap-1 text-xs px-2 py-1">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Conventions</span>
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
          <TabsContent value="users" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage user accounts. Click on a name to see full profile details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                ) : usersQuery.data && usersQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2 px-4">User ID</th>
                          <th className="text-left py-2 px-4">First Name</th>
                          <th className="text-left py-2 px-4">Last Name</th>
                          <th className="text-left py-2 px-4">Username</th>
                          <th className="text-left py-2 px-4">Email</th>
                          <th className="text-left py-2 px-4">Joined</th>
                          <th className="text-left py-2 px-4">Items Listed</th>
                          <th className="text-left py-2 px-4">Online Status</th>
                          <th className="text-left py-2 px-4">Role</th>
                          <th className="text-left py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersQuery.data.map((u: any) => (
                          <tr key={u.id} className="border-b border-border hover:bg-accent/50">
                            <td className="py-2 px-4 font-mono text-xs">{u.id}</td>
                            <td className="py-2 px-4">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="text-blue-600 hover:underline cursor-pointer"
                              >
                                {u.firstName || "-"}
                              </button>
                            </td>
                            <td className="py-2 px-4">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="text-blue-600 hover:underline cursor-pointer"
                              >
                                {u.lastName || "-"}
                              </button>
                            </td>
                            <td className="py-2 px-4">{u.username}</td>
                            <td className="py-2 px-4">{u.contactEmail || "-"}</td>
                            <td className="py-2 px-4 text-xs">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                            </td>
                            <td className="py-2 px-4 text-center font-semibold">
                              {u.itemsListed || 0}
                            </td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                u.isOnline ? 'bg-green-500/20 text-green-700' : 'bg-gray-500/20 text-gray-700'
                              }`}>
                                {u.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                u.role === 'admin' ? 'bg-red-500/20 text-red-700' : 'bg-blue-500/20 text-blue-700'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-xs flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedUser(u)}
                              >
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  setUserToDelete(u);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
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
                  Audit all trades between users
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
                                onClick={() => setSelectedReport(report)}
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
          <TabsContent value="conventions" className="space-y-4 mt-6">
            <ConventionsAdminTab />
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

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Account Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-accent/50 p-3 rounded">
                    <p className="text-xs text-muted-foreground">Total Items</p>
                    <p className="text-lg font-semibold">0</p>
                  </div>
                  <div className="bg-accent/50 p-3 rounded">
                    <p className="text-xs text-muted-foreground">Completed Trades</p>
                    <p className="text-lg font-semibold">0</p>
                  </div>
                  <div className="bg-accent/50 p-3 rounded">
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="text-lg font-semibold">-</p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                {selectedReport.evidence && (
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-muted-foreground">Evidence</p>
                    <p className="text-base whitespace-pre-wrap">{selectedReport.evidence}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Submitted</p>
                  <p className="text-base">{new Date(selectedReport.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Update Status</h3>
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
  const approveMutation = trpc.conventions.approve.useMutation({
    onSuccess: () => { pendingQuery.refetch(); },
  });
  const rejectMutation = trpc.conventions.reject.useMutation({
    onSuccess: () => { pendingQuery.refetch(); },
  });
  const deleteMutation = trpc.conventions.delete.useMutation({
    onSuccess: () => { pendingQuery.refetch(); },
  });

  const pending = pendingQuery.data ?? [];

  return (
    <div className="space-y-4">
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
