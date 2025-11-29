'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
  Filter,
  Building2,
  User,
  Gauge,
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  Users,
  Briefcase,
  Eye,
  Lightbulb,
  FileSpreadsheet,
  Zap
} from 'lucide-react'

interface FilterGroup {
  id: string
  title: string
  type: 'multi-select' | 'checkbox' | 'range' | 'text'
  options?: Array<{ label: string; value: string; count?: number }>
  category: 'deal' | 'contact' | 'property'
  pinned?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

interface DealsFilterSidebarProps {
  filters: Record<string, any>
  onFiltersChange: (filters: Record<string, any>) => void
  totalCount: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  deals?: any[]
  pipelines?: Array<{ id: string; name: string; stages: string[] }>
  isDark?: boolean
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'pipeline',
    title: 'Pipeline',
    type: 'multi-select',
    category: 'deal',
    icon: Building2,
    pinned: true
  },
  {
    id: 'stage',
    title: 'Stage',
    type: 'multi-select',
    category: 'deal',
    icon: Gauge,
    pinned: true
  },
  {
    id: 'owner',
    title: 'Owner',
    type: 'multi-select',
    category: 'deal',
    icon: User,
    pinned: true
  },
  {
    id: 'value',
    title: 'Deal Value',
    type: 'range',
    category: 'deal',
    icon: DollarSign,
    pinned: true
  },
  {
    id: 'closed_date',
    title: 'Closed Date',
    type: 'range',
    category: 'deal',
    icon: Calendar
  },
  {
    id: 'created_date',
    title: 'Created Date',
    type: 'range',
    category: 'deal',
    icon: Calendar
  },
  {
    id: 'stage_updated_at',
    title: 'Stage Updated At',
    type: 'range',
    category: 'deal',
    icon: Calendar
  },
  {
    id: 'next_step_updated_at',
    title: 'Next Step Updated At',
    type: 'range',
    category: 'deal',
    icon: Calendar
  },
  {
    id: 'amount',
    title: 'Amount',
    type: 'range',
    category: 'deal',
    icon: DollarSign
  },
  {
    id: 'custom_fields',
    title: 'Custom Fields',
    type: 'text',
    category: 'deal',
    icon: FileText
  },
  {
    id: 'account_lists',
    title: 'Account Lists',
    type: 'multi-select',
    category: 'deal',
    icon: FileText
  },
  {
    id: 'location',
    title: 'Location',
    type: 'text',
    category: 'property',
    icon: MapPin
  },
  {
    id: 'employees',
    title: '# Employees',
    type: 'range',
    category: 'contact',
    icon: Users
  },
  {
    id: 'industry_keywords',
    title: 'Industry & Keywords',
    type: 'text',
    category: 'contact',
    icon: Briefcase
  },
  {
    id: 'funding',
    title: 'Funding',
    type: 'text',
    category: 'contact',
    icon: Eye
  },
  {
    id: 'technologies',
    title: 'Technologies',
    type: 'text',
    category: 'contact',
    icon: Lightbulb
  },
  {
    id: 'csv_import',
    title: 'Deal CSV Import',
    type: 'checkbox',
    category: 'deal',
    icon: FileSpreadsheet
  },
  {
    id: 'workflows',
    title: 'Workflows',
    type: 'multi-select',
    category: 'deal',
    icon: Zap
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

export default function DealsFilterSidebar({
  filters,
  onFiltersChange,
  totalCount,
  isCollapsed,
  onToggleCollapse,
  deals = [],
  pipelines = [],
  isDark = false
}: DealsFilterSidebarProps) {
  const [filterType, setFilterType] = useState<'deal' | 'contact' | 'property' | 'all'>('all')
  const [pinnedFilters, setPinnedFilters] = useState<Set<string>>(new Set(['pipeline', 'stage', 'owner', 'value']))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['pipeline', 'stage']))
  const [filterSearch, setFilterSearch] = useState('')
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Get stage options from pipelines
  const stageOptions = useMemo(() => {
    const stages = new Set<string>()
    pipelines.forEach(pipeline => {
      pipeline.stages.forEach(stage => stages.add(stage))
    })
    return Array.from(stages).map(stage => ({
      label: stage,
      value: stage,
      count: deals.filter(d => d.stage === stage).length
    }))
  }, [pipelines, deals])

