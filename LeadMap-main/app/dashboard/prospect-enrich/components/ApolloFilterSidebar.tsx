'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
  Filter
} from 'lucide-react'

interface FilterGroup {
  id: string
  title: string
  type: 'multi-select' | 'checkbox' | 'range' | 'text'
  options?: Array<{ label: string; value: string; count?: number }>
  category: 'person' | 'company' | 'property'
  pinned?: boolean
}

interface ApolloFilterSidebarProps {
  filters: Record<string, any>
  onFiltersChange: (filters: Record<string, any>) => void
  totalCount: number
  netNewCount: number
  savedCount: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  listings?: any[]
  isDark?: boolean
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'status',
    title: 'Status',
    type: 'multi-select',
    category: 'property',
    options: [
      { label: 'Active', value: 'active', count: 0 },
      { label: 'Expired', value: 'expired', count: 0 },
      { label: 'Sold', value: 'sold', count: 0 },
      { label: 'Pending', value: 'pending', count: 0 }
    ]
  },
  {
    id: 'price_range',
    title: 'Price Range',
    type: 'range',
    category: 'property',
    pinned: true
  },
  {
    id: 'location',
    title: 'Location',
    type: 'multi-select',
    category: 'property',
    options: [],
    pinned: true
  },
  {
    id: 'beds',
    title: 'Bedrooms',
    type: 'multi-select',
    category: 'property',
    options: [
      { label: '1', value: '1', count: 0 },
      { label: '2', value: '2', count: 0 },
      { label: '3', value: '3', count: 0 },
      { label: '4', value: '4', count: 0 },
      { label: '5+', value: '5+', count: 0 }
    ]
  },
  {
    id: 'baths',
    title: 'Bathrooms',
    type: 'multi-select',
    category: 'property',
    options: [
      { label: '1', value: '1', count: 0 },
      { label: '2', value: '2', count: 0 },
      { label: '3', value: '3', count: 0 },
      { label: '4+', value: '4+', count: 0 }
    ]
  },
  {
    id: 'sqft',
    title: 'Square Footage',
    type: 'range',
    category: 'property'
  },
  {
    id: 'year_built',
    title: 'Year Built',
    type: 'range',
    category: 'property'
  },
  {
    id: 'ai_score',
    title: 'AI Investment Score',
    type: 'range',
    category: 'property',
    pinned: true
  },
  {
    id: 'agent_name',
    title: 'Agent Name',
    type: 'text',
    category: 'person'
  },
  {
    id: 'agent_email',
    title: 'Has Agent Email',
    type: 'checkbox',
    category: 'person'
  },
  {
    id: 'agent_phone',
    title: 'Has Agent Phone',
    type: 'checkbox',
    category: 'person'
  },
  {
    id: 'enriched',
    title: 'Enriched',
    type: 'checkbox',
    category: 'property',
    pinned: true
  },
  {
    id: 'high_value',
    title: 'High Value ($500K+)',
    type: 'checkbox',
    category: 'property'
  },
  {
    id: 'price_drop',
    title: 'Price Reduction',
    type: 'checkbox',
    category: 'property'
  }
]

const DARK_THEME_COLORS = {
  panelBg: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(3, 7, 18, 0.95) 100%)',
  sectionBg: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
  pinnedBg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.12) 100%)',
  hoverBg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
  border: '1px solid rgba(99, 102, 241, 0.25)',
  subtleBorder: '1px solid rgba(99, 102, 241, 0.15)',
  divider: '1px solid rgba(99, 102, 241, 0.15)',
  inputBg: 'rgba(15, 23, 42, 0.8)',
  chipBg: 'rgba(99, 102, 241, 0.15)',
  chipText: '#e2e8f0',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#818cf8',
  boxShadow: '0 20px 35px -25px rgba(15, 23, 42, 0.85)',
  insetShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)'
}

