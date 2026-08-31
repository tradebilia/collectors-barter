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
import { FacebookConnection } from "@/components/FacebookConnection";
import { LinkedInConnection } from "@/components/LinkedInConnection";
import { EtsyConnection } from "@/components/EtsyConnection";
import { trpc } from "@/lib/trpc";
import { Bell, Lock, Mail, Loader2, Save, Shield, Link as LinkIcon, Upload, Eye, EyeOff, Cog, CreditCard, ExternalLink } from "lucide-react";
import { FormEvent, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

const TRADEBILIA_LOGO_URL = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg";

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
  { value: "paypal", label: "PayPal", logo: "https://assets.tradebilia.com/Paypal_25ebc114.png" },
  { value: "whatnot", label: "Whatnot", logo: "https://assets.tradebilia.com/WhatNot_ab669ac9.png" },
] as const;

type AccountSource = typeof accountSources[number]["value"];
type ExternalPaymentMethodKey = "paypal" | "venmo" | "cash_app" | "zelle";

const externalPaymentMethodOptions: Array<{ key: ExternalPaymentMethodKey; label: string; logo: string }> = [
  { key: "paypal", label: "PayPal", logo: "/manus-storage/paypal-official-logo_f5abda0f.png" },
  { key: "venmo", label: "Venmo", logo: "/manus-storage/venmo-official-logo_37a969df.png" },
  { key: "cash_app", label: "Cash App", logo: "/manus-storage/cash-app-official-logo-normalized_342b45be.webp" },
  { key: "zelle", label: "Zelle", logo: "/manus-storage/zelle-official-logo-normalized_9845a118.png" },
];



