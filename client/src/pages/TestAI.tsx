import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ─── Data Source Registry ────────────────────────────────────────────────────
// Each source defines: what data it provides, what it needs (cert ID, title, etc.)
const DATA_SOURCES = {
  ebay_active: {
    id: 'ebay_active',
    label: 'eBay Active Listings',
    group: 'eBay',
    icon: '🛒',
    provides: ['current_prices', 'price_metrics'],
    status: 'live' as const,
    description: 'Current fixed-price listings with avg, median, range',
  },
  ebay_sold: {
    id: 'ebay_sold',
    label: 'eBay Sold History',
    group: 'eBay',
    icon: '📊',
    provides: ['historic_prices'],
    status: 'placeholder' as const,
    description: 'Completed sale prices — requires eBay Finding API (coming soon)',
  },
  sold_comps: {
    id: 'sold_comps',
    label: 'Sold-Comps (eBay Sold)',
    group: 'eBay',
    icon: '💰',
    provides: ['historic_prices', 'price_metrics'],
    status: 'live' as const,
    description: 'Real eBay completed/sold listings via Sold-Comps API',
  },
  cgc: {
    id: 'cgc',
    label: 'CGC',
    group: 'Grading',
    icon: '🏅',
    provides: ['item_details', 'cert_info', 'population_report'],
    status: 'placeholder' as const,
    description: 'Cert details, grade, label type, page quality, key comments, full pop report',
  },
  psa: {
    id: 'psa',
    label: 'Parse.bot (PSA Data)',
    group: 'Grading',
    icon: '🧩',
    provides: ['item_details', 'cert_info', 'population_report', 'recent_sales'],
    status: 'live' as const,
    description: 'PSA cert details, grade, full population breakdown (Grade 1-10), recent sales — powered by Parse.bot API (not official PSA API)',
  },
  bgs: {
    id: 'bgs',
    label: 'Parse.bot (Beckett Data)',
    group: 'Grading',
    icon: '🧩',
    provides: ['item_details', 'cert_info', 'population_report'],
    status: 'live' as const,
    description: 'BGS cert details, final grade, all 4 sub-grades, label color, population — powered by Parse.bot API',
  },
  pcgs: {
    id: 'pcgs',
    label: 'PCGS',
    group: 'Grading',
    icon: '🪙',
    provides: ['item_details', 'cert_info', 'population_report'],
    status: 'placeholder' as const,
    description: 'Coin cert details, grade, population data',
  },
  ngc: {
    id: 'ngc',
    label: 'NGC',
    group: 'Grading',
    icon: '🪙',
    provides: ['item_details', 'cert_info', 'population_report'],
    status: 'placeholder' as const,
    description: 'Coin/currency cert details, grade, population data',
  },
  cbcs: {
    id: 'cbcs',
    label: 'CBCS',
    group: 'Grading',
    icon: '🏅',
    provides: ['item_details', 'cert_info', 'population_report'],
    status: 'placeholder' as const,
    description: 'Comic cert details, grade, population report',
  },
  comic_book_realm: {
    id: 'comic_book_realm',
    label: 'Comic Book Realm',
    group: 'Marketplace',
    icon: '📚',
    provides: ['item_details', 'population_report', 'historic_prices'],
    status: 'placeholder' as const,
    description: 'CGC census data, estimated values, sale history (scraper coming soon)',
  },
  pwcc: {
    id: 'pwcc',
    label: 'PWCC',
    group: 'Marketplace',
    icon: '🏆',
    provides: ['historic_prices'],
    status: 'placeholder' as const,
    description: 'Premium auction sale history (scraper coming soon)',
  },
  heritage: {
    id: 'heritage',
    label: 'Heritage Auctions',
    group: 'Marketplace',
    icon: '🏛️',
    provides: ['historic_prices'],
    status: 'placeholder' as const,
    description: 'Auction sale history for comics, cards, coins (scraper coming soon)',
  },
  gocollect: {
    id: 'gocollect',
    label: 'GoCollect',
    group: 'Marketplace',
    icon: '📈',
    provides: ['historic_prices', 'price_metrics'],
    status: 'placeholder' as const,
    description: 'Graded comic sale analytics and trends (scraper coming soon)',
  },
} as const;

type SourceId = keyof typeof DATA_SOURCES;
const SOURCE_GROUPS = ['eBay', 'Grading', 'Marketplace'] as const;

const GRADING_COMPANIES = ['CGC', 'PSA', 'BGS', 'PCGS', 'NGC', 'CBCS', 'SGC', 'HGA', 'CSG', 'Other'] as const;
type GradingCompany = typeof GRADING_COMPANIES[number];
type ItemSource = 'inventory' | 'cert';

interface SelectedItem {
  id?: number;
  title: string;
  category: string;
  grade?: string;
  condition?: string;
  estimatedValue?: number;
  certificationCompany?: string;
  itemDetails?: string;
  primaryPhotoUrl?: string;
  certId?: string;
  gradingCompany?: GradingCompany;
}

