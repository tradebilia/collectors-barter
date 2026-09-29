import { useEffect, useMemo, useState } from 'react';
import { trpc } from "@/lib/trpc";
import { formatTrackingDate } from "@/lib/formatTrackingDate";
import { formatGrade, formatItemValue, formatWholeDollar } from '@/lib/tradebilia';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { resolveTestAiManufacturer } from '@shared/testAiCriteria';
import { getEligibleTestAiSources, type TestAiSourceId } from '@shared/testAiSourceApplicability';
import { normalizeTestAiEvidence, type EvidenceSourceObservation, type NormalizedEvidenceSummary } from '@shared/testAiEvidenceNormalization';
import { normalizeTestAiSelectedItem } from '@shared/testAiSelectedItem';
import { PERMISSION_PENDING_MARKET_SOURCES } from '@shared/permissionPendingMarketSources';
import { SANDBOX_SPECIALIST_SOURCES } from '@shared/sandboxSpecialistSources';

// ─── Data Source Registry ────────────────────────────────────────────────────
// Each source defines: what data it provides, what it needs (cert ID, title, etc.)
type DataSourceStatus = 'live' | 'placeholder' | 'permission_pending' | 'deferred';
type DataSourceDefinition = {
  id: string;
  label: string;
  group: string;
  icon: string;
  provides: string[];
  status: DataSourceStatus;
  description: string;
  liveTestStatus?: 'verified' | 'partial' | 'no_completed_item' | 'deferred';
  liveTestSummary?: string;
};

const PERMISSION_PENDING_SOURCE_REGISTRY: Record<string, DataSourceDefinition> = Object.fromEntries(
  PERMISSION_PENDING_MARKET_SOURCES.map((source) => {
    const id = source.id === 'ngc' ? 'ngc_auction_central' : source.id;
    return [id, {
      id,
      label: source.label,
      group: source.status === 'deferred' ? 'Deferred by owner' : 'Permission pending',
      icon: source.status === 'deferred' ? '⏸️' : '⏳',
      provides: ['historic_prices', 'recent_sales'],
      status: source.status as DataSourceStatus,
      liveTestStatus: source.liveTestStatus,
      liveTestSummary: source.liveTestSummary,
      description: source.status === 'deferred'
        ? `${source.purpose} ${source.liveTestSummary} This provider is deferred by owner and excluded from sandbox source applicability.`
        : `${source.purpose} One bounded public-item test: ${source.liveTestSummary} Permission pending — remote lookup is disabled until a written authorization and source-specific activation review are recorded.`,
    }];
  }),
);