  // Get pipeline options
  const pipelineOptions = useMemo(() => {
    return pipelines.map(pipeline => ({
      label: pipeline.name,
      value: pipeline.id,
      count: deals.filter(d => d.pipeline_id === pipeline.id).length
    }))
  }, [pipelines, deals])

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
    delete newFilters[filterId]
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const activeFiltersCount = Object.keys(filters).length

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center p-2 gap-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Show Filters"
        >
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        {activeFiltersCount > 0 && (
          <div className="min-w-[20px] h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold px-1.5">
            {activeFiltersCount}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Search Filters
        </h3>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Hide Filters"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-4 bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {totalCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total Deals
          </div>
        </div>
      </div>

      {/* Filter Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 relative bg-gray-50 dark:bg-gray-900">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Search filters..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter Type Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        {(['all', 'deal', 'contact', 'property'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
              filterType === type
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {type === 'all' ? 'All' : type}
          </button>
        ))}
      </div>

      {/* Filters List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {visibleFilters.map((filterGroup) => {
            const Icon = filterGroup.icon || Filter
            const isExpanded = expandedGroups.has(filterGroup.id)
            const isPinned = pinnedFilters.has(filterGroup.id)
            const filterValue = filters[filterGroup.id]

            return (
              <div
                key={filterGroup.id}
                className={`rounded-lg border transition-colors ${
                  isPinned
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between p-2">
                  <button
                    onClick={() => toggleExpand(filterGroup.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {filterGroup.title}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    {filterValue && (
                      <button
                        onClick={() => clearFilter(filterGroup.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                    <button
                      onClick={() => togglePin(filterGroup.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      {isPinned ? (
                        <Pin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <PinOff className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-2">
                    {filterGroup.type === 'multi-select' && (
                      <div className="space-y-1">
                        {filterGroup.id === 'stage' && stageOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={(filters.stage || []).includes(option.value)}
                              onChange={(e) => {
                                const current = filters.stage || []
                                const newValue = e.target.checked
                                  ? [...current, option.value]
                                  : current.filter((v: string) => v !== option.value)
                                updateFilter('stage', newValue.length > 0 ? newValue : undefined)
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                              {option.label}
                            </span>
                            {option.count !== undefined && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {option.count}
                              </span>
                            )}
                          </label>
                        ))}
                        {filterGroup.id === 'pipeline' && pipelineOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={(filters.pipeline || []).includes(option.value)}
                              onChange={(e) => {
                                const current = filters.pipeline || []
                                const newValue = e.target.checked
                                  ? [...current, option.value]
                                  : current.filter((v: string) => v !== option.value)
                                updateFilter('pipeline', newValue.length > 0 ? newValue : undefined)
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                              {option.label}
                            </span>
                            {option.count !== undefined && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {option.count}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    {filterGroup.type === 'range' && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filterValue?.min || ''}
                            onChange={(e) => updateFilter(filterGroup.id, {
                              min: e.target.value ? parseFloat(e.target.value) : undefined,
                              max: filterValue?.max
                            })}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filterValue?.max || ''}
                            onChange={(e) => updateFilter(filterGroup.id, {
                              min: filterValue?.min,
                              max: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                    {filterGroup.type === 'text' && (
                      <input
                        type="text"
                        value={filterValue || ''}
                        onChange={(e) => updateFilter(filterGroup.id, e.target.value || undefined)}
                        placeholder={`Search ${filterGroup.title.toLowerCase()}...`}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    )}
                    {filterGroup.type === 'checkbox' && (
                      <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!filterValue}
                          onChange={(e) => updateFilter(filterGroup.id, e.target.checked || undefined)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Enable {filterGroup.title}
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Clear all filters ({activeFiltersCount})
          </button>
        )}
        {!showMoreFilters && visibleFilters.length < FILTER_GROUPS.length && (
          <button
            onClick={() => setShowMoreFilters(true)}
            className="w-full mt-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Show more filters
          </button>
        )}
      </div>
    </div>
  )
}