export default function ApolloFilterSidebar({
  filters,
  onFiltersChange,
  totalCount,
  netNewCount,
  savedCount,
  isCollapsed,
  onToggleCollapse,
  listings = [],
  isDark = false
}: ApolloFilterSidebarProps) {
  const [filterType, setFilterType] = useState<'person' | 'company' | 'property' | 'all'>('all')
  const [pinnedFilters, setPinnedFilters] = useState<Set<string>>(new Set(['price_range', 'location', 'ai_score', 'enriched']))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['status', 'price_range', 'location']))
  const [filterSearch, setFilterSearch] = useState('')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [locationSearch, setLocationSearch] = useState<Record<'city' | 'state' | 'zip_code', string>>({
    city: '',
    state: '',
    zip_code: ''
  })
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState<Record<'city' | 'state' | 'zip_code', string>>({
    city: '',
    state: '',
    zip_code: ''
  })
  const [activeLocationTab, setActiveLocationTab] = useState<'city' | 'state' | 'zip_code'>('city')

  // Debounce location search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLocationSearch({ ...locationSearch })
    }, 300)
    return () => clearTimeout(timer)
  }, [locationSearch])

  // Calculate city options from listings
  const cityOptions = useMemo(() => {
    const cities = new Map<string, number>()
    
    listings.forEach(listing => {
      if (listing.city) {
        const city = listing.city.trim()
        if (city) {
          cities.set(city, (cities.get(city) || 0) + 1)
        }
      }
    })

    return Array.from(cities.entries())
      .map(([label, count]) => ({ label, value: label, count }))
      .filter(option => 
        !debouncedLocationSearch.city || 
        option.label.toLowerCase().includes(debouncedLocationSearch.city.toLowerCase())
      )
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.label.localeCompare(b.label)
      })
      .slice(0, 50)
  }, [listings, debouncedLocationSearch.city])

  // Calculate state options from listings
  const stateOptions = useMemo(() => {
    const states = new Map<string, number>()
    
    listings.forEach(listing => {
      if (listing.state) {
        const state = listing.state.trim()
        if (state) {
          states.set(state, (states.get(state) || 0) + 1)
        }
      }
    })

    return Array.from(states.entries())
      .map(([label, count]) => ({ label, value: label, count }))
      .filter(option => 
        !debouncedLocationSearch.state || 
        option.label.toLowerCase().includes(debouncedLocationSearch.state.toLowerCase())
      )
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.label.localeCompare(b.label)
      })
      .slice(0, 50)
  }, [listings, debouncedLocationSearch.state])

  // Calculate zip code options from listings
  const zipCodeOptions = useMemo(() => {
    const zipCodes = new Map<string, number>()
    
    listings.forEach(listing => {
      if (listing.zip_code) {
        const zip = String(listing.zip_code).trim()
        if (zip) {
          zipCodes.set(zip, (zipCodes.get(zip) || 0) + 1)
        }
      }
    })

    return Array.from(zipCodes.entries())
      .map(([label, count]) => ({ label, value: label, count }))
      .filter(option => 
        !debouncedLocationSearch.zip_code || 
        option.label.includes(debouncedLocationSearch.zip_code)
      )
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.label.localeCompare(b.label)
      })
      .slice(0, 50)
  }, [listings, debouncedLocationSearch.zip_code])

  // Calculate filter option counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {}
    
    counts.status = {
      active: listings.filter(l => l.active === true).length,
      expired: listings.filter(l => l.status?.toLowerCase().includes('expired')).length,
      sold: listings.filter(l => l.status?.toLowerCase().includes('sold')).length,
      pending: listings.filter(l => l.status?.toLowerCase().includes('pending')).length
    }

    counts.beds = {
      '1': listings.filter(l => (l.beds || 0) === 1).length,
      '2': listings.filter(l => (l.beds || 0) === 2).length,
      '3': listings.filter(l => (l.beds || 0) === 3).length,
      '4': listings.filter(l => (l.beds || 0) === 4).length,
      '5+': listings.filter(l => (l.beds || 0) >= 5).length
    }

    counts.baths = {
      '1': listings.filter(l => (l.full_baths || 0) === 1).length,
      '2': listings.filter(l => (l.full_baths || 0) === 2).length,
      '3': listings.filter(l => (l.full_baths || 0) === 3).length,
      '4+': listings.filter(l => (l.full_baths || 0) >= 4).length
    }

    return counts
  }, [listings])

  const visibleFilters = useMemo(() => {
    let filtered = FILTER_GROUPS.filter(fg => {
      if (filterType !== 'all' && fg.category !== filterType) return false
      if (filterSearch && !fg.title.toLowerCase().includes(filterSearch.toLowerCase())) return false
      return true
    })

    const pinned = filtered.filter(f => pinnedFilters.has(f.id))
    const unpinned = filtered.filter(f => !pinnedFilters.has(f.id))
    const visibleUnpinned = showMoreFilters ? unpinned : unpinned.slice(0, 5)

    return [...pinned, ...visibleUnpinned]
  }, [filterType, filterSearch, pinnedFilters, showMoreFilters])

  const togglePin = (filterId: string) => {
    setPinnedFilters(prev => {
      const newSet = new Set(prev)
      if (newSet.has(filterId)) {
        newSet.delete(filterId)
      } else {
        newSet.add(filterId)
      }
      return newSet
    })
  }

  const toggleExpand = (filterId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(filterId)) {
        newSet.delete(filterId)
      } else {
        newSet.add(filterId)
      }
      return newSet
    })
  }

  const updateFilter = (filterId: string, value: any) => {
    if (value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && !Array.isArray(value) && 
         (!value.min && !value.max))) {
      const newFilters = { ...filters }
      delete newFilters[filterId]
      onFiltersChange(newFilters)
    } else {
      onFiltersChange({
        ...filters,
        [filterId]: value
      })
    }
  }

  const clearFilter = (filterId: string) => {
    const newFilters = { ...filters }
    
    if (filterId === 'location') {
      delete newFilters.city
      delete newFilters.state
      delete newFilters.zip_code
      setLocationSearch({ city: '', state: '', zip_code: '' })
    } else {
      delete newFilters[filterId]
    }
    
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const activeFiltersCount = Object.keys(filters).length

  if (isCollapsed) {
    return (
      <div style={{
        width: '48px',
        background: isDark ? DARK_THEME_COLORS.panelBg : 'var(--color-ui-background-primary)',
        borderRight: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--spacing-sm)',
        gap: 'var(--spacing-xs)',
        boxShadow: isDark ? DARK_THEME_COLORS.boxShadow : undefined
      }}>
        <button
          onClick={onToggleCollapse}
          style={{
            padding: 'var(--spacing-xs)',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Show Filters"
        >
          <Filter style={{ width: '20px', height: '20px', color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)' }} />
        </button>
        {activeFiltersCount > 0 && (
          <div style={{
            minWidth: '20px',
            height: '20px',
            borderRadius: '10px',
            background: 'var(--color-base-ocean-50)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--type-size-step-0)',
            fontWeight: 'var(--weight-bold)',
            padding: '0 6px'
          }}>
            {activeFiltersCount}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      width: '320px',
      background: isDark ? DARK_THEME_COLORS.panelBg : 'var(--color-ui-background-primary)',
      borderRight: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      boxShadow: isDark ? DARK_THEME_COLORS.boxShadow : undefined
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--spacing-md)',
        borderBottom: isDark ? DARK_THEME_COLORS.divider : '1px solid var(--color-ui-border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isDark ? DARK_THEME_COLORS.sectionBg : 'var(--color-ui-background-primary)',
        boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
      }}>
        <h3 style={{
          fontFamily: 'var(--family-base-body)',
          fontSize: 'var(--type-size-step-3)',
          fontWeight: 'var(--weight-bold)',
          color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
          margin: 0
        }}>
          Search Filters
        </h3>
        <button
          onClick={onToggleCollapse}
          style={{
            padding: 'var(--spacing-xs)',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Hide Filters"
        >
          <X style={{ width: '18px', height: '18px', color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)' }} />
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{
        padding: 'var(--spacing-md)',
        borderBottom: isDark ? DARK_THEME_COLORS.divider : '1px solid var(--color-ui-border-default)',
        display: 'flex',
        gap: 'var(--spacing-md)',
        background: isDark ? DARK_THEME_COLORS.sectionBg : 'var(--color-ui-background-primary)'
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--family-base-body)',
            fontSize: 'var(--type-size-step-4)',
            fontWeight: 'var(--weight-bold)',
            color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)'
          }}>
            {totalCount.toLocaleString()}
          </div>
          <div style={{
            fontFamily: 'var(--family-base-body)',
            fontSize: 'var(--type-size-step-1)',
            color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)'
          }}>
            Total
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--family-base-body)',
            fontSize: 'var(--type-size-step-4)',
            fontWeight: 'var(--weight-bold)',
            color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)'
          }}>
            {netNewCount.toLocaleString()}
          </div>
          <div style={{
            fontFamily: 'var(--family-base-body)',
            fontSize: 'var(--type-size-step-1)',
            color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)'
          }}>
            Net New
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--family-base-body)',
            fontSize: 'var(--type-size-step-4)',
            fontWeight: 'var(--weight-bold)',
            color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)'
          }}>
            {savedCount.toLocaleString()}
          </div>
          <div style={{
            fontFamily: 'var(--family-base-body)',
            fontSize: 'var(--type-size-step-1)',
            color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)'
          }}>
            Saved
          </div>
        </div>
      </div>

      {/* Filter Search */}
      <div style={{
        padding: 'var(--spacing-md)',
        borderBottom: isDark ? DARK_THEME_COLORS.divider : '1px solid var(--color-ui-border-default)',
        position: 'relative',
        background: isDark ? DARK_THEME_COLORS.sectionBg : 'var(--color-ui-background-primary)'
      }}>
        <Search style={{
          position: 'absolute',
          left: 'var(--spacing-md)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-tertiary)'
        }} />
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Search filters..."
          style={{
            width: '100%',
            paddingLeft: '36px',
            paddingRight: 'var(--spacing-md)',
            paddingTop: 'var(--spacing-sm)',
            paddingBottom: 'var(--spacing-sm)',
            border: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
            borderRadius: 'var(--radius-xs)',
            background: isDark ? DARK_THEME_COLORS.inputBg : 'var(--color-ui-background-primary)',
            color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
            fontFamily: 'var(--family-base-body)',
            fontSize: 'var(--type-size-step-2)',
            outline: 'none',
            boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
          }}
        />
      </div>

      {/* Filter Type Selector */}
      <div style={{
        padding: 'var(--spacing-md)',
        borderBottom: isDark ? DARK_THEME_COLORS.divider : '1px solid var(--color-ui-border-default)',
        background: isDark ? DARK_THEME_COLORS.sectionBg : 'var(--color-ui-background-primary)'
      }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          style={{
            width: '100%',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            border: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
            borderRadius: 'var(--radius-xs)',
            background: isDark ? DARK_THEME_COLORS.inputBg : 'var(--color-ui-background-primary)',
            color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
            fontFamily: 'var(--family-base-body)',
            fontSize: 'var(--type-size-step-2)',
            outline: 'none',
            cursor: 'pointer',
            boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
          }}
        >
          <option value="all">All Filters</option>
          <option value="property">Property Info</option>
          <option value="person">Person Info</option>
          <option value="company">Company Info</option>
        </select>
      </div>

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div style={{
          padding: 'var(--spacing-md)',
          borderBottom: isDark ? DARK_THEME_COLORS.divider : '1px solid var(--color-ui-border-default)',
          background: isDark ? DARK_THEME_COLORS.pinnedBg : 'var(--color-base-ocean-10)',
          boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-xs)'
          }}>
            <span style={{
              fontFamily: 'var(--family-base-body)',
              fontSize: 'var(--type-size-step-1)',
              fontWeight: 'var(--weight-medium)',
              color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)'
            }}>
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
            </span>
            <button
              onClick={clearAllFilters}
              style={{
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                border: 'none',
                background: 'transparent',
                color: isDark ? DARK_THEME_COLORS.accent : 'var(--color-base-ocean-50)',
                cursor: 'pointer',
                fontFamily: 'var(--family-base-body)',
                fontSize: 'var(--type-size-step-1)',
                textDecoration: 'underline'
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Filter Groups */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--spacing-sm)',
        background: isDark ? DARK_THEME_COLORS.sectionBg : 'var(--color-ui-background-secondary)'
      }}>
        {visibleFilters.map((filterGroup) => {
          const isExpanded = expandedGroups.has(filterGroup.id)
          const isPinned = pinnedFilters.has(filterGroup.id)
          const filterValue = filters[filterGroup.id]

          return (
            <div
              key={filterGroup.id}
              style={{
                marginBottom: 'var(--spacing-xs)',
                border: isDark ? DARK_THEME_COLORS.subtleBorder : '1px solid var(--color-ui-border-default)',
                borderRadius: 'var(--radius-sm)',
                background: isDark
                  ? (isPinned ? DARK_THEME_COLORS.pinnedBg : DARK_THEME_COLORS.sectionBg)
                  : isPinned
                  ? 'var(--color-base-sand-10)'
                  : 'var(--color-ui-background-primary)',
                boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : 'var(--elevation-1)'
              }}
            >
              {/* Filter Header */}
              <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => toggleExpand(filterGroup.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flex: 1 }}>
                  {isExpanded ? (
                    <ChevronDown style={{ width: '16px', height: '16px', color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)' }} />
                  ) : (
                    <ChevronRight style={{ width: '16px', height: '16px', color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)' }} />
                  )}
                  <span style={{
                    fontFamily: 'var(--family-base-body)',
                    fontSize: 'var(--type-size-step-2)',
                    fontWeight: 'var(--weight-medium)',
                    color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)'
                  }}>
                    {filterGroup.title}
                  </span>
                  {(() => {
                    if (filterGroup.id === 'location') {
                      const cityCount = Array.isArray(filters.city) ? filters.city.length : 0
                      const stateCount = Array.isArray(filters.state) ? filters.state.length : 0
                      const zipCount = Array.isArray(filters.zip_code) ? filters.zip_code.length : 0
                      const totalCount = cityCount + stateCount + zipCount
                      return totalCount > 0 ? (
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          background: isDark ? DARK_THEME_COLORS.chipBg : 'var(--color-base-ocean-50)',
                          color: isDark ? DARK_THEME_COLORS.chipText : 'white',
                          fontSize: 'var(--type-size-step-0)',
                          fontWeight: 'var(--weight-medium)'
                        }}>
                          {totalCount}
                        </span>
                      ) : null
                    }
                    return filterValue ? (
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        background: isDark ? DARK_THEME_COLORS.chipBg : 'var(--color-base-ocean-50)',
                        color: isDark ? DARK_THEME_COLORS.chipText : 'white',
                        fontSize: 'var(--type-size-step-0)',
                        fontWeight: 'var(--weight-medium)'
                      }}>
                        {Array.isArray(filterValue) ? filterValue.length : 1}
                      </span>
                    ) : null
                  })()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePin(filterGroup.id)
                  }}
                  style={{
                    padding: 'var(--spacing-xs)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: isPinned 
                      ? (isDark ? DARK_THEME_COLORS.accent : 'var(--color-base-ocean-50)')
                      : (isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-tertiary)')
                  }}
                  title={isPinned ? 'Unpin filter' : 'Pin filter'}
                >
                  {isPinned ? (
                    <Pin style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <PinOff style={{ width: '16px', height: '16px' }} />
                  )}
                </button>
              </div>

              {/* Filter Content */}
              {isExpanded && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  borderTop: isDark ? DARK_THEME_COLORS.divider : '1px solid var(--color-ui-border-default)',
                  background: isDark ? DARK_THEME_COLORS.sectionBg : 'var(--color-ui-background-primary)',
                  boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
                }}>
                  {filterGroup.type === 'multi-select' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                      {filterGroup.id === 'location' ? (
                        <>
                          {/* Location Type Tabs */}
                          <div style={{
                            display: 'flex',
                            gap: 'var(--spacing-xs)',
                            borderBottom: isDark ? DARK_THEME_COLORS.divider : '1px solid var(--color-ui-border-default)',
                            marginBottom: 'var(--spacing-sm)'
                          }}>
                            {(['city', 'state', 'zip_code'] as const).map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setActiveLocationTab(tab)}
                                style={{
                                  flex: 1,
                                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                                  border: 'none',
                                  borderBottom: activeLocationTab === tab ? (isDark ? `2px solid ${DARK_THEME_COLORS.accent}` : '2px solid var(--color-base-ocean-50)') : '2px solid transparent',
                                  background: isDark ? 'transparent' : 'transparent',
                                  color: activeLocationTab === tab 
                                    ? (isDark ? DARK_THEME_COLORS.accent : 'var(--color-base-ocean-50)')
                                    : (isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)'),
                                  cursor: 'pointer',
                                  fontFamily: 'var(--family-base-body)',
                                  fontSize: 'var(--type-size-step-2)',
                                  fontWeight: activeLocationTab === tab ? 'var(--weight-medium)' : 'var(--weight-normal)',
                                  textTransform: 'capitalize',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {tab === 'zip_code' ? 'Zip Code' : tab}
                              </button>
                            ))}
                          </div>
                          
                          {/* Search input for active tab */}
                          <div style={{ position: 'relative', marginBottom: 'var(--spacing-xs)' }}>
                            <Search style={{
                              position: 'absolute',
                              left: 'var(--spacing-sm)',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '16px',
                              height: '16px',
                              color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-tertiary)',
                              pointerEvents: 'none'
                            }} />
                            <input
                              type="text"
                              value={locationSearch[activeLocationTab]}
                              onChange={(e) => setLocationSearch(prev => ({ ...prev, [activeLocationTab]: e.target.value }))}
                              placeholder={`Search ${activeLocationTab === 'zip_code' ? 'zip codes' : activeLocationTab + 's'}...`}
                              style={{
                                width: '100%',
                                paddingLeft: '36px',
                                paddingRight: 'var(--spacing-sm)',
                                paddingTop: 'var(--spacing-sm)',
                                paddingBottom: 'var(--spacing-sm)',
                                border: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
                                borderRadius: 'var(--radius-xs)',
                                background: isDark ? DARK_THEME_COLORS.inputBg : 'var(--color-ui-background-primary)',
                                color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
                                fontFamily: 'var(--family-base-body)',
                                fontSize: 'var(--type-size-step-2)',
                                outline: 'none',
                                transition: 'border-color 0.15s ease',
                                boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.accent : 'var(--color-base-ocean-50)'
                                e.currentTarget.style.boxShadow = isDark ? '0 0 0 2px rgba(129, 140, 248, 0.2)' : '0 0 0 2px rgba(127, 99, 197, 0.1)'
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = isDark ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-ui-border-default)'
                                e.currentTarget.style.boxShadow = isDark ? DARK_THEME_COLORS.insetShadow : 'none'
                              }}
                            />
                          </div>
                          
                          {/* Options list for active tab */}
                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {(() => {
                              const options = activeLocationTab === 'city' ? cityOptions 
                                            : activeLocationTab === 'state' ? stateOptions 
                                            : zipCodeOptions
                              const currentFilterValue = filters[activeLocationTab] || []
                              
                              return options.length > 0 ? (
                                options.map((option) => {
                                  const isSelected = Array.isArray(currentFilterValue) && currentFilterValue.includes(option.value)
                                  return (
                                    <label
                                      key={option.value}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-sm)',
                                        cursor: 'pointer',
                                        padding: 'var(--spacing-xs)',
                                        borderRadius: 'var(--radius-xs)',
                                        background: isSelected 
                                          ? (isDark ? DARK_THEME_COLORS.hoverBg : 'var(--color-base-ocean-10)')
                                          : (isDark ? 'transparent' : 'transparent')
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const current = Array.isArray(currentFilterValue) ? currentFilterValue : []
                                          if (e.target.checked) {
                                            updateFilter(activeLocationTab, [...current, option.value])
                                          } else {
                                            updateFilter(activeLocationTab, current.filter(v => v !== option.value))
                                          }
                                        }}
                                        style={{
                                          cursor: 'pointer',
                                          accentColor: isDark ? '#818cf8' : 'var(--color-base-ocean-50)'
                                        }}
                                      />
                                      <span style={{
                                        fontFamily: 'var(--family-base-body)',
                                        fontSize: 'var(--type-size-step-2)',
                                        color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
                                        flex: 1
                                      }}>
                                        {option.label}
                                      </span>
                                      {option.count !== undefined && (
                                        <span style={{
                                          fontFamily: 'var(--family-base-body)',
                                          fontSize: 'var(--type-size-step-1)',
                                          color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-tertiary)'
                                        }}>
                                          {option.count.toLocaleString()}
                                        </span>
                                      )}
                                    </label>
                                  )
                                })
                              ) : (
                                <div style={{
                                  padding: 'var(--spacing-sm)',
                                  color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-tertiary)',
                                  fontSize: 'var(--type-size-step-2)',
                                  textAlign: 'center'
                                }}>
                                  No {activeLocationTab === 'zip_code' ? 'zip codes' : activeLocationTab + 's'} found
                                </div>
                              )
                            })()}
                          </div>
                        </>
                      ) : filterGroup.options ? (
                        filterGroup.options.map((option) => {
                          const isSelected = Array.isArray(filterValue) && filterValue.includes(option.value)
                          const count = filterCounts[filterGroup.id]?.[option.value] ?? option.count ?? 0
                          return (
                            <label
                              key={option.value}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                cursor: 'pointer',
                                padding: 'var(--spacing-xs)',
                                borderRadius: 'var(--radius-xs)',
                                    background: isSelected 
                                      ? (isDark ? DARK_THEME_COLORS.hoverBg : 'var(--color-base-ocean-10)')
                                      : (isDark ? 'transparent' : 'transparent')
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const current = Array.isArray(filterValue) ? filterValue : []
                                  if (e.target.checked) {
                                    updateFilter(filterGroup.id, [...current, option.value])
                                  } else {
                                    updateFilter(filterGroup.id, current.filter(v => v !== option.value))
                                  }
                                }}
                                style={{
                                  cursor: 'pointer',
                                  accentColor: isDark ? '#818cf8' : 'var(--color-base-ocean-50)'
                                }}
                              />
                              <span style={{
                                fontFamily: 'var(--family-base-body)',
                                fontSize: 'var(--type-size-step-2)',
                                    color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
                                flex: 1
                              }}>
                                {option.label}
                              </span>
                              {count > 0 && (
                                <span style={{
                                  fontFamily: 'var(--family-base-body)',
                                  fontSize: 'var(--type-size-step-1)',
                                      color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-tertiary)'
                                }}>
                                  {count.toLocaleString()}
                                </span>
                              )}
                            </label>
                          )
                        })
                      ) : null}
                    </div>
                  )}

                  {filterGroup.type === 'checkbox' && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={!!filterValue}
                        onChange={(e) => updateFilter(filterGroup.id, e.target.checked)}
                        style={{
                          cursor: 'pointer',
                          accentColor: isDark ? '#818cf8' : 'var(--color-base-ocean-50)'
                        }}
                      />
                      <span style={{
                        fontFamily: 'var(--family-base-body)',
                        fontSize: 'var(--type-size-step-2)',
                        color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)'
                      }}>
                        {filterGroup.title}
                      </span>
                    </label>
                  )}

                  {filterGroup.type === 'range' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontFamily: 'var(--family-base-body)',
                          fontSize: 'var(--type-size-step-1)',
                        color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)',
                          marginBottom: 'var(--spacing-xs)'
                        }}>
                          Min{filterGroup.id === 'price_range' ? ' ($)' : filterGroup.id === 'sqft' ? ' (sqft)' : filterGroup.id === 'ai_score' ? ' (0-100)' : filterGroup.id === 'year_built' ? ' (year)' : ''}
                        </label>
                        <input
                          type="number"
                          value={filterValue?.min !== undefined ? filterValue.min : ''}
                          onChange={(e) => {
                            const value = e.target.value
                            updateFilter(filterGroup.id, {
                              ...filterValue,
                              min: value ? (filterGroup.id === 'year_built' ? parseInt(value) : parseFloat(value)) : undefined
                            })
                          }}
                          placeholder={filterGroup.id === 'price_range' ? 'e.g. 100000' : filterGroup.id === 'year_built' ? 'e.g. 1950' : 'Min'}
                          min={filterGroup.id === 'ai_score' ? 0 : filterGroup.id === 'year_built' ? 1800 : undefined}
                          max={filterGroup.id === 'ai_score' ? 100 : filterGroup.id === 'year_built' ? new Date().getFullYear() : undefined}
                          style={{
                            width: '100%',
                            padding: 'var(--spacing-sm)',
                          border: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
                            borderRadius: 'var(--radius-xs)',
                          background: isDark ? DARK_THEME_COLORS.inputBg : 'var(--color-ui-background-primary)',
                          color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
                            fontFamily: 'var(--family-base-body)',
                            fontSize: 'var(--type-size-step-2)',
                          outline: 'none',
                          boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
                          }}
                        />
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          fontFamily: 'var(--family-base-body)',
                          fontSize: 'var(--type-size-step-1)',
                        color: isDark ? DARK_THEME_COLORS.textSecondary : 'var(--color-ui-text-base-secondary)',
                          marginBottom: 'var(--spacing-xs)'
                        }}>
                          Max{filterGroup.id === 'price_range' ? ' ($)' : filterGroup.id === 'sqft' ? ' (sqft)' : filterGroup.id === 'ai_score' ? ' (0-100)' : filterGroup.id === 'year_built' ? ' (year)' : ''}
                        </label>
                        <input
                          type="number"
                          value={filterValue?.max !== undefined ? filterValue.max : ''}
                          onChange={(e) => {
                            const value = e.target.value
                            updateFilter(filterGroup.id, {
                              ...filterValue,
                              max: value ? (filterGroup.id === 'year_built' ? parseInt(value) : parseFloat(value)) : undefined
                            })
                          }}
                          placeholder={filterGroup.id === 'price_range' ? 'e.g. 500000' : filterGroup.id === 'year_built' ? 'e.g. 2024' : 'Max'}
                          min={filterGroup.id === 'ai_score' ? 0 : filterGroup.id === 'year_built' ? 1800 : undefined}
                          max={filterGroup.id === 'ai_score' ? 100 : filterGroup.id === 'year_built' ? new Date().getFullYear() : undefined}
                          style={{
                            width: '100%',
                            padding: 'var(--spacing-sm)',
                          border: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
                            borderRadius: 'var(--radius-xs)',
                          background: isDark ? DARK_THEME_COLORS.inputBg : 'var(--color-ui-background-primary)',
                          color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
                            fontFamily: 'var(--family-base-body)',
                            fontSize: 'var(--type-size-step-2)',
                          outline: 'none',
                          boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {filterGroup.type === 'text' && (
                    <input
                      type="text"
                      value={filterValue || ''}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        updateFilter(filterGroup.id, value || undefined)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        }
                      }}
                      placeholder={`Enter ${filterGroup.title.toLowerCase()}...`}
                      style={{
                        width: '100%',
                        padding: 'var(--spacing-sm)',
                        border: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
                        borderRadius: 'var(--radius-xs)',
                        background: isDark ? DARK_THEME_COLORS.inputBg : 'var(--color-ui-background-primary)',
                        color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
                        fontFamily: 'var(--family-base-body)',
                        fontSize: 'var(--type-size-step-2)',
                        outline: 'none',
                        transition: 'border-color 0.15s ease',
                        boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.accent : 'var(--color-base-ocean-50)'
                        e.currentTarget.style.boxShadow = isDark ? '0 0 0 2px rgba(129, 140, 248, 0.2)' : '0 0 0 2px rgba(127, 99, 197, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = isDark ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-ui-border-default)'
                        e.currentTarget.style.boxShadow = isDark ? DARK_THEME_COLORS.insetShadow : 'none'
                      }}
                    />
                  )}

                  {filterValue && (
                    <button
                      onClick={() => clearFilter(filterGroup.id)}
                      style={{
                        marginTop: 'var(--spacing-sm)',
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        border: 'none',
                        background: 'transparent',
                        color: isDark ? DARK_THEME_COLORS.accent : 'var(--color-base-ocean-50)',
                        cursor: 'pointer',
                        fontFamily: 'var(--family-base-body)',
                        fontSize: 'var(--type-size-step-1)',
                        textDecoration: 'underline'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!showMoreFilters && visibleFilters.length >= 5 && (
          <button
            onClick={() => setShowMoreFilters(true)}
            style={{
              width: '100%',
              padding: 'var(--spacing-sm)',
              marginTop: 'var(--spacing-sm)',
              border: isDark ? DARK_THEME_COLORS.border : '1px solid var(--color-ui-border-default)',
              borderRadius: 'var(--radius-sm)',
              background: isDark ? DARK_THEME_COLORS.inputBg : 'var(--color-ui-background-primary)',
              color: isDark ? DARK_THEME_COLORS.textPrimary : 'var(--color-ui-text-base-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--family-base-body)',
              fontSize: 'var(--type-size-step-2)',
              fontWeight: 'var(--weight-medium)',
              boxShadow: isDark ? DARK_THEME_COLORS.insetShadow : undefined
            }}
          >
            More Filters ({FILTER_GROUPS.length - visibleFilters.length})
          </button>
        )}
      </div>
    </div>
  )
}

