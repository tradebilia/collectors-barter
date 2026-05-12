import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { trpc } from "@/lib/trpc";
import { ChevronRight, Loader2, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";

type AccountSource = "ebay" | "paypal" | "facebook" | "google" | "amazon";

const accountSources: { value: AccountSource; label: string; icon: string }[] = [
  { value: "ebay", label: "eBay", icon: "🏪" },
  { value: "paypal", label: "PayPal", icon: "💳" },
  { value: "facebook", label: "Facebook", icon: "f" },
  { value: "google", label: "Google", icon: "G" },
  { value: "amazon", label: "Amazon", icon: "🛒" },
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
    zipCode: "",
    state: "",
    country: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    bio: "",
    avatarPreview: "",
  });
  const [selectedSources, setSelectedSources] = useState<AccountSource[]>([]);

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const saveProfileMutation = trpc.market.saveProfile.useMutation({
    onSuccess: async () => {
      await utils.market.dashboard.invalidate();
      toast.success("Account setup completed!");
      navigate("/inventory");
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

  if (!isAuthenticated) {
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
          <div className="ml-auto flex items-center gap-3 text-sm font-semibold">
            <span>Account Setup</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] py-16 text-white">
        <div className="container relative flex flex-col items-center justify-center text-center">
          <img src="/manus-storage/AccountSettings_bcd6f853.svg" alt="Tradebilia Logo" className="h-96 w-96" />
        </div>
      </section>

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Welcome Heading */}
          <div className="text-center">
            <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">Welcome to Tradebilia</h1>
            <p className="mt-4 text-lg text-slate-600">Let's set up your account in just a few steps</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((step) => (
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
                  <CardDescription>Tell us about yourself</CardDescription>
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
                </CardContent>
              </Card>
            )}

            {/* Step 2: Import from Other Accounts */}
            {currentStep === 2 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Import Account Information</CardTitle>
                  <CardDescription>
                    Optionally import your information from other accounts to build your Tradebilia profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Select any accounts you'd like to connect. This helps us verify your trading history and build trust in the community.
                  </p>
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
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Add a profile picture to complete your setup</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
              {currentStep < 3 && (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {currentStep === 3 && (
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
        </div>
      </main>
    </div>
  );
}
