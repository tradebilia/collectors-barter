import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bell, Lock, Mail, Loader2, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";
const SETTINGS_STORAGE_KEY = "tradebilia-account-settings";

const categoryLinks = [
  { value: "comics", label: "Comics" },
  { value: "sports_cards", label: "Sports Cards" },
  { value: "vintage_toys", label: "Vintage Toys" },
  { value: "video_games", label: "Video Games" },
  { value: "stamps", label: "Stamps" },
  { value: "coins", label: "Coins" },
  { value: "pokemon", label: "Pokemon" },
  { value: "movies", label: "Movies" },
  { value: "autographs", label: "Autographs" },
  { value: "disney_pins", label: "Disney Pins" },
] as const;

type LocalSettingsState = {
  notifications: {
    tradeRequests: boolean;
    messages: boolean;
    feedbackReceived: boolean;
    systemUpdates: boolean;
  };
  privacy: {
    showProfile: boolean;
    hideInventoryValue: boolean;
    receiveContactRequests: boolean;
  };
};

const defaultLocalSettings: LocalSettingsState = {
  notifications: {
    tradeRequests: true,
    messages: true,
    feedbackReceived: true,
    systemUpdates: true,
  },
  privacy: {
    showProfile: true,
    hideInventoryValue: false,
    receiveContactRequests: true,
  },
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("") || "TB"
  );
}

