
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarInitials } from "@/lib/tradebilia";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Bell, Lock, Mail, Loader2, Save, Shield, Link as LinkIcon, Upload, Eye, EyeOff, Cog } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";

const categoryOptions = [
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

const accountSources = [
  { value: "ebay", label: "eBay", logo: "/manus-storage/ebay-logo_b3d303cb.png" },
  { value: "paypal", label: "PayPal", logo: "/manus-storage/paypal-logo_62835ee7.png" },
  { value: "facebook", label: "Facebook", logo: "/manus-storage/facebook-logo_1fd22cc7.png" },
] as const;

type AccountSource = typeof accountSources[number]["value"];

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64String = result.split(',')[1] || '';
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function AccountSettings() {
  const { user, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const saveProfileMutation = trpc.market.saveProfile.useMutation();
  const saveSecurityQuestionMutation = trpc.market.saveSecurityQuestion.useMutation();
  const changePasswordMutation = trpc.market.changePassword.useMutation();
  const saveIntegrationsMutation = trpc.market.saveIntegrations.useMutation();
  const saveCommunicationsMutation = trpc.market.saveCommunications.useMutation();
  const savePreferencesMutation = trpc.market.savePreferences.useMutation();

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "integrations" | "communications" | "preferences">("profile");
  
  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
    phoneNumber: "",
    avatarPreview: "",
    avatarFile: null as File | null,
  });

  // Security Form State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    securityQuestion: "",
    securityAnswer: "",
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Integrations State
  const [connectedAccounts, setConnectedAccounts] = useState<AccountSource[]>([]);

  // Communications State
  const [communicationPrefs, setCommunicationPrefs] = useState<{
    emailFrequency: "never" | "daily" | "weekly" | "monthly";
    tradeNotifications: boolean;
    messageNotifications: boolean;
    feedbackNotifications: boolean;
    systemNotifications: boolean;
    marketingEmails: boolean;
  }>({
    emailFrequency: "daily",
    tradeNotifications: true,
    messageNotifications: true,
    feedbackNotifications: true,
    systemNotifications: true,
    marketingEmails: false,
  });

  // Preferences State
  const [preferences, setPreferences] = useState<{
    preferredCategories: ("comics" | "sports_cards" | "vintage_toys" | "video_games" | "stamps" | "coins" | "pokemon" | "movies" | "autographs" | "disney_pins")[];
    showProfile: boolean;
    hideInventoryValue: boolean;
    receiveContactRequests: boolean;
  }>({
    preferredCategories: [],
    showProfile: true,
    hideInventoryValue: false,
    receiveContactRequests: true,
  });

  // Identity Info (Display-only)
  const [identityInfo, setIdentityInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    town: "",
    zipCode: "",
    state: "",
    country: "",
    phoneNumber: "",
    isMerchant: false,
    storeName: "",
  });

  // Load profile data
  useEffect(() => {
    if (dashboardQuery.data?.profile) {
      const profile = dashboardQuery.data.profile;

      setIdentityInfo({
        firstName: (profile as any).firstName || "",
        lastName: (profile as any).lastName || "",
        email: user?.email || "",
        street: profile.contactAddress || "",
        town: (profile as any).contactTown || "",
        zipCode: (profile as any).contactZipCode || "",
        state: (profile as any).contactState || "",
        country: (profile as any).contactCountry || "",
        phoneNumber: profile.contactPhone || "",
        isMerchant: false,
        storeName: "",
      });

      setProfileForm({
        displayName: profile.displayName || user?.name || "",
        bio: profile.bio || "",
        phoneNumber: profile.contactPhone || "",
        avatarPreview: profile.avatarUrl || "",
        avatarFile: null,
      });
    }
  }, [dashboardQuery.data?.profile, user?.name, user?.email]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to manage your account settings.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Update your profile, security settings, and preferences.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] text-slate-950">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurityForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(category as any)
        ? prev.preferredCategories.filter(c => c !== category)
        : [...prev.preferredCategories, category as any],
    }));
  };

  const handleAccountSourceToggle = (source: AccountSource) => {
    setConnectedAccounts(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setProfileForm(prev => ({ ...prev, avatarPreview: preview, avatarFile: file }));
    };
    reader.readAsDataURL(file);
    toast.success('Photo preview updated. Save profile to upload.');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleUploadClick = () => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSaveProfile = async () => {
    const toastId = toast.loading("Saving profile...");
    console.log("[AccountSettings] handleSaveProfile called");
    try {
      const payload: any = {
        displayName: profileForm.displayName,
        bio: profileForm.bio,
        contactPhone: profileForm.phoneNumber,
      };
      
      // Convert avatar file to base64 if present
      if (profileForm.avatarFile) {
        const base64 = await fileToBase64(profileForm.avatarFile);
        payload.avatar = {
          name: profileForm.avatarFile.name,
          type: profileForm.avatarFile.type,
          contentBase64: base64,
        };
      }
      
      if (user?.role === 'admin') {
        payload.firstName = identityInfo.firstName;
        payload.lastName = identityInfo.lastName;
        payload.contactEmail = identityInfo.email;
        payload.contactAddress = identityInfo.street;
        payload.contactTown = identityInfo.town;
        payload.contactZipCode = identityInfo.zipCode;
        payload.contactState = identityInfo.state;
        payload.contactCountry = identityInfo.country;
        payload.contactPhone = identityInfo.phoneNumber;
      }
      await saveProfileMutation.mutateAsync(payload);
      console.log("[AccountSettings] Profile saved successfully");
      toast.dismiss(toastId);
      toast.success("Profile updated successfully!");
      // Clear avatar file after successful upload
      setProfileForm(prev => ({ ...prev, avatarFile: null }));
      // Refresh the dashboard data
      await utils.market.dashboard.refetch();
    } catch (error: any) {
      console.error("[AccountSettings] Error saving profile:", error);
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (securityForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const toastId = toast.loading("Changing password...");
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword,
      });
      toast.dismiss(toastId);
      toast.success("Password changed successfully!");
      setSecurityForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        securityQuestion: "",
        securityAnswer: "",
      });
      setShowPasswordFields(false);
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to change password");
    }
  };

  const handleSaveSecurityQuestion = async () => {
    if (!securityForm.securityQuestion || !securityForm.securityAnswer) {
      toast.error("Please select a security question and provide an answer");
      return;
    }
    const toastId = toast.loading("Saving security question...");
    try {
      await saveSecurityQuestionMutation.mutateAsync({
        securityQuestion: securityForm.securityQuestion,
        securityAnswer: securityForm.securityAnswer,
      });
      toast.dismiss(toastId);
      toast.success("Security question saved successfully!");
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to save security question");
    }
  };

  const handleSaveIntegrations = async () => {
    const toastId = toast.loading("Saving integrations...");
    try {
      await saveIntegrationsMutation.mutateAsync({
        connectedAccounts: connectedAccounts,
      });
      toast.dismiss(toastId);
      toast.success("Integrations saved successfully!");
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to save integrations");
    }
  };

  const handleSaveCommunications = async () => {
    const toastId = toast.loading("Saving communication preferences...");
    try {
      await saveCommunicationsMutation.mutateAsync({
        emailFrequency: communicationPrefs.emailFrequency,
        tradeNotifications: communicationPrefs.tradeNotifications,
        messageNotifications: communicationPrefs.messageNotifications,
        feedbackNotifications: communicationPrefs.feedbackNotifications,
        systemNotifications: communicationPrefs.systemNotifications,
        marketingEmails: communicationPrefs.marketingEmails,
      });
      toast.dismiss(toastId);
      toast.success("Communication preferences saved successfully!");
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to save communication preferences");
    }
  };

  const handleSavePreferences = async () => {
    const toastId = toast.loading("Saving preferences...");
    try {
      await savePreferencesMutation.mutateAsync({
        preferredCategories: preferences.preferredCategories,
        showProfile: preferences.showProfile,
        hideInventoryValue: preferences.hideInventoryValue,
        receiveContactRequests: preferences.receiveContactRequests,
      });
      toast.dismiss(toastId);
      toast.success("Preferences saved successfully!");
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to save preferences");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <TopBar />
      <CategoryBar />
      
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-950">Account Settings</h1>
          <p className="mt-2 text-slate-600">Manage your profile, security, and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your public profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div>
                  <Label className="mb-4 block text-sm font-semibold">Profile Picture</Label>
                  <div className="flex gap-6">
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="h-32 w-32">
                        <AvatarImage src={profileForm.avatarPreview} />
                        <AvatarFallback className="bg-purple-600 text-2xl font-bold text-white">
                          {getAvatarInitials(identityInfo.firstName, identityInfo.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition hover:bg-slate-100"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <Upload className="mb-2 h-8 w-8 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">Upload Photo or Drag & Drop</p>
                        <p className="text-xs text-slate-500">JPG, PNG or GIF. Max 5MB.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={handleUploadClick}
                        >
                          Choose File
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Identity Information */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold">Identity Information</h3>
                  <p className="text-sm text-slate-600">
                    {user?.role === 'admin' ? 'You can edit all fields' : 'These fields are read-only'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={identityInfo.firstName}
                        onChange={(e) => setIdentityInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        disabled={user?.role !== 'admin'}
                        className={user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={identityInfo.lastName}
                        onChange={(e) => setIdentityInfo(prev => ({ ...prev, lastName: e.target.value }))}
                        disabled={user?.role !== 'admin'}
                        className={user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={identityInfo.email}
                      onChange={(e) => setIdentityInfo(prev => ({ ...prev, email: e.target.value }))}
                      disabled={user?.role !== 'admin'}
                      className={user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}
                    />
                  </div>

                  <div>
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      placeholder="Street address"
                      value={identityInfo.street}
                      onChange={(e) => setIdentityInfo(prev => ({ ...prev, street: e.target.value }))}
                      disabled={user?.role !== 'admin'}
                      className={`mt-2 ${user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="town">Town or City</Label>
                    <Input
                      id="town"
                      placeholder="Town or city"
                      value={identityInfo.town}
                      onChange={(e) => setIdentityInfo(prev => ({ ...prev, town: e.target.value }))}
                      disabled={user?.role !== 'admin'}
                      className={`mt-2 ${user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="State"
                        value={identityInfo.state}
                        onChange={(e) => setIdentityInfo(prev => ({ ...prev, state: e.target.value }))}
                        disabled={user?.role !== 'admin'}
                        className={`mt-2 ${user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">Zip Code</Label>
                      <Input
                        id="zipCode"
                        placeholder="Zip code"
                        value={identityInfo.zipCode}
                        onChange={(e) => setIdentityInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                        disabled={user?.role !== 'admin'}
                        className={`mt-2 ${user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}`}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="Country"
                      value={identityInfo.country}
                      onChange={(e) => setIdentityInfo(prev => ({ ...prev, country: e.target.value }))}
                      disabled={user?.role !== 'admin'}
                      className={`mt-2 ${user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="Phone number"
                      value={identityInfo.phoneNumber}
                      onChange={(e) => setIdentityInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      disabled={user?.role !== 'admin'}
                      className={`mt-2 ${user?.role !== 'admin' ? 'bg-slate-100 text-slate-500' : ''}`}
                    />
                  </div>
                </div>

                {/* Public Profile */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold">Public Profile</h3>
                  
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      value={profileForm.displayName}
                      onChange={handleProfileChange}
                      placeholder="How you'll appear to other collectors"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">About You (Bio)</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      placeholder="Tell other collectors about yourself (max 500 characters)"
                      maxLength={500}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold text-red-600">Danger Zone</h3>
                  <Button variant="destructive" className="w-full">
                    Delete Account
                  </Button>
                </div>

                <Button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your password and security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Change Password</h3>
                  {!showPasswordFields ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordFields(true)}
                      className="w-full"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <Input
                        type="password"
                        name="currentPassword"
                        placeholder="Current password"
                        value={securityForm.currentPassword}
                        onChange={handleSecurityChange}
                      />
                      <Input
                        type="password"
                        name="newPassword"
                        placeholder="New password"
                        value={securityForm.newPassword}
                        onChange={handleSecurityChange}
                      />
                      <Input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm new password"
                        value={securityForm.confirmPassword}
                        onChange={handleSecurityChange}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleChangePassword} className="flex-1 bg-blue-600 hover:bg-blue-700">
                          Save New Password
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowPasswordFields(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Security Question */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold">Security Question</h3>
                  <div>
                    <Label htmlFor="securityQuestion">Select a security question</Label>
                    <select
                      id="securityQuestion"
                      value={securityForm.securityQuestion}
                      onChange={(e) => setSecurityForm(prev => ({ ...prev, securityQuestion: e.target.value }))}
                      className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      <option value="">Choose a question...</option>
                      <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                      <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                      <option value="In what city were you born?">In what city were you born?</option>
                      <option value="What is your favorite book?">What is your favorite book?</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="securityAnswer">Your answer</Label>
                    <Input
                      id="securityAnswer"
                      name="securityAnswer"
                      value={securityForm.securityAnswer}
                      onChange={handleSecurityChange}
                      placeholder="Enter your answer"
                    />
                  </div>
                  <Button onClick={handleSaveSecurityQuestion} className="w-full bg-blue-600 hover:bg-blue-700">
                    <Shield className="mr-2 h-4 w-4" />
                    Save Security Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Link external accounts to verify your trading history and build trust</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">✓ Your credentials are secure</span>
                    <br />
                    You'll be redirected directly to each site to authorize the connection. We never store your login credentials.
                  </p>
                </div>

                <div className="space-y-4">
                  {accountSources.map(source => (
                    <div key={source.value} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center gap-4">
                        <img src={source.logo} alt={source.label} className="h-12 w-12" />
                        <div>
                          <p className="font-semibold">{source.label}</p>
                          <p className="text-sm text-slate-600">
                            {connectedAccounts.includes(source.value) ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline">Connect</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Communication Preferences</CardTitle>
                <CardDescription>Control how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="emailFrequency">Email Frequency</Label>
                  <select
                    id="emailFrequency"
                    value={communicationPrefs.emailFrequency}
                    onChange={(e) => setCommunicationPrefs(prev => ({ ...prev, emailFrequency: e.target.value as any }))}
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                  >
                    <option value="instant">Instant</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold">Notification Types</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Trade Requests</p>
                      <p className="text-sm text-slate-600">Get notified when someone wants to trade with you</p>
                    </div>
                    <Switch
                      checked={communicationPrefs.tradeNotifications}
                      onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, tradeNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Messages</p>
                      <p className="text-sm text-slate-600">Get notified when you receive new messages</p>
                    </div>
                    <Switch
                      checked={communicationPrefs.messageNotifications}
                      onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, messageNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Feedback Received</p>
                      <p className="text-sm text-slate-600">Get notified when you receive feedback</p>
                    </div>
                    <Switch
                      checked={communicationPrefs.feedbackNotifications}
                      onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, feedbackNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">System Updates</p>
                      <p className="text-sm text-slate-600">Get notified about important system updates</p>
                    </div>
                    <Switch
                      checked={communicationPrefs.systemNotifications}
                      onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, systemNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Marketing Emails</p>
                      <p className="text-sm text-slate-600">Receive promotional offers and news</p>
                    </div>
                    <Switch
                      checked={communicationPrefs.marketingEmails}
                      onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, marketingEmails: checked }))}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveCommunications} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Mail className="mr-2 h-4 w-4" />
                  Save Communication Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Collecting Preferences</CardTitle>
                <CardDescription>Customize your collecting interests and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="mb-4 font-semibold">Preferred Collecting Categories</h3>
                  <p className="mb-4 text-sm text-slate-600">Select the categories you're most interested in</p>
                  <div className="grid grid-cols-2 gap-4">
                    {categoryOptions.map(category => (
                      <div key={category.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={category.value}
                          checked={preferences.preferredCategories.includes(category.value)}
                          onChange={() => handleCategoryToggle(category.value)}
                          className="rounded border-slate-300"
                        />
                        <Label htmlFor={category.value} className="font-normal cursor-pointer">
                          {category.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold">Privacy Settings</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Profile</p>
                      <p className="text-sm text-slate-600">Allow others to view your public profile</p>
                    </div>
                    <Switch
                      checked={preferences.showProfile}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, showProfile: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Hide Inventory Value</p>
                      <p className="text-sm text-slate-600">Don't show the total value of your collection</p>
                    </div>
                    <Switch
                      checked={preferences.hideInventoryValue}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, hideInventoryValue: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Receive Contact Requests</p>
                      <p className="text-sm text-slate-600">Allow collectors to contact you about trades</p>
                    </div>
                    <Switch
                      checked={preferences.receiveContactRequests}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, receiveContactRequests: checked }))}
                    />
                  </div>
                </div>

                <Button onClick={handleSavePreferences} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Cog className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