const DATA_SOURCES: Record<string, DataSourceDefinition> = {
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
  hipstamp: {
    id: 'hipstamp',
    label: 'HIPStamp Active Listings',
    group: 'Marketplace',
    icon: '✉️',
    provides: ['current_prices', 'price_metrics'],
    status: 'live' as const,
    description: 'Read-only HIPStamp asking-price and supply context for Stamps items — not completed-sale evidence',
  },
  hipstamp_sold: {
    id: 'hipstamp_sold',
    label: 'HIPStamp Sold / Closed',
    group: 'Marketplace',
    icon: '✅',
    provides: ['historic_prices', 'price_metrics'],
    status: 'live' as const,
    description: 'Store-scoped HIPStamp closed listings marked sold — not marketplace-wide sales history',
  },
  pokemon_price_tracker: {
    id: 'pokemon_price_tracker',
    label: 'Pokémon Price Tracker',
    group: 'Marketplace',
    icon: '🃏',
    provides: ['item_details', 'current_prices', 'historic_prices', 'population_report'],
    status: 'live' as const,
    description: 'Read-only Pokémon catalog, guide-price, history, eBay, Cardmarket, and plan-gated population context — sandbox-only; never changes Tradebilia valuation or verdicts',
  },
  the_card_api: {
    id: 'the_card_api',
    label: 'The Card API Sales',
    group: 'Marketplace',
    icon: '📊',
    provides: ['item_details', 'historic_prices', 'recent_sales'],
    status: 'live' as const,
    description: 'Read-only Sports Cards and Pokémon/TCG completed-sales research with plan-gated catalog identity — sandbox-only; confirmed records still pass Tradebilia comparable gates',
  },
  cardsight_ai: {
    id: 'cardsight_ai',
    label: 'Cardsight.ai Market Data',
    group: 'Marketplace',
    icon: '👁️',
    provides: ['item_details', 'current_prices', 'historic_prices', 'recent_sales', 'population_report'],
    status: 'live' as const,
    description: 'Read-only catalog, exact-parallel pricing, active listings, and population context for Sports Cards and Pokémon/TCG — sandbox-only; only gated auction records may enter comparable review',
  },
  lelands: {
    id: 'lelands',
    label: 'Parse.bot Lelands Auctions',
    group: 'Marketplace',
    icon: '🏟️',
    provides: ['historic_prices', 'recent_sales'],
    status: 'live' as const,
    description: 'Read-only Lelands past-auction archive for Sports Cards and Autographs; only explicit sold, dated, identity-matched records may support sandbox valuation',
  },
  pristine_auction: {
    id: 'pristine_auction',
    label: 'Parse.bot Pristine Auction',
    group: 'Marketplace',
    icon: '🏆',
    provides: ['historic_prices', 'recent_sales'],
    status: 'live' as const,
    description: 'Read-only completed Pristine sports-card lots; detail-level sold, dated, price-normalized records remain subject to identity and visual gates',
  },
  cgc: {
    id: 'cgc',
    label: 'Parse.bot CGC Comics',
    group: 'Grading',
    icon: '🏅',
    provides: ['item_details', 'cert_info', 'population_report'],
    status: 'live' as const,
    description: 'CGC Comics certificate verification, grade, label details, and population context — sandbox-only',
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
  sgc: {
    id: 'sgc',
    label: 'Parse.bot (SGC Data)',
    group: 'Grading',
    icon: '🧩',
    provides: ['item_details', 'cert_info', 'population_report'],
    status: 'live' as const,
    description: 'SGC cert details, grade, designation, population and higher-population count — powered by Parse.bot API',
  },
  pcgs: {
    id: 'pcgs',
    label: 'PCGS CoinFacts',
    group: 'Grading',
    icon: '🪙',
    provides: ['item_details', 'cert_info', 'population_report', 'current_prices'],
    status: 'live' as const,
    description: 'Official PCGS certification, population, price-guide context, images, and certification-matched Auction Prices Realized',
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
    label: 'PWCC / Fanatics Collect',
    group: 'Marketplace',
    icon: '🧩',
    provides: ['historic_prices', 'item_details'],
    status: 'live' as const,
    description: 'Read-only PWCC / Fanatics Collect sold graded-card listings via Parse.bot; dated records are research context, not a current-value average',
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
  pricecharting: {
    id: 'pricecharting',
    label: 'Parse.bot (PriceCharting)',
    group: 'Marketplace',
    icon: '🧩',
    provides: ['item_details', 'current_prices', 'historic_prices'],
    status: 'live' as const,
    description: 'Read-only Pokémon/compatible TCG, US coin, video-game UPC, and cross-category market-mover context via Parse.bot PriceCharting',
  },
  one_thirty_point: {
    id: 'one_thirty_point',
    label: 'Parse.bot (130point Sales)',
    group: 'Marketplace',
    icon: '🧩',
    provides: ['historic_prices', 'price_metrics'],
    status: 'live' as const,
    description: 'Read-only sold trading-card comps across eBay, Goldin, Heritage and more — powered by Parse.bot 130point API',
  },
  wikidata: {
    id: 'wikidata',
    label: 'Wikidata Metadata',
    group: 'Reference',
    icon: '🔎',
    provides: ['item_details'],
    status: 'live' as const,
    description: 'Read-only public metadata for Movies and Autographs; no prices, certification, or stored data',
  },
  smithsonian: {
    id: 'smithsonian',
    label: 'Smithsonian Stamp Reference',
    group: 'Reference',
    icon: '🏛️',
    provides: ['item_details'],
    status: 'live' as const,
    description: 'Read-only National Postal Museum stamp-reference metadata; no prices, certification, or stored data',
  },
  tcgdex: {
    id: 'tcgdex',
    label: 'TCGdex Pokémon Catalog',
    group: 'Reference',
    icon: '🃏',
    provides: ['item_details'],
    status: 'live' as const,
    description: 'Read-only Pokémon card identification metadata; no pricing, certification, authenticity, or stored data',
  },
  igdb: {
    id: 'igdb',
    label: 'IGDB Video Game Catalog',
    group: 'Reference',
    icon: '🕹️',
    provides: ['item_details'],
    status: 'live' as const,
    description: 'Commercially approved read-only Video Game catalog metadata; no pricing, grading, certification, authenticity, or stored data',
  },
  rawg: {
    id: 'rawg',
    label: 'RAWG Video Game Catalog',
    group: 'Reference',
    icon: '🎮',
    provides: ['item_details'],
    status: 'live' as const,
    description: 'User-approved read-only Video Game catalog metadata; no pricing, grading, certification, authenticity, or stored data',
  },
  discogs: {
    id: 'discogs',
    label: 'Discogs Music Catalog',
    group: 'Reference',
    icon: '🎵',
    provides: ['item_details'],
    status: 'live' as const,
    description: 'Read-only Discogs release metadata for Music items; no valuation, authentication, grading, or stored data',
  },
  ...PERMISSION_PENDING_SOURCE_REGISTRY,
  ...Object.fromEntries(SANDBOX_SPECIALIST_SOURCES.map((source) => [source.id, {
    id: source.id,
    label: source.label,
    group: 'Marketplace',
    icon: '🧪',
    provides: ['historic_prices', 'recent_sales'],
    status: 'live' as const,
    description: `Sandbox-authorized read-only source. Context-only until its source-specific parser and signed admission tests are complete. ${source.activationNote}`,
  }])),
};

type SourceId = string;
const SOURCE_GROUPS = ['eBay', 'Grading', 'Marketplace', 'Permission pending', 'Deferred by owner', 'Reference'] as const;

const GRADING_COMPANIES = ['CGC', 'PSA', 'BGS', 'PCGS', 'NGC', 'CBCS', 'SGC', 'HGA', 'CSG', 'Other'] as const;
type GradingCompany = typeof GRADING_COMPANIES[number];
type ItemSource = 'inventory' | 'cert';

interface SelectedItem {
  id?: number;
  title: string;
  category: string;
  itemType?: string;
  grade?: string;
  condition?: string;
  estimatedValue?: number;
  certificationCompany?: string;
  itemDetails?: string;
  artist?: string;
  releaseTitle?: string;
  manufacturer?: string;
  primaryPhotoUrl?: string;
  certId?: string;
  gradingCompany?: GradingCompany;
}

function getItemManufacturer(item: SelectedItem): string {
  if (item.manufacturer) return item.manufacturer;
  if (!item.itemDetails) return '';
  try {
    return resolveTestAiManufacturer(JSON.parse(item.itemDetails));
  } catch {
    return '';
  }
}

function isCgcCompany(company?: string | null): boolean {
  return (company ?? '').trim().toUpperCase().replace(/\s+(COMICS|CARDS)$/, '') === 'CGC';
}

// ─── Source Selector ─────────────────────────────────────────────────────────
function SourceSelector({ enabled, onChange, side, item }: {
  enabled: Set<SourceId>;
  onChange: (s: Set<SourceId>) => void;
  side: 'left' | 'right';
  item: SelectedItem | null;
}) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const applicableSourceIds = new Set<TestAiSourceId>(
    item
      ? getEligibleTestAiSources({
          category: item.category,
          gradingCompany: item.certificationCompany ?? item.gradingCompany,
          hasTitle: Boolean(item.title?.trim()),
        }).map(source => source.sourceId)
      : [],
  );
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
                const isApplicable = applicableSourceIds.has(source.id as TestAiSourceId);
                const isPermissionPending = source.status === 'permission_pending';
                const isDeferred = source.status === 'deferred';
                const isSelectable = !isPermissionPending && !isDeferred;
                const pendingTestLabel = source.liveTestStatus === 'verified'
                  ? 'item test passed'
                  : source.liveTestStatus === 'partial'
                    ? 'partial item test'
                    : source.liveTestStatus === 'no_completed_item'
                      ? 'item test blocked'
                      : source.liveTestStatus === 'deferred'
                        ? 'deferred by owner'
                        : 'permission pending';
                const sourceClassName = isDeferred
                  ? 'cursor-not-allowed border-slate-700 bg-slate-950/50 text-slate-500 opacity-65'
                  : isPermissionPending
                  ? isApplicable
                    ? 'cursor-not-allowed border-orange-500/70 bg-orange-950/30 text-orange-200 opacity-90'
                    : 'cursor-not-allowed border-orange-900/50 bg-gray-900/40 text-gray-500 opacity-70'
                  : isApplicable
                  ? isEnabled
                    ? 'bg-green-900/40 border-yellow-400 text-yellow-200 ring-1 ring-yellow-400/30'
                    : 'bg-yellow-900/20 border-yellow-400 text-yellow-200 ring-1 ring-yellow-400/20'
                  : isEnabled
                    ? isLive
                      ? 'bg-green-900/40 border-green-600 text-green-300'
                      : 'bg-indigo-900/40 border-indigo-600 text-indigo-300'
                    : 'bg-gray-800/40 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400';
                return (
                  <button
                    key={source.id}
                    onClick={() => isSelectable && toggle(source.id as SourceId)}
                    disabled={!isSelectable}
                    title={`${source.description}${isApplicable ? ' Applicable to the loaded item.' : ''}${isPermissionPending ? ' Remote lookup remains disabled.' : ''}${isDeferred ? ' It is not applicable or activatable.' : ''}`}
                    aria-label={`${source.label}${isApplicable ? ' — applicable to loaded item' : ''}${isPermissionPending ? ' — permission pending and disabled' : ''}${isDeferred ? ' — deferred by owner and disabled' : ''}`}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-all disabled:cursor-not-allowed ${sourceClassName}`}
                  >
                    <span>{source.icon}</span>
                    <span>{source.label}</span>
                    {isPermissionPending || isDeferred ? <span className="text-[9px] opacity-75">({pendingTestLabel})</span> : !isLive && <span className="text-[9px] opacity-60">(soon)</span>}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
      <p className="text-gray-600 text-[10px]">Green = live data · Blue = placeholder · Orange = permission pending, remote lookup disabled · Gray = deferred by owner and excluded · Pending labels show the last bounded public-item test{item && ' · Yellow border = applicable to loaded item'}</p>
    </div>
  );
}

// ─── Item Panel ──────────────────────────────────────────────────────────────
function ItemPanel({ side, item, onItemChange, onSourceChange, inventory, inventoryLoading, allItems, allItemsLoading }: {
  side: 'left' | 'right';
  item: SelectedItem | null;
  onItemChange: (item: SelectedItem | null) => void;
  onSourceChange: (s: Set<SourceId>) => void;
  inventory: any[];
  inventoryLoading: boolean;
  allItems: any[];
  allItemsLoading: boolean;
}) {
  const [source, setSource] = useState<ItemSource>('inventory');
  const [inventoryScope, setInventoryScope] = useState<'mine' | 'all'>('mine');
  const [certId, setCertId] = useState('');
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>('CGC');
  const [certCategory, setCertCategory] = useState('comics');
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);

  const borderColor = side === 'left' ? 'border-cyan-700/40' : 'border-amber-700/40';
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const bgColor = side === 'left' ? 'bg-cyan-900/10' : 'bg-amber-900/10';
  const label = side === 'left' ? 'ITEM A' : 'ITEM B';

  const selectableItems = inventoryScope === 'all' ? allItems : inventory;
  const selectableItemsLoading = inventoryScope === 'all' ? allItemsLoading : inventoryLoading;

  const handleInventorySelect = (id: number) => {
    setSelectedInventoryId(id);
    const found = selectableItems.find((i: any) => i.id === id);
    if (found) onItemChange(normalizeTestAiSelectedItem(found));
    else onItemChange(null);
  };

  const handleCertSubmit = () => {
    if (!certId.trim()) { toast.error('Enter a certificate ID'); return; }
    onItemChange({
      title: `${gradingCompany} Cert #${certId}`,
      category: certCategory,
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
              // Clear sources when switching modes; sources must be explicitly selected by the tester.
              if (s === 'cert') onSourceChange(new Set());
              else onSourceChange(new Set());
              onItemChange(null);
              setCertId('');
              setSelectedInventoryId(null);
            }}
              className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${source === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {s === 'inventory' ? 'Items' : 'Cert ID'}
            </button>
          ))}
        </div>
      </div>

      {source === 'inventory' ? (
        <div className="space-y-2">
          <div className="flex gap-1 rounded-md border border-gray-700/60 bg-gray-900/50 p-1" role="group" aria-label="Item source scope">
            {(['mine', 'all'] as const).map(scope => (
              <button
                key={scope}
                type="button"
                onClick={() => { setInventoryScope(scope); setSelectedInventoryId(null); onItemChange(null); }}
                className={`flex-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors ${inventoryScope === scope ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {scope === 'mine' ? 'My Inventory' : 'All Public Items'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500">All Public Items includes active listings from members who allow public profile visibility.</p>
          {selectableItemsLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Spinner className="w-4 h-4" /> Loading...</div>
          ) : (
            <select value={selectedInventoryId ?? ''} onChange={e => handleInventorySelect(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none">
              <option value="">— Select an item —</option>
              {selectableItems.map((i: any) => (
                <option key={i.id} value={i.id}>
                  {i.title}{inventoryScope === 'all' && i.ownerDisplayName ? ` — ${i.ownerDisplayName}` : ''}{i.grade ? ` (Grade ${formatGrade(i.grade)})` : ''}{i.estimatedValue != null ? ` — ${formatItemValue(i.estimatedValue)}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <select value={certCategory} onChange={e => setCertCategory(e.target.value)} aria-label="Certificate category"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none">
            <option value="comics">Comics</option><option value="sports_cards">Sports Cards</option><option value="pokemon">Pokémon</option><option value="coins">Coins</option>
          </select>
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
              {item.category && item.category !== 'unknown' && <Badge variant="secondary" className="bg-slate-700/80 text-[10px] text-slate-100 border-slate-500/70">{item.category.replace(/_/g, ' ')}</Badge>}
              {getItemManufacturer(item) && <Badge variant="outline" className="bg-slate-900/70 text-[10px] text-slate-100 border-slate-400/80">{getItemManufacturer(item)}</Badge>}
              {item.grade && <Badge variant="outline" className="bg-slate-900/70 text-[10px] text-slate-100 border-slate-400/80">Grade {formatGrade(item.grade)}</Badge>}
              {item.certificationCompany && <Badge variant="outline" className="bg-slate-900/70 text-[10px] text-slate-100 border-slate-400/80">{item.certificationCompany}</Badge>}
            </div>
            {item.estimatedValue != null && <p className="text-green-400 text-sm font-semibold mt-1">{formatItemValue(item.estimatedValue)}</p>}
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
  const [showVisualReview, setShowVisualReview] = useState(false);
  const { data, isLoading } = trpc.testAI.getSoldCompsData.useQuery(
    { title: item.title, category: item.category, itemType: item.itemType, grade: item.grade ?? undefined, condition: item.condition ?? undefined, certificationCompany: item.certificationCompany ?? '', itemDetails: item.itemDetails ?? undefined, imageUrl: item.primaryPhotoUrl },
    { enabled: !!item.title && item.category !== 'unknown' }
  );
  const auditLedger = data?.audit?.ledger ?? [];
  const visualReviewRows = (data?.listings ?? []).map((listing: any, index: number) => ({ listing, index })).filter(({ listing }: { listing: any }) => listing.visualReviewStatus && listing.visualReviewStatus !== 'not_reviewed');
  const visualMismatchRows = visualReviewRows.filter(({ listing }: { listing: any }) => listing.visualReviewStatus === 'mismatch');

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>💰 Sold-Comps — eBay Sold History</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Data type: Completed eBay sales · Up to 90 days history</p>
      {data?.error && <p className="text-red-400 text-xs">{data.error}</p>}
      {data?.visualFilter?.note && <p className="rounded bg-cyan-950/30 border border-cyan-700/30 px-2 py-1 text-[10px] text-cyan-200">{data.visualFilter.note}</p>}
      {data?.visualFilter && <div className="flex items-center justify-between gap-2 rounded border border-cyan-700/30 bg-cyan-950/20 p-2">
        <div className="min-w-0"><p className="text-[10px] font-semibold text-cyan-100">AI image review: {visualReviewRows.length} candidate image{visualReviewRows.length === 1 ? '' : 's'} reviewed</p><p className="text-[9px] text-cyan-200/80">{visualMismatchRows.length} visual mismatch flag{visualMismatchRows.length === 1 ? '' : 's'} · flags are retained for review, not silently deleted</p></div>
        <button type="button" onClick={() => setShowVisualReview((visible) => !visible)} className="shrink-0 rounded bg-cyan-800/70 px-2 py-1 text-[9px] font-semibold text-white hover:bg-cyan-700">{showVisualReview ? 'Hide image checks' : 'View image checks'}</button>
      </div>}
      {showVisualReview && data?.visualFilter && <div className="rounded border border-cyan-700/30 bg-gray-950/50 p-2 space-y-2">
        <p className="text-[9px] text-gray-400">The AI compares the target image with sold thumbnails. A mismatch is an advisory flag; the sold record remains visible and cannot affect valuation until identity review is resolved.</p>
        {visualReviewRows.length === 0 ? <p className="text-[10px] text-gray-500">No candidate images received a decisive visual result. Missing or unreadable images are retained.</p> : <div className="max-h-64 space-y-1 overflow-y-auto">{visualReviewRows.map(({ listing, index }: { listing: any; index: number }) => <div key={`${listing.saleId || listing.itemUrl || listing.title}-${index}`} className="flex items-start gap-2 rounded bg-gray-900/70 p-1.5"><div className="flex shrink-0 gap-1">{item.primaryPhotoUrl && <img src={item.primaryPhotoUrl} alt="Target item" className="h-10 w-10 rounded object-cover" />} {listing.imageUrl && <img src={listing.imageUrl} alt="Sold candidate" className="h-10 w-10 rounded object-cover" />}</div><div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className={`flex min-w-0 items-center gap-1 text-[9px] font-semibold ${listing.visualReviewStatus === 'mismatch' ? 'text-red-300' : listing.visualReviewStatus === 'match' || listing.visualReviewStatus === 'rough_match' ? 'text-emerald-300' : 'text-amber-300'}`}><span aria-label={listing.visualReviewStatus === 'mismatch' ? 'Not accepted due to image mismatch' : listing.visualReviewStatus === 'match' || listing.visualReviewStatus === 'rough_match' ? 'Accepted visual match' : 'Needs image review'} className="text-sm leading-none">{listing.visualReviewStatus === 'mismatch' ? '✕' : listing.visualReviewStatus === 'match' || listing.visualReviewStatus === 'rough_match' ? '✓' : '?'}</span><span>{String(listing.visualReviewStatus).replace(/_/g, ' ')}</span></p><span className="shrink-0 text-[10px] font-semibold text-white">{formatVisualReviewPrice(listing)}</span></div><p className="text-[8px] text-gray-400">{listing.visualReviewRationale || 'No additional visual rationale supplied.'}</p><p className="truncate text-[9px] text-gray-300">{listing.title}</p><p className="text-[8px] text-gray-500">{listing.visualReviewStatus === 'mismatch' ? 'Not accepted for valuation — flagged for manual review and retained in evidence ledger' : listing.visualReviewStatus === 'rough_match' ? 'Accepted as a rough visual match — retained for review' : listing.visualReviewStatus === 'match' ? 'Accepted visual match' : 'Needs image review — retained candidate'}</p></div></div>)}</div>}
      </div>}
      {data?.audit && <div className="rounded border border-violet-700/30 bg-violet-950/20 p-2 text-[10px] text-violet-100">
        <p className="font-semibold">Evidence coverage — {data.audit.rawReceived} unique candidates across {data.audit.retrievalCoverage?.length ?? 0} query tier{data.audit.retrievalCoverage?.length === 1 ? '' : 's'}</p>
        <p className="mt-0.5 text-violet-200/90">{data.audit.valuationEligible} valuation-eligible · {data.audit.warningReview} retained for review · {data.audit.objectiveConflicts} objective conflicts retained in the audit ledger · {data.audit.notVisuallyReviewed} not visually reviewed</p>
      </div>}
      {data?.metrics && (
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          {[
            { label: 'Avg Sold', value: formatWholeDollar(data.metrics.avg) },
            { label: 'Median', value: formatWholeDollar(data.metrics.median) },
            { label: 'Range', value: `${formatWholeDollar(data.metrics.min)}–${formatWholeDollar(data.metrics.max)}` },
            { label: 'Confidence', value: data.metrics.confidence.toUpperCase() },
          ].map(m => (
            <div key={m.label} className="bg-gray-900/40 rounded p-1.5 text-center">
              <p className="text-gray-500 text-[9px] uppercase mb-0.5">{m.label}</p>
              <p className={`font-semibold ${m.label === 'Confidence' ? (data.metrics!.confidence === 'high' ? 'text-green-400' : data.metrics!.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400') : 'text-white'}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}
      {data?.query && <p className="text-gray-500 text-[10px]">Query: <span className="font-mono text-gray-400">"{data.query}"</span> · {data.listings.length} retained candidates</p>}
      {data?.listings && data.listings.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {data.listings.map((l: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-gray-700/20 last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                {l.imageUrl && <img src={l.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />}
                <div className="min-w-0">
                  <a href={l.itemUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline truncate block">{l.title}</a>
                  <p className="text-[10px] text-gray-500">{l.condition} · {l.endedAt ? `Sold ${l.endedAt}` : ''}</p>
                  <p className={`text-[9px] ${l.evidenceDisposition === 'valuation_eligible' ? 'text-emerald-300' : 'text-amber-300'}`}>{l.evidenceDisposition === 'valuation_eligible' ? 'Completed-sale candidate — valuation eligible' : `Retained for review — ${(l.evidenceReasons ?? ['identity evidence incomplete']).join('; ')}`}</p>
                </div>
              </div>
              <p className="text-green-400 font-semibold text-sm flex-shrink-0">{formatWholeDollar(l.price)}</p>
            </div>
          ))}
        </div>
      )}
      {auditLedger.length > 0 && <details className="rounded border border-gray-700/30 bg-gray-950/35 p-2"><summary className="cursor-pointer text-[10px] font-semibold text-gray-300">Evidence ledger ({auditLedger.length}) — retained, review, and objective-conflict records</summary><div className="mt-2 max-h-64 space-y-1 overflow-y-auto">{auditLedger.map((row: any, index: number) => <div key={`${row.saleId || row.itemUrl || row.title}-${index}`} className="rounded bg-gray-900/60 p-1.5 text-[9px]"><p className="truncate font-semibold text-gray-200">{row.title || 'Untitled record'}</p><p className={row.evidenceDisposition === 'valuation_eligible' ? 'text-emerald-300' : row.evidenceDisposition === 'rejected_objective_conflict' ? 'text-red-300' : 'text-amber-300'}>{String(row.evidenceDisposition || 'warning_review').replace(/_/g, ' ')}</p><p className="mt-0.5 text-gray-500">{(row.evidenceReasons ?? []).join('; ') || 'No additional warning supplied.'}</p></div>)}</div></details>}
      {data && !data.listings.length && !data.error && <p className="text-gray-500 text-xs">No sold listings found.</p>}
    </div>
  );
}

function formatVisualReviewPrice(listing: any): string {
  const rawPrice = listing?.price ?? listing?.soldPrice ?? listing?.salePrice ?? listing?.currentPrice ?? listing?.current_price;
  const price = typeof rawPrice === 'object' ? rawPrice?.value : rawPrice;
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 'Price unavailable';
  const currency = String(listing?.currency ?? listing?.soldCurrency ?? rawPrice?.currency ?? 'USD').toUpperCase();
  return currency === 'USD' ? formatWholeDollar(numericPrice) : `${currency} ${numericPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function MarketplaceVisualReview({ data, targetImageUrl, sourceLabel, open: controlledOpen, onOpenChange }: { data: any; targetImageUrl?: string | null; sourceLabel: string; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const candidates = data?.visualReviewListings ?? data?.listings ?? data?.sales ?? data?.data?.items ?? [];
  const reviewed = candidates.map((listing: any, index: number) => ({ listing, index })).filter(({ listing }: { listing: any }) => listing.visualReviewStatus);
  const mismatches = reviewed.filter(({ listing }: { listing: any }) => listing.visualReviewStatus === 'mismatch');
  if (!data?.visualFilter) return null;
  return <div className="rounded border border-cyan-700/30 bg-cyan-950/20 p-2 space-y-2">
    <div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-semibold text-cyan-100">AI image review — {sourceLabel}</p><p className="text-[9px] text-cyan-200/80">{data.visualFilter.reviewedCount ?? reviewed.length} reviewed · {mismatches.length} mismatch flag{mismatches.length === 1 ? '' : 's'} · retained for review</p></div><button type="button" onClick={() => setOpen(!open)} className="shrink-0 rounded bg-cyan-800/70 px-2 py-1 text-[9px] font-semibold text-white hover:bg-cyan-700">{open ? 'Hide image checks' : 'View image checks'}</button></div>
    {data.visualFilter.note && <p className="text-[9px] text-cyan-200/80">{data.visualFilter.note}</p>}
      {open && <div className="space-y-1.5">{reviewed.length === 0 ? <p className="text-[10px] text-gray-500">No decisive image result was returned. Candidates remain retained.</p> : <div className="max-h-56 space-y-1 overflow-y-auto">{reviewed.map(({ listing, index }: { listing: any; index: number }) => { const accepted = listing.visualReviewStatus === 'match' || listing.visualReviewStatus === 'rough_match'; const mismatch = listing.visualReviewStatus === 'mismatch'; return <div key={`${listing.id || listing.saleId || listing.url || listing.title}-${index}`} className="flex items-start gap-2 rounded bg-gray-900/70 p-1.5"><div className="flex shrink-0 gap-1">{targetImageUrl && <img src={targetImageUrl} alt="Target item" className="h-9 w-9 rounded object-cover" />} {(listing.imageUrl || listing.thumbnailUrl) && <img src={listing.imageUrl || listing.thumbnailUrl} alt="Marketplace candidate" className="h-9 w-9 rounded object-cover" />}</div><div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className={`flex min-w-0 items-center gap-1 text-[9px] font-semibold ${mismatch ? 'text-red-300' : accepted ? 'text-emerald-300' : 'text-amber-300'}`}><span aria-label={mismatch ? 'Not accepted due to image mismatch' : accepted ? 'Accepted visual match' : 'Needs image review'} className="text-sm leading-none">{mismatch ? '✕' : accepted ? '✓' : '?'}</span><span>{String(listing.visualReviewStatus).replace(/_/g, ' ')}</span></p><span className="shrink-0 text-[10px] font-semibold text-white">{formatVisualReviewPrice(listing)}</span></div><p className="text-[8px] text-gray-400">{listing.visualReviewRationale || 'No additional visual rationale supplied.'}</p><p className="truncate text-[9px] text-gray-300">{listing.title || 'Untitled marketplace candidate'}</p><p className="text-[8px] text-gray-500">{mismatch ? 'Not accepted for valuation — retained for manual review' : accepted ? 'Accepted visual match' : 'Unresolved — retained candidate'}</p></div></div>; })}</div>}</div>}
  </div>;
}

// ─── eBay Active Listings Section ────────────────────────────────────────────
function EbayActiveSection({ item, side, data, isLoading }: { item: SelectedItem; side: 'left' | 'right'; data: any; isLoading: boolean }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const [reviewRequested, setReviewRequested] = useState(false);
  const [showVisualMatchMetrics, setShowVisualMatchMetrics] = useState(false);
  const visualReviewQuery = trpc.testAI.getEbayData.useQuery(
    { title: item.title, category: item.category, itemType: item.itemType, grade: item.grade ?? undefined, condition: item.condition ?? undefined, certificationCompany: item.certificationCompany ?? '', itemDetails: item.itemDetails ?? undefined, imageUrl: item.primaryPhotoUrl, includeVisualReview: true },
    { enabled: reviewRequested && !!item.title && item.category !== 'unknown' },
  );
  useEffect(() => {
    setReviewRequested(false);
    setShowVisualMatchMetrics(false);
  }, [item.id, item.title]);
  const visualReviewData = visualReviewQuery.data;
  // A failed optional review must never replace already-loaded asking-price
  // context with an empty/error response.
  const displayData = visualReviewData && !visualReviewData.error ? visualReviewData : data;
  // Image review changes the displayed asking-price summary as soon as its
  // response arrives. Opening the detail drawer is no longer required.
  const showingVisualMatchMetrics = !!visualReviewData?.visualMatchMetrics;
  const visibleMetrics = showingVisualMatchMetrics ? visualReviewData.visualMatchMetrics : data?.metrics;
  const visualMatchCount = visualReviewData?.visualMatchMetrics?.count ?? 0;

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🛒 eBay Active Listings</p>
        {(isLoading || visualReviewQuery.isLoading) && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Data type: Current fixed-price listings · {showingVisualMatchMetrics ? 'Visual-match-only asking-price metrics' : 'Full-market asking-price context'}</p>
      {data?.error && <p className="text-red-400 text-xs">{data.error}</p>}
      {visualReviewData?.error && <p className="rounded border border-red-700/30 bg-red-950/20 px-2 py-1 text-[10px] text-red-300">AI image checks could not complete: {visualReviewData.error}</p>}
      {visualReviewData?.visualFilter?.note && <p className="rounded bg-cyan-950/30 border border-cyan-700/30 px-2 py-1 text-[10px] text-cyan-200">{visualReviewData.visualFilter.note}</p>}
      {visualReviewData?.visualFilter && !visualReviewData?.visualMatchMetrics && <p className="rounded border border-amber-700/30 bg-amber-950/20 px-2 py-1 text-[10px] text-amber-200">No accepted visual matches have usable prices, so the full-market asking context remains shown.</p>}
      {visibleMetrics && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-4 gap-2 text-[11px]">
            {[
              { label: showingVisualMatchMetrics ? 'Avg Match' : 'Avg', value: formatWholeDollar(visibleMetrics.avg) },
              { label: showingVisualMatchMetrics ? 'Median Match' : 'Median', value: formatWholeDollar(visibleMetrics.median) },
              { label: showingVisualMatchMetrics ? 'Match Range' : 'Range', value: `${formatWholeDollar(visibleMetrics.min)}–${formatWholeDollar(visibleMetrics.max)}` },
              { label: 'Confidence', value: visibleMetrics.confidence.toUpperCase() },
            ].map(m => (
              <div key={m.label} className="bg-gray-900/40 rounded p-1.5 text-center">
                <p className="text-gray-500 text-[9px] uppercase mb-0.5">{m.label}</p>
                <p className={`font-semibold ${m.label === 'Confidence' ? (visibleMetrics.confidence === 'high' ? 'text-green-400' : visibleMetrics.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400') : 'text-white'}`}>{m.value}</p>
              </div>
            ))}
          </div>
          {visibleMetrics.confidenceReason && <p className="rounded border border-slate-700/50 bg-slate-950/35 px-2 py-1.5 text-[9px] leading-snug text-slate-300"><strong className="text-slate-100">Confidence reason:</strong> {visibleMetrics.confidenceReason}</p>}
        </div>
      )}
      {showingVisualMatchMetrics && <p className="text-[9px] text-emerald-300">✓ Using {visualMatchCount} visually accepted, priced listing{visualMatchCount === 1 ? '' : 's'} only. Red-X mismatches and unresolved images are excluded from these figures.</p>}
      {showingVisualMatchMetrics && data?.metrics && <p className="text-[9px] text-slate-400">Full-market asking context before image filtering: Avg {formatWholeDollar(data.metrics.avg)} · Median {formatWholeDollar(data.metrics.median)} · Range {formatWholeDollar(data.metrics.min)}–{formatWholeDollar(data.metrics.max)}.</p>}
      {data && !data.error && !reviewRequested && <div className="rounded border border-cyan-700/30 bg-cyan-950/20 p-2"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-semibold text-cyan-100">Optional AI image checks</p><p className="text-[9px] text-cyan-200/80">Current listings load first. Image review is a separate, bounded check; accepted visual matches update this asking-price context, not completed-sale valuation evidence.</p></div><button type="button" onClick={() => setReviewRequested(true)} className="shrink-0 rounded bg-cyan-800/70 px-2 py-1 text-[9px] font-semibold text-white hover:bg-cyan-700">Run image checks</button></div></div>}
      {reviewRequested && visualReviewQuery.isLoading && <p className="rounded border border-cyan-700/30 bg-cyan-950/20 px-2 py-1.5 text-[10px] text-cyan-100">AI image checks are running separately. Current asking-price listings remain available below.</p>}
      {visualReviewData?.visualFilter && <MarketplaceVisualReview data={visualReviewData} targetImageUrl={item.primaryPhotoUrl} sourceLabel="eBay active listings" open={showVisualMatchMetrics} onOpenChange={setShowVisualMatchMetrics} />}
      {displayData?.query && <p className="text-gray-500 text-[10px]">Query: <span className="font-mono text-gray-400">"{displayData.query}"</span> · {displayData.listings.length} results · {displayData.debug?.queryTierCount ?? 0} bounded query tier{displayData.debug?.queryTierCount === 1 ? '' : 's'}</p>}
      {displayData?.listings && displayData.listings.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {displayData.listings.map((l: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-gray-700/20 last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                {l.imageUrl && <img src={l.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />}
                <div className="min-w-0">
                  <a href={l.itemUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline truncate block">{l.title}</a>
                  <p className="text-[10px] text-gray-500">{l.condition} · {l.seller}</p>
                  {l.visualReviewStatus === 'mismatch' && <p className="mt-0.5 flex items-start gap-1 text-[9px] leading-snug text-red-300"><span className="shrink-0 font-bold" aria-label="Image mismatch">✕</span><span><strong>Image mismatch:</strong> {l.visualReviewRationale || 'The candidate image does not match the target item identity.'}</span></p>}
                </div>
              </div>
              <p className="text-green-400 font-semibold text-sm flex-shrink-0">{formatWholeDollar(l.price)}</p>
            </div>
          ))}
        </div>
      )}
      {displayData && !displayData.listings.length && !displayData.error && <p className="text-gray-500 text-xs">No listings found.</p>}
    </div>
  );
}

// ─── HIPStamp Active Listings Section ────────────────────────────────────────
function HipstampSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category.trim().toLowerCase().replace(/[_-]+/g, ' ') === 'stamps';
  const formatHipstampPrice = (value: number) => Number.isInteger(value) ? formatWholeDollar(value) : `$${value.toFixed(2)}`;
  const { data, isLoading } = trpc.testAI.getHipstampData.useQuery(
    { title: item.title, category: item.category, itemType: item.itemType, grade: item.grade ?? undefined, condition: item.condition ?? undefined, certificationCompany: item.certificationCompany ?? '', itemDetails: item.itemDetails ?? undefined, imageUrl: item.primaryPhotoUrl },
    { enabled: supported && !!item.title },
  );

  if (!supported) return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>✉️ HIPStamp Active Listings</p>
      <p className="text-gray-500 text-[10px]">This authorized read-only source is available for Stamps items only.</p>
    </div>
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>✉️ HIPStamp Active Listings</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Authorized read-only current asking prices and supply context · USD metrics only · never completed-sale evidence</p>
      {data?.error && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.error}</p>}
      {data?.visualFilter?.note && <p className="rounded border border-cyan-700/30 bg-cyan-950/30 p-2 text-[10px] text-cyan-200">{data.visualFilter.note}</p>}
      {data?.metrics && (
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          {[
            { label: 'Avg Ask', value: formatHipstampPrice(data.metrics.avg) },
            { label: 'Median', value: formatHipstampPrice(data.metrics.median) },
            { label: 'Range', value: `${formatHipstampPrice(data.metrics.min)}–${formatHipstampPrice(data.metrics.max)}` },
            { label: 'Confidence', value: data.metrics.confidence.toUpperCase() },
          ].map((metric) => (
            <div key={metric.label} className="bg-gray-900/40 rounded p-1.5 text-center">
              <p className="text-gray-500 text-[9px] uppercase mb-0.5">{metric.label}</p>
              <p className={`font-semibold ${metric.label === 'Confidence' ? (data.metrics!.confidence === 'high' ? 'text-green-400' : data.metrics!.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400') : 'text-white'}`}>{metric.value}</p>
            </div>
          ))}
        </div>
      )}
      <MarketplaceVisualReview data={data} targetImageUrl={item.primaryPhotoUrl} sourceLabel="HIPStamp active listings" />
      {data?.query && <p className="text-gray-500 text-[10px]">Query: <span className="font-mono text-gray-400">"{data.query}"</span> · {data.listings.length} shown · {data.debug?.totalFetched ?? 0} fetched</p>}
      {data?.debug?.targetFormat && <p className="text-cyan-200 text-[10px]">Comparable format: <strong>{data.debug.targetFormat.label}</strong>{(data.debug.formatExcluded ?? 0) > 0 ? ` · ${data.debug.formatExcluded} format-mismatched listing${data.debug.formatExcluded === 1 ? '' : 's'} excluded` : ''}</p>}
      {data?.debug && data.debug.nonUsdListings > 0 && <p className="text-gray-500 text-[10px]">{data.debug.nonUsdListings} non-USD listing{data.debug.nonUsdListings === 1 ? '' : 's'} excluded from USD metrics.</p>}
      {data?.listings && data.listings.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {data.listings.map((listing: any) => (
            <div key={listing.id || `${listing.title}-${listing.price}`} className="flex items-center justify-between gap-2 py-1 border-b border-gray-700/20 last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                {listing.imageUrl && <img src={listing.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />}
                <div className="min-w-0">
                  <a href={listing.itemUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline truncate block">{listing.title}</a>
                  <p className="text-[10px] text-gray-500">{[listing.country, listing.catalogNumber, listing.condition, listing.seller].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <p className="text-green-400 font-semibold text-sm flex-shrink-0">{listing.currency} {formatHipstampPrice(listing.price)}</p>
            </div>
          ))}
        </div>
      )}
      {data && !data.listings.length && !data.error && <p className="text-gray-500 text-xs">No HIPStamp listings matched the selected stamp identity.</p>}
    </div>
  );
}

// ─── HIPStamp Sold / Closed Listings Section ─────────────────────────────────
function HipstampSoldSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category.trim().toLowerCase().replace(/[_-]+/g, ' ') === 'stamps';
  const formatPrice = (value: number) => Number.isInteger(value) ? formatWholeDollar(value) : `$${value.toFixed(2)}`;
  const { data, isLoading } = trpc.testAI.getHipstampSoldData.useQuery(
    { title: item.title, category: item.category, itemType: item.itemType, grade: item.grade ?? undefined, condition: item.condition ?? undefined, certificationCompany: item.certificationCompany ?? '', itemDetails: item.itemDetails ?? undefined, imageUrl: item.primaryPhotoUrl },
    { enabled: supported && !!item.title },
  );

  if (!supported) return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>✅ HIPStamp Sold / Closed</p>
      <p className="text-gray-500 text-[10px]">This store-scoped sold source is available for Stamps items only.</p>
    </div>
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>✅ HIPStamp Sold / Closed Listings</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Closed listings marked sold · store-scoped discovery · not a marketplace-wide sales history</p>
      {data?.error && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.error}</p>}
      {data?.metrics && (
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          {[
            { label: 'Avg Sold', value: formatPrice(data.metrics.avg) },
            { label: 'Median', value: formatPrice(data.metrics.median) },
            { label: 'Range', value: `${formatPrice(data.metrics.min)}–${formatPrice(data.metrics.max)}` },
            { label: 'Confidence', value: data.metrics.confidence.toUpperCase() },
          ].map((metric) => <div key={metric.label} className="bg-gray-900/40 rounded p-1.5 text-center"><p className="text-gray-500 text-[9px] uppercase mb-0.5">{metric.label}</p><p className="font-semibold text-white">{metric.value}</p></div>)}
        </div>
      )}
      <MarketplaceVisualReview data={data} targetImageUrl={item.primaryPhotoUrl} sourceLabel="HIPStamp sold / closed listings" />
      {data?.query && <p className="text-gray-500 text-[10px]">Query: <span className="font-mono text-gray-400">"{data.query}"</span> · {data.listings.length} shown · {data.debug?.totalFetched ?? 0} fetched · {data.debug?.storesQueried ?? 0} stores queried</p>}
      {data?.debug?.targetFormat && <p className="text-cyan-200 text-[10px]">Comparable format: <strong>{data.debug.targetFormat.label}</strong>{(data.debug.formatExcluded ?? 0) > 0 ? ` · ${data.debug.formatExcluded} format-mismatched sold listing${data.debug.formatExcluded === 1 ? '' : 's'} excluded` : ''}</p>}
      {data?.debug && data.debug.nonUsdListings > 0 && <p className="text-gray-500 text-[10px]">{data.debug.nonUsdListings} non-USD sold listing{data.debug.nonUsdListings === 1 ? '' : 's'} excluded from USD metrics.</p>}
      {data?.visualFilter?.note && <p className="rounded border border-cyan-700/30 bg-cyan-950/30 p-2 text-[10px] text-cyan-200">{data.visualFilter.note}</p>}
      {data?.listings?.length ? <div className="space-y-1 max-h-48 overflow-y-auto">{data.listings.map((listing: any) => <div key={listing.id || `${listing.title}-${listing.price}`} className="flex items-center justify-between gap-2 py-1 border-b border-gray-700/20 last:border-b-0"><div className="flex items-center gap-2 min-w-0">{listing.imageUrl && <img src={listing.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />}<div className="min-w-0"><a href={listing.itemUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline truncate block">{listing.title}</a><p className="text-[10px] text-gray-500">{[listing.country, listing.catalogNumber, listing.condition, listing.storeUsername].filter(Boolean).join(' · ')}</p></div></div><p className="text-green-400 font-semibold text-sm flex-shrink-0">{listing.currency} {formatPrice(listing.price)}</p></div>)}</div> : data && !data.error ? <p className="text-gray-500 text-xs">No store-scoped HIPStamp sold listings matched the selected stamp identity.</p> : null}
    </div>
  );
}

// ─── PSA Population Report Section ──────────────────────────────────────────
function CgcComicsSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const [effectiveCertId, setEffectiveCertId] = useState(item.certId || '');
  const [ocrReview, setOcrReview] = useState<{ certId: string | null; gradingCompany: string | null; confidence: string; evidence: string; needsReview: boolean } | null>(null);
  useEffect(() => { setEffectiveCertId(item.certId || ''); setOcrReview(null); }, [item.certId, item.primaryPhotoUrl]);
  const readCertMutation = trpc.testAI.readCertificationFromImage.useMutation({ onSuccess: (result) => { if (result.status === 'success') { setOcrReview(result.data); if (result.data.certId && result.data.confidence !== 'low') setEffectiveCertId(result.data.certId); } } });
  const { data, isLoading } = trpc.testAI.getCgcComicsData.useQuery(
    { certNumber: effectiveCertId },
    { enabled: item.category.toLowerCase().replace(/[_-]+/g, ' ') === 'comics' && isCgcCompany(item.gradingCompany) && !!effectiveCertId },
  );
  if (!effectiveCertId) return <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 CGC Comics Report</p><p className="text-gray-500 text-[10px]">No certificate ID is stored on this listing. The source cannot query Parse.bot until an ID is available.</p>{item.primaryPhotoUrl && <button type="button" onClick={() => readCertMutation.mutate({ imageUrl: item.primaryPhotoUrl!, category: item.category, expectedCompany: item.gradingCompany })} disabled={readCertMutation.isPending} className="rounded bg-indigo-600 px-2 py-1 text-[10px] text-white disabled:opacity-50">{readCertMutation.isPending ? 'Reading label…' : 'Read certificate ID from image'}</button>}{readCertMutation.data?.status === 'error' && <p className="text-red-400 text-[10px]">{readCertMutation.data.message}</p>}{ocrReview && <p className="text-gray-400 text-[10px]">{ocrReview.evidence} {ocrReview.certId ? `Candidate ID: ${ocrReview.certId} (${ocrReview.confidence} confidence).` : 'No readable ID was found.'}</p>}</div>;
  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 CGC Comics Report (Parse.bot)</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">Read-only sandbox evidence for certificate {effectiveCertId}: identity, grade, label details, and population context.</p>
    {data?.status === 'error' && <div className="bg-red-900/20 border border-red-700/30 rounded p-2"><p className="text-red-400 text-[10px]">{data.message}</p></div>}
    {data?.status === 'success' && data.data && <div className="space-y-2">
      <div className="bg-gray-900/40 rounded p-2 space-y-1"><p className="text-white text-[12px] font-semibold">{String(data.data.title || 'Title unavailable')}{data.data.issueNumber ? ` #${String(data.data.issueNumber)}` : ''}</p><p className="text-gray-400 text-[10px]">{[data.data.year, data.data.publisher, data.data.variant].filter(Boolean).map(String).join(' · ') || 'Issue metadata unavailable'}</p><div className="grid grid-cols-3 gap-2 text-[10px] mt-2"><div><p className="text-gray-500 text-[9px] uppercase">Grade</p><p className="text-cyan-300 font-bold text-[13px]">{String(data.data.grade || 'N/A')}</p></div><div><p className="text-gray-500 text-[9px] uppercase">Label</p><p className="text-gray-200">{String(data.data.labelCategory || 'N/A')}</p></div><div><p className="text-gray-500 text-[9px] uppercase">Pages</p><p className="text-gray-200">{String(data.data.pageQuality || 'N/A')}</p></div></div></div>
      <div className="bg-gray-900/40 rounded p-2"><p className="text-gray-400 text-[10px] font-semibold uppercase">Population context</p><p className="text-gray-500 text-[9px] mt-1">Total graded: <span className="text-white">{typeof data.data.population.total === 'number' ? data.data.population.total.toLocaleString() : String(data.data.population.total || 'Unavailable')}</span></p>{data.data.population.gradeCounts.length > 0 && <div className="grid grid-cols-2 gap-1 mt-2">{data.data.population.gradeCounts.map((entry: any, index: number) => { const gradeMap = entry.grades && typeof entry.grades === 'object' ? entry.grades : {}; const rowTotal = entry.count ?? entry.total ?? Object.values(gradeMap).reduce((sum: number, value: any) => sum + (Number(value) || 0), 0); return <div key={index} className="rounded bg-gray-800/60 px-1.5 py-1 text-[9px] text-gray-300">{String(entry.label || entry.category || entry.grade || entry.name || `Grade ${index + 1}`)}: <span className="text-white">{String(rowTotal || '—')}</span></div>; })}</div>}</div>
      {Boolean(data.data.keyComments || data.data.artComments) && <p className="text-[9px] text-violet-200">{[data.data.keyComments, data.data.artComments].filter(Boolean).map(String).join(' · ')}</p>}
      <p className="text-[9px] text-gray-600">Population is context only; completed sales remain authoritative valuation evidence.</p>
    </div>}
  </div>;
}

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
                  <p className="text-green-400 font-semibold text-[11px] flex-shrink-0">{formatWholeDollar(sale.price)}</p>
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

function SgcSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading } = trpc.testAI.getSgcData.useQuery(
    { certNumber: item.certId || '' },
    { enabled: !!item.certId },
  );

  if (!item.certId) return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 Parse.bot (SGC Data)</p>
      <p className="text-gray-500 text-[10px]">Enter an SGC certification number to retrieve its grading and population details.</p>
    </div>
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 SGC Certification (via Parse.bot)</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Read-only cert details, grade, designation, and population data</p>
      {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
      {data?.status === 'success' && data.data && (
        <div className="space-y-2 rounded bg-gray-900/40 p-2">
          <p className="text-[12px] font-semibold text-white">{data.data.subject || data.data.description || 'SGC certified item'}</p>
          <p className="text-[10px] text-gray-400">{[data.data.cardSet, data.data.cardNumber, data.data.sport].filter(Boolean).join(' · ') || 'Item details not provided'}</p>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div><p className="text-[9px] uppercase text-gray-500">Grade</p><p className="font-bold text-cyan-300">{data.data.grade || 'N/A'}</p></div>
            <div><p className="text-[9px] uppercase text-gray-500">Designation</p><p className="font-semibold text-white">{data.data.gradeDesignation || 'N/A'}</p></div>
            <div><p className="text-[9px] uppercase text-gray-500">Population</p><p className="font-semibold text-white">{data.data.population ?? 'N/A'}</p></div>
            <div><p className="text-[9px] uppercase text-gray-500">Higher</p><p className="font-semibold text-white">{data.data.popHigher ?? 'N/A'}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

function PcgsSection({ item, side, auctionData, auctionLoading }: { item: SelectedItem; side: 'left' | 'right'; auctionData?: any; auctionLoading?: boolean }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading } = trpc.testAI.getPcgsData.useQuery(
    { certNumber: item.certId || '' },
    { enabled: !!item.certId && item.gradingCompany === 'PCGS' },
  );

  if (!item.certId || item.gradingCompany !== 'PCGS') return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🪙 PCGS CoinFacts</p>
      <p className="text-gray-500 text-[10px]">Enter a 7- or 8-digit PCGS certification number to retrieve official coin details.</p>
    </div>
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🪙 PCGS CoinFacts</p>
        {(isLoading || auctionLoading) && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Official read-only certification, population, and price-guide data</p>
      {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
      {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-300">{data.message}</p>}
      {data?.status === 'success' && data.data && (
        <div className="space-y-2 rounded bg-gray-900/40 p-2">
          <p className="text-[12px] font-semibold text-white">{data.data.name || 'PCGS certified coin'}</p>
          <p className="text-[10px] text-gray-400">{[data.data.year, data.data.denomination, data.data.variety].filter(Boolean).join(' · ') || 'Coin details not provided'}</p>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div><p className="text-[9px] uppercase text-gray-500">Grade</p><p className="font-bold text-cyan-300">{data.data.grade || 'N/A'}</p></div>
            <div><p className="text-[9px] uppercase text-gray-500">Population</p><p className="font-semibold text-white">{data.data.population?.toLocaleString() ?? 'N/A'}</p></div>
            <div><p className="text-[9px] uppercase text-gray-500">Higher</p><p className="font-semibold text-white">{data.data.popHigher?.toLocaleString() ?? 'N/A'}</p></div>
            <div><p className="text-[9px] uppercase text-gray-500">Guide Value</p><p className="font-semibold text-green-400">{data.data.priceGuideValue != null ? formatWholeDollar(data.data.priceGuideValue) : 'N/A'}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div><p className="text-[9px] uppercase text-gray-500">PCGS No.</p><p className="font-semibold text-white">{data.data.pcgsNo || 'N/A'}</p></div>
            <div><p className="text-[9px] uppercase text-gray-500">Cert No.</p><p className="font-semibold text-white">{data.data.certNo || item.certId}</p></div>
          </div>
          {data.data.images?.length > 0 && (
            <div className="flex gap-2 pt-1">
              {data.data.images.slice(0, 2).map((image: any, index: number) => image.thumbnailUrl && (
                <img key={`${image.thumbnailUrl}-${index}`} src={image.thumbnailUrl} alt={image.label || 'PCGS certified coin'} className="h-20 rounded border border-gray-700/40 object-contain" />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-2 rounded bg-gray-900/40 p-2">
        <p className="text-[10px] font-semibold uppercase text-emerald-300">Auction Prices Realized — completed sales</p>
        <p className="text-[9px] text-gray-500">Certification-matched PCGS auction history. Records are valuation candidates only after Tradebilia date, price, duplicate, currency, and evidence gates.</p>
        {auctionData?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{auctionData.message}</p>}
        {auctionData?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-300">{auctionData.message}</p>}
        {auctionData?.status === 'success' && !auctionData.data?.auctions?.length && <p className="text-[10px] text-gray-500">No auction results were returned for this certification.</p>}
        {auctionData?.data?.auctions?.map((auction: any, index: number) => (
          <div key={`${auction.date}-${auction.lotNumV2 || auction.lotNo || index}`} className="border-b border-gray-700/30 pb-2 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {auction.auctionLotUrl ? <a href={auction.auctionLotUrl} target="_blank" rel="noreferrer" className="block truncate text-[10px] font-semibold text-blue-300 hover:underline">{auction.saleName || auction.auctioneer || 'PCGS auction lot'}</a> : <p className="truncate text-[10px] font-semibold text-white">{auction.saleName || auction.auctioneer || 'PCGS auction lot'}</p>}
                <p className="text-[9px] text-gray-500">{[auction.date, auction.auctioneer, auction.lotNumV2 || (auction.lotNo != null ? `Lot ${auction.lotNo}` : null), auction.isCAC ? 'CAC' : null].filter(Boolean).join(' · ')}</p>
              </div>
              <p className="shrink-0 text-[11px] font-semibold text-emerald-300">{auction.price != null ? formatWholeDollar(auction.price) : 'Price N/A'}</p>
            </div>
          </div>
        ))}
        {auctionData?.status === 'success' && <details className="rounded border border-gray-700/30 bg-gray-950/40 p-2"><summary className="cursor-pointer text-[9px] text-gray-300">All returned auction fields</summary><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[8px] text-gray-400">{JSON.stringify(auctionData.data, null, 2)}</pre></details>}
      </div>
    </div>
  );
}

function PriceChartingSection({ item, side, cardData, coinData, videoGameData, slugData, moversData }: { item: SelectedItem; side: 'left' | 'right'; cardData?: any; coinData?: any; videoGameData?: any; slugData?: any; moversData?: any }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const details = testAiDetails(item);
  const normalizedCategory = item.category.trim().toLowerCase().replace(/[_-]+/g, ' ');
  const isVideoGame = normalizedCategory === 'video games';
  const isCoin = normalizedCategory === 'coins';
  const isPokemonOrTcg = normalizedCategory === 'pokemon';
  const coinQuery = trpc.testAI.getPriceChartingCoinData.useQuery({ query: item.title }, { enabled: isCoin && !!item.title });
  const rawUpc = details.upc ?? details.UPC ?? details.barcode ?? details.barCode ?? details.productUpc ?? '';
  const upc = String(rawUpc).replace(/\D/g, '');
  const videoGameQuery = trpc.testAI.getPriceChartingVideoGameData.useQuery({ upc: /^\d{8,14}$/.test(upc) ? upc : '00000000' }, { enabled: isVideoGame && /^\d{8,14}$/.test(upc) });
  const setSlug = String(details.setSlug ?? details.cardSetSlug ?? details.priceChartingSetSlug ?? 'unavailable').trim();
  const cardSlug = String(details.cardSlug ?? details.priceChartingCardSlug ?? 'unavailable').trim();
  const slugQuery = trpc.testAI.getPriceChartingCardDetail.useQuery({ setSlug, cardSlug }, { enabled: isPokemonOrTcg && setSlug !== 'unavailable' && cardSlug !== 'unavailable' });
  const moversQuery = trpc.testAI.getPriceChartingBigMovers.useQuery(undefined, { enabled: !!item.title });
  const effectiveCardData = cardData;
  const effectiveCoinData = coinData ?? coinQuery.data;
  const effectiveVideoGameData = videoGameData ?? videoGameQuery.data;
  const effectiveSlugData = slugData ?? slugQuery.data;
  const effectiveMoversData = moversData ?? moversQuery.data;
  const data = isCoin ? effectiveCoinData : isVideoGame ? effectiveVideoGameData : (setSlug !== 'unavailable' && cardSlug !== 'unavailable') ? effectiveSlugData : effectiveCardData;
  const isLoading = data === undefined;
  const prices = data?.data?.prices ?? {};
  const movers = effectiveMoversData?.data?.movers ?? [];
  const lookupMode = isCoin ? 'US coin price-guide context' : isVideoGame ? 'video-game UPC lookup' : isPokemonOrTcg ? 'Pokémon / compatible TCG price-guide context' : 'available only for compatible PriceCharting records';
  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 PriceCharting (via Parse.bot)</p>
        {(isLoading || effectiveMoversData === undefined) && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Read-only {lookupMode}. Price-guide and mover data remain context-only and cannot create completed-sale evidence.</p>
      {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
      {data?.status === 'not_found' && <p className="text-[10px] text-gray-500">{data.message}</p>}
      {data?.status === 'success' && data.data && (
        <div className="space-y-2 rounded bg-gray-900/40 p-2">
          <p className="text-[12px] font-semibold text-white">{data.data.name || data.data.title || item.title}</p>
          <p className="text-[10px] text-gray-400">{[data.data.set, data.data.cardNumber, data.data.platform, data.data.mint, data.data.mintage].filter(Boolean).join(' · ')}</p>
          {data.data.associatedUpcs?.length > 0 && <p className="text-[9px] text-gray-500">Associated UPCs: {data.data.associatedUpcs.join(', ')}</p>}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            {Object.entries(prices).slice(0, 6).map(([grade, value]) => (
              <div key={grade} className="rounded bg-gray-800/60 p-1.5 text-center">
                <p className="text-[8px] uppercase text-gray-500">{grade.replace(/_/g, ' ')}</p>
                <p className="font-semibold text-green-400">{typeof value === 'number' ? formatWholeDollar(value) : String(value ?? 'N/A')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {isVideoGame && !videoGameData && <p className="text-[10px] text-gray-500">Add an 8–14 digit UPC/barcode to the item details to run the PriceCharting game lookup.</p>}
      {isPokemonOrTcg && !cardData && !slugData && <p className="text-[10px] text-gray-500">For a compatible non-Pokémon TCG, add PriceCharting setSlug and cardSlug fields to item details.</p>}
      {effectiveMoversData?.status === 'success' && movers.length > 0 && <details className="rounded border border-gray-700/30 bg-gray-950/40 p-2"><summary className="cursor-pointer text-[9px] text-gray-300">Cross-category market movers ({movers.length})</summary><div className="mt-2 space-y-1">{movers.slice(0, 5).map((mover: any, index: number) => <div key={`${mover.name}-${index}`} className="flex items-center justify-between gap-2 text-[9px]"><span className="min-w-0 truncate text-gray-400">{mover.name || 'Unnamed mover'}{mover.category ? ` · ${mover.category}` : ''}</span><span className="shrink-0 text-emerald-300">{mover.change != null ? formatWholeDollar(mover.change) : 'Change N/A'}</span></div>)}</div></details>}
      {effectiveMoversData?.status === 'error' && <p className="text-[9px] text-gray-500">Market-mover context unavailable: {effectiveMoversData.message}</p>}
    </div>
  );
}

function pokemonProviderValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not returned';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.length ? value.map(pokemonProviderValue).join(', ') : 'Not returned';
  try { return JSON.stringify(value); } catch { return String(value); }
}

function pokemonProviderCardNumber(card: any): string {
  const number = String(card?.cardNumber ?? '').trim();
  const total = String(card?.totalSetNumber ?? '').trim();
  if (!number) return '?';
  return total && !number.includes('/') ? `${number}/${total}` : number;
}

function PokemonProviderFieldGrid({ fields }: { fields: Array<[string, unknown]> }) {
  return <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:grid-cols-3">
    {fields.filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => {
      const formatted = pokemonProviderValue(value);
      const isNested = typeof value === 'object' && value !== null;
      const isLong = formatted.length > 180;
      return <div key={label} className="rounded bg-gray-800/60 p-1.5">
        <p className="text-[8px] uppercase text-gray-500">{label}</p>
        {isNested || isLong ? <details className="mt-0.5"><summary className="cursor-pointer font-semibold text-sky-200">View returned data</summary><pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[9px] font-normal text-gray-300">{formatted}</pre></details> : <p className="break-words font-semibold text-white">{formatted}</p>}
      </div>;
    })}
  </div>;
}

function PokemonPriceTrackerSection({ item, side, data, isLoading }: { item: SelectedItem; side: 'left' | 'right'; data: any; isLoading: boolean }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category === 'pokemon';
  const selected = data?.selected;
  const detail = data?.detail ?? {};
  const prices = detail.prices ?? selected?.card?.prices ?? {};
  const priceHistory = detail.priceHistory ?? null;
  const ebay = detail.ebay ?? null;
  const cardmarket = detail.cardmarketPrices ?? null;
  const population = data?.population ?? null;
  const candidates = data?.candidates ?? [];
  const metadata = data?.metadata ?? {};
  const imageUrl = detail.imageCdnUrl400 || detail.imageCdnUrl || detail.imageUrl || selected?.card?.imageCdnUrl400 || selected?.card?.imageCdnUrl || selected?.card?.imageUrl;

  if (!supported) return <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🃏 Pokémon Price Tracker</p><p className="text-gray-500 text-[10px]">This read-only sandbox source is available only for Pokémon/TCG items.</p></div>;

  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between gap-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🃏 Pokémon Price Tracker</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">Read-only Pokémon card market prices by grade and provider context. Catalog details, guide prices, history, eBay, Cardmarket, and population do not alter Tradebilia valuation, confidence, or trade verdicts.</p>
    {data?.messages?.map((message: string) => <p key={message} className="rounded border border-sky-700/30 bg-sky-950/25 p-2 text-[10px] text-sky-100">{message}</p>)}
    {data?.status === 'error' && !data?.messages?.length && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">The provider lookup could not be completed.</p>}
    {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-200">No catalog candidate was returned for the selected identity.</p>}
    {data?.status === 'review_required' && <div className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-100"><p className="font-semibold text-amber-200">Manual identity review required</p><p className="mt-1">A provider detail request was not made because no candidate matched the listing on card name, set, and card number.</p></div>}
    {candidates.length > 0 && <details className="rounded border border-gray-700/30 bg-gray-950/25 p-2"><summary className="cursor-pointer text-[10px] font-semibold text-gray-200">Catalog candidates ({candidates.length}) — identity review</summary><div className="mt-2 space-y-1.5">{candidates.map((candidate: any) => <div key={candidate.card?.tcgPlayerId || candidate.card?.id} className={`rounded p-1.5 text-[10px] ${candidate.exactIdentity ? 'bg-emerald-950/30 text-emerald-100' : 'bg-gray-800/50 text-gray-300'}`}><p className="font-semibold">{candidate.card?.name || 'Unnamed card'} · {candidate.card?.setName || 'Set unavailable'} · #{pokemonProviderCardNumber(candidate.card)}</p><p className="mt-0.5 text-[9px] text-gray-400">Score {candidate.score} · {candidate.exactIdentity ? 'Exact name, set, and number match' : `Matched ${candidate.matched?.join(', ') || 'no required identifiers'}`}</p></div>)}</div></details>}
    {selected && <div className="space-y-3 rounded bg-gray-900/40 p-2">
      <div className="flex gap-3"><>{imageUrl && <img src={imageUrl} alt={detail.name || selected.card?.name || 'Pokémon card'} className="h-28 w-20 shrink-0 rounded border border-gray-700/40 object-contain" />}</><div className="min-w-0"><a href={detail.tcgPlayerUrl || selected.card?.tcgPlayerUrl || undefined} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-blue-300 hover:underline">{detail.name || selected.card?.name || item.title}</a><p className="mt-0.5 text-[10px] text-emerald-200">Exact identity gate passed: card name, set, and card number.</p><p className="mt-1 text-[10px] text-gray-400">{[detail.setName || selected.card?.setName, detail.cardNumber || selected.card?.cardNumber, detail.totalSetNumber || selected.card?.totalSetNumber ? `of ${detail.totalSetNumber || selected.card?.totalSetNumber}` : ''].filter(Boolean).join(' · ')}</p></div></div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-cyan-200">Identity and card fields returned</p><PokemonProviderFieldGrid fields={[
        ['Provider ID', detail.id || selected.card?.id], ['TCGplayer ID', detail.tcgPlayerId || selected.card?.tcgPlayerId], ['External catalog ID', detail.externalCatalogId || selected.card?.externalCatalogId], ['Set ID', detail.setId || selected.card?.setId], ['Set', detail.setName || selected.card?.setName], ['Card #', detail.cardNumber || selected.card?.cardNumber], ['Total set #', detail.totalSetNumber || selected.card?.totalSetNumber], ['Rarity', detail.rarity || selected.card?.rarity], ['Card type', detail.cardType || selected.card?.cardType], ['Printings available', detail.printingsAvailable || selected.card?.printingsAvailable],
      ]} /></div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-cyan-200">Pokémon characteristics returned</p><PokemonProviderFieldGrid fields={[
        ['Pokédex #', detail.pokedexNumbers], ['Pokémon type', detail.pokemonType], ['Energy type', detail.energyType], ['HP', detail.hp], ['Stage', detail.stage], ['Artist', detail.artist], ['Retreat cost', detail.retreatCost], ['Weakness', detail.weakness], ['Resistance', detail.resistance], ['Attacks', detail.attacks], ['Flavor text', detail.flavorText],
      ]} /></div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-emerald-200">Current guide and supply context — not Tradebilia valuation</p><PokemonProviderFieldGrid fields={[
        ['Market', prices.market], ['Low', prices.low], ['Listings', prices.listings], ['Sellers', prices.sellers], ['Recent sales', prices.recentSales], ['Primary printing', prices.primaryPrinting], ['Market price condition', prices.marketPriceCondition], ['Near-mint market', prices.marketNearMint], ['Last updated', prices.lastUpdated], ['Price corrected', prices.priceWasCorrected], ['Per-condition prices', prices.conditions], ['Per-variant prices', prices.variants || detail.variants],
      ]} /></div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-emerald-200">Price history — provider context only</p><PokemonProviderFieldGrid fields={[
        ['Conditions tracked', priceHistory?.conditions_tracked], ['Variants tracked', priceHistory?.variants_tracked], ['Data points', priceHistory?.totalDataPoints], ['Earliest date', priceHistory?.earliestDate], ['Latest date', priceHistory?.latestDate], ['History updated', priceHistory?.lastUpdated], ['Condition history', priceHistory?.conditions], ['Variant history', priceHistory?.variants],
      ]} /></div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-emerald-200">eBay graded-sale context — provider-sourced and non-authoritative</p><PokemonProviderFieldGrid fields={[
        ['eBay updated', ebay?.updatedAt], ['Last scraped', ebay?.lastScrapedDate], ['Last eBay check', ebay?.lastEbayCheck], ['Sales by grade', ebay?.salesByGrade], ['Outlier flags', ebay?.smartPriceOutlierByGrade], ['Sales velocity', ebay?.salesVelocity], ['Total sales', ebay?.totalSales], ['Total value', ebay?.totalValue], ['Grades tracked', ebay?.gradesTracked], ['Date range', [ebay?.dateRangeStart, ebay?.dateRangeEnd].filter(Boolean).join(' to ')], ['Individual sold listings', ebay?.soldListings], ['eBay price history', ebay?.priceHistory],
      ]} /></div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-emerald-200">Cardmarket EUR context — provider-sourced and non-authoritative</p><PokemonProviderFieldGrid fields={[
        ['Market EUR', cardmarket?.marketEur], ['Low EUR', cardmarket?.lowEur], ['Trend EUR', cardmarket?.trendEur], ['7-day average EUR', cardmarket?.avg7Eur], ['30-day average EUR', cardmarket?.avg30Eur], ['Headline variant', cardmarket?.headlineVariant], ['Product ID', cardmarket?.cardmarketProductId], ['Last updated', cardmarket?.lastUpdated], ['Variant detail', cardmarket?.variants],
      ]} /></div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-violet-200">Population context — not a value estimate</p>{population?.status === 'unavailable_for_plan' ? <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-200">{population.message}</p> : <PokemonProviderFieldGrid fields={[
        ['Status', population?.status], ['Total population', population?.data?.totalPopulation], ['Total gems', population?.data?.totalGems], ['Combined gem rate', population?.data?.combinedGemRate], ['Graders tracked', population?.data?.gradersTracked], ['Combined totals', population?.data?.combinedTotals], ['Percent higher', population?.data?.percentHigher], ['Match confidence', population?.data?.matchConfidence], ['Match score', population?.data?.matchScore], ['Last fetched', population?.data?.lastFetchedDate], ['Updated', population?.data?.updatedAt], ['Population by grader', population?.data?.populationByGrader],
      ]} />}</div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-gray-400">Provider freshness, plan, and credit audit</p><PokemonProviderFieldGrid fields={[
        ['Needs detailed scrape', detail.needsDetailedScrape], ['Data completeness', detail.dataCompleteness || selected.card?.dataCompleteness], ['Last scraped', detail.lastScrapedAt || selected.card?.lastScrapedAt], ['Created', detail.createdAt || selected.card?.createdAt], ['Updated', detail.updatedAt || selected.card?.updatedAt], ['Response language', metadata?.language], ['Provider count / total', metadata?.count != null ? `${metadata.count}/${metadata.total ?? '?'}` : null], ['History window', metadata?.historyWindow], ['Includes', metadata?.includes], ['Plan restrictions', metadata?.planRestrictions], ['API calls', metadata?.apiCallsConsumed], ['Search credits', data?.audit?.search], ['Detail credits', data?.audit?.detail], ['Population credits', data?.audit?.population],
      ]} /></div>
      <details className="rounded border border-gray-700/30 bg-gray-950/40 p-2"><summary className="cursor-pointer text-[10px] font-semibold text-gray-300">Full provider payload — all returned fields</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] text-gray-400">{JSON.stringify(data?.raw, null, 2)}</pre></details>
    </div>}
  </div>;
}

function TheCardApiSection({ item, side, data, isLoading }: { item: SelectedItem; side: 'left' | 'right'; data: any; isLoading: boolean }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category === 'sports_cards' || item.category === 'pokemon';
  const sales = data?.sales ?? [];
  const confirmedSales = sales.filter((sale: any) => sale.confirmed);
  const contextOnlySales = sales.filter((sale: any) => !sale.confirmed);
  const catalog = data?.catalog ?? null;
  const catalogSelected = catalog?.selected ?? null;
  const catalogCandidates = catalog?.candidates ?? [];
  const visualFilter = data?.visualFilter;

  if (!supported) return <div className="rounded-lg border border-dashed border-gray-700/40 bg-gray-800/30 p-3 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>📊 The Card API Sales</p><p className="text-[10px] text-gray-500">This read-only sandbox source is available only for Sports Cards and Pokémon/TCG items.</p></div>;

  const SaleRows = ({ rows, contextOnly }: { rows: any[]; contextOnly?: boolean }) => <div className="max-h-56 space-y-1 overflow-y-auto">
    {rows.map((sale: any) => <div key={sale.saleId || `${sale.title}-${sale.date}-${sale.price}`} className="rounded border border-gray-700/25 bg-gray-950/25 p-2 text-[10px]">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><a href={sale.url || undefined} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold text-blue-300 hover:underline">{sale.title}</a><p className="mt-0.5 text-[9px] text-gray-500">{[sale.marketplace, sale.listing_type, sale.date || 'Date unavailable'].filter(Boolean).join(' · ')}</p></div><div className="shrink-0 text-right"><p className="font-semibold text-emerald-300">{sale.price != null ? `${sale.currency || 'USD'} ${formatWholeDollar(sale.price)}` : 'Price unavailable'}</p><p className={`text-[8px] ${sale.confirmed ? 'text-emerald-400' : 'text-amber-300'}`}>{sale.confirmed ? 'Confirmed final price' : 'Fast-settle estimate — context only'}</p></div></div>
      <p className="mt-1 text-[9px] text-gray-400">{[sale.grader && sale.grade ? `${sale.grader} ${sale.grade}${sale.grade_qualifier ? ` ${sale.grade_qualifier}` : ''}` : null, sale.player, sale.manufacturer, sale.card_set, sale.card_number ? `#${sale.card_number}` : null, sale.year, sale.print_run ? `/${sale.print_run}` : null].filter(Boolean).join(' · ') || 'No structured card identity was returned for this sale.'}</p>
      <p className="mt-1 text-[8px] text-gray-500">{sale.priceSemantics}</p>
      <details className="mt-1"><summary className="cursor-pointer text-[9px] text-sky-200">All returned sale fields</summary><pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-900/70 p-1.5 text-[8px] text-gray-400">{JSON.stringify(sale, null, 2)}</pre></details>
    </div>)}
  </div>;

  return <div className="rounded-lg border border-gray-700/20 bg-gray-800/30 p-3 space-y-3">
    <div className="flex items-center justify-between gap-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>📊 The Card API Sales</p>{isLoading && <Spinner className="h-3 w-3" />}</div>
    <p className="text-[10px] text-gray-500">Read-only completed-sale research. Only individually dated, confirmed final prices that also pass the existing exact/near identity, grading, recency, duplicate, and currency gates may support a sandbox value. Provider catalog data, unconfirmed fast-settle prices, and platform price caveats remain context.</p>
    {data?.messages?.map((message: string) => <p key={message} className="rounded border border-sky-700/30 bg-sky-950/25 p-2 text-[10px] text-sky-100">{message}</p>)}
    {data?.status === 'error' && !data?.messages?.length && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-300">The Card API lookup could not be completed.</p>}
    {visualFilter?.note && <p className="rounded border border-cyan-700/30 bg-cyan-950/25 p-2 text-[10px] text-cyan-100">{visualFilter.note}</p>}
    <MarketplaceVisualReview data={data} targetImageUrl={item.primaryPhotoUrl} sourceLabel="The Card API completed sales" />
    {data?.pagination && <p className="text-[9px] text-gray-500">Returned {sales.length} of {data.pagination.total ?? '?'} matching sales · Coverage {data.metadata?.coverage_date_from || 'unknown'} to {data.metadata?.coverage_date_to || 'unknown'} · Sales allowance {data.audit?.sales?.dailyRemaining ?? 'unknown'} remaining / {data.audit?.sales?.dailyLimit ?? 'unknown'}.</p>}
    {confirmedSales.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-emerald-300">Confirmed sale records — subject to comparable gate</p><SaleRows rows={confirmedSales} /></div>}
    {contextOnlySales.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-amber-300">Unconfirmed fast-settle records — context only</p><SaleRows rows={contextOnlySales} contextOnly /></div>}
    {data?.status === 'not_found' && <p className="text-[10px] text-gray-500">No sales were returned for this bounded provider query.</p>}
    <div className="rounded border border-violet-700/25 bg-violet-950/15 p-2 space-y-2"><p className="text-[9px] font-semibold uppercase text-violet-200">Plan-gated catalog identity — factual context only</p>
      {catalog?.status === 'unavailable_for_plan' && <p className="text-[10px] text-amber-200">{catalog.message}</p>}
      {catalog?.status === 'error' && <p className="text-[10px] text-red-300">{catalog.message}</p>}
      {catalogSelected && <div className="rounded bg-gray-900/50 p-2"><p className="text-[10px] font-semibold text-emerald-200">Exact catalog identity candidate</p><PokemonProviderFieldGrid fields={[
        ['UCID', catalogSelected.candidate?.ucid], ['Set ID', catalogSelected.candidate?.set_usid], ['Set', catalogSelected.candidate?.set_name], ['Parent set', catalogSelected.candidate?.parent_set_name], ['Subject', catalogSelected.candidate?.subject], ['Card #', catalogSelected.candidate?.card_number], ['Rookie', catalogSelected.candidate?.is_rookie], ['Auto', catalogSelected.candidate?.is_auto], ['Print run', catalogSelected.candidate?.print_run], ['Match fields', catalogSelected.matched],
      ]} /></div>}
      {catalogCandidates.length > 0 && <details><summary className="cursor-pointer text-[10px] font-semibold text-violet-100">Catalog candidates ({catalogCandidates.length}) — identity review</summary><div className="mt-2 space-y-1">{catalogCandidates.map((candidate: any) => <div key={candidate.candidate?.ucid || candidate.candidate?.id} className={`rounded p-1.5 text-[9px] ${candidate.exactIdentity ? 'bg-emerald-950/30 text-emerald-100' : 'bg-gray-900/50 text-gray-300'}`}><p className="font-semibold">{candidate.candidate?.subject || 'Unnamed card'} · {candidate.candidate?.set_name || 'Set unavailable'} · #{candidate.candidate?.card_number || '?'}</p><p className="mt-0.5 text-gray-400">Score {candidate.score} · {candidate.exactIdentity ? 'Exact identity gate passed' : `Matched ${candidate.matched?.join(', ') || 'no identifiers'}`}</p></div>)}</div></details>}
      {!catalogSelected && catalog?.status === 'available' && <p className="text-[10px] text-gray-400">No catalog candidate passed the strict identity gate; catalog fields were not treated as confirmation.</p>}
    </div>
    <details className="rounded border border-gray-700/30 bg-gray-950/40 p-2"><summary className="cursor-pointer text-[10px] font-semibold text-gray-300">Full provider payload — all returned fields</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] text-gray-400">{JSON.stringify(data?.raw, null, 2)}</pre></details>
  </div>;
}

function ParseAuctionSection({ item, side, data, isLoading, source }: { item: SelectedItem; side: 'left' | 'right'; data: any; isLoading: boolean; source: 'lelands' | 'pristine_auction' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const isLelands = source === 'lelands';
  const label = isLelands ? 'Parse.bot Lelands Auctions' : 'Parse.bot Pristine Auction';
  const sales = data?.sales ?? [];
  const context = data?.context ?? [];
  const rows = (items: any[], eligible: boolean) => <div className="max-h-56 space-y-1 overflow-y-auto">{items.map((sale: any, index: number) => <div key={`${sale.url || sale.title}-${sale.date}-${index}`} className="rounded border border-gray-700/25 bg-gray-950/25 p-2 text-[10px]"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><a href={sale.url || undefined} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold text-blue-300 hover:underline">{sale.title || 'Untitled auction lot'}</a><p className="mt-0.5 text-[9px] text-gray-500">{[sale.auctionName, sale.category, sale.date || 'Date unavailable'].filter(Boolean).join(' · ')}</p></div><div className="shrink-0 text-right"><p className="font-semibold text-emerald-300">{sale.price != null ? `${sale.currency || 'USD'} ${formatWholeDollar(sale.price)}` : 'Price unavailable'}</p><p className={`text-[8px] ${eligible ? 'text-emerald-400' : 'text-amber-300'}`}>{eligible ? 'Sold candidate — comparable gate required' : 'Context only — not admitted'}</p></div></div><p className="mt-1 text-[9px] text-gray-400">{[sale.grader && sale.grade ? `${sale.grader} ${sale.grade}` : null, sale.priceBasis, sale.identityMatched ? 'Identity matched' : 'Identity review failed'].filter(Boolean).join(' · ')}</p><p className="mt-1 text-[8px] text-gray-500">{sale.priceSemantics}</p><details className="mt-1"><summary className="cursor-pointer text-[9px] text-sky-200">All returned lot fields</summary><pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-900/70 p-1.5 text-[8px] text-gray-400">{JSON.stringify(sale.raw ?? sale, null, 2)}</pre></details></div>)}</div>;
  if (!['sports_cards', 'autographs'].includes(item.category) || (source === 'pristine_auction' && item.category !== 'sports_cards')) return <div className="rounded-lg border border-dashed border-gray-700/40 bg-gray-800/30 p-3 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>{isLelands ? '🏟️' : '🏆'} {label}</p><p className="text-[10px] text-gray-500">This read-only sandbox source is not applicable to the selected category.</p></div>;
  return <div className="rounded-lg border border-gray-700/20 bg-gray-800/30 p-3 space-y-3"><div className="flex items-center justify-between gap-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>{isLelands ? '🏟️' : '🏆'} {label}</p>{isLoading && <Spinner className="h-3 w-3" />}</div><p className="text-[10px] text-gray-500">Read-only auction archive. Search results only discover candidates; detail-level explicit sold status, dated evidence, identity/grade compatibility, duplicate checks, and visual review are required before any record can influence the sandbox valuation. Premium-inclusive and hammer prices are kept source-attributed.</p>{data?.messages?.map((message: string) => <p key={message} className="rounded border border-sky-700/30 bg-sky-950/25 p-2 text-[10px] text-sky-100">{message}</p>)}{data?.visualFilter?.note && <p className="rounded border border-cyan-700/30 bg-cyan-950/25 p-2 text-[10px] text-cyan-100">{data.visualFilter.note}</p>}<MarketplaceVisualReview data={data} targetImageUrl={item.primaryPhotoUrl} sourceLabel={label} />{sales.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-emerald-300">Explicit sold detail records — candidate review</p>{rows(sales, true)}</div>}{context.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-amber-300">Ended, unsold, ambiguous, or identity-mismatched records — context only</p>{rows(context, false)}</div>}{!sales.length && !context.length && data?.status === 'success' && <p className="text-[10px] text-gray-500">No auction records were returned for this bounded query.</p>}<details className="rounded border border-gray-700/30 bg-gray-950/40 p-2"><summary className="cursor-pointer text-[10px] font-semibold text-gray-300">Full provider payload — all returned fields</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] text-gray-400">{JSON.stringify(data?.raw, null, 2)}</pre></details></div>;
}

function CardsightAiSection({ item, side, data, isLoading }: { item: SelectedItem; side: 'left' | 'right'; data: any; isLoading: boolean }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category === 'sports_cards' || item.category === 'pokemon';
  const candidates = data?.candidates ?? [];
  const selected = data?.selected ?? null;
  const detail = data?.detail ?? null;
  const parallel = data?.parallel ?? null;
  const sales = data?.sales ?? [];
  const completedAuctions = sales.filter((sale: any) => sale.completed);
  const askingPrices = sales.filter((sale: any) => !sale.completed);
  const activeListings = data?.activeListings ?? [];
  const population = data?.population ?? null;
  const visualFilter = data?.visualFilter;

  if (!supported) return <div className="rounded-lg border border-dashed border-gray-700/40 bg-gray-800/30 p-3 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>👁️ Cardsight.ai Market Data</p><p className="text-[10px] text-gray-500">This read-only sandbox source is available only for Sports Cards and Pokémon/TCG items.</p></div>;

  const RecordRows = ({ rows, active }: { rows: any[]; active?: boolean }) => <div className="max-h-56 space-y-1 overflow-y-auto">
    {rows.map((record: any, index: number) => <div key={`${record.url || record.title}-${record.date || record.endDate}-${record.price}-${index}`} className="rounded border border-gray-700/25 bg-gray-950/25 p-2 text-[10px]">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><a href={record.url || undefined} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold text-blue-300 hover:underline">{record.title}</a><p className="mt-0.5 text-[9px] text-gray-500">{[record.marketplace, record.listingType, active ? (record.endDate || 'End unavailable') : (record.date || 'Date unavailable')].filter(Boolean).join(' · ')}</p></div><div className="shrink-0 text-right"><p className="font-semibold text-emerald-300">{record.price != null ? `${record.currency || 'USD'} ${formatWholeDollar(record.price)}` : 'Price unavailable'}</p><p className={`text-[8px] ${record.completed ? 'text-emerald-400' : 'text-amber-300'}`}>{record.completed ? 'Completed auction — gate required' : active ? 'Current market listing — context only' : 'Fixed-price ask — context only'}</p></div></div>
      <p className="mt-1 text-[9px] text-gray-400">{[record.certificationCompany && record.grade ? `${record.certificationCompany} ${record.grade}` : null, record.parallelName ? `Parallel: ${record.parallelName}` : 'Base', record.bidCount != null ? `${record.bidCount} bids` : null].filter(Boolean).join(' · ')}</p>
      {record.priceSemantics && <p className="mt-1 text-[8px] text-gray-500">{record.priceSemantics}</p>}
      <details className="mt-1"><summary className="cursor-pointer text-[9px] text-sky-200">All returned record fields</summary><pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-900/70 p-1.5 text-[8px] text-gray-400">{JSON.stringify(record, null, 2)}</pre></details>
    </div>)}
  </div>;

  return <div className="rounded-lg border border-gray-700/20 bg-gray-800/30 p-3 space-y-3">
    <div className="flex items-center justify-between gap-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>👁️ Cardsight.ai Market Data</p>{isLoading && <Spinner className="h-3 w-3" />}</div>
    <p className="text-[10px] text-gray-500">Read-only sandbox research. The adapter requires exact catalog identity and an exact declared parallel (when applicable); graded data is restricted to the exact grading-company and grade partition. Fixed-price and active-market records are context only. Only dated completed auctions that also pass Tradebilia comparable gates can support sandbox valuation.</p>
    {data?.messages?.map((message: string) => <p key={message} className="rounded border border-sky-700/30 bg-sky-950/25 p-2 text-[10px] text-sky-100">{message}</p>)}
    {data?.status === 'error' && !data?.messages?.length && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-300">Cardsight.ai lookup could not be completed.</p>}
    {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-200">No provider catalog candidate was returned for this listing identity.</p>}
    {data?.status === 'review_required' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-100">Manual identity review is required. The adapter did not request market or population data for an unresolved card or variant.</p>}
    {visualFilter?.note && <p className="rounded border border-cyan-700/30 bg-cyan-950/25 p-2 text-[10px] text-cyan-100">{visualFilter.note}</p>}

    <MarketplaceVisualReview data={data} targetImageUrl={item.primaryPhotoUrl} sourceLabel="Cardsight.ai market records" />
    {candidates.length > 0 && <details className="rounded border border-violet-700/25 bg-violet-950/15 p-2"><summary className="cursor-pointer text-[10px] font-semibold text-violet-100">Catalog candidates ({candidates.length}) — strict identity review</summary><div className="mt-2 space-y-1.5">{candidates.map((candidate: any) => <div key={candidate.card?.id} className={`rounded p-1.5 text-[9px] ${candidate.exactIdentity ? 'bg-emerald-950/30 text-emerald-100' : 'bg-gray-900/50 text-gray-300'}`}><p className="font-semibold">{candidate.card?.name || 'Unnamed'} · {candidate.card?.setName || 'Set unavailable'} · #{candidate.card?.number || '?'}</p><p className="mt-0.5 text-gray-400">Score {candidate.score} · {candidate.exactIdentity ? 'Exact subject, set, and card-number gate passed' : `Matched ${candidate.matched?.join(', ') || 'no required identifiers'}`}</p></div>)}</div></details>}

    {selected && <div className="rounded bg-gray-900/40 p-2 space-y-3">
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-emerald-200">Exact catalog identity and selected partition</p><PokemonProviderFieldGrid fields={[
        ['Card ID', selected.card?.id], ['Subject', detail?.name ?? selected.card?.name], ['Set', detail?.setName ?? selected.card?.setName], ['Release', detail?.releaseName ?? selected.card?.releaseName], ['Year', detail?.releaseYear ?? selected.card?.releaseYear], ['Card #', detail?.number ?? selected.card?.number], ['Manufacturer', data?.request?.identity?.manufacturer], ['Attributes', detail?.attributes], ['Card fields', detail?.fields], ['Numbered to', detail?.numberedTo], ['Parallel selection', parallel?.status === 'base' ? 'Base card only' : parallel?.name], ['Declared listing variant', data?.request?.identity?.variant || 'None'], ['Selected grader / grade', item.gradingCompany && item.grade ? `${item.gradingCompany} ${item.grade}` : 'Raw / ungraded'],
      ]} /></div>
      <div><p className="mb-1 text-[9px] font-semibold uppercase text-violet-200">Population context — not a value estimate</p>{population?.status === 'unavailable' ? <p className="text-[10px] text-amber-200">{population.message || 'Population data was unavailable.'}</p> : <PokemonProviderFieldGrid fields={[
        ['All provider populations', population?.data?.totalPopulation], ['Selected base / parallel population', population?.data?.variantPopulation], ['Selected grading company', population?.data?.gradingCompany?.name], ['Selected company population', population?.data?.gradingCompany?.totalPopulation], ['Last synced', population?.data?.gradingCompany?.lastSyncedAt], ['Grade population breakdown', population?.data?.gradingCompany?.gradingTypes],
      ]} />}</div>
    </div>}

    {completedAuctions.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-emerald-300">Dated completed auctions — subject to comparable gate</p><RecordRows rows={completedAuctions} /></div>}
    {askingPrices.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-amber-300">Fixed-price history — context only</p><RecordRows rows={askingPrices} /></div>}
    {activeListings.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-cyan-300">Current marketplace listings — context only</p><RecordRows rows={activeListings} active /></div>}
    {selected && !completedAuctions.length && !askingPrices.length && !activeListings.length && <p className="text-[10px] text-gray-500">The exact provider partition returned no price or active-market records within the bounded request window.</p>}
    {data?.diagnostics && <p className="text-[9px] text-gray-500">Bounded lookup: up to {data.diagnostics.pricingLimit} historical records and {data.diagnostics.marketplaceLimit} active records per provider response. HTTP: pricing {data.diagnostics.pricingStatus ?? 'n/a'} · marketplace {data.diagnostics.marketplaceStatus ?? 'n/a'} · population {data.diagnostics.populationStatus ?? 'n/a'}.</p>}
    <details className="rounded border border-gray-700/30 bg-gray-950/40 p-2"><summary className="cursor-pointer text-[10px] font-semibold text-gray-300">Full provider payload — all returned fields</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] text-gray-400">{JSON.stringify(data?.raw, null, 2)}</pre></details>
  </div>;
}

function OneThirtyPointSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading } = trpc.testAI.get130PointData.useQuery(
    { query: item.title, itemDetails: item.itemDetails, imageUrl: item.primaryPhotoUrl },
    { enabled: !!item.title },
  );
  const items = data?.data?.items ?? [];
  const recentSales = items.filter((sale: any) => sale.recency === 'recent');
  const historicalSales = items.filter((sale: any) => sale.recency === 'historical');
  const undatedSales = items.filter((sale: any) => sale.recency === 'undated');
  const SaleRows = ({ sales }: { sales: any[] }) => <div className="max-h-48 space-y-1 overflow-y-auto">{sales.map((sale: any) => (
    <div key={sale.id || `${sale.title}-${sale.date}`} className="flex items-center justify-between gap-2 border-b border-gray-700/20 py-1 last:border-0">
      <div className="min-w-0"><a href={sale.url || undefined} target="_blank" rel="noopener noreferrer" className="block truncate text-[10px] text-blue-400 hover:underline">{sale.title}</a><p className="text-[9px] text-gray-500">{[sale.marketplace, sale.saleType, sale.date || 'Date unavailable'].filter(Boolean).join(' · ')}</p></div>
      <p className="shrink-0 text-[11px] font-semibold text-green-400">{sale.price != null ? `${sale.currency || 'USD'} ${formatWholeDollar(sale.price)}` : 'Price N/A'}</p>
    </div>
  ))}</div>;

  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 130point Sales (via Parse.bot)</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">Read-only completed sales. No current average or valuation is calculated; confirm the exact variant and grade before using a record as a comparable.</p>
    {data?.status === 'success' && data.visualFilter?.note && <p className="rounded border border-cyan-700/30 bg-cyan-950/30 p-2 text-[10px] text-cyan-200">{data.visualFilter.note}</p>}
    {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
    {data?.status === 'success' && data.data && <div className="space-y-3">
      <MarketplaceVisualReview data={data} targetImageUrl={item.primaryPhotoUrl} sourceLabel="130point sales" />
      <p className="text-[10px] text-gray-500">{data.data.itemsReturned} shown of {data.data.totalFound} matching sales</p>
      {recentSales.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-emerald-300">Recent comparable sales · last 12 months</p><SaleRows sales={recentSales} /></div>}
      {historicalSales.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-amber-300">Historical context · older than 12 months</p><SaleRows sales={historicalSales} /></div>}
      {undatedSales.length > 0 && <div><p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">Undated records · research only</p><SaleRows sales={undatedSales} /></div>}
      {!items.length && <p className="text-[10px] text-gray-500">No completed 130point sales were returned for this query.</p>}
    </div>}
  </div>;
}

function DiscogsSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const isMusic = item.category.trim().toLowerCase().replace(/[_-]+/g, ' ') === 'music';
  const musicDetails = useMemo(() => testAiDetails(item), [item.itemDetails]);
  const releaseTitle = (item.releaseTitle ?? (typeof musicDetails.releaseTitle === 'string' ? musicDetails.releaseTitle : '')).trim();
  const input = useMemo(() => ({
    releaseTitle,
    category: item.category,
    itemDetails: item.itemDetails ?? undefined,
  }), [releaseTitle, item.category, item.itemDetails]);
  const { data, isLoading } = trpc.testAI.getDiscogsReleases.useQuery(input, {
    enabled: isMusic && releaseTitle.length >= 2,
  });
  const results = data?.data?.results ?? [];

  if (!isMusic) return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🎵 Discogs Music Catalog</p>
      <p className="text-gray-500 text-[10px]">Discogs is available for Music items only.</p>
    </div>
  );

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🎵 Discogs Music Catalog</p>
        {isLoading && <Spinner className="w-3 h-3" />}
      </div>
      <p className="text-gray-500 text-[10px]">Read-only release metadata for identity matching. This source does not provide Tradebilia valuation or authentication.</p>
      {!releaseTitle && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-200">Add an Album / Release Title to search Discogs. The listing title is not used for this lookup.</p>}
      {data?.data?.requestedReleaseYear && <p className="text-[10px] text-gray-500">{data.data.releaseYearFilterApplied ? `Candidates narrowed by release year ${data.data.requestedReleaseYear}.` : `No candidates matched release year ${data.data.requestedReleaseYear}; showing broader title and artist matches.`}</p>}
      {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
      {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-200">{data.message}</p>}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((release) => (
            <div key={release.id} className="rounded bg-gray-900/40 p-2">
              <div className="min-w-0">
                <a href={release.sourceUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[11px] font-semibold text-blue-300 hover:underline">{release.releaseTitle}</a>
                <p className="mt-0.5 text-[9px] text-gray-300"><span className="text-gray-500">Artist / Performer:</span> {release.artist || 'Not provided by Discogs'}</p>
                <p className="mt-0.5 text-[9px] text-gray-400">{[release.year, release.country, release.format.join(', ')].filter(Boolean).join(' · ') || 'Release details not provided'}</p>
                <p className="mt-0.5 text-[9px] text-gray-500">{[release.label.join(', '), release.catalogNumber.join(', '), release.genre.join(', ')].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {data?.status === 'success' && !results.length && <p className="text-[10px] text-gray-500">No usable Discogs release records were returned for this query.</p>}
      <p className="border-t border-gray-700/30 pt-2 text-[9px] text-gray-600">This application uses Discogs’ API but is not affiliated with, sponsored or endorsed by Discogs. ‘Discogs’ is a trademark of Zink Media, LLC.</p>
    </div>
  );
}

function TcgDexSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category === 'pokemon';
  const lookupInput = useMemo(() => {
    const details = item.itemDetails ? (() => { try { return JSON.parse(item.itemDetails); } catch { return {}; } })() : {};
    const catalogName = details.cardName || details.pokemonName || details.name || item.title.replace(/^pokemon\s+/i, '');
    return {
      query: String(catalogName).trim(),
      cardNumber: details.cardNumber || details.cardNo || details.number || undefined,
      setName: details.setName || details.set || details.cardSet || undefined,
    };
  }, [item.itemDetails, item.title]);
  const { data, isLoading } = trpc.testAI.getTcgDexCatalog.useQuery(lookupInput, { enabled: supported && lookupInput.query.length >= 2 });
  if (!supported) return <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🃏 TCGdex Pokémon Catalog</p><p className="text-gray-500 text-[10px]">This read-only reference source currently supports Pokémon card items only.</p></div>;
  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🃏 TCGdex Pokémon Catalog</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">Read-only card identification metadata · Query: {lookupInput.query} · Not a price, certification, authenticity, condition, or ownership source</p>
    {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
    {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-300">{data.message}</p>}
    {data?.status === 'success' && data.data && <div className="space-y-2 rounded bg-gray-900/40 p-2"><a href={data.data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-blue-300 hover:underline">{data.data.title}</a><p className="text-[10px] text-amber-200/90">{data.data.matchNote}</p>{data.data.facts.length > 0 && <div className="grid grid-cols-2 gap-1.5 text-[10px]">{data.data.facts.map((fact: any) => <div key={fact.label} className="rounded bg-gray-800/60 p-1.5"><p className="text-[8px] uppercase text-gray-500">{fact.label}</p><p className="break-words font-semibold text-white">{fact.value}</p></div>)}</div>}</div>}
  </div>;
}

function RawgSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category === 'video_games';
  const lookupInput = useMemo(() => {
    const details = item.itemDetails ? (() => { try { return JSON.parse(item.itemDetails); } catch { return {}; } })() : {};
    const rawYear = details.releaseYear || details.year || details.release_date_year;
    const releaseYear = Number(rawYear);
    return {
      title: String(details.gameTitle || details.videoGameTitle || details.title || item.title).trim(),
      releaseYear: Number.isInteger(releaseYear) && releaseYear > 0 ? releaseYear : undefined,
      platform: details.platform || details.console || details.system || undefined,
    };
  }, [item.itemDetails, item.title]);
  const { data, isLoading } = trpc.testAI.getRawgGameMetadata.useQuery(lookupInput, { enabled: supported && lookupInput.title.length >= 2 });
  if (!supported) return <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🎮 RAWG Video Game Catalog</p><p className="text-gray-500 text-[10px]">This read-only reference source currently supports Video Game items only.</p></div>;
  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🎮 RAWG Video Game Catalog</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">User-approved read-only Video Game catalog metadata · Query: {lookupInput.title} · Not a price, grading, certification, authenticity, condition, or ownership source</p>
    {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
    {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-300">{data.message}</p>}
    {data?.status === 'success' && data.data && <div className="space-y-2 rounded bg-gray-900/40 p-2"><a href={data.data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-blue-300 hover:underline">{data.data.title}</a><p className="text-[10px] text-amber-200/90">{data.data.matchNote}</p>{data.data.facts.length > 0 && <div className="grid grid-cols-2 gap-1.5 text-[10px]">{data.data.facts.map((fact: any) => <div key={fact.label} className="rounded bg-gray-800/60 p-1.5"><p className="text-[8px] uppercase text-gray-500">{fact.label}</p><p className="break-words font-semibold text-white">{fact.value}</p></div>)}</div>}</div>}
  </div>;
}

function IgdbSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category === 'video_games';
  const lookupInput = useMemo(() => {
    const details = item.itemDetails ? (() => { try { return JSON.parse(item.itemDetails); } catch { return {}; } })() : {};
    const rawYear = details.releaseYear || details.year || details.release_date_year;
    const releaseYear = Number(rawYear);
    return {
      title: String(details.gameTitle || details.videoGameTitle || details.title || item.title).trim(),
      releaseYear: Number.isInteger(releaseYear) && releaseYear > 0 ? releaseYear : undefined,
      platform: details.platform || details.console || details.system || undefined,
    };
  }, [item.itemDetails, item.title]);
  const { data, isLoading } = trpc.testAI.getIgdbGameMetadata.useQuery(lookupInput, { enabled: supported && lookupInput.title.length >= 2 });
  if (!supported) return <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🕹️ IGDB Video Game Catalog</p><p className="text-gray-500 text-[10px]">This read-only reference source currently supports Video Game items only.</p></div>;
  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🕹️ IGDB Video Game Catalog</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">Commercially approved read-only game identification metadata · Query: {lookupInput.title} · Not a price, grading, certification, authenticity, condition, or ownership source</p>
    {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
    {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-300">{data.message}</p>}
    {data?.status === 'success' && data.data && <div className="space-y-2 rounded bg-gray-900/40 p-2"><a href={data.data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-blue-300 hover:underline">{data.data.title}</a><p className="text-[10px] text-amber-200/90">{data.data.matchNote}</p>{data.data.facts.length > 0 && <div className="grid grid-cols-2 gap-1.5 text-[10px]">{data.data.facts.map((fact: any) => <div key={fact.label} className="rounded bg-gray-800/60 p-1.5"><p className="text-[8px] uppercase text-gray-500">{fact.label}</p><p className="break-words font-semibold text-white">{fact.value}</p></div>)}</div>}</div>}
  </div>;
}

function WikidataSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category === 'movies' || item.category === 'autographs';
  const category = item.category === 'movies' ? 'movies' : 'autographs';
  const details = item.itemDetails ? (() => { try { return JSON.parse(item.itemDetails); } catch { return {}; } })() : {};
  const metadataQuery = category === 'autographs' ? (details.signer || item.title) : (details.title || details.movieTitle || item.title);
  const { data, isLoading } = trpc.testAI.getWikidataMetadata.useQuery(
    { query: metadataQuery, category },
    { enabled: supported && !!metadataQuery },
  );
  if (!supported) return <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🔎 Wikidata Metadata</p><p className="text-gray-500 text-[10px]">This read-only reference source currently supports Movie titles and Autograph signer names only.</p></div>;
  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🔎 Wikidata Metadata</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">Read-only public metadata for Movies and Autographs · Query: {metadataQuery} · Not a price, certification, or authenticity source</p>
    {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
    {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-300">{data.message}</p>}
    {data?.status === 'success' && data.data && <div className="flex gap-3 rounded bg-gray-900/40 p-2">{data.data.imageUrl && <img src={data.data.imageUrl} alt="" className="h-20 w-14 rounded border border-gray-700/40 object-cover" />}<div className="min-w-0 flex-1 space-y-2"><div><a href={data.data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-blue-300 hover:underline">{data.data.title}</a>{data.data.description && <p className="mt-0.5 text-[10px] text-gray-400">{data.data.description}</p>}</div>{data.data.facts.length > 0 && <div className="grid grid-cols-2 gap-1.5 text-[10px]">{data.data.facts.map((fact: any) => <div key={fact.label} className="rounded bg-gray-800/60 p-1.5"><p className="text-[8px] uppercase text-gray-500">{fact.label}</p><p className="break-words font-semibold text-white">{fact.value}</p></div>)}</div>}</div></div>}
  </div>;
}

function SmithsonianSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const supported = item.category === 'stamps';
  const { data, isLoading } = trpc.testAI.getSmithsonianStampReference.useQuery(
    { query: item.title },
    { enabled: supported && !!item.title },
  );
  if (!supported) return <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🏛️ Smithsonian Stamp Reference</p><p className="text-gray-500 text-[10px]">This read-only reference source currently supports Stamp items only.</p></div>;
  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🏛️ Smithsonian Stamp Reference</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">Read-only National Postal Museum reference · Not a price, certification, or authenticity source</p>
    {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
    {data?.status === 'not_found' && <p className="rounded border border-amber-700/30 bg-amber-900/20 p-2 text-[10px] text-amber-300">{data.message}</p>}
    {data?.status === 'success' && data.data && <div className="flex gap-3 rounded bg-gray-900/40 p-2">{data.data.imageUrl && <img src={data.data.imageUrl} alt="" className="h-20 w-14 rounded border border-gray-700/40 object-cover" />}<div className="min-w-0 flex-1 space-y-2"><a href={data.data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-blue-300 hover:underline">{data.data.title}</a><div className="grid grid-cols-2 gap-1.5 text-[10px]">{data.data.facts.map((fact: any) => <div key={fact.label} className="rounded bg-gray-800/60 p-1.5"><p className="text-[8px] uppercase text-gray-500">{fact.label}</p><p className="break-words font-semibold text-white">{fact.value}</p></div>)}</div></div></div>}
  </div>;
}

function PwccSection({ item, side }: { item: SelectedItem; side: 'left' | 'right' }) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const { data, isLoading } = trpc.testAI.getPwccSales.useQuery({ query: item.title, itemDetails: item.itemDetails, imageUrl: item.primaryPhotoUrl }, { enabled: !!item.title });
  const sales = data?.data?.items ?? [];
  const buckets = [
    ['Recent comparable sales · last 12 months', sales.filter((sale: any) => sale.recency === 'recent'), 'text-emerald-300'],
    ['Historical context · older than 12 months', sales.filter((sale: any) => sale.recency === 'historical'), 'text-amber-300'],
    ['Undated records · research only', sales.filter((sale: any) => sale.recency === 'undated'), 'text-gray-400'],
  ] as const;
  return <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 space-y-3">
    <div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧩 PWCC / Fanatics Collect</p>{isLoading && <Spinner className="w-3 h-3" />}</div>
    <p className="text-gray-500 text-[10px]">Read-only Parse.bot sold listings. No current average or valuation is calculated; verify exact card, grade, and certification before comparing.</p>
    {data && 'visualFilter' in data && data.visualFilter?.note && <p className="rounded border border-cyan-700/30 bg-cyan-950/30 p-2 text-[10px] text-cyan-200">{data.visualFilter.note}</p>}
    <MarketplaceVisualReview data={data} targetImageUrl={item.primaryPhotoUrl} sourceLabel="PWCC / Fanatics Collect sales" />
    {data?.status === 'error' && <p className="rounded border border-red-700/30 bg-red-900/20 p-2 text-[10px] text-red-400">{data.message}</p>}
    {data?.status === 'success' && <div className="space-y-3">{buckets.map(([label, bucket, color]) => bucket.length > 0 && <div key={label}><p className={`mb-1 text-[10px] font-semibold uppercase ${color}`}>{label}</p>{bucket.map((sale: any) => <div key={sale.id || sale.title} className="flex items-center justify-between gap-2 border-b border-gray-700/20 py-1 last:border-0"><div className="min-w-0"><a href={sale.url || undefined} target="_blank" rel="noopener noreferrer" className="block truncate text-[10px] text-blue-400 hover:underline">{sale.title}</a><p className="text-[9px] text-gray-500">{[sale.marketplace, sale.grade ? `${sale.certificationCompany || ''} ${formatGrade(sale.grade)}`.trim() : null, sale.date || 'Date unavailable'].filter(Boolean).join(' · ')}</p></div><p className="shrink-0 text-[11px] font-semibold text-green-400">{sale.price != null ? `${sale.currency || 'USD'} ${formatWholeDollar(sale.price)}` : 'Price N/A'}</p></div>)}</div>)}{!sales.length && <p className="text-[10px] text-gray-500">No sold PWCC / Fanatics Collect listings were returned for this query.</p>}</div>}
  </div>;
}

function testAiDetails(item: SelectedItem): Record<string, any> {
  if (!item.itemDetails) return {};
  try {
    const parsed = JSON.parse(item.itemDetails);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function evidenceStatus(data: any): 'success' | 'not_found' | 'error' | 'idle' {
  if (!data) return 'idle';
  if (data.status === 'success') return 'success';
  if (data.status === 'partial') return 'success';
  if (data.status === 'review_required') return 'not_found';
  if (data.status === 'not_found') return 'not_found';
  if (data.status === 'error' || data.error) return 'error';
  return 'success';
}

function factValue(facts: any[], labels: string[]): string {
  const normalizedLabels = labels.map((label) => label.toLowerCase().replace(/[^a-z0-9]+/g, ''));
  const matchingFact = facts.find((fact: any) => normalizedLabels.includes(String(fact?.label ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')));
  return matchingFact?.value == null ? '' : String(matchingFact.value);
}

function factualFields(data: any, source: 'tcgdex' | 'rawg' | 'igdb' | 'wikidata' | 'smithsonian'): Record<string, unknown> {
  const details = data?.data;
  if (!details) return {};
  const facts = Array.isArray(details.facts) ? details.facts : [];
  if (source === 'tcgdex') return {
    cardName: details.title,
    set: factValue(facts, ['Set']),
    cardNumber: factValue(facts, ['Card number', 'Number']),
    variant: factValue(facts, ['Variants', 'Variant']),
  };
  if (source === 'rawg' || source === 'igdb') return {
    title: details.title,
    platform: factValue(facts, ['Platforms', 'Platform']),
    globalReleaseYear: factValue(facts, ['First release', 'Release year', 'Release date']),
  };
  if (source === 'wikidata') return { title: details.title };
  return {
    title: details.title,
    catalogNumber: factValue(facts, ['Catalog number', 'Object number']),
    issueYear: factValue(facts, ['Date', 'Issue year']),
    country: factValue(facts, ['Place', 'Country']),
  };
}

function EvidenceNormalizationSummary({ item, marketItem, side, enabledSources, ebayData, soldCompsData, hipstampData, hipstampSoldData, pokemonPriceTrackerData, theCardApiData, cardsightAiData, lelandsData, pristineAuctionData, pcgsAuctionData, oneThirtyPointData, onSummaryChange }: {
  item: SelectedItem;
  marketItem: SelectedItem;
  side: 'left' | 'right';
  enabledSources: Set<SourceId>;
  ebayData: any;
  soldCompsData: any;
  hipstampData: any;
  hipstampSoldData: any;
  pokemonPriceTrackerData: any;
  theCardApiData: any;
  cardsightAiData: any;
  lelandsData: any;
  pristineAuctionData: any;
  pcgsAuctionData: any;
  oneThirtyPointData: any;
  onSummaryChange?: (summary: NormalizedEvidenceSummary) => void;
}) {
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  const details = useMemo(() => testAiDetails(item), [item]);
  const tcgdexInput = useMemo(() => ({
    query: String(details.cardName || details.pokemonName || details.name || item.title.replace(/^pokemon\s+/i, '')).trim(),
    cardNumber: details.cardNumber || details.cardNo || details.number || undefined,
    setName: details.setName || details.set || details.cardSet || undefined,
  }), [details, item.title]);
  const gameInput = useMemo(() => {
    const year = Number(details.releaseYear || details.year || details.release_date_year);
    return {
      title: String(details.gameTitle || details.videoGameTitle || details.title || item.title).trim(),
      releaseYear: Number.isInteger(year) && year > 0 ? year : undefined,
      platform: details.platform || details.console || details.system || undefined,
    };
  }, [details, item.title]);
  const priceChartingCoinQueryInput = useMemo(() => ({ query: item.title }), [item.title]);
  const priceChartingVideoGameInput = useMemo(() => {
    const raw = details.upc ?? details.UPC ?? details.barcode ?? details.barCode ?? details.productUpc ?? '';
    const upc = String(raw).replace(/\D/g, '');
    return { upc: /^\d{8,14}$/.test(upc) ? upc : '00000000' };
  }, [details]);
  const priceChartingSlugInput = useMemo(() => ({
    setSlug: String(details.setSlug ?? details.cardSetSlug ?? details.priceChartingSetSlug ?? 'unavailable').trim(),
    cardSlug: String(details.cardSlug ?? details.priceChartingCardSlug ?? 'unavailable').trim(),
  }), [details]);
  const sportsUnopenedSearchCriteria = useMemo(() => {
    const normalizedItemType = String(item.itemType ?? '').trim().toLowerCase().replace(/[ -]+/g, '_');
    const isUnopenedProduct = item.category === 'sports_cards' && (normalizedItemType === 'unopened_product' || details.productName || details.productFormat);
    const isYes = (value: unknown) => String(value ?? '').trim().toLowerCase() === 'yes';
    const sport = String(details.sport ?? details.customSport ?? '').trim();
    const productFormat = String(details.productFormat ?? '').trim();
    const isAuthenticated = isYes(details.authenticated) || isYes(details.isGraded) || isYes(details.graded);
    const authenticationCompany = isAuthenticated ? String(details.authenticationCompany ?? details.customAuthenticationCompany ?? '').trim() : '';
    const fromSealedCase = isYes(details.fromASealedCase);
    return { isUnopenedProduct: Boolean(isUnopenedProduct), sport, productFormat, isAuthenticated, authenticationCompany, fromSealedCase };
  }, [item.category, item.itemType, details]);
  const discogsSearchCriteria = useMemo(() => {
    const isMusic = item.category.trim().toLowerCase().replace(/[_-]+/g, ' ') === 'music';
    const releaseTitle = String(item.releaseTitle ?? details.releaseTitle ?? '').trim();
    const artist = String(item.artist ?? details.artist ?? '').trim();
    const rawReleaseYear = String(details.releaseYear ?? '').trim();
    const parsedReleaseYear = /^\d{4}$/.test(rawReleaseYear) ? Number(rawReleaseYear) : null;
    const latestPlausibleYear = new Date().getUTCFullYear() + 1;
    const releaseYear = parsedReleaseYear && parsedReleaseYear >= 1877 && parsedReleaseYear <= latestPlausibleYear ? String(parsedReleaseYear) : null;
    return { isMusic, releaseTitle, artist, releaseYear };
  }, [item.category, item.releaseTitle, item.artist, details.releaseTitle, details.artist, details.releaseYear]);
  const wikidataCategory = item.category === 'movies' ? 'movies' : 'autographs';
  const wikidataQuery = String(wikidataCategory === 'autographs' ? (details.signer || item.title) : (details.title || details.movieTitle || item.title)).trim();
  const certNumber = item.certId || '';

  const tcgdexQuery = trpc.testAI.getTcgDexCatalog.useQuery(tcgdexInput, { enabled: enabledSources.has('tcgdex') && item.category === 'pokemon' && tcgdexInput.query.length >= 2 });
  const rawgQuery = trpc.testAI.getRawgGameMetadata.useQuery(gameInput, { enabled: enabledSources.has('rawg') && item.category === 'video_games' && gameInput.title.length >= 2 });
  const igdbQuery = trpc.testAI.getIgdbGameMetadata.useQuery(gameInput, { enabled: enabledSources.has('igdb') && item.category === 'video_games' && gameInput.title.length >= 2 });
  const priceChartingQuery = trpc.testAI.getPriceChartingData.useQuery({ query: item.title }, { enabled: enabledSources.has('pricecharting') && item.category === 'pokemon' && !!item.title });
  const priceChartingCoinQuery = trpc.testAI.getPriceChartingCoinData.useQuery(priceChartingCoinQueryInput, { enabled: enabledSources.has('pricecharting') && item.category === 'coins' && !!item.title });
  const priceChartingVideoGameQuery = trpc.testAI.getPriceChartingVideoGameData.useQuery(priceChartingVideoGameInput, { enabled: enabledSources.has('pricecharting') && item.category === 'video_games' && priceChartingVideoGameInput.upc !== '00000000' });
  const priceChartingSlugQuery = trpc.testAI.getPriceChartingCardDetail.useQuery(priceChartingSlugInput, { enabled: enabledSources.has('pricecharting') && item.category === 'pokemon' && priceChartingSlugInput.setSlug !== 'unavailable' && priceChartingSlugInput.cardSlug !== 'unavailable' });
  const priceChartingMoversQuery = trpc.testAI.getPriceChartingBigMovers.useQuery(undefined, { enabled: enabledSources.has('pricecharting') });
  const [selectedDiscogsReleaseId, setSelectedDiscogsReleaseId] = useState<number | null>(null);
  const discogsQuery = trpc.testAI.getDiscogsReleases.useQuery({
    releaseTitle: discogsSearchCriteria.releaseTitle || 'unavailable',
    category: item.category,
    itemDetails: item.itemDetails ?? undefined,
  }, { enabled: enabledSources.has('discogs') && discogsSearchCriteria.isMusic && discogsSearchCriteria.releaseTitle.length >= 2 });
  const smithsonianQuery = trpc.testAI.getSmithsonianStampReference.useQuery({ query: item.title }, { enabled: enabledSources.has('smithsonian') && item.category === 'stamps' && !!item.title });
  const wikidataQueryResult = trpc.testAI.getWikidataMetadata.useQuery({ query: wikidataQuery, category: wikidataCategory }, { enabled: enabledSources.has('wikidata') && (item.category === 'movies' || item.category === 'autographs') && !!wikidataQuery });
  const psaQuery = trpc.testAI.getPSAData.useQuery({ certNumber }, { enabled: enabledSources.has('psa') && !!certNumber });
  const bgsQuery = trpc.testAI.getBeckettData.useQuery({ certNumber }, { enabled: enabledSources.has('bgs') && !!certNumber });
  const sgcQuery = trpc.testAI.getSgcData.useQuery({ certNumber }, { enabled: enabledSources.has('sgc') && !!certNumber });
  const cgcQuery = trpc.testAI.getCgcComicsData.useQuery({ certNumber }, { enabled: enabledSources.has('cgc') && item.category === 'comics' && isCgcCompany(item.gradingCompany) && !!certNumber });
  const pcgsQuery = trpc.testAI.getPcgsData.useQuery({ certNumber }, { enabled: enabledSources.has('pcgs') && item.gradingCompany === 'PCGS' && !!certNumber });
  const pwccQuery = trpc.testAI.getPwccSales.useQuery({ query: marketItem.title, itemDetails: marketItem.itemDetails }, { enabled: enabledSources.has('pwcc') && !!marketItem.title });
  const discogsCandidates = useMemo(() => discogsQuery.data?.data?.results ?? [], [discogsQuery.data]);

  useEffect(() => {
    setSelectedDiscogsReleaseId((current) => {
      if (current && discogsCandidates.some((release) => release.id === current)) return current;
      return discogsCandidates.length === 1 ? discogsCandidates[0].id : null;
    });
  }, [item.id, item.title, discogsCandidates]);

  const summary = useMemo(() => {
    const observations: EvidenceSourceObservation[] = [];
    const add = (observation: EvidenceSourceObservation) => observations.push(observation);
    if (enabledSources.has('ebay_active')) add({ id: 'ebay_active', label: 'eBay Active Listings', kind: 'market_current', status: evidenceStatus(ebayData), market: { currentListingCount: ebayData?.listings?.length ?? 0 }, message: ebayData?.error ?? null });
    if (enabledSources.has('hipstamp')) add({ id: 'hipstamp', label: 'HIPStamp Active Listings', kind: 'market_current', status: evidenceStatus(hipstampData), market: { currentListingCount: hipstampData?.listings?.length ?? 0 }, message: hipstampData?.error ?? null });
    if (enabledSources.has('hipstamp_sold')) add({ id: 'hipstamp_sold', label: 'HIPStamp Sold / Closed', kind: 'market_historical', status: evidenceStatus(hipstampSoldData), market: { recentSaleCount: hipstampSoldData?.listings?.length ?? 0, historicalSaleCount: 0, undatedSaleCount: 0 }, message: hipstampSoldData?.error ?? (hipstampSoldData?.listings?.length ? `Store-scoped closed listings marked sold; format matched to ${hipstampSoldData?.debug?.targetFormat?.label ?? 'the selected stamp'}. Not marketplace-wide sales evidence.` : null) });
    if (enabledSources.has('pokemon_price_tracker')) add({ id: 'pokemon_price_tracker', label: 'Pokémon Price Tracker', kind: 'reference', status: evidenceStatus(pokemonPriceTrackerData), fields: { cardName: pokemonPriceTrackerData?.detail?.name ?? pokemonPriceTrackerData?.selected?.card?.name, set: pokemonPriceTrackerData?.detail?.setName ?? pokemonPriceTrackerData?.selected?.card?.setName, cardNumber: pokemonPriceTrackerData?.detail?.cardNumber ?? pokemonPriceTrackerData?.selected?.card?.cardNumber, variant: pokemonPriceTrackerData?.detail?.prices?.primaryPrinting ?? pokemonPriceTrackerData?.selected?.card?.prices?.primaryPrinting }, message: pokemonPriceTrackerData?.messages?.join(' ') ?? null });
    if (enabledSources.has('the_card_api')) {
      const sales = theCardApiData?.sales ?? [];
      const confirmedRecent = sales.filter((sale: any) => sale.confirmed && sale.recency === 'recent').length;
      add({
        id: 'the_card_api',
        label: 'The Card API Sales',
        kind: confirmedRecent > 0 ? 'market_completed' : 'market_historical',
        role: confirmedRecent > 0 ? 'valuation_candidate' : 'historical_context',
        status: evidenceStatus(theCardApiData),
        market: { completedSaleCount: confirmedRecent, historicalSaleCount: sales.filter((sale: any) => sale.recency === 'historical').length, undatedSaleCount: sales.filter((sale: any) => sale.recency === 'undated' || !sale.confirmed).length },
        fields: { subject: theCardApiData?.catalog?.selected?.candidate?.subject, set: theCardApiData?.catalog?.selected?.candidate?.set_name, cardNumber: theCardApiData?.catalog?.selected?.candidate?.card_number, catalogId: theCardApiData?.catalog?.selected?.candidate?.ucid },
        message: theCardApiData?.messages?.join(' ') ?? null,
      });
    }
    if (enabledSources.has('cardsight_ai')) {
      const sales = cardsightAiData?.sales ?? [];
      const completedRecent = sales.filter((sale: any) => sale.completed && sale.recency === 'recent').length;
      add({
        id: 'cardsight_ai',
        label: 'Cardsight.ai Market Data',
        kind: completedRecent > 0 ? 'market_completed' : 'market_historical',
        role: completedRecent > 0 ? 'valuation_candidate' : 'historical_context',
        status: evidenceStatus(cardsightAiData),
        market: { completedSaleCount: completedRecent, historicalSaleCount: sales.filter((sale: any) => sale.completed && sale.recency === 'historical').length, undatedSaleCount: sales.filter((sale: any) => sale.completed && sale.recency === 'undated').length, currentListingCount: cardsightAiData?.activeListings?.length ?? 0 },
        // Cardsight's setName can be a catalog container such as “Checklist”,
        // while release + selected parallel carry the collectible identity.
        // Display both in the source panel but do not create a false Set conflict
        // in the cross-source evidence review.
        fields: { subject: cardsightAiData?.detail?.name ?? cardsightAiData?.selected?.card?.name, cardNumber: cardsightAiData?.detail?.number ?? cardsightAiData?.selected?.card?.number, variant: cardsightAiData?.parallel?.name ?? (cardsightAiData?.parallel?.status === 'base' ? 'Base' : undefined), catalogId: cardsightAiData?.selected?.card?.id },
        message: cardsightAiData?.messages?.join(' ') ?? null,
      });
    }
    for (const source of [{ id: 'lelands', label: 'Lelands Auctions', data: lelandsData }, { id: 'pristine_auction', label: 'Pristine Auction', data: pristineAuctionData }] as const) {
      if (!enabledSources.has(source.id)) continue;
      const sales = source.data?.sales ?? [];
      const context = source.data?.context ?? [];
      const recent = sales.filter((sale: any) => {
        const timestamp = Date.parse(String(sale.date ?? ''));
        return Number.isFinite(timestamp) && Date.now() >= timestamp && Date.now() - timestamp <= 365 * 86_400_000;
      }).length;
      add({ id: source.id, label: source.label, kind: recent > 0 ? 'market_completed' : 'market_historical', role: recent > 0 ? 'valuation_candidate' : 'historical_context', status: evidenceStatus(source.data), market: { completedSaleCount: recent, historicalSaleCount: sales.length - recent, undatedSaleCount: context.filter((sale: any) => !sale.date).length }, message: source.data?.messages?.join(' ') ?? null });
    }
    if (enabledSources.has('sold_comps')) add({ id: 'sold_comps', label: 'Sold-Comps', kind: 'market_completed', status: evidenceStatus(soldCompsData), market: { completedSaleCount: soldCompsData?.listings?.length ?? 0 }, message: soldCompsData?.error ?? null });
    if (enabledSources.has('one_thirty_point')) {
      const sales = oneThirtyPointData?.data?.items ?? [];
      const recentCompletedCount = sales.filter((sale: any) => sale.recency === 'recent').length;
      add({
        id: 'one_thirty_point',
        label: '130point',
        kind: recentCompletedCount > 0 ? 'market_completed' : 'market_historical',
        role: recentCompletedCount > 0 ? 'valuation_candidate' : 'historical_context',
        status: evidenceStatus(oneThirtyPointData),
        market: {
          completedSaleCount: recentCompletedCount,
          historicalSaleCount: sales.filter((sale: any) => sale.recency === 'historical').length,
          undatedSaleCount: sales.filter((sale: any) => sale.recency === 'undated').length,
        },
        message: oneThirtyPointData?.message ?? null,
      });
    }
    if (enabledSources.has('pwcc')) {
      const sales = pwccQuery.data?.data?.items ?? [];
      add({ id: 'pwcc', label: 'PWCC / Fanatics Collect', kind: 'market_historical', status: evidenceStatus(pwccQuery.data), market: { recentSaleCount: sales.filter((sale: any) => sale.recency === 'recent').length, historicalSaleCount: sales.filter((sale: any) => sale.recency === 'historical').length, undatedSaleCount: sales.filter((sale: any) => sale.recency === 'undated').length }, message: pwccQuery.data?.message ?? null });
    }
    if (enabledSources.has('tcgdex')) add({ id: 'tcgdex', label: 'TCGdex', kind: 'reference', status: evidenceStatus(tcgdexQuery.data), fields: factualFields(tcgdexQuery.data, 'tcgdex'), message: tcgdexQuery.data?.message ?? null });
    if (enabledSources.has('pricecharting')) {
      const priceData = priceChartingQuery.data ?? priceChartingCoinQuery.data ?? priceChartingVideoGameQuery.data ?? priceChartingSlugQuery.data;
      const marketMoverCount = priceChartingMoversQuery.data?.data?.movers?.length ?? 0;
      const priceFields = (priceData?.data ?? {}) as Record<string, any>;
      add({ id: 'pricecharting', label: 'PriceCharting', kind: 'market_current', role: 'asking_price_context', status: evidenceStatus(priceData), fields: { cardName: priceFields.name, title: priceFields.title, set: priceFields.set, cardNumber: priceFields.cardNumber, platform: priceFields.platform, marketMoverCount }, message: priceData?.message ?? priceChartingMoversQuery.data?.message ?? null });
    }
    if (enabledSources.has('discogs') && discogsSearchCriteria.isMusic) {
      const release = discogsCandidates.find((candidate) => candidate.id === selectedDiscogsReleaseId) ?? null;
      add({
        id: 'discogs',
        label: 'Discogs Music Catalog',
        kind: 'reference',
        status: evidenceStatus(discogsQuery.data),
        // Multiple Discogs candidates are intentionally not treated as a match.
        // A release/pressing must be selected or otherwise confirmed before it
        // can align a listing's material Music fields.
        fields: release ? {
          artist: release.artist,
          releaseTitle: release.releaseTitle,
          catalogNumber: release.catalogNumber.join(', '),
          recordLabel: release.label.join(', '),
          country: release.country,
          releaseYear: release.year,
          format: release.format.join(', '),
        } : undefined,
        message: discogsQuery.data?.message
          ?? (discogsCandidates.length > 1 ? `${discogsCandidates.length} Discogs release candidates were returned; select the exact release/pressing before treating catalog fields as aligned.` : null),
      });
    }
    if (enabledSources.has('rawg')) add({ id: 'rawg', label: 'RAWG', kind: 'reference', status: evidenceStatus(rawgQuery.data), fields: factualFields(rawgQuery.data, 'rawg'), message: rawgQuery.data?.message ?? null });
    if (enabledSources.has('igdb')) add({ id: 'igdb', label: 'IGDB', kind: 'reference', status: evidenceStatus(igdbQuery.data), fields: factualFields(igdbQuery.data, 'igdb'), message: igdbQuery.data?.message ?? null });
    if (enabledSources.has('smithsonian')) add({ id: 'smithsonian', label: 'Smithsonian', kind: 'reference', status: evidenceStatus(smithsonianQuery.data), fields: factualFields(smithsonianQuery.data, 'smithsonian'), message: smithsonianQuery.data?.message ?? null });
    if (enabledSources.has('wikidata')) add({ id: 'wikidata', label: 'Wikidata', kind: 'reference', status: evidenceStatus(wikidataQueryResult.data), fields: factualFields(wikidataQueryResult.data, 'wikidata'), message: wikidataQueryResult.data?.message ?? null });
    if (enabledSources.has('cgc')) add({ id: 'cgc', label: 'Parse.bot CGC Comics', kind: 'certification', status: evidenceStatus(cgcQuery.data), fields: { title: cgcQuery.data?.data?.title, issueNumber: cgcQuery.data?.data?.issueNumber, year: cgcQuery.data?.data?.year, publisher: cgcQuery.data?.data?.publisher, certificationCompany: 'CGC', grade: cgcQuery.data?.data?.grade, labelCategory: cgcQuery.data?.data?.labelCategory }, message: cgcQuery.data?.message ?? null });
    if (enabledSources.has('psa')) add({ id: 'psa', label: 'Parse.bot PSA', kind: 'certification', status: evidenceStatus(psaQuery.data), fields: { title: psaQuery.data?.data?.cardTitle, player: psaQuery.data?.data?.subject, year: psaQuery.data?.data?.year, manufacturer: psaQuery.data?.data?.brand, cardNumber: psaQuery.data?.data?.cardNumber, certificationCompany: 'PSA', grade: psaQuery.data?.data?.grade }, message: psaQuery.data?.message ?? null });
    if (enabledSources.has('bgs')) add({ id: 'bgs', label: 'Parse.bot BGS', kind: 'certification', status: evidenceStatus(bgsQuery.data), fields: { title: bgsQuery.data?.data?.playerName, player: bgsQuery.data?.data?.playerName, set: bgsQuery.data?.data?.setName, cardNumber: bgsQuery.data?.data?.cardNumber, year: bgsQuery.data?.data?.year, manufacturer: bgsQuery.data?.data?.manufacturer, certificationCompany: 'BGS', grade: bgsQuery.data?.data?.finalGrade }, message: bgsQuery.data?.message ?? null });
    if (enabledSources.has('sgc')) add({ id: 'sgc', label: 'Parse.bot SGC', kind: 'certification', status: evidenceStatus(sgcQuery.data), fields: { title: sgcQuery.data?.data?.subject, player: sgcQuery.data?.data?.subject, set: sgcQuery.data?.data?.cardSet, cardNumber: sgcQuery.data?.data?.cardNumber, certificationCompany: 'SGC', grade: sgcQuery.data?.data?.grade }, message: sgcQuery.data?.message ?? null });
    if (enabledSources.has('pcgs')) {
      add({ id: 'pcgs', label: 'PCGS CoinFacts', kind: 'certification', status: evidenceStatus(pcgsQuery.data), fields: { title: pcgsQuery.data?.data?.name, year: pcgsQuery.data?.data?.year, denomination: pcgsQuery.data?.data?.denomination, variety: pcgsQuery.data?.data?.variety, certificationCompany: 'PCGS', grade: pcgsQuery.data?.data?.grade }, message: pcgsQuery.data?.message ?? null });
      const auctions = pcgsAuctionData?.data?.auctions ?? [];
      const dated = auctions.filter((auction: any) => Number.isFinite(Date.parse(String(auction.date ?? ''))) && auction.price != null);
      add({ id: 'pcgs_auction_results', label: 'PCGS Auction Prices Realized', kind: dated.length ? 'market_completed' : 'market_historical', role: dated.length ? 'valuation_candidate' : 'historical_context', status: evidenceStatus(pcgsAuctionData), market: { completedSaleCount: dated.length, historicalSaleCount: auctions.length - dated.length, undatedSaleCount: auctions.filter((auction: any) => !auction.date).length }, fields: { certificationCompany: 'PCGS', certNumber: pcgsAuctionData?.data?.certNo ?? item.certId, pcgsNo: pcgsAuctionData?.data?.pcgsNo, subject: pcgsAuctionData?.data?.name, grade: pcgsAuctionData?.data?.grade }, message: pcgsAuctionData?.message ?? null });
    }
    return normalizeTestAiEvidence(item, observations);
  }, [item, enabledSources, ebayData, soldCompsData, hipstampData, hipstampSoldData, pokemonPriceTrackerData, theCardApiData, cardsightAiData, lelandsData, pristineAuctionData, pcgsAuctionData, oneThirtyPointData, pwccQuery.data, tcgdexQuery.data, priceChartingQuery.data, priceChartingCoinQuery.data, priceChartingVideoGameQuery.data, priceChartingSlugQuery.data, priceChartingMoversQuery.data, discogsSearchCriteria.isMusic, discogsQuery.data, discogsCandidates, selectedDiscogsReleaseId, rawgQuery.data, igdbQuery.data, smithsonianQuery.data, wikidataQueryResult.data, cgcQuery.data, psaQuery.data, bgsQuery.data, sgcQuery.data, pcgsQuery.data]);

  useEffect(() => {
    onSummaryChange?.(summary);
  }, [onSummaryChange, summary]);

  const statusLabel = (status: string) => status === 'success' ? 'available' : status === 'idle' ? 'checking' : status.replace('_', ' ');
  return <section className="rounded-xl border border-violet-700/40 bg-violet-950/20 p-3 space-y-3" aria-label={`${side === 'left' ? 'Item A' : 'Item B'} normalized evidence review`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className={`text-[11px] font-bold uppercase ${accentColor}`}>Evidence review</p><p className="mt-0.5 text-[10px] text-gray-500">Deterministic identity and evidence check. It preserves source facts and does not calculate a value.</p></div><Badge variant="outline" className="border-violet-600/50 text-[9px] text-violet-200">{summary.category}</Badge></div>
    <div className="grid gap-1 rounded-md border border-violet-700/25 bg-gray-950/30 p-2 text-[9px] text-gray-400 sm:grid-cols-3" aria-label="Evidence Review flag legend">
      <p><span className="font-semibold text-amber-300">Material:</span> a selected source differs on a key identity field. Review before comparing.</p>
      <p><span className="font-semibold text-sky-300">Contextual:</span> both facts may be valid, such as global versus regional release dates.</p>
      <p><span className="font-semibold text-gray-300">Coverage:</span> no result or service issue; it is not negative proof about the item.</p>
    </div>
    {summary.identity.length > 0 && <div className="flex flex-wrap gap-1.5">{summary.identity.map((field) => <span key={field.key} className="rounded bg-gray-900/60 px-2 py-1 text-[10px] text-gray-300"><span className="text-gray-500">{field.label}:</span> {field.value}</span>)}</div>}
    <div className="grid gap-2 sm:grid-cols-2">
      <div className={`rounded border p-2 ${summary.identityReadiness.readiness === 'ready' ? 'border-emerald-700/30 bg-emerald-950/15' : 'border-amber-700/30 bg-amber-950/15'}`}>
        <p className={`text-[9px] font-semibold uppercase ${summary.identityReadiness.readiness === 'ready' ? 'text-emerald-300' : 'text-amber-300'}`}>P0 identity readiness · {summary.identityReadiness.readiness.replace(/_/g, ' ')}</p>
        <p className="mt-1 text-[10px] text-gray-300">{summary.identityReadiness.itemType} · {summary.identityReadiness.missingCriticalFields.length ? `Missing critical: ${summary.identityReadiness.missingCriticalFields.join(', ')}` : 'All category-critical identifiers are supplied.'}</p>
        <p className="mt-1 text-[9px] text-gray-500">Missing identifiers are a request for review—not evidence that the listing is wrong.</p>
      </div>
      <div className={`rounded border p-2 ${summary.evidenceSufficiency.status === 'sufficient' ? 'border-sky-700/30 bg-sky-950/15' : 'border-orange-700/30 bg-orange-950/15'}`}>
        <p className={`text-[9px] font-semibold uppercase ${summary.evidenceSufficiency.status === 'sufficient' ? 'text-sky-300' : 'text-orange-300'}`}>P0 evidence sufficiency · {summary.evidenceSufficiency.status}</p>
        <p className="mt-1 text-[10px] text-gray-300">{summary.evidenceSufficiency.message}</p>
        <p className="mt-1 text-[9px] text-gray-500">Completed sales are valuation candidates; asking, reference, certification, population, and news data remain context.</p>
      </div>
    </div>
    {sportsUnopenedSearchCriteria.isUnopenedProduct && <div className="rounded border border-amber-700/30 bg-amber-950/15 p-2">
      <p className="text-[9px] font-semibold uppercase text-amber-300">Sports Cards Unopened Product search criteria</p>
      <div className="mt-1 grid gap-1 text-[10px] text-gray-300 sm:grid-cols-3">
        <p><span className="text-gray-500">Sport:</span> {sportsUnopenedSearchCriteria.sport || 'Missing'}</p>
        <p><span className="text-gray-500">Product Format:</span> {sportsUnopenedSearchCriteria.productFormat || 'Missing'}</p>
        {sportsUnopenedSearchCriteria.isAuthenticated && <p><span className="text-gray-500">Authentication Company:</span> {sportsUnopenedSearchCriteria.authenticationCompany || 'Not supplied'}</p>}
        {sportsUnopenedSearchCriteria.fromSealedCase && <p><span className="text-gray-500">From a Sealed Case:</span> Yes → FASC</p>}
      </div>
      <p className="mt-1 text-[9px] text-gray-500">Sport and Product Format are included in the search; Condition and Product Name are not used. Authentication Company is included only when Authenticated is Yes; the exact token FASC is included only when From a Sealed Case is Yes.</p>
    </div>}
    {enabledSources.has('discogs') && discogsSearchCriteria.isMusic && <div className="rounded border border-emerald-700/30 bg-emerald-950/15 p-2">
      <p className="text-[9px] font-semibold uppercase text-emerald-300">Discogs search criteria</p>
      <div className="mt-1 grid gap-1 text-[10px] text-gray-300 sm:grid-cols-3">
        <p><span className="text-gray-500">Album / Release Title:</span> {discogsSearchCriteria.releaseTitle || 'Missing'}</p>
        <p><span className="text-gray-500">Artist / Performer:</span> {discogsSearchCriteria.artist || 'Not supplied'}</p>
        <p><span className="text-gray-500">Release Year:</span> {discogsSearchCriteria.releaseYear || 'Not supplied'}</p>
      </div>
      <p className="mt-1 text-[9px] text-gray-500">Primary request uses Album / Release Title and Artist / Performer{discogsSearchCriteria.releaseYear ? `, narrowed first by ${discogsSearchCriteria.releaseYear}` : ''}. If the year returns no candidate, Discogs retries without it. Listing title, format, label, catalog number, and country are not used as filters.</p>
      {discogsCandidates.length > 1 && <div className="mt-2 border-t border-emerald-800/30 pt-2">
        <label className="block text-[9px] font-semibold uppercase text-emerald-200">Confirm exact release / pressing</label>
        <select value={selectedDiscogsReleaseId ?? ''} onChange={(event) => setSelectedDiscogsReleaseId(event.target.value ? Number(event.target.value) : null)} className="mt-1 w-full rounded border border-emerald-800/40 bg-gray-950/70 px-2 py-1 text-[10px] text-gray-200 outline-none">
          <option value="">Select a matching Discogs release — no metadata alignment until selected</option>
          {discogsCandidates.map((release) => <option key={release.id} value={release.id}>{[release.artist, release.releaseTitle, release.year, release.country, release.format.join(', '), release.catalogNumber.join(', ')].filter(Boolean).join(' · ')}</option>)}
        </select>
        <p className="mt-1 text-[9px] text-emerald-100/70">Selection applies only to this sandbox run. Discogs is reference metadata, not valuation or authentication evidence.</p>
      </div>}
      {discogsCandidates.length === 1 && <p className="mt-2 text-[9px] text-emerald-100/70">One Discogs candidate returned and is included as reference metadata for this sandbox run.</p>}
    </div>}
    {summary.alignedSources.length > 0 && <div className="rounded bg-emerald-950/20 p-2"><p className="text-[9px] font-semibold uppercase text-emerald-300">Aligned specialist fields</p>{summary.alignedSources.map((source) => <p key={source.id} className="mt-1 text-[10px] text-gray-300"><span className="font-medium text-emerald-200">{source.label}:</span> {source.fields.join(', ')}</p>)}</div>}
    {summary.marketEvidence.length > 0 && <div className="rounded bg-sky-950/20 p-2"><p className="text-[9px] font-semibold uppercase text-sky-300">Market evidence classification</p>{summary.marketEvidence.map((entry) => <p key={entry} className="mt-1 text-[10px] text-gray-300">{entry}</p>)}</div>}
    {summary.reviewFlags.length > 0 && <div className="space-y-1 rounded bg-amber-950/25 p-2"><p className="text-[9px] font-semibold uppercase text-amber-300">Review before comparing</p>{summary.reviewFlags.map((flag, index) => <p key={`${flag.sourceId ?? 'flag'}-${index}`} className="text-[10px] text-amber-100/90">• {flag.message}</p>)}</div>}
    <p className="text-[9px] text-gray-600">{summary.sources.map((source) => `${source.label}: ${source.role.replace(/_/g, ' ')} · ${statusLabel(source.status)}`).join(' · ') || 'No selected source has a summary contract.'}</p>
  </section>;
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

function SandboxSpecialistSection({ sourceId, side }: { sourceId: SourceId; side: 'left' | 'right' }) {
  const source = SANDBOX_SPECIALIST_SOURCES.find((candidate) => candidate.id === sourceId);
  if (!source) return null;
  const accentColor = side === 'left' ? 'text-cyan-300' : 'text-amber-300';
  return (
    <div className="bg-sky-950/20 rounded-lg p-3 border border-sky-700/40 space-y-2">
      <p className={`text-[11px] font-bold uppercase ${accentColor}`}>🧪 {source.label}</p>
      <p className="text-gray-400 text-[10px]">Data type: read-only specialist auction context</p>
      <div className="bg-sky-900/20 border border-sky-700/30 rounded p-2 space-y-1">
        <p className="text-sky-300 text-[10px] font-semibold">Sandbox authorized — context only</p>
        <p className="text-gray-300 text-[10px]">The source is approved for bounded testing and mapped to this category. It cannot affect valuation or the final AI conclusion until its source-specific parser, identity gate, currency/price-basis policy, and signed-admission tests pass.</p>
        <p className="text-gray-500 text-[10px]">{source.activationNote}</p>
        <p className="text-gray-600 text-[9px] break-all">Source: {source.sourceUrl}</p>
      </div>
    </div>
  );
}
function CategoryMarketSummaryPanel({ summaries }: { summaries: Array<{ category: string; articleCount: number; sourceCount: number; positiveSignals: number; negativeSignals: number; signal: string; confidence: string; rationale: string }> }) {
  if (!summaries?.length) return null;
  const signalLabel: Record<string, string> = { improving: 'Improving signal', softening: 'Softening signal', mixed: 'Mixed signal', insufficient: 'Insufficient evidence' };
  return <div className="rounded bg-indigo-950/40 border border-indigo-700/30 p-2 space-y-2">
    <div><p className="text-indigo-200 text-xs font-semibold">Category Market Context</p><p className="text-gray-500 text-[9px]">A directional comparison of current RSS coverage. This can frame a cross-category trade, but it is not a price or verdict.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{summaries.map((summary) => <div key={summary.category} className="rounded bg-gray-950/50 p-2">
      <div className="flex items-center justify-between gap-2"><p className="text-gray-200 text-[10px] font-semibold">{summary.category}</p><span className={`rounded px-1.5 py-0.5 text-[8px] ${summary.signal === 'improving' ? 'bg-emerald-900/60 text-emerald-200' : summary.signal === 'softening' ? 'bg-rose-900/60 text-rose-200' : 'bg-slate-800 text-slate-200'}`}>{signalLabel[summary.signal] ?? summary.signal}</span></div>
      <p className="text-gray-500 text-[9px] mt-1">{summary.articleCount} article{summary.articleCount === 1 ? '' : 's'} · {summary.sourceCount} source{summary.sourceCount === 1 ? '' : 's'} · {summary.confidence} confidence</p>
      <p className="text-gray-400 text-[9px] mt-1">{summary.rationale}</p>
    </div>)}</div>
  </div>;
}

function VisionImpactPanel({ result }: { result: any }) {
  const impacts = [
    { label: 'Item A', impact: result.leftVisionImpact, color: 'cyan' },
    { label: 'Item B', impact: result.rightVisionImpact, color: 'amber' },
  ].filter(({ impact }) => impact);
  if (!impacts.length) return null;
  const statusLabel: Record<string, string> = {
    not_run: 'Not run',
    no_new_evidence: 'No new evidence',
    identity_confirmed: 'Identity confirmation',
    manual_review_required: 'Manual review required',
  };
  const statusStyle: Record<string, string> = {
    not_run: 'bg-slate-800 text-slate-200',
    no_new_evidence: 'bg-slate-800 text-slate-200',
    identity_confirmed: 'bg-emerald-900/60 text-emerald-200',
    manual_review_required: 'bg-amber-900/60 text-amber-200',
  };
  return <section className="rounded-lg border border-fuchsia-700/40 bg-fuchsia-950/15 p-3 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-fuchsia-300 text-[10px] font-bold uppercase tracking-wide">Image-Review Impact Check</p>
        <p className="text-gray-500 text-[10px] mt-0.5">This measures added identity evidence versus metadata-only analysis—not a price change, authentication, or trade-verdict change.</p>
      </div>
      <span className="rounded bg-fuchsia-900/50 px-2 py-1 text-[9px] font-semibold text-fuchsia-100">{result.imageAnalyzerUsed ? 'Image review enabled' : 'Metadata-only baseline'}</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {impacts.map(({ label, impact, color }) => <div key={label} className="rounded bg-gray-950/50 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-${color}-300 text-xs font-semibold`}>{label}</p>
          <span className={`rounded px-1.5 py-0.5 text-[9px] ${statusStyle[impact.status] ?? statusStyle.not_run}`}>{statusLabel[impact.status] ?? impact.status}</span>
        </div>
        <p className="text-gray-500 text-[10px]"><span className="font-semibold text-gray-400">Baseline:</span> {impact.baseline}</p>
        <p className="text-gray-300 text-[10px]"><span className="font-semibold text-fuchsia-200">Image result:</span> {impact.imageReview}</p>
        <div className="grid grid-cols-2 gap-1 text-[9px] text-gray-500">
          <span>{impact.metadataClaimCount} metadata claims</span><span>{impact.visibleIdentifierCount} visible identifiers</span>
          <span>{impact.confirmedMatchCount} confirmed matches</span><span>{impact.conflictCount} potential conflicts</span>
        </div>
        <p className="text-gray-400 text-[10px]"><span className="font-semibold text-gray-300">Next action:</span> {impact.recommendedAction}</p>
      </div>)}
    </div>
    {result.visionDiagnostics && <div className={`rounded p-2 text-[10px] ${result.visionDiagnostics.structuredResponse ? 'bg-emerald-950/30 text-emerald-100' : 'bg-amber-950/30 text-amber-100'}`}>
      <span className="font-semibold">Vision provider status:</span> {result.visionDiagnostics.reason} {result.visionDiagnostics.requested ? `Submitted ${result.visionDiagnostics.imagesSubmitted} image${result.visionDiagnostics.imagesSubmitted === 1 ? '' : 's'}; recognized ${result.visionDiagnostics.recognizedItems} item result${result.visionDiagnostics.recognizedItems === 1 ? '' : 's'}.` : ''}
    </div>}
    <p className="text-gray-600 text-[9px]">A useful impact is a correct confirmation or a correctly flagged mismatch on pre-labelled item facts. Completed sales remain the only valuation authority.</p>
  </section>;
}

function MarketNewsSection({ item }: { item: SelectedItem }) {
  const marketNewsQuery = trpc.testAI.getMarketNews.useQuery(
    { leftItem: { title: item.title, category: item.category, itemType: item.itemType, itemDetails: item.itemDetails } },
    { enabled: false, retry: false },
  );
  const handleLoad = () => { void marketNewsQuery.refetch(); };
  const articles = marketNewsQuery.data?.itemA ?? [];
  return <section className="rounded-lg border border-sky-700/40 bg-sky-950/20 p-3 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-sky-300 text-[10px] font-bold uppercase tracking-wide">Market News Context · Sandbox</p><p className="text-gray-500 text-[10px] mt-0.5">Run for the selected item only; news is context, never valuation.</p></div>
      <button onClick={handleLoad} disabled={marketNewsQuery.isFetching} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{marketNewsQuery.isFetching ? 'Checking feeds…' : 'Load Market News'}</button>
    </div>
    {marketNewsQuery.data && <>
      <p className="text-gray-500 text-[10px]">{marketNewsQuery.data.feedsChecked} category feeds checked · fetched {new Date(marketNewsQuery.data.fetchedAt).toLocaleString()}</p>
      <CategoryMarketSummaryPanel summaries={marketNewsQuery.data.categorySummaries} />
      <div className="rounded bg-gray-950/50 p-2 space-y-2">
        <p className="text-cyan-300 text-xs font-semibold">Selected item · {articles.length} relevant article{articles.length === 1 ? '' : 's'}</p>
        {articles.length === 0 ? <p className="text-gray-500 text-[10px]">No sufficiently matched articles found.</p> : articles.map((article: any) => <a key={article.id} href={article.url} target="_blank" rel="noreferrer" className="block rounded border border-gray-800 bg-gray-900/60 p-2 hover:border-sky-700/60">
          <div className="flex items-start justify-between gap-2"><p className="text-gray-200 text-[10px] font-medium">{article.title}</p><span className="shrink-0 rounded bg-sky-900/60 px-1 py-0.5 text-[8px] text-sky-200">{article.relevance}</span></div>
          <p className="text-gray-500 text-[9px] mt-1">{article.source} · {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'date unavailable'} · {article.evidenceType.replace(/_/g, ' ')}</p>
          {article.significance && <p className="text-violet-200/90 text-[9px] mt-1"><span className="font-semibold">Why it matters:</span> {article.significance}</p>}
          {article.matchedTerms?.length > 0 && <p className="text-emerald-300/80 text-[9px] mt-1">Matched: {article.matchedTerms.join(', ')}</p>}
          {article.excerpt && <p className="text-gray-500 text-[9px] mt-1 line-clamp-2">{article.excerpt}</p>}
        </a>)}
      </div>
      {marketNewsQuery.data.feedErrors?.length > 0 && <div className="rounded bg-amber-950/30 p-2 text-[9px] text-amber-200"><span className="font-semibold">Unavailable feeds:</span> {marketNewsQuery.data.feedErrors.join(' · ')}</div>}
      <p className="text-gray-600 text-[9px]">Significance is an item-matching research summary. It does not change the item’s value or trade verdict; completed sales remain authoritative.</p>
    </>}
  </section>;
}

function FieldCompletionPanel({ leftItem, rightItem }: { leftItem: SelectedItem | null; rightItem: SelectedItem | null }) {
  const [results, setResults] = useState<Record<string, any>>({});
  const scanMutation = trpc.testAI.extractFieldsFromImage.useMutation({
    onSuccess: (data, variables) => setResults((current) => ({ ...current, [variables.item.title]: data })),
    onError: (error) => toast.error(error.message),
  });
  const scan = (item: SelectedItem) => {
    if (!item.primaryPhotoUrl) {
      toast.error('This listing has no primary image to scan.');
      return;
    }
    scanMutation.mutate({ item: { title: item.title, category: item.category, itemType: item.itemType, grade: item.grade, condition: item.condition, itemDetails: item.itemDetails, imageUrl: item.primaryPhotoUrl } });
  };
  const cards = [
    { label: 'Item A', item: leftItem, color: 'cyan' },
    { label: 'Item B', item: rightItem, color: 'amber' },
  ].filter(({ item }) => item);
  if (!cards.length) return null;
  return <section className="rounded-xl border border-fuchsia-700/40 bg-fuchsia-950/10 p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-fuchsia-300 font-bold text-sm uppercase tracking-wide">🔎 AI Field Completion · Sandbox</p>
        <p className="text-gray-500 text-xs mt-1">Scans the listing image against the category/item-type field table. Suggestions are review-only and never overwrite listing data.</p>
      </div>
      <span className="rounded bg-fuchsia-900/50 px-2 py-1 text-[9px] text-fuchsia-200">Not authentication · Not valuation</span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ label, item, color }) => {
        const result = results[item!.title];
        return <div key={label} className="rounded-lg bg-gray-950/50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div><p className={`text-${color}-300 text-xs font-semibold`}>{label}</p><p className="text-gray-300 text-[10px] line-clamp-1">{item!.title}</p></div>
            <button onClick={() => scan(item!)} disabled={scanMutation.isPending || !item!.primaryPhotoUrl} className="rounded bg-fuchsia-700/80 hover:bg-fuchsia-600 disabled:opacity-40 px-2 py-1 text-[10px] font-semibold text-white">{scanMutation.isPending ? 'Scanning…' : 'Scan Image'}</button>
          </div>
          {!item!.primaryPhotoUrl && <p className="text-amber-300 text-[10px]">No primary image available.</p>}
          {result && <>
            <p className="text-gray-500 text-[9px]">{result.fields.length} proposed field{result.fields.length === 1 ? '' : 's'} · review before use</p>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {result.fields.length === 0 ? <p className="text-gray-500 text-[10px]">No safe fields could be extracted from this image.</p> : result.fields.map((field: any) => <div key={`${field.field}-${field.value}`} className="rounded border border-gray-800 bg-gray-900/70 p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-gray-300 text-[10px] font-semibold">{field.label}</span><span className={`rounded px-1 py-0.5 text-[8px] ${field.status === 'conflict' ? 'bg-amber-900/60 text-amber-200' : field.status === 'inferred' ? 'bg-violet-900/60 text-violet-200' : 'bg-emerald-900/60 text-emerald-200'}`}>{field.status} · {field.confidence}</span></div>
                <p className="text-white text-[10px] mt-1">{field.value}</p><p className="text-gray-500 text-[9px] mt-1">{field.evidence}{field.needsVerification ? ' · verify before accepting' : ''}</p>
              </div>)}
            </div>
            {result.missingImageRequests?.length > 0 && <p className="text-amber-200 text-[9px]"><span className="font-semibold">Additional photos:</span> {result.missingImageRequests.join(' · ')}</p>}
            <p className="text-fuchsia-200/80 text-[9px]">{result.note}</p>
          </>}
        </div>;
      })}
    </div>
  </section>;
}

// ─── AI Analysis Section ─────────────────────────────────────────────────────
function AIAnalysisSection({ leftItem, rightItem, leftEbayData, rightEbayData, leftSources, rightSources, leftSoldCompsData, rightSoldCompsData, leftHipstampData, rightHipstampData, leftTheCardApiData, rightTheCardApiData, leftCardsightAiData, rightCardsightAiData, leftLelandsData, rightLelandsData, leftPristineAuctionData, rightPristineAuctionData, leftPcgsAuctionData, rightPcgsAuctionData, leftHistoricalTrendData, rightHistoricalTrendData, leftEvidenceSummary, rightEvidenceSummary }: {
  leftItem: SelectedItem;
  rightItem: SelectedItem;
  leftEbayData: any;
  rightEbayData: any;
  leftSources: Set<SourceId>;
  rightSources: Set<SourceId>;
  leftSoldCompsData?: any;
  rightSoldCompsData?: any;
  leftHipstampData?: any;
  rightHipstampData?: any;
  leftTheCardApiData?: any;
  rightTheCardApiData?: any;
  leftCardsightAiData?: any;
  rightCardsightAiData?: any;
  leftLelandsData?: any;
  rightLelandsData?: any;
  leftPristineAuctionData?: any;
  rightPristineAuctionData?: any;
  leftPcgsAuctionData?: any;
  rightPcgsAuctionData?: any;
  leftHistoricalTrendData?: any;
  rightHistoricalTrendData?: any;
  leftEvidenceSummary?: NormalizedEvidenceSummary | null;
  rightEvidenceSummary?: NormalizedEvidenceSummary | null;
}) {
  const [result, setResult] = useState<any>(null);
  const [useImageAnalyzer, setUseImageAnalyzer] = useState(true);
  const [useVisualFieldCompletion, setUseVisualFieldCompletion] = useState(true);
  const [cashAmount, setCashAmount] = useState('');
  const [cashPaidBy, setCashPaidBy] = useState<'item_a' | 'item_b'>('item_a');
  const marketNewsQuery = trpc.testAI.getMarketNews.useQuery(
    {
      leftItem: { title: leftItem.title, category: leftItem.category, itemType: leftItem.itemType, itemDetails: leftItem.itemDetails },
      rightItem: { title: rightItem.title, category: rightItem.category, itemType: rightItem.itemType, itemDetails: rightItem.itemDetails },
    },
    { enabled: false, retry: false },
  );
  const analyzeMutation = trpc.testAI.analyzeItems.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error(err.message),
  });

  const leftHasEbay = leftSources.has('ebay_active');
  const rightHasEbay = rightSources.has('ebay_active');
  const leftHasHipstamp = leftSources.has('hipstamp');
  const rightHasHipstamp = rightSources.has('hipstamp');
  const leftHasSoldComps = leftSources.has('sold_comps');
  const rightHasSoldComps = rightSources.has('sold_comps');
  const leftHasTheCardApi = leftSources.has('the_card_api');
  const rightHasTheCardApi = rightSources.has('the_card_api');
  const leftHasCardsightAi = leftSources.has('cardsight_ai');
  const rightHasCardsightAi = rightSources.has('cardsight_ai');
  const leftHasLelands = leftSources.has('lelands');
  const rightHasLelands = rightSources.has('lelands');
  const leftHasPristineAuction = leftSources.has('pristine_auction');
  const rightHasPristineAuction = rightSources.has('pristine_auction');
  const leftHasPcgsAuction = leftSources.has('pcgs');
  const rightHasPcgsAuction = rightSources.has('pcgs');
  const leftHas130Point = leftSources.has('one_thirty_point');
  const rightHas130Point = rightSources.has('one_thirty_point');

  const normalizeComparableSale = (sale: any, defaults: { sourceId: string; sourceLabel: string; marketplace?: string; saleStatus?: 'completed' | 'unknown'; priceBasis?: 'realized' | 'sold' | 'closed' | 'unknown' }) => ({
    ...sale,
    title: sale?.title ?? '',
    price: sale?.price ?? null,
    currency: sale?.currency ?? null,
    marketplace: sale?.marketplace ?? defaults.marketplace ?? defaults.sourceLabel,
    originMarketplace: sale?.originMarketplace ?? sale?.marketplace ?? defaults.marketplace ?? null,
    sourceId: sale?.sourceId ?? defaults.sourceId,
    sourceAdapter: sale?.sourceAdapter ?? null,
    sourceLabel: sale?.sourceLabel ?? defaults.sourceLabel,
    saleId: sale?.saleId ?? sale?.itemId ?? sale?.lotId ?? sale?.url ?? sale?.itemUrl ?? null,
    url: sale?.url ?? sale?.itemUrl ?? sale?.itemWebUrl ?? null,
    saleStatus: sale?.saleStatus ?? (sale?.completed === false || sale?.confirmed === false ? 'unknown' : defaults.saleStatus ?? 'completed'),
    completedStatusBasis: sale?.completedStatusBasis ?? sale?.status ?? (sale?.completed ? 'provider completed flag' : sale?.confirmed ? 'provider confirmed flag' : 'provider completed-sale endpoint'),
    priceBasis: sale?.priceBasis ?? defaults.priceBasis ?? 'unknown',
    visualRequirement: sale?.visualRequirement ?? 'not_required',
    visualReviewStatus: sale?.visualReviewStatus ?? sale?.visualReview?.verdict ?? 'not_reviewed',
    visualReviewRationale: sale?.visualReviewRationale ?? sale?.visualReview?.rationale ?? null,
    evidenceDisposition: sale?.evidenceDisposition ?? sale?.evidence?.disposition ?? null,
    evidenceReasons: Array.isArray(sale?.evidenceReasons) ? sale.evidenceReasons.slice(0, 20) : Array.isArray(sale?.evidence?.reasons) ? sale.evidence.reasons.slice(0, 20) : null,
    buyerPremium: sale?.buyerPremium ?? 'unknown',
    shipping: sale?.shipping ?? 'unknown',
    tax: sale?.tax ?? 'unknown',
    saleForm: sale?.saleForm ?? null,
    lotQuantity: sale?.lotQuantity ?? null,
    provenanceToken: sale?.provenanceToken ?? null,
  });

  // Round-robin source groups before the explicit 120-record transport ceiling.
  // This avoids the previous first-source-wins slice from silently dropping later
  // auction or Sold-Comps evidence before the server can score it.
  const balanceSaleGroups = (groups: any[][]) => {
    const balanced: any[] = [];
    for (let index = 0; balanced.length < 120; index += 1) {
      let added = false;
      for (const group of groups) {
        const candidate = group[index];
        if (candidate && balanced.length < 120) {
          balanced.push(candidate);
          added = true;
        }
      }
      if (!added) break;
    }
    return balanced;
  };

  const handleAnalyze = () => {
    const leftSales = balanceSaleGroups([
      leftHas130Point ? (leftHistoricalTrendData?.data?.items ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: '130point', sourceLabel: '130point', marketplace: '130point', priceBasis: 'sold' })) : [],
      leftHasTheCardApi ? (leftTheCardApiData?.sales ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: 'the_card_api', sourceLabel: 'The Card API Sales', marketplace: 'The Card API', priceBasis: 'sold' })) : [],
      leftHasCardsightAi ? (leftCardsightAiData?.sales ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: 'cardsight_ai', sourceLabel: 'Cardsight.ai Market Data', marketplace: 'Cardsight.ai', priceBasis: 'sold' })) : [],
      leftHasLelands ? (leftLelandsData?.sales ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: 'lelands', sourceLabel: 'Lelands Auctions', marketplace: 'Lelands Auctions', priceBasis: 'realized' })) : [],
      leftHasPristineAuction ? (leftPristineAuctionData?.sales ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: 'pristine_auction', sourceLabel: 'Pristine Auction', marketplace: 'Pristine Auction', priceBasis: 'realized' })) : [],
      leftHasPcgsAuction ? (leftPcgsAuctionData?.data?.auctions ?? []).map((sale: any) => normalizeComparableSale({ title: leftPcgsAuctionData?.data?.name ?? leftItem.title, price: sale.price, currency: 'USD', date: sale.date, marketplace: sale.auctioneer || sale.service || 'PCGS Auction Prices Realized', recency: !sale.date ? 'undated' : (Date.now() >= Date.parse(String(sale.date)) && Date.now() - Date.parse(String(sale.date)) <= 365 * 86_400_000 ? 'recent' : 'historical'), saleId: `${sale.certNo || leftPcgsAuctionData?.data?.certNo || leftItem.certId}-${sale.lotNumV2 || sale.lotNo || sale.date}`, url: sale.auctionLotUrl }, { sourceId: 'pcgs_auction_results', sourceLabel: 'PCGS Auction Prices Realized', priceBasis: 'realized' })) : [],
      leftHasSoldComps ? (leftSoldCompsData?.listings ?? []).map((sale: any) => normalizeComparableSale({ title: sale.title, price: sale.price, currency: sale.currency ?? 'USD', date: sale.endedAt, marketplace: 'eBay Sold-Comps', saleId: sale.saleId ?? sale.itemId ?? sale.itemWebUrl ?? sale.itemUrl, url: sale.itemUrl ?? sale.itemWebUrl, saleStatus: 'completed', completedStatusBasis: 'Sold-Comps completed-sale endpoint', priceBasis: 'sold', visualReviewStatus: sale.visualReviewStatus, visualReviewRationale: sale.visualReviewRationale, evidenceDisposition: sale.evidenceDisposition, evidenceReasons: sale.evidenceReasons }, { sourceId: 'sold_comps', sourceLabel: 'eBay Sold-Comps', priceBasis: 'sold' })) : [],
    ]);
    const rightSales = balanceSaleGroups([
      rightHas130Point ? (rightHistoricalTrendData?.data?.items ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: '130point', sourceLabel: '130point', marketplace: '130point', priceBasis: 'sold' })) : [],
      rightHasTheCardApi ? (rightTheCardApiData?.sales ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: 'the_card_api', sourceLabel: 'The Card API Sales', marketplace: 'The Card API', priceBasis: 'sold' })) : [],
      rightHasCardsightAi ? (rightCardsightAiData?.sales ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: 'cardsight_ai', sourceLabel: 'Cardsight.ai Market Data', marketplace: 'Cardsight.ai', priceBasis: 'sold' })) : [],
      rightHasLelands ? (rightLelandsData?.sales ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: 'lelands', sourceLabel: 'Lelands Auctions', marketplace: 'Lelands Auctions', priceBasis: 'realized' })) : [],
      rightHasPristineAuction ? (rightPristineAuctionData?.sales ?? []).map((sale: any) => normalizeComparableSale(sale, { sourceId: 'pristine_auction', sourceLabel: 'Pristine Auction', marketplace: 'Pristine Auction', priceBasis: 'realized' })) : [],
      rightHasPcgsAuction ? (rightPcgsAuctionData?.data?.auctions ?? []).map((sale: any) => normalizeComparableSale({ title: rightPcgsAuctionData?.data?.name ?? rightItem.title, price: sale.price, currency: 'USD', date: sale.date, marketplace: sale.auctioneer || sale.service || 'PCGS Auction Prices Realized', recency: !sale.date ? 'undated' : (Date.now() >= Date.parse(String(sale.date)) && Date.now() - Date.parse(String(sale.date)) <= 365 * 86_400_000 ? 'recent' : 'historical'), saleId: `${sale.certNo || rightPcgsAuctionData?.data?.certNo || rightItem.certId}-${sale.lotNumV2 || sale.lotNo || sale.date}`, url: sale.auctionLotUrl }, { sourceId: 'pcgs_auction_results', sourceLabel: 'PCGS Auction Prices Realized', priceBasis: 'realized' })) : [],
      rightHasSoldComps ? (rightSoldCompsData?.listings ?? []).map((sale: any) => normalizeComparableSale({ title: sale.title, price: sale.price, currency: sale.currency ?? 'USD', date: sale.endedAt, marketplace: 'eBay Sold-Comps', saleId: sale.saleId ?? sale.itemId ?? sale.itemWebUrl ?? sale.itemUrl, url: sale.itemUrl ?? sale.itemWebUrl, saleStatus: 'completed', completedStatusBasis: 'Sold-Comps completed-sale endpoint', priceBasis: 'sold', visualReviewStatus: sale.visualReviewStatus, visualReviewRationale: sale.visualReviewRationale, evidenceDisposition: sale.evidenceDisposition, evidenceReasons: sale.evidenceReasons }, { sourceId: 'sold_comps', sourceLabel: 'eBay Sold-Comps', priceBasis: 'sold' })) : [],
    ]);
    const parsedCashAmount = Number(cashAmount);
    analyzeMutation.mutate({
      leftItem: { title: leftItem.title, category: leftItem.category, itemType: leftItem.itemType, grade: leftItem.grade, condition: leftItem.condition, estimatedValue: leftItem.estimatedValue, certificationCompany: leftItem.certificationCompany ?? undefined, itemDetails: leftItem.itemDetails, imageUrl: useImageAnalyzer ? leftItem.primaryPhotoUrl : undefined },
      rightItem: { title: rightItem.title, category: rightItem.category, itemType: rightItem.itemType, grade: rightItem.grade, condition: rightItem.condition, estimatedValue: rightItem.estimatedValue, certificationCompany: rightItem.certificationCompany ?? undefined, itemDetails: rightItem.itemDetails, imageUrl: useImageAnalyzer ? rightItem.primaryPhotoUrl : undefined },
      useImageAnalyzer,
      useVisualFieldCompletion: useImageAnalyzer && useVisualFieldCompletion,
      leftEbayMetrics: leftHasEbay ? (leftEbayData?.metrics ?? null) : null,
      rightEbayMetrics: rightHasEbay ? (rightEbayData?.metrics ?? null) : null,
      leftHipstampMetrics: leftHasHipstamp ? (leftHipstampData?.metrics ?? null) : null,
      rightHipstampMetrics: rightHasHipstamp ? (rightHipstampData?.metrics ?? null) : null,
      leftSoldCompsMetrics: leftHasSoldComps ? (leftSoldCompsData?.metrics ?? null) : null,
      rightSoldCompsMetrics: rightHasSoldComps ? (rightSoldCompsData?.metrics ?? null) : null,
      leftHistoricalTrendSales: leftSales,
      rightHistoricalTrendSales: rightSales,
      leftEvidenceSummary: leftEvidenceSummary ?? undefined,
      rightEvidenceSummary: rightEvidenceSummary ?? undefined,
      leftIdentityGate: leftEvidenceSummary ? { materialReviewRequired: leftEvidenceSummary.reviewFlags.some((flag) => flag.kind === 'material'), materialFlags: leftEvidenceSummary.reviewFlags.filter((flag) => flag.kind === 'material').map((flag) => flag.message).slice(0, 20), sourceAlignmentStatus: leftEvidenceSummary.reviewFlags.some((flag) => flag.kind === 'material') ? 'conflicted' : leftEvidenceSummary.alignedSources.length ? 'aligned' : 'unavailable' } : undefined,
      rightIdentityGate: rightEvidenceSummary ? { materialReviewRequired: rightEvidenceSummary.reviewFlags.some((flag) => flag.kind === 'material'), materialFlags: rightEvidenceSummary.reviewFlags.filter((flag) => flag.kind === 'material').map((flag) => flag.message).slice(0, 20), sourceAlignmentStatus: rightEvidenceSummary.reviewFlags.some((flag) => flag.kind === 'material') ? 'conflicted' : rightEvidenceSummary.alignedSources.length ? 'aligned' : 'unavailable' } : undefined,
      cashAdjustment: Number.isFinite(parsedCashAmount) && parsedCashAmount > 0 ? { amount: parsedCashAmount, paidBy: cashPaidBy } : null,
      marketNews: marketNewsQuery.data ? {
        itemA: marketNewsQuery.data.itemA,
        itemB: marketNewsQuery.data.itemB,
        categorySummaries: marketNewsQuery.data.categorySummaries,
      } : undefined,
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 rounded border border-fuchsia-700/40 bg-fuchsia-950/20 px-2 py-1.5 text-[10px] text-fuchsia-100" title="Run the same trade with or without the listing images sent to the visual identity reviewer">
            <input type="checkbox" checked={useImageAnalyzer} onChange={(event) => { setUseImageAnalyzer(event.target.checked); setResult(null); }} className="accent-fuchsia-500" />
            Use image analyzer
          </label>
          <label className="flex items-center gap-2 rounded border border-violet-700/40 bg-violet-950/20 px-2 py-1.5 text-[10px] text-violet-100 disabled:opacity-40" title="Temporarily supply only high-confidence image fields that are blank in the listing; saved listing data is never changed">
            <input type="checkbox" checked={useVisualFieldCompletion} disabled={!useImageAnalyzer} onChange={(event) => { setUseVisualFieldCompletion(event.target.checked); setResult(null); }} className="accent-violet-500" />
            Fill missing fields from image
          </label>
          <button onClick={() => marketNewsQuery.refetch()} disabled={marketNewsQuery.isFetching}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs rounded-lg font-medium transition-colors">
            {marketNewsQuery.isFetching ? <><Spinner className="w-3 h-3" /> Checking feeds...</> : 'Load Market News'}
          </button>
          <button onClick={handleAnalyze} disabled={analyzeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors">
            {analyzeMutation.isPending ? <><Spinner className="w-4 h-4" /> Analyzing...</> : `Run ${useImageAnalyzer ? 'with' : 'without'} Image Review`}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/15 px-3 py-2">
        <div className="min-w-[190px]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200">Recorded cash adjustment · optional</p>
          <p className="text-[9px] text-gray-500">Models the actual proposed terms only; it never creates a required payment amount.</p>
        </div>
        <label className="flex items-center gap-1 rounded bg-gray-950/60 px-2 py-1 text-[10px] text-gray-300">
          $<input type="number" min="0" step="1" value={cashAmount} onChange={(event) => { setCashAmount(event.target.value); setResult(null); }} className="w-24 bg-transparent text-white outline-none" placeholder="0" aria-label="Cash adjustment amount" />
        </label>
        <select value={cashPaidBy} onChange={(event) => { setCashPaidBy(event.target.value as 'item_a' | 'item_b'); setResult(null); }} className="rounded bg-gray-950/60 px-2 py-1 text-[10px] text-gray-200 outline-none">
          <option value="item_a">Item A contributes cash</option>
          <option value="item_b">Item B contributes cash</option>
        </select>
      </div>

      {marketNewsQuery.data && (
        <div className="rounded-lg border border-sky-700/40 bg-sky-950/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sky-300 text-[10px] font-bold uppercase tracking-wide">Market News Context · Sandbox</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{marketNewsQuery.data.feedsChecked} category feeds checked · fetched {new Date(marketNewsQuery.data.fetchedAt).toLocaleString()}</p>
            </div>
            <span className="rounded bg-sky-900/50 px-2 py-1 text-[9px] font-semibold text-sky-200">Context only — never valuation</span>
          </div>
          <CategoryMarketSummaryPanel summaries={marketNewsQuery.data.categorySummaries} />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Item A', items: marketNewsQuery.data.itemA, color: 'cyan' },
              { label: 'Item B', items: marketNewsQuery.data.itemB, color: 'amber' },
            ].map(({ label, items, color }) => (
              <div key={label} className="rounded bg-gray-950/50 p-2 space-y-2">
                <p className={`text-${color}-300 text-xs font-semibold`}>{label} · {items.length} relevant article{items.length === 1 ? '' : 's'}</p>
                {items.length === 0 ? <p className="text-gray-500 text-[10px]">No sufficiently matched articles found.</p> : items.map((article: any) => (
                  <a key={article.id} href={article.url} target="_blank" rel="noreferrer" className="block rounded border border-gray-800 bg-gray-900/60 p-2 hover:border-sky-700/60">
                    <div className="flex items-start justify-between gap-2"><p className="text-gray-200 text-[10px] font-medium">{article.title}</p><span className="shrink-0 rounded bg-sky-900/60 px-1 py-0.5 text-[8px] text-sky-200">{article.relevance}</span></div>
                    <p className="text-gray-500 text-[9px] mt-1">{article.source} · {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'date unavailable'} · {article.evidenceType.replace(/_/g, ' ')}</p>
                    {article.significance && <p className="text-violet-200/90 text-[9px] mt-1"><span className="font-semibold">Why it matters:</span> {article.significance}</p>}
                    {article.matchedTerms?.length > 0 && <p className="text-emerald-300/80 text-[9px] mt-1">Matched: {article.matchedTerms.join(', ')}</p>}
                    {article.excerpt && <p className="text-gray-500 text-[9px] mt-1 line-clamp-2">{article.excerpt}</p>}
                  </a>
                ))}
              </div>
            ))}
          </div>
          {marketNewsQuery.data.feedErrors?.length > 0 && <div className="rounded bg-amber-950/30 p-2 text-[9px] text-amber-200"><span className="font-semibold">Unavailable feeds:</span> {marketNewsQuery.data.feedErrors.join(' · ')}</div>}
          <p className="text-gray-600 text-[9px]">Articles are stored only as source-linked context in this phase. Completed sales remain the only authoritative valuation evidence.</p>
        </div>
      )}

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
          {result.sourceReferences && (result.sourceReferences.itemA?.length > 0 || result.sourceReferences.itemB?.length > 0) && <p className="text-gray-500 text-[10px]">Narrative sources: Item A — {result.sourceReferences.itemA?.join(', ') || 'none'} · Item B — {result.sourceReferences.itemB?.join(', ') || 'none'}</p>}
          {result.leftMarketProfile && result.rightMarketProfile && result.deterministicComparison && (
            <>
              <div className="rounded-lg border border-emerald-600/50 bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-emerald-200 text-xs font-bold uppercase tracking-wide">Recommended Trade Summary · User View</p>
                    <p className="text-gray-400 text-[10px] mt-1">This is the plain-language result intended for a collector. The technical evidence audit appears below.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-900/40 px-2 py-1 text-[9px] font-semibold text-emerald-100">Evidence-based</span>
                </div>
                <div className="rounded border border-emerald-500/30 bg-gray-950/40 px-3 py-2">
                  <p className="text-white text-sm font-semibold">{result.deterministicComparison.verdict}</p>
                  <p className="text-gray-300 text-[10px] mt-1">{result.tradeTerms?.summary || result.deterministicComparison.decisionBasis}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Item A', item: leftItem, profile: result.leftMarketProfile },
                    { label: 'Item B', item: rightItem, profile: result.rightMarketProfile },
                  ].map(({ label, item, profile }) => (
                    <div key={label} className="rounded border border-slate-700/60 bg-slate-950/50 p-3 space-y-1">
                      <p className="text-gray-200 text-xs font-semibold">{label}{item?.title ? ` · ${item.title}` : ''}</p>
                      <p className="text-gray-300 text-[10px]">Observed accepted-sale range: <span className="text-white font-semibold">{profile.marketRange.supported ? `$${profile.marketRange.low.toLocaleString()}–$${profile.marketRange.high.toLocaleString()}` : 'Not verified'}</span></p>
                      <p className="text-gray-500 text-[9px]">Typical middle band: {profile.typicalBand?.supported ? `$${profile.typicalBand.low.toLocaleString()}–$${profile.typicalBand.high.toLocaleString()}` : 'not enough verified sales'}</p>
                      <p className="text-gray-400 text-[10px]">Primary median value: <span className="text-white">{profile.primaryValue !== null ? `$${profile.primaryValue.toLocaleString()}` : 'Not verified'}</span> · recency-weighted diagnostic: {profile.weightedValue !== null ? `$${profile.weightedValue.toLocaleString()}` : 'unavailable'}</p>
                      <p className="text-gray-400 text-[10px]">Confidence: <span className="text-emerald-200 capitalize">{profile.evidenceQuality}</span> — {profile.directComparableCount} direct completed sale{profile.directComparableCount === 1 ? '' : 's'} used.</p>
                    </div>
                  ))}
                </div>
                {result.deterministicComparison.overlapBand && <p className="text-sky-200 text-[10px]">The observed accepted-sale ranges overlap from ${Number(result.deterministicComparison.overlapBand.low).toLocaleString()} to ${Number(result.deterministicComparison.overlapBand.high).toLocaleString()} ({Math.round(Number(result.deterministicComparison.overlapRatio ?? 0) * 100)}% of the narrower observed range), so the available evidence does not prove a clear winner.</p>}
                {result.tradeTerms?.cashAdjustment && <p className="text-emerald-200 text-[10px]">Recorded cash adjustment: Item {result.tradeTerms.cashAdjustment.paidBy === 'item_a' ? 'A' : 'B'} contributes ${Number(result.tradeTerms.cashAdjustment.amount).toLocaleString()}.</p>}
                {(result.valuationWarnings?.length > 0 || result.missingInformation?.length > 0) && <div className="rounded bg-orange-950/30 px-2 py-1.5 text-[10px] text-orange-200"><span className="font-semibold">Important limitation:</span> {[...(result.valuationWarnings ?? []), ...(result.missingInformation ?? []).map((value: string) => `Missing ${value}`)].slice(0, 2).join(' ')}</div>}
              </div>
              <div className="rounded-lg border border-indigo-700/40 bg-indigo-950/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wide">Trade Analyzer 2.0 · Deterministic Evidence Layer</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">The server computes these values before the AI explanation; asking prices are not treated as realized sales.</p>
                </div>
                <span className="rounded bg-indigo-900/50 px-2 py-1 text-[10px] font-semibold text-indigo-200">{result.deterministicComparison.verdict}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Item A', profile: result.leftMarketProfile, color: 'cyan' },
                  { label: 'Item B', profile: result.rightMarketProfile, color: 'amber' },
                ].map(({ label, profile, color }) => (
                  <div key={label} className="rounded bg-gray-950/50 p-2 space-y-1">
                    <p className={`text-${color}-300 text-xs font-semibold`}>{label}</p>
                    <p className="text-gray-300 text-[10px]">Evidence: <span className="text-white">{profile.evidenceState.replace(/_/g, ' ')}</span></p>
                    <p className="text-gray-300 text-[10px]">Primary median: <span className="text-white">{profile.primaryValue !== null ? `$${profile.primaryValue.toLocaleString()}` : 'Not verified'}</span> · Weighted diagnostic: {profile.weightedValue !== null ? `$${profile.weightedValue.toLocaleString()}` : 'unavailable'} · Observed accepted sale range: {profile.marketRange.supported ? `$${profile.marketRange.low?.toLocaleString()}–$${profile.marketRange.high?.toLocaleString()}` : 'unsupported'}</p>
                    <p className="text-gray-400 text-[10px]">Confidence: {profile.evidenceQuality} evidence · {profile.itemIdentificationConfidence} identity · {profile.marketStability} stability · {profile.liquidity} liquidity</p>
                    {profile.confidenceReasons?.length > 0 && <p className="text-slate-500 text-[9px] leading-snug"><span className="font-semibold text-slate-300">Confidence basis:</span> {profile.confidenceReasons.join(' ')}</p>}
                    <p className="text-slate-500 text-[9px]">Outlier policy: {profile.outlierPolicy === 'iqr_applied' ? `IQR applied to ${profile.outlierEligibleSampleCount} selected completed sales` : profile.outlierPolicy === 'flagged_small_sample' ? `${profile.outlierFlaggedCount} suspicious price tail${profile.outlierFlaggedCount === 1 ? '' : 's'} flagged but retained at N=${profile.outlierEligibleSampleCount}` : profile.outlierPolicy === 'not_applied_insufficient_sample' ? `not applied — only ${profile.outlierEligibleSampleCount} selected completed sales` : 'not applied — no selected completed sales'}.</p>
                    <p className="text-slate-500 text-[9px]">Marketplace independence: {profile.independentMarketplaceCount} independent marketplace{profile.independentMarketplaceCount === 1 ? '' : 's'}{profile.unknownMarketplaceCount ? ` · ${profile.unknownMarketplaceCount} unknown-marketplace record${profile.unknownMarketplaceCount === 1 ? '' : 's'} excluded from independence` : ''} · {profile.marketplaceConcentration.replace(/_/g, ' ')}{profile.largestMarketplaceShare !== null ? ` · largest share ${Math.round(profile.largestMarketplaceShare * 100)}%` : ''}.</p>
                    <p className="text-gray-500 text-[10px]">Sales: {profile.salesVelocity.sevenDay} / {profile.salesVelocity.thirtyDay} / {profile.salesVelocity.ninetyDay} in 7 / 30 / 90 days · {profile.directComparableCount} direct used ({profile.exactMatchCount} exact + {profile.nearMatchCount} near) · {profile.gradeAdjacentComparableCount} grade/certification-adjacent secondary · {profile.contextualComparableCount} context only · {profile.duplicateSaleCount} duplicate{profile.duplicateSaleCount === 1 ? '' : 's'} suppressed</p>
                  </div>
                ))}
              </div>
              <div className={`rounded border px-2 py-1.5 text-[10px] ${
                result.deterministicComparison.rangeRelationship === 'overlap'
                  ? 'border-sky-700/40 bg-sky-950/20 text-sky-100'
                  : result.deterministicComparison.rangeRelationship === 'unsupported'
                    ? 'border-orange-700/40 bg-orange-950/20 text-orange-100'
                    : 'border-emerald-700/40 bg-emerald-950/20 text-emerald-100'
              }`}>
                <span className="font-semibold uppercase tracking-wide">Range-first decision:</span> {result.deterministicComparison.decisionBasis}
                {result.deterministicComparison.overlapBand && <span className="text-gray-300"> Shared band: ${Number(result.deterministicComparison.overlapBand.low).toLocaleString()}–${Number(result.deterministicComparison.overlapBand.high).toLocaleString()}.</span>}
                {result.deterministicComparison.typicalBandOverlap && <span className="text-gray-300"> Typical middle-band overlap: ${Number(result.deterministicComparison.typicalBandOverlap.low).toLocaleString()}–${Number(result.deterministicComparison.typicalBandOverlap.high).toLocaleString()}.</span>}
                {result.deterministicComparison.midpointDifference !== null && <span className="text-gray-300"> Median midpoint difference: ${Math.abs(Number(result.deterministicComparison.midpointDifference)).toLocaleString()}.</span>}
                {result.deterministicComparison.rangeGap !== null && result.deterministicComparison.rangeGap > 0 && <span className="text-gray-300"> Range gap: ${Number(result.deterministicComparison.rangeGap).toLocaleString()}.</span>}
              </div>
              {result.tradeTerms && (
                <div className="rounded border border-emerald-700/40 bg-emerald-950/20 p-2 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Trade terms · evidence-range check</p>
                    <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[9px] text-emerald-100">{result.tradeTerms.evidenceStrength} evidence · {result.tradeTerms.termsStatus.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-gray-300 text-[10px]">{result.tradeTerms.summary}</p>
                  {result.tradeTerms.cashAdjustment && <p className="text-gray-500 text-[9px]">Recorded: Item {result.tradeTerms.cashAdjustment.paidBy === 'item_a' ? 'A' : 'B'} contributes ${Number(result.tradeTerms.cashAdjustment.amount).toLocaleString()}.</p>}
                  {!result.tradeTerms.cashAdjustment && result.tradeTerms.suggestedCashRange && <p className="text-gray-500 text-[9px]">Range reference only: Item {result.tradeTerms.suggestedCashRange.payer === 'item_a' ? 'A' : 'B'} could be short by roughly ${Number(result.tradeTerms.suggestedCashRange.low).toLocaleString()}–${Number(result.tradeTerms.suggestedCashRange.high).toLocaleString()} based on the selected evidence ranges.</p>}
                </div>
              )}
              {(result.valuationWarnings?.length > 0 || result.missingInformation?.length > 0) && (
                <div className="rounded bg-orange-950/30 p-2 text-[10px] text-orange-200">
                  <span className="font-bold uppercase">Evidence warnings:</span> {[...(result.valuationWarnings ?? []), ...(result.missingInformation ?? []).map((value: string) => `Missing ${value}`)].join(' ')}
                </div>
              )}
              {result.leftAnalysisSnapshot && result.rightAnalysisSnapshot && (
                <div className="rounded border border-slate-700/60 bg-slate-950/50 p-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-slate-200 text-[10px] font-bold uppercase tracking-wide">Versioned analysis snapshot · {result.leftAnalysisSnapshot.version}</p>
                    <p className="text-slate-500 text-[9px]">This snapshot feeds the profile, comparable audit, cash terms, and AI explanation.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Item A', snapshot: result.leftAnalysisSnapshot, color: 'cyan' },
                      { label: 'Item B', snapshot: result.rightAnalysisSnapshot, color: 'amber' },
                    ].map(({ label, snapshot, color }) => {
                      const diagnostics = snapshot.profile.selectionDiagnostics;
                      const visual = snapshot.evidence.visualReview;
                      return <div key={label} className="rounded bg-gray-900/70 p-2 space-y-1">
                        <p className={`text-${color}-300 text-xs font-semibold`}>{label} intake</p>
                        <p className="text-gray-400 text-[9px]">Sales: {diagnostics.received} received · {diagnostics.deduplicated} unique · {diagnostics.eligibleCompleted} dated completed · {diagnostics.acceptedIdentity} identity accepted · {diagnostics.selectedForValuation} used</p>
                        {diagnostics.omittedByCap > 0 && <p className="text-amber-200 text-[9px]">{diagnostics.omittedByCap} matched record{diagnostics.omittedByCap === 1 ? '' : 's'} retained in audit but omitted by the source-balanced cap.</p>}
                        <p className="text-gray-500 text-[9px]">Visual comp reviews: {visual.match} match · {visual.roughMatch} rough · {visual.mismatch} mismatch · {visual.unreadable} unreadable · {visual.notReviewed} not reviewed</p>
                        <div className="flex flex-wrap gap-1 pt-1">{snapshot.evidence.sourceStatuses.map((source: any) => <span key={source.id} title={source.message || undefined} className={`rounded px-1 py-0.5 text-[8px] ${source.status === 'success' ? 'bg-emerald-950/60 text-emerald-200' : source.status === 'error' ? 'bg-rose-950/60 text-rose-200' : 'bg-slate-800 text-slate-300'}`}>{source.label}: {source.status.replace('_', ' ')}</span>)}</div>
                        {snapshot.evidence.reviewFlags.length > 0 && <p className="text-amber-200 text-[9px]">Review: {snapshot.evidence.reviewFlags[0]}</p>}
                      </div>;
                    })}
                  </div>
                </div>
              )}
              <div className="rounded border border-slate-700/60 bg-slate-950/50 p-2 space-y-2">
                <div>
                  <p className="text-slate-200 text-[10px] font-bold uppercase tracking-wide">Comparable audit · why each sale counted</p>
                  <p className="text-gray-500 text-[9px] mt-0.5">Only deduplicated completed sales with exact or near identity matches influence the deterministic value. Historical, undated, non-completed, or incomplete-identity records remain context only.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Item A', profile: result.leftMarketProfile, color: 'cyan' },
                    { label: 'Item B', profile: result.rightMarketProfile, color: 'amber' },
                  ].map(({ label, profile, color }) => {
                    const accepted = (profile.comparables ?? []).filter((comparable: any) => comparable.accepted);
                    const contextual = (profile.comparables ?? []).filter((comparable: any) => comparable.classification === 'contextual');
                    const rejected = (profile.comparables ?? []).filter((comparable: any) => !comparable.accepted && comparable.classification !== 'contextual');
                    const checklist = [
                      ['Identity', profile.identityReadiness === 'ready' && profile.itemIdentificationConfidence !== 'low'],
                      ['Recent sales', profile.recentSaleCount > 0],
                      ['Grade/condition', profile.gradeConditionConfidence !== 'low'],
                      ['Stable range', profile.marketStability !== 'low'],
                    ];
                    return (
                      <div key={label} className="rounded bg-gray-900/70 p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-${color}-300 text-xs font-semibold`}>{label}</p>
                          <span className="text-gray-400 text-[9px]">{profile.directComparableCount} direct · {profile.gradeAdjacentComparableCount} adjacent · {contextual.length} context · {rejected.length} excluded</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {checklist.map(([name, passed]) => (
                            <span key={name as string} className={`rounded px-1.5 py-1 text-[9px] ${passed ? 'bg-emerald-950/50 text-emerald-300' : 'bg-orange-950/50 text-orange-300'}`}>
                              {passed ? '✓' : '•'} {name as string}
                            </span>
                          ))}
                        </div>
                        {accepted.slice(0, 3).map((comparable: any) => (
                          <div key={`accepted-${comparable.title}-${comparable.date}`} className="rounded border border-emerald-900/50 bg-emerald-950/20 px-2 py-1.5 text-[9px]">
                            <p className="text-gray-200 truncate">${Number(comparable.price || 0).toLocaleString()} · {comparable.title}</p>
                            <p className="text-emerald-300/80 mt-0.5">{comparable.classification} match · score {comparable.score} · {(comparable.reasons ?? []).join(' · ')}</p>
                            <p className="text-gray-500 mt-0.5">{comparable.sourceLabel ?? comparable.sourceId ?? 'source unavailable'} · {comparable.priceBasis ?? 'price basis unavailable'} · visual {String(comparable.visualReviewStatus ?? 'not_reviewed').replace(/_/g, ' ')}</p>
                          </div>
                        ))}
                        {contextual.slice(0, 2).map((comparable: any) => (
                          <div key={`context-${comparable.title}-${comparable.date}`} className="rounded border border-sky-900/50 bg-sky-950/20 px-2 py-1.5 text-[9px]">
                            <p className="text-gray-300 truncate">${Number(comparable.price || 0).toLocaleString()} · {comparable.title}</p>
                            <p className="text-sky-300/80 mt-0.5">{comparable.valuationRelationship === 'grade_adjacent_comparable' ? 'Secondary evidence · ' : 'Context only · '}{comparable.exclusionReason ?? 'not eligible for valuation'}</p>
                            <p className="text-gray-500 mt-0.5">{comparable.sourceLabel ?? comparable.sourceId ?? 'source unavailable'} · visual {String(comparable.visualReviewStatus ?? 'not_reviewed').replace(/_/g, ' ')}</p>
                          </div>
                        ))}
                        {rejected.slice(0, 3).map((comparable: any) => (
                          <div key={`rejected-${comparable.title}-${comparable.date}`} className="rounded border border-orange-900/50 bg-orange-950/20 px-2 py-1.5 text-[9px]">
                            <p className="text-gray-300 truncate">${Number(comparable.price || 0).toLocaleString()} · {comparable.title}</p>
                            <p className="text-orange-300/80 mt-0.5">Excluded · {comparable.exclusionReason ?? 'insufficient comparable evidence'}</p>
                            <p className="text-gray-500 mt-0.5">{comparable.sourceLabel ?? comparable.sourceId ?? 'source unavailable'} · visual {String(comparable.visualReviewStatus ?? 'not_reviewed').replace(/_/g, ' ')}</p>
                          </div>
                        ))}
                        {!accepted.length && !rejected.length && <p className="text-gray-500 text-[9px]">No individual comparable records were returned.</p>}
                        {(profile.comparables ?? []).length > 0 && (
                          <details className="rounded border border-slate-700/60 bg-slate-950/70 px-2 py-1.5">
                            <summary className="cursor-pointer select-none text-[9px] font-semibold text-slate-200">Full valuation-use ledger · {(profile.comparables ?? []).length} returned records</summary>
                            <p className="mt-1 text-[8px] text-gray-500">Every returned record is retained here. “Used” means it met completed-sale, identity, and source-balanced selection rules; all other labels state the exact reason it did not enter the direct value.</p>
                            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                              {(profile.comparables ?? []).map((comparable: any, index: number) => {
                                const used = Boolean(comparable.accepted);
                                const secondary = comparable.valuationRelationship === 'grade_adjacent_comparable';
                                const useLabel = used
                                  ? 'Used in direct valuation'
                                  : secondary
                                    ? 'Secondary evidence only'
                                    : comparable.exclusionReason === 'omitted from the bounded valuation set after source-balanced selection'
                                      ? 'Matched but omitted by source-balanced cap'
                                      : comparable.classification === 'rejected'
                                        ? 'Excluded from direct valuation'
                                        : 'Context / review only';
                                const useTone = used
                                  ? 'text-emerald-300'
                                  : secondary
                                    ? 'text-violet-300'
                                    : comparable.classification === 'rejected'
                                      ? 'text-orange-300'
                                      : 'text-sky-300';
                                const gate = comparable.categoryIdentity;
                                return <div key={`ledger-${comparable.saleId ?? comparable.url ?? comparable.title}-${index}`} className="rounded border border-slate-800 bg-slate-900/60 px-1.5 py-1 text-[8px]">
                                  <p className="truncate text-gray-200">${Number(comparable.price || 0).toLocaleString()} · {comparable.title}</p>
                                  <p className={`mt-0.5 font-semibold ${useTone}`}>{useLabel}</p>
                                  <p className="mt-0.5 text-gray-400">Reason: {used ? `Completed sale selected with ${comparable.classification} identity match (score ${comparable.score}).` : comparable.exclusionReason ?? 'No direct valuation eligibility was established.'}</p>
                                  {gate && <p className="mt-0.5 text-gray-500">Category gate: {String(gate.status).replace(/_/g, ' ')}{gate.confirmedFields?.length ? ` · confirmed ${gate.confirmedFields.join(', ')}` : ''}{gate.unconfirmedFields?.length ? ` · review ${gate.unconfirmedFields.join(', ')}` : ''}{gate.conflicts?.length ? ` · conflict ${gate.conflicts.join(', ')}` : ''}</p>}
                                  <p className="mt-0.5 text-gray-600">{comparable.sourceLabel ?? comparable.sourceId ?? 'source unavailable'} · adapter {comparable.sourceAdapter ?? 'unverified'} · {comparable.saleStatus ?? 'status unavailable'} · {comparable.priceBasis ?? 'price basis unavailable'} · premium {comparable.buyerPremium ?? 'unknown'} · duplicate {String(comparable.duplicateStatus ?? 'unique').replace(/_/g, ' ')} · visual {String(comparable.visualReviewStatus ?? 'not_reviewed').replace(/_/g, ' ')}</p>
                                  <p className="mt-0.5 break-all text-gray-700">{comparable.canonicalTransactionId ? `Canonical transaction: ${comparable.canonicalTransactionId}` : 'Canonical transaction: unavailable / context only'}</p>
                                </div>;
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </>
          )}
          <VisionImpactPanel result={result} />
          {result.visualFieldCompletionUsed && (
            <div className="rounded-lg border border-violet-700/40 bg-violet-950/15 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-violet-300 text-[10px] font-bold uppercase tracking-wide">Visual Search Fields Used in This Analysis</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">A/B evidence layer: only high-confidence visible or OCR-read fields that were blank in the listing are added temporarily. No listing data is saved or overwritten.</p>
                </div>
                <span className="rounded bg-violet-900/50 px-2 py-1 text-[9px] font-semibold text-violet-100">Identity context only</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Item A', augmentation: result.leftVisualFieldAugmentation, color: 'cyan' },
                  { label: 'Item B', augmentation: result.rightVisualFieldAugmentation, color: 'amber' },
                ].map(({ label, augmentation, color }) => augmentation && (
                  <div key={label} className="rounded bg-gray-950/50 p-2 space-y-2">
                    <p className={`text-${color}-300 text-xs font-semibold`}>{label}</p>
                    {augmentation.appliedFields?.length > 0 ? <div className="space-y-1">
                      {augmentation.appliedFields.map((field: any) => <div key={`${field.field}-${field.value}`} className="rounded border border-violet-800/40 bg-violet-950/20 px-2 py-1.5 text-[10px]">
                        <p className="text-violet-100"><span className="font-semibold">{field.label}:</span> {field.value}</p>
                        <p className="mt-0.5 text-gray-500">{field.status} · {field.confidence} confidence · {field.evidence}</p>
                      </div>)}
                    </div> : <p className="text-gray-500 text-[10px]">No eligible missing fields were added. Existing listing data stayed unchanged.</p>}
                    {augmentation.skippedExistingFields?.length > 0 && <p className="text-gray-500 text-[9px]">Kept listing values: {augmentation.skippedExistingFields.join(', ')}</p>}
                    {augmentation.conflicts?.length > 0 && <p className="text-amber-200 text-[9px]">Manual review: {augmentation.conflicts.join(' · ')}</p>}
                    <p className="text-violet-200/80 text-[9px]">{augmentation.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.visualFieldCompletionUsed && (result.leftVisualComparableQuery || result.rightVisualComparableQuery) && (
            <div className="rounded-lg border border-cyan-700/40 bg-cyan-950/15 p-3 space-y-3">
              <div>
                <p className="text-cyan-300 text-[10px] font-bold uppercase tracking-wide">Refined Comparable Search</p>
                <p className="text-gray-500 text-[10px] mt-0.5">High-confidence image fields were appended temporarily to improve identity matching. These are active asking-price results only; completed sales still control valuation.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Item A', query: result.leftVisualComparableQuery, metrics: result.leftVisualComparableMetrics, color: 'cyan' },
                  { label: 'Item B', query: result.rightVisualComparableQuery, metrics: result.rightVisualComparableMetrics, color: 'amber' },
                ].map(({ label, query, metrics, color }) => query && (
                  <div key={label} className="rounded bg-gray-950/50 p-2 space-y-1">
                    <p className={`text-${color}-300 text-xs font-semibold`}>{label}</p>
                    <p className="text-gray-200 text-[10px] break-words"><span className="text-gray-500">Query:</span> {query.query}</p>
                    <p className="text-gray-400 text-[10px]">{metrics ? `${metrics.count} active matches · median $${metrics.median.toLocaleString()} · range $${metrics.min.toLocaleString()}–$${metrics.max.toLocaleString()} · ${metrics.confidence} confidence` : 'No refined active matches returned.'}</p>
                    <p className="text-gray-600 text-[9px]">Temporary identity refinement only; not completed-sale evidence.</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(result.leftVisualReview || result.rightVisualReview) && (
            <div className="rounded-lg border border-fuchsia-700/40 bg-fuchsia-950/15 p-3 space-y-3">
              <div>
                <p className="text-fuchsia-300 text-[10px] font-bold uppercase tracking-wide">Image-Assisted Identity Review</p>
                <p className="text-gray-500 text-[10px] mt-0.5">Vision checks visible identity clues against listing metadata. It is not authentication and does not determine value.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Item A', review: result.leftVisualReview, color: 'cyan' },
                  { label: 'Item B', review: result.rightVisualReview, color: 'amber' },
                ].map(({ label, review, color }) => review && (
                  <div key={label} className="rounded bg-gray-950/50 p-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-${color}-300 text-xs font-semibold`}>{label}</p>
                      <span className="rounded bg-fuchsia-900/40 px-1.5 py-0.5 text-[9px] text-fuchsia-200">{review.confidence ?? 'unknown'} confidence</span>
                    </div>
                    {review.visibleIdentifiers?.length > 0 && <p className="text-gray-300 text-[10px]"><span className="text-gray-500">Visible:</span> {review.visibleIdentifiers.join('; ')}</p>}
                    {review.metadataMatches?.length > 0 && <p className="text-gray-300 text-[10px]"><span className="text-emerald-400">Matches:</span> {review.metadataMatches.join('; ')}</p>}
                    {review.potentialConflicts?.length > 0 && <p className="text-amber-200 text-[10px]"><span className="text-amber-400">Review:</span> {review.potentialConflicts.join('; ')}</p>}
                    {review.conditionObservations?.length > 0 && <p className="text-gray-400 text-[10px]"><span className="text-gray-500">Condition clues:</span> {review.conditionObservations.join('; ')}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[
            { item: leftItem, insights: result.itemAInsights, marketNews: result.itemAMarketNews, potential: result.itemAFuturePotential, strengths: result.itemAStrengths, risks: result.itemARisks, gradeCliff: result.itemAGradeCliff, liquidity: result.itemALiquidity, liquidityNote: result.itemALiquidityNote, color: 'cyan' },
            { item: rightItem, insights: result.itemBInsights, marketNews: result.itemBMarketNews, potential: result.itemBFuturePotential, strengths: result.itemBStrengths, risks: result.itemBRisks, gradeCliff: result.itemBGradeCliff, liquidity: result.itemBLiquidity, liquidityNote: result.itemBLiquidityNote, color: 'amber' },
          ].map(({ item, insights, marketNews, potential, strengths, risks, gradeCliff, liquidity, liquidityNote, color }) => (
            <div key={color} className="space-y-2">
              <p className={`text-${color}-300 font-semibold text-sm`}>{item.title}</p>
              {insights && <p className="text-gray-300 text-xs leading-relaxed">{insights}</p>}
              {marketNews && <div className="rounded border border-sky-700/30 bg-sky-950/20 p-2"><p className="text-sky-300 text-[9px] font-bold uppercase">Item-specific RSS note</p><p className="text-gray-400 text-[10px] leading-relaxed mt-1">{marketNews}</p></div>}
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
function DataColumn({ item, searchItem, side, enabledSources, ebayData, ebayLoading, soldCompsData, hipstampData, hipstampSoldData, pokemonPriceTrackerData, pokemonPriceTrackerLoading, theCardApiData, theCardApiLoading, cardsightAiData, cardsightAiLoading, lelandsData, lelandsLoading, pristineAuctionData, pristineAuctionLoading, pcgsAuctionData, pcgsAuctionLoading, oneThirtyPointData, onEvidenceSummary }: {
  item: SelectedItem | null;
  searchItem: SelectedItem | null;
  side: 'left' | 'right';
  enabledSources: Set<SourceId>;
  ebayData: any;
  ebayLoading: boolean;
  soldCompsData: any;
  hipstampData: any;
  hipstampSoldData: any;
  pokemonPriceTrackerData: any;
  pokemonPriceTrackerLoading: boolean;
  theCardApiData: any;
  theCardApiLoading: boolean;
  cardsightAiData: any;
  cardsightAiLoading: boolean;
  lelandsData: any;
  lelandsLoading: boolean;
  pristineAuctionData: any;
  pristineAuctionLoading: boolean;
  pcgsAuctionData: any;
  pcgsAuctionLoading: boolean;
  oneThirtyPointData: any;
  onEvidenceSummary?: (summary: NormalizedEvidenceSummary) => void;
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

  // Dynamic message for cert mode when no grading source is loaded yet
  const gradingSourceLabel = item.gradingCompany === 'PSA' ? 'Parse.bot (PSA Data)' :
    item.gradingCompany === 'BGS' ? 'Parse.bot (Beckett Data)' :
    item.gradingCompany ? `a ${item.gradingCompany} grading source` :
    'a grading data source';

  return (
    <div className="space-y-3">
      <EvidenceNormalizationSummary item={item} marketItem={queryItem} side={side} enabledSources={enabledSources} ebayData={ebayData} soldCompsData={soldCompsData} hipstampData={hipstampData} hipstampSoldData={hipstampSoldData} pokemonPriceTrackerData={pokemonPriceTrackerData} theCardApiData={theCardApiData} cardsightAiData={cardsightAiData} lelandsData={lelandsData} pristineAuctionData={pristineAuctionData} pcgsAuctionData={pcgsAuctionData} oneThirtyPointData={oneThirtyPointData} onSummaryChange={onEvidenceSummary} />
      {enabledSources.has('ebay_active') && (
        searchItem || item.category !== 'unknown'
          ? <EbayActiveSection item={queryItem} side={side} data={ebayData} isLoading={ebayLoading} />
          : <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
              <p className={`text-[11px] font-bold uppercase ${side === 'left' ? 'text-cyan-300' : 'text-amber-300'}`}>🛒 eBay Active Listings</p>
              <p className="text-gray-500 text-[10px]">Enable <strong>{gradingSourceLabel}</strong> first to auto-build the search query from cert details</p>
            </div>
      )}
      {enabledSources.has('hipstamp') && <HipstampSection item={queryItem} side={side} />}
      {enabledSources.has('hipstamp_sold') && <HipstampSoldSection item={queryItem} side={side} />}
      {enabledSources.has('pokemon_price_tracker') && <PokemonPriceTrackerSection item={item} side={side} data={pokemonPriceTrackerData} isLoading={pokemonPriceTrackerLoading} />}
      {enabledSources.has('the_card_api') && <TheCardApiSection item={item} side={side} data={theCardApiData} isLoading={theCardApiLoading} />}
      {enabledSources.has('cardsight_ai') && <CardsightAiSection item={item} side={side} data={cardsightAiData} isLoading={cardsightAiLoading} />}
      {enabledSources.has('lelands') && <ParseAuctionSection item={item} side={side} source="lelands" data={lelandsData} isLoading={lelandsLoading} />}
      {enabledSources.has('pristine_auction') && <ParseAuctionSection item={item} side={side} source="pristine_auction" data={pristineAuctionData} isLoading={pristineAuctionLoading} />}
      {enabledSources.has('sold_comps') && (
        searchItem || item.category !== 'unknown'
          ? <SoldCompsSection item={queryItem} side={side} />
          : <div className="bg-gray-800/30 rounded-lg p-3 border border-dashed border-gray-700/40 space-y-2">
              <p className={`text-[11px] font-bold uppercase ${side === 'left' ? 'text-cyan-300' : 'text-amber-300'}`}>💰 Sold-Comps — eBay Sold History</p>
              <p className="text-gray-500 text-[10px]">Enable <strong>{gradingSourceLabel}</strong> first to auto-build the search query from cert details</p>
            </div>
      )}
      {enabledSources.has('ebay_sold') && <PlaceholderSection sourceId="ebay_sold" side={side} />}
      {enabledSources.has('cgc') && <CgcComicsSection item={item} side={side} />}
      {enabledSources.has('psa') && <PSASection item={item} side={side} />}
      {enabledSources.has('bgs') && <BeckettSection item={item} side={side} />}
      {enabledSources.has('sgc') && <SgcSection item={item} side={side} />}
      {enabledSources.has('pcgs') && <PcgsSection item={item} side={side} auctionData={pcgsAuctionData} auctionLoading={pcgsAuctionLoading} />}
      {enabledSources.has('pricecharting') && <PriceChartingSection item={item} side={side} />}
      {enabledSources.has('one_thirty_point') && <OneThirtyPointSection item={searchItem ?? item} side={side} />}
      {enabledSources.has('tcgdex') && <TcgDexSection item={item} side={side} />}
      {enabledSources.has('igdb') && <IgdbSection item={item} side={side} />}
      {enabledSources.has('rawg') && <RawgSection item={item} side={side} />}
      {enabledSources.has('discogs') && <DiscogsSection item={item} side={side} />}
      {enabledSources.has('wikidata') && <WikidataSection item={item} side={side} />}
      {enabledSources.has('smithsonian') && <SmithsonianSection item={item} side={side} />}
      {enabledSources.has('ngc') && <PlaceholderSection sourceId="ngc" side={side} />}
      {enabledSources.has('cbcs') && <PlaceholderSection sourceId="cbcs" side={side} />}
      {enabledSources.has('comic_book_realm') && <PlaceholderSection sourceId="comic_book_realm" side={side} />}
      {enabledSources.has('pwcc') && <PwccSection item={searchItem ?? item} side={side} />}
      {enabledSources.has('heritage') && <PlaceholderSection sourceId="heritage" side={side} />}
      {enabledSources.has('gocollect') && <PlaceholderSection sourceId="gocollect" side={side} />}
      {SANDBOX_SPECIALIST_SOURCES.map((source) => enabledSources.has(source.id) && <SandboxSpecialistSection key={source.id} sourceId={source.id} side={side} />)}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TestAI() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [leftItem, setLeftItem] = useState<SelectedItem | null>(null);
  const [rightItem, setRightItem] = useState<SelectedItem | null>(null);
  const [leftSources, setLeftSources] = useState<Set<SourceId>>(new Set());
  const [rightSources, setRightSources] = useState<Set<SourceId>>(new Set());
  const [leftEvidenceSummary, setLeftEvidenceSummary] = useState<NormalizedEvidenceSummary | null>(null);
  const [rightEvidenceSummary, setRightEvidenceSummary] = useState<NormalizedEvidenceSummary | null>(null);
  const leftSourceKey = useMemo(() => Array.from(leftSources).sort().join('|'), [leftSources]);
  const rightSourceKey = useMemo(() => Array.from(rightSources).sort().join('|'), [rightSources]);

  useEffect(() => {
    setLeftEvidenceSummary(null);
  }, [leftItem?.id, leftItem?.title, leftItem?.category, leftSourceKey]);

  useEffect(() => {
    setRightEvidenceSummary(null);
  }, [rightItem?.id, rightItem?.title, rightItem?.category, rightSourceKey]);

  const { data: inventory = [], isLoading: inventoryLoading } = trpc.testAI.getMyInventory.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });
  const { data: allItems = [], isLoading: allItemsLoading } = trpc.testAI.getAllPublicItems.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  // ── Silently fetch PSA cert data for cert-mode items so we can build search queries ──
  const leftPSAQuery = trpc.testAI.getPSAData.useQuery(
    { certNumber: leftItem?.certId || '' },
    { enabled: !!leftItem?.certId && leftItem?.gradingCompany === 'PSA' }
  );
  const rightPSAQuery = trpc.testAI.getPSAData.useQuery(
    { certNumber: rightItem?.certId || '' },
    { enabled: !!rightItem?.certId && rightItem?.gradingCompany === 'PSA' }
  );

  // ── Silently fetch Beckett cert data for BGS cert-mode items ──
  const leftBeckettQuery = trpc.testAI.getBeckettData.useQuery(
    { certNumber: leftItem?.certId || '' },
    { enabled: !!leftItem?.certId && leftItem?.gradingCompany === 'BGS' }
  );
  const rightBeckettQuery = trpc.testAI.getBeckettData.useQuery(
    { certNumber: rightItem?.certId || '' },
    { enabled: !!rightItem?.certId && rightItem?.gradingCompany === 'BGS' }
  );
  const leftCgcQuery = trpc.testAI.getCgcComicsData.useQuery(
    { certNumber: leftItem?.certId || '' },
    { enabled: !!leftItem?.certId && leftItem?.gradingCompany === 'CGC' && leftItem?.category === 'comics' }
  );
  const rightCgcQuery = trpc.testAI.getCgcComicsData.useQuery(
    { certNumber: rightItem?.certId || '' },
    { enabled: !!rightItem?.certId && rightItem?.gradingCompany === 'CGC' && rightItem?.category === 'comics' }
  );

  // Build an effective item for Sold-Comps/eBay queries:
  // If it's a cert-mode item AND Parse.bot returned card data, synthesize a searchable item.
  // Otherwise fall back to the item as-is (inventory mode).
  function buildSearchableItem(item: SelectedItem | null, psaData: any, beckettData: any, cgcData: any): SelectedItem | null {
    if (!item) return null;
    if (item.category !== 'unknown' && !(item.certId && item.gradingCompany === 'CGC')) return item; // inventory item — already has all fields

    // Choose data source based on grading company
    const company = item.gradingCompany;

    if (company === 'PSA') {
      const card = psaData?.data?.data;
      if (!card) return null; // PSA data not loaded yet
      const grade = card.grade?.match(/\d+(\.\d+)?/)?.[0] ?? undefined;
      const query = [card.year, card.brand, card.subject, card.cardNumber, 'PSA', grade]
        .filter(Boolean).join(' ');
      return {
        ...item,
        title: query,
        category: 'cert_direct',
        grade,
        certificationCompany: 'PSA',
      };
    }

    if (company === 'BGS') {
      const card = beckettData?.data?.data;
      if (!card) return null; // Beckett data not loaded yet
      const grade = card.finalGrade ?? undefined;
      // Beckett: playerName + setName + cardNumber + BGS + grade
      const query = [card.playerName, card.setName, card.cardNumber, 'BGS', grade]
        .filter(Boolean).join(' ');
      return {
        ...item,
        title: query,
        category: 'cert_direct',
        grade,
        certificationCompany: 'BGS',
      };
    }

    if (isCgcCompany(company) && (item.category === 'comics' || item.category === 'unknown')) {
      const comic = cgcData?.data?.data;
      if (!comic) return null;
      const grade = String(comic.grade ?? '').match(/\d+(\.\d+)?/)?.[0] ?? undefined;
      const query = [comic.title, comic.issueNumber ? `#${comic.issueNumber}` : '', comic.year, comic.publisher, 'CGC', grade]
        .filter(Boolean).join(' ');
      return { ...item, title: query || item.title, category: 'cert_direct', grade, certificationCompany: 'CGC', itemDetails: JSON.stringify({ comicTitle: comic.title, issueNumber: comic.issueNumber, publisher: comic.publisher, variant: comic.variant, year: comic.year }) };
    }

    // For other grading companies (PCGS, NGC, etc.) there is no cert search synthesis yet.
    return null;

  }

  const leftSearchItem = buildSearchableItem(leftItem, leftPSAQuery, leftBeckettQuery, leftCgcQuery);
  const rightSearchItem = buildSearchableItem(rightItem, rightPSAQuery, rightBeckettQuery, rightCgcQuery);

  const leftEbayQuery = trpc.testAI.getEbayData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftSearchItem.category, itemType: leftSearchItem.itemType, grade: leftSearchItem.grade, condition: leftSearchItem.condition, certificationCompany: leftSearchItem.certificationCompany, itemDetails: leftSearchItem.itemDetails, imageUrl: leftSearchItem.primaryPhotoUrl } : { title: '', category: '' },
    { enabled: !!leftSearchItem && leftSources.has('ebay_active') }
  );
  const rightEbayQuery = trpc.testAI.getEbayData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightSearchItem.category, itemType: rightSearchItem.itemType, grade: rightSearchItem.grade, condition: rightSearchItem.condition, certificationCompany: rightSearchItem.certificationCompany, itemDetails: rightSearchItem.itemDetails, imageUrl: rightSearchItem.primaryPhotoUrl } : { title: '', category: '' },
    { enabled: !!rightSearchItem && rightSources.has('ebay_active') }
  );

  const leftHipstampQuery = trpc.testAI.getHipstampData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftSearchItem.category, itemType: leftSearchItem.itemType, grade: leftSearchItem.grade, condition: leftSearchItem.condition, certificationCompany: leftSearchItem.certificationCompany, itemDetails: leftSearchItem.itemDetails, imageUrl: leftSearchItem.primaryPhotoUrl } : { title: '', category: '' },
    { enabled: !!leftSearchItem && leftSources.has('hipstamp') }
  );
  const rightHipstampQuery = trpc.testAI.getHipstampData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightSearchItem.category, itemType: rightSearchItem.itemType, grade: rightSearchItem.grade, condition: rightSearchItem.condition, certificationCompany: rightSearchItem.certificationCompany, itemDetails: rightSearchItem.itemDetails, imageUrl: rightSearchItem.primaryPhotoUrl } : { title: '', category: '' },
    { enabled: !!rightSearchItem && rightSources.has('hipstamp') }
  );
  const leftHipstampSoldQuery = trpc.testAI.getHipstampSoldData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftSearchItem.category, grade: leftSearchItem.grade ?? undefined, condition: leftSearchItem.condition ?? undefined, certificationCompany: leftSearchItem.certificationCompany ?? '', itemDetails: leftSearchItem.itemDetails ?? undefined, imageUrl: leftSearchItem.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!leftSearchItem && leftSources.has('hipstamp_sold') }
  );
  const rightHipstampSoldQuery = trpc.testAI.getHipstampSoldData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightSearchItem.category, grade: rightSearchItem.grade ?? undefined, condition: rightSearchItem.condition ?? undefined, certificationCompany: rightSearchItem.certificationCompany ?? '', itemDetails: rightSearchItem.itemDetails ?? undefined, imageUrl: rightSearchItem.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!rightSearchItem && rightSources.has('hipstamp_sold') }
  );

  const leftPokemonPriceTrackerQuery = trpc.testAI.getPokemonPriceTrackerData.useQuery(
    leftItem ? { title: leftItem.title, category: leftItem.category, grade: leftItem.grade ?? undefined, condition: leftItem.condition ?? undefined, certificationCompany: leftItem.certificationCompany ?? undefined, itemDetails: leftItem.itemDetails ?? undefined } : { title: '', category: 'unknown' },
    { enabled: !!leftItem && leftSources.has('pokemon_price_tracker') }
  );
  const rightPokemonPriceTrackerQuery = trpc.testAI.getPokemonPriceTrackerData.useQuery(
    rightItem ? { title: rightItem.title, category: rightItem.category, grade: rightItem.grade ?? undefined, condition: rightItem.condition ?? undefined, certificationCompany: rightItem.certificationCompany ?? undefined, itemDetails: rightItem.itemDetails ?? undefined } : { title: '', category: 'unknown' },
    { enabled: !!rightItem && rightSources.has('pokemon_price_tracker') }
  );
  const leftTheCardApiQuery = trpc.testAI.getTheCardApiData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftItem?.category ?? leftSearchItem.category, grade: leftSearchItem.grade ?? undefined, condition: leftSearchItem.condition ?? undefined, certificationCompany: leftSearchItem.certificationCompany ?? undefined, itemDetails: leftSearchItem.itemDetails ?? undefined, imageUrl: leftItem?.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!leftSearchItem && leftSources.has('the_card_api') }
  );
  const rightTheCardApiQuery = trpc.testAI.getTheCardApiData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightItem?.category ?? rightSearchItem.category, grade: rightSearchItem.grade ?? undefined, condition: rightSearchItem.condition ?? undefined, certificationCompany: rightSearchItem.certificationCompany ?? undefined, itemDetails: rightSearchItem.itemDetails ?? undefined, imageUrl: rightItem?.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!rightSearchItem && rightSources.has('the_card_api') }
  );
  const leftCardsightAiQuery = trpc.testAI.getCardsightAiData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftItem?.category ?? leftSearchItem.category, grade: leftSearchItem.grade ?? undefined, condition: leftSearchItem.condition ?? undefined, certificationCompany: leftSearchItem.certificationCompany ?? undefined, itemDetails: leftSearchItem.itemDetails ?? undefined, imageUrl: leftItem?.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!leftSearchItem && leftSources.has('cardsight_ai') }
  );
  const rightCardsightAiQuery = trpc.testAI.getCardsightAiData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightItem?.category ?? rightSearchItem.category, grade: rightSearchItem.grade ?? undefined, condition: rightSearchItem.condition ?? undefined, certificationCompany: rightSearchItem.certificationCompany ?? undefined, itemDetails: rightSearchItem.itemDetails ?? undefined, imageUrl: rightItem?.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!rightSearchItem && rightSources.has('cardsight_ai') }
  );
  const leftLelandsQuery = trpc.testAI.getLelandsAuctionData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftItem?.category ?? leftSearchItem.category, grade: leftSearchItem.grade ?? undefined, condition: leftSearchItem.condition ?? undefined, certificationCompany: leftSearchItem.certificationCompany ?? undefined, itemDetails: leftSearchItem.itemDetails ?? undefined, itemType: leftSearchItem.itemType, imageUrl: leftItem?.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!leftSearchItem && leftSources.has('lelands') }
  );
  const rightLelandsQuery = trpc.testAI.getLelandsAuctionData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightItem?.category ?? rightSearchItem.category, grade: rightSearchItem.grade ?? undefined, condition: rightSearchItem.condition ?? undefined, certificationCompany: rightSearchItem.certificationCompany ?? undefined, itemDetails: rightSearchItem.itemDetails ?? undefined, itemType: rightSearchItem.itemType, imageUrl: rightItem?.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!rightSearchItem && rightSources.has('lelands') }
  );
  const leftPristineAuctionQuery = trpc.testAI.getPristineAuctionData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftItem?.category ?? leftSearchItem.category, grade: leftSearchItem.grade ?? undefined, condition: leftSearchItem.condition ?? undefined, certificationCompany: leftSearchItem.certificationCompany ?? undefined, itemDetails: leftSearchItem.itemDetails ?? undefined, itemType: leftSearchItem.itemType, imageUrl: leftItem?.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!leftSearchItem && leftSources.has('pristine_auction') }
  );
  const rightPristineAuctionQuery = trpc.testAI.getPristineAuctionData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightItem?.category ?? rightSearchItem.category, grade: rightSearchItem.grade ?? undefined, condition: rightSearchItem.condition ?? undefined, certificationCompany: rightSearchItem.certificationCompany ?? undefined, itemDetails: rightSearchItem.itemDetails ?? undefined, itemType: rightSearchItem.itemType, imageUrl: rightItem?.primaryPhotoUrl } : { title: '', category: 'unknown' },
    { enabled: !!rightSearchItem && rightSources.has('pristine_auction') }
  );
  const leftPcgsAuctionQuery = trpc.testAI.getPcgsAuctionData.useQuery(
    { certNumber: leftItem?.certId || '' },
    { enabled: !!leftItem && leftSources.has('pcgs') && leftItem.gradingCompany === 'PCGS' && /^\d{7,8}$/.test(leftItem.certId || '') },
  );
  const rightPcgsAuctionQuery = trpc.testAI.getPcgsAuctionData.useQuery(
    { certNumber: rightItem?.certId || '' },
    { enabled: !!rightItem && rightSources.has('pcgs') && rightItem.gradingCompany === 'PCGS' && /^\d{7,8}$/.test(rightItem.certId || '') },
  );

  const leftSoldCompsQuery = trpc.testAI.getSoldCompsData.useQuery(
    leftSearchItem ? { title: leftSearchItem.title, category: leftSearchItem.category, itemType: leftSearchItem.itemType, grade: leftSearchItem.grade, condition: leftSearchItem.condition, certificationCompany: leftSearchItem.certificationCompany ?? '', itemDetails: leftSearchItem.itemDetails, imageUrl: leftSearchItem.primaryPhotoUrl } : { title: '', category: '' },
    { enabled: !!leftSearchItem && leftSources.has('sold_comps') }
  );
  const rightSoldCompsQuery = trpc.testAI.getSoldCompsData.useQuery(
    rightSearchItem ? { title: rightSearchItem.title, category: rightSearchItem.category, itemType: rightSearchItem.itemType, grade: rightSearchItem.grade, condition: rightSearchItem.condition, certificationCompany: rightSearchItem.certificationCompany ?? '', itemDetails: rightSearchItem.itemDetails, imageUrl: rightSearchItem.primaryPhotoUrl } : { title: '', category: '' },
    { enabled: !!rightSearchItem && rightSources.has('sold_comps') }
  );
  const left130PointQuery = trpc.testAI.get130PointData.useQuery(
    { query: leftSearchItem?.title || '', itemDetails: leftSearchItem?.itemDetails, imageUrl: leftSearchItem?.primaryPhotoUrl },
    { enabled: !!leftSearchItem && leftSources.has('one_thirty_point') },
  );
  const right130PointQuery = trpc.testAI.get130PointData.useQuery(
    { query: rightSearchItem?.title || '', itemDetails: rightSearchItem?.itemDetails, imageUrl: rightSearchItem?.primaryPhotoUrl },
    { enabled: !!rightSearchItem && rightSources.has('one_thirty_point') },
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
          <ItemPanel side="left" item={leftItem} onItemChange={setLeftItem} onSourceChange={setLeftSources} inventory={inventory} inventoryLoading={inventoryLoading} allItems={allItems} allItemsLoading={allItemsLoading} />
          <div className="flex items-center justify-center flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 font-bold text-sm">VS</div>
          </div>
          <ItemPanel side="right" item={rightItem} onItemChange={setRightItem} onSourceChange={setRightSources} inventory={inventory} inventoryLoading={inventoryLoading} allItems={allItems} allItemsLoading={allItemsLoading} />
        </div>

        {/* Data source selectors — only show when items are selected */}
        {(leftItem || rightItem) && (
          <div className={`grid gap-4 ${leftItem && rightItem ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {leftItem && <SourceSelector enabled={leftSources} onChange={setLeftSources} side="left" item={leftItem} />}
            {rightItem && <SourceSelector enabled={rightSources} onChange={setRightSources} side="right" item={rightItem} />}
          </div>
        )}

        {/* Data sections */}
        {(leftItem || rightItem) && (
          <div className={`grid gap-4 ${leftItem && rightItem ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <DataColumn item={leftItem} searchItem={leftSearchItem} side="left" enabledSources={leftSources} ebayData={leftEbayQuery.data} ebayLoading={leftEbayQuery.isLoading} soldCompsData={leftSoldCompsQuery.data} hipstampData={leftHipstampQuery.data} hipstampSoldData={leftHipstampSoldQuery.data} pokemonPriceTrackerData={leftPokemonPriceTrackerQuery.data} pokemonPriceTrackerLoading={leftPokemonPriceTrackerQuery.isLoading} theCardApiData={leftTheCardApiQuery.data} theCardApiLoading={leftTheCardApiQuery.isLoading} cardsightAiData={leftCardsightAiQuery.data} cardsightAiLoading={leftCardsightAiQuery.isLoading} lelandsData={leftLelandsQuery.data} lelandsLoading={leftLelandsQuery.isLoading} pristineAuctionData={leftPristineAuctionQuery.data} pristineAuctionLoading={leftPristineAuctionQuery.isLoading} pcgsAuctionData={leftPcgsAuctionQuery.data} pcgsAuctionLoading={leftPcgsAuctionQuery.isLoading} oneThirtyPointData={left130PointQuery.data} onEvidenceSummary={setLeftEvidenceSummary} />
            {rightItem && <DataColumn item={rightItem} searchItem={rightSearchItem} side="right" enabledSources={rightSources} ebayData={rightEbayQuery.data} ebayLoading={rightEbayQuery.isLoading} soldCompsData={rightSoldCompsQuery.data} hipstampData={rightHipstampQuery.data} hipstampSoldData={rightHipstampSoldQuery.data} pokemonPriceTrackerData={rightPokemonPriceTrackerQuery.data} pokemonPriceTrackerLoading={rightPokemonPriceTrackerQuery.isLoading} theCardApiData={rightTheCardApiQuery.data} theCardApiLoading={rightTheCardApiQuery.isLoading} cardsightAiData={rightCardsightAiQuery.data} cardsightAiLoading={rightCardsightAiQuery.isLoading} lelandsData={rightLelandsQuery.data} lelandsLoading={rightLelandsQuery.isLoading} pristineAuctionData={rightPristineAuctionQuery.data} pristineAuctionLoading={rightPristineAuctionQuery.isLoading} pcgsAuctionData={rightPcgsAuctionQuery.data} pcgsAuctionLoading={rightPcgsAuctionQuery.isLoading} oneThirtyPointData={right130PointQuery.data} onEvidenceSummary={setRightEvidenceSummary} />}
          </div>
        )}

        <FieldCompletionPanel leftItem={leftItem} rightItem={rightItem} />

        {/* AI Analysis */}
        {!bothSelected && (leftItem || rightItem) && <MarketNewsSection item={leftItem ?? rightItem!} />}
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
             leftHipstampData={leftHipstampQuery.data}
             rightHipstampData={rightHipstampQuery.data}
             leftTheCardApiData={leftTheCardApiQuery.data}
             rightTheCardApiData={rightTheCardApiQuery.data}
             leftCardsightAiData={leftCardsightAiQuery.data}
             rightCardsightAiData={rightCardsightAiQuery.data}
             leftLelandsData={leftLelandsQuery.data}
             rightLelandsData={rightLelandsQuery.data}
             leftPristineAuctionData={leftPristineAuctionQuery.data}
             rightPristineAuctionData={rightPristineAuctionQuery.data}
             leftPcgsAuctionData={leftPcgsAuctionQuery.data}
             rightPcgsAuctionData={rightPcgsAuctionQuery.data}
             leftHistoricalTrendData={left130PointQuery.data}
             rightHistoricalTrendData={right130PointQuery.data}
             leftEvidenceSummary={leftEvidenceSummary}
             rightEvidenceSummary={rightEvidenceSummary}
          />
        )}

         {!leftItem && !rightItem && (
          <div className="py-10 text-gray-500">
            <div className="text-center">
              <p className="text-4xl mb-4">🧪</p>
              <p className="text-lg font-medium text-gray-400">Select two items to begin testing</p>
              <p className="text-sm mt-2">Choose from your inventory or enter a certificate ID, then select which data sources to test</p>
            </div>
            <div className="mt-8 rounded-xl border border-slate-700/70 bg-slate-900/60 p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Sandbox data sources</p>
              <p className="mt-1 text-xs text-slate-400">Sources are shown here before selection; category and grading requirements are enforced after an item is loaded.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.values(DATA_SOURCES).map((source) => (
                  <span key={source.id} className={`rounded-md border px-2 py-1 text-[11px] ${source.status === 'live' ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200' : 'border-slate-700 bg-slate-950/40 text-slate-400'}`}>
                    {source.icon} {source.label}{source.status === 'placeholder' ? ' (soon)' : ''}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-500">HIPStamp Active Listings is live for Stamps items and supplies current asking-price context only, not completed-sale evidence. Pokémon Price Tracker is live for Pokémon/TCG items and is manually enabled; its catalog, guide-price, history, eBay, Cardmarket, and plan-gated population fields remain source-attributed context and never change the Tradebilia trade verdict. The Card API Sales is live for Sports Cards and Pokémon/TCG: only confirmed, dated records that pass Tradebilia’s identity, grading, recency, duplicate, and currency checks can support sandbox valuation. Parse.bot Lelands is available for Sports Cards and Autographs, while Parse.bot Pristine Auction is available for Sports Cards; both require detail-level sold status, date, identity, and visual/evidence gates. PriceCharting now supports Pokémon/compatible TCG context, US coins, video games when a UPC/barcode is present, and bounded cross-category market movers; all PriceCharting results remain guide/asking context only.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
