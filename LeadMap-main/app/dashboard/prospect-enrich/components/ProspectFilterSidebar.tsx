'use client'

/**
 * ProspectFilterSidebar — Elite Property Prospecting Dashboard design
 * 1:1 match to reference: glass-sidebar, Filters header, pinned/unpinned sections,
 * Material Symbols icons, More Filters button.
 */

import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/app/lib/utils'
import { Checkbox } from '@/app/components/ui/checkbox'

interface FilterGroup {
  id: string
  title: string
  type: 'multi-select' | 'checkbox' | 'range' | 'text'
  options?: Array<{ label: string; value: string; count?: number }>
  category: 'person' | 'company' | 'property'
  pinned?: boolean
}

/** FSBO property columns (fsbo_leads schema) and human-readable titles for dynamic filters. */
const FSBO_FILTER_COLUMNS: { id: string; title: string }[] = [
  { id: 'living_area', title: 'Living Area' },
  { id: 'year_built_pagination', title: 'Year Built' },
  { id: 'bedrooms', title: 'Bedrooms' },
  { id: 'bathrooms', title: 'Bathrooms' },
  { id: 'property_type', title: 'Property Type' },
  { id: 'construction_type', title: 'Construction Type' },
  { id: 'building_style', title: 'Building Style' },
  { id: 'effective_year_built', title: 'Effective Year Built' },
  { id: 'number_of_units', title: 'Number Of Units' },
  { id: 'stories', title: 'Stories' },
  { id: 'garage', title: 'Garage' },
  { id: 'heating_type', title: 'Heating Type' },
  { id: 'heating_gas', title: 'Heating Gas' },
  { id: 'air_conditioning', title: 'Air Conditioning' },
  { id: 'basement', title: 'Basement' },
  { id: 'deck', title: 'Deck' },
  { id: 'interior_walls', title: 'Interior Walls' },
  { id: 'exterior_walls', title: 'Exterior Walls' },
  { id: 'fireplaces', title: 'Fireplaces' },
  { id: 'flooring_cover', title: 'Flooring Cover' },
  { id: 'driveway', title: 'Driveway' },
  { id: 'pool', title: 'Pool' },
  { id: 'patio', title: 'Patio' },
  { id: 'porch', title: 'Porch' },
  { id: 'roof', title: 'Roof' },
  { id: 'sewer', title: 'Sewer' },
  { id: 'water', title: 'Water' },
  { id: 'apn', title: 'APN (Parcel ID)' },
  { id: 'lot_size', title: 'Lot Size' },
  { id: 'legal_name', title: 'Legal Name' },
  { id: 'legal_description', title: 'Legal Description' },
  { id: 'property_class', title: 'Property Class' },
  { id: 'county_name', title: 'County Name' },
  { id: 'elementary_school_district', title: 'Elementary School District' },
  { id: 'high_school_district', title: 'High School District' },
  { id: 'zoning', title: 'Zoning' },
  { id: 'flood_zone', title: 'Flood Zone' },
  { id: 'tax_year', title: 'Tax Year' },
  { id: 'tax_amount', title: 'Tax Amount' },
  { id: 'assessment_year', title: 'Assessment Year' },
  { id: 'total_assessed_value', title: 'Total Assessed Value' },
  { id: 'assessed_improvement_value', title: 'Assessed Improvement Value' },
  { id: 'total_market_value', title: 'Total Market Value' },
  { id: 'amenities', title: 'Amenities' }
]

interface ProspectFilterSidebarProps {
  filters: Record<string, any>
  onFiltersChange: (filters: Record<string, any>) => void
  totalCount: number
  netNewCount: number
  savedCount: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  listings?: any[]
  isDark?: boolean
  viewType?: 'total' | 'net_new' | 'saved'
  onViewTypeChange?: (viewType: 'total' | 'net_new' | 'saved') => void
  /** When 'fsbo', dynamic property filters from fsbo_leads schema are shown. */
  activeCategory?: string
}

