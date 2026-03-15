import { useState, useCallback, useMemo, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ============================================================================
// Type Definitions
// ============================================================================

export interface Listing {
  listing_id: string
  property_url?: string | null
  permalink?: string | null
  scrape_date?: string | null
  last_scraped_at?: string | null
  active?: boolean
  street?: string | null
  unit?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  beds?: number | null
  full_baths?: number | null
  half_baths?: number | null
  sqft?: number | null
  year_built?: number | null
  list_price?: number | null
  list_price_min?: number | null
  list_price_max?: number | null
  status?: string | null
  mls?: string | null
  agent_name?: string | null
  agent_email?: string | null
  agent_phone?: string | null
  agent_phone_2?: string | null
  listing_agent_phone_2?: string | null
  listing_agent_phone_5?: string | null
  /** Property description text from Supabase 'text' field */
  text?: string | null
  last_sale_price?: number | null
  last_sale_date?: string | null
  photos?: string | null
  photos_json?: any
  other?: any
  price_per_sqft?: number | null
  listing_source_name?: string | null
  listing_source_id?: string | null
  monthly_payment_estimate?: string | null
  ai_investment_score?: number | null
  time_listed?: string | null
  created_at?: string
  updated_at?: string
  in_crm?: boolean
  owner_id?: string | null
  tags?: string[] | null
  lists?: string[] | null
  pipeline_status?: string | null
  lat?: number | null
  lng?: number | null
  // Source table this listing came from (e.g. fsbo_leads, frbo_leads, foreclosure_listings)
  source_table?: string | null
  // Compatibility fields for probate_leads (which uses latitude/longitude)
  latitude?: number | null
  longitude?: number | null
  // FSBO / fsbo_leads property attributes (from Supabase schema)
  living_area?: string | null
  year_built_pagination?: string | null
  bedrooms?: string | null
  bathrooms?: string | null
  property_type?: string | null
  construction_type?: string | null
  building_style?: string | null
  effective_year_built?: string | null
  number_of_units?: string | null
  stories?: string | null
  garage?: string | null
  heating_type?: string | null
  heating_gas?: string | null
  air_conditioning?: string | null
  basement?: string | null
  deck?: string | null
  interior_walls?: string | null
  exterior_walls?: string | null
  fireplaces?: string | null
  flooring_cover?: string | null
  driveway?: string | null
  pool?: string | null
  patio?: string | null
  porch?: string | null
  roof?: string | null
  sewer?: string | null
  water?: string | null
  apn?: string | null
  lot_size?: string | null
  legal_name?: string | null
  legal_description?: string | null
  property_class?: string | null
  county_name?: string | null
  elementary_school_district?: string | null
  high_school_district?: string | null
  zoning?: string | null
  flood_zone?: string | null
  tax_year?: string | null
  tax_amount?: string | null
  assessment_year?: string | null
  total_assessed_value?: string | null
  assessed_improvement_value?: string | null
  total_market_value?: string | null
  amenities?: string | null
  // Skip-traced residents from property_skip_trace_residents (matched by property_url)
  current_residents?: ResidentRow[]
  previous_residents?: ResidentRow[]
}

/** One row from property_skip_trace_residents (Supabase). Schema: id, property_skip_trace_id, resident_index (1-10), resident_type, resident_name, resident_age, resident_phone_numbers, resident_previous_address, source_table, listing_id, property_url, street. */
export interface ResidentRow {
  resident_type?: string | null
  resident_name?: string | null
  resident_age?: string | null
  resident_phone_numbers?: string | null
  resident_previous_address?: string | null
}

export type FilterType = 'all' | 'expired' | 'probate' | 'fsbo' | 'frbo' | 'imports' | 'trash' | 'foreclosure' | 'high_value' | 'price_drop' | 'new_listings'

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_LISTINGS_TABLE = 'listings'

// Strictly typed mapping of FilterType to Supabase Table Name
const TABLE_MAPPING: Record<FilterType, string> = {
  all: DEFAULT_LISTINGS_TABLE, // Placeholder, handled specifically in logic
  expired: 'expired_listings',
  probate: 'probate_leads',
  fsbo: 'fsbo_leads',
  frbo: 'frbo_leads',
  imports: 'imports',
  trash: 'trash',
  foreclosure: 'foreclosure_listings',
  // Meta filters use the default table
  high_value: DEFAULT_LISTINGS_TABLE,
  price_drop: DEFAULT_LISTINGS_TABLE,
  new_listings: DEFAULT_LISTINGS_TABLE
}

const META_FILTERS = new Set<FilterType>(['all', 'high_value', 'price_drop', 'new_listings'])
const EXCLUSIVE_CATEGORY_FILTERS = new Set<FilterType>(['all', 'expired', 'probate', 'fsbo', 'frbo', 'imports', 'trash', 'foreclosure'])

// Resident data: property_skip_trace_residents table, matched by property_url
const RESIDENTS_TABLE_NAME = 'property_skip_trace_residents'
const CURRENT_RESIDENT_TYPES = new Set<string>(['Current', 'Owner-Occupant', 'owner-occupant', 'current'])
const API_PAGE_SIZE = 1000

// ============================================================================
// Helpers
// ============================================================================

export const getPrimaryCategory = (filters: Set<FilterType>): FilterType => {
  // Priority order for resolving the primary category
  const priorityOrder: FilterType[] = ['expired', 'probate', 'fsbo', 'frbo', 'imports', 'trash', 'foreclosure', 'all']
  
  // Find the first active filter that matches the priority order
  for (const priorityFilter of priorityOrder) {
    if (filters.has(priorityFilter)) {
      return priorityFilter
    }
  }
  
  return 'all'
}

// ============================================================================
// Hook
// ============================================================================

export function useProspectData(userId: string | undefined) {
  const supabase = createClientComponentClient()
  
  // State
  const [listings, setListings] = useState<Listing[]>([])
  const [allListings, setAllListings] = useState<Listing[]>([]) // For client-side filtering
  const [savedListings, setSavedListings] = useState<Listing[]>([])
  const [crmContactIds, setCrmContactIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  
  // Monotonic request id to prevent stale fetches from overwriting newer category loads.
  const activeRequestIdRef = useRef(0)

  /**
   * Resolves the correct table name for a given category.
   * Includes safeguards against category confusion (e.g. FSBO vs FRBO).
   */
  const getTableName = useCallback((category: FilterType): string => {
    return TABLE_MAPPING[category] || DEFAULT_LISTINGS_TABLE
  }, [])

  /**
   * Fetch a representative page from a listing table via the server paginated API.
   * We intentionally avoid hydrating every page into memory so large datasets
   * (100k-1M+) remain responsive; full pagination is handled in ProspectHoverTable.
   */
  const fetchAllRowsFromApi = useCallback(
    async (
      tableName: string,
      sortField: string,
      sortOrder: 'asc' | 'desc'
    ): Promise<{ rows: Listing[]; count: number }> => {
      const sortByMap: Record<string, string> = {
        date: 'created_at',
        price: 'list_price',
        score: 'ai_investment_score',
      }
      const sortBy = sortByMap[sortField] || 'created_at'

      const fetchPage = async (page: number) => {
        const params = new URLSearchParams({
          table: tableName,
          page: String(page),
          pageSize: String(API_PAGE_SIZE),
          sortBy,
          sortOrder,
        })

        const res = await fetch(`/api/listings/paginated?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error(`Failed fetching ${tableName} page ${page}: ${res.status} ${res.statusText}`)
        }

        const payload = await res.json()
        if (payload?.error) {
          throw new Error(
            `API error fetching ${tableName} page ${page}: ${String(payload.error)}`
          )
        }

        const pageRows = Array.isArray(payload?.data) ? (payload.data as Listing[]) : []
        const totalCount = Number(payload?.count || 0)
        return { pageRows, totalCount }
      }

      const first = await fetchPage(1)
      return { rows: first.pageRows, count: first.totalCount }
    },
    []
  )

  /**
   * Fetches IDs of listings that are already in the CRM.
   * Updates crmContactIds and savedListings state.
   */
  const fetchCrmContacts = useCallback(async (selectedFilters: Set<FilterType>) => {
    if (!userId) return

    try {
      // 1. Get contact IDs for this user that came from listings, filtered by category
      const activeCategory = getPrimaryCategory(selectedFilters)
      
      let contactsQuery = supabase
        .from('contacts')
        .select('source_id, tags')
        .eq('user_id', userId)
        .eq('source', 'listing')
        .not('source_id', 'is', null)

      // Filter by category: for "all" show all saved, for specific categories filter by tag
      if (activeCategory !== 'all') {
        // Filter contacts that have this category in their tags array
        // Supabase PostgREST: use contains operator to check if array contains value
        contactsQuery = contactsQuery.contains('tags', [activeCategory])
      }
      // For "all", don't add category filter - show all saved contacts

      const { data: contactRows } = await contactsQuery
      const contacts = (contactRows || []) as { source_id?: string | null; tags?: string[] | null }[]

      if (!contacts || contacts.length === 0) {
        setCrmContactIds(new Set())
        setSavedListings([])
        return
      }

      const ids = new Set(contacts.map((c) => c.source_id).filter(Boolean) as string[])
      setCrmContactIds(ids)

      // 2. Fetch the full listing details for these saved items
      if (activeCategory === 'all') {
        // For "All", we need to check all potential tables
        // All Prospects should aggregate core acquisition sources only.
        const tablesToCheck = [
          'fsbo_leads',
          'frbo_leads',
          'foreclosure_listings'
        ]

        const promises: Promise<{ data: Listing[] | null }>[] = tablesToCheck.map((table) =>
          supabase
            .from(table)
            .select('*')
            .in('listing_id', Array.from(ids)) as unknown as Promise<{ data: Listing[] | null }>
        )

        const results: { data: Listing[] | null }[] = await Promise.all(promises)
        const combined = results.flatMap((r: { data: Listing[] | null }) => r.data || [])
        
        // Deduplicate by listing_id (just in case)
        const uniqueSaved = Array.from(
          new Map(combined.map((item: Listing) => [item.listing_id, item] as const)).values()
        ) as Listing[]
        setSavedListings(uniqueSaved)

      } else {
        // For specific categories, just check that table
        const tableName = getTableName(activeCategory)
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .in('listing_id', Array.from(ids))
        
        setSavedListings((data || []) as Listing[])
      }

    } catch (error) {
      console.error('Error fetching CRM contacts:', error)
      setSavedListings([])
    }
  }, [supabase, userId, getTableName])

  /**
   * Attach resident data from property_skip_trace_residents onto listings (match by property_url).
   */
  const attachResidentData = useCallback(
    async (_activeCategory: FilterType, data: Listing[]): Promise<Listing[]> => {
      if (!data.length) return data

      const propertyUrls = Array.from(
        new Set(
          data
            .map((item) => item.property_url)
            .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
        )
      )

      if (!propertyUrls.length) return data

      const residentRows: (Record<string, unknown> & { property_url?: string })[] = []
      const chunkSize = 500

      for (let i = 0; i < propertyUrls.length; i += chunkSize) {
        const chunk = propertyUrls.slice(i, i + chunkSize)
        const { data: rows, error } = await supabase
          .from(RESIDENTS_TABLE_NAME)
          .select(
            'property_url,resident_index,resident_type,resident_name,resident_age,resident_phone_numbers,resident_previous_address'
          )
          .in('property_url', chunk)
          .order('property_url', { ascending: true })
          .order('resident_index', { ascending: true })

        if (error) {
          console.warn('Error fetching property_skip_trace_residents chunk:', error)
          continue
        }

        if (rows && rows.length > 0) {
          residentRows.push(
            ...(rows as (Record<string, unknown> & { property_url?: string })[])
          )
        }
      }

      if (!residentRows.length) return data

      const byPropertyUrl = new Map<string, { current: ResidentRow[]; previous: ResidentRow[] }>()

      for (const row of residentRows) {
        const url = row.property_url
        if (!url || typeof url !== 'string') continue

        const resident: ResidentRow = {
          resident_type: row.resident_type as string | null,
          resident_name: row.resident_name as string | null,
          resident_age: row.resident_age as string | null,
          resident_phone_numbers: row.resident_phone_numbers as string | null,
          resident_previous_address: row.resident_previous_address as string | null,
        }

        const type = (resident.resident_type || '').trim()
        const isCurrent = CURRENT_RESIDENT_TYPES.has(type)

        if (!byPropertyUrl.has(url)) {
          byPropertyUrl.set(url, { current: [], previous: [] })
        }
        const bucket = byPropertyUrl.get(url)!
        if (isCurrent) {
          bucket.current.push(resident)
        } else {
          bucket.previous.push(resident)
        }
      }

      return data.map((item) => {
        const url = item.property_url
        if (!url) return item
        const bucket = byPropertyUrl.get(url)
        if (!bucket) return item
        return {
          ...item,
          current_residents: bucket.current.length ? bucket.current : undefined,
          previous_residents: bucket.previous.length ? bucket.previous : undefined,
        }
      })
    },
    [supabase]
  )

  /**
   * Main data fetching function.
   * Handles "All" aggregation and category-specific fetching.
   * Note: This fetches a limited set for client-side view. 
   * The VirtualizedListingsTable handles its own fetching for large datasets.
   */
  const fetchListingsData = useCallback(async (selectedFilters: Set<FilterType>, sortField: string, sortOrder: 'asc' | 'desc') => {
    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId
    setLoading(true)
    // Clear stale rows immediately so categories do not visually "fall back" to prior table rows.
    setListings([])
    setAllListings([])

    try {
      const activeCategory = getPrimaryCategory(selectedFilters)
      let data: Listing[] = []

      if (activeCategory === 'all') {
        // Aggregate from All Prospects sources only.
        const tablesToFetch = [
          'fsbo_leads',
          'frbo_leads',
          'foreclosure_listings'
        ]

        // Fetch in parallel via server API to bypass client-side row caps.
        const promises = tablesToFetch.map(async (table) => {
          try {
            const result = await fetchAllRowsFromApi(table, sortField, sortOrder)
            return { data: result.rows, error: null }
          } catch (error) {
            console.warn(`Exception fetching from ${table}:`, error)
            return { data: [], error }
          }
        })

        const results = await Promise.allSettled(promises)

        // Aggregate all successful results, ignoring failures, and annotate source_table
        const combined: Listing[] = []
        results.forEach((result, index) => {
          if (result.status !== 'fulfilled') return
          const table = tablesToFetch[index]
          const rows = (result.value?.data || []) as Listing[]
          rows.forEach((row) => {
            combined.push({
              ...row,
              source_table: (row as any).source_table || table,
            })
          })
        })

        data = combined
        
        // Log any failures for debugging
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length > 0) {
          console.warn(`Failed to fetch from ${failures.length} table(s) when aggregating "all prospects"`)
        }
        
        // Client-side sort for aggregated data
        data.sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime()
          const timeB = new Date(b.created_at || 0).getTime()
          return timeB - timeA
        })
        
        console.log(`Aggregated ${data.length} listings from ${tablesToFetch.length} tables for "all prospects"`)

      } else {
        // Single category fetch
        const tableName = getTableName(activeCategory)
        const result = await fetchAllRowsFromApi(tableName, sortField, sortOrder)
        data = (result.rows || []).map((row) => ({
          ...row,
          source_table: (row as any).source_table || tableName,
        }))
      }

      // Attach skip-traced resident data when available
      data = await attachResidentData(activeCategory, data)

      // Calculate "in_crm" status
      // Note: This relies on crmContactIds being up to date. 
      // Ideally fetchCrmContacts should be called before or in parallel.
      const processedData = data.map(item => ({
        ...item,
        in_crm: crmContactIds.has(item.listing_id)
      }))

      // Drop stale responses from earlier requests (e.g., user switched categories quickly).
      if (requestId !== activeRequestIdRef.current) return

      setAllListings(processedData)
      
      // Determine available listings (not in CRM)
      const available = processedData.filter(l => !l.in_crm)
      
      // Apply basic sorting
      const sorted = [...available].sort((a, b) => {
        // ... Sorting logic moved from page.tsx or kept simple here ...
        // For now, we let page.tsx handle complex client-side sorting/filtering
        // We just provide the raw data
        return 0 
      })
      
      setListings(available)

      // Update last updated timestamp
      if (data.length > 0) {
        const dates = data.map(l => l.last_scraped_at ? new Date(l.last_scraped_at).getTime() : 0)
        const maxDate = Math.max(...dates)
        if (maxDate > 0) setLastUpdated(new Date(maxDate).toISOString())
      }

    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false)
      }
    }
  }, [supabase, crmContactIds, getTableName, fetchAllRowsFromApi])

  /**
   * Optimistically updates a listing in the local state.
   * Useful for when a listing is edited in a modal.
   */
  const updateListing = useCallback((updatedListing: Listing) => {
    setListings(prev => prev.map(l => 
      l.listing_id === updatedListing.listing_id ? updatedListing : l
    ))
    setAllListings(prev => prev.map(l => 
      l.listing_id === updatedListing.listing_id ? updatedListing : l
    ))
  }, [])

  return {
    listings,
    allListings,
    savedListings,
    crmContactIds,
    loading,
    lastUpdated,
    fetchListingsData,
    fetchCrmContacts,
    getTableName,
    updateListing
  }
}
