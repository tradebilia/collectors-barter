import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Cloud, Database, HardDrive, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function HealthStatus({ healthy, children }: { healthy: boolean; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${healthy ? "text-emerald-700" : "text-rose-700"}`}>{healthy ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{children}</span>;
}

export function R2StorageHealthTab() {
  const healthQuery = trpc.r2Media.getStorageHealth.useQuery(undefined, { refetchOnWindowFocus: false });
  const health = healthQuery.data;
  const publicMediaHealthy = health ? health.publicMedia.bucket.reachable && health.publicMedia.listingPhotos.legacyManaged === 0 && health.publicMedia.avatars.legacyManaged === 0 : false;
  const staticHealthy = health ? health.staticAssets.bucket.reachable && health.staticAssets.sentinelChecksPassed === health.staticAssets.sentinelChecksTotal : false;

  return (
    <div className="space-y-4">
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-sky-50">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl"><Cloud className="h-5 w-5 text-violet-700" />Cloudflare Storage Health</CardTitle>
            <CardDescription className="mt-1">Read-only administrator report for public R2 coverage, representative delivery checks, and protected-evidence boundaries.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => healthQuery.refetch()} disabled={healthQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${healthQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
        </CardHeader>
        <CardContent>
          {healthQuery.isLoading ? <p className="text-sm text-muted-foreground">Checking Cloudflare storage health…</p> : healthQuery.isError ? <p className="text-sm text-rose-700">The health report could not be loaded. No storage object or database record was changed.</p> : health && <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric icon={<Database className="h-4 w-4" />} label="Public listing photos on R2" value={`${health.publicMedia.listingPhotos.r2Hosted} / ${health.publicMedia.listingPhotos.total}`} status={publicMediaHealthy} />
              <Metric icon={<Cloud className="h-4 w-4" />} label="Public avatars on R2" value={`${health.publicMedia.avatars.r2Hosted} / ${Math.max(health.publicMedia.avatars.totalProfiles - health.publicMedia.avatars.empty, 0)}`} status={publicMediaHealthy} />
              <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Private evidence boundary" value={health.privateEvidence.protectedBoundaryIntact ? "Protected" : "Review needed"} status={health.privateEvidence.protectedBoundaryIntact} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <StorageCard title="Public media bucket" status={publicMediaHealthy} bucket={health.publicMedia.bucket} extra={health.publicMedia.representativeUrlAvailable === null ? "No listing image available for a representative URL check." : health.publicMedia.representativeUrlAvailable ? "Representative public-media URL is reachable." : "Representative public-media URL failed its availability check."} />
              <StorageCard title="Static artwork bucket" status={staticHealthy} bucket={health.staticAssets.bucket} extra={`${health.staticAssets.sentinelChecksPassed} of ${health.staticAssets.sentinelChecksTotal} representative static assets passed delivery checks.`} />
            </div>

            <p className="rounded-lg border border-violet-100 bg-white/70 p-3 text-xs leading-5 text-muted-foreground"><HardDrive className="mr-1 inline h-3.5 w-3.5" />{health.limitations.note} The report never returns credentials, object keys, individual evidence records, or private-evidence URLs. Last checked: {new Date(health.checkedAt).toLocaleString()}.</p>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: string; status: boolean }) {
  return <div className="rounded-xl border border-violet-100 bg-white p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">{icon}{label}</div><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><HealthStatus healthy={status}>{status ? "Healthy" : "Review"}</HealthStatus></div>;
}

function StorageCard({ title, status, bucket, extra }: { title: string; status: boolean; bucket: { credentialConfigured: boolean; reachable: boolean; sampleObjectCount: number; sampleBytes: number; truncated: boolean }; extra: string }) {
  return <div className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3><HealthStatus healthy={status}>{status ? "Healthy" : "Review"}</HealthStatus></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Credential</p><p className="mt-1 font-medium">{bucket.credentialConfigured ? "Configured" : "Not configured"}</p></div><div><p className="text-xs text-muted-foreground">Read-only bucket probe</p><p className="mt-1 font-medium">{bucket.reachable ? "Reachable" : "Unavailable"}</p></div><div><p className="text-xs text-muted-foreground">Sampled objects</p><p className="mt-1 font-medium">{bucket.sampleObjectCount.toLocaleString()}{bucket.truncated ? "+" : ""}</p></div><div><p className="text-xs text-muted-foreground">Sampled bytes</p><p className="mt-1 font-medium">{formatBytes(bucket.sampleBytes)}</p></div></div><p className="mt-4 text-xs leading-5 text-muted-foreground">{extra}</p></div>;
}