const FILTER_GROUPS: FilterGroup[] = [
  { id: 'price_range', title: 'Price Range', type: 'range', category: 'property', pinned: true },
  { id: 'location', title: 'Location', type: 'multi-select', category: 'property', options: [], pinned: true },
  { id: 'ai_score', title: 'AI Investment Score', type: 'range', category: 'property', pinned: true },
  { id: 'status', title: 'Status', type: 'multi-select', category: 'property', options: [
    { label: 'Active', value: 'active' },
    { label: 'Expired', value: 'expired' },
    { label: 'Sold', value: 'sold' },
    { label: 'Pending', value: 'pending' }
  ]},
  { id: 'beds', title: 'Bedrooms', type: 'multi-select', category: 'property', options: [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5+', value: '5+' }
  ]},
  { id: 'baths', title: 'Bathrooms', type: 'multi-select', category: 'property', options: [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4+', value: '4+' }
  ]},
  { id: 'sqft', title: 'Square Footage', type: 'range', category: 'property' },
  { id: 'year_built', title: 'Year Built', type: 'range', category: 'property' },
  { id: 'agent_name', title: 'Agent Name', type: 'text', category: 'person' },
  { id: 'agent_email', title: 'Has Agent Email', type: 'checkbox', category: 'person' },
  { id: 'agent_phone', title: 'Has Agent Phone', type: 'checkbox', category: 'person' },
  { id: 'high_value', title: 'High Value ($500K+)', type: 'checkbox', category: 'property' },
  { id: 'price_drop', title: 'Price Reduction', type: 'checkbox', category: 'property' }
]

const PINNED_IDS = new Set(['price_range', 'location', 'ai_score'])
const INITIAL_VISIBLE = 8
const HIDDEN_COUNT = FILTER_GROUPS.length - INITIAL_VISIBLE

