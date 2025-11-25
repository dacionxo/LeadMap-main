'use client'

import { usePageState } from '@/app/contexts/PageStateContext'
import { useApp } from '@/app/providers'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme } from '@/components/ThemeProvider'
import ListSelectorModal from './ListSelectorModal'
import { useCallback } from 'react'
import { normalizeListingIdentifier } from '@/app/dashboard/lists/utils/identifierUtils'

export default function GlobalListSelector() {
  const { 
    showListSelector, 
    listSelectorContext, 
    closeListSelector,
    clearSelection 
  } = usePageState()
  const { profile } = useApp()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const supabase = createClientComponentClient()

  const handleSelectList = useCallback(async (listId: string, listName: string) => {
    if (!listSelectorContext || !profile?.id) return

    try {
      const listingIds = listSelectorContext.listingIds || []
      
      if (listingIds.length === 0) {
        throw new Error('No items to add')
      }

      // Normalize identifiers before storing (consistent with listUtils.ts)
      const itemsToInsert = listingIds
        .map(listingId => {
          const normalizedId = normalizeListingIdentifier(listingId)
          if (!normalizedId) {
            console.warn(`⚠️ Skipping invalid listing ID: ${listingId}`)
            return null
          }
          return {
            list_id: listId,
            item_type: 'listing' as const,
            item_id: normalizedId
          }
        })
        .filter((item): item is { list_id: string; item_type: 'listing'; item_id: string } => item !== null)

      if (itemsToInsert.length === 0) {
        throw new Error('No valid items to add after normalization')
      }

      // Use upsert to avoid duplicates (UNIQUE constraint handles this)
      const { error } = await supabase
        .from('list_items')
        .upsert(itemsToInsert, {
          onConflict: 'list_id,item_type,item_id'
        })

      if (error) {
        console.error('Error adding to list:', error)
        throw new Error(error.message || 'Failed to add items to list')
      }

      // Update the list's updated_at timestamp (consistent with listUtils.ts)
      const { error: updateError } = await supabase
        .from('lists')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', listId)

      if (updateError) {
        console.warn('⚠️ Failed to update list timestamp:', updateError)
        // Don't throw - this is not critical
      }

      // Clear selection after successful add
      clearSelection()

      // Show success message (you can replace this with a toast notification)
      if (typeof window !== 'undefined') {
        const count = listingIds.length
        alert(`Successfully added ${count} item${count > 1 ? 's' : ''} to "${listName}"`)
      }
    } catch (error: any) {
      console.error('Error in handleSelectList:', error)
      throw error
    }
  }, [listSelectorContext, profile?.id, supabase, clearSelection])

  const handleCreateNewList = useCallback(async (name: string): Promise<string> => {
    if (!profile?.id) {
      throw new Error('User not authenticated')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not found')
      }

      const { data, error } = await supabase
        .from('lists')
        .insert([
          {
            name: name.trim(),
            type: 'properties', // Default for backward compatibility, but not used in UI
            user_id: user.id
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating list:', error)
        throw new Error(error.message || 'Failed to create list')
      }

      return data.id
    } catch (error: any) {
      console.error('Error in handleCreateNewList:', error)
      throw error
    }
  }, [profile?.id, supabase])

  if (!showListSelector || !listSelectorContext) {
    return null
  }

  const listingIds = listSelectorContext.listingIds || []

  return (
    <ListSelectorModal
      isOpen={showListSelector}
      onClose={closeListSelector}
      onSelect={handleSelectList}
      onCreateNew={handleCreateNewList}
      listingIds={listingIds}
      isDark={isDark}
    />
  )
}

