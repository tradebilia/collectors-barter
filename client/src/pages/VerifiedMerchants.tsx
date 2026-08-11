import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { BadgeCheck, Store, MapPin, ExternalLink, Package } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

const VERIFIED_MERCHANTS_LOGO_URL = "/manus-storage/VerifiedMerchants_c2e2db11.webp";
const HERO_BG_URL = "/manus-storage/Background_48b923f1.jpg";

/** Ensure an external URL has a protocol so it is not treated as a relative path. */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function VerifiedMerchants() {
  const { data: merchants, isLoading } = trpc.market.getVerifiedMerchants.useQuery();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      {/* Hero section — same background as home page hero */}
      <section
        className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white"
        style={{
          backgroundImage: `url(${HERO_BG_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 lg:h-80">
          <img
            src={VERIFIED_MERCHANTS_LOGO_URL}
            alt="Verified Merchants"
            className="h-auto w-full"
          />
        </div>
      </section>

      <CategoryBar />

      {/* Subtitle strip */}
      <div className="bg-white border-b border-gray-100 py-3 px-4">
        <p className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
          These merchants have been verified by Tradebilia. Shop with confidence knowing their business credentials have been reviewed.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Merchant Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : merchants && merchants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchants.map((merchant: any) => (
              <div
                key={merchant.id}
                role="link"
                tabIndex={0}
                onClick={() => setLocation(`/profile/${merchant.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLocation(`/profile/${merchant.id}`); } }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center overflow-hidden shrink-0">
                      {merchant.avatarUrl ? (
                        <img src={merchant.avatarUrl} alt={merchant.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="h-6 w-6 text-emerald-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="font-bold text-gray-900 truncate">{merchant.storeName || merchant.displayName}</h2>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200 uppercase shrink-0">
                          <BadgeCheck className="h-2.5 w-2.5" />
                          Verified
                        </span>
                      </div>
                      {merchant.storeName && merchant.displayName !== merchant.storeName && (
                        <p className="text-xs text-gray-500 truncate">{merchant.displayName}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {merchant.storeDescription && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{merchant.storeDescription}</p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                      {(merchant.contactTown || merchant.contactState) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[merchant.contactTown, merchant.contactState].filter(Boolean).join(', ')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {merchant.itemsListed || 0} items
                      </span>
                    </div>
                    {merchant.businessWebsite && (
                      <a
                        href={normalizeUrl(merchant.businessWebsite)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Website
                      </a>
                    )}
                  </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Verified Merchants Yet</h3>
            <p className="text-gray-400 text-sm">Merchants who complete verification will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