export default function AccountSettings() {
  const { user, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const saveProfileMutation = trpc.market.saveProfile.useMutation();
  const changePasswordMutation = trpc.market.changePassword.useMutation();
  const saveIntegrationsMutation = trpc.market.saveIntegrations.useMutation();
  const saveCommunicationsMutation = trpc.market.saveCommunications.useMutation();
  const savePreferencesMutation = trpc.market.savePreferences.useMutation();
  const membershipQuery = trpc.membership.getMyStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const accountClosureRequestQuery = trpc.accountClosure.getMyRequest.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const accountClosureRequestMutation = trpc.accountClosure.request.useMutation({
    onSuccess: async (result) => {
      await utils.accountClosure.getMyRequest.invalidate();
      if (result.status === "closed") {
        toast.success("Your account has been closed. You are being signed out.");
        await logout();
        window.location.assign("/");
        return;
      }
      if (result.status === "pending_review") {
        toast.info("Your account closure request needs administrator review. Your account remains available while the listed items are resolved.");
        return;
      }
      toast.info("Your account closure request has already been recorded.");
    },
    onError: (error) => toast.error(error.message),
  });
  const startTestCheckoutMutation = trpc.billing.startTestCheckout.useMutation();
  const openTestPortalMutation = trpc.billing.openTestPortal.useMutation();
  // Private external cash-adjustment destinations. These are never public-profile fields.
  const externalPaymentMethodsQuery = trpc.payment.getExternalPaymentMethods.useQuery();
  const saveExternalPaymentMethodsMutation = trpc.payment.saveExternalPaymentMethods.useMutation();

  // Read ?tab= from URL to support redirects (e.g., from eBay OAuth callback)
  const validTabs = ["profile", "membership", "security", "integrations", "communications", "preferences"] as const;
  const urlTab = new URLSearchParams(window.location.search).get("tab");
  const initialTab = validTabs.includes(urlTab as any) ? (urlTab as typeof validTabs[number]) : "profile";
  const [activeTab, setActiveTab] = useState<"profile" | "membership" | "security" | "integrations" | "communications" | "preferences">(initialTab);
  
  // Profile Form State
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [testBillingTerm, setTestBillingTerm] = useState<"monthly" | "annual" | null>(null);

  const openStripeSandboxWindow = (url: string, label: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`${label} opened in a new tab.`);
  };

  const openStripeSandboxCheckout = (url: string) => {
    window.location.assign(url);
  };

  const handleStartTestCheckout = (billingTerm: "monthly" | "annual") => {
    setTestBillingTerm(billingTerm);
  };

  const confirmTestCheckout = () => {
    if (!testBillingTerm) return;
    startTestCheckoutMutation.mutate({ billingTerm: testBillingTerm }, {
      onSuccess: ({ url }) => openStripeSandboxCheckout(url),
      onError: (error) => toast.error(error.message),
      onSettled: () => setTestBillingTerm(null),
    });
  };

  const handleOpenTestPortal = () => {
    openTestPortalMutation.mutate(undefined, {
      onSuccess: ({ url }) => openStripeSandboxWindow(url, "Stripe sandbox customer portal"),
      onError: (error) => toast.error(error.message),
    });
  };

  const hasExistingSandboxMembership = ["active", "past_due", "unpaid"].includes(membershipQuery.data?.membership.status ?? "")
    && ["monthly", "annual"].includes(membershipQuery.data?.membership.billingTerm ?? "");

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
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Integrations State
  const [connectedAccounts, setConnectedAccounts] = useState<AccountSource[]>([]);

  // Direct cash-adjustment destinations
  const [externalPaymentForm, setExternalPaymentForm] = useState({
    paypalEmail: "",
    venmoUsername: "",
    cashAppCashtag: "",
    zelleEmail: "",
    zellePhone: "",
  });
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<Record<ExternalPaymentMethodKey, boolean>>({
    paypal: false,
    venmo: false,
    cash_app: false,
    zelle: false,
  });
  const [externalPaymentSaving, setExternalPaymentSaving] = useState(false);
  const zelleDestination = externalPaymentForm.zelleEmail || externalPaymentForm.zellePhone;

  useEffect(() => {
    const methods = externalPaymentMethodsQuery.data;
    if (!methods) return;
    setExternalPaymentForm({
      paypalEmail: methods.paypalEmail ?? "",
      venmoUsername: methods.venmoUsername ?? "",
      cashAppCashtag: methods.cashAppCashtag ?? "",
      zelleEmail: methods.zelleEmail ?? "",
      zellePhone: methods.zellePhone ?? "",
    });
    setEnabledPaymentMethods({
      paypal: Boolean(methods.paypalEmail),
      venmo: Boolean(methods.venmoUsername),
      cash_app: Boolean(methods.cashAppCashtag),
      zelle: Boolean(methods.zelleEmail || methods.zellePhone),
    });
  }, [externalPaymentMethodsQuery.data]);
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
    messages: { email: boolean; text: boolean };
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
    messages: { email: true, text: false },
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

  // Merchant/Business State
  const [merchantForm, setMerchantForm] = useState({
    isMerchant: false,
    storeName: "",
    businessLicense: "",
    taxId: "",
    storeDescription: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    businessWebsite: "",
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
        isMerchant: Boolean((profile as any).isMerchant),
        storeName: (profile as any).storeName || "",
      });

      setMerchantForm({
        isMerchant: Boolean((profile as any).isMerchant),
        storeName: (profile as any).storeName || "",
        businessLicense: (profile as any).businessLicense || "",
        taxId: (profile as any).taxId || "",
        storeDescription: (profile as any).storeDescription || "",
        businessAddress: (profile as any).businessAddress || "",
        businessPhone: (profile as any).businessPhone || "",
        businessEmail: (profile as any).businessEmail || "",
        businessWebsite: (profile as any).businessWebsite || "",
      });

      setProfileForm({
        displayName: profile.displayName || user?.name || "",
        bio: profile.bio || "",
        phoneNumber: profile.contactPhone || "",
        avatarPreview: profile.avatarUrl || "",
      });

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
          showProfile: Boolean((profile as any).showProfile ?? 1),
          hideInventoryValue: Boolean((profile as any).hideInventoryValue ?? 0),
          receiveContactRequests: Boolean((profile as any).receiveContactRequests ?? 1),
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
        messages: { email: true, text: false },
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
            messages: parsed.messages || { email: true, text: false },
          };
        } catch (e) {
          console.error("Failed to parse notification preferences", e);
        }
      }
      setCommunicationPrefs(notificationPrefs);
    }
  }, [dashboardQuery.data?.profile, user?.name]);

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
      // Note: identity fields (firstName, lastName, contactEmail, contactAddress, etc.)
      // are locked after first-time account setup and can only be changed by admins.
      // Sending them here causes a FORBIDDEN error for regular users.
      const payload: any = {
        displayName: profileForm.displayName,
        bio: profileForm.bio,
        // Only send identity and merchant fields if user is admin (non-admins can't modify these after setup)
        ...(user?.role === 'admin' && {
          firstName: identityInfo.firstName || undefined,
          lastName: identityInfo.lastName || undefined,
          contactEmail: identityInfo.email || undefined,
          contactPhone: identityInfo.phoneNumber || undefined,
          contactAddress: identityInfo.street || undefined,
          contactTown: identityInfo.town || undefined,
          contactState: identityInfo.state || undefined,
          contactZipCode: identityInfo.zipCode || undefined,
          contactCountry: identityInfo.country || undefined,
        }),
        // Merchant fields - only for admins
        ...(user?.role === 'admin' && {
          isMerchant: merchantForm.isMerchant,
          storeName: merchantForm.storeName || undefined,
          businessLicense: merchantForm.businessLicense || undefined,
          taxId: merchantForm.taxId || undefined,
          storeDescription: merchantForm.storeDescription || undefined,
          businessAddress: merchantForm.businessAddress || undefined,
          businessPhone: merchantForm.businessPhone || undefined,
          businessEmail: merchantForm.businessEmail || undefined,
          businessWebsite: merchantForm.businessWebsite || undefined,
        }),
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
      
      console.log("[AccountSettings] Payload being sent:", JSON.stringify(payload, null, 2));
      console.log("[AccountSettings] User role:", user?.role);
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
      });
      setShowPasswordFields(false);
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to change password");
    }
  };

  const handleSaveExternalPaymentMethods = async () => {
    setExternalPaymentSaving(true);
    try {
      const result = await saveExternalPaymentMethodsMutation.mutateAsync({
        enabledMethods: enabledPaymentMethods,
        paypalEmail: enabledPaymentMethods.paypal ? externalPaymentForm.paypalEmail.trim() || null : null,
        venmoUsername: enabledPaymentMethods.venmo ? externalPaymentForm.venmoUsername.trim() || null : null,
        cashAppCashtag: enabledPaymentMethods.cash_app ? externalPaymentForm.cashAppCashtag.trim() || null : null,
        zelleEmail: enabledPaymentMethods.zelle ? externalPaymentForm.zelleEmail.trim() || null : null,
        zellePhone: enabledPaymentMethods.zelle ? externalPaymentForm.zellePhone.trim() || null : null,
      });
      await externalPaymentMethodsQuery.refetch();
      toast.success(result.preferencesChanged ? "Payment methods saved privately. Accepted trade payment details are unchanged." : "Payment methods saved privately.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save payment destinations.");
    } finally {
      setExternalPaymentSaving(false);
    }
  };

  const handlePaymentMethodToggle = (method: ExternalPaymentMethodKey, checked: boolean) => {
    setEnabledPaymentMethods((current) => ({ ...current, [method]: checked }));
    if (checked) return;
    setExternalPaymentForm((current) => {
      if (method === "paypal") return { ...current, paypalEmail: "" };
      if (method === "venmo") return { ...current, venmoUsername: "" };
      if (method === "cash_app") return { ...current, cashAppCashtag: "" };
      return { ...current, zelleEmail: "", zellePhone: "" };
    });
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
      // Checkboxes are now fully controlled via React state — read directly from preferences
      const prefsToSave = {
        ...preferences,
      };
      console.log('[handleSavePreferences] Categories from state:', preferences.preferredCategories);
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
          backgroundImage: 'url(https://assets.tradebilia.com/Background_23084d14.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center">
            <img
              src="https://assets.tradebilia.com/AccountSettingsTitle_d074dc8b.webp"
              alt="Account Settings"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="flex w-full justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-lg bg-slate-200 p-1 sm:grid sm:grid-cols-6 sm:gap-0">
              <TabsTrigger className="flex-none sm:flex-1" value="profile">Profile</TabsTrigger>
              <TabsTrigger className="flex-none sm:flex-1" value="membership">Membership</TabsTrigger>
              <TabsTrigger className="flex-none sm:flex-1" value="security">Security</TabsTrigger>
              <TabsTrigger className="flex-none sm:flex-1" value="integrations">Integrations</TabsTrigger>
              <TabsTrigger className="flex-none sm:flex-1" value="communications">Communications</TabsTrigger>
              <TabsTrigger className="flex-none sm:flex-1" value="preferences">Preferences</TabsTrigger>
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName"
                          name="firstName"
                          value={identityInfo.firstName} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, firstName: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
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
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                          id="email"
                          name="email"
                          type="email"
                          value={identityInfo.email} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, email: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input 
                          id="country"
                          name="country"
                          value={identityInfo.country} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, country: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input 
                          id="street"
                          name="street"
                          value={identityInfo.street} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, street: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="town">Town/City</Label>
                        <Input 
                          id="town"
                          name="town"
                          value={identityInfo.town} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, town: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input 
                          id="state"
                          name="state"
                          value={identityInfo.state} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, state: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">Zip Code</Label>
                        <Input 
                          id="zipCode"
                          name="zipCode"
                          value={identityInfo.zipCode} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input 
                          id="phoneNumber"
                          name="phoneNumber"
                          value={identityInfo.phoneNumber} 
                          onChange={(e) => setIdentityInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          disabled={user?.role !== 'admin'}
                          className='rounded-lg border-slate-200 border bg-white disabled:opacity-50 disabled:cursor-not-allowed' 
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
                        maxLength={500}
                        className="rounded-lg border-slate-200"
                        rows={4}
                      />
                      <p className="text-xs text-slate-600">{profileForm.bio.length}/500 characters</p>
                    </div>
                  </div>

                  {/* Merchant / Business Section */}
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Store / Merchant Status {user?.role !== 'admin' ? '(Read-Only)' : ''}</h3>
                      {merchantForm.isMerchant && (
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">Verified Merchant</span>
                      )}
                    </div>
                    {user?.role !== 'admin' && (
                      <p className="text-xs text-slate-600">Merchant information cannot be changed after account setup. Contact support if you need to update these details.</p>
                    )}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={merchantForm.isMerchant}
                        onChange={(e) => setMerchantForm(prev => ({ ...prev, isMerchant: e.target.checked }))}
                        disabled={user?.role !== 'admin'}
                        className="h-4 w-4 rounded border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm font-medium text-slate-900">I'm a Store Owner or Professional Merchant</span>
                    </label>
                    {merchantForm.isMerchant && (
                      <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Store Name</Label>
                            <Input disabled={user?.role !== 'admin'} value={merchantForm.storeName} onChange={(e) => setMerchantForm(prev => ({ ...prev, storeName: e.target.value }))} className="rounded-lg border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <Label>Business License</Label>
                            <Input disabled={user?.role !== 'admin'} value={merchantForm.businessLicense} onChange={(e) => setMerchantForm(prev => ({ ...prev, businessLicense: e.target.value }))} className="rounded-lg border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <Label>Tax ID / EIN</Label>
                            <Input disabled={user?.role !== 'admin'} value={merchantForm.taxId} onChange={(e) => setMerchantForm(prev => ({ ...prev, taxId: e.target.value }))} className="rounded-lg border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <Label>Business Phone</Label>
                            <Input disabled={user?.role !== 'admin'} value={merchantForm.businessPhone} onChange={(e) => setMerchantForm(prev => ({ ...prev, businessPhone: e.target.value }))} className="rounded-lg border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Business Address</Label>
                            <Input disabled={user?.role !== 'admin'} value={merchantForm.businessAddress} onChange={(e) => setMerchantForm(prev => ({ ...prev, businessAddress: e.target.value }))} className="rounded-lg border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <Label>Business Email</Label>
                            <Input disabled={user?.role !== 'admin'} type="email" value={merchantForm.businessEmail} onChange={(e) => setMerchantForm(prev => ({ ...prev, businessEmail: e.target.value }))} className="rounded-lg border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <Label>Business Website</Label>
                            <Input disabled={user?.role !== 'admin'} type="url" value={merchantForm.businessWebsite} onChange={(e) => setMerchantForm(prev => ({ ...prev, businessWebsite: e.target.value }))} className="rounded-lg border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Store Description</Label>
                            <Textarea disabled={user?.role !== 'admin'} value={merchantForm.storeDescription} onChange={(e) => setMerchantForm(prev => ({ ...prev, storeDescription: e.target.value }))} rows={3} className="rounded-lg border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-slate-900"><CreditCard className="h-5 w-5 text-blue-700" />Direct Cash Payment Methods <span className="text-slate-400 font-normal">(optional)</span></h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">Choose only the methods you can use to both send and receive a direct payment. If you enable a method, add the destination for that method. If you enable none, Add Cash remains unavailable in the Trade Room.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 p-4"><label className="flex cursor-pointer items-center gap-3" htmlFor="payment-enable-paypal"><input id="payment-enable-paypal" type="checkbox" checked={enabledPaymentMethods.paypal} onChange={(event) => handlePaymentMethodToggle("paypal", event.target.checked)} className="h-4 w-4 rounded border-slate-300" /><img src={externalPaymentMethodOptions[0].logo} alt="PayPal" className="h-8 w-auto max-w-[11rem] object-contain object-left" /></label>{enabledPaymentMethods.paypal && <div className="mt-3 space-y-1.5"><Label htmlFor="payment-paypal">PayPal email</Label><Input id="payment-paypal" type="email" placeholder="you@example.com" value={externalPaymentForm.paypalEmail} onChange={(event) => setExternalPaymentForm((current) => ({ ...current, paypalEmail: event.target.value }))} /></div>}</div>
                      <div className="rounded-lg border border-slate-200 p-4"><label className="flex cursor-pointer items-center gap-3" htmlFor="payment-enable-venmo"><input id="payment-enable-venmo" type="checkbox" checked={enabledPaymentMethods.venmo} onChange={(event) => handlePaymentMethodToggle("venmo", event.target.checked)} className="h-4 w-4 rounded border-slate-300" /><img src={externalPaymentMethodOptions[1].logo} alt="Venmo" className="h-8 w-auto max-w-[11rem] object-contain object-left" /></label>{enabledPaymentMethods.venmo && <div className="mt-3 space-y-1.5"><Label htmlFor="payment-venmo">Venmo username</Label><Input id="payment-venmo" placeholder="username or @username" value={externalPaymentForm.venmoUsername} onChange={(event) => setExternalPaymentForm((current) => ({ ...current, venmoUsername: event.target.value }))} /></div>}</div>
                      <div className="rounded-lg border border-slate-200 p-4"><label className="flex cursor-pointer items-center gap-3" htmlFor="payment-enable-cashapp"><input id="payment-enable-cashapp" type="checkbox" checked={enabledPaymentMethods.cash_app} onChange={(event) => handlePaymentMethodToggle("cash_app", event.target.checked)} className="h-4 w-4 rounded border-slate-300" /><img src={externalPaymentMethodOptions[2].logo} alt="Cash App" className="h-8 w-auto max-w-[11rem] object-contain object-left" /></label>{enabledPaymentMethods.cash_app && <div className="mt-3 space-y-1.5"><Label htmlFor="payment-cashapp">Cash App $cashtag</Label><Input id="payment-cashapp" placeholder="$yourcashtag" value={externalPaymentForm.cashAppCashtag} onChange={(event) => setExternalPaymentForm((current) => ({ ...current, cashAppCashtag: event.target.value }))} /></div>}</div>
                      <div className="rounded-lg border border-slate-200 p-4"><label className="flex cursor-pointer items-center gap-3" htmlFor="payment-enable-zelle"><input id="payment-enable-zelle" type="checkbox" checked={enabledPaymentMethods.zelle} onChange={(event) => handlePaymentMethodToggle("zelle", event.target.checked)} className="h-4 w-4 rounded border-slate-300" /><img src={externalPaymentMethodOptions[3].logo} alt="Zelle" className="h-8 w-auto max-w-[11rem] object-contain object-left" /></label>{enabledPaymentMethods.zelle && <div className="mt-3 space-y-1.5"><Label htmlFor="payment-zelle">Zelle email or U.S. mobile number</Label><Input id="payment-zelle" inputMode="text" placeholder="Email address or U.S. mobile number" value={zelleDestination} onChange={(event) => { const destination = event.target.value; const isEmailDestination = destination.includes("@"); setExternalPaymentForm((current) => ({ ...current, zelleEmail: isEmailDestination ? destination : "", zellePhone: isEmailDestination ? "" : destination })); }} /></div>}</div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950"><strong>Important:</strong> Tradebilia does not process, hold, insure, refund, or guarantee direct payments. Enabled methods are member-provided, not platform-verified. Your private destination is shared only with the agreed payer after both members accept the final terms.</div>
                    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">You may change these private preferences at any time, except while a selected cash payment is awaiting your receipt confirmation.</p><Button type="button" onClick={handleSaveExternalPaymentMethods} disabled={externalPaymentSaving || externalPaymentMethodsQuery.isLoading} className="rounded-lg">{externalPaymentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}<span className="ml-1">Save payment methods</span></Button></div>
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
                      <div className="space-y-3">
                        {accountClosureRequestQuery.data?.status === "pending_review" ? (
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                            <p className="font-medium">Your account closure request is awaiting review.</p>
                            <p className="mt-1 text-xs">Your account remains available while Tradebilia resolves the listed trade, report, ticket, or account-review items.</p>
                          </div>
                        ) : accountClosureRequestQuery.data?.status === "declined" ? (
                          <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800">
                            <p className="font-medium">Your prior closure request was not approved.</p>
                            {accountClosureRequestQuery.data.adminNote ? <p className="mt-1 text-xs">Administrator note: {accountClosureRequestQuery.data.adminNote}</p> : null}
                          </div>
                        ) : null}
                        <Button
                          variant="destructive"
                          className="rounded-lg"
                          disabled={accountClosureRequestMutation.isPending || accountClosureRequestQuery.data?.status === "pending_review"}
                          onClick={() => setConfirmationDialog({
                            isOpen: true,
                            title: "Close your Tradebilia account?",
                            message: "Tradebilia will immediately check for active or unresolved trades, complaints, reports, support tickets, and account holds. If none exist, your account will close now, future sign-in will be disabled, and active listings will be hidden. Trade and safety records are not erased. If an issue needs resolution, your request will be sent to administrator review.",
                            actionLabel: "Request account closure",
                            onConfirm: () => accountClosureRequestMutation.mutate({}),
                          })}
                        >
                          {accountClosureRequestMutation.isPending ? "Checking account…" : "Request Account Closure"}
                        </Button>
                        <p className="text-xs text-red-800">Eligible accounts close immediately. Accounts with active trade or safety obligations are held for administrator review; protected history is retained.</p>
                      </div>
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
                  <CardDescription>Manage your password and recovery methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recovery email */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Recovery Email</p>
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

                  {/* Account recovery */}
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h3 className="font-semibold text-slate-900">Account Recovery</h3>
                    <p className="text-sm text-slate-600 leading-6">
                      Password recovery uses your verified Tradebilia email and verified phone number. Security questions are no longer used.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => window.location.assign("/account-setup")} className="rounded-lg">
                        Verify Recovery Contacts
                      </Button>
                      <Button variant="outline" onClick={() => window.location.assign("/forgot-password")} className="rounded-lg">
                        Open Password Recovery
                      </Button>
                    </div>
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
                    <FacebookConnection />
                    <LinkedInConnection />
                    <EtsyConnection />
                    {accountSources.map((source) => (
                      <div
                        key={source.value}
                        className="flex flex-col items-stretch gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
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

              {/* Pending Connections Quick Links */}
              {(() => {
                const allPlatforms = [
                  { key: 'facebook', label: 'Facebook', logo: 'https://assets.tradebilia.com/Facebooklogo_0c02c2d1.png', isConnected: !!user?.facebookId },
                  { key: 'linkedin', label: 'LinkedIn', logo: 'https://assets.tradebilia.com/LinkedIn_df1e2c1e.webp', isConnected: !!user?.linkedinId },
                  { key: 'ebay', label: 'eBay', logo: 'https://assets.tradebilia.com/Ebaylogo_12a10426.png', isConnected: !!user?.ebayUsername },
                  { key: 'whatnot', label: 'WhatNot', logo: 'https://assets.tradebilia.com/WhatNot_ab669ac9.png', isConnected: false },
                ];
                const pendingPlatforms = allPlatforms.filter(p => !p.isConnected);
                
                return pendingPlatforms.length > 0 ? (
                  <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle>Pending Connections</CardTitle>
                      <CardDescription>Connect these accounts to expand your trading profile</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {pendingPlatforms.map(p => (
                          <div key={p.key} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors cursor-pointer">
                            <img src={p.logo} alt={p.label} className="h-8 mb-2 object-contain" />
                            <p className="text-sm font-semibold text-slate-900 text-center">{p.label}</p>
                            <p className="text-xs text-slate-500 mt-1">Not connected</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

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

                    {/* Messages */}
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">New Messages</p>
                        <p className="text-xs text-slate-600">When you receive a new direct message or item inquiry</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.messages.email}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, messages: { ...prev.messages, email: checked } }))}
                          />
                          <span className="text-sm text-slate-700">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={communicationPrefs.messages.text}
                            onCheckedChange={(checked) => setCommunicationPrefs(prev => ({ ...prev, messages: { ...prev.messages, text: checked } }))}
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
                        const isChecked = preferences.preferredCategories.includes(cat.value as any);
                        return (
                          <div
                            key={cat.value}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                              isChecked ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400'
                            }`}
                            onClick={() => handleCategoryToggle(cat.value)}
                          >
                            <input
                              id={checkboxId}
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCategoryToggle(cat.value)}
                              className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
                              style={{ pointerEvents: 'none' }}
                            />
                            <label 
                              htmlFor={checkboxId}
                              className="text-sm text-slate-700 cursor-pointer flex-1 pointer-events-none"
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

            <TabsContent value="membership" className="space-y-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Membership &amp; Billing</CardTitle>
                  <CardDescription>Tradebilia is currently in Free Launch. No card is required and no payment is being collected.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {membershipQuery.isLoading ? (
                    <p className="text-sm text-slate-600">Loading your membership status…</p>
                  ) : membershipQuery.error ? (
                    <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Your membership status is temporarily unavailable. Free Launch access remains unchanged.</p>
                  ) : (
                    <>
                      <div className="rounded-xl border border-violet-100 bg-violet-50 p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Current status</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">{membershipQuery.data?.billing.statusLabel ?? "Free Launch Access"}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{membershipQuery.data?.billing.statusMessage}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {membershipQuery.data?.billing.futureSubscriptionTerms.map((term) => (
                          <div key={term.code} className="rounded-xl border border-slate-200 p-4">
                            <p className="font-semibold text-slate-900">{term.label}</p>
                            <p className="mt-1 text-sm text-slate-600">Future Tradebilia Membership: {term.displayPrice}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Included during Free Launch</h3>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {membershipQuery.data?.entitlements.map((feature) => (
                            <div key={feature.featureKey} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <p className="text-sm font-medium text-slate-900">{feature.name}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">{feature.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {user?.role === "admin" && (
                        <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/70 p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="flex items-center gap-2 text-sm font-bold text-violet-950"><CreditCard className="h-4 w-4" />Sandbox administrator tools</p>
                              <p className="mt-1 max-w-2xl text-sm leading-6 text-violet-900">These test-only controls are visible only to administrators. They create Stripe sandbox sessions for validation; Free Launch, live charges, and member restrictions remain inactive.</p>
                            </div>
                            <span className="w-fit rounded-full bg-violet-200 px-3 py-1 text-xs font-semibold text-violet-900">Test mode only</span>
                          </div>
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <Button type="button" className="bg-violet-700 hover:bg-violet-800" disabled={hasExistingSandboxMembership || startTestCheckoutMutation.isPending} onClick={() => handleStartTestCheckout("monthly")}>
                              <ExternalLink className="mr-2 h-4 w-4" />Test $1 monthly Checkout
                            </Button>
                            <Button type="button" variant="outline" className="border-violet-300 bg-white text-violet-900 hover:bg-violet-100" disabled={hasExistingSandboxMembership || startTestCheckoutMutation.isPending} onClick={() => handleStartTestCheckout("annual")}>
                              <ExternalLink className="mr-2 h-4 w-4" />Test $10 annual Checkout
                            </Button>
                            <Button type="button" variant="outline" className="border-violet-300 bg-white text-violet-900 hover:bg-violet-100" disabled={openTestPortalMutation.isPending} onClick={handleOpenTestPortal}>
                              <ExternalLink className="mr-2 h-4 w-4" />Open test portal
                            </Button>
                          </div>
                          {hasExistingSandboxMembership && (
                            <p className="mt-3 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950">A sandbox Membership is already active for this administrator account. The Checkout buttons are disabled to prevent a duplicate subscription. Use the test portal to review it; do not cancel or change it unless you intend to test that action.</p>
                          )}
                          {testBillingTerm && (
                            <div className="mt-4 rounded-lg border border-violet-300 bg-white p-4" role="status">
                              <p className="text-sm font-semibold text-slate-900">Open the Stripe sandbox {testBillingTerm} Checkout?</p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">This creates a test-only Membership subscription for administrator validation. It does not create a live charge, change Free Launch, or restrict any member.</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button type="button" size="sm" className="bg-violet-700 hover:bg-violet-800" disabled={hasExistingSandboxMembership || startTestCheckoutMutation.isPending} onClick={confirmTestCheckout}>Open sandbox Checkout</Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => setTestBillingTerm(null)}>Cancel</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
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
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const onConfirm = confirmationDialog.onConfirm;
              setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
              onConfirm?.();
            }}>{confirmationDialog.actionLabel ?? "OK"}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
