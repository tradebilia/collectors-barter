import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, Users, Package, Settings, Trash2, Flag } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("statistics");
  const [selectedUser, setSelectedUser] = useState<any>(null);
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
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Statistics</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <Package className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Listings</span>
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex items-center gap-2">
              <Package className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Trades</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Users className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Deleted</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Flag className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Reports</span>
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
            <Card>
              <CardHeader>
                <CardTitle>Listings Management</CardTitle>
                <CardDescription>
                  Review, moderate, and manage collectible listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {listingsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading listings...</div>
                ) : listingsQuery.data && listingsQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2 px-4">Title</th>
                          <th className="text-left py-2 px-4">Category</th>
                          <th className="text-left py-2 px-4">Condition</th>
                          <th className="text-left py-2 px-4">Status</th>
                          <th className="text-left py-2 px-4">Owner ID</th>
                          <th className="text-left py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(listingsQuery.data as any[])?.map((listing: any) => (
                          <tr key={listing.id} className="border-b border-border hover:bg-accent/50">
                            <td className="py-2 px-4 truncate max-w-xs">{listing.title}</td>
                            <td className="py-2 px-4">{listing.category}</td>
                            <td className="py-2 px-4">{listing.condition}</td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                listing.status === 'active' ? 'bg-green-500/20 text-green-700' : 'bg-gray-500/20 text-gray-700'
                              }`}>
                                {listing.status}
                              </span>
                            </td>
                            <td className="py-2 px-4">{(listing as any).ownerId}</td>
                            <td className="py-2 px-4 text-xs space-x-2">
                              <Button size="sm" variant="outline">View</Button>
                              <Button size="sm" variant="destructive">Delete</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No listings found</div>
                )}
              </CardContent>
            </Card>
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
                                onClick={() => setSelectedUser(report)}
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
                  <p className="text-base">{selectedUser.contactEmail || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">First Name</p>
                  <p className="text-base">{selectedUser.firstName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Last Name</p>
                  <p className="text-base">{selectedUser.lastName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Display Name</p>
                  <p className="text-base">{selectedUser.displayName || "-"}</p>
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
                    <p className="text-base">{selectedUser.contactFullName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Phone</p>
                    <p className="text-base">{selectedUser.contactPhone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-muted-foreground">Address</p>
                    <p className="text-base">{selectedUser.contactAddress || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">City</p>
                    <p className="text-base">{selectedUser.contactTown || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">State</p>
                    <p className="text-base">{selectedUser.contactState || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Zip Code</p>
                    <p className="text-base">{selectedUser.contactZipCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Country</p>
                    <p className="text-base">{selectedUser.contactCountry || "-"}</p>
                  </div>
                </div>
              </div>

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
