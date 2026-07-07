/**
 * HOMEPAGE LAYOUT MOCKUPS
 * 5 design options for the left sidebar (Subscriber Tools) and
 * the rankings sections below the carousel.
 * Route: /homepage-mockups
 */

// ─── Shared sample data ───────────────────────────────────────────────────────
const TOOLS = [
  { icon: "📦", label: "My Inventory" },
  { icon: "⚠️", label: "Report a User" },
  { icon: "🤝", label: "Refer a Collector" },
  { icon: "❤️", label: "Watchlist" },
  { icon: "💬", label: "Contact Us" },
  { icon: "💭", label: "Collector's Forum" },
];

const RANKINGS = [
  { rank: 1, title: "Amazing Spider-Man 129 CGC 9.6", views: "1,089,213", value: "$5,500", img: "🦸" },
  { rank: 2, title: "Wayne Gretzky Rookie PSA 9", views: "169,650", value: "$8,100", img: "🏒" },
  { rank: 3, title: "1986 Fleer Jordan Rookie", views: "140,885", value: "$5,000", img: "🏀" },
  { rank: 4, title: "Rickey Henderson Rookie", views: "100,127", value: "$2,100", img: "⚾" },
  { rank: 5, title: "DareDevil 1st Electra", views: "54,145", value: "$3,500", img: "🎯" },
];

const TRADERS = [
  { rank: 1, name: "PT Collector 2", rating: "5.0", trades: 12 },
  { rank: 2, name: "Administrator", rating: "4.8", trades: 8 },
];

