'use client'

/**
 * ProspectFilterSidebar — Elite Property Prospecting Dashboard design
 * Price Range and Location match reference: card layout, range bar, City/State/Zip tabs, search, checkbox list with counts.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/app/lib/utils'
import { Pin, Search, Check, SlidersHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
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

// Only these 8 appear in the main section; all others are under "More Filters"
const MAIN_FILTER_IDS = ['price_range', 'location', 'ai_score', 'status', 'beds', 'baths', 'sqft', 'year_built'] as const

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

const PINNED_IDS = new Set<string>(MAIN_FILTER_IDS)
const MAIN_FILTERS = FILTER_GROUPS.filter((fg) => MAIN_FILTER_IDS.includes(fg.id as any))
const MORE_FILTERS = FILTER_GROUPS.filter((fg) => !MAIN_FILTER_IDS.includes(fg.id as any))

const PRICE_SLIDER_MIN = 0
const PRICE_SLIDER_MAX = 10_000_000

function formatPriceInput(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
  if (isNaN(num)) return ''
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function parsePriceInput(value: string): number | undefined {
  const num = parseFloat(value.replace(/,/g, ''))
  return isNaN(num) ? undefined : num
}

function formatPriceShort(value: number | undefined): string {
  if (value === undefined || value === null) return 'Any'
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    const s = m % 1 === 0 ? `${m}` : m.toFixed(1)
    return `$${s}M`
  }
  if (value >= 1000) return `$${Math.round(value / 1000)}k`
  return `$${value}`
}

function PriceRangeBar({
  min,
  max,
  rangeMin,
  rangeMax,
  onMinChange,
  onMaxChange
}: {
  min: number
  max: number
  rangeMin: number
  rangeMax: number
  onMinChange: (n: number) => void
  onMaxChange: (n: number) => void
}) {
  const range = rangeMax - rangeMin || 1
  const leftPct = Math.min(100, Math.max(0, ((min - rangeMin) / range) * 100))
  const rightPct = Math.min(100, Math.max(0, ((max - rangeMin) / range) * 100))
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const valueFromX = useCallback((clientX: number) => {
    const bar = barRef.current
    if (!bar) return rangeMin
    const rect = bar.getBoundingClientRect()
    const pct = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
    const raw = rangeMin + pct * range
    return Math.round((Math.max(rangeMin, Math.min(rangeMax, raw)) / 1000)) * 1000
  }, [rangeMin, rangeMax, range])
  useEffect(() => {
    if (dragging === null) return
    const onMove = (e: MouseEvent) => {
      const v = valueFromX(e.clientX)
      if (dragging === 'min') onMinChange(Math.min(v, max))
      else onMaxChange(Math.max(v, min))
    }
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, min, max, valueFromX, onMinChange, onMaxChange])
  return (
    <div className="relative h-1.5 bg-slate-100 dark:bg-slate-600 rounded-full w-full" ref={barRef}>
      <div className="absolute top-0 bottom-0 bg-indigo-500 rounded-full" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
      <button type="button" aria-label="Min price" className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-indigo-600 rounded-full shadow-[0_2px_4px_rgba(131,225,255,0.4)] cursor-col-resize hover:scale-110 active:scale-95 transition-transform z-10 flex items-center justify-center ring-2 ring-white dark:ring-slate-800" style={{ left: `${leftPct}%` }} onMouseDown={() => setDragging('min')} />
      <button type="button" aria-label="Max price" className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 bg-indigo-600 rounded-full shadow-[0_2px_4px_rgba(131,225,255,0.4)] cursor-col-resize hover:scale-110 active:scale-95 transition-transform z-10 flex items-center justify-center ring-2 ring-white dark:ring-slate-800" style={{ left: `${rightPct}%` }} onMouseDown={() => setDragging('max')} />
    </div>
  )
}

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
  const [pinnedPriceRange, setPinnedPriceRange] = useState(false)
  const [pinnedLocation, setPinnedLocation] = useState(true)
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
    const main = MAIN_FILTERS
    const more = MORE_FILTERS
    const fsbo = activeCategory === 'fsbo' && fsboFilterGroups.length > 0 ? fsboFilterGroups : []
    if (showMoreFilters) {
      return [...main, ...more, ...fsbo]
    }
    return main
  }, [showMoreFilters, activeCategory, fsboFilterGroups])

  const moreFiltersCount = MORE_FILTERS.length + (activeCategory === 'fsbo' ? fsboFilterGroups.length : 0)

  if (isCollapsed) {
    return (
      <div className="w-11 flex flex-col items-center p-2 gap-2 bg-white dark:bg-dark border-r border-slate-200 dark:border-slate-700 shadow-sm">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Show Filters"
          aria-label="Show Filters"
        >
          <SlidersHorizontal className="w-5 h-5 text-slate-600 dark:text-slate-400" />
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
        {/* Price Range — clickable row like AI Score & Status */}
        <div className="border-b border-slate-100 dark:border-slate-800">
          <div
            className="group flex items-center justify-between px-6 py-4 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            onClick={() => toggleExpand('price_range')}
          >
            <div className="flex items-center gap-4">
              {expandedGroups.has('price_range') ? <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" /> : <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />}
              <span className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">Price Range</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPinnedPriceRange((p) => !p); }}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label={pinnedPriceRange ? 'Unpin' : 'Pin'}
            >
              <Pin className={cn('w-[18px] h-[18px] transition-colors', pinnedPriceRange ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500')} />
            </button>
          </div>
          {expandedGroups.has('price_range') && (
            <div className="px-6 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-4 mb-8">
                <div className="group relative w-full">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Min</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatPriceInput((filters.price_range as { min?: number })?.min) ?? ''}
                      onChange={(e) => {
                        const n = parsePriceInput(e.target.value)
                        updateFilter('price_range', { ...(filters.price_range as { min?: number; max?: number }), min: n })
                      }}
                      className="w-full text-sm font-semibold text-slate-700 dark:text-slate-200 pl-6 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder-slate-300 dark:placeholder-slate-500 shadow-sm"
                    />
                  </div>
                </div>
                <div className="group relative w-full">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Max</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Any"
                      value={formatPriceInput((filters.price_range as { max?: number })?.max) ?? ''}
                      onChange={(e) => {
                        const n = parsePriceInput(e.target.value)
                        updateFilter('price_range', { ...(filters.price_range as { min?: number; max?: number }), max: n })
                      }}
                      className="w-full text-sm font-semibold text-slate-700 dark:text-slate-200 pl-6 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder-slate-300 dark:placeholder-slate-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="px-2 pb-2 pt-1">
                <PriceRangeBar
                  min={(filters.price_range as { min?: number })?.min ?? PRICE_SLIDER_MIN}
                  max={(filters.price_range as { max?: number })?.max ?? PRICE_SLIDER_MAX}
                  rangeMin={PRICE_SLIDER_MIN}
                  rangeMax={PRICE_SLIDER_MAX}
                  onMinChange={(n) => updateFilter('price_range', { ...(filters.price_range as { min?: number; max?: number }), min: n })}
                  onMaxChange={(n) => updateFilter('price_range', { ...(filters.price_range as { min?: number; max?: number }), max: n })}
                />
                <div className="flex justify-between mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                  <span>{formatPriceShort((filters.price_range as { min?: number })?.min) === 'Any' ? '$0' : formatPriceShort((filters.price_range as { min?: number })?.min)}</span>
                  <span>{(filters.price_range as { max?: number })?.max != null ? formatPriceShort((filters.price_range as { max?: number })?.max) : 'Any'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location — clickable row like AI Score & Status */}
        <div className="border-b border-slate-100 dark:border-slate-800">
          <div
            className="group flex items-center justify-between px-6 py-4 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            onClick={() => toggleExpand('location')}
          >
            <div className="flex items-center gap-4">
              {expandedGroups.has('location') ? <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" /> : <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />}
              <span className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">Location</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPinnedLocation((p) => !p); }}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label={pinnedLocation ? 'Unpin' : 'Pin'}
            >
              <Pin className={cn('w-[18px] h-[18px]', pinnedLocation ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500')} />
            </button>
          </div>
          {expandedGroups.has('location') && (
            <div className="px-6 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-700/60 rounded-lg mb-5">
              {(['city', 'state', 'zip_code'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveLocationTab(tab)}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded transition-colors',
                    activeLocationTab === tab
                      ? 'text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-700 shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-500/30 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-600/50'
                  )}
                >
                  {tab === 'zip_code' ? 'Zip' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative mb-5 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 pointer-events-none" />
              <input
                type="text"
                value={locationSearch[activeLocationTab]}
                onChange={(e) => setLocationSearch((s) => ({ ...s, [activeLocationTab]: e.target.value }))}
                placeholder={activeLocationTab === 'city' ? 'Search city...' : activeLocationTab === 'state' ? 'Search state...' : 'Search zip...'}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 pl-10 pr-3 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1 max-h-[220px] overflow-y-auto">
              {(() => {
                const opts = activeLocationTab === 'city' ? cityOptions : activeLocationTab === 'state' ? stateOptions : zipCodeOptions
                const search = locationSearch[activeLocationTab]?.toLowerCase().trim() || ''
                const filtered = search ? opts.filter((o) => o.label.toLowerCase().includes(search)) : opts
                const current = (filters[activeLocationTab] as string[] | undefined) || []
                return filtered.length ? filtered.map((o) => {
                  const sel = current.includes(o.value)
                  return (
                    <label
                      key={o.value}
                      className="flex items-center justify-between p-2.5 -mx-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => {
                              const arr = current.includes(o.value) ? current.filter((v) => v !== o.value) : [...current, o.value]
                              updateFilter(activeLocationTab, arr.length ? arr : undefined)
                            }}
                            className="peer appearance-none w-4 h-4 border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 checked:bg-indigo-600 checked:border-indigo-600 focus:ring-offset-0 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all cursor-pointer"
                          />
                          <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">{o.label}</span>
                      </div>
                      {o.count != null && (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-600/50 px-2 py-0.5 rounded-md border border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-600 transition-all">
                          {o.count}
                        </span>
                      )}
                    </label>
                  )
                }) : (
                  <div className="px-2 py-2 text-sm text-slate-500 dark:text-slate-400">No options</div>
                )
              })()}
            </div>
            </div>
          )}
        </div>

        {visibleFilters.filter((fg) => fg.id !== 'price_range' && fg.id !== 'location').map((fg) => {
          const isPinned = PINNED_IDS.has(fg.id)
          const isExpanded = expandedGroups.has(fg.id)
          const filterValue = filters[fg.id]

          return (
            <div key={fg.id} className="border-b border-slate-100 dark:border-slate-800">
              <div
                className="group flex items-center justify-between px-6 py-4 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                onClick={() => toggleExpand(fg.id)}
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" /> : <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />}
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

        {!showMoreFilters && moreFiltersCount > 0 && (
          <div className="p-6 mt-auto">
            <button
              onClick={() => setShowMoreFilters(true)}
              className="w-full py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200 transition-all shadow-sm"
            >
              More Filters ({moreFiltersCount})
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
