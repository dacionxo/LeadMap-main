"use client";

import { buildAddressString, geocodeAddress } from "@/lib/utils/geocoding";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { add_to_list } from "../utils/listUtils";
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Home,
  Info,
  List,
  Mail,
  MapPin,
  Maximize,
  Minimize,
  Tag,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ListsManager from "./ListsManager";
import OwnerSelector from "./OwnerSelector";
import PipelineDropdown from "./PipelineDropdown";
import { useApp } from "@/app/providers";
import TagsInput from "./TagsInput";

// Normalize photos_json to array of image URLs (supports string[] or { url: string }[])
function getPhotoUrls(photosJson: any): string[] {
  if (!photosJson) return [];
  if (!Array.isArray(photosJson)) return [];
  return photosJson
    .map((item) => (typeof item === "string" ? item : item?.url))
    .filter((url): url is string => typeof url === "string" && url.startsWith("http"));
}

// Helper function to format bathroom count with proper decimal display
function formatBaths(baths: number | null | undefined): string {
  if (baths === null || baths === undefined) return "--";
  // Convert to number if it's a string
  const numBaths = typeof baths === "string" ? parseFloat(baths) : baths;
  if (isNaN(numBaths)) return "--";
  // Remove trailing zeros for whole numbers, keep decimals for fractional values
  return numBaths % 1 === 0 ? numBaths.toString() : numBaths.toFixed(1);
}

type TabType = "info" | "comps" | "mail" | "activity";

interface Listing {
  listing_id: string;
  property_url?: string | null;
  permalink?: string | null;
  scrape_date?: string | null;
  last_scraped_at?: string | null;
  active?: boolean;
  street?: string | null;
  unit?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  beds?: number | null;
  full_baths?: number | null;
  half_baths?: number | null;
  sqft?: number | null;
  year_built?: number | null;
  list_price?: number | null;
  list_price_min?: number | null;
  list_price_max?: number | null;
  status?: string | null;
  mls?: string | null;
  agent_name?: string | null;
  agent_email?: string | null;
  agent_phone?: string | null;
  agent_phone_2?: string | null;
  listing_agent_phone_2?: string | null;
  listing_agent_phone_5?: string | null;
  text?: string | null;
  last_sale_price?: number | null;
  last_sale_date?: string | null;
  photos?: string | null;
  photos_json?: any;
  other?: any;
  price_per_sqft?: number | null;
  listing_source_name?: string | null;
  listing_source_id?: string | null;
  monthly_payment_estimate?: string | null;
  ai_investment_score?: number | null;
  time_listed?: string | null;
  created_at?: string;
  updated_at?: string;
  in_crm?: boolean;
  owner_id?: string | null;
  tags?: string[] | null;
  lists?: string[] | null;
  pipeline_status?: string | null;
  lat?: number | null;
  lng?: number | null;
  // Compatibility fields for probate_leads (which uses latitude/longitude)
  latitude?: number | null;
  longitude?: number | null;
  // FSBO / fsbo_leads property attributes (from Supabase)
  living_area?: string | null;
  year_built_pagination?: string | null;
  bedrooms?: string | null;
  bathrooms?: string | null;
  property_type?: string | null;
  construction_type?: string | null;
  building_style?: string | null;
  effective_year_built?: string | null;
  number_of_units?: string | null;
  stories?: string | null;
  garage?: string | null;
  heating_type?: string | null;
  heating_gas?: string | null;
  air_conditioning?: string | null;
  basement?: string | null;
  deck?: string | null;
  interior_walls?: string | null;
  exterior_walls?: string | null;
  fireplaces?: string | null;
  flooring_cover?: string | null;
  driveway?: string | null;
  pool?: string | null;
  patio?: string | null;
  porch?: string | null;
  roof?: string | null;
  sewer?: string | null;
  water?: string | null;
  apn?: string | null;
  lot_size?: string | null;
  legal_name?: string | null;
  legal_description?: string | null;
  property_class?: string | null;
  county_name?: string | null;
  elementary_school_district?: string | null;
  high_school_district?: string | null;
  zoning?: string | null;
  flood_zone?: string | null;
  tax_year?: string | null;
  tax_amount?: string | null;
  assessment_year?: string | null;
  total_assessed_value?: string | null;
  assessed_improvement_value?: string | null;
  total_market_value?: string | null;
  amenities?: string | null;
  // Supabase column names (snake_case) — may be on listing root or in other
  number_of_buildings?: string | number | null;
  number_of_commercial_units?: string | number | null;
  heating_fuel?: string | null;
  roof_type?: string | null;
  roof_cover?: string | null;
  other_rooms?: string | null;
  standardized_land_use?: string | null;
  county_land_use_code?: string | null;
  census_tract?: string | null;
  lot_width?: string | number | null;
  lot_depth?: string | number | null;
  lot_number?: string | null;
  num_fireplaces?: string | number | null;
  floor_cover?: string | null;
  num_units?: string | number | null;
  num_buildings?: string | number | null;
  num_commercial_units?: string | number | null;
  lot_size_sqft?: string | number | null;
}

// Read value from listing root or listing.other using Supabase column names (snake_case)
function listingVal(listing: Listing | null, key: string): string | number | null | undefined {
  if (!listing) return undefined;
  const v = (listing as any)[key];
  if (v != null && v !== "") return v;
  const o = (listing.other as Record<string, unknown>) ?? {};
  const w = o[key];
  if (w != null && w !== "") return w as string | number;
  return undefined;
}

function listingStr(listing: Listing | null, key: string, fallback: string): string {
  const v = listingVal(listing, key);
  if (v == null || v === "") return fallback;
  return String(v).trim();
}

interface LeadDetailModalProps {
  listingId: string | null;
  listingList: Listing[]; // Array of all listings for pagination
  onClose: () => void;
  onUpdate?: (updatedListing: Listing) => void;
  /** Supabase table name for this category (e.g. fsbo_leads). Used for fetch/update when not "listings". */
  sourceTable?: string | null;
}

