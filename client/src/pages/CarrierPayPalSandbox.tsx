import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';
import { formatTrackingDate } from '@/lib/formatTrackingDate';
import { useAuth } from '@/_core/hooks/useAuth';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ─── Carrier Tracking Test Section ───────────────────────────────────────────
function CarrierTrackingSection() {
  const [carrier, setCarrier] = useState<'USPS' | 'UPS' | 'FedEx' | 'DHL'>('USPS');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [uspsScreenshot, setUspsScreenshot] = useState<string | null>(null);
  const [uspsScreenshotSource, setUspsScreenshotSource] = useState<string | null>(null);
  const [uspsViewerOpen, setUspsViewerOpen] = useState(false);
  const uspsLookupMutation = trpc.testAI.lookupUspsTracking.useMutation();
  const upsLookupMutation = trpc.testAI.lookupUpsTracking.useMutation();
  const fedexLookupMutation = trpc.testAI.lookupFedexTracking.useMutation();
  const dhlLookupMutation = trpc.testAI.lookupDhlTracking.useMutation();
  const uspsScreenshotReviewMutation = trpc.testAI.reviewUspsTrackingScreenshot.useMutation();
  const activeMutation = carrier === 'USPS'
    ? uspsLookupMutation
    : carrier === 'UPS'
    ? upsLookupMutation
    : carrier === 'FedEx'
      ? fedexLookupMutation
      : dhlLookupMutation;

  const submitLookup = () => {
    const value = trackingNumber.trim();
    if (!value) {
      toast.error(`Enter a ${carrier} tracking number`);
      return;
    }
    const mutation = carrier === 'USPS'
      ? uspsLookupMutation
      : carrier === 'UPS'
      ? upsLookupMutation
      : carrier === 'FedEx'
        ? fedexLookupMutation
        : dhlLookupMutation;
    mutation.mutate({ trackingNumber: value }, {
      onError: (error) => toast.error(error.message),
    });
  };

  const result = activeMutation.data;
  const officialUspsTrackingUrl = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${encodeURIComponent(trackingNumber.trim())}`;

  const setScreenshotFile = (file: File, source: string) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Use a PNG, JPEG, or WebP screenshot.');
      return;
    }
    if (file.size > 3_000_000) {
      toast.error('Keep the screenshot under 3 MB for this Test AI experiment.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUspsScreenshot(typeof reader.result === 'string' ? reader.result : null);
      setUspsScreenshotSource(source);
    };
    reader.readAsDataURL(file);
  };

  const submitUspsScreenshotForReview = (imageDataUrl: string) => {
    const value = trackingNumber.trim();
    if (!value) {
      toast.error('Enter the USPS tracking number before AI review.');
      return false;
    }
    uspsScreenshotReviewMutation.mutate({ trackingNumber: value, imageDataUrl }, {
      onError: (error) => toast.error(error.message),
    });
    return true;
  };

  const captureUspsResult = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Enter the USPS tracking number before capturing the result.');
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error('This browser does not support tab or window capture. Paste or choose a screenshot instead.');
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false, preferCurrentTab: true } as DisplayMediaStreamOptions);
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      const maxWidth = 1600;
      const width = Math.min(video.videoWidth || maxWidth, maxWidth);
      const height = Math.max(1, Math.round((video.videoHeight || 900) * (width / Math.max(video.videoWidth || maxWidth, 1))));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);
      const image = canvas.toDataURL('image/jpeg', 0.86);
      setUspsScreenshot(image);
      setUspsScreenshotSource('user-approved Tradebilia-tab capture');
      setUspsViewerOpen(false);
      if (submitUspsScreenshotForReview(image)) {
        toast.success('USPS result captured. AI review started automatically.');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast.error('Could not capture the selected USPS tab or window. You can paste or choose a screenshot instead.');
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  };

  const reviewUspsScreenshot = () => {
    if (!uspsScreenshot) {
      toast.error('Capture, paste, or choose a USPS result screenshot first.');
      return;
    }
    submitUspsScreenshotForReview(uspsScreenshot);
  };

  return (
    <section className="rounded-xl border border-sky-700/30 bg-sky-950/20 p-5 space-y-4" aria-labelledby="carrier-tracking-test-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="carrier-tracking-test-title" className="text-sm font-bold uppercase tracking-wide text-sky-300">Carrier Tracking Test</h2>
          <p className="mt-1 text-xs text-gray-400">USPS, UPS, FedEx, and DHL return read-only carrier results. No Tradebilia shipment, trade, or notification data is changed.</p>
        </div>
        <Badge className="w-fit border border-sky-600/40 bg-sky-900/40 text-[10px] text-sky-200">Read only</Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={carrier}
          onChange={(event) => {
            setCarrier(event.target.value as 'USPS' | 'UPS' | 'FedEx' | 'DHL');
            setTrackingNumber('');
            setUspsScreenshot(null);
            setUspsScreenshotSource(null);
            setUspsViewerOpen(false);
          }}
          aria-label="Carrier"
          className="rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
        >
          <option value="USPS">USPS</option>
          <option value="UPS">UPS</option>
          <option value="FedEx">FedEx</option>
          <option value="DHL">DHL</option>
        </select>
        <input
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitLookup();
          }}
          inputMode="text"
          placeholder={`Enter ${carrier} tracking number`}
          aria-label={`${carrier} tracking number`}
          className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-sky-500 focus:outline-none"
        />
        <button
          onClick={submitLookup}
          disabled={activeMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {activeMutation.isPending ? <><Spinner className="h-4 w-4" /> Checking {carrier}…</> : 'Check tracking'}
        </button>
      </div>

      {carrier === 'USPS' && (
        <div className="space-y-3 rounded-lg border border-amber-600/30 bg-amber-950/20 p-3">
          <p className="text-xs text-sky-200/90">This USPS API test uses configured server-side consumer credentials. It returns USPS’s response or a clear authorization error without changing any trade or shipment record.</p>
          <p className="text-xs text-amber-100">Open the official USPS result in the Tradebilia viewer, then capture one view for AI to read explicit USPS result text. If browser capture is unavailable, paste one screenshot instead. The image is sent for one review only and is not stored by Tradebilia. Color alone is never used as a result.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setUspsViewerOpen(true)} disabled={!trackingNumber.trim()} className="rounded-md border border-sky-400/50 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50">View USPS result in Tradebilia</button>
          </div>
          <div
            tabIndex={0}
            role="button"
            aria-label="Paste USPS result screenshot"
            onPaste={(event) => {
              const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'));
              if (image) {
                event.preventDefault();
                setScreenshotFile(image, 'pasted screenshot');
              } else {
                toast.error('Paste an image screenshot, not text.');
              }
            }}
            className="rounded-md border border-dashed border-gray-600 bg-gray-950/30 p-3 text-xs text-gray-400 outline-none focus:border-sky-400"
          >
            Click here and paste a USPS result screenshot.
          </div>
          {uspsScreenshot && (
            <div className="space-y-2 rounded-md border border-sky-500/30 bg-slate-950/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-sky-200">Screenshot ready from {uspsScreenshotSource}.</p><button type="button" onClick={() => { setUspsScreenshot(null); setUspsScreenshotSource(null); }} className="text-xs text-gray-400 hover:text-white">Remove</button></div>
              <button type="button" onClick={reviewUspsScreenshot} disabled={uspsScreenshotReviewMutation.isPending} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{uspsScreenshotReviewMutation.isPending ? 'AI reviewing…' : 'Review USPS screenshot with AI'}</button>
            </div>
          )}
          {uspsScreenshotReviewMutation.data && (
            <div className={`rounded-md border p-3 text-xs ${uspsScreenshotReviewMutation.data.classification === 'recognized_result' ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100' : uspsScreenshotReviewMutation.data.classification === 'tracking_not_available' || uspsScreenshotReviewMutation.data.classification === 'mismatched_tracking_number' ? 'border-red-500/40 bg-red-950/30 text-red-100' : 'border-amber-500/40 bg-amber-950/30 text-amber-100'}`}>
              <p className="font-semibold">{uspsScreenshotReviewMutation.data.classification === 'recognized_result' ? 'Recognized USPS result from user-provided evidence' : uspsScreenshotReviewMutation.data.classification === 'tracking_not_available' ? 'USPS reported Tracking Not Available' : uspsScreenshotReviewMutation.data.classification === 'mismatched_tracking_number' ? 'Screenshot tracking number does not match' : 'USPS evidence needs review'}</p>
              <p className="mt-1">{uspsScreenshotReviewMutation.data.summary}</p>
              {uspsScreenshotReviewMutation.data.detectedStatusText && <p className="mt-1 text-current/80">Visible USPS text: {uspsScreenshotReviewMutation.data.detectedStatusText}</p>}
              <p className="mt-2 text-[10px] opacity-75">{uspsScreenshotReviewMutation.data.retention}. This is AI-reviewed user evidence, not direct USPS API validation.</p>
            </div>
          )}
        </div>
      )}

      {carrier === 'USPS' && uspsViewerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Official USPS tracking result">
          <div className="flex h-[min(88vh,760px)] w-[min(96vw,1040px)] flex-col overflow-hidden rounded-xl border border-sky-400/40 bg-slate-950 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
              <div><p className="text-sm font-semibold text-white">Official USPS tracking result</p><p className="text-xs text-slate-400">This page is provided by USPS. Tradebilia cannot read it directly.</p></div>
              <button type="button" onClick={() => setUspsViewerOpen(false)} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800">Close</button>
            </div>
            <div className="min-h-0 flex-1 bg-white">
              <iframe title="Official USPS tracking result" src={officialUspsTrackingUrl} className="h-full w-full border-0" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 bg-slate-900 px-4 py-3">
              <p className="max-w-2xl text-xs text-amber-100">If the browser capture chooser appears, select the current Tradebilia tab so this viewer is captured. If USPS blocks the embedded page or shows a challenge, use the external link instead.</p>
              <div className="flex flex-wrap gap-2">
                <a href={officialUspsTrackingUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-sky-400/50 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/20">Open USPS results</a>
                <a href={officialUspsTrackingUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">Open USPS.com in new tab</a>
                <button type="button" onClick={captureUspsResult} className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500">Capture this Tradebilia view</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMutation.isError && (
        <div className="rounded-lg border border-red-700/40 bg-red-950/30 p-3 text-xs text-red-300" role="alert">
          {activeMutation.error.message}
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-lg border border-gray-700/50 bg-gray-950/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Current {carrier} status</p>
              <p className="mt-1 text-base font-semibold text-white">{result.status}</p>
              {result.statusSummary && <p className="mt-1 text-sm text-gray-300">{result.statusSummary}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-56">
              <div className="rounded bg-gray-900/80 p-2">
                <p className="text-[9px] font-semibold uppercase text-gray-500">Expected delivery</p>
                <p className="mt-1 text-gray-200">{formatTrackingDate(result.expectedDeliveryDate)}</p>
              </div>
              <div className="rounded bg-gray-900/80 p-2">
                <p className="text-[9px] font-semibold uppercase text-gray-500">Service</p>
                <p className="mt-1 text-gray-200">{result.service ?? 'Not provided'}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Recent {carrier} events</p>
            {result.events.length ? (
              <div className="space-y-2">
                {result.events.map((event, index) => (
                  <div key={`${event.timestamp ?? 'event'}-${index}`} className="flex flex-col gap-1 border-l-2 border-sky-600/50 pl-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-200">{event.type}</p>
                      {(event.city || event.state || event.country) && <p className="text-gray-500">{[event.city, event.state, event.country].filter(Boolean).join(', ')}</p>}
                    </div>
                    <p className="text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Timestamp not provided'}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-500">{carrier} returned no detailed event history for this item.</p>}
          </div>
        </div>
      )}
    </section>
  );
}


// ─── PayPal Comparison Inspector ─────────────────────────────────────────────
function PayPalComparisonInspector() {
  const search = useSearch();
  const [preview, setPreview] = useState<any>(null);
  const [attempted, setAttempted] = useState(false);
  const startInspection = trpc.testAI.startPayPalComparisonInspection.useMutation();
  const consumePreview = trpc.testAI.consumePayPalComparisonInspection.useMutation();
  const inspectorParams = useMemo(
    () => new URLSearchParams(search),
    [search],
  );
  const inspectorState = inspectorParams.get('paypalInspector');
  const inspectorReason = inspectorParams.get('reason');

  useEffect(() => {
    if (inspectorState !== 'ready' || attempted) return;
    setAttempted(true);
    consumePreview.mutate(undefined, {
      onSuccess: (data) => setPreview(data),
      onError: (error) => toast.error(error.message),
    });
  }, [attempted, consumePreview, inspectorState]);

  const comparisonRows = preview ? [
    { label: 'Name', local: preview.tradebilia.nameCandidates[0] ?? 'Not set', paypal: preview.paypal.name ?? 'Not provided', outcome: preview.outcomes.name, note: 'Profile first name followed by last name' },
    { label: 'Email', local: preview.tradebilia.emailCandidates[0] ?? 'Not set', paypal: preview.paypal.email ?? 'Not provided', outcome: preview.outcomes.email, note: preview.paypal.emailVerified === true ? 'Account Settings email · PayPal email is verified' : 'Account Settings email · PayPal email is not verified' },
    { label: 'Street address', local: preview.tradebilia.address.street ?? 'Not set', paypal: preview.paypal.address.street ?? 'Not provided', outcome: preview.addressFields?.street ?? preview.outcomes.address },
    { label: 'City', local: preview.tradebilia.address.town ?? 'Not set', paypal: preview.paypal.address.town ?? 'Not provided', outcome: preview.addressFields?.town ?? preview.outcomes.address },
    { label: 'State / region', local: preview.tradebilia.address.state ?? 'Not set', paypal: preview.paypal.address.state ?? 'Not provided', outcome: preview.addressFields?.state ?? preview.outcomes.address, note: 'US state abbreviations and full names are compared as equivalent' },
    { label: 'Postal code', local: preview.tradebilia.address.zipCode ?? 'Not set', paypal: preview.paypal.address.zipCode ?? 'Not provided', outcome: preview.addressFields?.zipCode ?? preview.outcomes.address },
    { label: 'Country', local: preview.tradebilia.address.country ?? 'Not set', paypal: preview.paypal.address.country ?? 'Not provided', outcome: preview.addressFields?.country ?? preview.outcomes.address, note: 'ISO country codes and full names are compared as equivalent' },
  ] : [];

  return (
    <section className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-5 space-y-4" aria-labelledby="paypal-comparison-inspector-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="paypal-comparison-inspector-title" className="text-sm font-bold uppercase tracking-wide text-violet-200">PayPal Comparison Inspector</h2>
          <p className="mt-1 max-w-3xl text-xs text-violet-100/80">Private admin diagnostic. It makes a new PayPal authorization request and shows the exact authorized values compared with this Tradebilia Profile only once in this browser.</p>
        </div>
        <Badge className="w-fit border border-violet-400/40 bg-violet-900/40 text-[10px] text-violet-100">Owner-only · one-time view</Badge>
      </div>

      {!preview && (
        <div className="flex flex-col gap-3 rounded-lg border border-violet-400/20 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs text-gray-300">Raw PayPal name, email, and address are never saved to the Tradebilia database or public profile. The encrypted preview expires after five minutes and is consumed after one view.</p>
          <button
            type="button"
            disabled={startInspection.isPending}
            onClick={() => startInspection.mutate(undefined, {
              onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
              onError: (error) => toast.error(error.message),
            })}
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
          >
            {startInspection.isPending ? 'Opening PayPal…' : 'Inspect my PayPal comparison'}
          </button>
        </div>
      )}

      {startInspection.isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-100" role="alert">
          <p className="font-semibold">PayPal inspection could not start.</p>
          <p className="mt-1">{startInspection.error.message}</p>
        </div>
      )}
      {consumePreview.isPending && <div className="flex items-center gap-2 text-sm text-violet-100"><Spinner className="h-4 w-4" /> Loading one-time private comparison…</div>}
      {inspectorState === 'error' && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-100" role="alert">
          <p className="font-semibold">PayPal comparison inspection did not complete.</p>
          <p className="mt-1">Safe status: {inspectorReason?.replace(/_/g, ' ') || 'unknown error'}. Start a new inspection after resolving the displayed status.</p>
        </div>
      )}
      {consumePreview.isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-100" role="alert">
          <p className="font-semibold">The one-time preview could not be loaded.</p>
          <p className="mt-1">{consumePreview.error.message}</p>
        </div>
      )}

      {preview && (
        <div className="overflow-x-auto rounded-lg border border-violet-400/20 bg-slate-950/50">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-violet-400/20 bg-violet-950/40 text-[10px] uppercase tracking-wide text-violet-200">
              <tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Tradebilia Profile</th><th className="px-3 py-2">Authorized PayPal value</th><th className="px-3 py-2">Comparison result</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {comparisonRows.map((row) => (
                <tr key={row.label}>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold text-white">{row.label}</th>
                  <td className="px-3 py-2 break-all">{row.local}</td>
                  <td className="px-3 py-2 break-all">{row.paypal}{row.note && <span className="mt-1 block text-[10px] text-emerald-300">{row.note}</span>}</td>
                  <td className="px-3 py-2 capitalize text-violet-200">{row.outcome.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-violet-400/20 px-3 py-2 text-[10px] text-gray-400">Inspection created {new Date(preview.inspectedAt).toLocaleString()}. Raw values are one-time diagnostic data and are not retained after this view.</p>
        </div>
      )}
    </section>
  );
}



export default function CarrierPayPalSandbox() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-950 text-white"><Spinner /></div>;
  if (!user || user.role !== 'admin') return <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-white"><div><p className="text-lg font-semibold">Administrator access required</p><button type="button" onClick={() => navigate('/')} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">Return home</button></div></div>;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Admin sandbox · isolated diagnostics</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Carrier & PayPal Tests</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Read-only carrier tracking checks and one-time PayPal identity comparison diagnostics, kept separate from the market-data analyzer.</p>
          </div>
          <button type="button" onClick={() => navigate('/test-ai')} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-500/60 hover:text-white">← Back to Test AI</button>
        </header>
        <CarrierTrackingSection />
        <PayPalComparisonInspector />
      </div>
    </main>
  );
}
