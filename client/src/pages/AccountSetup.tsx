import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { trpc } from "@/lib/trpc";
import { ChevronRight, Loader2, Upload, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { TopBar } from "@/components/TopBar";
import { FormEvent, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

const TRADEBILIA_LOGO_URL = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg";

type AccountSource = "ebay" | "facebook" | "linkedin" | "whatnot";

const accountSources: { value: AccountSource; label: string; icon: string }[] = [
  { value: "ebay", label: "eBay", icon: "🏪" },
  { value: "facebook", label: "Facebook", icon: "f" },
  { value: "linkedin", label: "LinkedIn", icon: "in" },
  { value: "whatnot", label: "WhatNot", icon: "🔴" },
];

export default function AccountSetup() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [currentStep, setCurrentStep] = useState(1);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    firstName: "",
    lastName: "",
    street: "",
    town: "",
    zipCode: "",
    state: "",
    country: "",
    email: "",
    phoneNumber: "",
    bio: "",
    avatarPreview: "",
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
  const [showMerchantFields, setShowMerchantFields] = useState(false);
  const [selectedSources, setSelectedSources] = useState<AccountSource[]>([]);
  const [externalPaymentForm, setExternalPaymentForm] = useState({
    paypalEmail: "",
    venmoUsername: "",
    cashAppCashtag: "",
    zelleEmail: "",
    zellePhone: "",
  });
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [bioText, setBioText] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
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
  });
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleMerchantToggle = () => {
    setShowMerchantFields(!showMerchantFields);
    setFormData((prev) => ({
      ...prev,
      isMerchant: !prev.isMerchant,
    }));
  };

  const authQuery = trpc.auth.me.useQuery();
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const sendPhoneCodeMutation = trpc.auth.sendPhoneCode.useMutation();
  const verifyPhoneCodeMutation = trpc.auth.verifyPhoneCode.useMutation();
  const sendEmailCodeMutation = trpc.auth.sendEmailCode.useMutation();
  const verifyEmailCodeMutation = trpc.auth.verifyEmailCode.useMutation();

  const saveProfileMutation = trpc.market.saveProfile.useMutation({
    onSuccess: async () => {
      await utils.market.dashboard.invalidate();
      await utils.auth.me.refetch();
      toast.success("Account setup completed!");
      // Do a full page reload to ensure auth is properly initialized
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    },
    onError: (error) => {
      console.error("Profile save error:", error);
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
  const saveExternalPaymentMethodsMutation = trpc.payment.saveExternalPaymentMethods.useMutation();

  useEffect(() => {
    if (dashboardQuery.data?.profile) {
      const profile = dashboardQuery.data.profile;
      const fullName = profile.contactFullName || user?.name || "";
      const [first, last] = fullName.split(" ");
      setFormData((prev) => ({
        ...prev,
        userName: profile.displayName || (user as any)?.username || user?.name || "",
        firstName: first || "",
        lastName: last || "",
        street: profile.contactAddress || "",
        zipCode: "",
        state: "",
        country: "",
        email: profile.contactEmail || (user as any)?.email || "",
        phoneNumber: profile.contactPhone || "",
        bio: profile.bio || "",
      }));
      setIsPhoneVerified(Boolean((profile as any).phoneVerified));
      setIsEmailVerified(Boolean((profile as any).emailVerified));
    }
  }, [dashboardQuery.data?.profile, user?.name]);

  useEffect(() => {
    const authenticatedUsername = (user as any)?.username || user?.name;
    if (authenticatedUsername) {
      setFormData((prev) => (prev.userName ? prev : { ...prev, userName: authenticatedUsername }));
    }
  }, [user]);

  if (!isAuthenticated && (authQuery.isLoading || authQuery.isFetching)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] text-slate-950">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to set up your Tradebilia account.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Create your profile, add your collection, and start trading with collectors worldwide.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => navigate("/signup")}>
            Create Account to Continue
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          avatarPreview: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSourceToggle = (source: AccountSource) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleNextStep = async () => {
    // Validate step 1
    if (currentStep === 1) {
      if (!formData.firstName.trim()) {
        toast.error("First Name is required");
        return;
      }
      if (!formData.lastName.trim()) {
        toast.error("Last Name is required");
        return;
      }
      if (!formData.street.trim()) {
        toast.error("Street Address is required");
        return;
      }
      if (!formData.town.trim()) {
        toast.error("Town/City is required");
        return;
      }
      if (!formData.zipCode.trim()) {
        toast.error("Zip Code is required");
        return;
      }
      if (!formData.state.trim()) {
        toast.error("State is required");
        return;
      }
      if (!formData.country.trim()) {
        toast.error("Country is required");
        return;
      }
      if (!formData.phoneNumber.trim()) {
        toast.error("Phone Number is required");
        return;
      }
      if (!formData.email.trim()) {
        toast.error("A recovery email is required");
        return;
      }
      if (!isEmailVerified) {
        toast.error("Please verify your email address before continuing");
        return;
      }
      if (!isPhoneVerified) {
        toast.error("Please verify your phone number before continuing");
        return;
      }
      if (!acceptedTerms) {
        toast.error("You must accept the Terms & Conditions and Privacy Policy");
        return;
      }
      // All first-step requirements are satisfied — continue to optional sources.
      // Account creation happens only on final submit (step 4)
      setCurrentStep(2);
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  /** Ask Twilio to text a 6-digit code to the entered number. */
  const handleSendPhoneCode = async () => {
    if (!formData.phoneNumber.trim()) {
      toast.error("Please enter your phone number first");
      return;
    }
    try {
      const result = await sendPhoneCodeMutation.mutateAsync({ phone: formData.phoneNumber });
      setShowVerification(true);
      setVerificationCode("");
      toast.success(`Verification code sent to ${result.sentTo}`);
    } catch (err: any) {
      toast.error(err.message || "Could not send the verification code");
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }
    if (verificationCode.length < 4) {
      toast.error("Invalid verification code");
      return;
    }
    try {
      // Check the code with Twilio Verify and persist the authenticated member's proof.
      await verifyPhoneCodeMutation.mutateAsync({
        phone: formData.phoneNumber,
        code: verificationCode,
      });
      setIsPhoneVerified(true);
      setShowVerification(false);
      setVerificationCode("");
      await utils.market.dashboard.invalidate();
      toast.success("Phone number verified!");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }
  };

  const handleResendCode = () => handleSendPhoneCode();

  const handleSendEmailCode = async () => {
    try {
      await sendEmailCodeMutation.mutateAsync({});
      setShowEmailVerification(true);
      setEmailVerificationCode("");
      toast.success("Verification code sent to your Tradebilia email address.");
    } catch (err: any) {
      toast.error(err.message || "Could not send the verification email");
    }
  };

  const handleVerifyEmail = async () => {
    if (emailVerificationCode.length < 4) {
      toast.error("Please enter the verification code from your email");
      return;
    }
    try {
      await verifyEmailCodeMutation.mutateAsync({ code: emailVerificationCode });
      setIsEmailVerified(true);
      setShowEmailVerification(false);
      setEmailVerificationCode("");
      await utils.market.dashboard.invalidate();
      toast.success("Email address verified!");
    } catch (err: any) {
      toast.error(err.message || "Email verification failed");
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentStep !== 4) {
      return;
    }

    if (!isPhoneVerified || !isEmailVerified || !acceptedTerms) {
      toast.error("Complete email verification, phone verification, and terms acceptance before finishing setup.");
      return;
    }
    if (formData.isMerchant && (!formData.storeName || !formData.businessLicense || !formData.taxId || !formData.businessAddress || !formData.businessPhone || !formData.businessEmail)) {
      toast.error("Complete the required merchant verification-request fields before finishing setup.");
      return;
    }

    const fullName = `${formData.firstName} ${formData.lastName}`;
    
    // Convert avatar file to base64 if present
    let avatarData = null;
    if (avatarFile) {
      avatarData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const result = event.target?.result as string;
            const base64String = result.split(',')[1];
            const data = {
              name: avatarFile.name,
              type: avatarFile.type,
              contentBase64: base64String,
            };
            resolve(data);
          } catch (error) {
          reject(error);
          }
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(avatarFile);
      });
    }

    await saveExternalPaymentMethodsMutation.mutateAsync({
      paypalEmail: externalPaymentForm.paypalEmail.trim() || null,
      venmoUsername: externalPaymentForm.venmoUsername.trim() || null,
      cashAppCashtag: externalPaymentForm.cashAppCashtag.trim() || null,
      zelleEmail: externalPaymentForm.zelleEmail.trim() || null,
      zellePhone: externalPaymentForm.zellePhone.trim() || null,
    });

    await saveProfileMutation.mutateAsync({
      displayName: formData.userName || (user as any)?.username || user?.name || "New Collector",
      bio: formData.bio,
      acceptedTerms: true,
      contactFullName: fullName,
      contactEmail: formData.email,
      contactPhone: formData.phoneNumber,
      contactAddress: formData.street,
      contactTown: formData.town,
      contactState: formData.state,
      contactZipCode: formData.zipCode,
      contactCountry: formData.country,
      firstName: formData.firstName,
      lastName: formData.lastName,
      preferredCategories: preferredCategories.length > 0 ? (preferredCategories as any) : undefined,
      avatar: avatarData as any,
      // Submitted as a request; verified status remains administrator controlled.
      isMerchant: formData.isMerchant,
      storeName: formData.isMerchant ? (formData.storeName || undefined) : undefined,
      businessLicense: formData.isMerchant ? (formData.businessLicense || undefined) : undefined,
      taxId: formData.isMerchant ? (formData.taxId || undefined) : undefined,
      storeDescription: formData.isMerchant ? (formData.storeDescription || undefined) : undefined,
      businessAddress: formData.isMerchant ? (formData.businessAddress || undefined) : undefined,
      businessPhone: formData.isMerchant ? (formData.businessPhone || undefined) : undefined,
      businessEmail: formData.isMerchant ? (formData.businessEmail || undefined) : undefined,
      businessWebsite: formData.isMerchant ? (formData.businessWebsite || undefined) : undefined,
      // Notification preferences
      notificationPreferences: notificationPreferences,
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <TopBar
        logoUrl={TRADEBILIA_LOGO_URL}
        hideSearch
      />

      {/* Hero Section */}
      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(https://assets.tradebilia.com/Background_23084d14.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-4xl items-center justify-center">
            <img
              src="https://assets.tradebilia.com/AccountSetup_bc728b8f.webp"
              alt="Account Setup"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <>
              {/* Welcome Heading */}
              <div className="text-center">
                <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">Welcome to Tradebilia</h1>
                <p className="mt-4 text-lg text-slate-600">Let's set up your account in just a few steps</p>

                <div className="mt-6 flex justify-center gap-2" aria-label={`Account setup step ${currentStep} of 4`}>
                  {[1, 2, 3, 4].map(step => (
                    <span
                      key={step}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        currentStep === step ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      Step {step}
                    </span>
                  ))}
                </div>
              </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Step 1 of 4: Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userName">User Name</Label>
                    <Input
                      id="userName"
                      name="userName"
                      value={formData.userName}
                      readOnly
                      className="rounded-lg border-slate-200 bg-slate-50 text-slate-600"
                    />
                    <p className="text-xs text-slate-600">Your account was created on the previous step.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="First name"
                        required
                        className="rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Last name"
                        required
                        className="rounded-lg border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="Street address"
                      required
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="town">Town/City *</Label>
                    <Input
                      id="town"
                      name="town"
                      value={formData.town}
                      onChange={handleInputChange}
                      placeholder="Town or city"
                      required
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">Zip Code *</Label>
                      <Input
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="Zip code"
                        required
                        className="rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="State"
                        required
                        className="rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="Country"
                        required
                        className="rounded-lg border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        readOnly
                        required
                        className="flex-1 rounded-lg border-slate-200 bg-slate-50"
                      />
                      {isEmailVerified ? (
                        <div className="flex items-center gap-1.5 px-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium whitespace-nowrap">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleSendEmailCode}
                          disabled={sendEmailCodeMutation.isPending || !formData.email.trim()}
                          className="whitespace-nowrap"
                        >
                          {sendEmailCodeMutation.isPending ? "Sending..." : showEmailVerification ? "Resend Code" : "Email Code"}
                        </Button>
                      )}
                    </div>
                    {showEmailVerification && !isEmailVerified && (
                      <div className="flex gap-2 pt-1">
                        <Input
                          id="emailVerificationCode"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={emailVerificationCode}
                          onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter the 6-digit email code"
                          className="flex-1 rounded-lg border-slate-200 tracking-widest"
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyEmail}
                          disabled={verifyEmailCodeMutation.isPending || emailVerificationCode.length < 4}
                          className="whitespace-nowrap"
                        >
                          {verifyEmailCodeMutation.isPending ? "Verifying..." : "Verify"}
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-slate-600">
                      {isEmailVerified
                        ? "This account email is verified and can be used for password recovery."
                        : "Verify this account email before continuing. It will be used for password recovery."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={e => {
                          handleInputChange(e);
                          // Changing the number invalidates any prior verification
                          if (isPhoneVerified || showVerification) {
                            setIsPhoneVerified(false);
                            setShowVerification(false);
                            setVerificationCode("");
                          }
                        }}
                        placeholder="Your phone number (required for verification)"
                        required
                        disabled={isPhoneVerified}
                        className="rounded-lg border-slate-200 flex-1"
                      />
                      {isPhoneVerified ? (
                        <div className="flex items-center gap-1.5 px-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium whitespace-nowrap">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleSendPhoneCode}
                          disabled={sendPhoneCodeMutation.isPending || !formData.phoneNumber.trim()}
                          className="whitespace-nowrap"
                        >
                          {sendPhoneCodeMutation.isPending
                            ? "Sending..."
                            : showVerification
                              ? "Resend Code"
                              : "Push to receive Code"}
                        </Button>
                      )}
                    </div>

                    {/* Code entry — appears once a code has been sent */}
                    {showVerification && !isPhoneVerified && (
                      <div className="space-y-2 pt-1">
                        <Label htmlFor="phoneVerificationCode">Verification Code *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="phoneVerificationCode"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={verificationCode}
                            onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter the 6-digit code"
                            className="rounded-lg border-slate-200 flex-1 tracking-widest"
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyPhone}
                            disabled={verifyPhoneCodeMutation.isPending || verificationCode.length < 4}
                            className="whitespace-nowrap"
                          >
                            {verifyPhoneCodeMutation.isPending ? "Verifying..." : "Verify"}
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-600">
                      {isPhoneVerified
                        ? "This phone number has been verified."
                        : showVerification
                          ? "Enter the code we texted you, then press Verify. Codes expire after 10 minutes."
                          : "We'll text a verification code to this number. You must verify it to continue."}
                    </p>
                  </div>

                  {/* Merchant Checkbox */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isMerchant}
                        onChange={handleMerchantToggle}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-900">
                        I'm a Store Owner or Professional Merchant
                      </span>
                      <span className="ml-auto inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">Verification Request</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-2 ml-7">
                      Submit your business information for administrator review. A verified badge appears only after approval.
                    </p>
                  </div>

                  {/* Conditional Merchant Fields */}
                  {showMerchantFields && (
                    <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                      <h3 className="font-semibold text-slate-900">Store Information</h3>
                      <div className="space-y-2">
                        <Label htmlFor="storeName">Store Name *</Label>
                        <Input
                          id="storeName"
                          name="storeName"
                          value={formData.storeName}
                          onChange={handleInputChange}
                          placeholder="Your store name"
                          className="rounded-lg border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessLicense">Business License Number *</Label>
                        <Input
                          id="businessLicense"
                          name="businessLicense"
                          value={formData.businessLicense}
                          onChange={handleInputChange}
                          placeholder="Your business license number"
                          className="rounded-lg border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxId">Tax ID / EIN *</Label>
                        <Input
                          id="taxId"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleInputChange}
                          placeholder="Your tax ID or EIN"
                          className="rounded-lg border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessAddress">Business Address *</Label>
                        <Input
                          id="businessAddress"
                          name="businessAddress"
                          value={formData.businessAddress}
                          onChange={handleInputChange}
                          placeholder="Your business address"
                          className="rounded-lg border-slate-200"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="businessPhone">Business Phone *</Label>
                          <Input
                            id="businessPhone"
                            name="businessPhone"
                            type="tel"
                            value={formData.businessPhone}
                            onChange={handleInputChange}
                            placeholder="Business phone number"
                            className="rounded-lg border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="businessEmail">Business Email *</Label>
                          <Input
                            id="businessEmail"
                            name="businessEmail"
                            type="email"
                            value={formData.businessEmail}
                            onChange={handleInputChange}
                            placeholder="Business email"
                            className="rounded-lg border-slate-200"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessWebsite">Business Website</Label>
                        <Input
                          id="businessWebsite"
                          name="businessWebsite"
                          type="url"
                          value={formData.businessWebsite}
                          onChange={handleInputChange}
                          placeholder="https://yourstore.com"
                          className="rounded-lg border-slate-200"
                        />
                      </div>

                    </div>
                  )}

                  {/* Terms & Conditions - Bottom of Step 1 */}
                  <div className="border-t border-slate-200 pt-4 mt-4 space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="h-4 w-4 mt-1"
                      />
                      <span className="text-sm text-slate-700">
                        I agree to the <Link href="/terms" className="text-blue-600 hover:underline font-medium">Terms & Conditions</Link> and <Link href="/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link> *
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Import from Other Accounts */}
            {currentStep === 2 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Import Account Information</CardTitle>
                  <CardDescription>
                    Step 2 of 4: Optionally import your information from other accounts to build your Tradebilia profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Choose any services you may want to connect later. You can finish your profile now and add a supported connection from Profile settings when it is available.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-900 font-medium">Connections are optional</p>
                      <p className="text-xs text-blue-800 mt-1">
                        Selecting a service here does not connect an account yet. Tradebilia never asks for the service password; supported connections are authorized separately from your Profile settings.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {accountSources.map((source) => (
                      <label
                        key={source.value}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 cursor-pointer hover:bg-slate-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSources.includes(source.value)}
                          onChange={() => handleSourceToggle(source.value)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm font-medium">{source.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-4">
                    You can skip this step and add accounts later from your account settings.
                  </p>

                  <div className="border-t border-slate-200 pt-6 mt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">Direct Cash Payment Methods <span className="text-slate-400 font-normal">(optional)</span></h3>
                      <p className="mt-1 text-sm text-slate-600">Add destinations you are comfortable using for a cash adjustment in a trade. They remain private and are shared only with an accepted cash-trade partner.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1"><Label htmlFor="setup-paypal">PayPal email</Label><Input id="setup-paypal" type="email" placeholder="you@example.com" value={externalPaymentForm.paypalEmail} onChange={(event) => setExternalPaymentForm((current) => ({ ...current, paypalEmail: event.target.value }))} /></div>
                      <div className="space-y-1"><Label htmlFor="setup-venmo">Venmo username</Label><Input id="setup-venmo" placeholder="username or @username" value={externalPaymentForm.venmoUsername} onChange={(event) => setExternalPaymentForm((current) => ({ ...current, venmoUsername: event.target.value }))} /></div>
                      <div className="space-y-1"><Label htmlFor="setup-cashapp">Cash App $cashtag</Label><Input id="setup-cashapp" placeholder="$yourcashtag" value={externalPaymentForm.cashAppCashtag} onChange={(event) => setExternalPaymentForm((current) => ({ ...current, cashAppCashtag: event.target.value }))} /></div>
                      <div className="space-y-1"><Label htmlFor="setup-zelle-email">Zelle email</Label><Input id="setup-zelle-email" type="email" placeholder="Use email or mobile below" value={externalPaymentForm.zelleEmail} onChange={(event) => setExternalPaymentForm((current) => ({ ...current, zelleEmail: event.target.value, zellePhone: event.target.value ? "" : current.zellePhone }))} /></div>
                      <div className="space-y-1"><Label htmlFor="setup-zelle-phone">Zelle U.S. mobile</Label><Input id="setup-zelle-phone" inputMode="tel" placeholder="Use email or mobile above" value={externalPaymentForm.zellePhone} onChange={(event) => setExternalPaymentForm((current) => ({ ...current, zellePhone: event.target.value, zelleEmail: event.target.value ? "" : current.zelleEmail }))} /></div>
                    </div>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950"><strong>Important:</strong> Tradebilia does not process, hold, insure, refund, or guarantee direct payments. Choose a method for each accepted cash trade before it is shared.</p>
                  </div>

                  {/* Verified recovery methods */}
                  <div className="border-t border-slate-200 pt-6 mt-6">
                    <h3 className="font-semibold text-slate-900 mb-2">Account Recovery</h3>
                    <p className="text-sm text-slate-600 leading-6">
                      Tradebilia uses your verified account email and verified phone number for account recovery. We no longer use security questions because personal-answer recovery is easier to guess or discover.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Avatar & Profile Customization */}
            {currentStep === 3 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Profile Picture & Preferences</CardTitle>
                  <CardDescription>Step 3 of 4: Customize your profile and set your preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900">Profile Picture</h3>
                    <div className="flex flex-col items-center gap-4">
                      <label className="flex flex-col items-center gap-4 cursor-pointer">
                        <div
                          className="h-32 w-32 rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              setAvatarFile(file);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  avatarPreview: event.target?.result as string,
                                }));
                              };
                              reader.readAsDataURL(file);
                            } else {
                              toast.error('Please drop an image file');
                            }
                          }}
                        >
                          {formData.avatarPreview ? (
                            <img
                              src={formData.avatarPreview}
                              alt="Avatar preview"
                              className="h-32 w-32 rounded-full bg-slate-100 object-contain"
                            />
                          ) : (
                            <span className="text-4xl">👤</span>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <Button type="button" variant="outline" className="rounded-lg" asChild>
                          <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Photo
                        </span>
                        </Button>
                      </label>
                      <p className="text-xs text-slate-600 text-center">
                        Drag and drop or click to upload. JPG, PNG or GIF. Max 5MB.
                      </p>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div className="space-y-2 border-t border-slate-200 pt-4">
                    <Label htmlFor="bio">About You (Bio)</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell other collectors about yourself (max 500 characters)"
                      maxLength={500}
                      className="rounded-lg border-slate-200"
                      rows={4}
                    />
                    <p className="text-xs text-slate-600">{formData.bio.length}/500 characters</p>
                  </div>

                  {/* Preferred Categories */}
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <Label>Preferred Collecting Categories</Label>
                    <p className="text-xs text-slate-600">Select the categories you're most interested in</p>
                    <div className="grid grid-cols-2 gap-2">
                      {["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins"].map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferredCategories.includes(cat as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPreferredCategories([...preferredCategories, cat as any]);
                              } else {
                                setPreferredCategories(preferredCategories.filter((c) => c !== cat));
                              }
                            }}
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-sm text-slate-700 capitalize">{cat.replace("_", " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>


                </CardContent>
              </Card>
            )}

            {/* Step 4: Review & Confirm */}
            {currentStep === 4 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Review Your Information</CardTitle>
                  <CardDescription>Step 4 of 4: Please review your account details before completing setup</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Information Summary */}
                  <div className="space-y-3 border-b border-slate-200 pb-4">
                    <h3 className="font-semibold text-slate-900">Account Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Username</p>
                        <p className="font-medium text-slate-900">{formData.userName}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Full Name</p>
                        <p className="font-medium text-slate-900">{formData.firstName} {formData.lastName}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Email</p>
                        <p className="font-medium text-slate-900">{formData.email}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Phone</p>
                        <p className="font-medium text-slate-900">{formData.phoneNumber}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-600">Address</p>
                        <p className="font-medium text-slate-900">{formData.street}, {formData.zipCode} {formData.state}, {formData.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Merchant Information */}
                  {formData.isMerchant && (
                    <div className="space-y-3 border-b border-slate-200 pb-4">
                      <h3 className="font-semibold text-slate-900">Merchant Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Store Name</p>
                          <p className="font-medium text-slate-900">{formData.storeName}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Tax ID</p>
                          <p className="font-medium text-slate-900">{formData.taxId}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-600">Business Email</p>
                          <p className="font-medium text-slate-900">{formData.businessEmail}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Profile Preferences */}
                  <div className="space-y-3 border-b border-slate-200 pb-4">
                    <h3 className="font-semibold text-slate-900">Profile Preferences</h3>
                    <div className="space-y-2 text-sm">
                      {formData.bio && (
                        <div>
                          <p className="text-slate-600">Bio</p>
                          <p className="font-medium text-slate-900">{formData.bio}</p>
                        </div>
                      )}
                      {preferredCategories.length > 0 && (
                        <div>
                          <p className="text-slate-600">Preferred Categories</p>
                          <p className="font-medium text-slate-900">{preferredCategories.map((c) => c.replace("_", " ")).join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900">Verification Status</p>
                    <p className="text-xs text-blue-800">Email verified: {isEmailVerified ? "Yes" : "No"}</p>
                    <p className="text-xs text-blue-800">Phone verified: {isPhoneVerified ? "Yes" : "No"}</p>
                    <p className="text-xs text-blue-800">Terms accepted: {acceptedTerms ? "Yes" : "No"}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  className="flex-1 rounded-lg"
                >
                  Previous
                </Button>
              )}
              {currentStep === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipStep}
                  className="flex-1 rounded-lg"
                >
                  Skip
                </Button>
              )}
              {currentStep < 4 && (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {currentStep === 4 && (
                <Button
                  type="submit"
                  disabled={saveProfileMutation.isPending}
                  className="flex-1 rounded-lg bg-green-600 hover:bg-green-700"
                >
                  {saveProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing Setup...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              )}
            </div>
          </form>

          </>
        </div>
      </main>
    </div>
  );
}
