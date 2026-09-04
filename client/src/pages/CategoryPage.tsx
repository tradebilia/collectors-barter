import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FilterInput } from "@/components/FilterInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { getCategoryPaginationState } from "@shared/categoryPagination";
import {
  TRADEBILIA_LOGO_URL,
  formatGrade,
  formatItemValue,
  getTradebiliaCategoryBenchmark,
  getTradebiliaCategoryLabel,
  getTradebiliaCategoryTheme,
  tradebiliaCategories,
  tradebiliaConditionOptions,
  type TradebiliaCategorySlug,
} from "@/lib/tradebilia";
import { ArrowRight, Heart, Loader2, MapPin, MessageSquareText, Search, ShieldCheck, Sparkles, Star, Trophy } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";
import { getGradingCompanyNamesForCategory, getValidGradesForCompany, getGradingCompanyByName } from "@shared/gradingCompanyConfig";
import { getDisplayedGradingCompany } from "@/lib/gradingDisplay";
import {
  autographsMediumOptions,
  countryOptions,
  moviesFormatOptions,
  pokemonRarityOptions,
  videoGameRegionOptions,
  videoGameSystemOptions,
  yesNoOptions,
} from "@/lib/filterOptions";

const categoryFilterPresets: Record<TradebiliaCategorySlug, Array<{ label: string; placeholder: string; type?: "select" | "input" }>> = {
  comics: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Title", placeholder: "Amazing Fantasy, X-Men" },
    { label: "Issue Number", placeholder: "#1, #100, #50" },
    { label: "Grading service", placeholder: "Select grading service", type: "select" },
    { label: "Grade", placeholder: "Enter grade (e.g., 9.5)", type: "input" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
    { label: "Signed", placeholder: "Select option", type: "select" },
    { label: "Facsimile", placeholder: "Select option", type: "select" },
    { label: "Publisher", placeholder: "Marvel, DC, Image" },
    { label: "Year", placeholder: "1963, 1986" },
  ],
  sports_cards: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Manufacturer", placeholder: "Topps, Fleer, Upper Deck" },
    { label: "Sport", placeholder: "Select a sport", type: "select" as const },
    { label: "Grading service", placeholder: "Select a grading service", type: "select" as const },
    { label: "Year / era", placeholder: "1950s, 1986, junk wax, ultra-modern" },
    { label: "Team", placeholder: "Yankees, Bulls, Cowboys" },
    { label: "Set / series", placeholder: "Topps Chrome, Prizm, Fleer" },
    { label: "Grade", placeholder: "Enter grade (e.g., 9.5)", type: "input" as const },
    { label: "Value Range", placeholder: "Min - Max", type: "input" as const },
    { label: "Rookie", placeholder: "Select option", type: "select" as const },
    { label: "Autographed", placeholder: "Select option", type: "select" as const },
  ],
  vintage_toys: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Grading service", placeholder: "AFA, CAS, VGA", type: "select" },
    { label: "Franchise", placeholder: "Star Wars, TMNT" },
    { label: "Brand", placeholder: "Kenner, Mattel, Hasbro" },
    { label: "Year", placeholder: "1978, 1984" },
    { label: "Grade", placeholder: "Enter grade (e.g., 85)", type: "input" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
  ],
  video_games: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "System", placeholder: "NES, SNES, Sega", type: "select" },
    { label: "Region", placeholder: "United States, Japan", type: "select" },
    { label: "Grading company", placeholder: "WATA, VGA, UKG", type: "select" },
    { label: "Year", placeholder: "1985, 2001" },
    { label: "Grade", placeholder: "Enter grade (e.g., 9.0)", type: "input" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
  ],
  stamps: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Year", placeholder: "1918" },
    { label: "Issuer", placeholder: "Post office or monarchy" },
    { label: "Country", placeholder: "United States, Bermuda", type: "select" },
    { label: "Grading company", placeholder: "PSE, PMG, SCI", type: "select" },
    { label: "Scott Number", placeholder: "572, C3, 10" },
    { label: "Mint / Used", placeholder: "Mint, Used, CTO" },
    { label: "Stamp Grade", placeholder: "MNH, VF, XF" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
  ],
  coins: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Year", placeholder: "1909, 1933, 1794" },
    { label: "Denomination", placeholder: "Cent, dollar, eagle" },
    { label: "Mint mark", placeholder: "S, D, CC" },
    { label: "Grading service", placeholder: "PCGS, NGC", type: "select" },
    { label: "Country", placeholder: "United States, Canada", type: "select" },
    { label: "Grade", placeholder: "Enter grade (e.g., MS 65)", type: "input" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
  ],
  pokemon: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Set", placeholder: "Base Set, Neo, Evolving Skies" },
    { label: "Rarity", placeholder: "Holo, Secret Rare", type: "select" },
    { label: "Grading service", placeholder: "PSA, CGC, BGS", type: "select" },
    { label: "Year", placeholder: "1999, 2024" },
    { label: "Edition / Era", placeholder: "1st Edition, Shadowless" },
    { label: "Finish / Variant", placeholder: "Holo, Reverse Holo" },
    { label: "Grade", placeholder: "Enter grade (e.g., 10)", type: "input" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
  ],
  movies: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Format", placeholder: "Poster, prop, lobby card", type: "select" },
    { label: "Franchise", placeholder: "Marvel, Disney, horror" },
    { label: "Certification", placeholder: "PSA, Beckett, BAS", type: "select" },
    { label: "Year", placeholder: "1977, 1999" },
    { label: "Region", placeholder: "United States, Japan", type: "select" },
    { label: "Grade", placeholder: "Enter grade (e.g., 9.4)", type: "input" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
  ],
  autographs: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Medium", placeholder: "Photo, comic, baseball", type: "select" },
    { label: "Authentication", placeholder: "JSA, PSA/DNA, BAS", type: "select" },
    { label: "Franchise", placeholder: "Marvel, MLB, Disney" },
    { label: "Signer", placeholder: "Name of signer" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
  ],
  disney_pins: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Park or event", placeholder: "D23, EPCOT, Disneyland" },
    { label: "Series", placeholder: "Character, attraction" },
    { label: "Edition", placeholder: "LE 300, LE 1000" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
  ],
};

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title" },
];

const categoryHeroBackgroundUrls: Record<TradebiliaCategorySlug, string> = {
  autographs: "https://assets.tradebilia.com/AutoBackground_a5b49e15.png",
  coins: "https://assets.tradebilia.com/CoinsBackground_cea1e610.png",
  comics: "https://assets.tradebilia.com/ComicsBackground_80eb606d.webp",
  disney_pins: "https://assets.tradebilia.com/DisneyPinsBackground_cfc008bc.webp",
  movies: "https://assets.tradebilia.com/MoviesBackground_8ecc4916.png",
  pokemon: "https://assets.tradebilia.com/PokemonBackground_bce9fc91.webp",
  sports_cards: "https://assets.tradebilia.com/SportsCardBackground_06cd6816.webp",
  stamps: "https://assets.tradebilia.com/StampsBackground_580a838e.png",
  video_games: "https://assets.tradebilia.com/VideoGamesBackground_abb6b532.webp",
  vintage_toys: "https://assets.tradebilia.com/VintageToysBackground_46983e1a.png",
};

