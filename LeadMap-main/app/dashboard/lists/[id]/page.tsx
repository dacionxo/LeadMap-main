"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AppNavSidebar from "../../components/AppNavSidebar";
import DashboardLayout from "../../components/DashboardLayout";
import DealsNavbar from "../../crm/deals/components/DealsNavbar";
import LeadDetailModal from "../../prospect-enrich/components/LeadDetailModal";
import { Manrope } from "next/font/google";

interface List {
  id: string;
  name: string;
  type: "people" | "properties";
}

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

interface Listing {
  listing_id: string;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  list_price?: number | null;
  beds?: number | null;
  full_baths?: number | null;
  sqft?: number | null;
  status?: string | null;
  ai_investment_score?: number | null;
  property_url?: string | null;
  agent_name?: string | null;
  agent_email?: string | null;
  agent_phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  primary_photo?: string | null;
  year_built?: number | null;
  property_type?: string | null;
  lot_size?: string | null;
  [key: string]: unknown;
}

/** Map listing source_category or status to sidebar category label (For Sale, For Rent, Foreclosures, Imports). */
function getCategoryLabel(listing: Listing): string {
  const source = (listing as any).source_category ?? listing.status ?? "";
  const s = String(source).toLowerCase();
  if (s === "fsbo_leads" || s === "fsbo") return "For Sale";
  if (s === "frbo_leads" || s === "frbo") return "For Rent";
  if (s === "foreclosure_listings" || s === "foreclosure" || s === "foreclosures") return "Foreclosures";
  if (s === "imports" || s === "import" || s === "csv_import") return "Imports";
  return "Imports";
}

interface ListPaginatedResponse {
  data: Listing[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  list: { id: string; name: string; type: string };
}

// Normalize photos_json to array of image URLs (supports string[] or { url: string }[])
function getPhotoUrls(photosJson: unknown): string[] {
  if (!photosJson || !Array.isArray(photosJson)) return [];
  return (photosJson as any[])
    .map((item) => (typeof item === "string" ? item : item?.url))
    .filter(
      (url): url is string => typeof url === "string" && url.startsWith("http")
    );
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=480&fit=crop";
const CAROUSEL_INTERVAL_MS = 4000;

function PropertyPhotoCarousel({ listing }: { listing: Listing | null }) {
  const urls = getPhotoUrls((listing as any)?.photos_json);
  const primary = (listing as any)?.primary_photo as string | null | undefined;
  const images =
    urls.length > 0 ? urls : primary ? [primary] : [PLACEHOLDER_IMAGE];
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [listing?.listing_id]);

  useEffect(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length]);

  const goTo = (i: number) => {
    setIndex(i);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setIndex((prev) => (prev + 1) % images.length);
      }, CAROUSEL_INTERVAL_MS);
    }
  };

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute inset-0 w-full h-full transform transition-transform duration-500 group-hover:scale-105">
        {images.map((src, i) => (
          <img
            key={i}
            alt={`Property ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${
              i === index ? "opacity-100 z-[1]" : "opacity-0 z-0"
            }`}
            src={src}
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-600 hover:bg-white hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goTo((index - 1 + images.length) % images.length);
            }}
            aria-label="Previous photo"
          >
            <span className="material-symbols-outlined text-[16px]">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-600 hover:bg-white hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goTo((index + 1) % images.length);
            }}
            aria-label="Next photo"
          >
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </button>
          <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === index ? "bg-white shadow-md" : "bg-white/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(i);
                }}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── AI Score badge (rounded-full: green for high 90+, blue otherwise) ─── */
