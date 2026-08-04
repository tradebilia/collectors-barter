import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="surface-card ornament-border w-full max-w-2xl overflow-hidden bg-card/90">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Compass className="h-7 w-7" />
          </div>
          <CardTitle className="text-4xl">Page not found</CardTitle>
          <CardDescription className="mx-auto max-w-xl text-base leading-7 text-muted-foreground">
            The page you requested is not part of the current collector trading journey. Return to Tradebilia to continue browsing listings, reviewing Trade Proposals, and managing your Watchlist.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Link href="/">
            <Button className="rounded-full px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to the platform
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
