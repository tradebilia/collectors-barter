"use client";

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
import { EbayConnection } from "@/components/EbayConnection";
import { trpc } from "@/lib/trpc";
import { Bell, Lock, Mail, Loader2, Save, Shield, Link as LinkIcon, Upload, Eye, EyeOff, Cog } from "lucide-react";
import { FormEvent, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

const TRADEBILIA_LOGO_URL = "/images/heros/AccountSettings.svg";

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
  { value: "paypal", label: "PayPal", logo: "/manus-storage/Paypal_450afefe.png" },
  { value: "facebook", label: "Facebook", logo: "/manus-storage/Facebooklogo_0161d1e3.png" },
] as const;

type AccountSource = typeof accountSources[number]["value"];



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
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
    phoneNumber: "",
    avatarPreview: "",
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
    tradeInitiated: { email: boolean; text: boolean };
    counterProposal: { email: boolean; text: boolean };
    proposalAccepted: { email: boolean; text: boolean };
    proposalRejected: { email: boolean; text: boolean };
    itemsShipped: { email: boolean; text: boolean };
    itemsReceived: { email: boolean; text: boolean };
    feedbackReceived: { email: boolean; text: boolean };
    systemUpdates: { email: boolean; text: boolean };
    marketingEmails: { email: boolean; text: boolean };
  }>({
    tradeInitiated: { email: true, text: true },
    counterProposal: { email: true, text: true },
    proposalAccepted: { email: true, text: true },
    proposalRejected: { email: true, text: false },
    itemsShipped: { email: true, text: true },
    itemsReceived: { email: true, text: true },
    feedbackReceived: { email: true, text: false },
    systemUpdates: { email: true, text: false },
    marketingEmails: { email: false, text: false },
  })

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
  
  // Use ref to track if preferences have been initialized to prevent re-renders from resetting checkboxes
  const preferencesInitializedRef = useRef(false);

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

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Refetch dashboard data when page mounts
  useEffect(() => {
    dashboardQuery.refetch();
  }, []);

  // Load profile data
  useEffect(() => {
    if (dashboardQuery.data?.profile) {
      const profile = dashboardQuery.data.profile;

      // Parse the combined address to extract street (everything before first comma)
      const fullAddress = profile.contactAddress || "";
      const streetOnly = fullAddress.split(",")[0].trim();
      
      setIdentityInfo({
        firstName: (profile as any).firstName || "",
        lastName: (profile as any).lastName || "",
        email: profile.contactEmail || "",
        street: streetOnly,
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
      });

      setSecurityForm(prev => ({
        ...prev,
        securityQuestion: (profile as any).securityQuestion || "",
        securityAnswer: "", // Answer is hashed in DB, can't display it
      }));

      // Load preferences from profile (only on first load)
      if (!preferencesInitializedRef.current) {
        const preferredCategoriesStr = (profile as any).preferredCategories;
        let preferredCategoriesArray: any[] = [];
        if (preferredCategoriesStr && preferredCategoriesStr !== "NULL") {
          try {
            preferredCategoriesArray = JSON.parse(preferredCategoriesStr);
          } catch (e) {
            console.error("Failed to parse preferred categories", e);
            preferredCategoriesArray = [];
          }
        }
        setPreferences({
          preferredCategories: preferredCategoriesArray,
          showProfile: (profile as any).showProfile ?? true,
          hideInventoryValue: (profile as any).hideInventoryValue ?? false,
          receiveContactRequests: (profile as any).receiveContactRequests ?? true,
        });
        preferencesInitializedRef.current = true;
      }

      // Load communications preferences from JSON
      const notificationPrefsStr = (profile as any).notificationPreferences;
      let notificationPrefs = {
        tradeInitiated: { email: true, text: true },
        counterProposal: { email: true, text: true },
        proposalAccepted: { email: true, text: true },
        proposalRejected: { email: true, text: false },
        itemsShipped: { email: true, text: true },
        itemsReceived: { email: true, text: true },
        feedbackReceived: { email: true, text: false },
        systemUpdates: { email: true, text: false },
        marketingEmails: { email: false, text: false },
      };
      if (notificationPrefsStr && notificationPrefsStr !== "NULL") {
        try {
          const parsed = JSON.parse(notificationPrefsStr);
          notificationPrefs = {
            tradeInitiated: parsed.tradeInitiated || { email: true, text: true },
            counterProposal: parsed.counterProposal || { email: true, text: true },
            proposalAccepted: parsed.proposalAccepted || { email: true, text: true },
            proposalRejected: parsed.proposalRejected || { email: true, text: false },
            itemsShipped: parsed.itemsShipped || { email: true, text: true },
            itemsReceived: parsed.itemsReceived || { email: true, text: true },
            feedbackReceived: parsed.feedbackReceived || { email: true, text: false },
            systemUpdates: parsed.systemUpdates || { email: true, text: false },
            marketingEmails: parsed.marketingEmails || { email: false, text: false },
          };
        } catch (e) {
          console.error("Failed to parse notification preferences", e);
        }
      }
      setCommunicationPrefs(notificationPrefs);
    }
  }, [dashboardQuery.data?.profile, user?.name, user?.email]);

  // Attach click listeners to labels to toggle checkboxes (workaround for Manus click interception)
  useEffect(() => {
    const labels = document.querySelectorAll('label[for^="category-"]');
    labels.forEach(label => {
      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const checkbox = document.getElementById(forAttr) as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
          }
        }
      };
      label.addEventListener('click', handler, true);
    });
  }, []);

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

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSecurityForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    console.log('[handleCategoryToggle] Category:', category);
    console.log('[handleCategoryToggle] Current preferences:', preferences.preferredCategories);
    setPreferences(prev => {
      const newCategories = prev.preferredCategories.includes(category as any)
        ? prev.preferredCategories.filter(c => c !== category)
        : [...prev.preferredCategories, category as any];
      console.log('[handleCategoryToggle] New categories:', newCategories);
      return {
        ...prev,
        preferredCategories: newCategories,
      };
    });
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
      setProfileForm(prev => ({ ...prev, avatarPreview: preview }));
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
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSaveProfile = async () => {
    console.log("[AccountSettings] handleSaveProfile called");
    try {
      const payload: any = {
        displayName: profileForm.displayName,
        bio: profileForm.bio,
        contactPhone: profileForm.phoneNumber,
        contactEmail: identityInfo.email,
        firstName: identityInfo.firstName,
        lastName: identityInfo.lastName,
        contactAddress: identityInfo.street,
        contactTown: identityInfo.town,
        contactZipCode: identityInfo.zipCode,
        contactState: identityInfo.state,
        contactCountry: identityInfo.country,
      };
      
      // Handle avatar upload if a new preview was set
      if (profileForm.avatarPreview && profileForm.avatarPreview.startsWith('data:')) {
        console.log("[AccountSettings] Avatar preview detected, converting to upload format");
        const base64Data = profileForm.avatarPreview.split(',')[1];
        const mimeType = profileForm.avatarPreview.split(':')[1].split(';')[0];
        payload.avatar = {
          name: 'profile-avatar',
          type: mimeType,
          contentBase64: base64Data,
        };
      }
      
      await saveProfileMutation.mutateAsync(payload);
      console.log("[AccountSettings] Profile saved successfully");
      setConfirmationDialog({
        isOpen: true,
        title: "Success",
        message: "Profile updated successfully!",
      });
      // Refresh the dashboard data and auth context
      await utils.market.dashboard.refetch();
      const updatedAuth = await utils.auth.me.fetch();
      // Manually update the auth context to trigger immediate UI refresh
      utils.auth.me.setData(undefined, updatedAuth);
      // Ensure local state is updated
      setProfileForm(prev => ({ ...prev, avatarPreview: updatedAuth?.avatarUrl || prev.avatarPreview }));
      // Also refetch admin queries so they see updated profile data
      await utils.admin.getAllUsers.refetch();
      await utils.admin.getPlatformStatistics.refetch();
    } catch (error: any) {
      console.error("[AccountSettings] Error saving profile:", error);
      setConfirmationDialog({
        isOpen: true,
        title: "Error",
        message: error.message || "Failed to update profile",
      });
    }
  };

  const handleChangePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (securityForm.newPassword.length < 8) {      alert("Passwords must be at least 8 characters");
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
      setConfirmationDialog({
        isOpen: true,
        title: "Missing Information",
        message: "Please select a security question and provide an answer",
      });
      return;
    }
    try {
      await saveSecurityQuestionMutation.mutateAsync({
        securityQuestion: securityForm.securityQuestion,
        securityAnswer: securityForm.securityAnswer,
      });
      setConfirmationDialog({
        isOpen: true,
        title: "Success",
        message: "Security question saved successfully!",
      });
    } catch (error: any) {
      setConfirmationDialog({
        isOpen: true,
        title: "Error",
        message: error.message || "Failed to save security question",
      });
    }
  };

  const handleSaveIntegrations = async () => {
    try {
      await saveIntegrationsMutation.mutateAsync({
        connectedAccounts: connectedAccounts,
      });
      setConfirmationDialog({
        isOpen: true,
        title: "Success",
        message: "Integrations saved successfully!",
      });
    } catch (error: any) {
      setConfirmationDialog({
        isOpen: true,
        title: "Error",
        message: error.message || "Failed to save integrations",
      });
    }
  };

  const handleSaveCommunications = async () => {
    try {
      await saveCommunicationsMutation.mutateAsync(communicationPrefs);
      setConfirmationDialog({
        isOpen: true,
        title: "Success",
        message: "Communication preferences saved successfully!",
      });
    } catch (error: any) {
      setConfirmationDialog({
        isOpen: true,
        title: "Error",
        message: error.message || "Failed to save communication preferences",
      });
    }
  };

  const handleSavePreferences = async () => {
    try {
      // Read checkbox states directly from the DOM since onChange handlers aren't firing
      const checkedCategories: string[] = [];
      const categoryCheckboxes = document.querySelectorAll('input[id^="category-"]');
      categoryCheckboxes.forEach((checkbox: any) => {
        if (checkbox.checked) {
          const categoryValue = checkbox.id.replace('category-', '');
          checkedCategories.push(categoryValue);
        }
      });
      
      const prefsToSave = {
        ...preferences,
        preferredCategories: checkedCategories as ("comics" | "sports_cards" | "vintage_toys" | "video_games" | "stamps" | "coins" | "pokemon" | "movies" | "autographs" | "disney_pins")[],
      };
      console.log('[handleSavePreferences] Categories from DOM:', checkedCategories);
      await savePreferencesMutation.mutateAsync(prefsToSave);
      setConfirmationDialog({
        isOpen: true,
        title: "Success",
        message: "Preferences saved successfully!",
      });
    } catch (error: any) {
      setConfirmationDialog({
        isOpen: true,
        title: "Error",
        message: error.message || "Failed to save preferences",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <TopBar logoUrl={TRADEBILIA_LOGO_URL} searchPlaceholder="Search..." />

      {/* Hero Section */}
      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(/manus-storage/Mainpage_9b45311d.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img
              src="/manus-storage/AccountSettings_4d29437b.svg"
              alt="Settings"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-5 rounded-lg bg-slate-200">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your public profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900">Profile Picture</h3>
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="h-32 w-32 border-4 border-slate-200">
                        <AvatarImage src={profileForm.avatarPreview} />
                        <AvatarFallback className="text-2xl bg-[#7f31ff] text-white">{getAvatarInitials({ firstName: identityInfo.firstName, lastName: identityInfo.lastName })}</AvatarFallback>
                      </Avatar>
                      <div className="cursor-pointer">
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                            isDragging 
                              ? 'border-amber-500 bg-amber-50/50' 
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <Button type="button" variant="outline" className="rounded-lg w-full" onClick={handleUploadClick}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Photo or Drag & Drop
                          </Button>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />
                      </div>
                      <p className="text-xs text-slate-600 text-center">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                  </div>

                  {/* Identity Info - Editable for Admin, Read-Only for Others */}
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h3 className="font-semibold text-slate-900">Identity Information {user?.role === 'admin' ? '' : '(Read-Only)'}</h3>
                    <p className="text-xs text-slate-600">{user?.role === 'admin' ? 'Update your legal name information.' : 'These fields cannot be changed for security reasons. Contact support if you need to update them.'}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName"
                          name="firstName"
                          value={identityInfo.firstName} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, firstName: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName"
                          name="lastName"
                          value={identityInfo.lastName} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, lastName: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input 
                          value={identityInfo.email} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, email: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input 
                          value={identityInfo.country} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, country: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Street Address</Label>
                        <Input 
                          value={identityInfo.street} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, street: e.target.value }))}
                          placeholder="Street address"
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Town/City</Label>
                        <Input 
                          value={identityInfo.town} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, town: e.target.value }))}
                          placeholder="Town or city"
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input 
                          value={identityInfo.state} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="State"
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Zip Code</Label>
                        <Input 
                          value={identityInfo.zipCode} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                          placeholder="Zip code"
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Phone Number</Label>
                        <Input 
                          value={identityInfo.phoneNumber} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder="Phone number"
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200' 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Editable Profile Fields */}
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h3 className="font-semibold text-slate-900">Public Profile</h3>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        name="displayName"
                        value={profileForm.displayName}
                        onChange={handleProfileChange}
                        placeholder="How you'll appear to other collectors"
                        className="rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">About You (Bio)</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={profileForm.bio}
                        onChange={handleProfileChange}
                        placeholder="Tell other collectors about yourself (max 500 characters)"
                        maxLength={500}
                        className="rounded-lg border-slate-200"
                        rows={4}
                      />
                      <p className="text-xs text-slate-600">{profileForm.bio.length}/500 characters</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={saveProfileMutation.isPending}
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saveProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile Changes
                      </>
                    )}
                  </Button>

                  {/* Danger Zone */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-semibold text-red-900 mb-2">Danger Zone</h3>
                      <Button variant="destructive" className="rounded-lg">
                        Delete Account
                      </Button>
                      <p className="text-xs text-red-800 mt-2">This action cannot be undone. All your data will be permanently deleted.</p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your password and security questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Email Verification Status */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Email Verified</p>
                        <p className="text-sm text-green-800">{identityInfo.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Password Change Section */}
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Change Password</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPasswordFields(!showPasswordFields)}
                        className="rounded-lg"
                      >
                        {showPasswordFields ? "Cancel" : "Change Password"}
                      </Button>
                    </div>

                    {showPasswordFields && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            value={securityForm.currentPassword}
                            onChange={handleSecurityChange}
                            placeholder="Enter your current password"
                            className="rounded-lg border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            value={securityForm.newPassword}
                            onChange={handleSecurityChange}
                            placeholder="Create a strong password (min 8 characters)"
                            className="rounded-lg border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={securityForm.confirmPassword}
                            onChange={handleSecurityChange}
                            placeholder="Confirm your new password"
                            className="rounded-lg border-slate-200"
                          />
                        </div>
                        <Button onClick={handleChangePassword} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
                          Update Password
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Security Questions */}
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h3 className="font-semibold text-slate-900">Security Questions</h3>
                    <p className="text-sm text-slate-600">These help you recover your account if you forget your password.</p>
                    <div className="space-y-2">
                      <Label htmlFor="securityQuestion">Security Question</Label>
                      <select
                        id="securityQuestion"
                        name="securityQuestion"
                        value={securityForm.securityQuestion}
                        onChange={handleSecurityChange}
                        className="rounded-lg border-slate-200 border px-3 py-2 w-full"
                      >
                        <option value="">Select a security question</option>
                        <option value="pet">What was the name of your first pet?</option>
                        <option value="city">What city were you born in?</option>
                        <option value="school">What was the name of your first school?</option>
                        <option value="book">What is your favorite book?</option>
                        <option value="movie">What is your favorite movie?</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="securityAnswer">Your Answer</Label>
                      <Input
                        id="securityAnswer"
                        name="securityAnswer"
                        value={securityForm.securityAnswer}
                        onChange={handleSecurityChange}
                        placeholder="Enter your answer (or re-enter if updating)"
                        className="rounded-lg border-slate-200"
                      />
                      {securityForm.securityQuestion && (
                        <p className="text-xs text-slate-500 mt-1">Your answer is securely hashed and cannot be displayed for security reasons.</p>
                      )}
                    </div>
                    <Button onClick={handleSaveSecurityQuestion} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
                      Save Security Question
                    </Button>
                  </div>


                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Connected Accounts</CardTitle>
                  <CardDescription>Link external accounts to verify your trading history and build trust</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-900 font-medium">🔒 Your credentials are secure</p>
                    <p className="text-xs text-blue-800 mt-1">
                      You'll be redirected directly to each site to authorize the connection. We never store your login credentials.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <EbayConnection />
                    {accountSources.map((source) => (
                      <div
                        key={source.value}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={source.logo} 
                            alt={source.label}
                            className="h-12 w-auto object-contain"
                          />
                          <div>
                            <p className="font-medium text-slate-900">{source.label}</p>
                            <p className="text-xs text-slate-600">
                              {connectedAccounts.includes(source.value) ? "Connected" : "Not connected"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={connectedAccounts.includes(source.value) ? "destructive" : "outline"}
                          size="sm"
                          className="rounded-lg"
                          onClick={() => handleAccountSourceToggle(source.value)}
                        >
                          {connectedAccounts.includes(source.value) ? "Disconnect" : "Connect"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Communications Tab */}
            <TabsContent value="communications" className="space-y-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Communication Preferences</CardTitle>
                  <CardDescription>Control how and when you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Notification Types with Email/Text Toggles */}
                  <div className="space-y-6">
                    <h3 className="font-semibold text-slate-900">Notification Preferences</h3>
                    <p className="text-sm text-slate-600">Choose how you want to receive notifications for each type of event</p>

                    {/* Trade Initiated */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">Trade Initiated</p>
                        <p className="text-xs text-slate-600">When someone initiates a trade with you</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.tradeInitiated.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, tradeInitiated: { ...prev.tradeInitiated, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.tradeInitiated.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, tradeInitiated: { ...prev.tradeInitiated, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>

                    {/* Counter Proposal */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">Counter Proposal</p>
                        <p className="text-xs text-slate-600">When someone sends a counter proposal</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.counterProposal.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, counterProposal: { ...prev.counterProposal, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.counterProposal.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, counterProposal: { ...prev.counterProposal, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>

                    {/* Proposal Accepted */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">Proposal Accepted</p>
                        <p className="text-xs text-slate-600">When your proposal is accepted</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.proposalAccepted.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, proposalAccepted: { ...prev.proposalAccepted, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.proposalAccepted.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, proposalAccepted: { ...prev.proposalAccepted, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>

                    {/* Proposal Rejected */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">Proposal Rejected</p>
                        <p className="text-xs text-slate-600">When your proposal is rejected</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.proposalRejected.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, proposalRejected: { ...prev.proposalRejected, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.proposalRejected.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, proposalRejected: { ...prev.proposalRejected, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>

                    {/* Items Shipped */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">Items Shipped</p>
                        <p className="text-xs text-slate-600">When items are shipped in a trade</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.itemsShipped.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, itemsShipped: { ...prev.itemsShipped, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.itemsShipped.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, itemsShipped: { ...prev.itemsShipped, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>

                    {/* Items Received */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">Items Received</p>
                        <p className="text-xs text-slate-600">When items are received in a trade</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.itemsReceived.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, itemsReceived: { ...prev.itemsReceived, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.itemsReceived.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, itemsReceived: { ...prev.itemsReceived, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>

                    {/* Feedback Received */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">Feedback Received</p>
                        <p className="text-xs text-slate-600">When you receive feedback from a trade</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.feedbackReceived.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, feedbackReceived: { ...prev.feedbackReceived, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.feedbackReceived.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, feedbackReceived: { ...prev.feedbackReceived, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>

                    {/* System Updates */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">System Updates</p>
                        <p className="text-xs text-slate-600">Important system and platform updates</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.systemUpdates.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, systemUpdates: { ...prev.systemUpdates, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.systemUpdates.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, systemUpdates: { ...prev.systemUpdates, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>

                    {/* Marketing Emails */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">Marketing Emails</p>
                        <p className="text-xs text-slate-600">Promotional offers and news</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.marketingEmails.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, marketingEmails: { ...prev.marketingEmails, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.marketingEmails.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, marketingEmails: { ...prev.marketingEmails, text: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Text</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveCommunications} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
                    <Save className="mr-2 h-4 w-4" />
                    Save Communication Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Collecting Preferences</CardTitle>
                  <CardDescription>Customize your collecting interests and privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Preferred Categories */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900">Preferred Collecting Categories</h3>
                    <p className="text-xs text-slate-600">Select the categories you're most interested in</p>
                    <div className="grid grid-cols-2 gap-3">
                      {categoryOptions.map((cat) => {
                        const checkboxId = `category-${cat.value}`;
                        // Only set defaultChecked on first render to initialize the checkbox
                        const isChecked = !preferencesInitializedRef.current ? preferences.preferredCategories.includes(cat.value) : undefined;
                        return (
                          <div key={cat.value} className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                            <input
                              id={checkboxId}
                              type="checkbox"
                              defaultChecked={isChecked}
                              className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
                              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                            />
                            <label 
                              htmlFor={checkboxId}
                              className="text-sm text-slate-700 cursor-pointer flex-1"
                              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                              data-manus-no-intercept="true"
                            >
                              {cat.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h3 className="font-semibold text-slate-900">Privacy Settings</h3>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Show Profile</p>
                        <p className="text-xs text-slate-600">Allow others to view your public profile</p>
                      </div>
                      <Switch
                        checked={preferences.showProfile}
                        onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, showProfile: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Hide Inventory Value</p>
                        <p className="text-xs text-slate-600">Don't show the total value of your collection</p>
                      </div>
                      <Switch
                        checked={preferences.hideInventoryValue}
                        onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, hideInventoryValue: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Receive Contact Requests</p>
                        <p className="text-xs text-slate-600">Allow collectors to contact you about trades</p>
                      </div>
                      <Switch
                        checked={preferences.receiveContactRequests}
                        onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, receiveContactRequests: checked }))}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSavePreferences} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmationDialog.isOpen} onOpenChange={(open) => setConfirmationDialog(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmationDialog.message}</AlertDialogDescription>
          <AlertDialogAction onClick={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

