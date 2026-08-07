import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  // cert ID mode
  certId?: string;
  gradingCompany?: GradingCompany;
}

interface ItemPanelProps {
  side: 'left' | 'right';
  item: SelectedItem | null;
  onItemChange: (item: SelectedItem | null) => void;
  inventory: any[];
  inventoryLoading: boolean;
}

function ItemPanel({ side, item, onItemChange, inventory, inventoryLoading }: ItemPanelProps) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-widest ${accentColor}`}>{label}</span>
        <div className="flex gap-1">
          <button
            onClick={() => setSource('inventory')}
            className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${source === 'inventory' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            My Inventory
          </button>
          <button
            onClick={() => setSource('cert')}
            className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${source === 'cert' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Cert ID
          </button>
        </div>
      </div>

      {/* Source selector */}
      {source === 'inventory' ? (
        <div>
          {inventoryLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Spinner className="w-4 h-4" /> Loading inventory...</div>
          ) : (
            <select
              value={selectedInventoryId ?? ''}
              onChange={e => handleInventorySelect(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
            >
              <option value="">— Select an item —</option>
              {inventory.map((i: any) => (
                <option key={i.id} value={i.id}>
                  {i.title}{i.grade ? ` (Grade ${i.grade})` : ''}{i.estimatedValue ? ` — $${Number(i.estimatedValue).toLocaleString()}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <select
            value={gradingCompany}
            onChange={e => setGradingCompany(e.target.value as GradingCompany)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none"
          >
            {GRADING_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              value={certId}
              onChange={e => setCertId(e.target.value)}
              placeholder="Enter certificate ID..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
            <button
              onClick={handleCertSubmit}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded font-medium transition-colors"
            >
              Lookup
            </button>
          </div>
        </div>
      )}

      {/* Selected item preview */}
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
              {item.condition && <Badge variant="secondary" className="text-[10px]">{item.condition}</Badge>}
            </div>
            {item.estimatedValue && (
              <p className="text-green-400 text-sm font-semibold mt-1">${Number(item.estimatedValue).toLocaleString()}</p>
            )}
          </div>
          <button onClick={() => { onItemChange(null); setSelectedInventoryId(null); setCertId(''); }} className="text-gray-500 hover:text-red-400 text-lg leading-none flex-shrink-0">×</button>
        </div>
      )}
    </div>
  );
}

// ─── eBay Data Section ───────────────────────────────────────────────────────
function EbayDataSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading, error } = trpc.testAI.getEbayData.useQuery(
    {
      title: item.title,
      category: item.category,
      grade: item.grade,
      condition: item.condition,
      certificationCompany: item.certificationCompany,
      itemDetails: item.itemDetails,
    },
    { enabled: !!item.title && item.category !== 'unknown' }
  );

  if (item.category === 'unknown') return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20">
      <p className="text-gray-500 text-xs">eBay data requires item details. Select from inventory or use cert ID lookup (coming soon).</p>
    </div>
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>eBay Active Listings</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>

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

      {data?.query && (
        <p className="text-gray-500 text-[10px]">Search query: <span className="text-gray-400 font-mono">"{data.query}"</span> · {data.listings.length} listings</p>
      )}

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

      {data && !data.listings.length && !data.error && (
        <p className="text-gray-500 text-xs">No eBay listings found for this query.</p>
      )}
    </div>
  );
}

// ─── Population Report Section ───────────────────────────────────────────────
function PopulationReportSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const hasCert = !!item.certId && !!item.gradingCompany;
  const { data, isLoading } = trpc.testAI.getPopulationReport.useQuery(
    { certId: item.certId!, gradingCompany: item.gradingCompany! },
    { enabled: hasCert }
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>Population Report</p>
      {!hasCert ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-xs">Enter a certificate ID above to look up population data.</p>
          <p className="text-gray-600 text-[10px] mt-1">Scraper integration coming soon — will pull live pop reports from CGC, PSA, BGS, PCGS, NGC, CBCS.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-xs"><Spinner className="w-3 h-3" /> Looking up population report...</div>
      ) : (
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-3">
          <p className="text-yellow-400 text-xs font-semibold mb-1">🚧 Scraper Not Yet Built</p>
          <p className="text-gray-400 text-xs">{data?.message}</p>
          <p className="text-gray-500 text-[10px] mt-2">This section will auto-populate with grade distribution, total population, and comparative rarity once the {item.gradingCompany} scraper is complete.</p>
        </div>
      )}
    </div>
  );
}

// ─── Other Marketplaces Section ──────────────────────────────────────────────
function EbaySoldHistorySection({ side }: { side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>eBay Sold History</p>
      <div className="text-center py-4">
        <p className="text-gray-500 text-xs">eBay sold/completed listing history coming soon.</p>
        <p className="text-gray-600 text-[10px] mt-1">Requires eBay Finding API setup — will show completed auction and fixed-price sale prices with dates.</p>
      </div>
    </div>
  );
}

