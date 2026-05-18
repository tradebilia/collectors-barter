import { ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { MemberOnly } from "@/pages/MemberOnly";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return fallback || <MemberOnly />;
  }

  return <>{children}</>;
}
