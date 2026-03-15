"use client";

import { useApp } from "@/app/providers";
import MapView from "@/components/MapView";
import { useSearchParams } from "next/navigation";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AppNavSidebar from "../components/AppNavSidebar";
import MapProfileNotificationButtons from "./components/MapProfileNotificationButtons";
import MapRouteGeocodeSearch from "./components/MapRouteGeocodeSearch";
import MapsOnboardingModal from "./components/MapsOnboardingModal";

const LeadDetailModal = lazy(
  () => import("../prospect-enrich/components/LeadDetailModal")
);

interface Listing {
  listing_id: string;
  property_url?: string;
  source_table?: string | null;
  address?: string;
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zip?: string;
  zip_code?: string;
  price?: number;
  list_price?: number;
  list_price_min?: number;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  property_type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  year_built?: number;
  expired?: boolean;
  geo_source?: string | null;
  listing_source_name?: string | null;
  owner_email?: string;
  enrichment_confidence?: number | null;
  primary_photo?: string;
  photos_json?: unknown;
  url?: string;
  text?: string;
  description?: string;
  agent_name?: string;
  agent_email?: string;
  time_listed?: string;
  created_at?: string;
}

/** Get first image URL from Supabase photos_json (array of URLs or array of { url }). */
function getFirstPhotoUrl(photosJson: unknown): string | undefined {
  if (!photosJson || !Array.isArray(photosJson) || photosJson.length === 0) return undefined;
  const first = photosJson[0];
  const url = typeof first === "string" ? first : (first as { url?: string })?.url;
  return typeof url === "string" && url.startsWith("http") ? url : undefined;
}

