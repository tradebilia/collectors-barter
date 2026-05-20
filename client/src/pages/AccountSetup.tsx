import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";

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

export default function AccountSetup() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: "",
    fullName: "",
    location: "",
    phoneNumber: "",
    bio: "",
  });

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
      setFormData({
        displayName: profile.displayName || user?.name || "",
        fullName: profile.contactFullName || user?.name || "",
        location: profile.contactAddress || "",
        phoneNumber: profile.contactPhone || "",
        bio: profile.bio || "",
      });
    }
  }, [dashboardQuery.data?.profile, user?.name]);

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

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveProfileMutation.mutate({
      displayName: formData.displayName,
      bio: formData.bio,
      contactFullName: formData.fullName,
      contactEmail: user?.email || "",
      contactPhone: formData.phoneNumber,
      contactAddress: formData.location,
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
        <nav className="grid border-t border-white/10 bg-white text-center text-sm font-semibold text-slate-950 sm:grid-cols-5 xl:grid-cols-10">
          {categoryLinks.map((category) => (
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

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Welcome to Tradebilia</h1>
            <p className="mt-3 text-lg text-slate-600">Let's set up your account in just a few steps</p>
          </div>

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
            {currentStep === 1 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      placeholder="How other collectors will see you"
                      required
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Your full legal name"
                      required
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, State or Country"
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>How other collectors can reach you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="(Optional) Your phone number"
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      disabled
                      value={user?.email || ""}
                      placeholder="Your email"
                      className="rounded-lg border-slate-200 bg-slate-100"
                    />
                    <p className="text-xs text-slate-600">Your email is verified and cannot be changed during setup.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>About You</CardTitle>
                  <CardDescription>Tell collectors about your collecting interests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Share your collecting story, interests, and what you're looking for..."
                      rows={6}
                      className="rounded-lg border-slate-200"
                    />
                    <p className="text-xs text-slate-600">{formData.bio.length}/500 characters</p>
                  </div>
                </CardContent>
              </Card>
            )}

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
                      Setting up...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
