/**
 * usePageActions Hook
 * 
 * Provides convenient methods for executing actions across pages
 */

import { usePageState } from '@/app/contexts/PageStateContext'
import { usePathname } from 'next/navigation'
import { ActionType, ActionContext, Listing } from '@/app/contexts/PageStateContext'
import { prepareActionContext, validateAction, buildActionUrl } from '@/app/lib/actionMapper'

export function usePageActions() {
  const pathname = usePathname()
  const { state, executeAction, selectListing, deselectListing } = usePageState()
  
  /**
   * Execute an action with selected items
   */
  const executeActionWithSelection = async (
    action: ActionType,
    options?: {
      listingIds?: string[]
      listings?: Listing[]
      metadata?: Record<string, any>
      forceSelection?: boolean
    }
  ) => {
    const listingIds = options?.listingIds || Array.from(state.selectedListingIds)
    const listings = options?.listings || state.selectedListings
    
    // Validate action
    const validation = validateAction(action, listingIds.length)
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid action')
    }
    
    const context = prepareActionContext(
      action,
      pathname,
      listingIds,
      listings,
      options?.metadata
    )
    
    await executeAction(action, context)
  }
  
  /**
   * Execute an action with a single listing
   */
  const executeActionWithListing = async (
    action: ActionType,
    listingId: string,
    listing?: Listing,
    metadata?: Record<string, any>
  ) => {
    // Ensure listing is selected
    if (listing && !state.selectedListingIds.has(listingId)) {
      selectListing(listingId, listing)
    }
    
    const context = prepareActionContext(
      action,
      pathname,
      [listingId],
      listing ? [listing] : [],
      metadata
    )
    
    await executeAction(action, context)
  }
  
  /**
   * Get action URL for navigation
   */
  const getActionUrl = (
    action: ActionType,
    listingIds?: string[],
    metadata?: Record<string, any>
  ) => {
    return buildActionUrl(action, pathname, listingIds, metadata)
  }
  
  /**
   * Check if action can be executed with current selection
   */
  const canExecuteAction = (action: ActionType): { canExecute: boolean; error?: string } => {
    const validation = validateAction(action, state.selectedListingIds.size)
    return {
      canExecute: validation.valid,
      error: validation.error
    }
  }
  
  /**
   * Quick action helpers
   */
  const quickActions = {
    saveToCrm: (listingIds?: string[], listings?: Listing[]) => 
      executeActionWithSelection('save_to_crm', { listingIds, listings }),
    
    addToList: (listingIds?: string[], listings?: Listing[]) => 
      executeActionWithSelection('add_to_list', { listingIds, listings }),
    
    addToPipeline: (listingIds?: string[], listings?: Listing[]) => 
      executeActionWithSelection('add_to_pipeline', { listingIds, listings }),
    
    createDeal: (listingId: string, listing?: Listing) => 
      executeActionWithListing('create_deal', listingId, listing),
    
    sendEmail: (listingIds?: string[], listings?: Listing[]) => 
      executeActionWithSelection('send_email', { listingIds, listings }),
    
    makeCall: (listingId: string, listing?: Listing) => 
      executeActionWithListing('make_call', listingId, listing),
    
    viewDetails: (listingId: string, listing?: Listing) => 
      executeActionWithListing('view_details', listingId, listing),
    
    exportData: () => 
      executeActionWithSelection('export', { listingIds: [] }),
    
    enrich: (listingIds?: string[], listings?: Listing[]) => 
      executeActionWithSelection('enrich', { listingIds, listings }),
    
    createTask: (listingIds?: string[], listings?: Listing[]) => 
      executeActionWithSelection('create_task', { listingIds, listings })
  }
  
  return {
    executeAction: executeActionWithSelection,
    executeActionWithListing,
    getActionUrl,
    canExecuteAction,
    quickActions,
    selectedCount: state.selectedListingIds.size,
    hasSelection: state.selectedListingIds.size > 0
  }
}

