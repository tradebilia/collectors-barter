import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Lock } from "lucide-react";

export function MemberOnly() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center px-4">
      <Card className="max-w-md w-full bg-white p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-blue-100 p-4 rounded-full">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Member Only</h1>
        <p className="text-gray-600 mb-6">
          You need to be a member to access this page. Sign up or sign in to continue.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/signup")}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Create an Account
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full"
          >
            Back to Home
          </Button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Already have an account? Click the Sign In button in the top right.
        </p>
      </Card>
    </div>
  );
}