const categoryHeroTitleUrls: Record<TradebiliaCategorySlug, string> = {
  autographs: "https://assets.tradebilia.com/AutographsTitle_32ad8e27.png",
  coins: "https://assets.tradebilia.com/CoinsTitle_04674a85.webp",
  comics: "https://assets.tradebilia.com/ComicsTitle_74805d30.png",
  disney_pins: "https://assets.tradebilia.com/DisneyPinsTitle_fcaa6baf.png",
  movies: "https://assets.tradebilia.com/MoviesTitle_86dfcc85.png",
  pokemon: "https://assets.tradebilia.com/PokemonTitle_7345573b.png",
  sports_cards: "https://assets.tradebilia.com/SportsCardsTitle_5d9af601.png",
  stamps: "https://assets.tradebilia.com/StampsTitle_e766d861.webp",
  video_games: "https://assets.tradebilia.com/VideoGamesTitle_7dc7fe49.webp",
  vintage_toys: "https://assets.tradebilia.com/VintageToysTitle_d0af50b4.png",
};

const categoryHeroTitleStyles: Record<TradebiliaCategorySlug, CSSProperties> = {
  autographs: { maxHeight: "300px", width: "auto", objectFit: "contain", marginBottom: "30px", transform: "translateY(-100px)", marginLeft: "-25px" },
  coins: { maxHeight: "225px", width: "auto", objectFit: "contain", marginBottom: "30px", transform: "translateY(-75px)", marginLeft: "-15px" },
  comics: { maxHeight: "300px", width: "auto", objectFit: "contain", marginBottom: "-40px" },
  disney_pins: { maxHeight: "475px", width: "auto", objectFit: "contain", marginBottom: "30px", marginTop: "130px" },
  movies: { maxHeight: "250px", width: "auto", objectFit: "contain", marginBottom: "30px", transform: "translateY(-95px)" },
  pokemon: { maxHeight: "380px", maxWidth: "90%", width: "auto", objectFit: "contain", marginBottom: "30px", transform: "translateY(15px)" },
  sports_cards: { maxHeight: "300px", width: "auto", objectFit: "contain", marginBottom: "30px", transform: "translateY(-100px)", marginLeft: "-15px" },
  stamps: { maxHeight: "200px", width: "auto", objectFit: "contain", marginBottom: "30px", transform: "translateY(10px)" },
  video_games: { maxHeight: "550px", width: "auto", objectFit: "contain", marginBottom: "30px", transform: "translateY(-200px)" },
  vintage_toys: { maxHeight: "550px", width: "auto", objectFit: "contain", marginBottom: "30px", transform: "translateY(-200px)" },
};

// Helper function to get category-specific font
const getCategoryFont = (slug: TradebiliaCategorySlug): string => {
  const fontMap: Record<TradebiliaCategorySlug, string> = {
    sports_cards: "'Righteous', sans-serif",
    comics: "'Comic Sans MS', cursive",
    vintage_toys: "'Fredoka One', sans-serif",
    video_games: "'Orbitron', sans-serif",
    stamps: "'Playfair Display', serif",
    coins: "'Cinzel', serif",
    pokemon: "'Pokemon', sans-serif",
    movies: "'Bebas Neue', sans-serif",
    autographs: "'Brush Script MT', cursive",
    disney_pins: "'Disney', sans-serif",
  };
  return fontMap[slug] || "'Righteous', sans-serif";
};


const sportsList = [
  "Baseball",
  "Basketball",
  "Football",
  "Hockey",
  "Soccer",
  "Tennis",
  "Golf",
  "Boxing",
  "MMA",
  "Wrestling",
  "Track & Field",
  "Swimming",
  "Cycling",
  "Motorsports",
  "Other",
];

// Get grading companies for each category from the shared configuration
const gradingServicesByCategory: Record<TradebiliaCategorySlug, string[]> = {
  comics: getGradingCompanyNamesForCategory("comics"),
  sports_cards: getGradingCompanyNamesForCategory("sports_cards"),
  vintage_toys: getGradingCompanyNamesForCategory("vintage_toys"),
  video_games: getGradingCompanyNamesForCategory("video_games"),
  stamps: getGradingCompanyNamesForCategory("stamps"),
  coins: getGradingCompanyNamesForCategory("coins"),
  pokemon: getGradingCompanyNamesForCategory("pokemon"),
  movies: getGradingCompanyNamesForCategory("movies"),
  autographs: getGradingCompanyNamesForCategory("autographs"),
  disney_pins: getGradingCompanyNamesForCategory("disney_pins"),
};

const gradingServicesList = ["Raw"];

// Grade options will be dynamically determined based on selected grading company
// This is a fallback for when no company is selected
const defaultGradeOptions = Array.from({ length: 11 }, (_, i) => ({ value: i.toString(), label: i.toString() }));

// Dropdown options are synced with the inventory form's field definitions.
// See client/src/lib/filterOptions.ts — the single source of truth.
const rookieOptions = yesNoOptions;
const autographedOptions = yesNoOptions;
const signedOptions = yesNoOptions;
const facsimileOptions = yesNoOptions;
const rarityOptions = pokemonRarityOptions;
// videoGameSystemOptions, videoGameRegionOptions, moviesFormatOptions,
// autographsMediumOptions and countryOptions are imported from filterOptions.ts

