import { useState } from "react";
import { AlertTriangle, CheckCircle2, CloudUpload, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";

export function R2MediaMigrationTab() {
  const [confirmed, setConfirmed] = useState(false);
  const status = trpc.r2Media.getMigrationStatus.useQuery();
  const migrate = trpc.r2Media.migrateNextBatch.useMutation({
    onSuccess: (result) => {
      status.refetch();
      setConfirmed(false);
      if (result.failed.length) {
        toast.error(`${result.migrated.length} migrated; ${result.failed.length} need review.`);
      } else {
        toast.success(`${result.migrated.length} public-media item(s) migrated and verified.`);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const pendingTotal = (status.data?.pendingListingPhotos ?? 0) + (status.data?.pendingAvatars ?? 0);

  return (
    <Card className="border-sky-200 bg-sky-50/30">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-sky-100 p-2 text-sky-700"><CloudUpload className="h-5 w-5" /></div>
          <div>
            <CardTitle>Cloudflare R2 Public Media</CardTitle>
            <CardDescription>
              Migrate public listing images and avatars to `media.tradebilia.com` in verified batches of five.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Listing photos pending" value={status.data?.pendingListingPhotos} />
          <Metric label="Avatars pending" value={status.data?.pendingAvatars} />
          <Metric label="Listing photos on R2" value={status.data?.migratedListingPhotos} />
          <Metric label="Avatars on R2" value={status.data?.migratedAvatars} />
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex gap-2 font-semibold"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Migration safeguard</div>
          <p className="mt-1 text-amber-900">Each item is copied to R2, fetched back through the public domain, checksum-verified, and only then receives a database URL update. Legacy files and keys remain in place; private report evidence and static artwork are excluded.</p>
        </div>
        <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
          <Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
          <span>I understand this will migrate up to five public image records in the next batch. It does not delete legacy files.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => migrate.mutate({ confirmation: "MIGRATE_PUBLIC_MEDIA", batchSize: 5 })}
            disabled={!confirmed || pendingTotal === 0 || migrate.isPending}
            className="bg-sky-700 hover:bg-sky-800"
          >
            <CloudUpload className="mr-2 h-4 w-4" />
            {migrate.isPending ? "Migrating and verifying…" : pendingTotal ? "Migrate next batch of up to 5" : "Migration complete"}
          </Button>
          <Button variant="outline" onClick={() => status.refetch()} disabled={status.isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh status
          </Button>
          {pendingTotal === 0 && status.data && <span className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> All detected public media is on R2.</span>}
        </div>
        <p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" /> The control is administrator-only. It cannot access private report evidence or modify existing static asset URLs.</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return <div className="rounded-lg border bg-background p-3"><div className="text-2xl font-semibold">{value ?? "—"}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>;
}
