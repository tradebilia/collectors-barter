import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";

export default function SignUp() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    displayName: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const signupMutation = trpc.auth.signup.useMutation();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, underscores, and hyphens";
    }

    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must include uppercase, lowercase, and numbers";
    }

    if (formData.displayName.length < 1) {
      newErrors.displayName = "Display name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await signupMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName,
        email: formData.email,
      });

      // Refresh auth state
      await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
      await queryClient.refetchQueries({ queryKey: ["auth.me"] });

      // Redirect to account setup for new accounts
      navigate("/account-setup?new=true");
    } catch (err: any) {
      setErrors({ submit: err.message || "Sign up failed" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-600 mb-6">Join Tradebilia to start trading</p>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="signup-username" className="block text-sm font-medium mb-1">Username</label>
              <Input
                id="signup-username"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Choose a username"
                disabled={isLoading}
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? "signup-username-error" : undefined}
              />
              {errors.username && (
                <p id="signup-username-error" role="alert" className="text-red-600 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-display-name" className="block text-sm font-medium mb-1">Display Name</label>
              <Input
                id="signup-display-name"
                type="text"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="Your display name"
                disabled={isLoading}
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={errors.displayName ? "signup-display-name-error" : undefined}
              />
              {errors.displayName && (
                <p id="signup-display-name-error" role="alert" className="text-red-600 text-sm mt-1">{errors.displayName}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium mb-1">Email</label>
              <Input
                id="signup-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="your@email.com"
                disabled={isLoading}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "signup-email-error" : undefined}
              />
              {errors.email && (
                <p id="signup-email-error" role="alert" className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium mb-1">Password</label>
              <Input
                id="signup-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Create a strong password"
                disabled={isLoading}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "signup-password-error" : "signup-password-help"}
              />
              {errors.password && (
                <p id="signup-password-error" role="alert" className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
              <p id="signup-password-help" className="text-xs text-gray-500 mt-1">
                At least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            {errors.submit && (
              <p role="alert" className="text-red-600 text-sm">{errors.submit}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/")}
              className="text-blue-600 hover:underline"
            >
              Sign In
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