function OtherMarketplacesSection({ side }: { side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>Other Marketplace Sales</p>
      <div className="text-center py-4">
        <p className="text-gray-500 text-xs">Historic sales data from other platforms coming soon.</p>
        <div className="flex justify-center gap-3 mt-2">
          {['PWCC', 'Heritage Auctions', 'GoCollect', 'Comic Book Realm'].map(m => (
            <span key={m} className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI Analysis Section ─────────────────────────────────────────────────────
function AIAnalysisSection({ leftItem, rightItem, leftEbayData, rightEbayData }: {
  leftItem: SelectedItem;
  rightItem: SelectedItem;
  leftEbayData: any;
  rightEbayData: any;
}) {
  const [result, setResult] = useState<any>(null);
  const analyzeMutation = trpc.testAI.analyzeItems.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error(err.message),
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      leftItem: {
        title: leftItem.title,
        category: leftItem.category,
        grade: leftItem.grade,
        condition: leftItem.condition,
        estimatedValue: leftItem.estimatedValue,
        certificationCompany: leftItem.certificationCompany,
        itemDetails: leftItem.itemDetails,
      },
      rightItem: {
        title: rightItem.title,
        category: rightItem.category,
        grade: rightItem.grade,
        condition: rightItem.condition,
        estimatedValue: rightItem.estimatedValue,
        certificationCompany: rightItem.certificationCompany,
        itemDetails: rightItem.itemDetails,
      },
      leftEbayMetrics: leftEbayData?.metrics ?? null,
      rightEbayMetrics: rightEbayData?.metrics ?? null,
    });
  };

  return (
    <div className="bg-indigo-900/20 rounded-xl border border-indigo-700/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-indigo-300 font-bold text-sm uppercase tracking-wide">AI Trade Analysis</p>
          <p className="text-gray-500 text-xs">Powered by Manus Forge LLM using all available data above</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzeMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
        >
          {analyzeMutation.isPending ? <><Spinner className="w-4 h-4" /> Analyzing...</> : '🤖 Run Analysis'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Verdict */}
          <div className={`rounded-lg px-4 py-3 text-center font-bold text-base border-2 ${
            result.verdict?.includes('A') ? 'bg-cyan-900/40 text-cyan-200 border-cyan-600' :
            result.verdict?.includes('B') ? 'bg-amber-900/40 text-amber-200 border-amber-600' :
            'bg-blue-900/40 text-blue-200 border-blue-600'
          }`}>
            {result.verdict}
            {result.tradeFairness && <div className="text-xs font-normal opacity-80 mt-1">{result.tradeFairness}</div>}
          </div>

          {/* Value summary */}
          {result.valueSummary && (
            <p className="text-gray-300 text-sm leading-relaxed">{result.valueSummary}</p>
          )}

          {/* Side-by-side item analysis */}
          <div className="grid grid-cols-2 gap-4">
            {/* Item A */}
            <div className="space-y-2">
              <p className="text-cyan-300 font-semibold text-sm">{leftItem.title}</p>
              {result.itemAInsights && <p className="text-gray-300 text-xs leading-relaxed">{result.itemAInsights}</p>}
              {result.itemAFuturePotential && (
                <div className="bg-cyan-950/30 rounded p-2">
                  <p className="text-cyan-400 text-[9px] font-bold uppercase mb-1">📈 Future Potential</p>
                  <p className="text-gray-300 text-[11px] font-mono">{result.itemAFuturePotential}</p>
                </div>
              )}
              {result.itemAStrengths?.length > 0 && (
                <div>
                  <p className="text-green-400 text-[9px] font-bold uppercase mb-1">✅ Strengths</p>
                  {result.itemAStrengths.map((s: string, i: number) => <p key={i} className="text-gray-400 text-[11px]">• {s}</p>)}
                </div>
              )}
              {result.itemARisks?.length > 0 && (
                <div>
                  <p className="text-red-400 text-[9px] font-bold uppercase mb-1">⚠️ Risks</p>
                  {result.itemARisks.map((r: string, i: number) => <p key={i} className="text-gray-400 text-[11px]">• {r}</p>)}
                </div>
              )}
            </div>
            {/* Item B */}
            <div className="space-y-2">
              <p className="text-amber-300 font-semibold text-sm">{rightItem.title}</p>
              {result.itemBInsights && <p className="text-gray-300 text-xs leading-relaxed">{result.itemBInsights}</p>}
              {result.itemBFuturePotential && (
                <div className="bg-amber-950/30 rounded p-2">
                  <p className="text-amber-400 text-[9px] font-bold uppercase mb-1">📈 Future Potential</p>
                  <p className="text-gray-300 text-[11px] font-mono">{result.itemBFuturePotential}</p>
                </div>
              )}
              {result.itemBStrengths?.length > 0 && (
                <div>
                  <p className="text-green-400 text-[9px] font-bold uppercase mb-1">✅ Strengths</p>
                  {result.itemBStrengths.map((s: string, i: number) => <p key={i} className="text-gray-400 text-[11px]">• {s}</p>)}
                </div>
              )}
              {result.itemBRisks?.length > 0 && (
                <div>
                  <p className="text-red-400 text-[9px] font-bold uppercase mb-1">⚠️ Risks</p>
                  {result.itemBRisks.map((r: string, i: number) => <p key={i} className="text-gray-400 text-[11px]">• {r}</p>)}
                </div>
              )}
            </div>
          </div>

          {/* Negotiation tip + data quality */}
          {result.negotiationTip && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-3">
              <p className="text-yellow-400 text-[10px] font-bold uppercase mb-1">💡 Negotiation Tip</p>
              <p className="text-gray-300 text-xs">{result.negotiationTip}</p>
            </div>
          )}
          {result.dataQuality && (
            <p className="text-gray-500 text-[10px]">Data Quality: {result.dataQuality}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TestAI() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [leftItem, setLeftItem] = useState<SelectedItem | null>(null);
  const [rightItem, setRightItem] = useState<SelectedItem | null>(null);

  const { data: inventory = [], isLoading: inventoryLoading } = trpc.testAI.getMyInventory.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  // Fetch eBay data for both items (enabled when item is selected and has real category)
  const leftEbayQuery = trpc.testAI.getEbayData.useQuery(
    leftItem ? { title: leftItem.title, category: leftItem.category, grade: leftItem.grade, condition: leftItem.condition, certificationCompany: leftItem.certificationCompany, itemDetails: leftItem.itemDetails } : { title: '', category: '' },
    { enabled: !!leftItem && leftItem.category !== 'unknown' }
  );
  const rightEbayQuery = trpc.testAI.getEbayData.useQuery(
    rightItem ? { title: rightItem.title, category: rightItem.category, grade: rightItem.grade, condition: rightItem.condition, certificationCompany: rightItem.certificationCompany, itemDetails: rightItem.itemDetails } : { title: '', category: '' },
    { enabled: !!rightItem && rightItem.category !== 'unknown' }
  );

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  if (!user || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  const bothSelected = !!leftItem && !!rightItem;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">🧪 Test AI</h1>
            <p className="text-gray-400 text-sm">Admin testing sandbox for scrapers, eBay data, population reports, and AI analysis</p>
          </div>
          <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Back to Admin
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Item selectors */}
        <div className="flex gap-4">
          <ItemPanel side="left" item={leftItem} onItemChange={setLeftItem} inventory={inventory} inventoryLoading={inventoryLoading} />
          <div className="flex items-center justify-center flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 font-bold text-sm">VS</div>
          </div>
          <ItemPanel side="right" item={rightItem} onItemChange={setRightItem} inventory={inventory} inventoryLoading={inventoryLoading} />
        </div>

        {/* Data sections — only show when items are selected */}
        {(leftItem || rightItem) && (
          <div className="grid grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              {leftItem ? (
              <>
                <EbayDataSection item={leftItem} side="left" />
                <EbaySoldHistorySection side="left" />
                <PopulationReportSection item={leftItem} side="left" />
                <OtherMarketplacesSection side="left" />
                </>
              ) : (
                <div className="rounded-xl border border-gray-700/30 bg-gray-800/20 p-8 text-center text-gray-500 text-sm">Select Item A to see data</div>
              )}
            </div>
            {/* Right column */}
            <div className="space-y-4">
              {rightItem ? (
              <>
                <EbayDataSection item={rightItem} side="right" />
                <EbaySoldHistorySection side="right" />
                <PopulationReportSection item={rightItem} side="right" />
                <OtherMarketplacesSection side="right" />
                </>
              ) : (
                <div className="rounded-xl border border-gray-700/30 bg-gray-800/20 p-8 text-center text-gray-500 text-sm">Select Item B to see data</div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis — only show when both items are selected */}
        {bothSelected && (
          <AIAnalysisSection
            leftItem={leftItem}
            rightItem={rightItem}
            leftEbayData={leftEbayQuery.data}
            rightEbayData={rightEbayQuery.data}
          />
        )}

        {!leftItem && !rightItem && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-4">🧪</p>
            <p className="text-lg font-medium text-gray-400">Select two items to begin testing</p>
            <p className="text-sm mt-2">Choose from your inventory or enter a certificate ID to test scraped data and AI analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