export default function AccountSettings() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    displayName: "",
    location: "",
    emailAddress: "",
    phoneNumber: "",
    bio: "",
  });
  const [localSettings, setLocalSettings] = useState<LocalSettingsState>(defaultLocalSettings);
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "privacy" | "security">("profile");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<LocalSettingsState>;
      setLocalSettings(current => ({
        ...current,
        ...parsed,
        notifications: {
          ...current.notifications,
          ...(parsed.notifications ?? {}),
        },
        privacy: {
          ...current.privacy,
          ...(parsed.privacy ?? {}),
        },
      }));
    } catch {
      // Ignore malformed local settings and keep defaults.
    }
  }, []);

  useEffect(() => {
    const profile = dashboardQuery.data?.profile;
    if (!profile) return;

    setProfileForm({
      fullName: profile.contactFullName || user?.name || "",
      displayName: profile.displayName || user?.name || "",
      location: profile.contactAddress || "",
      emailAddress: profile.contactEmail || user?.email || "",
      phoneNumber: profile.contactPhone || "",
      bio: profile.bio || "",
    });
  }, [dashboardQuery.data?.profile, user?.email, user?.name]);

  const saveProfileMutation = trpc.market.saveProfile.useMutation({
    onSuccess: async () => {
      await utils.market.dashboard.invalidate();
      toast.success("Profile information saved.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const persistLocalSettings = (nextState: LocalSettingsState, message: string) => {
    setLocalSettings(nextState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextState));
    }
    toast.success(message);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProfileMutation.mutate({
      displayName: profileForm.displayName,
      bio: profileForm.bio,
      contactFullName: profileForm.fullName,
      contactEmail: profileForm.emailAddress,
      contactPhone: profileForm.phoneNumber,
      contactAddress: profileForm.location,
      avatar: null,
    });
  };

  const handleNotificationChange = (key: keyof LocalSettingsState["notifications"]) => {
    const newSettings = {
      ...localSettings,
      notifications: {
        ...localSettings.notifications,
        [key]: !localSettings.notifications[key],
      },
    };
    persistLocalSettings(newSettings, "Notification preferences saved.");
  };

  const handlePrivacyChange = (key: keyof LocalSettingsState["privacy"]) => {
    const newSettings = {
      ...localSettings,
      privacy: {
        ...localSettings.privacy,
        [key]: !localSettings.privacy[key],
      },
    };
    persistLocalSettings(newSettings, "Privacy settings saved.");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to manage your account settings.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Access your profile, notification preferences, privacy controls, and security settings.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isLoading || !dashboardQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] text-slate-950">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const profile = dashboardQuery.data.profile;

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <header className="border-b border-black/10 bg-[#161616] text-white">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 lg:px-8">
          <Link href="/" className="font-['Oswald'] text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-white">
            HOME
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm font-semibold">
            <span>Account Settings</span>
          </div>
        </div>
        <nav className="grid border-t border-white/10 bg-white text-center text-sm font-semibold text-slate-950 sm:grid-cols-5 xl:grid-cols-10">
          {categoryLinks.map(category => (
            <Link
              key={category.value}
              href={`/category/${category.value}`}
              className="border-r border-slate-200 px-3 py-3 transition hover:bg-slate-100 last:border-r-0"
            >
              {category.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'url(/manus-storage/hero-background-fullwidth_e851e7cd.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img
              src="/manus-storage/AccountSetup_7b72a15a.svg"
              alt="Settings"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Account Settings</h1>
            <p className="mt-3 text-lg text-slate-600">Manage your profile, preferences, and security</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
            {/* Sidebar Navigation */}
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition ${
                  activeTab === "profile"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-950 hover:bg-slate-100"
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition ${
                  activeTab === "notifications"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-950 hover:bg-slate-100"
                }`}
              >
                <Bell className="mr-2 inline h-4 w-4" />
                Notifications
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition ${
                  activeTab === "privacy"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-950 hover:bg-slate-100"
                }`}
              >
                Privacy
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition ${
                  activeTab === "security"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-950 hover:bg-slate-100"
                }`}
              >
                <Lock className="mr-2 inline h-4 w-4" />
                Security
              </button>
            </div>

            {/* Content Area */}
            <div>
              {activeTab === "profile" && (
                <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your public profile details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileSave} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-slate-200">
                          <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">{initials(profile.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-950">{profile.displayName}</p>
                          <p className="text-sm text-slate-600">{user?.email}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="displayName">Display Name</Label>
                          <Input
                            id="displayName"
                            name="displayName"
                            value={profileForm.displayName}
                            onChange={handleProfileChange}
                            className="rounded-lg border-slate-200"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name</Label>
                          <Input
                            id="fullName"
                            name="fullName"
                            value={profileForm.fullName}
                            onChange={handleProfileChange}
                            className="rounded-lg border-slate-200"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            name="location"
                            value={profileForm.location}
                            onChange={handleProfileChange}
                            placeholder="City, State or Country"
                            className="rounded-lg border-slate-200"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber">Phone Number</Label>
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="tel"
                            value={profileForm.phoneNumber}
                            onChange={handleProfileChange}
                            className="rounded-lg border-slate-200"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            name="bio"
                            value={profileForm.bio}
                            onChange={handleProfileChange}
                            placeholder="Tell collectors about yourself..."
                            rows={4}
                            className="rounded-lg border-slate-200"
                          />
                          <p className="text-xs text-slate-600">{profileForm.bio.length}/500 characters</p>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={saveProfileMutation.isPending}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700"
                      >
                        {saveProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {activeTab === "notifications" && (
                <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose what notifications you'd like to receive</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="font-medium text-slate-950">Trade Requests</p>
                        <p className="text-sm text-slate-600">Get notified when someone sends you a trade request</p>
                      </div>
                      <Switch
                        checked={localSettings.notifications.tradeRequests}
                        onCheckedChange={() => handleNotificationChange("tradeRequests")}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="font-medium text-slate-950">Messages</p>
                        <p className="text-sm text-slate-600">Get notified when you receive new messages</p>
                      </div>
                      <Switch
                        checked={localSettings.notifications.messages}
                        onCheckedChange={() => handleNotificationChange("messages")}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="font-medium text-slate-950">Feedback Received</p>
                        <p className="text-sm text-slate-600">Get notified when someone leaves you feedback</p>
                      </div>
                      <Switch
                        checked={localSettings.notifications.feedbackReceived}
                        onCheckedChange={() => handleNotificationChange("feedbackReceived")}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="font-medium text-slate-950">System Updates</p>
                        <p className="text-sm text-slate-600">Get notified about important system updates</p>
                      </div>
                      <Switch
                        checked={localSettings.notifications.systemUpdates}
                        onCheckedChange={() => handleNotificationChange("systemUpdates")}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "privacy" && (
                <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>Control who can see your information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="font-medium text-slate-950">Show Profile</p>
                        <p className="text-sm text-slate-600">Allow other collectors to view your profile</p>
                      </div>
                      <Switch
                        checked={localSettings.privacy.showProfile}
                        onCheckedChange={() => handlePrivacyChange("showProfile")}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="font-medium text-slate-950">Hide Inventory Value</p>
                        <p className="text-sm text-slate-600">Hide the total estimated value of your collection</p>
                      </div>
                      <Switch
                        checked={localSettings.privacy.hideInventoryValue}
                        onCheckedChange={() => handlePrivacyChange("hideInventoryValue")}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="font-medium text-slate-950">Receive Contact Requests</p>
                        <p className="text-sm text-slate-600">Allow collectors to send you direct messages</p>
                      </div>
                      <Switch
                        checked={localSettings.privacy.receiveContactRequests}
                        onCheckedChange={() => handlePrivacyChange("receiveContactRequests")}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "security" && (
                <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your account security</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="font-medium text-slate-950">Email Address</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4 text-green-600" />
                        {user?.email} (Verified)
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="font-medium text-slate-950">Password</p>
                      <p className="mt-2 text-sm text-slate-600">Manage your password and security options</p>
                      <Button variant="outline" className="mt-4 rounded-lg">
                        Change Password
                      </Button>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="font-medium text-amber-900">Danger Zone</p>
                      <p className="mt-2 text-sm text-amber-800">
                        Permanently delete your account and all associated data
                      </p>
                      <Button variant="destructive" className="mt-4 rounded-lg">
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
