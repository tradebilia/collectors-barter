import { ReactNode } from "react";
import { LockKeyhole, Search, Tags } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";

export function SubscriptionAccessGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const accessPolicyQuery = trpc.membership.getAccessPolicy.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const isFreeBrowsingRoute = location === "/"
    || location === "/search"
    || location.startsWith("/category/")
    || location === "/contact"
    || ["/signup", "/verify", "/forgot-password", "/reset-password", "/privacy", "/terms", "/member-only"].includes(location);

  if (accessPolicyQuery.isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">Checking membership access…</div>;
  }

  if (accessPolicyQuery.data?.hasSubscriptionAccess || isFreeBrowsingRoute) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="container flex min-h-[70vh] items-center justify-center py-12">
        <Card className="w-full max-w-xl overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-[linear-gradient(135deg,#eef2ff_0%,#f8fafc_52%,#ecfdf5_100%)] px-7 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-sm">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-slate-950">Subscription access required</h1>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              This page is available with Tradebilia Subscription Membership. Free browsing remains available for category pages, Global Search, and Contact Us.
            </p>
          </div>
          <CardHeader>
            <CardTitle className="text-lg">Free browsing remains available</CardTitle>
            <CardDescription>
              Subscription enrollment is not active yet. No payment method, checkout, or charge is available from this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link href="/search" className="flex-1">
              <Button type="button" className="w-full bg-indigo-700 text-white hover:bg-indigo-800"><Search className="mr-2 h-4 w-4" />Explore All</Button>
            </Link>
            <Link href="/category/comics" className="flex-1">
              <Button type="button" variant="outline" className="w-full"><Tags className="mr-2 h-4 w-4" />Browse categories</Button>
            </Link>
            <Link href="/contact" className="flex-1">
              <Button type="button" variant="outline" className="w-full">Contact Us</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
