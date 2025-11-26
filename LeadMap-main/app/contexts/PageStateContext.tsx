'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ============================================================================
// Types
// ============================================================================

export interface Listing {
  listing_id: string
  property_url?: string | null
  street?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  list_price?: number | null
  beds?: number | null
  full_baths?: number | null
  sqft?: number | null
  status?: string | null
  agent_name?: string | null
  agent_email?: string | null
  agent_phone?: string | null
  agent_phone_2?: string | null
  listing_agent_phone_2?: string | null
  listing_agent_phone_5?: string | null
  text?: string | null
  year_built?: number | null
  last_sale_price?: number | null
  last_sale_date?: string | null
  ai_investment_score?: number | null
  created_at?: string
  lat?: number | null
  lng?: number | null
  active?: boolean
  price_per_sqft?: number | null
}

export type ActionType = 
  | 'save_to_crm'
  | 'add_to_list'
  | 'add_to_pipeline'
  | 'create_deal'
  | 'send_email'
  | 'make_call'
  | 'view_details'
  | 'export'
  | 'import'
  | 'enrich'
  | 'create_task'
  | 'create_campaign'
  | 'add_to_sequence'

export interface ActionContext {
  sourcePage: string
  targetPage?: string
  listingIds?: string[]
  listings?: Listing[]
  metadata?: Record<string, any>
}

export interface PageState {
  // Selected items
  selectedListingIds: Set<string>
  selectedListings: Listing[]
  
  // Filters and search
  searchQuery: string
  activeFilters: Record<string, any>
  sortBy: string
  sortOrder: 'asc' | 'desc'
  
  // View state
  viewType: 'table' | 'map' | 'analytics' | 'cards'
  
  // Navigation state
  currentPage: string
  previousPage?: string
  
  // Action queue
  pendingActions: Array<{ type: ActionType; context: ActionContext; timestamp: number }>
  
  // List selector modal
  showListSelector: boolean
  listSelectorContext: ActionContext | null
}

interface PageStateContextType {
  state: PageState
  // Selection methods
  selectListing: (listingId: string, listing?: Listing) => void
  deselectListing: (listingId: string) => void
  selectAll: (listingIds: string[], listings?: Listing[]) => void
  clearSelection: () => void
  
  // Filter methods
  setSearchQuery: (query: string) => void
  setFilters: (filters: Record<string, any>) => void
  setSort: (sortBy: string, sortOrder?: 'asc' | 'desc') => void
  setViewType: (viewType: PageState['viewType']) => void
  
  // Navigation methods
  navigateToPage: (page: string, options?: { preserveState?: boolean; state?: Partial<PageState> }) => void
  
  // Action methods
  executeAction: (action: ActionType, context: ActionContext) => Promise<void>
  queueAction: (action: ActionType, context: ActionContext) => void
  processActionQueue: () => Promise<void>
  
  // List selection modal
  showListSelector: boolean
  listSelectorContext: ActionContext | null
  openListSelector: (context: ActionContext) => void
  closeListSelector: () => void
  
  // State persistence
  saveState: () => void
  loadState: () => void
  clearState: () => void
}

// ============================================================================
// Context
// ============================================================================

const PageStateContext = createContext<PageStateContextType | undefined>(undefined)

// ============================================================================
// Provider Component
// ============================================================================

