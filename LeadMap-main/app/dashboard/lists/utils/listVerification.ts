'use client'

/**
 * World-class list verification and debugging utilities
 * This module provides comprehensive verification of list save/fetch operations
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateIdentifierCandidates, isProbablyUrl, normalizeListingIdentifier } from './identifierUtils'

export interface VerificationResult {
  success: boolean
  message: string
  details?: any
  errors?: string[]
}

/**
 * Verify that items saved to a list can be fetched correctly
 */
export async function verifyListItems(
  supabase: SupabaseClient,
  listId: string
): Promise<VerificationResult> {
  const errors: string[] = []
  const details: any = {}

  try {
    // 1. Verify list exists
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('*')
      .eq('id', listId)
      .single()

    if (listError || !list) {
      return {
        success: false,
        message: 'List not found',
        errors: [listError?.message || 'List does not exist'],
        details: { listId, error: listError }
      }
    }

    details.list = {
      id: list.id,
      name: list.name,
      type: list.type,
      created_at: list.created_at
    }

    // 2. Fetch all list_items
    const { data: listItems, error: itemsError } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })

    if (itemsError) {
      return {
        success: false,
        message: 'Failed to fetch list items',
        errors: [itemsError.message],
        details: { listId, error: itemsError }
      }
    }

    details.listItems = {
      total: listItems?.length || 0,
      items: listItems || []
    }

    if (!listItems || listItems.length === 0) {
      return {
        success: true,
        message: 'List exists but has no items',
        details
      }
    }

    // 3. Verify listings can be fetched
    const listingItems = listItems.filter(item => item.item_type === 'listing')
    const contactItems = listItems.filter(item => item.item_type === 'contact')

    details.breakdown = {
      listings: listingItems.length,
      contacts: contactItems.length
    }

    // 4. Try to fetch actual listings
    if (listingItems.length > 0) {
      const listingIdCandidates = new Set<string>()
      const propertyUrlCandidates = new Set<string>()
      const itemCandidateMap = new Map<string, string[]>()

      listingItems.forEach(item => {
        if (!item.item_id) return
        const candidates = generateIdentifierCandidates(item.item_id)
        itemCandidateMap.set(item.item_id, candidates)
        if (isProbablyUrl(item.item_id)) {
          candidates.forEach(candidate => propertyUrlCandidates.add(candidate))
        } else {
          candidates.forEach(candidate => listingIdCandidates.add(candidate))
        }
      })

      const matchedIdentifiers = new Set<string>()
      const registerListing = (listing: any) => {
        const idCandidate = normalizeListingIdentifier(listing.listing_id)
        const urlCandidate = normalizeListingIdentifier(listing.property_url)
        if (idCandidate) matchedIdentifiers.add(idCandidate)
        if (urlCandidate) matchedIdentifiers.add(urlCandidate)
      }

      let foundByListingIdCount = 0
      if (listingIdCandidates.size > 0) {
        const { data: listingsById } = await supabase
          .from('listings')
          .select('listing_id, property_url')
          .in('listing_id', Array.from(listingIdCandidates))

        foundByListingIdCount = listingsById?.length || 0
        listingsById?.forEach(registerListing)
      }

      let foundByUrlCount = 0
      if (propertyUrlCandidates.size > 0) {
        const { data: listingsByUrl } = await supabase
          .from('listings')
          .select('listing_id, property_url')
          .in('property_url', Array.from(propertyUrlCandidates))

        foundByUrlCount = listingsByUrl?.length || 0
        listingsByUrl?.forEach(registerListing)
      }

      const missingItems = listingItems.filter(item => {
        if (!item.item_id) return false
        const candidates = itemCandidateMap.get(item.item_id) || [item.item_id]
        return !candidates.some(candidate => {
          const normalized = normalizeListingIdentifier(candidate) || candidate
          return matchedIdentifiers.has(normalized)
        })
      })

      details.listings = {
        itemIds: listingItems.length,
        foundByListingId: foundByListingIdCount,
        foundByPropertyUrl: foundByUrlCount,
        totalFound: foundByListingIdCount + foundByUrlCount,
        totalMissing: missingItems.length,
        missingIds: missingItems.slice(0, 5).map(item => item.item_id)
      }

      if (missingItems.length > 0) {
        errors.push(`${missingItems.length} listing(s) could not be found in the listings table`)
      }
    }

    // 5. Verify contacts can be fetched
    if (contactItems.length > 0) {
      const contactIds = contactItems.map(item => item.item_id)
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .in('id', contactIds)

      const foundContactIds = new Set(contacts?.map(c => c.id) || [])
      const missingContactIds = contactIds.filter(id => !foundContactIds.has(id))

      details.contacts = {
        itemIds: contactIds.length,
        found: contacts?.length || 0,
        missing: missingContactIds.length,
        missingIds: missingContactIds.length > 0 ? missingContactIds.slice(0, 5) : []
      }

      if (missingContactIds.length > 0) {
        errors.push(`${missingContactIds.length} contact(s) could not be found in the contacts table`)
      }
    }

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `✅ All ${listItems.length} items verified successfully`
        : `⚠️ Found ${errors.length} issue(s)`,
      errors: errors.length > 0 ? errors : undefined,
      details
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Verification failed',
      errors: [error.message || 'Unknown error'],
      details: { error }
    }
  }
}

/**
 * Verify that an item can be saved to a list
 */
export async function verifyItemCanBeSaved(
  supabase: SupabaseClient,
  listId: string,
  itemId: string,
  itemType: 'listing' | 'contact' | 'company'
): Promise<VerificationResult> {
  try {
    // Check if list exists
    const { data: list } = await supabase
      .from('lists')
      .select('id, type')
      .eq('id', listId)
      .single()

    if (!list) {
      return {
        success: false,
        message: 'List not found',
        errors: ['List does not exist']
      }
    }

    // Verify item exists in source table
    let itemExists = false
    if (itemType === 'listing') {
      const { data: listing } = await supabase
        .from('listings')
        .select('listing_id, property_url')
        .or(`listing_id.eq.${itemId},property_url.eq.${itemId}`)
        .maybeSingle()
      itemExists = !!listing
    } else if (itemType === 'contact') {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', itemId)
        .maybeSingle()
      itemExists = !!contact
    }

    if (!itemExists) {
      return {
        success: false,
        message: 'Item not found in source table',
        errors: [`${itemType} with id ${itemId} does not exist`]
      }
    }

    return {
      success: true,
      message: 'Item can be saved to list',
      details: {
        listId,
        listType: list.type,
        itemId,
        itemType,
        itemExists
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Verification failed',
      errors: [error.message || 'Unknown error']
    }
  }
}