export default function MapPage() {
  const { profile } = useApp();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [flyToCenter, setFlyToCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const lastFlownListingIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const loadSessionRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);

  const MAP_TABLES = useMemo(
    () => [
      "listings",
      "expired_listings",
      "probate_leads",
      "fsbo_leads",
      "frbo_leads",
      "imports",
      "trash",
      "foreclosure_listings",
    ],
    []
  );
  const MAP_INITIAL_PAGE_SIZE = 1000;
  const MAP_LAZY_PAGE_SIZE = 1000;
  const MAP_MAX_PAGES_PER_TABLE = 12; // Lazy cap: do not fully paginate each table
  const MAP_LAZY_MAX_RECORDS = 500000;

  const handleGeocodeResult = useCallback(
    (result: { lat: number; lng: number; formattedAddress?: string }) => {
      setFlyToCenter({ lat: result.lat, lng: result.lng });
      if (result.formattedAddress) setSearchQuery(result.formattedAddress);
    },
    []
  );

  // Open property detail modal when URL has ?listingId=...
  useEffect(() => {
    const id = searchParams.get("listingId");
    if (id) setSelectedListingId(id);
  }, [searchParams]);

  // When opened via "View On Map" (?listingId=...), fly map to that property (same as search bar behavior)
  useEffect(() => {
    const id = searchParams.get("listingId");
    if (!id) {
      lastFlownListingIdRef.current = null;
      return;
    }
    if (!listings.length) return;
    const listing = listings.find(
      (l) => l.listing_id === id || l.property_url === id
    );
    if (!listing) return;
    if (lastFlownListingIdRef.current === id) return;

    const address = [listing.address, listing.street, listing.city, listing.state, listing.zip ?? listing.zip_code]
      .filter(Boolean)
      .join(", ");
    if (address) setSearchQuery(address);

    const lat =
      listing.latitude ??
      (listing.lat != null ? Number(listing.lat) : undefined);
    const lng =
      listing.longitude ??
      (listing.lng != null ? Number(listing.lng) : undefined);

    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      lastFlownListingIdRef.current = id;
      setFlyToCenter({ lat, lng });
      return;
    }

    // No coordinates: geocode the address then fly (same as search bar)
    if (!address.trim()) return;
    lastFlownListingIdRef.current = id;
    fetch(`/api/geocode?q=${encodeURIComponent(address.trim())}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const gotLat = typeof data.lat === "number" ? data.lat : Number(data.lat);
        const gotLng = typeof data.lng === "number" ? data.lng : Number(data.lng);
        if (Number.isFinite(gotLat) && Number.isFinite(gotLng)) {
          setFlyToCenter({ lat: gotLat, lng: gotLng });
          if (data.formattedAddress) setSearchQuery(data.formattedAddress);
        }
      })
      .catch(() => { });
  }, [searchParams, listings]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchListings();
      checkOnboardingStatus();
    }
  }, [profile?.id]);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch("/api/maps/onboarding-status", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setShowOnboarding(!data.completed);
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setShowOnboarding(true);
    }
  };

  const handleBeginSetup = async () => {
    try {
      const response = await fetch("/api/maps/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (response.ok) {
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  const handleMaybeLater = () => {
    setShowOnboarding(false);
  };

  const fetchTablePage = useCallback(
    async (
      table: string,
      page: number,
      pageSize: number,
      signal: AbortSignal
    ): Promise<Listing[]> => {
      const response = await fetch(
        `/api/map/listings?table=${encodeURIComponent(table)}&mode=pin&page=${page}&pageSize=${pageSize}&sortBy=created_at&sortOrder=desc`,
        {
          credentials: "include",
          cache: "no-store",
          signal,
        }
      );

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(
          `Failed loading ${table} page ${page}: ${response.status} ${response.statusText} ${message}`.trim()
        );
      }

      const payload = await response.json();
      return Array.isArray(payload?.data) ? (payload.data as Listing[]) : [];
    },
    []
  );

  const mergeDedup = useCallback((current: Listing[], incoming: Listing[]): Listing[] => {
    if (!incoming.length) return current;
    const map = new Map<string, Listing>();
    current.forEach((row) => {
      const key = row.listing_id || row.property_url || "";
      if (key) map.set(key, row);
    });
    incoming.forEach((row) => {
      const key = row.listing_id || row.property_url || "";
      if (key && !map.has(key)) {
        map.set(key, row);
      }
    });
    return Array.from(map.values());
  }, []);

  const fetchListings = async () => {
    const sessionId = loadSessionRef.current + 1;
    loadSessionRef.current = sessionId;
    activeAbortRef.current?.abort();
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    try {
      setLoading(true);
      const initialPromises = MAP_TABLES.map(async (table) => {
        try {
          return await fetchTablePage(
            table,
            1,
            MAP_INITIAL_PAGE_SIZE,
            abortController.signal
          );
        } catch (error) {
          console.warn(`Initial map fetch failed for ${table}:`, error);
          return [];
        }
      });
      const initialResults = await Promise.all(initialPromises);
      const initialRows = initialResults.flat();

      if (
        isMountedRef.current &&
        loadSessionRef.current === sessionId &&
        !abortController.signal.aborted
      ) {
        setListings(initialRows);
        setLoading(false);
      }

      // Heavy lazy-load: append additional lightweight pages in controlled background batches.
      const tablePageMap = new Map<string, number>();
      MAP_TABLES.forEach((table) => tablePageMap.set(table, 2));
      let currentRows = initialRows;

      for (let pass = 0; pass < MAP_MAX_PAGES_PER_TABLE - 1; pass += 1) {
        if (abortController.signal.aborted) break;
        if (currentRows.length >= MAP_LAZY_MAX_RECORDS) break;

        const pagePromises = MAP_TABLES.map(async (table) => {
          const page = tablePageMap.get(table) || 2;
          try {
            const rows = await fetchTablePage(
              table,
              page,
              MAP_LAZY_PAGE_SIZE,
              abortController.signal
            );
            return { table, page, rows };
          } catch (error) {
            console.warn(`Lazy map fetch failed for ${table} page ${page}:`, error);
            return { table, page, rows: [] as Listing[] };
          }
        });

        const pageResults = await Promise.all(pagePromises);
        const nonEmptyRows = pageResults.flatMap((r) => r.rows);
        pageResults.forEach(({ table, page }) => {
          tablePageMap.set(table, page + 1);
        });

        if (!nonEmptyRows.length) break;

        currentRows = mergeDedup(currentRows, nonEmptyRows).slice(
          0,
          MAP_LAZY_MAX_RECORDS
        );

        if (
          isMountedRef.current &&
          loadSessionRef.current === sessionId &&
          !abortController.signal.aborted
        ) {
          setListings(currentRows);
        }

        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      if (activeAbortRef.current === abortController) {
        activeAbortRef.current = null;
      }
    }
  };

  // Convert listings to leads format for MapView
  const leads = useMemo(() => {
    return listings.map((listing) => {
      // Build address from multiple possible fields
      const hasValue = (val: any): boolean =>
        val != null && String(val).trim().length > 0;

      // Try address field first, then street, then build from parts
      let address = listing.address || listing.street || "";

      // If no direct address field, try to build from parts
      if (!address || address.trim() === "") {
        const addressParts = [listing.street, listing.unit]
          .filter((val) => hasValue(val))
          .map((val) => String(val).trim());

        if (addressParts.length > 0) {
          address = addressParts.join(" ");
        }
      }

      // Build full address string for display
      const city = listing.city || "";
      const state = listing.state || "";
      const zip = listing.zip || listing.zip_code || "";

      // If we have city/state/zip but no street address, show location info
      const locationInfo = [city, state, zip]
        .filter((val) => hasValue(val))
        .join(", ");

      // Calculate price drop percentage
      let priceDropPercent = 0;
      if (
        listing.list_price_min &&
        listing.list_price &&
        listing.list_price_min > listing.list_price
      ) {
        priceDropPercent =
          ((listing.list_price_min - listing.list_price) /
            listing.list_price_min) *
          100;
      }

      // Calculate days on market
      let daysOnMarket = 0;
      if (listing.time_listed) {
        daysOnMarket = parseInt(listing.time_listed) || 0;
      } else if (listing.created_at) {
        const createdDate = new Date(listing.created_at);
        const now = new Date();
        daysOnMarket = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        id: listing.listing_id || listing.property_url || "",
        address:
          address ||
          (locationInfo
            ? `Property in ${locationInfo}`
            : "Address not available"),
        city: city,
        state: state,
        zip: zip,
        price: listing.price || listing.list_price || 0,
        price_drop_percent: priceDropPercent,
        days_on_market: daysOnMarket,
        url: listing.url || listing.property_url || "",
        latitude:
          listing.latitude || (listing.lat ? Number(listing.lat) : undefined),
        longitude:
          listing.longitude || (listing.lng ? Number(listing.lng) : undefined),
        property_type: listing.property_type,
        beds: listing.beds,
        sqft: listing.sqft,
        year_built: listing.year_built,
        description: listing.text || listing.description,
        agent_name: listing.agent_name,
        agent_email: listing.agent_email,
        expired: listing.expired,
        geo_source: listing.geo_source || listing.listing_source_name,
        owner_email: listing.owner_email,
        enrichment_confidence: listing.enrichment_confidence,
        primary_photo: getFirstPhotoUrl(listing.photos_json) || listing.primary_photo,
      };
    });
  }, [listings]);

  // Handle Street View click from map
  const handleStreetViewClick = (leadId: string) => {
    setSelectedListingId(leadId);
  };

  // Close property detail modal
  const handleCloseModal = () => {
    setSelectedListingId(null);
  };

  // Clear flyToCenter only after map confirms it has applied
  const handleFlyToDone = useCallback(() => {
    setFlyToCenter(null);
  }, []);

  const selectedListing = useMemo(() => {
    if (!selectedListingId) return null;
    return (
      listings.find(
        (l) =>
          l.listing_id === selectedListingId || l.property_url === selectedListingId
      ) ?? null
    );
  }, [listings, selectedListingId]);

  return (
    <DashboardLayout hideHeader fullBleed>
      <div className="flex flex-row h-full w-full min-h-0 bg-white dark:bg-gray-900">
        <AppNavSidebar />
        {/* Main Content Area - Map (full height next to sidebar) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Map Section - full screen within remaining space */}
          <div className="flex-1 relative">
            {/* Search bar - top center overlay */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-4xl px-4 space-y-1">
              <MapRouteGeocodeSearch
                value={searchQuery}
                onValueChange={setSearchQuery}
                onResult={handleGeocodeResult}
                placeholder="Search by City, Zip, or Address"
              />
            </div>

            {/* Profile and notifications - top right, 30px left of default */}
            <div className="absolute top-4 right-[46px] z-10">
              <MapProfileNotificationButtons />
            </div>

            {/* Map Component - full screen within content area */}
            <div className="w-full h-full">
              <MapView
                isActive={true}
                listings={leads}
                loading={loading}
                onStreetViewListingClick={handleStreetViewClick}
                fullScreen
                flyToCenter={flyToCenter}
                flyToZoom={16}
                onFlyToDone={handleFlyToDone}
              />
            </div>
          </div>
        </div>

        {/* Onboarding Modal */}
        {showOnboarding && (
          <MapsOnboardingModal
            isOpen={showOnboarding}
            onClose={handleMaybeLater}
            onBeginSetup={handleBeginSetup}
            onMaybeLater={handleMaybeLater}
          />
        )}

        {/* Property Detail Modal with Street View */}
        {selectedListingId && (
          <Suspense
            fallback={
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="text-white">Loading...</div>
              </div>
            }
          >
            <LeadDetailModal
              listingId={selectedListingId}
              listingList={listings}
              selectedListing={selectedListing}
              sourceTable={selectedListing?.source_table ?? null}
              onClose={handleCloseModal}
            />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}