export default function CategoryPage() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug as TradebiliaCategorySlug | undefined;
  const theme = getTradebiliaCategoryTheme(slug ?? "");
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [keyword, setKeyword] = useState("");
  const [condition, setCondition] = useState<(typeof tradebiliaConditionOptions)[number]["value"] | undefined>(undefined);
  const [sportsCardsConditionText, setSportsCardsConditionText] = useState("");
  const [sortBy, setSortBy] = useState("best_match");
  const [locationSortNotice, setLocationSortNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [resultsPerPage, setResultsPerPage] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);
  // verifiedMerchantsOnly is now an instant-apply chip above the results grid.
  // It writes directly to submittedFilters and does not need a local mirror state.
  const [proposalListingId, setProposalListingId] = useState<number | null>(null);
  const [proposalNote, setProposalNote] = useState("");
  
  // Additional filter state variables
  const [issueNumber, setIssueNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [year, setYear] = useState("");
  const [team, setTeam] = useState("");
  const [series, setSeries] = useState("");
  const [sport, setSport] = useState<string | undefined>(undefined);
  const [gradingService, setGradingService] = useState<string | undefined>(undefined);
  const [grade, setGrade] = useState<string | undefined>(undefined);
  const [valueMin, setValueMin] = useState<number | undefined>(undefined);
  const [valueMax, setValueMax] = useState<number | undefined>(undefined);
  const [rookie, setRookie] = useState<string | undefined>(undefined);
  const [autographed, setAutographed] = useState<string | undefined>(undefined);
  const [signed, setSigned] = useState<string | undefined>(undefined);
  const [facsimile, setFacsimile] = useState<string | undefined>(undefined);
  const [rarity, setRarity] = useState<string | undefined>(undefined);
  // Dedicated per-filter state (each filter owns its own channel — no shared state)
  const [titleFilter, setTitleFilter] = useState("");
  const [system, setSystem] = useState<string | undefined>(undefined);
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<string | undefined>(undefined);
  const [medium, setMedium] = useState<string | undefined>(undefined);
  const [denomination, setDenomination] = useState("");
  const [mintMark, setMintMark] = useState("");
  const [issuer, setIssuer] = useState("");
  const [edition, setEdition] = useState("");
  const [parkOrEvent, setParkOrEvent] = useState("");
  const [franchise, setFranchise] = useState("");
  const [publisher, setPublisher] = useState("");
  const [brand, setBrand] = useState("");
  const [scottNumber, setScottNumber] = useState("");
  const [mintOrUsed, setMintOrUsed] = useState("");
  const [stampGrade, setStampGrade] = useState("");
  const [editionEra, setEditionEra] = useState("");
  const [finishVariant, setFinishVariant] = useState("");
  const [signer, setSigner] = useState("");
  const [distanceMiles, setDistanceMiles] = useState<number | undefined>(undefined);

  // Submitted filters state (only updates when user submits search)
  const [submittedFilters, setSubmittedFilters] = useState({
    keyword: "",
    condition: undefined as 'mint' | 'near_mint' | 'very_good' | 'good' | 'fair' | 'poor' | undefined,
    issueNumber: undefined as string | undefined,
    manufacturer: undefined as string | undefined,
    year: undefined as string | undefined,
    team: undefined as string | undefined,
    series: undefined as string | undefined,
    sport: undefined as string | undefined,
    gradingService: undefined as string | undefined,
    grade: undefined as string | undefined,
    valueMin: undefined as number | undefined,
    valueMax: undefined as number | undefined,
    rookie: undefined as string | undefined,
    autographed: undefined as string | undefined,
    signed: undefined as string | undefined,
    facsimile: undefined as string | undefined,
    rarity: undefined as string | undefined,
    title: undefined as string | undefined,
    system: undefined as string | undefined,
    region: undefined as string | undefined,
    country: undefined as string | undefined,
    format: undefined as string | undefined,
    medium: undefined as string | undefined,
    denomination: undefined as string | undefined,
    mintMark: undefined as string | undefined,
    issuer: undefined as string | undefined,
    edition: undefined as string | undefined,
    parkOrEvent: undefined as string | undefined,
    franchise: undefined as string | undefined,
    publisher: undefined as string | undefined,
    brand: undefined as string | undefined,
    scottNumber: undefined as string | undefined,
    mintOrUsed: undefined as string | undefined,
    stampGrade: undefined as string | undefined,
    editionEra: undefined as string | undefined,
    finishVariant: undefined as string | undefined,
    signer: undefined as string | undefined,
    distanceMiles: undefined as number | undefined,
    verifiedMerchantsOnly: false,
  });

  // Reset filters when category slug changes
  useEffect(() => {
    // Reset all text input filters
    setKeyword("");
    setIssueNumber("");
    setManufacturer("");
    setYear("");
    setTeam("");
    setSeries("");
    setSportsCardsConditionText("");
    
    // Reset all dropdown filters to undefined (which displays as "All")
    setCondition(undefined);
    setSport(undefined);
    setGradingService(undefined);
    setGrade(undefined);
    setRookie(undefined);
    setAutographed(undefined);
    setSigned(undefined);
    setFacsimile(undefined);
    setRarity(undefined);
    
    // Reset dedicated per-filter state
    setTitleFilter("");
    setSystem(undefined);
    setRegion(undefined);
    setCountry(undefined);
    setFormat(undefined);
    setMedium(undefined);
    setDenomination("");
    setMintMark("");
    setIssuer("");
    setEdition("");
    setParkOrEvent("");
    setFranchise("");
    setPublisher("");
    setBrand("");
    setScottNumber("");
    setMintOrUsed("");
    setEditionEra("");
    setFinishVariant("");
    setSigner("");
    
    // Reset numeric range filters
    setValueMin(undefined);
    setValueMax(undefined);
    
    // Reset submitted filters
    setSubmittedFilters({
      keyword: "",
      verifiedMerchantsOnly: false,
      condition: undefined,
      issueNumber: undefined,
      manufacturer: undefined,
      year: undefined,
      team: undefined,
      series: undefined,
      sport: undefined,
      gradingService: undefined,
      grade: undefined,
      valueMin: undefined,
      valueMax: undefined,
      rookie: undefined,
      autographed: undefined,
      signed: undefined,
      facsimile: undefined,
      rarity: undefined,
      title: undefined,
      system: undefined,
      region: undefined,
      country: undefined,
      format: undefined,
      medium: undefined,
      denomination: undefined,
      mintMark: undefined,
      issuer: undefined,
      edition: undefined,
      parkOrEvent: undefined,
      franchise: undefined,
      publisher: undefined,
      brand: undefined,
      scottNumber: undefined,
      mintOrUsed: undefined,
      stampGrade: undefined,
      editionEra: undefined,
      finishVariant: undefined,
      signer: undefined,
      distanceMiles: undefined,
    });
    
    // Reset pagination
    setDistanceMiles(undefined);
    setStampGrade("");
    setCurrentPage(1);
  }, [slug]);

  // Memoize the query input to ensure proper refetch detection
  // IMPORTANT: only include filters that actually have a value. Sending every key
  // (with most set to `undefined`) makes superjson encode 28 explicit "undefined"
  // entries into the batched GET URL. That pushed the combined batch past
  // httpBatchLink's maxURLLength (2000), which silently downgrades the request to a
  // POST — and tRPC rejects POST on *query* procedures with 405 METHOD_NOT_SUPPORTED,
  // so the feed never resolved and every category page rendered "0 results".
  const queryInput = useMemo(() => {
    if (!slug) return undefined;

    const input: Record<string, unknown> = { category: slug };

    const add = (key: string, value: unknown) => {
      if (value === undefined || value === null || value === "") return;
      input[key] = value;
    };

    add("keyword", submittedFilters.keyword);
    add("condition", submittedFilters.condition);
    add("issueNumber", submittedFilters.issueNumber);
    add("manufacturer", submittedFilters.manufacturer);
    add("year", submittedFilters.year);
    add("team", submittedFilters.team);
    add("series", submittedFilters.series);
    add("sport", submittedFilters.sport);
    add("gradingService", submittedFilters.gradingService);
    add("grade", submittedFilters.grade);
    add("valueMin", submittedFilters.valueMin);
    add("valueMax", submittedFilters.valueMax);
    add("rookie", submittedFilters.rookie);
    add("autographed", submittedFilters.autographed);
    add("signed", submittedFilters.signed);
    add("facsimile", submittedFilters.facsimile);
    add("rarity", submittedFilters.rarity);
    add("title", submittedFilters.title);
    add("system", submittedFilters.system);
    add("region", submittedFilters.region);
    add("country", submittedFilters.country);
    add("format", submittedFilters.format);
    add("medium", submittedFilters.medium);
    add("denomination", submittedFilters.denomination);
    add("mintMark", submittedFilters.mintMark);
    add("issuer", submittedFilters.issuer);
    add("edition", submittedFilters.edition);
    add("parkOrEvent", submittedFilters.parkOrEvent);
    add("franchise", submittedFilters.franchise);
    add("publisher", submittedFilters.publisher);
    add("brand", submittedFilters.brand);
    add("scottNumber", submittedFilters.scottNumber);
    add("mintOrUsed", submittedFilters.mintOrUsed);
    add("stampGrade", submittedFilters.stampGrade);
    add("editionEra", submittedFilters.editionEra);
    add("finishVariant", submittedFilters.finishVariant);
    add("signer", submittedFilters.signer);
    add("distanceMiles", submittedFilters.distanceMiles);
    if (submittedFilters.verifiedMerchantsOnly) {
      input.verifiedMerchantsOnly = true;
    }
    if (sortBy === "location") {
      input.locationSort = true;
    }

    return input as Parameters<typeof trpc.market.feed.useQuery>[0];
  }, [slug, sortBy, submittedFilters]);

  const feedQuery = trpc.market.feed.useQuery(
    queryInput,
    { enabled: Boolean(slug) },
  );

  useEffect(() => {
    if (sortBy !== "location" || feedQuery.isLoading || feedQuery.isFetching) return;

    if (feedQuery.data?.locationSort?.applied) {
      setLocationSortNotice("Sorted by proximity to your saved town.");
      return;
    }

    const messages = {
      sign_in_required: "Sign in to sort listings by proximity to your saved town.",
      saved_town_required: "Add your town to your Profile before using nearest-location sorting.",
      location_unavailable: "Nearest-location sorting is temporarily unavailable. Showing Best Match instead.",
    } as const;
    setLocationSortNotice(messages[feedQuery.data?.locationSort?.reason ?? "location_unavailable"]);
    setSortBy("best_match");
  }, [feedQuery.data?.locationSort?.applied, feedQuery.data?.locationSort?.reason, feedQuery.isFetching, feedQuery.isLoading, sortBy]);

  useEffect(() => {
    if (submittedFilters.distanceMiles === undefined || feedQuery.isLoading || feedQuery.isFetching || feedQuery.data?.distanceFilter?.applied) return;

    const messages = {
      sign_in_required: "Sign in to filter listings by distance from your saved town.",
      saved_town_required: "Add your town to your Profile before filtering by distance.",
      location_unavailable: "Distance filtering is temporarily unavailable. Showing all matching listings instead.",
    } as const;
    setLocationSortNotice(messages[feedQuery.data?.distanceFilter?.reason ?? "location_unavailable"]);
    setDistanceMiles(undefined);
    setSubmittedFilters(previous => ({ ...previous, distanceMiles: undefined }));
  }, [feedQuery.data?.distanceFilter?.applied, feedQuery.data?.distanceFilter?.reason, feedQuery.isFetching, feedQuery.isLoading, submittedFilters.distanceMiles]);

  // Handler to submit filters
  const handleSubmitFilters = () => {
    const newFilters = {
      keyword,
      condition,
      issueNumber: issueNumber || undefined,
      manufacturer: manufacturer || undefined,
      year: year || undefined,
      team: team || undefined,
      series: series || undefined,
      sport: sport || undefined,
      gradingService: gradingService || undefined,
      grade: grade || undefined,
      valueMin: valueMin ?? undefined,
      valueMax: valueMax ?? undefined,
      rookie: rookie || undefined,
      autographed: autographed || undefined,
      signed: signed || undefined,
      facsimile: facsimile || undefined,
      rarity: rarity || undefined,
      title: titleFilter || undefined,
      system: system || undefined,
      region: region || undefined,
      country: country || undefined,
      format: format || undefined,
      medium: medium || undefined,
      denomination: denomination || undefined,
      mintMark: mintMark || undefined,
      issuer: issuer || undefined,
      edition: edition || undefined,
      parkOrEvent: parkOrEvent || undefined,
      franchise: franchise || undefined,
      publisher: publisher || undefined,
      brand: brand || undefined,
      scottNumber: scottNumber || undefined,
      mintOrUsed: mintOrUsed || undefined,
      stampGrade: stampGrade || undefined,
      editionEra: editionEra || undefined,
      finishVariant: finishVariant || undefined,
      signer: signer || undefined,
      distanceMiles: distanceMiles ?? undefined,
      verifiedMerchantsOnly: false,
    };

    setSubmittedFilters(newFilters);
    setCurrentPage(1);
    setMobileFiltersOpen(false);
  };

  // Handler to clear all filters
  const handleClearFilters = () => {
    // Reset all text input filters
    setKeyword("");
    setIssueNumber("");
    setManufacturer("");
    setYear("");
    setTeam("");
    setSeries("");
    setSportsCardsConditionText("");
    
    // Reset all dropdown filters to undefined (which displays as "All")
    setCondition(undefined);
    setSport(undefined);
    setGradingService(undefined);
    setGrade(undefined);
    setRookie(undefined);
    setAutographed(undefined);
    setSigned(undefined);
    setFacsimile(undefined);
    setRarity(undefined);
    
    // Reset dedicated per-filter state
    setTitleFilter("");
    setSystem(undefined);
    setRegion(undefined);
    setCountry(undefined);
    setFormat(undefined);
    setMedium(undefined);
    setDenomination("");
    setMintMark("");
    setIssuer("");
    setEdition("");
    setParkOrEvent("");
    setFranchise("");
    setPublisher("");
    setBrand("");
    setScottNumber("");
    setMintOrUsed("");
    setEditionEra("");
    setFinishVariant("");
    setSigner("");
    
    // Reset numeric range filters
    setValueMin(undefined);
    setValueMax(undefined);
    
    setDistanceMiles(undefined);
    setStampGrade("");

    // Reset submitted filters to trigger query reset
    setSubmittedFilters({
      keyword: "",
      condition: undefined,
      issueNumber: undefined,
      manufacturer: undefined,
      year: undefined,
      team: undefined,
      series: undefined,
      sport: undefined,
      gradingService: undefined,
      grade: undefined,
      valueMin: undefined,
      valueMax: undefined,
      rookie: undefined,
      autographed: undefined,
      signed: undefined,
      facsimile: undefined,
      rarity: undefined,
      title: undefined,
      system: undefined,
      region: undefined,
      country: undefined,
      format: undefined,
      medium: undefined,
      denomination: undefined,
      mintMark: undefined,
      issuer: undefined,
      edition: undefined,
      parkOrEvent: undefined,
      franchise: undefined,
      publisher: undefined,
      brand: undefined,
      scottNumber: undefined,
      mintOrUsed: undefined,
      stampGrade: undefined,
      editionEra: undefined,
      finishVariant: undefined,
      signer: undefined,
      distanceMiles: undefined,
      verifiedMerchantsOnly: false,
    });
    setCurrentPage(1);
  };

  const createProposalMutation = trpc.market.createTradeProposal.useMutation({
    onSuccess: async () => {
      setProposalListingId(null);
      setProposalNote("");
      toast.success("Trade Proposal sent.");
      await utils.market.feed.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const watchlistMutation = trpc.market.toggleWatchlist.useMutation({
    onSuccess: async data => {
      toast.success(data.saved ? "Listing saved to Watchlist." : "Listing removed from Watchlist.");
      await utils.market.feed.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  // Get valid grades for currently selected grading company
  const validGradesForSelectedCompany = useMemo(() => {
    if (!gradingService || gradingService === "all") {
      return defaultGradeOptions;
    }
    const validGrades = getValidGradesForCompany(gradingService);
    return validGrades.map(grade => ({ value: grade, label: grade }));
  }, [gradingService]);

  const listings = useMemo(() => {
    const rows = [...(feedQuery.data?.listings ?? [])];
    if (sortBy === "title") return rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "newest") return rows.sort((a, b) => b.id - a.id);
    if (sortBy === "price_low_high") return rows.sort((a, b) => (Number(a.estimatedValue) || 0) - (Number(b.estimatedValue) || 0));
    if (sortBy === "price_high_low") return rows.sort((a, b) => (Number(b.estimatedValue) || 0) - (Number(a.estimatedValue) || 0));
    if (sortBy === "condition") {
      const conditionOrder: Record<string, number> = { mint: 0, near_mint: 1, excellent: 2, very_good: 3, good: 4, fair: 5, poor: 6 };
      return rows.sort((a, b) => (conditionOrder[a.condition ?? ''] ?? 99) - (conditionOrder[b.condition ?? ''] ?? 99));
    }
    if (sortBy === "grade") return rows.sort((a, b) => (parseFloat(String(b.grade)) || 0) - (parseFloat(String(a.grade)) || 0));
    if (sortBy === "location" && feedQuery.data?.locationSort?.applied) return rows;
    return rows.sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id);
  }, [feedQuery.data?.listings, sortBy]);

  const pagination = useMemo(
    () => getCategoryPaginationState(listings.length, currentPage, resultsPerPage),
    [currentPage, listings.length, resultsPerPage],
  );
  const pageListings = useMemo(
    () => listings.slice(pagination.startIndex, pagination.endIndex),
    [listings, pagination.endIndex, pagination.startIndex],
  );

  useEffect(() => {
    if (currentPage !== pagination.currentPage) {
      setCurrentPage(pagination.currentPage);
    }
  }, [currentPage, pagination.currentPage]);

  if (!slug || !theme) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-xl text-center">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-md" />
          <h1 className="mt-8 text-4xl font-semibold">Category not found.</h1>
          <p className="mt-4 text-base leading-8 text-white/70">Choose one of the Tradebilia exchange categories to continue browsing certified collectibles.</p>
          <Button asChild className="mt-8 rounded-full px-6">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const categoryLabel = getTradebiliaCategoryLabel(slug);
  const activeFilters = categoryFilterPresets[slug];
  const benchmark = getTradebiliaCategoryBenchmark(slug);
  const isSportsCardsPage = slug === "sports_cards";
  const benchmarkQuickFilters = benchmark?.quickFilters ?? [];
  const benchmarkSpotlights = (benchmark?.spotlights ?? []).map(card => ({
    ...card,
    imageUrl: resolveTradebiliaListingImage({ title: card.title, category: slug }),
  }));
  const SPORTS_CARDS_LONG_LOGO_URL = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg";

  return (
    <div className={`min-h-screen ${theme.pageClassName}`}>
      <style>{`
        @media (max-width: 639px) {
          .category-hero-title-shell-video_games,
          .category-hero-title-shell-vintage_toys {
            height: 156px !important;
            align-items: center !important;
            padding-top: 0 !important;
          }
          .category-hero-title-shell-video_games img,
          .category-hero-title-shell-vintage_toys img {
            max-height: 170px !important;
            max-width: 88vw !important;
            margin: 0 !important;
            transform: none !important;
          }
          .category-hero-divider-video_games,
          .category-hero-divider-vintage_toys {
            margin-top: 20px !important;
          }
          .category-hero-exchange-video_games,
          .category-hero-exchange-vintage_toys {
            margin-top: 16px !important;
            top: 0 !important;
          }
          .category-hero-exchange-comics,
          .category-hero-exchange-autographs {
            font-family: 'Righteous', sans-serif !important;
            font-style: normal !important;
          }
        }
      `}</style>
      <TopBar
        logoUrl={SPORTS_CARDS_LONG_LOGO_URL}
        searchPlaceholder={`Search ${getTradebiliaCategoryLabel(slug ?? '')}...`}
      />
      <header className={`relative overflow-hidden border-b ${theme.borderClassName} ${theme.heroClassName}`} style={{ minHeight: '400px' }}>
        <div className={`relative overflow-hidden ${theme.textureClassName}`} style={{
          backgroundImage: `url(${categoryHeroBackgroundUrls[slug]})`,
          backgroundSize: 'cover',
          backgroundPosition: slug === 'movies' ? 'center top' : 'center',
          backgroundAttachment: 'scroll',
          backgroundRepeat: 'no-repeat',
          height: '400px',
          filter: (slug === 'video_games' || slug === 'coins' || slug === 'stamps' || slug === 'vintage_toys' || slug === 'autographs' || slug === 'movies' || slug === 'comics' || slug === 'pokemon' || slug === 'disney_pins') ? 'contrast(1.2) saturate(1.1)' : 'none'
        }}>
          <div className={`absolute inset-0 ${slug === 'movies' ? 'bg-black/10' : 'bg-black/30'}`}></div>
          <div className="container relative py-6 lg:py-8 z-10">
            <div className="max-w-4xl mx-auto text-center">
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.36em] text-white" style={{ visibility: slug === "pokemon" ? "hidden" : "visible", position: "relative", top: "-24px", color: "#ffffff", opacity: 1 }}>{theme.eyebrow}</p>
              <div className="mt-3 leading-none" style={{ marginTop: "24px" }}>
                <h1 className={`category-hero-title-shell category-hero-title-shell-${slug} max-w-full mx-auto text-6xl sm:text-7xl lg:text-8xl`} style={{
                  fontFamily: getCategoryFont(slug),
                  fontWeight: 700,
                  color: "white",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                  lineHeight: "1",
                  height: "80px",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: slug === "pokemon" || slug === "disney_pins" ? "center" : slug === "stamps" ? "center" : slug === "comics" ? "center" : "flex-start",
                  justifyContent: "center",
                  paddingTop: slug === "pokemon" || slug === "disney_pins" ? "0" : slug === "comics" ? "-10px" : "20px",
                  position: "relative",
                  zIndex: 50
                }}>
                  <img
                    src={categoryHeroTitleUrls[slug]}
                    alt={categoryLabel}
                    style={categoryHeroTitleStyles[slug]}
                  />
                </h1>
                <div className={`category-hero-divider category-hero-divider-${slug} mt-8 h-px bg-white/50 mx-auto`} style={{ maxWidth: "100%", width: "100%", marginTop: "64px" }}></div>
                <p className={`category-hero-exchange category-hero-exchange-${slug} mt-8 text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-[0.1em]`} style={{
                  fontFamily: getCategoryFont(slug),
                  fontStyle: "italic",
                  color: "#F4D03F",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: "1",
                  marginTop: "48px",
                  position: "relative",
                  top: "-16px"
                }}>
                  EXCHANGE
                </p>
              </div>

            </div>
            {/* Horizontal Stats Section */}
            <div className="flex justify-center gap-6 flex-wrap mt-10 pt-8" style={{ position: "relative", top: "-60px" }}>
              {(() => {
                const totalMarketValue = listings.reduce((sum, listing) => {
                  const value = parseFloat(listing.estimatedValue?.toString() || "0");
                  return sum + (isNaN(value) ? 0 : value);
                }, 0);
                const formattedValue = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(totalMarketValue);
                return [
                  ["Listings", String(listings.length)],
                  ["Collectors", String(feedQuery.data?.highlights.activeCollectors ?? 0)],
                  ["Completed Trades", String(feedQuery.data?.highlights.completedTrades ?? 0)],
                  ["Total Market Value", formattedValue],
                ];
              })().map(([label, value]) => (
                <div key={label} className="rounded-[1rem] border border-white/15 bg-black/15 px-3 py-2 text-center backdrop-blur-sm">
                  <p className="text-[0.65rem] uppercase tracking-[0.3em]" style={{ color: '#ffffff', fontWeight: 600 }}>{label}</p>
                  <p className="mt-1 text-sm font-bold" style={{ color: '#ffffff' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </header>

      <CategoryBar />

      <main className="flex bg-transparent">
        {mobileFiltersOpen && (
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-40 bg-black/45 md:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          />
        )}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-xl md:hidden"
        >
          <Search className="h-4 w-4" />
          Filters
        </button>
        {/* Left sidebar filters */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[min(88vw,360px)] overflow-y-auto border-r border-current/10 bg-white p-4 shadow-2xl transition-transform duration-200 md:static md:z-auto md:block md:w-80 md:translate-x-0 md:bg-current/5 md:shadow-none ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"} ${theme.panelClassName}`}>
          <div className="flex items-center gap-2">
            <Search className={`h-4 w-4 ${theme.accentClassName}`} />
            <h2 className="text-lg font-semibold" style={{ fontFamily: theme.headingFont }}>Filters</h2>
            <Button variant="ghost" size="sm" className="ml-auto md:hidden" onClick={() => setMobileFiltersOpen(false)}>Close</Button>
          </div>

          <div className="mt-4 space-y-2">
            {activeFilters.map(filter => {
              if (isSportsCardsPage && ["Priority traits"].includes(filter.label)) {
                return null;
              }
              
              return (
                <div key={filter.label} className="space-y-0.5">
                  <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.16em]">{filter.label}</Label>
                  {filter.type === "select" ? (
                    <Select 
                      value={filter.label === "Sport" ? sport || "all" : 
                             filter.label === "Grading service" ? gradingService || "all" :
                             filter.label === "Grading company" ? gradingService || "all" :
                             filter.label === "Certification" ? gradingService || "all" :
                             filter.label === "Authentication" ? gradingService || "all" :
                             filter.label === "Grade" ? grade || "all" :
                             filter.label === "Rookie" ? rookie || "all" :
                             filter.label === "Autographed" ? autographed || "all" :
                             filter.label === "Signed" ? signed || "all" :
                              filter.label === "Facsimile" ? facsimile || "all" :
                              filter.label === "Rarity" ? rarity || "all" :
                              filter.label === "System" ? system || "all" :
                              filter.label === "Region" ? region || "all" :
                              filter.label === "Country" ? country || "all" :
                              filter.label === "Format" ? format || "all" :
                              filter.label === "Medium" ? medium || "all" : "all"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          if (filter.label === "Sport") setSport(undefined);
                          else if (filter.label === "Grading service") setGradingService(undefined);
                          else if (filter.label === "Grading company") setGradingService(undefined);
                          else if (filter.label === "Certification") setGradingService(undefined);
                          else if (filter.label === "Authentication") setGradingService(undefined);
                          else if (filter.label === "Grade") setGrade(undefined);
                          else if (filter.label === "Rookie") setRookie(undefined);
                          else if (filter.label === "Autographed") setAutographed(undefined);
                          else if (filter.label === "Signed") setSigned(undefined);
                           else if (filter.label === "Facsimile") setFacsimile(undefined);
                           else if (filter.label === "Rarity") setRarity(undefined);
                           else if (filter.label === "System") setSystem(undefined);
                           else if (filter.label === "Region") setRegion(undefined);
                           else if (filter.label === "Country") setCountry(undefined);
                           else if (filter.label === "Format") setFormat(undefined);
                           else if (filter.label === "Medium") setMedium(undefined);
                        } else {
                          if (filter.label === "Sport") setSport(value);
                          else if (filter.label === "Grading service") setGradingService(value);
                          else if (filter.label === "Grading company") setGradingService(value);
                          else if (filter.label === "Certification") setGradingService(value);
                          else if (filter.label === "Authentication") setGradingService(value);
                          else if (filter.label === "Grade") setGrade(value);
                          else if (filter.label === "Rookie") setRookie(value);
                          else if (filter.label === "Autographed") setAutographed(value);
                          else if (filter.label === "Signed") setSigned(value);
                           else if (filter.label === "Facsimile") setFacsimile(value);
                           else if (filter.label === "Rarity") setRarity(value);
                           else if (filter.label === "System") setSystem(value);
                           else if (filter.label === "Region") setRegion(value);
                           else if (filter.label === "Country") setCountry(value);
                           else if (filter.label === "Format") setFormat(value);
                           else if (filter.label === "Medium") setMedium(value);
                        }
                      }}
                    >
                      <SelectTrigger className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}>
                        <SelectValue placeholder={filter.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {filter.label === "Sport" && sportsList.map(sport => (
                          <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                        ))}
                        {filter.label === "Grading service" && slug && gradingServicesByCategory[slug]?.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        {filter.label === "Grading company" && slug && gradingServicesByCategory[slug]?.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        {filter.label === "Certification" && slug && gradingServicesByCategory[slug]?.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        {filter.label === "Authentication" && slug && gradingServicesByCategory[slug]?.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        {filter.label === "Grade" && validGradesForSelectedCompany.map(grade => (
                          <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>
                        ))}
                        {filter.label === "Rookie" && rookieOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Autographed" && autographedOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Signed" && signedOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Facsimile" && facsimileOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Rarity" && rarityOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "System" && videoGameSystemOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Region" && videoGameRegionOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Country" && countryOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Format" && moviesFormatOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Medium" && autographsMediumOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}

                      </SelectContent>
                    </Select>
                  ) : filter.label === "Value Range" ? (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Min" 
                        value={valueMin || ""}
                        onChange={(e) => setValueMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black flex-1`} 
                        type="number" 
                      />
                      <Input 
                        placeholder="Max" 
                        value={valueMax || ""}
                        onChange={(e) => setValueMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black flex-1`} 
                        type="number" 
                      />
                    </div>
                  ) : filter.label === "Grade" ? (
                    <Input 
                      placeholder={filter.placeholder} 
                      value={grade || ""}
                      onChange={(e) => setGrade(e.target.value || undefined)}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} 
                      type="text"
                    />
                  ) : filter.label === "Title" ? (
                    <FilterInput 
                      placeholder={filter.placeholder} 
                      value={titleFilter}
                      onChange={(e) => setTitleFilter(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} 
                    />
                  ) : filter.label === "Issue Number" ? (
                    <FilterInput 
                      placeholder={filter.placeholder} 
                      value={issueNumber}
                      onChange={(e) => setIssueNumber(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} 
                    />
                  ) : filter.label === "Manufacturer" ? (
                    <FilterInput 
                      placeholder={filter.placeholder} 
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} 
                    />
                  ) : filter.label === "Year / era" ? (
                    <FilterInput 
                      placeholder={filter.placeholder} 
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} 
                    />
                  ) : filter.label === "Team" ? (
                    <FilterInput 
                      placeholder={filter.placeholder} 
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} 
                    />
                  ) : filter.label === "Set / series" ? (
                    <FilterInput 
                      placeholder={filter.placeholder} 
                      value={series}
                      onChange={(e) => setSeries(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} 
                    />
                  ) : filter.label === "Name" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Franchise" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={franchise}
                      onChange={(e) => setFranchise(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Issuer" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Mint mark" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={mintMark}
                      onChange={(e) => setMintMark(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Pokémon" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Signer" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={signer}
                      onChange={(e) => setSigner(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Pin name" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Denomination" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={denomination}
                      onChange={(e) => setDenomination(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Series" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={franchise}
                      onChange={(e) => setFranchise(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Set" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={series}
                      onChange={(e) => setSeries(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Edition" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={edition}
                      onChange={(e) => setEdition(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Park or event" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={parkOrEvent}
                      onChange={(e) => setParkOrEvent(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : filter.label === "Publisher" ? (
                    <FilterInput placeholder={filter.placeholder} value={publisher} onChange={(e) => setPublisher(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()} className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} />
                  ) : filter.label === "Brand" ? (
                    <FilterInput placeholder={filter.placeholder} value={brand} onChange={(e) => setBrand(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()} className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} />
                  ) : filter.label === "Scott Number" ? (
                    <FilterInput placeholder={filter.placeholder} value={scottNumber} onChange={(e) => setScottNumber(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()} className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} />
                  ) : filter.label === "Mint / Used" ? (
                    <FilterInput placeholder={filter.placeholder} value={mintOrUsed} onChange={(e) => setMintOrUsed(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()} className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} />
                  ) : filter.label === "Stamp Grade" ? (
                    <FilterInput placeholder={filter.placeholder} value={stampGrade} onChange={(e) => setStampGrade(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()} className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} />
                  ) : filter.label === "Edition / Era" ? (
                    <FilterInput placeholder={filter.placeholder} value={editionEra} onChange={(e) => setEditionEra(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()} className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} />
                  ) : filter.label === "Finish / Variant" ? (
                    <FilterInput placeholder={filter.placeholder} value={finishVariant} onChange={(e) => setFinishVariant(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()} className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`} />
                  ) : filter.label === "Year" ? (
                    <FilterInput 
                      placeholder={filter.placeholder}
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  ) : (
                    <FilterInput
                      placeholder={filter.placeholder}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}
                      className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}
                    />
                  )
                }
                </div>
              );
            })}
            {!isSportsCardsPage && (
              <div className="space-y-0.5">
                <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.16em]">Condition</Label>
                <Select value={condition} onValueChange={value => setCondition(value as typeof condition)}>
                  <SelectTrigger className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}>
                    <SelectValue placeholder="All Conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradebiliaConditionOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-0.5">
              <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.16em]">Distance</Label>
              <Select
                value={distanceMiles ? String(distanceMiles) : "all"}
                onValueChange={value => setDistanceMiles(value === "all" ? undefined : Number(value))}
              >
                <SelectTrigger className={`h-8 ${isSportsCardsPage ? "bg-white/80" : "bg-white"} text-xs text-black`}>
                  <SelectValue placeholder="Any distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any distance</SelectItem>
                  <SelectItem value="10">Within 10 miles</SelectItem>
                  <SelectItem value="25">Within 25 miles</SelectItem>
                  <SelectItem value="50">Within 50 miles</SelectItem>
                  <SelectItem value="100">Within 100 miles</SelectItem>
                  <SelectItem value="250">Within 250 miles</SelectItem>
                  <SelectItem value="500">Within 500 miles</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[0.65rem] leading-4 opacity-70">Uses your saved town after Search or Enter.</p>
            </div>
            {/* Clear and Search buttons */}
            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-300">
              <Button 
                onClick={handleClearFilters}
                size="sm"
                className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white"
              >
                Clear
              </Button>
              <Button 
                onClick={handleSubmitFilters}
                size="sm"
                className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
              >
                Search
              </Button>
            </div>
          </div>
        </aside>

        {/* Right side content area */}
        <div className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8 lg:py-10">
          <section className="space-y-6">
            {/* Filter summary bar removed */}

            {/* Sorting bar - always visible */}
            <div className="pb-4 border-b border-current/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-70">
                  {listings.length === 0
                    ? "0 listings"
                    : `Showing ${pagination.firstResultNumber}–${pagination.lastResultNumber} of ${listings.length} listings`}
                </p>
                {/* Instant-apply Verified Merchants Only chip */}
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedFilters(prev => ({
                      ...prev,
                      verifiedMerchantsOnly: !prev.verifiedMerchantsOnly,
                    }));
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    submittedFilters.verifiedMerchantsOnly
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                  }`}
                  title="Toggle to show only listings from Tradebilia-verified merchants"
                >
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Verified Merchants Only
                </button>
                <div className="flex items-center gap-4">
                  {/* View toggle */}
                  <div className="flex gap-1 bg-white/10 rounded p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`px-3 py-1 text-xs font-medium rounded transition ${viewMode === "grid" ? "bg-white text-slate-950" : "text-white hover:bg-white/20"}`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3 py-1 text-xs font-medium rounded transition ${viewMode === "list" ? "bg-white text-slate-950" : "text-white hover:bg-white/20"}`}
                    >
                      List
                    </button>
                  </div>
                  {/* Sort dropdown */}
                  <Select value={sortBy} onValueChange={value => { setSortBy(value); setLocationSortNotice(null); setCurrentPage(1); }}>
                    <SelectTrigger className="w-48 h-9 bg-white/80 text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best_match">Best Match</SelectItem>
                      <SelectItem value="price_low_high">Value: Low to High</SelectItem>
                      <SelectItem value="price_high_low">Value: High to Low</SelectItem>
                      <SelectItem value="newest">Newly Listed</SelectItem>
                      <SelectItem value="condition">Condition: Best First</SelectItem>
                      <SelectItem value="grade">Grade: Highest First</SelectItem>
                      <SelectItem value="location">Location: Nearest First</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Per page dropdown - moved next to sort */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium opacity-70">Per page:</span>
                    <Select value={String(resultsPerPage)} onValueChange={(val) => { setResultsPerPage(Number(val)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-20 h-9 bg-white/80 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {locationSortNotice && (
                <p role="status" className="mt-3 text-xs font-medium opacity-75">
                  {locationSortNotice}
                </p>
              )}
            </div>


            {feedQuery.isLoading ? (
              <div className="flex min-h-[20rem] items-center justify-center rounded-[2rem] border border-dashed border-current/25">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : listings.length === 0 ? (
              <div className={`rounded-[2rem] border p-8 ${theme.panelClassName}`}>
                {isSportsCardsPage ? (
                  <div className="text-center">
                    {Object.values(submittedFilters).some(v => v !== undefined && v !== "") ? (
                      <>
                        <h3 className="text-4xl font-semibold" style={{ fontFamily: theme.headingFont }}>No Cards Match These Filters</h3>
                        <p className="mt-4 text-base leading-8 opacity-80">Try adjusting your search criteria.</p>
                      </>
                    ) : (
                      <h3 className="text-4xl font-semibold" style={{ fontFamily: theme.headingFont }}>No Items Listed</h3>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Sparkles className="mx-auto h-10 w-10" />
                    {Object.values(submittedFilters).some(v => v !== undefined && v !== "") ? (
                      <>
                        <h3 className="mt-5 text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>No listings match these filters yet.</h3>
                        <p className="mt-4 text-base leading-8 opacity-80">Try broadening the search or explore another Tradebilia category exchange.</p>
                      </>
                    ) : (
                      <h3 className="mt-5 text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>No Items Listed</h3>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-6" : "space-y-3"}>
                  {pageListings.map(listing => (
                    <Card key={listing.id} className={`${viewMode === "list" ? "flex flex-col" : "relative"} ${viewMode === "list" ? "" : "overflow-hidden"} border bg-white border-gray-200 text-black ${isSportsCardsPage ? "rounded-md shadow-sm" : "rounded-md shadow-sm sm:rounded-[2rem]"}`}>
                      {listing.ownerId && viewMode === "list" && (
                        <div className="px-3 py-0.5">
                          <OnlineIndicator sellerId={listing.ownerId} />
                        </div>
                      )}
                      <div className={`${viewMode === "list" ? "grid grid-cols-[auto_1fr] gap-4" : ""}`}>
                    {/* OnlineIndicator for grid view - positioned absolutely on top */}
                    {listing.ownerId && viewMode === "grid" && (
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                        <OnlineIndicator sellerId={listing.ownerId} />
                      </div>
                    )}
                    <Link href={`/listings/${listing.id}`} className={`${viewMode === "list" ? "" : "block"} cursor-pointer transition hover:opacity-90 ${viewMode === "list" ? "w-32 flex-shrink-0" : ""} ${isSportsCardsPage ? "aspect-[7/9]" : "aspect-[7/9] sm:aspect-[4/5]"} bg-white p-0`}>
                      <img
                        src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                        alt={listing.title}
                        className="h-full w-full object-contain"
                      />
                    </Link>
                      <CardContent className={`${viewMode === "list" ? "p-3 min-w-0 flex flex-col" : "space-y-1 p-1.5 text-[#153746]"}`}>
                      {viewMode === "list" ? (
                        <>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <Link href={`/listings/${listing.id}`} className="block font-bold leading-tight hover:opacity-75 text-base truncate">
                              {listing.title}
                            </Link>
                            <div className="flex items-center gap-3 text-xs mt-1 flex-nowrap overflow-x-auto">
                              <div>
                                <span className="font-semibold">{listing.grade && parseFloat(String(listing.grade)) > 0 ? "Grade:" : "Condition:"}</span>{" "}
                                {listing.grade && parseFloat(String(listing.grade)) > 0
                                  ? `${getDisplayedGradingCompany(listing.certificationCompany, listing.customGradingCompany)} ${formatGrade(listing.grade)}`
                                  : listing.conditionLabel}
                              </div>
                              {listing.estimatedValue && (
                                <div>
                                  <span className="font-semibold">Value:</span> {formatItemValue(listing.estimatedValue)}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold">Seller:</span> {listing.owner.displayName}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">Trader Rating:</span>
                                <Star className="fill-current h-3 w-3" />
                                <span>{listing.ownerRating.averageRating.toFixed(1)}</span>
                              </div>
                              {listing.distanceBand && (
                                <div className="flex items-center gap-1 text-teal-700">
                                  <MapPin className="h-3 w-3" />
                                  <span className="font-semibold">Nearby:</span>
                                  <span>{listing.distanceBand}</span>
                                </div>
                              )}
                            </div>
                          </div>

                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="mb-1 truncate text-[0.55rem] font-bold uppercase tracking-[0.1em] text-slate-600 sm:hidden">{listing.categoryLabel}</p>
                              <Link href={`/listings/${listing.id}`} className="block min-h-[2rem] line-clamp-2 font-semibold leading-tight hover:opacity-75 text-xs">
                                {listing.title}
                              </Link>
                            </div>
                            {listing.featured ? <Badge className={`rounded-full text-[0.5rem] px-1 py-0 ${theme.chipClassName}`}>Featured</Badge> : null}
                          </div>
                          <div className="grid grid-cols-2 gap-1 rounded-md border border-current/10 bg-black/5 p-1 text-[0.5rem]">
                            <div>
                              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.08em] opacity-80">{listing.grade && parseFloat(String(listing.grade)) > 0 ? "Grade" : "Condition"}</p>
                              <p className="mt-0 truncate text-[0.75rem] font-bold leading-tight">
                                {listing.grade && parseFloat(String(listing.grade)) > 0
                                  ? `${getDisplayedGradingCompany(listing.certificationCompany, listing.customGradingCompany)} ${formatGrade(listing.grade)}`
                                  : listing.conditionLabel}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.08em] opacity-80">Value</p>
                              <p className="mt-0 truncate text-[0.75rem] font-bold leading-tight sm:text-[0.55rem] sm:font-semibold">{listing.estimatedValue ? formatItemValue(listing.estimatedValue) : "—"}</p>
                            </div>
                            <div>
                              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.08em] opacity-80">Collector</p>
                              <p className="mt-0 truncate text-[0.65rem] font-semibold sm:text-[0.55rem]">{listing.owner.displayName}</p>
                            </div>
                            <div>
                              <p className="whitespace-nowrap text-[0.5rem] font-semibold uppercase tracking-[0.06em] opacity-80">Trader Rating</p>
                              <div className="mt-0 flex items-center gap-0.5 font-semibold">
                                <Star className="fill-current h-2 w-2" />
                                <span className="truncate text-[0.55rem]">{listing.ownerRating.averageRating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                          {listing.distanceBand && (
                            <p className="flex items-center gap-1 text-[0.55rem] font-semibold text-teal-700">
                              <MapPin className="h-2.5 w-2.5" />
                              <span>{listing.distanceBand}</span>
                            </p>
                          )}
                        </>
                      )}
                      <div className={`flex gap-1 ${viewMode === "list" ? "flex-wrap" : ""}`}>
                        <Dialog open={proposalListingId === listing.id} onOpenChange={open => {
                          setProposalListingId(open ? listing.id : null);
                          if (!open) setProposalNote("");
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className={`${viewMode === "grid" ? "h-7 min-w-0 flex-1 rounded-full border-[#0f5563]/30 px-2 text-[10px] font-bold uppercase tracking-wider text-[#0f5563] hover:bg-[#0f5563]/10 md:h-auto md:rounded-full md:border-current md:bg-transparent md:px-2 md:py-0 md:text-xs md:font-normal md:normal-case md:tracking-normal" : "h-auto rounded-full bg-transparent px-2 py-0 text-xs"}`}
                              disabled={!isAuthenticated || listing.ownerId === user?.id}
                              title={listing.ownerId === user?.id ? "You cannot message or trade with your own item" : "Start a trade proposal"}
                            >
                              <MessageSquareText className={`${viewMode === "grid" ? "mr-1 h-3 w-3 md:h-2 md:w-2" : "mr-1 h-2 w-2"}`} /> Trade
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Start a Trade Proposal</DialogTitle>
                              <DialogDescription>
                                Begin with an expression of interest. The listing owner can review your inventory and decide which items they want to request back.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Requested listing</Label>
                                <Input value={listing.title} readOnly />
                              </div>
                              <div className="space-y-2">
                                <Label>Your personalized message</Label>
                                <Textarea value={proposalNote} onChange={event => setProposalNote(event.target.value)} placeholder="Share why you would like to trade for this collectible." maxLength={1000} />
                              </div>
                              <Button className="w-full rounded-full" disabled={createProposalMutation.isPending || !proposalNote.trim()} onClick={() => createProposalMutation.mutate({ requestedListingId: listing.id, note: proposalNote.trim() })}>
                                {createProposalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Send Trade Proposal
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          className={`${viewMode === "grid" ? "h-7 w-7 rounded-full border-red-200 p-0 text-red-500 hover:bg-red-50 md:h-auto md:w-auto md:border-current md:bg-transparent md:px-1 md:py-0 md:text-xs" : "h-auto rounded-full bg-transparent px-1 py-0 text-xs"}`}
                          disabled={isAuthenticated && listing.ownerId === user?.id}
                          title={listing.ownerId === user?.id ? "You cannot favorite your own item" : listing.savedToWatchlist ? "Remove from favorites" : "Save to favorites"}
                          onClick={() => {
                            if (!isAuthenticated) {
                              window.location.href = getLoginUrl();
                              return;
                            }
                            watchlistMutation.mutate({ listingId: listing.id });
                          }}
                        >
                          <Heart className={`${viewMode === "grid" ? "h-4 w-4 md:h-5 md:w-5" : "h-5 w-5"} ${listing.savedToWatchlist ? "fill-red-500 text-red-500" : "text-red-500"}`} />
                        </Button>
                      </div>
                      </CardContent>
                      </div>
                    </Card>
                ))}
              </div>
              {/* Pagination controls */}
              <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-current/10">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={pagination.currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  ← Previous
                </Button>
                <span className="text-sm font-medium opacity-70">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  Next →
                </Button>
              </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