export function PageStateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<PageState>({
    selectedListingIds: new Set(),
    selectedListings: [],
    searchQuery: '',
    activeFilters: {},
    sortBy: 'relevance',
    sortOrder: 'desc',
    viewType: 'table',
    currentPage: '/dashboard',
    pendingActions: [],
    showListSelector: false,
    listSelectorContext: null
  })
  
  const stateRef = useRef(state)
  stateRef.current = state

  // ==========================================================================
  // Selection Methods
  // ==========================================================================
  
  const selectListing = useCallback((listingId: string, listing?: Listing) => {
    setState(prev => {
      const newIds = new Set(prev.selectedListingIds)
      newIds.add(listingId)
      
      const newListings = [...prev.selectedListings]
      if (listing && !newListings.find(l => l.listing_id === listingId)) {
        newListings.push(listing)
      }
      
      return {
        ...prev,
        selectedListingIds: newIds,
        selectedListings: newListings
      }
    })
  }, [])
  
  const deselectListing = useCallback((listingId: string) => {
    setState(prev => {
      const newIds = new Set(prev.selectedListingIds)
      newIds.delete(listingId)
      
      const newListings = prev.selectedListings.filter(l => l.listing_id !== listingId)
      
      return {
        ...prev,
        selectedListingIds: newIds,
        selectedListings: newListings
      }
    })
  }, [])
  
  const selectAll = useCallback((listingIds: string[], listings?: Listing[]) => {
    setState(prev => ({
      ...prev,
      selectedListingIds: new Set(listingIds),
      selectedListings: listings || prev.selectedListings
    }))
  }, [])
  
  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedListingIds: new Set(),
      selectedListings: []
    }))
  }, [])

  // ==========================================================================
  // Filter Methods
  // ==========================================================================
  
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])
  
  const setFilters = useCallback((filters: Record<string, any>) => {
    setState(prev => ({ ...prev, activeFilters: { ...prev.activeFilters, ...filters } }))
  }, [])
  
  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    setState(prev => ({ ...prev, sortBy, sortOrder }))
  }, [])
  
  const setViewType = useCallback((viewType: PageState['viewType']) => {
    setState(prev => ({ ...prev, viewType }))
  }, [])

  // ==========================================================================
  // Navigation Methods
  // ==========================================================================
  
  const navigateToPage = useCallback((
    page: string, 
    options?: { preserveState?: boolean; state?: Partial<PageState> }
  ) => {
    setState(prev => {
      const newState = options?.preserveState 
        ? prev 
        : { ...prev, ...options?.state }
      
      return {
        ...newState,
        previousPage: prev.currentPage,
        currentPage: page
      }
    })
    
    router.push(page)
  }, [router])

  // ==========================================================================
  // Action Execution
  // ==========================================================================
  
  const openListSelector = useCallback((context: ActionContext) => {
    setState(prev => ({
      ...prev,
      showListSelector: true,
      listSelectorContext: context
    }))
  }, [])
  
  const closeListSelector = useCallback(() => {
    setState(prev => ({
      ...prev,
      showListSelector: false,
      listSelectorContext: null
    }))
  }, [])
  
  const executeAction = useCallback(async (action: ActionType, context: ActionContext) => {
    const currentState = stateRef.current
    
    // Intercept list actions to show modal instead of navigating
    if (action === 'save_to_crm' || action === 'add_to_list') {
      openListSelector({
        ...context,
        listingIds: context.listingIds || Array.from(currentState.selectedListingIds),
        listings: context.listings || currentState.selectedListings,
        metadata: {
          ...context.metadata,
          actionType: action
        }
      })
      return
    }
    
    // Action routing map
    const actionRoutes: Record<ActionType, string> = {
      'save_to_crm': '/dashboard/lists',
      'add_to_list': '/dashboard/lists',
      'add_to_pipeline': '/dashboard/crm/deals',
      'create_deal': '/dashboard/crm/deals',
      'send_email': '/dashboard/crm/sequences',
      'make_call': '/dashboard/crm/sequences',
      'view_details': context.sourcePage, // Stay on current page
      'export': context.sourcePage,
      'import': '/admin',
      'enrich': '/dashboard/prospect-enrich',
      'create_task': '/dashboard/tasks',
      'create_campaign': '/dashboard/crm/sequences',
      'add_to_sequence': '/dashboard/crm/sequences'
    }
    
    const targetPage = actionRoutes[action] || context.targetPage || context.sourcePage
    
    // Store action context in sessionStorage for target page to pick up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingAction', JSON.stringify({
        action,
        context: {
          ...context,
          listingIds: context.listingIds || Array.from(currentState.selectedListingIds),
          listings: context.listings || currentState.selectedListings
        },
        timestamp: Date.now()
      }))
    }
    
    // Navigate to target page
    if (targetPage !== context.sourcePage) {
      navigateToPage(targetPage, { preserveState: true })
    } else {
      // Trigger action on current page
      window.dispatchEvent(new CustomEvent('pageAction', {
        detail: { action, context }
      }))
    }
  }, [navigateToPage, openListSelector])
  
  const queueAction = useCallback((action: ActionType, context: ActionContext) => {
    setState(prev => ({
      ...prev,
      pendingActions: [
        ...prev.pendingActions,
        { type: action, context, timestamp: Date.now() }
      ]
    }))
  }, [])
  
  const processActionQueue = useCallback(async () => {
    const currentState = stateRef.current
    const actions = [...currentState.pendingActions]
    
    if (actions.length === 0) return
    
    setState(prev => ({ ...prev, pendingActions: [] }))
    
    for (const { type, context } of actions) {
      await executeAction(type, context)
      // Small delay between actions
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }, [executeAction])

  // ==========================================================================
  // State Persistence
  // ==========================================================================
  
  const saveState = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stateToSave = {
        selectedListingIds: Array.from(stateRef.current.selectedListingIds),
        searchQuery: stateRef.current.searchQuery,
        activeFilters: stateRef.current.activeFilters,
        sortBy: stateRef.current.sortBy,
        sortOrder: stateRef.current.sortOrder,
        viewType: stateRef.current.viewType
      }
      localStorage.setItem('pageState', JSON.stringify(stateToSave))
    }
  }, [])
  
  const loadState = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pageState')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setState(prev => ({
            ...prev,
            selectedListingIds: new Set(parsed.selectedListingIds || []),
            searchQuery: parsed.searchQuery || '',
            activeFilters: parsed.activeFilters || {},
            sortBy: parsed.sortBy || 'relevance',
            sortOrder: parsed.sortOrder || 'desc',
            viewType: parsed.viewType || 'table'
          }))
        } catch (e) {
          console.error('Error loading state:', e)
        }
      }
    }
  }, [])
  
  const clearState = useCallback(() => {
    setState({
      selectedListingIds: new Set(),
      selectedListings: [],
      searchQuery: '',
      activeFilters: {},
      sortBy: 'relevance',
      sortOrder: 'desc',
      viewType: 'table',
      currentPage: '/dashboard',
      pendingActions: [],
      showListSelector: false,
      listSelectorContext: null
    })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pageState')
    }
  }, [])

  // Auto-save state on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveState()
    }, 500)
    return () => clearTimeout(timer)
  }, [state.selectedListingIds, state.searchQuery, state.activeFilters, state.sortBy, saveState])

  // Load state on mount
  useEffect(() => {
    loadState()
  }, [loadState])

  // Listen for page actions
  useEffect(() => {
    const handlePageAction = (event: CustomEvent) => {
      const { action, context } = event.detail
      executeAction(action, context)
    }
    
    window.addEventListener('pageAction' as any, handlePageAction)
    return () => {
      window.removeEventListener('pageAction' as any, handlePageAction)
    }
  }, [executeAction])

  return (
    <PageStateContext.Provider
      value={{
        state,
        selectListing,
        deselectListing,
        selectAll,
        clearSelection,
        setSearchQuery,
        setFilters,
        setSort,
        setViewType,
        navigateToPage,
        executeAction,
        queueAction,
        processActionQueue,
        showListSelector: state.showListSelector,
        listSelectorContext: state.listSelectorContext,
        openListSelector,
        closeListSelector,
        saveState,
        loadState,
        clearState
      }}
    >
      {children}
    </PageStateContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function usePageState() {
  const context = useContext(PageStateContext)
  if (context === undefined) {
    throw new Error('usePageState must be used within a PageStateProvider')
  }
  return context
}