function AIScoreCell({ score }: { score?: number | null }) {
  if (score == null || score === 0) {
    return <span className="text-slate-400 text-lg">-</span>;
  }
  const rounded = Math.round(score);
  const isHigh = rounded >= 90;
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
        isHigh ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
      }`}
    >
      {rounded}
    </span>
  );
}

/* ─── Status badge (fsbo=emerald, pending=amber) ─── */
function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  const isPending = s.includes("pending");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
        isPending
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {status}
    </span>
  );
}

/** Must be inside DashboardLayout. */
function ListDetailContent() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const [list, setList] = useState<List | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [modalListingId, setModalListingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "any" | "fsbo" | "frbo" | "foreclosure" | "imports"
  >("any");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  type PriceRangeKey =
    | "any"
    | "0-100"
    | "100-250"
    | "250-500"
    | "500-1000"
    | "1000+";
  const [priceRangeFilter, setPriceRangeFilter] =
    useState<PriceRangeKey>("any");
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const priceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [priceRangeFilter]);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [statusDropdownOpen]);

  useEffect(() => {
    if (!priceDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        priceDropdownRef.current &&
        !priceDropdownRef.current.contains(e.target as Node)
      ) {
        setPriceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [priceDropdownOpen]);

  const fetchListData = useCallback(async () => {
    if (!listId) return;

    try {
      setLoading(true);
      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      if (statusFilter !== "any") {
        const table =
          statusFilter === "fsbo"
            ? "fsbo_leads"
            : statusFilter === "frbo"
              ? "frbo_leads"
              : statusFilter === "foreclosure"
                ? "foreclosure_listings"
                : "imports";
        searchParams.set("table", table);
      }
      if (priceRangeFilter !== "any") {
        const ranges: Record<
          Exclude<PriceRangeKey, "any">,
          { min: number; max: number | null }
        > = {
          "0-100": { min: 0, max: 100_000 },
          "100-250": { min: 100_000, max: 250_000 },
          "250-500": { min: 250_000, max: 500_000 },
          "500-1000": { min: 500_000, max: 1_000_000 },
          "1000+": { min: 1_000_000, max: null },
        };
        const { min, max } = ranges[priceRangeFilter];
        searchParams.set("minPrice", String(min));
        if (max != null) searchParams.set("maxPrice", String(max));
      }

      const response = await fetch(
        `/api/lists/${listId}/paginated?${searchParams}`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.push(
            "/login?redirect=" + encodeURIComponent(window.location.pathname)
          );
          return;
        }
        if (response.status === 404) {
          router.push("/dashboard/lists");
          return;
        }
        setListings([]);
        setTotalCount(0);
        setTotalPages(0);
        return;
      }

      const data: ListPaginatedResponse = await response.json();
      setList({
        id: data.list.id,
        name: data.list.name,
        type: data.list.type as "people" | "properties",
      });
      setTotalCount(data.count);
      setTotalPages(data.totalPages);
      setListings(data.data || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [
    listId,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    debouncedSearch,
    statusFilter,
    priceRangeFilter,
    router,
  ]);

  useEffect(() => {
    fetchListData();
  }, [fetchListData]);

  const handleRemoveFromList = useCallback(
    async (listing: Listing, e: React.MouseEvent) => {
      e.stopPropagation();
      const isPeople = list?.type === "people";
      const itemId = isPeople
        ? (listing as any).contact_id || listing.listing_id
        : listing.listing_id || listing.property_url;
      if (!itemId || !listId) return;
      if (!confirm("Remove this item from the list?")) return;

      try {
        setDeletingId(String(itemId));
        const response = await fetch(`/api/lists/${listId}/remove`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: String(itemId),
            itemType: isPeople ? "contact" : "listing",
          }),
        });

        if (response.ok) {
          await fetchListData();
        } else {
          const err = await response.json().catch(() => ({}));
          alert(err.error || "Failed to remove item");
        }
      } catch {
        alert("Failed to remove item");
      } finally {
        setDeletingId(null);
      }
    },
    [listId, list?.type, fetchListData]
  );

  const handleExportCSV = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/lists/${listId}/paginated?page=1&pageSize=1000${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) return;
      const { data: items } = await response.json();
      const rows = items || [];

      const headers = [
        "Listing ID",
        "Address",
        "City",
        "State",
        "Zip Code",
        "Price",
        "Beds",
        "Baths",
        "Sqft",
        "Status",
        "Agent Name",
        "Agent Email",
        "Agent Phone",
      ];
      const csvRows = rows.map((r: Listing) => [
        r.listing_id || "",
        r.street || "",
        r.city || "",
        r.state || "",
        r.zip_code || "",
        r.list_price?.toString() || "",
        r.beds?.toString() || "",
        r.full_baths?.toString() || "",
        r.sqft?.toString() || "",
        r.status || "",
        r.agent_name || "",
        r.agent_email || "",
        r.agent_phone || "",
      ]);
      const csv =
        headers.join(",") +
        "\n" +
        csvRows
          .map((row: (string | number)[]) =>
            row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
          )
          .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(list?.name || "list").replace(/[^a-z0-9]/gi, "_")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export");
    }
  }, [listId, list?.name, debouncedSearch]);

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === listings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(
          listings
            .map((l) => l.listing_id || (l as any).contact_id || "")
            .filter(Boolean)
        )
      );
    }
  };

  const handleRowClick = (listing: Listing) => {
    const id = listing.listing_id || (listing as any).property_url || "";
    if (!id) return;
    setModalListingId(id);
    setSelectedListing(null);
  };

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord =
    totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);

  const getListingId = (listing: Listing) =>
    listing.listing_id || listing.property_url || "";

  if (!listId) {
    return null;
  }

  if (loading && !list) {
    return (
      <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
        <DealsNavbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
          <span className="ml-3 text-slate-500 font-medium">
            Loading list...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-[30px]">
      <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
        <DealsNavbar />
        <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
          <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
            <AppNavSidebar />
            <div className="flex-1 bg-white dark:bg-dark/90 rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden relative font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-blue-700">
              {/* Decorative blue glow - matches deals page */}
              <div
                className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
                aria-hidden
              />

              {/* ─── HEADER ─── */}
              <header className="shrink-0 z-20 px-8 pt-8 pb-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Link
                      href="/dashboard/lists"
                      className="hover:text-blue-600 transition-colors"
                    >
                      Lists
                    </Link>
                    <span className="material-symbols-outlined text-[12px] text-slate-400">
                      chevron_right
                    </span>
                    <span className="text-slate-800 dark:text-slate-300">
                      {list?.name ?? "…"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                        {list?.name ?? "…"}
                      </h1>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400 text-[10px] font-bold border border-gray-200 dark:border-gray-600 uppercase tracking-wide shadow-sm">
                        {totalCount.toLocaleString()} records
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {}}
                        className="px-3.5 py-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-600 shadow-sm text-gray-600 dark:text-slate-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 transition-all flex items-center gap-1.5"
                        aria-label="Import"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          upload_file
                        </span>
                        Import
                      </button>
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-3.5 py-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-600 shadow-sm text-gray-600 dark:text-slate-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 transition-all flex items-center gap-1.5"
                        aria-label="Export"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          download
                        </span>
                        Export
                      </button>
                      <button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
                        aria-label="Add records"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          add
                        </span>
                        Add records
                      </button>
                      <button
                        type="button"
                        className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all flex items-center gap-1.5"
                        aria-label="Research with AI"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          auto_awesome
                        </span>
                        Research with AI
                      </button>
                      <button
                        type="button"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-600 shadow-sm text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                        aria-label="More options"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          more_vert
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </header>

              {/* ─── MAIN CONTENT (matches /dashboard/lists padding) ─── */}
              <main className="flex-1 overflow-auto custom-scrollbar px-8 pb-8 flex flex-col min-h-0">
                {/* ─── TOOLBAR (search + Status/Price/More Filters) ─── */}
                <div className="flex items-center justify-between gap-4 mb-4 bg-white dark:bg-slate-800/80 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(19,91,236,0.08)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
                  <div className="flex-1 flex items-center relative group max-w-md">
                    <span
                      className="absolute left-3 material-symbols-outlined text-slate-400 group-focus-within:text-blue-600 transition-colors z-10 text-[18px]"
                      aria-hidden
                    >
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        list?.type === "properties"
                          ? "Search properties..."
                          : "Search contacts..."
                      }
                      className="w-full pl-10 pr-4 py-1.5 bg-transparent dark:bg-transparent border-0 text-sm font-medium text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-0"
                      aria-label="Search"
                    />
                  </div>
                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 mx-2 shrink-0" />
                  <div className="flex items-center gap-2 shrink-0">
                    {list?.type === "properties" && (
                      <div
                        className="relative"
                        ref={statusDropdownRef}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setStatusDropdownOpen((open) => !open)
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 shadow-sm rounded-full text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          aria-label="Status filter"
                          aria-expanded={statusDropdownOpen ? "true" : "false"}
                          aria-haspopup="listbox"
                        >
                          Status:{" "}
                          {statusFilter === "any"
                            ? "Any"
                            : statusFilter === "fsbo"
                              ? "For Sale"
                              : statusFilter === "frbo"
                                ? "For Rent"
                                : statusFilter === "foreclosure"
                                  ? "Foreclosures"
                                  : "Imports"}
                          <span className="material-symbols-outlined text-[16px] text-slate-400">
                            expand_more
                          </span>
                        </button>
                        {statusDropdownOpen && (
                          <div
                            className="absolute left-0 top-full mt-1 min-w-[160px] py-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50"
                            role="listbox"
                          >
                            {(
                              [
                                { value: "any", label: "Any" },
                                { value: "fsbo", label: "For Sale" },
                                { value: "frbo", label: "For Rent" },
                                { value: "foreclosure", label: "Foreclosures" },
                                { value: "imports", label: "Imports" },
                              ] as const
                            ).map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                role="option"
                                aria-selected={statusFilter === value ? "true" : "false"}
                                onClick={() => {
                                  setStatusFilter(value);
                                  setStatusDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                                  statusFilter === value
                                    ? "bg-primary/10 text-primary dark:text-primary"
                                    : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {list?.type === "properties" && (
                      <div
                        className="relative"
                        ref={priceDropdownRef}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setPriceDropdownOpen((open) => !open)
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 shadow-sm rounded-full text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          aria-label="Price range filter"
                          aria-expanded={priceDropdownOpen ? "true" : "false"}
                          aria-haspopup="listbox"
                        >
                          Price:{" "}
                          {priceRangeFilter === "any"
                            ? "Any"
                            : priceRangeFilter === "0-100"
                              ? "Under $100k"
                              : priceRangeFilter === "100-250"
                                ? "$100k – $250k"
                                : priceRangeFilter === "250-500"
                                  ? "$250k – $500k"
                                  : priceRangeFilter === "500-1000"
                                    ? "$500k – $1M"
                                    : "$1M+"}
                          <span className="material-symbols-outlined text-[16px] text-slate-400">
                            expand_more
                          </span>
                        </button>
                        {priceDropdownOpen && (
                          <div
                            className="absolute left-0 top-full mt-1 min-w-[180px] py-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50"
                            role="listbox"
                          >
                            {(
                              [
                                { value: "any" as const, label: "Any" },
                                { value: "0-100" as const, label: "Under $100k" },
                                { value: "100-250" as const, label: "$100k – $250k" },
                                { value: "250-500" as const, label: "$250k – $500k" },
                                { value: "500-1000" as const, label: "$500k – $1M" },
                                { value: "1000+" as const, label: "$1M+" },
                              ]
                            ).map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                role="option"
                                aria-selected={priceRangeFilter === value ? "true" : "false"}
                                onClick={() => {
                                  setPriceRangeFilter(value);
                                  setPriceDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                                  priceRangeFilter === value
                                    ? "bg-primary/10 text-primary dark:text-primary"
                                    : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── TABLE + DETAIL PANEL LAYOUT ─── */}
                <div className="flex gap-4 h-full overflow-hidden">
                  {/* ─── TABLE CARD (deals kanban design: border, shadow, rounded-2xl) ─── */}
                  <div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_20px_50px_-12px_rgba(19,91,236,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden flex-1 flex flex-col relative transition-all duration-300">
                    <div className="overflow-auto custom-scrollbar flex-1 pb-16">
                      {loading ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2
                            className="h-8 w-8 animate-spin text-blue-600"
                            aria-hidden
                          />
                          <span className="ml-3 text-slate-500 font-medium">
                            Loading...
                          </span>
                        </div>
                      ) : listings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-32 h-32 mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-5xl">
                            {list?.type === "properties" ? "🏠" : "👥"}
                          </div>
                          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                            {searchQuery
                              ? "No matches found"
                              : "This list is empty"}
                          </h2>
                          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
                            {searchQuery
                              ? "Try adjusting your search to find what you're looking for."
                              : `Add ${list?.type === "properties" ? "properties" : "contacts"} to this list to get started.`}
                          </p>
                          {!searchQuery && (
                            <button
                              type="button"
                              onClick={() => {}}
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                            >
                              Add records
                              <span className="material-symbols-outlined text-sm">
                                arrow_forward
                              </span>
                            </button>
                          )}
                        </div>
                      ) : list?.type === "properties" ? (
                        /* ─── PROPERTIES TABLE ─── */
                        <table
                          className="w-full text-left text-sm text-slate-600"
                          role="grid"
                        >
                          <thead className="text-[11px] font-semibold text-gray-500 uppercase bg-gray-50/90 dark:bg-slate-800/90 border-b border-gray-200 dark:border-gray-700 tracking-wider sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                              <th
                                className="px-5 py-3 w-10 font-semibold align-middle"
                                scope="col"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    listings.length > 0 &&
                                    selectedIds.size === listings.length
                                  }
                                  onChange={handleSelectAll}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-3.5 h-3.5 cursor-pointer transition-colors"
                                  aria-label="Select all"
                                />
                              </th>
                              <th
                                className="px-4 py-3 font-semibold align-middle"
                                scope="col"
                              >
                                Address
                              </th>
                              <th
                                className="px-4 py-3 font-semibold w-32 align-middle"
                                scope="col"
                              >
                                Price
                              </th>
                              <th
                                className="px-4 py-3 font-semibold w-24 align-middle"
                                scope="col"
                              >
                                Status
                              </th>
                              <th
                                className="px-4 py-3 font-semibold w-24 text-center align-middle"
                                scope="col"
                              >
                                AI Score
                              </th>
                              <th
                                className="px-4 py-3 font-semibold w-20 text-center align-middle"
                                scope="col"
                              >
                                Beds
                              </th>
                              <th
                                className="px-4 py-3 font-semibold w-20 text-center align-middle"
                                scope="col"
                              >
                                Baths
                              </th>
                              <th
                                className="px-4 py-3 font-semibold w-24 text-right align-middle"
                                scope="col"
                              >
                                Sqft
                              </th>
                              <th
                                className="px-4 py-3 font-semibold w-24 text-right align-middle"
                                scope="col"
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {listings.map((listing) => {
                              const id = getListingId(listing);
                              const address = listing.street || "—";
                              const cityStateZip = [
                                listing.city,
                                listing.state,
                                listing.zip_code,
                              ]
                                .filter(Boolean)
                                .join(", ");
                              const isDeleting = deletingId === id;
                              const isSelected =
                                (selectedListing != null &&
                                  getListingId(selectedListing) === id) ||
                                (modalListingId != null && id === modalListingId);

                              // Prefer internal property identifier (listing_id), fall back to property_url
                              const prospectIdentifier =
                                listing.listing_id ||
                                listing.property_url ||
                                null;
                              return (
                                <tr
                                  key={id}
                                  onClick={() => handleRowClick(listing)}
                                  className={`transition-colors duration-150 group cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                                      : "bg-white/40 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-700/40"
                                  }`}
                                >
                                  <td className="px-5 py-3 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.has(id)}
                                      onChange={(e) =>
                                        handleSelect(id, e.target.checked)
                                      }
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-3.5 h-3.5 cursor-pointer transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label={`Select property ${address}`}
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-middle">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="material-symbols-outlined text-slate-400 text-[16px]">
                                          location_on
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                          {address}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 ml-5">
                                        {cityStateZip || "—"}
                                      </div>
                                      {prospectIdentifier && (
                                        <button
                                          type="button"
                                          className="text-[10px] font-semibold text-blue-600 hover:underline ml-5 mt-1 inline-flex items-center gap-0.5"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setModalListingId(String(prospectIdentifier));
                                          }}
                                        >
                                          View Property
                                          <span className="material-symbols-outlined text-[10px]">
                                            arrow_forward
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    className="px-4 py-3 align-middle font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedListing(listing);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedListing(listing);
                                      }
                                    }}
                                    aria-label="View property details"
                                  >
                                    {listing.list_price != null
                                      ? `$${Number(listing.list_price).toLocaleString()}`
                                      : "—"}
                                  </td>
                                  <td
                                    className="px-4 py-3 align-middle cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedListing(listing);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedListing(listing);
                                      }
                                    }}
                                    aria-label="View property details"
                                  >
                                    <StatusBadge status={listing.status} />
                                  </td>
                                  <td
                                    className="px-4 py-3 text-center align-middle cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedListing(listing);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedListing(listing);
                                      }
                                    }}
                                    aria-label="View property details"
                                  >
                                    <AIScoreCell
                                      score={listing.ai_investment_score}
                                    />
                                  </td>
                                  <td
                                    className="px-4 py-3 text-center align-middle font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedListing(listing);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedListing(listing);
                                      }
                                    }}
                                    aria-label="View property details"
                                  >
                                    {listing.beds ?? "—"}
                                  </td>
                                  <td
                                    className="px-4 py-3 text-center align-middle font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedListing(listing);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedListing(listing);
                                      }
                                    }}
                                    aria-label="View property details"
                                  >
                                    {listing.full_baths ?? "—"}
                                  </td>
                                  <td
                                    className="px-4 py-3 text-right align-middle font-medium text-slate-700 dark:text-slate-300 tabular-nums cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedListing(listing);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedListing(listing);
                                      }
                                    }}
                                    aria-label="View property details"
                                  >
                                    {listing.sqft != null
                                      ? Number(listing.sqft).toLocaleString()
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-right align-middle">
                                    <div
                                      className={`flex items-center justify-end gap-1 transition-opacity duration-200 ${
                                        isSelected
                                          ? "opacity-100"
                                          : "opacity-0 group-hover:opacity-100"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        className="w-7 h-7 flex items-center justify-center rounded-md hover:text-blue-600 hover:bg-blue-50/80 dark:hover:bg-blue-900/30 transition-colors"
                                        title="Edit"
                                        aria-label="Edit"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          edit
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        className="w-7 h-7 flex items-center justify-center rounded-md hover:text-red-600 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                        title="Delete"
                                        aria-label="Delete"
                                        disabled={isDeleting}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveFromList(listing, e);
                                        }}
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          delete
                                        </span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        /* ─── PEOPLE TABLE ─── */
                        <table
                          className="w-full text-left text-sm text-slate-600"
                          role="grid"
                        >
                          <thead className="text-[11px] font-semibold text-gray-500 uppercase bg-gray-50/90 dark:bg-slate-800/90 border-b border-gray-200 dark:border-gray-700 tracking-wider sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                              <th
                                className="pl-6 pr-4 py-3 w-12 font-semibold align-middle"
                                scope="col"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    listings.length > 0 &&
                                    selectedIds.size === listings.length
                                  }
                                  onChange={handleSelectAll}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                                  aria-label="Select all"
                                />
                              </th>
                              <th
                                className="px-4 py-3 font-semibold align-middle w-[30%]"
                                scope="col"
                              >
                                Name
                              </th>
                              <th
                                className="px-4 py-3 font-semibold align-middle"
                                scope="col"
                              >
                                Job Title
                              </th>
                              <th
                                className="px-4 py-3 font-semibold align-middle"
                                scope="col"
                              >
                                Company
                              </th>
                              <th
                                className="px-4 py-3 font-semibold align-middle"
                                scope="col"
                              >
                                Email
                              </th>
                              <th
                                className="px-4 py-3 font-semibold align-middle"
                                scope="col"
                              >
                                Phone
                              </th>
                              <th
                                className="px-4 py-3 font-semibold w-24 text-right align-middle"
                                scope="col"
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {listings.map((item, idx) => {
                              const id =
                                (item as any).contact_id ||
                                item.listing_id ||
                                item.agent_email ||
                                `row-${idx}`;
                              const name =
                                item.agent_name ||
                                [item.first_name, item.last_name]
                                  .filter(Boolean)
                                  .join(" ")
                                  .trim() ||
                                "—";
                              const isDeleting = deletingId === id;

                              return (
                                <tr
                                  key={id}
                                  className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group"
                                >
                                  <td className="pl-6 pr-4 py-2.5 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.has(id)}
                                      onChange={(e) =>
                                        handleSelect(id, e.target.checked)
                                      }
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label={`Select contact ${name}`}
                                    />
                                  </td>
                                  <td className="px-4 py-2.5 align-middle">
                                    <span className="font-semibold text-slate-800 text-sm">
                                      {name}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 align-middle text-sm text-slate-600">
                                    {item.job_title || "—"}
                                  </td>
                                  <td className="px-4 py-2.5 align-middle text-sm text-slate-600">
                                    {item.company || "—"}
                                  </td>
                                  <td className="px-4 py-2.5 align-middle text-sm text-slate-600 truncate max-w-[200px]">
                                    {item.agent_email || item.email || "—"}
                                  </td>
                                  <td className="px-4 py-2.5 align-middle text-sm text-slate-600">
                                    {item.agent_phone || item.phone || "—"}
                                  </td>
                                  <td className="px-4 py-2.5 text-right align-middle">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <button
                                        type="button"
                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveFromList(item, e);
                                        }}
                                        disabled={isDeleting}
                                        aria-label="Delete"
                                        title="Delete"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          delete
                                        </span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* ─── PAGINATION FOOTER ─── */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800/95 border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between z-20 rounded-b-2xl">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Showing{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {startRecord}
                        </span>{" "}
                        -{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {endRecord}
                        </span>{" "}
                        of{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {totalCount.toLocaleString()}
                        </span>{" "}
                        records
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage <= 1}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200 transition-colors disabled:opacity-50 shadow-sm"
                          aria-label="Previous page"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            chevron_left
                          </span>
                        </button>
                        {totalPages >= 1 && (
                          <button
                            type="button"
                            onClick={() => setCurrentPage(1)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                              currentPage === 1
                                ? "bg-blue-600 text-white shadow-sm"
                                : "border border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200"
                            }`}
                          >
                            1
                          </button>
                        )}
                        {totalPages >= 2 && (
                          <button
                            type="button"
                            onClick={() => setCurrentPage(2)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                              currentPage === 2
                                ? "bg-blue-600 text-white shadow-sm"
                                : "border border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200"
                            }`}
                          >
                            2
                          </button>
                        )}
                        {totalPages >= 3 && (
                          <button
                            type="button"
                            onClick={() => setCurrentPage(3)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                              currentPage === 3
                                ? "bg-blue-600 text-white shadow-sm"
                                : "border border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200"
                            }`}
                          >
                            3
                          </button>
                        )}
                        {totalPages > 4 && (
                          <span className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs">
                            ...
                          </span>
                        )}
                        {totalPages > 4 && (
                          <button
                            type="button"
                            onClick={() => setCurrentPage(totalPages)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                              currentPage === totalPages
                                ? "bg-blue-600 text-white shadow-sm"
                                : "border border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200"
                            }`}
                          >
                            {totalPages}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage >= totalPages}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200 transition-colors shadow-sm disabled:opacity-50"
                          aria-label="Next page"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            chevron_right
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ─── PROPERTY DETAIL SIDE PANEL (rebuilt with spotlight card design) ─── */}
                  {selectedListing && list?.type === "properties" && (
                    <div className="w-[30%] min-w-[320px] bg-transparent flex flex-col h-full overflow-hidden transition-all">
                      <div className="group bg-white dark:bg-slate-800/80 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(19,91,236,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] hover:shadow-[0_24px_56px_-12px_rgba(19,91,236,0.18)] dark:hover:shadow-[0_24px_56px_-12px_rgba(0,0,0,0.4)] hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 w-full h-full flex flex-col">
                        {/* Hero / photo header with carousel — 90% size, same ratios */}
                        <div className="relative h-[14.4rem] md:h-[16.2rem] w-full overflow-hidden">
                          <div className="absolute inset-0 w-[111.11%] h-[111.11%] scale-90 origin-top-left">
                          <PropertyPhotoCarousel listing={selectedListing} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute top-4 left-4">
                            <span className="px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-primary text-[10px] font-semibold uppercase tracking-[0.18em] rounded-xl shadow-lg">
                              {getCategoryLabel(selectedListing)}
                            </span>
                          </div>
                          <div className="absolute top-4 right-4 flex items-center gap-2">
                            <button
                              type="button"
                              className="size-9 rounded-full bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/40 transition-all hover:scale-110 shadow-xl"
                              aria-label="Favorite property"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <span className="material-symbols-outlined fill-1 text-[20px]">
                                favorite
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedListing(null)}
                              className="size-9 rounded-full bg-black/30 backdrop-blur-xl text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-110 shadow-xl"
                              aria-label="Close panel"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                close
                              </span>
                            </button>
                          </div>
                          <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
                            <span className="px-3 py-1 bg-primary text-white text-[10px] font-semibold uppercase tracking-[0.18em] w-fit rounded-md">
                              Available now
                            </span>
                            <h2 className="text-white text-2xl md:text-3xl font-semibold tracking-tight">
                              {selectedListing.list_price != null
                                ? `$${Number(selectedListing.list_price).toLocaleString()}`
                                : "Price not available"}
                            </h2>
                          </div>
                          </div>
                        </div>

                        {/* Content — scaled to 90% so section is 10% smaller with same ratios */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                          <div className="scale-90 origin-top w-full p-6 md:p-8 space-y-8">
                          {/* Listing Agent: name, email, phone */}
                          <div className="space-y-3">
                            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-[0.18em]">
                              Agent Information
                            </p>
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
                                <span className="material-symbols-outlined text-primary text-3xl">
                                  person
                                </span>
                              </div>
                              <div className="min-w-0 space-y-1.5">
                                <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                  {selectedListing.agent_name || "—"}
                                </p>
                                {selectedListing.agent_email ? (
                                  <a
                                    href={`mailto:${selectedListing.agent_email}`}
                                    className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-primary truncate"
                                  >
                                    <span className="material-symbols-outlined text-[16px] shrink-0">
                                      mail
                                    </span>
                                    <span className="truncate">
                                      {selectedListing.agent_email}
                                    </span>
                                  </a>
                                ) : (
                                  <p className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
                                    <span className="material-symbols-outlined text-[16px] shrink-0">
                                      mail
                                    </span>
                                    —
                                  </p>
                                )}
                                {selectedListing.agent_phone ? (
                                  <a
                                    href={`tel:${selectedListing.agent_phone}`}
                                    className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-primary"
                                  >
                                    <span className="material-symbols-outlined text-[16px] shrink-0">
                                      call
                                    </span>
                                    {selectedListing.agent_phone}
                                  </a>
                                ) : (
                                  <p className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
                                    <span className="material-symbols-outlined text-[16px] shrink-0">
                                      call
                                    </span>
                                    —
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Owner Information — Current Residents (resident name, phone, previous addresses) */}
                          <div className="space-y-3">
                            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-[0.18em]">
                              Owner Information
                            </p>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Current Residents
                            </p>
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
                                <span className="material-symbols-outlined text-primary text-3xl">
                                  home_person
                                </span>
                              </div>
                              <div className="min-w-0 space-y-1.5">
                                <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                  {((selectedListing as any).resident_name ??
                                    [
                                      selectedListing.first_name,
                                      selectedListing.last_name,
                                    ]
                                      .filter(Boolean)
                                      .join(" ")
                                      .trim()) || "—"}
                                </p>
                                {((selectedListing as any).resident_phone ??
                                  selectedListing.phone) ? (
                                  <a
                                    href={`tel:${(selectedListing as any).resident_phone ?? selectedListing.phone ?? ""}`}
                                    className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-primary"
                                  >
                                    <span className="material-symbols-outlined text-[16px] shrink-0">
                                      call
                                    </span>
                                    {(selectedListing as any).resident_phone ??
                                      selectedListing.phone}
                                  </a>
                                ) : (
                                  <p className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
                                    <span className="material-symbols-outlined text-[16px] shrink-0">
                                      call
                                    </span>
                                    —
                                  </p>
                                )}
                                {(() => {
                                  const prev =
                                    (selectedListing as any).previous_addresses;
                                  const hasPrev =
                                    prev != null &&
                                    prev !== "" &&
                                    (Array.isArray(prev) ? prev.length > 0 : true);
                                  return hasPrev ? (
                                    <div className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                      <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                                        history_edu
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-300">
                                        {Array.isArray(prev)
                                          ? (prev as string[]).join("; ")
                                          : String(prev)}
                                      </span>
                                    </div>
                                  ) : (
                                  <p className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
                                    <span className="material-symbols-outlined text-[16px] shrink-0">
                                      history_edu
                                    </span>
                                    —
                                  </p>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Property details grid */}
                          <div className="space-y-4">
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.18em]">
                              Property Details
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-gray-50/50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center gap-4 border border-gray-100 dark:border-gray-700/50">
                                <div className="size-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-600">
                                  <span className="material-symbols-outlined text-primary text-2xl">
                                    bed
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-xl font-semibold text-slate-800 dark:text-slate-100">
                                    {selectedListing.beds ?? "—"}
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">
                                    Bedrooms
                                  </span>
                                </div>
                              </div>
                              <div className="bg-gray-50/50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center gap-4 border border-gray-100 dark:border-gray-700/50">
                                <div className="size-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-600">
                                  <span className="material-symbols-outlined text-primary text-2xl">
                                    bathtub
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-xl font-semibold text-slate-800 dark:text-slate-100">
                                    {selectedListing.full_baths ?? "—"}
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">
                                    Bathrooms
                                  </span>
                                </div>
                              </div>
                              <div className="bg-gray-50/50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center gap-4 border border-gray-100 dark:border-gray-700/50">
                                <div className="size-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-600">
                                  <span className="material-symbols-outlined text-primary text-2xl">
                                    square_foot
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-xl font-semibold text-slate-800 dark:text-slate-100">
                                    {selectedListing.sqft != null
                                      ? Number(
                                          selectedListing.sqft
                                        ).toLocaleString()
                                      : "—"}
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">
                                    Total Sqft
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button
                              type="button"
                              className="flex-1 min-h-[52px] flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-3 px-5 rounded-2xl shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all"
                              onClick={() => {
                                const identifier =
                                  selectedListing.listing_id ||
                                  (selectedListing as any).property_url;
                                if (!identifier) return;
                                router.push(
                                  `/dashboard/map?listingId=${encodeURIComponent(
                                    String(identifier)
                                  )}`
                                );
                              }}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                map
                              </span>
                              View On Map
                            </button>
                          </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* Property details modal (same as prospect-enrich) */}
      {modalListingId && list?.type === "properties" && (
        <LeadDetailModal
          listingId={modalListingId}
          listingList={listings}
          onClose={() => setModalListingId(null)}
          sourceTable={(listings[0] as any)?.source_category ?? null}
        />
      )}
    </div>
  );
}

export default function ListDetailPage() {
  return (
    <DashboardLayout fullBleed hideHeader>
      <ListDetailContent />
    </DashboardLayout>
  );
}