export default function ProspectFilterSidebar({
  filters,
  onFiltersChange,
  totalCount,
  netNewCount,
  savedCount,
  isCollapsed,
  onToggleCollapse,
  listings = [],
  isDark = false,
  viewType = 'total',
  onViewTypeChange,
  activeCategory
}: ProspectFilterSidebarProps) {
  // Start with all groups collapsed so pinned filters show as rows only (no auto dropdown)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [locationSearch, setLocationSearch] = useState<Record<'city' | 'state' | 'zip_code', string>>({ city: '', state: '', zip_code: '' })
  const [activeLocationTab, setActiveLocationTab] = useState<'city' | 'state' | 'zip_code'>('city')
  const [fsboUniqueValues, setFsboUniqueValues] = useState<Record<string, string[]>>({})
  const [fsboOptionsLoading, setFsboOptionsLoading] = useState(false)

  const cityOptions = useMemo(() => {
    const cities = new Map<string, number>()
    listings.forEach(l => {
      if (l.city?.trim()) cities.set(l.city.trim(), (cities.get(l.city.trim()) || 0) + 1)
    })
    return Array.from(cities.entries()).map(([label, count]) => ({ label, value: label, count })).slice(0, 50)
  }, [listings])

  const stateOptions = useMemo(() => {
    const states = new Map<string, number>()
    listings.forEach(l => {
      if (l.state?.trim()) states.set(l.state.trim(), (states.get(l.state.trim()) || 0) + 1)
    })
    return Array.from(states.entries()).map(([label, count]) => ({ label, value: label, count })).slice(0, 50)
  }, [listings])

  const zipCodeOptions = useMemo(() => {
    const zips = new Map<string, number>()
    listings.forEach(l => {
      if (l.zip_code) {
        const z = String(l.zip_code).trim()
        if (z) zips.set(z, (zips.get(z) || 0) + 1)
      }
    })
    return Array.from(zips.entries()).map(([label, count]) => ({ label, value: label, count })).slice(0, 50)
  }, [listings])

  useEffect(() => {
    if (activeCategory !== 'fsbo') {
      setFsboUniqueValues({})
      return
    }
    let cancelled = false
    setFsboOptionsLoading(true)
    const columns = FSBO_FILTER_COLUMNS.map((c) => c.id).join(',')
    fetch(`/api/listings/unique-values?table=fsbo_leads&columns=${encodeURIComponent(columns)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.data) setFsboUniqueValues(json.data)
      })
      .catch(() => { if (!cancelled) setFsboUniqueValues({}) })
      .finally(() => { if (!cancelled) setFsboOptionsLoading(false) })
    return () => { cancelled = true }
  }, [activeCategory])

  const fsboFilterGroups: FilterGroup[] = useMemo(() => {
    if (activeCategory !== 'fsbo') return []
    return FSBO_FILTER_COLUMNS.map(({ id, title }) => ({
      id,
      title,
      type: 'multi-select' as const,
      category: 'property' as const,
      options: (fsboUniqueValues[id] || []).map((v) => ({ label: v, value: v }))
    }))
  }, [activeCategory, fsboUniqueValues])

  const toggleExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateFilter = (filterId: string, value: any) => {
    if (value === undefined || value === null || value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && !Array.isArray(value) && !value.min && !value.max)) {
      const next = { ...filters }
      delete next[filterId]
      onFiltersChange(next)
    } else {
      onFiltersChange({ ...filters, [filterId]: value })
    }
  }

  const clearFilter = (filterId: string) => {
    const next = { ...filters }
    if (filterId === 'location') {
      delete next.city
      delete next.state
      delete next.zip_code
      setLocationSearch({ city: '', state: '', zip_code: '' })
    } else delete next[filterId]
    onFiltersChange(next)
  }

  const resetAll = () => {
    onFiltersChange({})
    setLocationSearch({ city: '', state: '', zip_code: '' })
  }

  const visibleFilters = useMemo(() => {
    const list = showMoreFilters ? FILTER_GROUPS : FILTER_GROUPS.slice(0, INITIAL_VISIBLE)
    if (activeCategory === 'fsbo' && fsboFilterGroups.length > 0) {
      return [...list, ...fsboFilterGroups]
    }
    return list
  }, [showMoreFilters, activeCategory, fsboFilterGroups])

  if (isCollapsed) {
    return (
      <div className="w-11 flex flex-col items-center p-2 gap-2 bg-white dark:bg-dark border-r border-slate-200 dark:border-slate-700 shadow-sm">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Show Filters"
          aria-label="Show Filters"
        >
          <span className="material-symbols-outlined text-[20px] text-slate-600 dark:text-slate-400">tune</span>
        </button>
      </div>
    )
  }

  return (
    <aside className="w-80 prospect-enrich-glass-sidebar border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0 h-full overflow-y-auto prospect-enrich-scrollbar-hide">
      {/* Filters header */}
      <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Filters</h2>
        <button
          onClick={resetAll}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          Reset All
        </button>
      </div>

      <div className="flex-1 flex flex-col pt-2">
        {visibleFilters.map((fg) => {
          const isPinned = PINNED_IDS.has(fg.id)
          const isExpanded = expandedGroups.has(fg.id)
          const filterValue = filters[fg.id]
          const icon = isExpanded ? 'expand_more' : 'chevron_right'

          return (
            <div key={fg.id} className="border-b border-slate-100 dark:border-slate-800">
              <div
                className="group flex items-center justify-between px-6 py-4 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                onClick={() => toggleExpand(fg.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[20px] group-hover:text-slate-600 dark:group-hover:text-slate-300">{icon}</span>
                  <span className={cn(
                    "text-[15px]",
                    isPinned ? "font-semibold text-slate-700 dark:text-slate-300" : "font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                  )}>
                    {fg.title}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800">
                  {fg.type === 'multi-select' && fg.id === 'location' && (
                    <>
                      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-2">
                        {(['city', 'state', 'zip_code'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveLocationTab(tab)}
                            className={cn(
                              "flex-1 px-2 py-1 text-xs font-medium border-b-2 transition-colors",
                              activeLocationTab === tab
                                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                            )}
                          >
                            {tab === 'zip_code' ? 'Zip Code' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="max-h-[180px] overflow-y-auto space-y-1">
                        {(() => {
                          const opts = activeLocationTab === 'city' ? cityOptions : activeLocationTab === 'state' ? stateOptions : zipCodeOptions
                          const current = filters[activeLocationTab] || []
                          return opts.length ? opts.map((o) => {
                            const sel = Array.isArray(current) && current.includes(o.value)
                            return (
                              <label key={o.value} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <Checkbox checked={sel} onCheckedChange={(c) => {
                                  const arr = Array.isArray(current) ? [...current] : []
                                  if (c) arr.push(o.value)
                                  else arr.splice(arr.indexOf(o.value), 1)
                                  updateFilter(activeLocationTab, arr.length ? arr : undefined)
                                }} />
                                <span className="text-sm text-slate-700 dark:text-slate-300">{o.label}</span>
                                {o.count != null && <span className="text-xs text-slate-500">{o.count}</span>}
                              </label>
                            )
                          }) : (
                            <div className="px-2 py-2 text-sm text-slate-500">No options</div>
                          )
                        })()}
                      </div>
                    </>
                  )}

                  {fg.type === 'multi-select' && fg.id !== 'location' && fg.options && (
                    <div className="space-y-1 max-h-[180px] overflow-y-auto">
                      {fg.options.map((o) => {
                        const sel = Array.isArray(filterValue) && filterValue.includes(o.value)
                        return (
                          <label key={o.value} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <Checkbox checked={sel} onCheckedChange={(c) => {
                              const arr = Array.isArray(filterValue) ? [...filterValue] : []
                              if (c) arr.push(o.value)
                              else arr.splice(arr.indexOf(o.value), 1)
                              updateFilter(fg.id, arr.length ? arr : undefined)
                            }} />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{o.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {fg.type === 'range' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Min{fg.id === 'price_range' ? ' ($)' : fg.id === 'sqft' ? ' (sqft)' : fg.id === 'ai_score' ? ' (0-100)' : fg.id === 'year_built' ? ' (year)' : ''}</label>
                        <input
                          type="number"
                          value={filterValue?.min ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            updateFilter(fg.id, { ...filterValue, min: v ? (fg.id === 'year_built' ? parseInt(v) : parseFloat(v)) : undefined })
                          }}
                          placeholder={fg.id === 'price_range' ? 'e.g. 100000' : fg.id === 'year_built' ? 'e.g. 1950' : 'Min'}
                          className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Max{fg.id === 'price_range' ? ' ($)' : fg.id === 'sqft' ? ' (sqft)' : fg.id === 'ai_score' ? ' (0-100)' : fg.id === 'year_built' ? ' (year)' : ''}</label>
                        <input
                          type="number"
                          value={filterValue?.max ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            updateFilter(fg.id, { ...filterValue, max: v ? (fg.id === 'year_built' ? parseInt(v) : parseFloat(v)) : undefined })
                          }}
                          placeholder={fg.id === 'price_range' ? 'e.g. 500000' : fg.id === 'year_built' ? 'e.g. 2024' : 'Max'}
                          className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {fg.type === 'checkbox' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={!!filterValue} onCheckedChange={(c) => updateFilter(fg.id, c || undefined)} />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{fg.title}</span>
                    </label>
                  )}

                  {fg.type === 'text' && (
                    <input
                      type="text"
                      value={filterValue || ''}
                      onChange={(e) => updateFilter(fg.id, e.target.value.trim() || undefined)}
                      placeholder={`Enter ${fg.title.toLowerCase()}...`}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  )}

                  {filterValue && (fg.id !== 'location' || filters.city?.length || filters.state?.length || filters.zip_code?.length) && (
                    <button
                      onClick={() => clearFilter(fg.id)}
                      className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!showMoreFilters && HIDDEN_COUNT > 0 && (
          <div className="p-6 mt-auto">
            <button
              onClick={() => setShowMoreFilters(true)}
              className="w-full py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200 transition-all shadow-sm"
            >
              More Filters ({HIDDEN_COUNT})
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