// ─── Source Selector ─────────────────────────────────────────────────────────
function SourceSelector({ enabled, onChange, side }: {
  enabled: Set<SourceId>;
  onChange: (s: Set<SourceId>) => void;
  side: 'left' | 'right';
}) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const toggle = (id: SourceId) => {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>Data Sources</p>
      {SOURCE_GROUPS.map(group => (
        <div key={group}>
          <p className="text-gray-500 text-[9px] uppercase font-semibold mb-1.5">{group}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(DATA_SOURCES)
              .filter(s => s.group === group)
              .map(source => {
                const isEnabled = enabled.has(source.id as SourceId);
                const isLive = source.status === 'live';
                return (
                  <button
                    key={source.id}
                    onClick={() => toggle(source.id as SourceId)}
                    title={source.description}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                      isEnabled
                        ? isLive
                          ? 'bg-green-900/40 border-green-600 text-green-300'
                          : 'bg-indigo-900/40 border-indigo-600 text-indigo-300'
                        : 'bg-gray-800/40 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'
                    }`}
                  >
                    <span>{source.icon}</span>
                    <span>{source.label}</span>
                    {!isLive && <span className="text-[9px] opacity-60">(soon)</span>}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
      <p className="text-gray-600 text-[10px]">Green = live data · Blue = placeholder (scraper coming soon)</p>
    </div>
  );
}

// ─── Item Panel ──────────────────────────────────────────────────────────────
function ItemPanel({ side, item, onItemChange, onSourceChange, inventory, inventoryLoading }: {
  side: 'left' | 'right';
  item: SelectedItem | null;
  onItemChange: (item: SelectedItem | null) => void;
  onSourceChange: (s: Set<SourceId>) => void;
  inventory: any[];
  inventoryLoading: boolean;
}) {
  const [source, setSource] = useState<ItemSource>('inventory');
  const [certId, setCertId] = useState('');
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>('CGC');
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);

  const borderColor = side === 'left' ? 'border-cyan-700/40' : 'border-amber-700/40';
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const bgColor = side === 'left' ? 'bg-cyan-900/10' : 'bg-amber-900/10';
  const label = side === 'left' ? 'ITEM A' : 'ITEM B';

  const handleInventorySelect = (id: number) => {
    setSelectedInventoryId(id);
    const found = inventory.find((i: any) => i.id === id);
    if (found) onItemChange(found);
    else onItemChange(null);
  };

  const handleCertSubmit = () => {
    if (!certId.trim()) { toast.error('Enter a certificate ID'); return; }
    onItemChange({
      title: `${gradingCompany} Cert #${certId}`,
      category: 'unknown',
      certId: certId.trim(),
      gradingCompany,
      certificationCompany: gradingCompany,
    });
  };

  return (
    <div className={`flex-1 min-w-0 rounded-xl border ${borderColor} ${bgColor} p-4 space-y-4`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-widest ${accentColor}`}>{label}</span>
        <div className="flex gap-1">
          {(['inventory', 'cert'] as ItemSource[]).map(s => (
            <button key={s} onClick={() => {
              setSource(s);
              // Clear pre-selected sources when switching to cert mode; reset to ebay_active for inventory
              if (s === 'cert') onSourceChange(new Set());
              else onSourceChange(new Set(['ebay_active']));
              onItemChange(null);
              setCertId('');
              setSelectedInventoryId(null);
            }}
              className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${source === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {s === 'inventory' ? 'My Inventory' : 'Cert ID'}
            </button>
          ))}
        </div>
      </div>

      {source === 'inventory' ? (
        inventoryLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Spinner className="w-4 h-4" /> Loading...</div>
        ) : (
          <select value={selectedInventoryId ?? ''} onChange={e => handleInventorySelect(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">— Select an item —</option>
            {inventory.map((i: any) => (
              <option key={i.id} value={i.id}>
                {i.title}{i.grade ? ` (Grade ${i.grade})` : ''}{i.estimatedValue ? ` — $${Number(i.estimatedValue).toLocaleString()}` : ''}
              </option>
            ))}
          </select>
        )
      ) : (
        <div className="space-y-2">
          <select value={gradingCompany} onChange={e => setGradingCompany(e.target.value as GradingCompany)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none">
            {GRADING_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={certId} onChange={e => setCertId(e.target.value)} placeholder="Enter certificate ID..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" />
            <button onClick={handleCertSubmit} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded font-medium transition-colors">
              Lookup
            </button>
          </div>
        </div>
      )}

      {item && (
        <div className="flex gap-3 p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
          {item.primaryPhotoUrl && (
            <img src={item.primaryPhotoUrl} alt={item.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-sm ${accentColor} truncate`}>{item.title}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {item.category && item.category !== 'unknown' && <Badge variant="secondary" className="text-[10px]">{item.category.replace(/_/g, ' ')}</Badge>}
              {item.grade && <Badge variant="outline" className="text-[10px]">Grade {item.grade}</Badge>}
              {item.certificationCompany && <Badge variant="outline" className="text-[10px]">{item.certificationCompany}</Badge>}
            </div>
            {item.estimatedValue && <p className="text-green-400 text-sm font-semibold mt-1">${Number(item.estimatedValue).toLocaleString()}</p>}
          </div>
          <button onClick={() => { onItemChange(null); setSelectedInventoryId(null); setCertId(''); }} className="text-gray-500 hover:text-red-400 text-lg leading-none flex-shrink-0">×</button>
        </div>
      )}
    </div>
  );
}

