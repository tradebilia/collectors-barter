import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCircle2, CreditCard, Download, Loader2, Mail, Plus, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
  facebookConnected: boolean;
  paypalConnected: boolean;
  idVerified: boolean;
  verificationNote: string;
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
  facebookConnected: true,
  paypalConnected: true,
  idVerified: true,
  verificationNote: "Identity documents verified for subscriber trust and trade confidence.",
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

export default function Profile() {
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

  const accountStatus = "Active";
  const renewalDate = useMemo(() => {
    const baseDate = user?.createdAt ? new Date(user.createdAt) : new Date();
    const next = new Date(baseDate);
    next.setFullYear(next.getFullYear() + 1);
    return next.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }, [user?.createdAt]);

  const persistLocalSettings = (nextState: LocalSettingsState, message: string) => {
    setLocalSettings(nextState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextState));
    }
    toast.success(message);
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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to manage your Tradebilia account settings.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Subscriber accounts unlock profile details, notification preferences, privacy controls, trade activity, and account-management actions.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>
            Subscriber Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isLoading || !dashboardQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const profile = dashboard.profile;
  const saveLocalNotifications = () => persistLocalSettings(localSettings, "Notification preferences saved.");
  const saveLocalPrivacy = () => persistLocalSettings(localSettings, "Privacy settings saved.");
  const saveLocalSecurity = () => persistLocalSettings(localSettings, "Security settings updated.");

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <header className="border-b border-black/10 bg-[#161616] text-white">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 lg:px-8">
          <Link href="/" className="font-['Oswald'] text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-white">
            Search
          </Link>
          <div className="flex min-w-[18rem] flex-1 items-center rounded-md bg-white px-4 py-2.5 text-slate-900 shadow-sm">
            <Search className="mr-3 h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-500">Search ...</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm font-semibold">
            <span>My</span>
            <Avatar className="h-9 w-9 border border-white/15">
              <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
              <AvatarFallback className="bg-white/10 text-white">{initials(profile.displayName)}</AvatarFallback>
            </Avatar>
            <UserRound className="h-5 w-5 text-white" />
            <Bell className="h-5 w-5 text-[#f4d84f]" />
            <Mail className="h-5 w-5 text-[#f4d84f]" />
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

      <section className="border-b border-slate-200 bg-[linear-gradient(90deg,#202566_0%,#202566_100%)] px-4 py-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-6">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="w-full max-w-[34rem]" />
          <div className="hidden text-white lg:block">
            <p className="text-4xl font-light tracking-wide">Account &amp; Settings, Preferences</p>
          </div>
        </div>
      </section>

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="text-center">
            <h1 className="text-5xl font-semibold tracking-tight text-slate-950">ACCOUNT SETTINGS</h1>
            <p className="mt-3 text-xl text-slate-600">Manage your profile, security, and preferences</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button className="h-12 rounded-xl bg-[#2f73ed] px-6 text-lg text-white hover:bg-[#2563d8]">
                <Plus className="mr-2 h-5 w-5" />
                Add Changes
              </Button>
              <Button asChild className="h-12 rounded-xl bg-[#2f73ed] px-6 text-lg text-white hover:bg-[#2563d8]">
                <Link href="/inventory">
                  <Download className="mr-2 h-5 w-5" />
                  Export Inventory
                </Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-4xl font-semibold text-slate-950">PROFILE INFORMATION</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-5" onSubmit={handleProfileSave}>
                    <div className="grid gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="full-name" className="text-lg font-medium text-slate-900">Full Name</Label>
                        <Input id="full-name" value={profileForm.fullName} onChange={event => setProfileForm(current => ({ ...current, fullName: event.target.value }))} className="h-12 border-slate-300 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="display-name" className="text-lg font-medium text-slate-900">Display Name</Label>
                        <Input id="display-name" value={profileForm.displayName} onChange={event => setProfileForm(current => ({ ...current, displayName: event.target.value }))} className="h-12 border-slate-300 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-lg font-medium text-slate-900">Location</Label>
                        <Input id="location" value={profileForm.location} onChange={event => setProfileForm(current => ({ ...current, location: event.target.value }))} className="h-12 border-slate-300 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-address" className="text-lg font-medium text-slate-900">Email Address</Label>
                        <Input id="email-address" type="email" value={profileForm.emailAddress} onChange={event => setProfileForm(current => ({ ...current, emailAddress: event.target.value }))} className="h-12 border-slate-300 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone-number" className="text-lg font-medium text-slate-900">Phone Number</Label>
                        <Input id="phone-number" value={profileForm.phoneNumber} onChange={event => setProfileForm(current => ({ ...current, phoneNumber: event.target.value }))} className="h-12 border-slate-300 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-lg font-medium text-slate-900">Collector Bio</Label>
                        <Textarea id="bio" rows={5} value={profileForm.bio} onChange={event => setProfileForm(current => ({ ...current, bio: event.target.value }))} className="border-slate-300 bg-white" />
                      </div>
                    </div>
                    <Button type="submit" className="h-12 w-full rounded-xl bg-[#2f73ed] text-xl text-white hover:bg-[#2563d8]" disabled={saveProfileMutation.isPending}>
                      {saveProfileMutation.isPending ? "Saving Changes..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-4xl font-semibold text-slate-950">PRIVACY SETTINGS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    ["Show My Profile to Other Members", "showProfile"],
                    ["Hide My Inventory Value", "hideInventoryValue"],
                    ["Receive Contact Requests", "receiveContactRequests"],
                  ].map(([label, key]) => (
                    <div key={key as string} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                      <span className="text-lg font-medium text-slate-900">{label as string}</span>
                      <Switch
                        checked={localSettings.privacy[key as keyof LocalSettingsState["privacy"]]}
                        onCheckedChange={checked => setLocalSettings(current => ({
                          ...current,
                          privacy: {
                            ...current.privacy,
                            [key]: checked,
                          },
                        }))}
                        className="h-8 w-14 data-[state=checked]:bg-[#2f73ed]"
                      />
                    </div>
                  ))}
                  <Button type="button" className="h-12 w-full rounded-xl bg-[#2f73ed] text-xl text-white hover:bg-[#2563d8]" onClick={saveLocalPrivacy}>
                    Save Privacy Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-4xl font-semibold text-slate-950">ACCOUNT MANAGEMENT</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 text-slate-600">
                    Account-management actions should be used carefully. Deactivation is reversible, while full deletion should only happen after confirming active trade obligations are resolved.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" className="h-12 rounded-xl border-slate-300 bg-white text-lg text-slate-900 hover:bg-slate-100" onClick={() => toast.info("Account deactivation can be connected to a deeper workflow next.")}>Deactivate Account</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-4xl font-semibold text-slate-950">VERIFICATION &amp; SECURITY</CardTitle>
                  <CardDescription className="text-base text-slate-600">
                    Keep trust signals visible so members can trade with confidence inside the Tradebilia marketplace.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-lg font-medium text-slate-900">
                      <Badge className="rounded-full bg-[#edf3ff] px-3 py-1 text-[#2f73ed] hover:bg-[#edf3ff]">Facebook</Badge>
                      <span>{localSettings.facebookConnected ? "Connected" : "Not connected"}</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-lg font-medium text-slate-900">
                      <Badge className="rounded-full bg-[#edf3ff] px-3 py-1 text-[#2f73ed] hover:bg-[#edf3ff]">eBay / PayPal</Badge>
                      <span>{localSettings.paypalConnected ? "Connected" : "Not connected"}</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-lg font-medium text-slate-900">
                      <Badge className="rounded-full bg-[#edf3ff] px-3 py-1 text-[#2f73ed] hover:bg-[#edf3ff]">PayPal</Badge>
                      <span>{localSettings.paypalConnected ? "Verified" : "Unverified"}</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-lg font-medium text-slate-900">
                      <Badge className="rounded-full bg-[#edf3ff] px-3 py-1 text-[#2f73ed] hover:bg-[#edf3ff]">ID Verified</Badge>
                      <span>{localSettings.idVerified ? "Confirmed" : "Pending"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verification-note" className="text-lg font-medium text-slate-900">Upload Verification</Label>
                    <Textarea id="verification-note" rows={4} value={localSettings.verificationNote} onChange={event => setLocalSettings(current => ({ ...current, verificationNote: event.target.value }))} className="border-slate-300 bg-white" />
                  </div>
                  <Button type="button" className="h-12 w-full rounded-xl bg-[#2f73ed] text-xl text-white hover:bg-[#2563d8]" onClick={saveLocalSecurity}>
                    Update Security Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-4xl font-semibold text-slate-950">NOTIFICATIONS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    ["Trade Requests", "tradeRequests"],
                    ["Messages", "messages"],
                    ["Feedback Received", "feedbackReceived"],
                    ["System Updates", "systemUpdates"],
                  ].map(([label, key]) => (
                    <div key={key as string} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                      <span className="text-lg font-medium text-slate-900">{label as string}</span>
                      <Switch
                        checked={localSettings.notifications[key as keyof LocalSettingsState["notifications"]]}
                        onCheckedChange={checked => setLocalSettings(current => ({
                          ...current,
                          notifications: {
                            ...current.notifications,
                            [key]: checked,
                          },
                        }))}
                        className="h-8 w-14 data-[state=checked]:bg-[#2f73ed]"
                      />
                    </div>
                  ))}
                  <Button type="button" className="h-12 w-full rounded-xl bg-[#2f73ed] text-xl text-white hover:bg-[#2563d8]" onClick={saveLocalNotifications}>
                    Save Notification Preferences
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-4xl font-semibold text-slate-950">PAYMENT &amp; BILLING</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-lg text-slate-800">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">Membership Status</span>
                      <span className="font-semibold">{accountStatus}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="font-medium">Next Renewal Date</span>
                      <span className="font-semibold">{renewalDate}</span>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-600">
                      Billing integrations are not yet connected to a live subscription processor, but this section now gives the account-settings view a consistent structure aligned to the reference screen.
                    </div>
                    <Button type="button" className="h-12 w-full rounded-xl bg-[#2f73ed] text-xl text-white hover:bg-[#2563d8]" onClick={() => toast.info("Payment-info updates can be connected when billing flows are added.") }>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Update Payment Info
                    </Button>
                    <Button type="button" className="h-12 w-full rounded-xl bg-[#ff5a63] text-xl text-white hover:bg-[#e34b54]" onClick={() => toast.info("Account deletion should be protected by a confirmation workflow and active-trade checks.") }>
                      <Trash2 className="mr-2 h-5 w-5" />
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-[#d9e6ff] bg-[#f8fbff] shadow-none">
                <CardContent className="flex items-start gap-4 p-6">
                  <CheckCircle2 className="mt-1 h-6 w-6 text-[#2f73ed]" />
                  <div>
                    <p className="text-xl font-semibold text-slate-950">Tradebilia trust snapshot</p>
                    <p className="mt-2 text-base leading-7 text-slate-600">
                      You currently have <strong>{dashboard.ownListings.length}</strong> listings, <strong>{dashboard.watchlist.length}</strong> watchlist saves, and a <strong>{profile.rating.averageRating.toFixed(1)}</strong> average rating across <strong>{profile.rating.reviewCount}</strong> completed review records.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button asChild variant="outline" className="rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
                        <Link href="/watchlist">View Watchlist</Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
                        <Link href="/messages">Open Messages</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
