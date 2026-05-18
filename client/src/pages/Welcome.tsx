import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function Welcome() {
  const [location, navigate] = useLocation();
  const isNewAccount = location.includes("?new=true");

  useEffect(() => {
    // If not a new account signup, redirect to home
    if (!isNewAccount) {
      navigate("/");
    }
  }, [isNewAccount, navigate]);

  if (!isNewAccount) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome to Tradebilia!
        </h1>

        {/* Subheading */}
        <p className="text-slate-600 mb-8">
          Your account has been created successfully. What would you like to do next?
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/inventory")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            Go to My Inventory
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full border-2 border-slate-300 text-slate-700 hover:bg-slate-50 py-3 rounded-lg font-semibold transition-colors"
          >
            Return to Home
          </Button>
        </div>

        {/* Additional Info */}
        <p className="text-sm text-slate-500 mt-6">
          You can update your profile and settings anytime from your account menu.
        </p>
      </div>
    </div>
  );
}
