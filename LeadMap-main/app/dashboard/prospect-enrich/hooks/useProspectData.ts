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
  // Skip-traced resident data from property_skip_trace
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

// Tables that participate in property_skip_trace skip-trace data
const SKIPTRACE_SOURCE_TABLES = new Set<string>(['fsbo_leads', 'frbo_leads', 'foreclosure_listings'])
const SKIPTRACE_TABLE_NAME = 'property_skip_trace'

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
  
  const fetchingRef = useRef(false)

  /**
   * Resolves the correct table name for a given category.
   * Includes safeguards against category confusion (e.g. FSBO vs FRBO).
   */
  const getTableName = useCallback((category: FilterType): string => {
    return TABLE_MAPPING[category] || DEFAULT_LISTINGS_TABLE
  }, [])

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

      const { data: contacts } = await contactsQuery

      if (!contacts || contacts.length === 0) {
        setCrmContactIds(new Set())
        setSavedListings([])
        return
      }

      const ids = new Set(contacts.map(c => c.source_id).filter(Boolean) as string[])
      setCrmContactIds(ids)

      // 2. Fetch the full listing details for these saved items
      if (activeCategory === 'all') {
        // For "All", we need to check all potential tables
        // This is expensive but necessary if we want to show saved items across all categories
        const tablesToCheck = [
          DEFAULT_LISTINGS_TABLE,
          'expired_listings',
          'probate_leads',
          'fsbo_leads',
          'frbo_leads',
          'imports',
          'trash',
          'foreclosure_listings'
        ]

        const promises = tablesToCheck.map(table => 
          supabase.from(table).select('*').in('listing_id', Array.from(ids))
        )

        const results = await Promise.all(promises)
        const combined = results.flatMap(r => r.data || [])
        
        // Deduplicate by listing_id (just in case)
        const uniqueSaved = Array.from(new Map(combined.map(item => [item.listing_id, item])).values())
        setSavedListings(uniqueSaved)

      } else {
        // For specific categories, just check that table
        const tableName = getTableName(activeCategory)
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .in('listing_id', Array.from(ids))
        
        setSavedListings(data || [])
      }

    } catch (error) {
      console.error('Error fetching CRM contacts:', error)
      setSavedListings([])
    }
  }, [supabase, userId, getTableName])

  /**
   * Attach skip-traced resident data from property_skip_trace onto listings.
   */
  const attachResidentData = useCallback(
    async (activeCategory: FilterType, data: Listing[]): Promise<Listing[]> => {
      if (!data.length) return data

      // Single-category: resolve table name from activeCategory
      if (activeCategory !== 'all') {
        const tableName = getTableName(activeCategory)

        if (!SKIPTRACE_SOURCE_TABLES.has(tableName)) {
          return data
        }

        const ids = Array.from(
          new Set(
            data
              .map((item) => item.listing_id)
              .filter((id): id is string => typeof id === 'string' && id.length > 0)
          )
        )

        if (!ids.length) return data

        const { data: skipRows, error } = await supabase
          .from(SKIPTRACE_TABLE_NAME)
          .select(
            'listing_id,resident_type,resident_name,resident_age,resident_phone_numbers,resident_previous_address'
          )
          .eq('source_table', tableName)
          .in('listing_id', ids)

        if (error) {
          console.warn('Error fetching property_skip_trace for', tableName, error)
          return data
        }

        if (!skipRows || !skipRows.length) {
          return data
        }

        const byId = new Map<string, any>()
        for (const row of skipRows) {
          if (row.listing_id) {
            byId.set(row.listing_id as string, row)
          }
        }

        return data.map((item) => {
          const s = byId.get(item.listing_id)
          if (!s) {
            // Still ensure source_table is present for downstream logic
            return {
              ...item,
              source_table: item.source_table || tableName,
            }
          }

          return {
            ...item,
            source_table: item.source_table || tableName,
            resident_type: s.resident_type ?? item.resident_type,
            resident_name: s.resident_name ?? item.resident_name,
            resident_age: s.resident_age ?? item.resident_age,
            resident_phone_numbers: s.resident_phone_numbers ?? item.resident_phone_numbers,
            resident_previous_address: s.resident_previous_address ?? item.resident_previous_address,
          }
        })
      }

      // Aggregated "all" category: use source_table on each item to group queries
      const idsBySource = new Map<string, Set<string>>()

      for (const item of data) {
        const src = item.source_table
        if (!src || !SKIPTRACE_SOURCE_TABLES.has(src)) continue
        if (!item.listing_id) continue
        if (!idsBySource.has(src)) {
          idsBySource.set(src, new Set())
        }
        idsBySource.get(src)!.add(item.listing_id)
      }

      if (!idsBySource.size) return data

      const skipTracePromises: Promise<any[]>[] = []

      idsBySource.forEach((idsSet, src) => {
        const ids = Array.from(idsSet)
        const p = (async (): Promise<any[]> => {
          const { data: rows, error } = await supabase
            .from(SKIPTRACE_TABLE_NAME)
            .select(
              'source_table,listing_id,resident_type,resident_name,resident_age,resident_phone_numbers,resident_previous_address'
            )
            .eq('source_table', src)
            .in('listing_id', ids)

          if (error) {
            console.warn('Error fetching property_skip_trace for', src, error)
            return []
          }

          return (rows || []) as any[]
        })()

        skipTracePromises.push(p)
      })

      const skipResults = await Promise.all(skipTracePromises)
      const allRows = skipResults.flat()

      if (!allRows.length) return data

      const byKey = new Map<string, any>()
      for (const row of allRows) {
        if (row.source_table && row.listing_id) {
          byKey.set(`${row.source_table}:${row.listing_id}`, row)
        }
      }

      return data.map((item) => {
        const key = `${item.source_table || ''}:${item.listing_id}`
        const s = byKey.get(key)
        if (!s) return item

        return {
          ...item,
          resident_type: s.resident_type ?? item.resident_type,
          resident_name: s.resident_name ?? item.resident_name,
          resident_age: s.resident_age ?? item.resident_age,
          resident_phone_numbers: s.resident_phone_numbers ?? item.resident_phone_numbers,
          resident_previous_address: s.resident_previous_address ?? item.resident_previous_address,
        }
      })
    },
    [supabase, getTableName]
  )

  /**
   * Main data fetching function.
   * Handles "All" aggregation and category-specific fetching.
   * Note: This fetches a limited set for client-side view. 
   * The VirtualizedListingsTable handles its own fetching for large datasets.
   */
  const fetchListingsData = useCallback(async (selectedFilters: Set<FilterType>, sortField: string, sortOrder: 'asc' | 'desc') => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      const activeCategory = getPrimaryCategory(selectedFilters)
      let data: Listing[] = []

      if (activeCategory === 'all') {
        // Aggregate from all tables - ensure every category is included
        const tablesToFetch = [
          DEFAULT_LISTINGS_TABLE,
          'expired_listings',
          'probate_leads',
          'fsbo_leads',
          'frbo_leads',
          'imports',
          'trash',
          'foreclosure_listings'
        ]

        // Fetch in parallel with error handling - don't fail entire aggregation if one table fails
        const promises = tablesToFetch.map(async (table) => {
          try {
            const result = await supabase
              .from(table)
              .select('*')
              .order('created_at', { ascending: false })
              .limit(1000) // Hard limit for client-side "all" view to prevent browser crash
            
            if (result.error) {
              console.warn(`Error fetching from ${table}:`, result.error)
              return { data: [], error: result.error }
            }
            return result
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

        const query = supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false })
          
        // Add specific handling for meta-filters if they are active but we are using default table
        // (Logic for high_value etc is handled by client-side filtering in page.tsx currently)
        
        const { data: result, error } = await query

        if (error) {
          // Handle missing table gracefully
          if ((error as any)?.code === 'PGRST116' || error.message?.includes('does not exist')) {
            console.warn(`Table ${tableName} does not exist.`)
            data = []
          } else {
            throw error
          }
        } else {
          const rows = (result || []) as Listing[]
          data = rows.map((row) => ({
            ...row,
            source_table: (row as any).source_table || tableName,
          }))
        }
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
      setLoading(false)
      fetchingRef.current = false
    }
  }, [supabase, crmContactIds, getTableName])

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