// ─── Sold-Comps Sold History Section ─────────────────────────────────────────
function SoldCompsSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading } = trpc.testAI.getSoldCompsData.useQuery(
    { title: item.title, category: item.category, grade: item.grade ?? undefined, condition: item.condition ?? undefined, certificationCompany: item.certificationCompany ?? '', itemDetails: item.itemDetails ?? undefined },
    { enabled: !!item.title && item.category !== 'unknown' }
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>💰 Sold-Comps — eBay Sold History</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Data type: Completed eBay sales · Up to 90 days history</p>
      {data?.error && <p className="text-red-400 text-xs">{data.error}</p>}
      {data?.metrics && (
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          {[
            { label: 'Avg Sold', value: `$${data.metrics.avg.toLocaleString()}` },
            { label: 'Median', value: `$${data.metrics.median.toLocaleString()}` },
            { label: 'Range', value: `$${data.metrics.min.toLocaleString()}–$${data.metrics.max.toLocaleString()}` },
            { label: 'Confidence', value: data.metrics.confidence.toUpperCase() },
          ].map(m => (
            <div key={m.label} className="bg-gray-900/40 rounded p-1.5 text-center">
              <p className="text-gray-500 text-[9px] uppercase mb-0.5">{m.label}</p>
              <p className={`font-semibold ${m.label === 'Confidence' ? (data.metrics!.confidence === 'high' ? 'text-green-400' : data.metrics!.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400') : 'text-white'}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}
      {data?.query && <p className="text-gray-500 text-[10px]">Query: <span className="font-mono text-gray-400">"{data.query}"</span> · {data.listings.length} results</p>}
      {data?.listings && data.listings.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {data.listings.map((l: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-gray-700/20 last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                {l.imageUrl && <img src={l.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />}
                <div className="min-w-0">
                  <a href={l.itemUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline truncate block">{l.title}</a>
                  <p className="text-[10px] text-gray-500">{l.condition} · {l.endedAt ? `Sold ${l.endedAt}` : ''}</p>
                </div>
              </div>
              <p className="text-green-400 font-semibold text-sm flex-shrink-0">${l.price.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
      {data && !data.listings.length && !data.error && <p className="text-gray-500 text-xs">No sold listings found.</p>}
    </div>
  );
}

// ─── eBay Active Listings Section ────────────────────────────────────────────
function EbayActiveSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading } = trpc.testAI.getEbayData.useQuery(
    { title: item.title, category: item.category, grade: item.grade ?? undefined, condition: item.condition ?? undefined, certificationCompany: item.certificationCompany ?? '', itemDetails: item.itemDetails ?? undefined },
    { enabled: !!item.title && item.category !== 'unknown' }
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🛒 eBay Active Listings</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Data type: Current fixed-price listings · Price metrics</p>
      {data?.error && <p className="text-red-400 text-xs">{data.error}</p>}
      {data?.metrics && (
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          {[
            { label: 'Avg', value: `$${data.metrics.avg.toLocaleString()}` },
            { label: 'Median', value: `$${data.metrics.median.toLocaleString()}` },
            { label: 'Range', value: `$${data.metrics.min.toLocaleString()}–$${data.metrics.max.toLocaleString()}` },
            { label: 'Confidence', value: data.metrics.confidence.toUpperCase() },
          ].map(m => (
            <div key={m.label} className="bg-gray-900/40 rounded p-1.5 text-center">
              <p className="text-gray-500 text-[9px] uppercase mb-0.5">{m.label}</p>
              <p className={`font-semibold ${m.label === 'Confidence' ? (data.metrics!.confidence === 'high' ? 'text-green-400' : data.metrics!.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400') : 'text-white'}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}
      {data?.query && <p className="text-gray-500 text-[10px]">Query: <span className="font-mono text-gray-400">"{data.query}"</span> · {data.listings.length} results</p>}
      {data?.listings && data.listings.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {data.listings.map((l: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-gray-700/20 last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                {l.imageUrl && <img src={l.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />}
                <div className="min-w-0">
                  <a href={l.itemUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline truncate block">{l.title}</a>
                  <p className="text-[10px] text-gray-500">{l.condition} · {l.seller}</p>
                </div>
              </div>
              <p className="text-green-400 font-semibold text-sm flex-shrink-0">${l.price.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
      {data && !data.listings.length && !data.error && <p className="text-gray-500 text-xs">No listings found.</p>}
    </div>
  );
}

// ─── PSA Population Report Section ──────────────────────────────────────────
function PSASection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading } = trpc.testAI.getPSAData.useQuery(
    { certNumber: item.certId || '' },
    { enabled: !!item.certId }
  );

  if (!item.certId) {
    return (
      <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 Parse.bot (PSA Data)</p>
        <p className="text-gray-500 text-[10px]">Enter a PSA cert number to fetch population data</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 PSA Population Report (via Parse.bot)</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Data type: Cert details, full grade breakdown, recent sales</p>
      
      {data?.status === 'error' && (
        <div className="bg-red-900/20 border border-red-700/30 rounded p-2">
          <p className="text-red-400 text-[10px]">{data.message}</p>
        </div>
      )}
      
      {data?.status === 'success' && data.data && (
        <div className="space-y-3">
          {/* Card Info */}
          <div className="bg-gray-900/40 rounded p-2 space-y-1">
            <p className="text-white text-[12px] font-semibold">{data.data.cardTitle}</p>
            <div className="grid grid-cols-3 gap-2 text-[10px] mt-1">
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Grade</p>
                <p className="text-cyan-300 font-semibold">{data.data.grade}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">PSA Estimate</p>
                <p className="text-green-400 font-semibold">{data.data.psaEstimate || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Year</p>
                <p className="text-white font-semibold">{data.data.year || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] mt-1">
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Brand</p>
                <p className="text-white font-semibold truncate">{data.data.brand || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Subject</p>
                <p className="text-white font-semibold truncate">{data.data.subject || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Card #</p>
                <p className="text-white font-semibold">{data.data.cardNumber || 'N/A'}</p>
              </div>
            </div>
            {data.data.variety && (
              <div className="mt-1">
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Variety</p>
                <p className="text-white text-[10px]">{data.data.variety}</p>
              </div>
            )}
            {/* Card Images */}
            {(data.data.frontImageUrl || data.data.backImageUrl) && (
              <div className="flex gap-2 mt-2">
                {data.data.frontImageUrl && (
                  <img src={data.data.frontImageUrl} alt="Front" className="h-20 rounded border border-gray-700/40 object-contain" />
                )}
                {data.data.backImageUrl && (
                  <img src={data.data.backImageUrl} alt="Back" className="h-20 rounded border border-gray-700/40 object-contain" />
                )}
              </div>
            )}
          </div>
          
          {/* Population Breakdown */}
          <div className="bg-gray-900/40 rounded p-2 space-y-2">
            <p className="text-gray-400 text-[10px] font-semibold uppercase">Population Breakdown</p>
            <div className="grid grid-cols-5 gap-1 text-[9px]">
              {[
                { label: '10', value: data.data.population.Grade10 },
                { label: '9', value: data.data.population.Grade9 },
                { label: '8', value: data.data.population.Grade8 },
                { label: '7', value: data.data.population.Grade7 },
                { label: '6', value: data.data.population.Grade6 },
                { label: '5', value: data.data.population.Grade5 },
                { label: '4', value: data.data.population.Grade4 },
                { label: '3', value: data.data.population.Grade3 },
                { label: '2', value: data.data.population.Grade2 },
                { label: '1', value: data.data.population.Grade1 },
              ].map(g => (
                <div key={g.label} className="bg-gray-800/60 rounded p-1 text-center">
                  <p className="text-gray-500 text-[8px] mb-0.5">PSA {g.label}</p>
                  <p className={`font-semibold ${g.value > 0 ? 'text-white' : 'text-gray-600'}`}>{g.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
              <div className="bg-gray-800/60 rounded p-1.5 text-center">
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Total Graded</p>
                <p className="text-white font-semibold">{data.data.population.GradeTotal.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/60 rounded p-1.5 text-center">
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">All (incl. Auth)</p>
                <p className="text-white font-semibold">{data.data.population.Total.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          {/* Recent Sales */}
          {data.data.recentSales && data.data.recentSales.length > 0 ? (
            <div className="bg-gray-900/40 rounded p-2 space-y-1">
              <p className="text-gray-400 text-[10px] font-semibold uppercase">Recent Sales (Parse.bot)</p>
              {data.data.recentSales.map((sale: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-gray-700/20 last:border-b-0">
                  <div className="min-w-0">
                    <a href={sale.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline truncate block">{sale.title || 'View listing'}</a>
                    <p className="text-[9px] text-gray-500">{sale.dateSold}</p>
                  </div>
                  <p className="text-green-400 font-semibold text-[11px] flex-shrink-0">${sale.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900/40 rounded p-2">
              <p className="text-gray-500 text-[10px]">No recent sales data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder Section ─────────────────────────────────────────────────────
// ─── Beckett Section ─────────────────────────────────────────────────────────
function BeckettSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading } = trpc.testAI.getBeckettData.useQuery(
    { certNumber: item.certId || '' },
    { enabled: !!item.certId }
  );

  if (!item.certId) {
    return (
      <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 Parse.bot (Beckett Data)</p>
        <p className="text-gray-500 text-[10px]">Enter a BGS cert number to fetch grading details</p>
      </div>
    );
  }

  // Label color badge styling
  const labelColorClass = (label: string | null) => {
    if (!label) return 'bg-gray-700 text-gray-300';
    const l = label.toLowerCase();
    if (l === 'gold') return 'bg-yellow-600/80 text-yellow-100';
    if (l === 'black') return 'bg-gray-900 text-white border border-gray-600';
    if (l === 'silver') return 'bg-gray-400/80 text-gray-900';
    return 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 BGS Grading Report (via Parse.bot)</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Data type: Cert details, final grade, sub-grades, label color, population</p>

      {data?.status === 'error' && (
        <div className="bg-red-900/20 border border-red-700/30 rounded p-2">
          <p className="text-red-400 text-[10px]">{data.message}</p>
        </div>
      )}

      {data?.status === 'success' && data.data && (
        <div className="space-y-3">
          {/* Card Identity */}
          <div className="bg-gray-900/40 rounded p-2 space-y-1">
            <p className="text-white text-[12px] font-semibold">{data.data.playerName}</p>
            <p className="text-gray-400 text-[10px]">{data.data.setName}</p>
            <div className="grid grid-cols-3 gap-2 text-[10px] mt-1">
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Final Grade</p>
                <p className="text-cyan-300 font-bold text-[13px]">{data.data.finalGrade}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Label</p>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${labelColorClass(data.data.labelColor)}`}>
                  {data.data.labelColor || 'N/A'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Sport</p>
                <p className="text-white font-semibold">{data.data.sport || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] mt-1">
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Card #</p>
                <p className="text-white font-semibold">{data.data.cardNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Year</p>
                <p className="text-white font-semibold">{data.data.year || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Date Graded</p>
                <p className="text-white font-semibold text-[9px]">{data.data.dateGraded ? new Date(data.data.dateGraded).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            {/* Card Image */}
            {data.data.frontImageUrl && !data.data.frontImageUrl.includes('no-image') && (
              <div className="mt-2">
                <img src={data.data.frontImageUrl} alt="Card" className="h-20 rounded border border-gray-700/40 object-contain" />
              </div>
            )}
          </div>

          {/* BGS Sub-Grades — the key differentiator */}
          <div className="bg-gray-900/40 rounded p-2 space-y-2">
            <p className="text-gray-400 text-[10px] font-semibold uppercase">BGS Sub-Grades</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {[
                { label: 'Centering', value: data.data.subGrades?.centering },
                { label: 'Corners', value: data.data.subGrades?.corners },
                { label: 'Edges', value: data.data.subGrades?.edges },
                { label: 'Surface', value: data.data.subGrades?.surface },
              ].map(sg => {
                const isNA = !sg.value || sg.value === '0.0' || sg.value === '0';
                return (
                  <div key={sg.label} className="bg-gray-800/60 rounded p-1.5 flex items-center justify-between">
                    <p className="text-gray-400 text-[9px]">{sg.label}</p>
                    <p className={`font-bold text-[12px] ${
                      isNA ? 'text-gray-600' :
                      sg.value === '10.0' || sg.value === '10' ? 'text-yellow-400' :
                      parseFloat(sg.value!) >= 9.5 ? 'text-green-400' :
                      parseFloat(sg.value!) >= 9 ? 'text-cyan-300' :
                      'text-white'
                    }`}>{isNA ? 'N/A' : sg.value}</p>
                  </div>
                );
              })}
            </div>
            {data.data.subGrades?.autograph && data.data.subGrades.autograph !== '0.0' && (
              <div className="bg-gray-800/60 rounded p-1.5 flex items-center justify-between">
                <p className="text-gray-400 text-[9px]">Autograph</p>
                <p className="text-cyan-300 font-bold text-[12px]">{data.data.subGrades.autograph}</p>
              </div>
            )}
          </div>

          {/* Population Data */}
          <div className="bg-gray-900/40 rounded p-2 space-y-1">
            <p className="text-gray-400 text-[10px] font-semibold uppercase">Population Data</p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-gray-800/60 rounded p-1.5 text-center">
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Graded Higher</p>
                <p className="text-white font-semibold">{data.data.popHigher?.toLocaleString() ?? 'N/A'}</p>
              </div>
              <div className="bg-gray-800/60 rounded p-1.5 text-center">
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">Total at Grade</p>
                <p className="text-white font-semibold">{data.data.popTotal?.toLocaleString() ?? 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderSection({ sourceId, side }: { sourceId: SourceId; side: 'left' | 'right' }) {
  const source = DATA_SOURCES[sourceId];
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>{source.icon} {source.label}</p>
      <p className="text-gray-500 text-[10px]">Data type: {source.provides.join(', ').replace(/_/g, ' ')}</p>
      <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-2">
        <p className="text-yellow-400 text-[10px] font-semibold mb-0.5">🚧 Scraper Not Yet Built</p>
        <p className="text-gray-400 text-[11px]">{source.description}</p>
      </div>
    </div>
  );
}

// ─── AI Analysis Section ─────────────────────────────────────────────────────
function AIAnalysisSection({ leftItem, rightItem, leftEbayData, rightEbayData, leftSources, rightSources, leftSoldCompsData, rightSoldCompsData }: {
  leftItem: SelectedItem;
  rightItem: SelectedItem;
  leftEbayData: any;
  rightEbayData: any;
  leftSources: Set<SourceId>;
  rightSources: Set<SourceId>;
  leftSoldCompsData?: any;
  rightSoldCompsData?: any;
}) {
  const [result, setResult] = useState<any>(null);
  const analyzeMutation = trpc.testAI.analyzeItems.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error(err.message),
  });

  const leftHasEbay = leftSources.has('ebay_active');
  const rightHasEbay = rightSources.has('ebay_active');
  const leftHasSoldComps = leftSources.has('sold_comps');
  const rightHasSoldComps = rightSources.has('sold_comps');

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      leftItem: { title: leftItem.title, category: leftItem.category, grade: leftItem.grade, condition: leftItem.condition, estimatedValue: leftItem.estimatedValue, certificationCompany: leftItem.certificationCompany, itemDetails: leftItem.itemDetails },
      rightItem: { title: rightItem.title, category: rightItem.category, grade: rightItem.grade, condition: rightItem.condition, estimatedValue: rightItem.estimatedValue, certificationCompany: rightItem.certificationCompany, itemDetails: rightItem.itemDetails },
      leftEbayMetrics: leftHasEbay ? (leftEbayData?.metrics ?? null) : null,
      rightEbayMetrics: rightHasEbay ? (rightEbayData?.metrics ?? null) : null,
      leftSoldCompsMetrics: leftHasSoldComps ? (leftSoldCompsData?.metrics ?? null) : null,
      rightSoldCompsMetrics: rightHasSoldComps ? (rightSoldCompsData?.metrics ?? null) : null,
    });
  };

  const activeSourcesNote = [
    leftSources.size > 0 ? `Item A: ${Array.from(leftSources).map(id => DATA_SOURCES[id].label).join(', ')}` : null,
    rightSources.size > 0 ? `Item B: ${Array.from(rightSources).map(id => DATA_SOURCES[id].label).join(', ')}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-indigo-900/20 rounded-xl border border-indigo-700/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-indigo-300 font-bold text-sm uppercase tracking-wide">🤖 AI Trade Analysis</p>
          <p className="text-gray-500 text-xs mt-0.5">{activeSourcesNote || 'No data sources selected'}</p>
        </div>
        <button onClick={handleAnalyze} disabled={analyzeMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors">
          {analyzeMutation.isPending ? <><Spinner className="w-4 h-4" /> Analyzing...</> : 'Run Analysis'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className={`rounded-lg px-4 py-3 text-center font-bold text-base border-2 ${
            result.verdict?.includes('A') ? 'bg-cyan-900/40 text-cyan-200 border-cyan-600' :
            result.verdict?.includes('B') ? 'bg-amber-900/40 text-amber-200 border-amber-600' :
            'bg-blue-900/40 text-blue-200 border-blue-600'
          }`}>
            {result.verdict}
            {result.tradeFairness && <div className="text-xs font-normal opacity-80 mt-1">{result.tradeFairness}</div>}
          </div>
          {result.valueSummary && <p className="text-gray-300 text-sm leading-relaxed">{result.valueSummary}</p>}
          <div className="grid grid-cols-2 gap-4">
            {[
            { item: leftItem, insights: result.itemAInsights, potential: result.itemAFuturePotential, strengths: result.itemAStrengths, risks: result.itemARisks, gradeCliff: result.itemAGradeCliff, liquidity: result.itemALiquidity, liquidityNote: result.itemALiquidityNote, color: 'cyan' },
            { item: rightItem, insights: result.itemBInsights, potential: result.itemBFuturePotential, strengths: result.itemBStrengths, risks: result.itemBRisks, gradeCliff: result.itemBGradeCliff, liquidity: result.itemBLiquidity, liquidityNote: result.itemBLiquidityNote, color: 'amber' },
          ].map(({ item, insights, potential, strengths, risks, gradeCliff, liquidity, liquidityNote, color }) => (
            <div key={color} className="space-y-2">
              <p className={`text-${color}-300 font-semibold text-sm`}>{item.title}</p>
              {insights && <p className="text-gray-300 text-xs leading-relaxed">{insights}</p>}
              {(liquidity || gradeCliff) && (
                <div className="grid grid-cols-2 gap-2">
                  {liquidity && (
                    <div className="bg-gray-900/40 rounded p-2">
                      <p className="text-gray-500 text-[9px] uppercase mb-0.5">💧 Liquidity</p>
                      <p className={`font-semibold text-xs ${liquidity === 'High' ? 'text-green-400' : liquidity === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>{liquidity}</p>
                      {liquidityNote && <p className="text-gray-500 text-[10px] mt-0.5">{liquidityNote}</p>}
                    </div>
                  )}
                  {gradeCliff && (
                    <div className="bg-gray-900/40 rounded p-2">
                      <p className="text-gray-500 text-[9px] uppercase mb-0.5">📊 Grade Cliff</p>
                      <p className="text-gray-300 text-[10px]">{gradeCliff}</p>
                    </div>
                  )}
                </div>
              )}
              {potential && (
                  <div className={`bg-${color}-950/30 rounded p-2`}>
                    <p className={`text-${color}-400 text-[9px] font-bold uppercase mb-1`}>📈 Future Potential</p>
                    <p className="text-gray-300 text-[11px] font-mono">{potential}</p>
                  </div>
                )}
                {strengths?.length > 0 && (
                  <div>
                    <p className="text-green-400 text-[9px] font-bold uppercase mb-1">✅ Strengths</p>
                    {strengths.map((s: string, i: number) => <p key={i} className="text-gray-400 text-[11px]">• {s}</p>)}
                  </div>
                )}
                {risks?.length > 0 && (
                  <div>
                    <p className="text-red-400 text-[9px] font-bold uppercase mb-1">⚠️ Risks</p>
                    {risks.map((r: string, i: number) => <p key={i} className="text-gray-400 text-[11px]">• {r}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
          {result.liquidityWarning && (
            <div className="bg-orange-900/20 border border-orange-700/30 rounded p-3">
              <p className="text-orange-400 text-[10px] font-bold uppercase mb-1">⚡ Liquidity Warning</p>
              <p className="text-gray-300 text-xs">{result.liquidityWarning}</p>
            </div>
          )}
          {result.negotiationTip && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-3">
              <p className="text-yellow-400 text-[10px] font-bold uppercase mb-1">💡 Negotiation Tip</p>
              <p className="text-gray-300 text-xs">{result.negotiationTip}</p>
            </div>
          )}
          {result.dataQuality && <p className="text-gray-500 text-[10px]">Data Quality: {result.dataQuality}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Data Column ─────────────────────────────────────────────────────────────
function DataColumn({ item, searchItem, side, enabledSources, ebayData }: {
  item: SelectedItem | null;
  searchItem: SelectedItem | null;
  side: 'left' | 'right';
  enabledSources: Set<SourceId>;
  ebayData: any;
}) {
  if (!item) return (
    <div className="rounded-xl border border-gray-700/30 bg-gray-800/20 p-8 text-center text-gray-500 text-sm">
      Select {side === 'left' ? 'Item A' : 'Item B'} to see data
    </div>
  );
  if (enabledSources.size === 0) return (
    <div className="rounded-xl border border-gray-700/30 bg-gray-800/20 p-6 text-center text-gray-500 text-sm">
      Enable at least one data source above to see data
    </div>
  );

  // For eBay/Sold-Comps, use the enriched searchItem (has PSA-derived title/grade for cert mode)
  // Fall back to raw item if no enrichment available
  const queryItem = searchItem ?? item;

  return (
    <div className="space-y-3">
      {enabledSources.has('ebay_active') && (
        searchItem || item.category !== 'unknown'
          ? <EbayActiveSection item={queryItem} side={side} />
          : <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
              <p className={`text-[11px] font-bold uppercase ${side === 'left' ? 'text-cyan-300' : 'text-amber-300'}`}>🛒 eBay Active Listings</p>
              <p className="text-gray-500 text-[10px]">Enable <strong>Parse.bot (PSA Data)</strong> first to auto-build the search query from cert details</p>
            </div>
      )}
      {enabledSources.has('sold_comps') && (
        searchItem || item.category !== 'unknown'
          ? <SoldCompsSection item={queryItem} side={side} />
          : <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
              <p className={`text-[11px] font-bold uppercase ${side === 'left' ? 'text-cyan-300' : 'text-amber-300'}`}>💰 Sold-Comps — eBay Sold History</p>
              <p className="text-gray-500 text-[10px]">Enable <strong>Parse.bot (PSA Data)</strong> first to auto-build the search query from cert details</p>
            </div>
      )}
      {enabledSources.has('ebay_sold') && <PlaceholderSection sourceId="ebay_sold" side={side} />}
      {enabledSources.has('cgc') && <PlaceholderSection sourceId="cgc" side={side} />}
      {enabledSources.has('psa') && <PSASection item={item} side={side} />}
      {enabledSources.has('bgs') && <BeckettSection item={item} side={side} />}
      {enabledSources.has('pcgs') && <PlaceholderSection sourceId="pcgs" side={side} />}
      {enabledSources.has('ngc') && <PlaceholderSection sourceId="ngc" side={side} />}
      {enabledSources.has('cbcs') && <PlaceholderSection sourceId="cbcs" side={side} />}
      {enabledSources.has('comic_book_realm') && <PlaceholderSection sourceId="comic_book_realm" side={side} />}
      {enabledSources.has('pwcc') && <PlaceholderSection sourceId="pwcc" side={side} />}
      {enabledSources.has('heritage') && <PlaceholderSection sourceId="heritage" side={side} />}
      {enabledSources.has('gocollect') && <PlaceholderSection sourceId="gocollect" side={side} />}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TestAI() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [leftItem, setLeftItem] = useState<SelectedItem | null>(null);
  const [rightItem, setRightItem] = useState<SelectedItem | null>(null);
  const [leftSources, setLeftSources] = useState<Set<SourceId>>(new Set(['ebay_active']));
  const [rightSources, setRightSources] = useState<Set<SourceId>>(new Set(['ebay_active']));

  const { data: inventory = [], isLoading: inventoryLoading } = trpc.testAI.getMyInventory.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  // ── Silently fetch PSA cert data for cert-mode items so we can build search queries ──
  const leftPSAQuery = trpc.testAI.getPSAData.useQuery(
    { certNumber: leftItem?.certId || '' },
    { enabled: !!leftItem?.certId }
  );
  const rightPSAQuery = trpc.testAI.getPSAData.useQuery(
    { certNumber: rightItem?.certId || '' },
    { enabled: !!rightItem?.certId }
  );

  // Build an effective item for Sold-Comps/eBay queries:
  // If it's a cert-mode item AND Parse.bot returned card data, synthesize a searchable item.
  // Otherwise fall back to the item as-is (inventory mode).
  function buildSearchableItem(item: SelectedItem | null, psaData: any): SelectedItem | null {
    if (!item) return null;
    if (item.category !== 'unknown') return item; // inventory item — already has all fields
    const card = psaData?.data?.data;
    if (!card) return null; // cert mode but PSA data not loaded yet — skip
    // Build a synthetic searchable item from Parse.bot cert data
    const grade = card.grade?.match(/\d+(\.\d+)?/)?.[0] ?? undefined;
    const query = [card.year, card.brand, card.subject, card.cardNumber, item.certificationCompany, grade]
      .filter(Boolean).join(' ');
    return {
      ...item,
      title: query,
      category: 'cert_direct', // tells backend to use title as-is without rebuilding from itemDetails
      grade: grade,
      certificationCompany: item.certificationCompany,
    };
  }

  const leftSearchItem = buildSearchableItem(leftItem, leftPSAQuery);
  const rightSearchItem = buildSearchableItem(rightItem, rightPSAQuery);

  const leftEbayQuery = trpc.testAI.getEbayData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftSearchItem.category, grade: leftSearchItem.grade, condition: leftSearchItem.condition, certificationCompany: leftSearchItem.certificationCompany, itemDetails: leftSearchItem.itemDetails } : { title: '', category: '' },
    { enabled: !!leftSearchItem && leftSources.has('ebay_active') }
  );
  const rightEbayQuery = trpc.testAI.getEbayData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightSearchItem.category, grade: rightSearchItem.grade, condition: rightSearchItem.condition, certificationCompany: rightSearchItem.certificationCompany, itemDetails: rightSearchItem.itemDetails } : { title: '', category: '' },
    { enabled: !!rightSearchItem && rightSources.has('ebay_active') }
  );

  const leftSoldCompsQuery = trpc.testAI.getSoldCompsData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftSearchItem.category, grade: leftSearchItem.grade, condition: leftSearchItem.condition, certificationCompany: leftSearchItem.certificationCompany ?? '', itemDetails: leftSearchItem.itemDetails } : { title: '', category: '' },
    { enabled: !!leftSearchItem && leftSources.has('sold_comps') }
  );
  const rightSoldCompsQuery = trpc.testAI.getSoldCompsData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightSearchItem.category, grade: rightSearchItem.grade, condition: rightSearchItem.condition, certificationCompany: rightSearchItem.certificationCompany ?? '', itemDetails: rightSearchItem.itemDetails } : { title: '', category: '' },
    { enabled: !!rightSearchItem && rightSources.has('sold_comps') }
  );

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  if (!user || user.role !== 'admin') { navigate('/'); return null; }

  const bothSelected = !!leftItem && !!rightItem;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="border-b border-gray-800 bg-gray-900/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">🧪 Test AI</h1>
            <p className="text-gray-400 text-sm">Admin sandbox — test data sources and AI analysis in isolation</p>
          </div>
          <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white text-sm transition-colors">← Back to Admin</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Item selectors */}
        <div className="flex gap-4">
          <ItemPanel side="left" item={leftItem} onItemChange={setLeftItem} onSourceChange={setLeftSources} inventory={inventory} inventoryLoading={inventoryLoading} />
          <div className="flex items-center justify-center flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 font-bold text-sm">VS</div>
          </div>
          <ItemPanel side="right" item={rightItem} onItemChange={setRightItem} onSourceChange={setRightSources} inventory={inventory} inventoryLoading={inventoryLoading} />
        </div>

        {/* Data source selectors — only show when items are selected */}
        {(leftItem || rightItem) && (
          <div className="grid grid-cols-2 gap-4">
            {leftItem ? <SourceSelector enabled={leftSources} onChange={setLeftSources} side="left" /> : <div />}
            {rightItem ? <SourceSelector enabled={rightSources} onChange={setRightSources} side="right" /> : <div />}
          </div>
        )}

        {/* Data sections */}
        {(leftItem || rightItem) && (
          <div className="grid grid-cols-2 gap-4">
            <DataColumn item={leftItem} searchItem={leftSearchItem} side="left" enabledSources={leftSources} ebayData={leftEbayQuery.data} />
            <DataColumn item={rightItem} searchItem={rightSearchItem} side="right" enabledSources={rightSources} ebayData={rightEbayQuery.data} />
          </div>
        )}

        {/* AI Analysis */}
        {bothSelected && (
          <AIAnalysisSection
            leftItem={leftItem}
            rightItem={rightItem}
            leftEbayData={leftEbayQuery.data}
            rightEbayData={rightEbayQuery.data}
            leftSources={leftSources}
            rightSources={rightSources}
            leftSoldCompsData={leftSoldCompsQuery.data}
            rightSoldCompsData={rightSoldCompsQuery.data}
          />
        )}

        {!leftItem && !rightItem && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-4">🧪</p>
            <p className="text-lg font-medium text-gray-400">Select two items to begin testing</p>
            <p className="text-sm mt-2">Choose from your inventory or enter a certificate ID, then select which data sources to test</p>
          </div>
        )}
      </div>
    </div>
  );
}