// ─── OPTION 1: Clean white card sidebar + dark gradient ranking panels ────────
function Option1Sidebar() {
  return (
    <div className="w-[200px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-900 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Subscriber Tools</p>
        <p className="text-[10px] text-indigo-300 mt-0.5">Sign in to access your tools</p>
      </div>
      <div className="divide-y divide-gray-100">
        {TOOLS.map((t, i) => (
          <button key={i} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 transition text-sm font-medium text-gray-700">
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">📅 Conventions</p>
        <p className="text-xs text-gray-400">Coming soon</p>
      </div>
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">📦 Shipping Supplies</p>
        <p className="text-xs text-gray-400">Coming soon</p>
      </div>
    </div>
  );
}

function Option1Rankings() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {["Top 10 Most Viewed", "Top 10 Most Favorited", "Top 10 Rated Traders", "Top 10 Highest Values"].map((title, i) => (
        <div key={i} className="bg-gradient-to-b from-[#1c2468] to-[#0b0a22] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">{title}</p>
          </div>
          <div className="divide-y divide-white/5">
            {(i === 2 ? TRADERS : RANKINGS).map((item: any, j) => (
              <div key={j} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition cursor-pointer">
                <span className="text-lg w-7 text-center">{j === 0 ? "🥇" : j === 1 ? "🥈" : j === 2 ? "🥉" : `${j + 1}`}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{i === 2 ? item.name : item.title}</p>
                  <p className="text-[10px] text-white/40">{i === 0 ? `👁 ${item.views}` : i === 1 ? `❤️ ${j + 1}` : i === 2 ? `⭐ ${item.rating}` : item.value}</p>
                </div>
                <span className="text-white/30 text-sm">›</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-white/10 text-center">
            <a href="#" className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300 hover:text-white transition">View All Rankings →</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── OPTION 2: Teal accent sidebar + horizontal card ranking strip ────────────
function Option2Sidebar() {
  return (
    <div className="w-[200px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-teal-700 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-100">Member Tools</p>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {TOOLS.map((t, i) => (
          <button key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl border border-gray-100 hover:border-teal-300 hover:bg-teal-50 transition text-center">
            <span className="text-xl">{t.icon}</span>
            <span className="text-[10px] font-semibold text-gray-600 leading-tight">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-gray-100 p-3 space-y-2">
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">📅 Conventions</p>
          <p className="text-[10px] text-gray-400 mt-1">Coming soon</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">📦 Supplies</p>
          <p className="text-[10px] text-gray-400 mt-1">Coming soon</p>
        </div>
      </div>
    </div>
  );
}

function Option2Rankings() {
  const sections = [
    { title: "Most Viewed", color: "bg-blue-900", items: RANKINGS },
    { title: "Most Favorited", color: "bg-purple-900", items: RANKINGS },
    { title: "Top Traders", color: "bg-emerald-900", items: TRADERS },
    { title: "Highest Values", color: "bg-amber-900", items: RANKINGS },
  ];
  return (
    <div className="grid grid-cols-4 gap-4">
      {sections.map((s, i) => (
        <div key={i} className={`${s.color} rounded-2xl overflow-hidden`}>
          <div className="px-4 py-3">
            <p className="text-sm font-bold uppercase tracking-widest text-white">{s.title}</p>
          </div>
          <div className="px-3 pb-3 space-y-1">
            {s.items.map((item: any, j) => (
              <div key={j} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 hover:bg-white/20 transition cursor-pointer">
                <span className="text-base">{j === 0 ? "🥇" : j === 1 ? "🥈" : j === 2 ? "🥉" : `${j + 1}`}</span>
                <p className="text-xs text-white flex-1 truncate">{i === 2 ? item.name : item.title}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 text-center">
            <a href="#" className="text-[10px] font-semibold uppercase tracking-widest text-white/60 hover:text-white transition">View All →</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── OPTION 3: Minimal sidebar (icon-only) + full-width ranking table ─────────
function Option3Sidebar() {
  return (
    <div className="w-[64px] flex-shrink-0 bg-gray-900 rounded-2xl overflow-hidden flex flex-col items-center py-3 gap-1">
      <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mb-2 rotate-0">Tools</p>
      {TOOLS.map((t, i) => (
        <button key={i} title={t.label} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-xl">
          {t.icon}
        </button>
      ))}
      <div className="mt-auto pt-3 border-t border-white/10 w-full flex flex-col items-center gap-1">
        <button title="Upcoming Conventions" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-xl">📅</button>
        <button title="Shipping Supplies" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-xl">🚚</button>
      </div>
    </div>
  );
}

function Option3Rankings() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {["Top 10 Most Viewed", "Top 10 Highest Values"].map((title, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-widest text-gray-800">{title}</p>
              <a href="#" className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700">View All →</a>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {RANKINGS.map((item, j) => (
                  <tr key={j} className={j % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-2 w-8 text-center font-bold text-gray-400">{j + 1}</td>
                    <td className="px-2 py-2 font-medium text-gray-800 truncate max-w-[180px]">{item.title}</td>
                    <td className="px-4 py-2 text-right text-gray-500 text-xs">{i === 0 ? item.views : item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {["Top 10 Most Favorited", "Top 10 Rated Traders"].map((title, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-widest text-gray-800">{title}</p>
              <a href="#" className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700">View All →</a>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {(i === 1 ? TRADERS : RANKINGS).map((item: any, j) => (
                  <tr key={j} className={j % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-2 w-8 text-center font-bold text-gray-400">{j + 1}</td>
                    <td className="px-2 py-2 font-medium text-gray-800 truncate max-w-[180px]">{i === 1 ? item.name : item.title}</td>
                    <td className="px-4 py-2 text-right text-gray-500 text-xs">{i === 1 ? `⭐ ${item.rating}` : `❤️ ${j + 1}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OPTION 4: Sidebar with section dividers + rankings as horizontal scroll ──
function Option4Sidebar() {
  const sections = [
    { heading: "My Account", items: [TOOLS[0], TOOLS[3]] },
    { heading: "Community", items: [TOOLS[1], TOOLS[2], TOOLS[4], TOOLS[5]] },
    { heading: "Resources", items: [{ icon: "📅", label: "Conventions" }, { icon: "📦", label: "Shipping Supplies" }] },
  ];
  return (
    <div className="w-[200px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {sections.map((s, i) => (
        <div key={i} className={i > 0 ? "border-t border-gray-100" : ""}>
          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.heading}</p>
          {s.items.map((t, j) => (
            <button key={j} className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition text-sm font-medium text-gray-700">
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function Option4Rankings() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { title: "Most Viewed", emoji: "👁️", color: "from-blue-800 to-blue-950", items: RANKINGS },
        { title: "Most Favorited", emoji: "❤️", color: "from-pink-800 to-pink-950", items: RANKINGS },
        { title: "Top Traders", emoji: "⭐", color: "from-emerald-800 to-emerald-950", items: TRADERS },
        { title: "Highest Values", emoji: "💰", color: "from-amber-700 to-amber-950", items: RANKINGS },
      ].map((s, i) => (
        <div key={i} className={`bg-gradient-to-b ${s.color} rounded-2xl overflow-hidden`}>
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <span className="text-2xl">{s.emoji}</span>
            <p className="text-xs font-bold uppercase tracking-widest text-white/90 leading-tight">{s.title}</p>
          </div>
          <div className="px-3 pb-3 space-y-1.5">
            {s.items.map((item: any, j) => (
              <div key={j} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer">
                <span className="text-sm w-5 text-center">{j === 0 ? "🥇" : j === 1 ? "🥈" : j === 2 ? "🥉" : `${j + 1}`}</span>
                <p className="text-[11px] text-white/90 flex-1 truncate">{i === 2 ? item.name : item.title}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-white/10 text-center">
            <a href="#" className="text-[10px] font-semibold text-white/50 hover:text-white transition uppercase tracking-widest">View All →</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── OPTION 5: Sidebar with avatar/sign-in prompt + rankings as 2x2 grid ─────
function Option5Sidebar() {
  return (
    <div className="w-[200px] flex-shrink-0 space-y-3">
      <div className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-2xl p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 text-2xl">👤</div>
        <p className="text-xs font-bold text-white">Sign in to trade</p>
        <p className="text-[10px] text-white/60 mt-0.5">Access all collector tools</p>
        <button className="mt-3 w-full bg-white text-indigo-900 text-xs font-bold py-2 rounded-full hover:bg-indigo-50 transition">Sign In</button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Quick Links</p>
        {TOOLS.map((t, i) => (
          <button key={i} className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition text-xs font-medium text-gray-700 border-t border-gray-50">
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 space-y-2">
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">📅 Conventions</p>
          <p className="text-[10px] text-indigo-400 mt-1">Coming soon</p>
        </div>
        <div className="rounded-xl bg-teal-50 border border-teal-100 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">📦 Supplies</p>
          <p className="text-[10px] text-teal-400 mt-1">Coming soon</p>
        </div>
      </div>
    </div>
  );
}

function Option5Rankings() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { title: "Top 10 Most Viewed", emoji: "👁️", items: RANKINGS, metric: (item: any) => item.views },
        { title: "Top 10 Highest Values", emoji: "💰", items: RANKINGS, metric: (item: any) => item.value },
        { title: "Top 10 Most Favorited", emoji: "❤️", items: RANKINGS, metric: (_: any, j: number) => `${j + 1} saves` },
        { title: "Top 10 Rated Traders", emoji: "⭐", items: TRADERS, metric: (item: any) => `${item.rating} ★` },
      ].map((s, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-lg">{s.emoji}</span>
              <p className="text-sm font-bold uppercase tracking-widest text-gray-800">{s.title}</p>
            </div>
            <a href="#" className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 whitespace-nowrap">View All →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {s.items.map((item: any, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition cursor-pointer">
                <span className="text-base w-6 text-center">{j === 0 ? "🥇" : j === 1 ? "🥈" : j === 2 ? "🥉" : <span className="text-xs font-bold text-gray-400">{j + 1}</span>}</span>
                <p className="text-sm text-gray-800 flex-1 truncate">{i === 3 ? item.name : item.title}</p>
                <p className="text-xs text-gray-400 whitespace-nowrap">{s.metric(item, j)}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const OPTIONS = [
  {
    id: 1,
    title: "Option 1 — Dark sidebar + 4-column dark ranking panels",
    desc: "Sidebar uses an indigo header with clean list items. Rankings stay in the existing 4-column dark gradient layout but with improved spacing and typography.",
    Sidebar: Option1Sidebar,
    Rankings: Option1Rankings,
  },
  {
    id: 2,
    title: "Option 2 — Teal icon-grid sidebar + colored column panels",
    desc: "Sidebar tools displayed as a 2×3 icon grid with teal accents. Each ranking column gets its own distinct color (blue, purple, green, amber).",
    Sidebar: Option2Sidebar,
    Rankings: Option2Rankings,
  },
  {
    id: 3,
    title: "Option 3 — Collapsed icon-only sidebar + white zebra ranking tables",
    desc: "Sidebar collapses to a narrow icon strip to maximize content width. Rankings become clean white tables with zebra rows — easy to scan.",
    Sidebar: Option3Sidebar,
    Rankings: Option3Rankings,
  },
  {
    id: 4,
    title: "Option 4 — Grouped sidebar + gradient ranking columns with emoji headers",
    desc: "Sidebar tools are grouped into sections (My Account, Community, Resources). Rankings use gradient columns with large emoji headers for each category.",
    Sidebar: Option4Sidebar,
    Rankings: Option4Rankings,
  },
  {
    id: 5,
    title: "Option 5 — Sign-in card sidebar + 2×2 white ranking grid",
    desc: "Sidebar leads with a prominent sign-in card, then quick links below. Rankings switch from 4 columns to a 2×2 grid of white cards — more breathing room per section.",
    Sidebar: Option5Sidebar,
    Rankings: Option5Rankings,
  },
];

export default function HomepageLayoutMockups() {
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Homepage Layout Mockups</h1>
          <p className="mt-2 text-gray-500">5 design options for the left sidebar and below-carousel ranking sections.</p>
        </div>

        <div className="space-y-16">
          {OPTIONS.map((opt) => (
            <div key={opt.id}>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">{opt.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{opt.desc}</p>
              </div>

              {/* Sidebar + Rankings preview */}
              <div className="bg-[#e8e0d0] rounded-2xl p-6 space-y-6">
                {/* Sidebar + carousel placeholder row */}
                <div className="flex gap-4">
                  <opt.Sidebar />
                  <div className="flex-1 bg-white/60 rounded-2xl border border-white/40 flex items-center justify-center min-h-[200px]">
                    <p className="text-gray-400 text-sm font-medium">← Recently Added Carousel (unchanged)</p>
                  </div>
                </div>
                {/* Rankings below */}
                <opt.Rankings />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-sm text-blue-700 font-medium">
            Temporary preview page. Tell me which option (or combination) you prefer and I'll implement it.
          </p>
        </div>
      </div>
    </div>
  );
}
