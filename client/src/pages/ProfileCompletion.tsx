import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ProfileCompletion() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [formData, setFormData] = useState({
    bio: "",
    location: "",
    paymentMethod: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextStep = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      // Call tRPC to update user profile
      // await trpc.user.updateProfile.mutate(formData);
      setStep(4);
      setTimeout(() => setLocation("/inventory"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Step {step} of 3 - Help us get to know you better
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 4 ? (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Profile Complete!</p>
                <p className="text-sm text-gray-600">
                  Your profile has been set up successfully. Redirecting to your inventory...
                </p>
              </div>
            </div>
          ) : (
            <form className="space-y-6">
              {/* Step 1: Bio */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">About You</label>
                    <textarea
                      name="bio"
                      placeholder="Tell us about yourself (optional)"
                      value={formData.bio}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">0/500 characters</p>
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      type="text"
                      name="location"
                      placeholder="City, State/Country"
                      value={formData.location}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500">This helps other collectors find you</p>
                  </div>
                </div>
              )}

              {/* Step 3: Payment Method */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preferred Payment Method</label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a payment method</option>
                      <option value="paypal">PayPal</option>
                      <option value="stripe">Credit Card (Stripe)</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="venmo">Venmo</option>
                    </select>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Saving..." : step === 3 ? "Complete Profile" : "Next"}
                </Button>
              </div>

              <Button
                type="button"
                variant="link"
                onClick={() => setLocation("/inventory")}
                className="w-full"
              >
                Skip for now
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
