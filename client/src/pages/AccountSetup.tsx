import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { trpc } from "@/lib/trpc";
import { ChevronRight, Loader2, Upload } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";

type AccountSource = "ebay" | "paypal" | "facebook";

const accountSources: { value: AccountSource; label: string; icon: string }[] = [
  { value: "ebay", label: "eBay", icon: "🏪" },
  { value: "paypal", label: "PayPal", icon: "💳" },
  { value: "facebook", label: "Facebook", icon: "f" },
];

export default function AccountSetup() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [currentStep, setCurrentStep] = useState(1);
  const [showDevNav, setShowDevNav] = useState(true); // Development navigation
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    firstName: "",
    lastName: "",
    street: "",
    zipCode: "",
    state: "",
    country: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
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
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [bioText, setBioText] = useState("");
  const [notificationPreferences, setNotificationPreferences] = useState({
    tradeRequests: true,
    messages: true,
    feedback: true,
    systemUpdates: true,
  });

  const handleMerchantToggle = () => {
    setShowMerchantFields(!showMerchantFields);
    setFormData((prev) => ({
      ...prev,
      isMerchant: !prev.isMerchant,
    }));
  };

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const signupMutation = trpc.auth.signup.useMutation();

  const saveProfileMutation = trpc.market.saveProfile.useMutation({
    onSuccess: async () => {
      await utils.market.dashboard.invalidate();
      toast.success("Account setup completed!");
      navigate("/welcome?new=true");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (dashboardQuery.data?.profile) {
      const profile = dashboardQuery.data.profile;
      const fullName = profile.contactFullName || user?.name || "";
      const [first, last] = fullName.split(" ");
      setFormData((prev) => ({
        ...prev,
        userName: profile.displayName || user?.name || "",
        firstName: first || "",
        lastName: last || "",
        street: profile.contactAddress || "",
        zipCode: "",
        state: "",
        country: "",
        email: user?.email || "",
        phoneNumber: profile.contactPhone || "",
        bio: profile.bio || "",
      }));
    }
  }, [dashboardQuery.data?.profile, user?.name, user?.email]);

  // Check if this is a new signup (from SignUp page)
  const isNewSignup = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === 'true';
  const showAccountCreation = isNewSignup && !isAuthenticated;

  if (!isAuthenticated && !showAccountCreation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to set up your Tradebilia account.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Create your profile, add your collection, and start trading with collectors worldwide.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  if (!showAccountCreation && dashboardQuery.isLoading) {
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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userName.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
      toast.error("Username and password are required");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await signupMutation.mutateAsync({
        username: formData.userName,
        password: formData.password,
        displayName: formData.userName,
        email: formData.email || undefined,
      });
      await utils.auth.me.invalidate();
      setCurrentStep(1);
    } catch (err: any) {
      toast.error(err.message || "Account creation failed");
    }
  };

  const handleNextStep = () => {
    // Validate step 1
    if (currentStep === 1) {
      if (!formData.userName.trim()) {
        toast.error("User Name is required");
        return;
      }
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
      if (!formData.password.trim()) {
        toast.error("Password is required");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (formData.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (!formData.phoneNumber.trim()) {
        toast.error("Phone Number is required");
        return;
      }
      if (!acceptedTerms) {
        toast.error("You must accept the Terms & Conditions and Privacy Policy");
        return;
      }
      // Show verification screen instead of moving to next step
      setShowVerification(true);
      toast.success("Verification code sent to your phone");
      return;
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleVerifyPhone = () => {
    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }
    // Simulate verification (in production, this would validate against backend)
    if (verificationCode.length >= 4) {
      setIsPhoneVerified(true);
      setShowVerification(false);
      setVerificationCode("");
      toast.success("Phone number verified!");
      setCurrentStep(2);
    } else {
      toast.error("Invalid verification code");
    }
  };

  const handleResendCode = () => {
    toast.success("Verification code resent to your phone");
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fullAddress = `${formData.street}, ${formData.zipCode}, ${formData.state}, ${formData.country}`;
    const fullName = `${formData.firstName} ${formData.lastName}`;
    saveProfileMutation.mutate({
      displayName: formData.userName,
      bio: formData.bio,
      contactFullName: fullName,
      contactEmail: formData.email,
      contactPhone: formData.phoneNumber,
      contactAddress: fullAddress,
      avatar: null,
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <header className="border-b border-black/10 bg-[#161616] text-white">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 lg:px-8">
          <Link href="/" className="font-['Oswald'] text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-white">
            HOME
          </Link>
          <TopRightIcons className="ml-auto flex items-center gap-3 md:gap-4" iconColor="text-white" />
        </div>
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
              src="/manus-storage/AccountSetup_ffa83564.svg"
              alt="Tradebilia Logo"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* Development Navigation */}
      {showDevNav && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentStep(1)}
                variant={currentStep === 1 ? "default" : "outline"}
                size="sm"
              >
                Step 1
              </Button>
              <Button
                onClick={() => setCurrentStep(2)}
                variant={currentStep === 2 ? "default" : "outline"}
                size="sm"
              >
                Step 2
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                variant={currentStep === 3 ? "default" : "outline"}
                size="sm"
              >
                Step 3
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                variant={currentStep === 4 ? "default" : "outline"}
                size="sm"
              >
                Step 4
              </Button>
            </div>
            <button
              onClick={() => setShowDevNav(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Hide Dev Nav
            </button>
          </div>
        </div>
      )}

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Account Creation Form (for new signups) */}
          {showAccountCreation ? (
            <form onSubmit={handleCreateAccount} className="space-y-6">
              <div className="text-center">
                <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">Create Your Account</h1>
                <p className="mt-4 text-lg text-slate-600">Step 1 of 5: Create your login credentials</p>
              </div>

              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Account Credentials</CardTitle>
                  <CardDescription>Choose your username and password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username *</Label>
                    <Input
                      id="signup-username"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      placeholder="Choose a username (3-32 characters)"
                      required
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email (optional)</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Create a strong password (min 8 characters)"
                      required
                      className="rounded-lg border-slate-200"
                    />
                    <p className="text-xs text-slate-600">Must include uppercase, lowercase, and numbers</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password *</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm your password"
                      required
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full rounded-full py-3 text-lg font-semibold"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? "Creating Account..." : "Create Account & Continue"}
              </Button>
            </form>
          ) : (
            <>
              {/* Welcome Heading */}
              <div className="text-center">
                <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">Welcome to Tradebilia</h1>
                <p className="mt-4 text-lg text-slate-600">Let's set up your account in just a few steps</p>
              </div>

              {/* Progress Indicator */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-2 w-8 rounded-full transition ${
                      step <= currentStep ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  />
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Step 2 of 5: Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userName">User Name *</Label>
                    <Input
                      id="userName"
                      name="userName"
                      value={formData.userName}
                      onChange={handleInputChange}
                      placeholder="Your unique username"
                      required
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a strong password (min 8 characters)"
                      required
                      className="rounded-lg border-slate-200"
                    />
                    <p className="text-xs text-slate-600">Must be at least 8 characters long.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      required
                      className="rounded-lg border-slate-200"
                    />
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
                  <div className="grid grid-cols-3 gap-3">
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
                    <Label>Email Address</Label>
                    <Input
                      disabled
                      value={formData.email}
                      placeholder="Your email"
                      className="rounded-lg border-slate-200 bg-slate-100"
                    />
                    <p className="text-xs text-slate-600">Your email is verified and cannot be changed during setup.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Your phone number (required for verification)"
                      required
                      className="rounded-lg border-slate-200"
                    />
                    <p className="text-xs text-slate-600">We'll send a verification code to this number.</p>
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
                      <span className="ml-auto inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">Verified Merchant</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-2 ml-7">
                      Merchants get a special designation to build trust with collectors.
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
                        I agree to the <a href="#" className="text-blue-600 hover:underline font-medium">Terms & Conditions</a> and <a href="#" className="text-blue-600 hover:underline font-medium">Privacy Policy</a> *
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
                    Step 3 of 5: Optionally import your information from other accounts to build your Tradebilia profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Select any accounts you'd like to connect. This helps us verify your trading history and build trust in the community.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-900 font-medium">🔒 Your credentials are secure</p>
                      <p className="text-xs text-blue-800 mt-1">
                        You'll be redirected directly to each site to authorize the connection. We never store your login credentials. We only import your feedback ratings and trading history to build trust on Tradebilia.
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
                </CardContent>
              </Card>
            )}

            {/* Step 3: Avatar & Profile Customization */}
            {currentStep === 3 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Profile Picture & Preferences</CardTitle>
                  <CardDescription>Step 4 of 5: Customize your profile and set your preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900">Profile Picture</h3>
                    <div className="flex flex-col items-center gap-4">
                      {formData.avatarPreview ? (
                        <img
                          src={formData.avatarPreview}
                          alt="Avatar preview"
                          className="h-32 w-32 rounded-full border-4 border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="h-32 w-32 rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                          <span className="text-4xl">👤</span>
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" className="rounded-lg">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Photo
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-slate-600 text-center">
                        JPG, PNG or GIF. Max 5MB.
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
                  <CardDescription>Step 5 of 5: Please review your account details before completing setup</CardDescription>
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

          {/* Email Verification Modal */}
          {showEmailVerification && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md rounded-[1.5rem] border-slate-200 bg-white shadow-lg">
                <CardHeader>
                  <CardTitle>Verify Your Email Address</CardTitle>
                  <CardDescription>
                    We've sent a verification code to {formData.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailVerificationCode">Verification Code</Label>
                    <Input
                      id="emailVerificationCode"
                      type="text"
                      value={emailVerificationCode}
                      onChange={(e) => setEmailVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="rounded-lg border-slate-200 text-center text-2xl tracking-widest"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-slate-600 text-center">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={() => toast.success("Verification code resent to your email")}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Resend
                    </button>
                  </p>
                </CardContent>
                <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEmailVerification(false)}
                    className="flex-1 rounded-lg"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!emailVerificationCode.trim()) {
                        toast.error("Please enter the verification code");
                        return;
                      }
                      if (emailVerificationCode.length >= 4) {
                        setIsEmailVerified(true);
                        setShowEmailVerification(false);
                        setEmailVerificationCode("");
                        toast.success("Email verified!");
                      } else {
                        toast.error("Invalid verification code");
                      }
                    }}
                    className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
                  >
                    Verify
                  </Button>
                </div>
              </Card>
            </div>
          )}

              {/* Phone Verification Modal */}
              {showVerification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-md rounded-[1.5rem] border-slate-200 bg-white shadow-lg">
                <CardHeader>
                  <CardTitle>Verify Your Phone Number</CardTitle>
                  <CardDescription>
                    We've sent a verification code to {formData.phoneNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Verification Code</Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="rounded-lg border-slate-200 text-center text-2xl tracking-widest"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-slate-600 text-center">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Resend
                    </button>
                  </p>
                </CardContent>
                <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowVerification(false)}
                    className="flex-1 rounded-lg"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleVerifyPhone}
                    className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
                  >
                    Verify
                  </Button>
                </div>
              </Card>
            </div>
          )}
          </>
          )}
        </div>
      </main>
    </div>
  );
}