// Scrollable photo carousel from photos_json — shown first in the left panel
function PropertyPhotoCarousel({ listing }: { listing: Listing | null }) {
  const urls = useMemo(() => getPhotoUrls(listing?.photos_json), [listing?.photos_json]);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIndex(0);
  }, [listing?.listing_id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || urls.length <= 1) return;
    const onScroll = () => {
      const width = el.offsetWidth;
      const i = Math.round(el.scrollLeft / width);
      setIndex(Math.min(i, urls.length - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [urls.length]);

  if (!urls.length) return null;

  const go = (delta: number) => {
    const next = (index + delta + urls.length) % urls.length;
    scrollRef.current?.querySelector(`[data-photo-index="${next}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setIndex(next);
  };

  // Same display rules for every carousel image: preserve aspect ratio, no upscaling, consistent quality
  const carouselImgClassName = "w-full h-full object-contain bg-gray-900";
  const carouselImgStyle = { imageRendering: "auto" as const };

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-900">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-0 flex-1 min-h-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {urls.map((url, i) => (
          <div
            key={i}
            data-photo-index={i}
            className="flex-shrink-0 w-full h-full snap-center bg-gray-900 min-w-full"
          >
            <img
              src={url}
              alt={`Property photo ${i + 1}`}
              className={carouselImgClassName}
              style={carouselImgStyle}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
        {urls.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to photo ${i + 1}`}
            onClick={() => {
              setIndex(i);
              scrollRef.current?.querySelector(`[data-photo-index="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }}
            className={`w-2 h-2 rounded-full pointer-events-auto transition-colors ${i === index ? "bg-white" : "bg-white/50 hover:bg-white/80"}`}
          />
        ))}
      </div>
      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
}

const VALID_LISTING_TABLES = ['listings', 'expired_listings', 'fsbo_leads', 'frbo_leads', 'imports', 'foreclosure_listings', 'probate_leads', 'trash'];

export default function LeadDetailModal({
  listingId,
  listingList,
  onClose,
  onUpdate,
  sourceTable,
}: LeadDetailModalProps) {
  const tableName = sourceTable && VALID_LISTING_TABLES.includes(sourceTable) ? sourceTable : 'listings';
  const { profile } = useApp();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showOwnerSelector, setShowOwnerSelector] = useState(false);
  const [showListsManager, setShowListsManager] = useState(false);
  const [showTagsInput, setShowTagsInput] = useState(false);
  const autoAssignRef = useRef(false);
  const streetViewContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  // Use listing from listingList directly for instant load, only fetch if needed for updates
  useEffect(() => {
    if (!listingId) return;

    const index = listingList.findIndex((l) => l.listing_id === listingId);
    if (index >= 0) {
      setCurrentIndex(index);
      // Use the listing from the list directly - no need to fetch
      setListing(listingList[index]);
    }
  }, [listingId, listingList]);

  useEffect(() => {
    if (!listing) return;
    setIsSaved(!!listing.in_crm);
  }, [listing]);

  useEffect(() => {
    autoAssignRef.current = false;
  }, [listing?.listing_id]);


  const fetchListing = useCallback(
    async (id: string) => {
      // Only fetch if we need fresh data (e.g., after updates). Use source table so fsbo_leads etc. return all columns.
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("listing_id", id)
          .single();

        if (error) {
          console.error("Error fetching listing:", error);
          // Fallback to listing from list if fetch fails
          const fallbackListing = listingList.find((l) => l.listing_id === id);
          setListing(fallbackListing || null);
        } else {
          setListing(data);
        }
      } catch (err) {
        console.error("Error:", err);
        // Fallback to listing from list if fetch fails
        const fallbackListing = listingList.find((l) => l.listing_id === id);
        setListing(fallbackListing || null);
      } finally {
        setLoading(false);
      }
    },
    [supabase, listingList, tableName]
  );

  const handleUpdate = useCallback(
    async (updates: Partial<Listing>) => {
      if (!listing) return;

      try {
        const { data, error } = await supabase
          .from(tableName)
          .update(updates)
          .eq("listing_id", listing.listing_id)
          .select()
          .single();

        if (error) {
          console.error("Failed to update listing:", error);
          return;
        }

        setListing(data);
        onUpdate?.(data);
      } catch (err) {
        console.error("Error updating listing:", err);
      }
    },
    [listing, supabase, onUpdate, tableName]
  );

  useEffect(() => {
    if (!listing || !profile?.id || autoAssignRef.current) return;
    if (!listing.owner_id) {
      autoAssignRef.current = true;
      handleUpdate({ owner_id: profile.id });
    }
  }, [listing, profile?.id, handleUpdate]);

  const handleSaveListing = useCallback(async () => {
    if (!listing || !profile?.id) return;
    if (isSaved || isSaving) return;

    const sourceId = listing.listing_id || listing.property_url;
    if (!sourceId) return;

    setIsSaving(true);
    try {
      await add_to_list(supabase, profile.id, sourceId, listing, undefined, "all");
      setIsSaved(true);
      setListing((prev) => (prev ? { ...prev, in_crm: true } : prev));
    } catch (error) {
      console.error("Error saving listing:", error);
    } finally {
      setIsSaving(false);
    }
  }, [listing, profile?.id, isSaved, isSaving, supabase]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      // Use listing directly from list - no fetch needed
      setListing(listingList[newIndex]);
    }
  };

  const goToNext = () => {
    if (currentIndex < listingList.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      // Use listing directly from list - no fetch needed
      setListing(listingList[newIndex]);
    }
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Handle arrow keys for navigation
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        const newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
        setListing(listingList[newIndex]);
      }
      if (e.key === "ArrowRight" && currentIndex < listingList.length - 1) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        setListing(listingList[newIndex]);
      }
    };
    window.addEventListener("keydown", handleArrowKeys);
    return () => window.removeEventListener("keydown", handleArrowKeys);
  }, [currentIndex, listingList]);

  if (!listingId) return null;

  // Memoize address calculations
  const address = useMemo(() => {
    if (!listing) return "Address not available";

    const hasValue = (val: any): boolean =>
      val != null && String(val).trim().length > 0;

    // Try direct fields first
    const parts = [
      listing.street,
      listing.city,
      listing.state,
      listing.zip_code,
    ]
      .filter((val) => hasValue(val))
      .map((val) => String(val).trim());

    if (parts.length > 0) {
      return parts.join(", ");
    }

    // Check other JSONB field for alternative address fields
    if (listing.other) {
      const other = listing.other as any;
      const otherParts = [
        other.address,
        other.street_address,
        other.full_address,
        other.city,
        other.state,
        other.zip,
        other.zip_code,
        other.postal_code,
      ]
        .filter((val) => hasValue(val))
        .map((val) => String(val).trim());

      if (otherParts.length > 0) {
        return otherParts.join(", ");
      }
    }

    return "Address not available";
  }, [listing]);

  // Helper function to check if a value is actually present (not null, undefined, or empty string)
  const hasValue = (val: any): boolean => {
    return val != null && String(val).trim().length > 0;
  };

  // Build streetAddress - use street if available, otherwise try to build from available fields
  const streetAddress = useMemo(() => {
    if (!listing) return "";

    // Try direct street field first
    if (hasValue(listing.street)) {
      return String(listing.street).trim();
    }

    // Check other JSONB field for alternative address fields
    if (listing.other) {
      const other = listing.other as any;
      // Check for common alternative field names
      if (hasValue(other.address)) {
        return String(other.address).trim();
      }
      if (hasValue(other.street_address)) {
        return String(other.street_address).trim();
      }
      if (hasValue(other.full_address)) {
        return String(other.full_address).trim();
      }
    }

    // If no street, try to build from city, state, zip
    const cityStateZip = [listing.city, listing.state, listing.zip_code]
      .filter((val) => hasValue(val))
      .map((val) => String(val).trim())
      .join(", ");

    if (cityStateZip) {
      return cityStateZip;
    }

    // Check other JSONB for city/state/zip
    if (listing.other) {
      const other = listing.other as any;
      const otherCityStateZip = [
        other.city,
        other.state,
        other.zip,
        other.zip_code,
        other.postal_code,
      ]
        .filter((val) => hasValue(val))
        .map((val) => String(val).trim())
        .join(", ");

      if (otherCityStateZip) {
        return otherCityStateZip;
      }
    }

    // If still nothing, try property_url as last resort
    if (listing.property_url) {
      return "Property Listing";
    }

    return "";
  }, [listing]);

  const cityStateZip = useMemo(() => {
    if (!listing) return "";

    const hasValue = (val: any): boolean =>
      val != null && String(val).trim().length > 0;

    const parts = [listing.city, listing.state, listing.zip_code]
      .filter((val) => hasValue(val))
      .map((val) => String(val).trim());

    // Also check other JSONB if direct fields are empty
    if (parts.length === 0 && listing.other) {
      const other = listing.other as any;
      const otherParts = [
        other.city,
        other.state,
        other.zip,
        other.zip_code,
        other.postal_code,
      ]
        .filter((val) => hasValue(val))
        .map((val) => String(val).trim());

      if (otherParts.length > 0) {
        return otherParts.join(", ");
      }
    }

    return parts.join(", ");
  }, [listing]);

  // Memoize property badges
  const propertyBadges = useMemo(() => {
    const badges: string[] = [];
    if (listing?.status && listing.status.toLowerCase().includes("off"))
      badges.push("Off Market");
    if (
      listing?.list_price &&
      listing?.last_sale_price &&
      listing.list_price >= listing.last_sale_price * 1.5
    ) {
      badges.push("High Equity");
    }
    if (!listing?.agent_email && !listing?.agent_phone)
      badges.push("Free And Clear");
    if (listing?.year_built && listing.year_built < 1970)
      badges.push("Senior Property");
    return badges;
  }, [
    listing?.status,
    listing?.list_price,
    listing?.last_sale_price,
    listing?.agent_email,
    listing?.agent_phone,
    listing?.year_built,
  ]);

  const tabLabels: Record<TabType, string> = {
    info: "Details",
    comps: "Comps",
    mail: "Owner",
    activity: "Activity",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Property details"
    >
      <div
        className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl border border-gray-100 flex overflow-hidden relative shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - absolute top right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/90 hover:bg-white text-gray-400 hover:text-gray-900 transition-colors shadow-sm"
          aria-label="Close"
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Left Panel: one view only — full-height carousel when photos exist, else full-height Street View (55%) */}
        <div ref={streetViewContainerRef} className="hidden lg:block lg:w-[55%] h-full bg-gray-900 group overflow-hidden relative">
          {listing && getPhotoUrls(listing.photos_json).length > 0 ? (
            /* Entire left side = photo carousel only */
            <div className="absolute inset-0 flex flex-col">
              <PropertyPhotoCarousel listing={listing} />
              <div className="absolute top-4 left-6">
                <div className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2.5 rounded-lg flex flex-col shadow-lg">
                  <span className="font-bold text-base tracking-tight">
                    {streetAddress || "Address not available"}
                  </span>
                  <span className="text-white/70 text-xs font-light">
                    {cityStateZip}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* No photos: entire left side = Google Maps Street View */
            <>
              <div className="absolute inset-0 min-h-[400px]">
                {listing && <StreetViewPanorama listing={listing} containerRef={streetViewContainerRef} />}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/5 pointer-events-none" />
              <div className="absolute top-4 left-6">
                <div className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2.5 rounded-lg flex flex-col shadow-lg">
                  <span className="font-bold text-base tracking-tight">
                    {streetAddress || "Address not available"}
                  </span>
                  <span className="text-white/70 text-xs font-light">
                    {cityStateZip}
                  </span>
                </div>
              </div>
              <div className="absolute bottom-3 left-4 text-[11px] text-white/50 font-medium tracking-wide">
                © {new Date().getFullYear()} Google
              </div>
            </>
          )}
        </div>

        {/* Right Panel: Content (45%) - scaled to 90% with ratios preserved */}
        <div className="w-full lg:w-[45%] h-full flex flex-col bg-white relative overflow-hidden">
          <div className="flex flex-col h-full flex-1 min-h-0" style={{ width: '111.11%', minHeight: '111.11%', transform: 'scale(0.9)', transformOrigin: 'top left' }}>
          <div className="flex-grow overflow-y-auto px-10 py-10 min-h-0">
            {/* Header: Address + Share / Favorite */}
            <div className="mb-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 leading-none tracking-tight">
                    {streetAddress || "Address not available"}
                  </h1>
                  <p className="text-slate-500 mt-2 text-lg font-light">
                    {cityStateZip || "—"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveListing}
                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors border border-transparent hover:border-red-100"
                    aria-label="Save this listing"
                    title="Save this listing"
                    disabled={isSaving || isSaved}
                  >
                    <Heart
                      size={20}
                      className={isSaved ? "fill-red-500 text-red-500" : ""}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOwnerSelector(!showOwnerSelector)}
                    className="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:text-zinc-900 hover:bg-gray-50 rounded-full transition-colors"
                    aria-label="Assign owner"
                    title="Assign owner"
                  >
                    <User size={20} />
                    {listing?.owner_id && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white">
                        1
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowListsManager(!showListsManager)}
                    className="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:text-zinc-900 hover:bg-gray-50 rounded-full transition-colors"
                    aria-label="Add to lists"
                    title="Add to lists"
                  >
                    <List size={20} />
                    {(listing?.lists?.length ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white">
                        {listing!.lists!.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTagsInput(!showTagsInput)}
                    className="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:text-zinc-900 hover:bg-gray-50 rounded-full transition-colors"
                    aria-label="Manage Tags"
                    title="Manage Tags"
                  >
                    <Tag size={20} />
                    {(listing?.tags?.length ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white">
                        {listing!.tags!.length}
                      </span>
                    )}
                  </button>
                  <div className="relative" title="Add to pipeline" aria-label="Add to pipeline">
                    <PipelineDropdown
                      value={listing?.pipeline_status || "new"}
                      onChange={(pipeline_status) =>
                        handleUpdate({ pipeline_status })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-extrabold text-slate-900 tracking-tighter">
                  {listing?.list_price
                    ? `$${listing.list_price.toLocaleString()}`
                    : "—"}
                </span>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                    Est. Value
                  </span>
                  {propertyBadges.length > 0 ? (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-0.5">
                      {propertyBadges[0]}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-0.5">
                      Free & Clear
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-100 mb-8 sticky top-0 bg-white z-10 pt-2">
              {(["info", "comps", "mail", "activity"] as TabType[]).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? "text-zinc-900 border-zinc-900 font-semibold" : "text-slate-500 hover:text-slate-900 border-transparent"}`}
                  >
                    {tabLabels[tab]}
                  </button>
                )
              )}
            </div>

            {/* Tab Content */}
            <div className="space-y-10">
              {activeTab === "info" && <InfoTab listing={listing} />}
              {activeTab === "comps" && <CompsTab />}
              {activeTab === "mail" && <MailTab />}
              {activeTab === "activity" && <ActivityTab />}
            </div>
          </div>

          {/* Conditional Popups - absolute within right panel */}
          {showOwnerSelector && (
            <div className="absolute top-20 right-10 z-[60] bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[280px]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-slate-900">
                  Assign Owner
                </label>
                <button
                  type="button"
                  onClick={() => setShowOwnerSelector(false)}
                  className="p-1 text-slate-500 hover:text-slate-900"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <OwnerSelector
                supabase={supabase}
                value={listing?.owner_id || null}
                onChange={(owner_id) => {
                  handleUpdate({ owner_id });
                  setShowOwnerSelector(false);
                }}
              />
            </div>
          )}
          {showListsManager && (
            <div className="absolute top-20 right-10 z-[60] bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[280px]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-slate-900">
                  Manage Lists
                </label>
                <button
                  type="button"
                  onClick={() => setShowListsManager(false)}
                  className="p-1 text-slate-500 hover:text-slate-900"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <ListsManager
                supabase={supabase}
                listing={listing}
                onChange={(lists) => handleUpdate({ lists })}
              />
            </div>
          )}
          {showTagsInput && (
            <div className="absolute top-20 right-10 z-[60] bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[280px]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-slate-900">
                  Manage Tags
                </label>
                <button
                  type="button"
                  onClick={() => setShowTagsInput(false)}
                  className="p-1 text-slate-500 hover:text-slate-900"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <TagsInput
                supabase={supabase}
                initialTags={listing?.tags || []}
                onChange={(tags) => handleUpdate({ tags })}
              />
            </div>
          )}

          {/* Footer: Pagination + View Full Listing */}
          <div className="px-10 py-6 border-t border-gray-100 bg-white/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={goToPrevious}
                disabled={currentIndex <= 0}
                className="text-slate-500 hover:text-slate-900 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-500"
              >
                <ChevronLeft
                  size={18}
                  className="group-hover:-translate-x-1 transition-transform"
                />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={currentIndex >= listingList.length - 1}
                className="text-slate-500 hover:text-slate-900 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-500"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
            <div className="text-xs font-medium text-slate-400 tracking-wide hidden sm:block">
              Item {currentIndex + 1} / {listingList.length}
            </div>
            {listing?.listing_id ? (
              <Link
                href={`/dashboard/map?listingId=${encodeURIComponent(listing.listing_id)}`}
                className="px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-gray-200 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                onClick={() => onClose()}
              >
                View On Map
                <ExternalLink size={14} />
              </Link>
            ) : (
              <span className="px-8 py-3.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-semibold cursor-not-allowed">
                View On Map
              </span>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Interactive Street View Panorama component
function StreetViewPanorama({ 
  listing, 
  containerRef 
}: { 
  listing: Listing | null;
  containerRef?: React.RefObject<HTMLDivElement>;
}) {
  const panoramaRef = useRef<HTMLDivElement>(null);
  const panoramaInstanceRef = useRef<google.maps.StreetViewPanorama | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [apiReadyAttempt, setApiReadyAttempt] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!listing || !panoramaRef.current) return;

    // ✅ Ensure Maps JS is ready - retry if not available yet
    if (typeof window === "undefined" || !window.google?.maps) {
      // Try again in 100ms (faster retry), but cap the number of attempts (30 attempts = 3 seconds max)
      if (apiReadyAttempt < 30) {
        const id = window.setTimeout(
          () => setApiReadyAttempt((a) => a + 1),
          100
        );
        return () => window.clearTimeout(id);
      }
      setError("Google Maps API not loaded");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const initializeStreetView = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get coordinates - ALWAYS prefer stored lat/lng from database first
        // Only geocode as a fallback if coordinates are missing
        let position: { lat: number; lng: number } | null = null;

        // Priority 1: Use stored lat/lng from database (fastest path)
        if (listing.lat != null && listing.lng != null) {
          position = {
            lat: Number(listing.lat),
            lng: Number(listing.lng),
          };
        }
        // Priority 2: Check for latitude/longitude fields (for probate_leads compatibility)
        else if (listing.latitude != null && listing.longitude != null) {
          position = {
            lat: Number(listing.latitude),
            lng: Number(listing.longitude),
          };
        }
        // Priority 3: Fallback to geocoding (only if no stored coordinates)
        else {
          // Geocode address as last resort
          const address = buildAddressString(listing);
          if (address) {
            try {
              const result = await geocodeAddress(address);
              position = { lat: result.lat, lng: result.lng };
            } catch (geocodeError) {
              console.warn("Geocoding failed:", geocodeError);
              setError("Could not find location for this address");
              setIsLoading(false);
              return;
            }
          }
        }

        if (!position) {
          setError("No location data available");
          setIsLoading(false);
          return;
        }

        // Ensure the container element exists
        if (!panoramaRef.current) {
          setError("Street View container not available");
          setIsLoading(false);
          return;
        }

        if (cancelled || !panoramaRef.current) return;

        // Create or update Street View panorama
        if (!panoramaInstanceRef.current) {
          panoramaInstanceRef.current =
            new window.google.maps.StreetViewPanorama(panoramaRef.current, {
              position,
              pov: { heading: 0, pitch: 0 },
              zoom: 1,
              addressControl: true,
              zoomControl: true,
              fullscreenControl: true,
              panControl: true,
              linksControl: true,
              enableCloseButton: false,
            });

          // Listen for panorama status changes
          window.google.maps.event.addListener(
            panoramaInstanceRef.current,
            "status_changed",
            () => {
              const status = panoramaInstanceRef.current?.getStatus();
              if (status === "OK") {
                setIsLoading(false);
                setError(null);
              } else if (status === "ZERO_RESULTS") {
                setError("Street View is not available for this location");
                setIsLoading(false);
              } else {
                setError("Street View could not be loaded");
                setIsLoading(false);
              }
            }
          );

          setIsInitialized(true);
        } else {
          // Update position if panorama already exists
          panoramaInstanceRef.current.setPosition(position);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Error initializing Street View:", err);
        if (!cancelled) {
          setError(err.message || "Failed to load Street View");
          setIsLoading(false);
        }
      }
    };

    // Start initialization immediately (no delay needed if container is already visible)
    initializeStreetView();

    return () => {
      cancelled = true;
      if (panoramaInstanceRef.current) {
        window.google.maps.event.clearInstanceListeners(
          panoramaInstanceRef.current
        );
        panoramaInstanceRef.current.setVisible(false);
      }
    };
  }, [
    listing?.listing_id,
    listing?.lat,
    listing?.lng,
    listing?.street,
    listing?.city,
    listing?.state,
    listing?.zip_code,
    apiReadyAttempt,
  ]);

  // Fullscreen functionality
  const toggleFullscreen = useCallback(() => {
    if (!containerRef?.current) return;

    const element = containerRef.current;

    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (element.requestFullscreen) {
        element.requestFullscreen().catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
      } else if ((element as any).webkitRequestFullscreen) {
        // Safari
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        // IE/Edge
        (element as any).msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [containerRef]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Fallback to static image if Street View fails
  if (error && listing) {
    const lat = listing.lat ? Number(listing.lat) : null;
    const lng = listing.lng ? Number(listing.lng) : null;
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (lat && lng && googleMapsApiKey) {
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=640x480&markers=color:red%7C${lat},${lng}&key=${googleMapsApiKey}`;
      return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <img
            src={staticMapUrl}
            alt="Property location"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              right: "10px",
              background: "rgba(0, 0, 0, 0.7)",
              color: "white",
              padding: "8px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        </div>
      );
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            zIndex: 1,
          }}
        >
          <div
            style={{
              textAlign: "center",
              color: "#6b7280",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid #e5e7eb",
                borderTop: "3px solid #3b82f6",
                borderRadius: "50%",
                margin: "0 auto 12px",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <div>Loading Street View...</div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            color: "#6b7280",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: "14px",
            textAlign: "center",
            padding: "20px",
            zIndex: 1,
          }}
        >
          <div>
            <MapPin size={48} style={{ marginBottom: "12px", opacity: 0.5 }} />
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Street View container */}
      <div
        ref={panoramaRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
        }}
      />

      {/* Fullscreen button overlay */}
      {containerRef && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all backdrop-blur-sm border border-white/20 shadow-lg"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize size={18} />
          ) : (
            <Maximize size={18} />
          )}
        </button>
      )}
    </div>
  );
}

// Info Tab Component
function InfoTab({ listing }: { listing: Listing | null }) {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showMoreLandInfo, setShowMoreLandInfo] = useState(false);
  const [showMoreTaxInfo, setShowMoreTaxInfo] = useState(false);
  const [helpTooltip, setHelpTooltip] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Smooth expand animation with scroll
  const handleExpand = (
    setter: (val: boolean) => void,
    currentValue: boolean
  ) => {
    setIsAnimating(true);
    setter(!currentValue);
    setTimeout(() => {
      setIsAnimating(false);
      if (!currentValue) {
        // Smooth scroll to expanded section
        const expandedSection = document.querySelector(
          "[data-expanded-section]"
        );
        if (expandedSection) {
          expandedSection.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    }, 100);
  };

  // Add smooth scroll effect when sections expand
  useEffect(() => {
    if (showMoreDetails || showMoreLandInfo || showMoreTaxInfo) {
      const timer = setTimeout(() => {
        const expandedSection = document.querySelector(
          "[data-expanded-section]"
        );
        if (expandedSection) {
          expandedSection.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showMoreDetails, showMoreLandInfo, showMoreTaxInfo]);

  // Calculate bathrooms display - format with proper decimals
  const bathroomsDisplay =
    listing?.full_baths !== null && listing?.full_baths !== undefined
      ? formatBaths(listing.full_baths)
      : "--";

  // Property details: read from listing / listing.other using Supabase column names
  const propertyDetails = [
    {
      label: "Living area",
      value: (listingStr(listing, "living_area", "") || (listing?.sqft ? `${listing.sqft.toLocaleString()} sqft` : "") || "--"),
      help: "Total square footage of living space in the property",
    },
    {
      label: "Year built",
      value: listingStr(listing, "year_built_pagination", listing?.year_built?.toString() ?? "--"),
      help: "The year the property was originally constructed",
    },
    {
      label: "Bedrooms",
      value: listingStr(listing, "bedrooms", listing?.beds?.toString() ?? "--"),
      help: "Number of bedrooms in the property",
    },
    {
      label: "Bathrooms",
      value: listingStr(listing, "bathrooms", bathroomsDisplay),
      help: "Number of full and half bathrooms",
    },
    {
      label: "Property type",
      value: listingStr(listing, "property_type", "Single Family"),
      help: "The type of property (e.g., Single Family, Condo, Townhouse)",
    },
    {
      label: "Construction type",
      value: listingStr(listing, "construction_type", "Frame"),
      help: "Primary construction material used for the property",
    },
    {
      label: "Building style",
      value: listingStr(listing, "building_style", "Conventional"),
      help: "Architectural style of the building",
    },
    {
      label: "Effective year built",
      value: listingStr(listing, "effective_year_built", listing?.year_built?.toString() ?? "--"),
      help: "Year of construction after accounting for major renovations",
    },
    {
      label: "Number of units",
      value: listingStr(listing, "number_of_units", listingStr(listing, "num_units", "--")),
      help: "Total number of residential units in the property",
    },
    {
      label: "Number of buildings",
      value: listingStr(listing, "number_of_buildings", listingStr(listing, "num_buildings", "--")),
      help: "Number of separate buildings on the property",
    },
    {
      label: "Number of commercial units",
      value: listingStr(listing, "number_of_commercial_units", listingStr(listing, "num_commercial_units", "--")),
      help: "Number of commercial units if mixed-use property",
    },
    {
      label: "Stories",
      value: listingStr(listing, "stories", "2 Stories"),
      help: "Number of stories or levels in the building",
    },
    {
      label: "Garage area",
      value: listingStr(listing, "garage", "--"),
      help: "Garage (Supabase column: garage)",
    },
    {
      label: "Heating type",
      value: listingStr(listing, "heating_type", "Heat Pump"),
      help: "Type of heating system installed",
    },
    {
      label: "Heating fuel",
      value: listingStr(listing, "heating_fuel", listingStr(listing, "heating_gas", "--")),
      help: "Fuel source for the heating system",
    },
    {
      label: "Air conditioning",
      value: listingStr(listing, "air_conditioning", "Central"),
      help: "Type of air conditioning system",
    },
    {
      label: "Basement",
      value: listingStr(listing, "basement", "--"),
      help: "Presence and type of basement",
    },
    {
      label: "Deck",
      value: listingStr(listing, "deck", "No"),
      help: "Whether the property has a deck",
    },
    {
      label: "Exterior walls",
      value: listingStr(listing, "exterior_walls", "Siding (Alum/Vinyl)"),
      help: "Material used for exterior walls",
    },
    {
      label: "Interior Walls",
      value: listingStr(listing, "interior_walls", "Gypsum Board/Drywall/Sheetrock/Wallboard"),
      help: "Material used for interior walls",
    },
    {
      label: "Number of fireplaces",
      value: listingStr(listing, "number_of_fireplaces", listingStr(listing, "num_fireplaces", "1")),
      help: "Total number of fireplaces in the property",
    },
    {
      label: "Floor cover",
      value: listingStr(listing, "floor_cover", listingStr(listing, "flooring_cover", "--")),
      help: "Primary flooring material",
    },
    {
      label: "Garage",
      value: listingStr(listing, "garage", "Attached Garage"),
      help: "Type and configuration of garage",
    },
    {
      label: "Driveway",
      value: listingStr(listing, "driveway", "--"),
      help: "Type of driveway surface",
    },
    {
      label: "Amenities",
      value: listingStr(listing, "amenities", "--"),
      help: "Special features and amenities of the property",
    },
    {
      label: "Other rooms",
      value: listingStr(listing, "other_rooms", "--"),
      help: "Additional rooms beyond standard bedrooms and bathrooms",
    },
    {
      label: "Pool",
      value: listingStr(listing, "pool", "No"),
      help: "Whether the property has a pool",
    },
    {
      label: "Patio",
      value: listingStr(listing, "patio", "--"),
      help: "Presence and type of patio",
    },
    {
      label: "Porch",
      value: listingStr(listing, "porch", "--"),
      help: "Presence and type of porch",
    },
    {
      label: "Roof cover",
      value: listingStr(listing, "roof_cover", listingStr(listing, "roof", "Asphalt")),
      help: "Material used for roof covering",
    },
    {
      label: "Roof type",
      value: listingStr(listing, "roof_type", "Gable"),
      help: "Architectural style of the roof",
    },
    {
      label: "Sewer",
      value: listingStr(listing, "sewer", "--"),
      help: "Type of sewer system (public, septic, etc.)",
    },
    {
      label: "Topography",
      value: listingStr(listing, "topography", "--"),
      help: "Land topography and terrain features",
    },
    {
      label: "Water",
      value: listingStr(listing, "water", "--"),
      help: "Water source and supply type",
    },
    {
      label: "Geographic features",
      value: listingStr(listing, "geographic_features", "--"),
      help: "Notable geographic features near the property",
    },
  ];

  // Land information: Supabase columns (legal_description, lot_size, property_class, etc.)
  const lotSizeRaw = listingVal(listing, "lot_size") ?? listingVal(listing, "lot_size_sqft");
  const lotSizeDisplay = (() => {
    if (lotSizeRaw == null || lotSizeRaw === "") return "--";
    if (typeof lotSizeRaw === "number") return `${lotSizeRaw.toLocaleString()} sqft`;
    const s = String(lotSizeRaw).trim();
    if (s.toLowerCase().includes("sqft")) return s;
    const num = parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    return num ? `${num.toLocaleString()} sqft` : s || "--";
  })();

  const landDetails = [
    {
      label: "APN (Parcel ID)",
      value: listingStr(listing, "apn", listingStr(listing, "parcel_id", "--")),
      help: "Assessor Parcel Number - unique identifier for the property parcel",
    },
    {
      label: "Lot size (Sqft)",
      value: lotSizeDisplay,
      help: "Total lot size in square feet (Supabase: lot_size)",
    },
    {
      label: "Legal description",
      value: listingStr(listing, "legal_description", "--"),
      help: "Official legal description of the property as recorded in public records",
    },
    {
      label: "Subdivision name",
      value: listingStr(listing, "legal_name", listingStr(listing, "subdivision_name", "--")),
      help: "Name of the subdivision or development where the property is located",
    },
    {
      label: "Property class",
      value: listingStr(listing, "property_class", "Residential"),
      help: "Classification of the property type (Residential, Commercial, etc.)",
    },
    {
      label: "Standardized Land Use",
      value: listingStr(listing, "standardized_land_use", "Single Family Residential"),
      help: "Standardized classification of land use type",
    },
    {
      label: "County land use code",
      value: listingStr(listing, "county_land_use_code", "--"),
      help: "County-specific code for land use classification",
    },
    {
      label: "County name",
      value: listingStr(listing, "county_name", listing?.city ? `${listing.city} City` : "--"),
      help: "Name of the county where the property is located",
    },
    {
      label: "Census tract",
      value: listingStr(listing, "census_tract", "--"),
      help: "Census tract number for demographic and statistical purposes",
    },
    {
      label: "Lot Width (Ft)",
      value: listingStr(listing, "lot_width", listingStr(listing, "lot_width_ft", "--")),
      help: "Width of the lot in feet",
    },
    {
      label: "Lot Depth (Ft)",
      value: listingStr(listing, "lot_depth", listingStr(listing, "lot_depth_ft", "--")),
      help: "Depth of the lot in feet",
    },
    {
      label: "Lot number",
      value: listingStr(listing, "lot_number", "--"),
      help: "Lot number within the subdivision",
    },
    {
      label: "Elementary school district",
      value: listingStr(listing, "elementary_school_district", listingStr(listing, "school_district", "--")),
      help: "Elementary school district serving the property",
    },
    {
      label: "High school district",
      value: listingStr(listing, "high_school_district", "--"),
      help: "High school district serving the property",
    },
    {
      label: "Zoning",
      value: listingStr(listing, "zoning", "--"),
      help: "Zoning classification that determines permitted uses and building requirements",
    },
    {
      label: "Flood zone",
      value: listingStr(listing, "flood_zone", "--"),
      help: "FEMA flood zone designation",
    },
    {
      label: "Tax year",
      value: listingStr(listing, "tax_year", "--"),
      help: "Year of the tax assessment",
    },
    {
      label: "Tax amount",
      value: listingStr(listing, "tax_amount", "--"),
      help: "Property tax amount",
    },
    {
      label: "Assessment year",
      value: listingStr(listing, "assessment_year", "--"),
      help: "Year of the property assessment",
    },
    {
      label: "Total assessed value",
      value: listingStr(listing, "total_assessed_value", "--"),
      help: "Total assessed value of the property",
    },
    {
      label: "Assessed improvement value",
      value: listingStr(listing, "assessed_improvement_value", "--"),
      help: "Assessed value of improvements",
    },
    {
      label: "Total market value",
      value: listingStr(listing, "total_market_value", "--"),
      help: "Total market value of the property",
    },
  ];

  // Tax information: Supabase columns (tax_year, tax_amount, assessment_year, total_assessed_value, etc.)
  const formatCurrency = (v: string | number | null | undefined): string => {
    if (v == null || v === "") return "--";
    const n = typeof v === "string" ? parseFloat(String(v).replace(/[^0-9.-]/g, "")) : v;
    if (isNaN(n)) return String(v);
    return `$${Math.round(n).toLocaleString()}`;
  };

  const taxDetails = [
    {
      label: "Tax delinquent?",
      value: listingStr(listing, "tax_delinquent", "No"),
      help: "Whether the property has delinquent tax payments",
    },
    {
      label: "Tax delinquent year",
      value: listingStr(listing, "tax_delinquent_year", "--"),
      help: "Year in which taxes became delinquent",
    },
    {
      label: "Tax year",
      value: listingStr(listing, "tax_year", new Date().getFullYear().toString()),
      help: "Tax year for which the tax information applies",
    },
    {
      label: "Tax amount",
      value: formatCurrency(listingVal(listing, "tax_amount")),
      help: "Total annual property tax amount",
    },
    {
      label: "Assessment year",
      value: listingStr(listing, "assessment_year", new Date().getFullYear().toString()),
      help: "Year of the property assessment",
    },
    {
      label: "Total assessed value",
      value: formatCurrency(listingVal(listing, "total_assessed_value")),
      help: "Total assessed value of the property for tax purposes",
    },
    {
      label: "Assessed land value",
      value: formatCurrency(listingVal(listing, "assessed_land_value")),
      help: "Assessed value of the land portion",
    },
    {
      label: "Assessed improvement value",
      value: formatCurrency(listingVal(listing, "assessed_improvement_value")),
      help: "Assessed value of improvements (buildings, structures)",
    },
    {
      label: "Total market value",
      value: formatCurrency(listingVal(listing, "total_market_value")),
      help: "Total estimated market value of the property",
    },
    {
      label: "Market land value",
      value: formatCurrency(listingVal(listing, "market_land_value")),
      help: "Estimated market value of the land",
    },
    {
      label: "Market improvement value",
      value: formatCurrency(listingVal(listing, "market_improvement_value")),
      help: "Estimated market value of improvements",
    },
  ];

  // First 4 property facts for initial display (Living Area, Year Built, Bedrooms, Bathrooms)
  const displayPropertyFacts = propertyDetails.slice(0, 4);
  const morePropertyFacts = propertyDetails.slice(4);
  const displayLandDetails = landDetails.slice(0, 3);
  const moreLandDetailsDisplay = landDetails.slice(3);
  const displayTaxDetails = taxDetails.slice(0, 3);
  const moreTaxDetailsDisplay = taxDetails.slice(3);

  return (
    <div className="space-y-10">
      {/* Property Facts */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Property Facts
        </h3>
        <div className="divide-y divide-dashed divide-gray-200">
          {displayPropertyFacts.map((detail, idx) => (
            <div
              key={idx}
              className="py-3 flex justify-between items-center group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">
                  {detail.label}
                </span>
                <button
                  type="button"
                  onMouseEnter={() => setHelpTooltip(detail.label)}
                  onMouseLeave={() => setHelpTooltip(null)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-help"
                  title={detail.help}
                >
                  <Info size={16} className="text-gray-300" />
                </button>
              </div>
              <span className="text-base font-semibold text-slate-900">
                {detail.value}
              </span>
            </div>
          ))}
        </div>
        {morePropertyFacts.length > 0 && (
          <>
            {!showMoreDetails && (
              <button
                type="button"
                onClick={() =>
                  handleExpand(setShowMoreDetails, showMoreDetails)
                }
                className="mt-3 text-sm font-medium text-zinc-900 hover:text-zinc-800 flex items-center gap-1"
              >
                Show more facts
                <ChevronDown size={16} />
              </button>
            )}
            {showMoreDetails && (
              <div
                data-expanded-section
                className="divide-y divide-dashed divide-gray-200 mt-2"
              >
                {morePropertyFacts.map((detail, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-500">
                        {detail.label}
                      </span>
                      <button
                        type="button"
                        onMouseEnter={() => setHelpTooltip(detail.label)}
                        onMouseLeave={() => setHelpTooltip(null)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-help"
                        title={detail.help}
                      >
                        <Info size={16} className="text-gray-300" />
                      </button>
                    </div>
                    <span className="text-base font-semibold text-slate-900">
                      {detail.value}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    handleExpand(setShowMoreDetails, showMoreDetails)
                  }
                  className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  Show less
                  <ChevronDown size={16} className="rotate-180" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Land Details */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Land Details
        </h3>
        <div className="divide-y divide-dashed divide-gray-200">
          {displayLandDetails.map((detail, idx) => (
            <div
              key={idx}
              className="py-3 flex justify-between items-center group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">
                  {detail.label}
                </span>
                <button
                  type="button"
                  onMouseEnter={() => setHelpTooltip(detail.label)}
                  onMouseLeave={() => setHelpTooltip(null)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-help"
                  title={detail.help}
                >
                  <Info size={16} className="text-gray-300" />
                </button>
              </div>
              <span className="text-base font-semibold text-slate-900 font-mono">
                {detail.value}
              </span>
            </div>
          ))}
        </div>
        {moreLandDetailsDisplay.length > 0 && (
          <>
            {!showMoreLandInfo && (
              <button
                type="button"
                onClick={() =>
                  handleExpand(setShowMoreLandInfo, showMoreLandInfo)
                }
                className="mt-3 text-sm font-medium text-zinc-900 hover:text-zinc-800 flex items-center gap-1"
              >
                Show more land details
                <ChevronDown size={16} />
              </button>
            )}
            {showMoreLandInfo && (
              <div
                data-expanded-section
                className="divide-y divide-dashed divide-gray-200 mt-2"
              >
                {moreLandDetailsDisplay.map((detail, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-500">
                        {detail.label}
                      </span>
                      <button
                        type="button"
                        onMouseEnter={() => setHelpTooltip(detail.label)}
                        onMouseLeave={() => setHelpTooltip(null)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-help"
                        title={detail.help}
                      >
                        <Info size={16} className="text-gray-300" />
                      </button>
                    </div>
                    <span className="text-base font-semibold text-slate-900">
                      {detail.value}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    handleExpand(setShowMoreLandInfo, showMoreLandInfo)
                  }
                  className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  Show less
                  <ChevronDown size={16} className="rotate-180" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Tax Status */}
      <section className="pb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Tax Status
        </h3>
        <div className="divide-y divide-dashed divide-gray-200">
          {displayTaxDetails.map((detail, idx) => (
            <div
              key={idx}
              className="py-3 flex justify-between items-center group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">
                  {detail.label}
                </span>
              </div>
              {detail.label.toLowerCase().includes("delinquent") &&
              (detail.value === "Yes" || detail.value === "No") ? (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${detail.value === "No" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                >
                  {detail.value}
                </span>
              ) : (
                <span className="text-base font-semibold text-slate-900">
                  {detail.value}
                </span>
              )}
            </div>
          ))}
        </div>
        {moreTaxDetailsDisplay.length > 0 && (
          <>
            {!showMoreTaxInfo && (
              <button
                type="button"
                onClick={() =>
                  handleExpand(setShowMoreTaxInfo, showMoreTaxInfo)
                }
                className="mt-3 text-sm font-medium text-zinc-900 hover:text-zinc-800 flex items-center gap-1"
              >
                Show more tax details
                <ChevronDown size={16} />
              </button>
            )}
            {showMoreTaxInfo && (
              <div
                data-expanded-section
                className="divide-y divide-dashed divide-gray-200 mt-2"
              >
                {moreTaxDetailsDisplay.map((detail, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-500">
                        {detail.label}
                      </span>
                      <button
                        type="button"
                        onMouseEnter={() => setHelpTooltip(detail.label)}
                        onMouseLeave={() => setHelpTooltip(null)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-help"
                        title={detail.help}
                      >
                        <Info size={16} className="text-gray-300" />
                      </button>
                    </div>
                    <span className="text-base font-semibold text-slate-900">
                      {detail.value}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    handleExpand(setShowMoreTaxInfo, showMoreTaxInfo)
                  }
                  className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  Show less
                  <ChevronDown size={16} className="rotate-180" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// Comps Tab Component
function CompsTab() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Home size={48} style={{ color: "#d1d5db", marginBottom: "16px" }} />
      <h3
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "8px",
        }}
      >
        Comparable Properties
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "#6b7280",
          textAlign: "center",
          lineHeight: "1.6",
        }}
      >
        View similar properties in the area to help determine market value and
        investment potential.
      </p>
      <button
        style={{
          marginTop: "24px",
          padding: "10px 20px",
          background: "#6366f1",
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Find Comps
      </button>
    </div>
  );
}

// Mail Tab Component
function MailTab() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Mail size={48} style={{ color: "#d1d5db", marginBottom: "16px" }} />
      <h3
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "8px",
        }}
      >
        Mail Campaigns
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "#6b7280",
          textAlign: "center",
          lineHeight: "1.6",
        }}
      >
        Send direct mail campaigns to this property owner to generate leads and
        build relationships.
      </p>
      <button
        style={{
          marginTop: "24px",
          padding: "10px 20px",
          background: "#ef4444",
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Start Mail Campaign
      </button>
    </div>
  );
}

// Activity Tab Component
function ActivityTab() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Activity size={48} style={{ color: "#d1d5db", marginBottom: "16px" }} />
      <h3
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "8px",
        }}
      >
        Activity Timeline
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "#6b7280",
          textAlign: "center",
          lineHeight: "1.6",
        }}
      >
        Track all interactions, notes, and changes related to this property in
        one place.
      </p>
      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          background: "#f9fafb",
          borderRadius: "8px",
          width: "100%",
          textAlign: "center",
          fontSize: "14px",
          color: "#6b7280",
        }}
      >
        No activity yet
      </div>
    </div>
  );
}
