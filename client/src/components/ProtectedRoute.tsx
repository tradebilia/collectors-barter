import { ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    // Redirect to home page if not authenticated
    setLocation("/");
    return null;
  }

  return <>{children}</>;
}
