import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Package, Settings } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("statistics");
  const statsQuery = trpc.admin.getPlatformStatistics.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

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
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage platform statistics, users, listings, and settings
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Statistics</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Listings</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
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
                title="Completed Trades"
                value={statsQuery.data?.completedTrades.toString() ?? "Loading..."}
                description="Successful transactions"
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
                  Key metrics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Statistics dashboard coming soon. Real-time metrics will be displayed here.</p>
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
                  View, edit, and manage user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>User management interface coming soon. You'll be able to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>View all registered members</li>
                    <li>Grant/revoke admin privileges</li>
                    <li>View member profiles and trade history</li>
                    <li>Suspend or ban users if needed</li>
                  </ul>
                </div>
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
                <div className="text-sm text-muted-foreground">
                  <p>Listings management interface coming soon. You'll be able to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>View all active listings</li>
                    <li>Review reported listings</li>
                    <li>Delete inappropriate content</li>
                    <li>Feature or highlight listings</li>
                  </ul>
                </div>
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
        </Tabs>
      </div>
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
