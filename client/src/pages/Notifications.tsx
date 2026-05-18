import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRADEBILIA_LOGO_URL, tradebiliaCategories } from "@/lib/tradebilia";
import { Bell, Loader2, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/_core/hooks/useAuth";

const notificationTypes = [
  { value: "all", label: "All Notifications" },
  { value: "trades", label: "Trade Updates" },
  { value: "messages", label: "Messages" },
  { value: "system", label: "System" },
  { value: "unread", label: "Unread" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "TB";
}

// Mock notifications data
const mockNotifications = [
  {
    id: 1,
    type: "trade",
    title: "Trade Proposal Accepted",
    message: "Your trade proposal for the 1986 Fleer Michael Jordan card has been accepted!",
    sender: "JoeFalco22",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=JoeFalco22",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
    icon: CheckCircle2,
  },
  {
    id: 2,
    type: "message",
    title: "New Message",
    message: "Hey, are you still interested in trading?",
    sender: "BillyBob123",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=BillyBob123",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    read: false,
    icon: Bell,
  },
  {
    id: 3,
    type: "system",
    title: "Listing Expiring Soon",
    message: "Your listing '1952 Topps Mickey Mantle' will expire in 7 days",
    sender: "Tradebilia",
    avatar: TRADEBILIA_LOGO_URL,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
    icon: AlertCircle,
  },
  {
    id: 4,
    type: "trade",
    title: "Trade Completed",
    message: "Your trade with DarthVader99 has been completed successfully",
    sender: "Tradebilia",
    avatar: TRADEBILIA_LOGO_URL,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: true,
    icon: CheckCircle2,
  },
  {
    id: 5,
    type: "message",
    title: "New Message",
    message: "Thanks for the trade! Great doing business with you.",
    sender: "LeoCap00",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LeoCap00",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    read: true,
    icon: Bell,
  },
];

export default function Notifications() {
  const { user, isAuthenticated } = useAuth();
  const [filter, setFilter] = useState<(typeof notificationTypes)[number]["value"]>("all");
  const [notifications, setNotifications] = useState(mockNotifications);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <div className="text-center">
          <Bell className="mx-auto h-12 w-12 text-slate-400" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Sign in to view notifications</h1>
          <p className="mt-2 text-slate-600">You need to be logged in to see your notifications.</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="mt-6 bg-[#7f31ff] text-white hover:bg-[#6925dd]"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const handleMarkAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleDelete = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success("Notification deleted");
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <TopBar logoUrl={TRADEBILIA_LOGO_URL} searchPlaceholder="Search..." />

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="mt-1 text-sm text-slate-600">
                You have <span className="font-semibold">{unreadCount}</span> unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-slate-700 hover:bg-slate-100"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notificationTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setFilter(type.value)}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                      filter === type.value
                        ? "bg-[#7f31ff] text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Notifications List */}
          <div className="md:col-span-3">
            <ScrollArea className="h-[600px] rounded-lg border border-slate-200 bg-white p-4">
              {filteredNotifications.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Bell className="h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-slate-600">
                    {filter === "unread" ? "No unread notifications" : "No notifications"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map(notification => {
                    const Icon = notification.icon;
                    return (
                      <Card
                        key={notification.id}
                        className={`border transition ${
                          notification.read
                            ? "border-slate-200 bg-white"
                            : "border-[#7f31ff]/30 bg-[#7f31ff]/5"
                        }`}
                      >
                        <CardContent className="flex gap-4 p-4">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={notification.avatar} alt={notification.sender} />
                            <AvatarFallback>{initials(notification.sender)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900">{notification.title}</p>
                                  {!notification.read && (
                                    <Badge className="bg-[#7f31ff] text-white">New</Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                                <p className="mt-2 text-xs text-slate-500">
                                  {notification.timestamp.toLocaleDateString()} at{" "}
                                  {notification.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                                    title="Mark as read"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(notification.id)}
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
