/**
 * Shared Unibox types - single source of truth for Thread and related types
 * so UniboxContent, UniboxWrapper, ThreadList, and ThreadView stay type-compatible.
 */

export interface UniboxThread {
  id: string
  subject: string
  mailbox: {
    id: string
    email: string
    display_name: string | null
    provider: string
  }
  status: string
  unread: boolean
  unreadCount: number
  starred: boolean
  archived: boolean
  lastMessage: {
    direction: 'inbound' | 'outbound'
    snippet: string
    received_at: string | null
    read: boolean
  } | null
  lastMessageAt: string
  messageCount: number
  contactId?: string | null
  listingId?: string | null
  campaignId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface UniboxMailbox {
  id: string
  email: string
  display_name: string | null
  provider: string
  active: boolean
}

export type UniboxFilterStatus = 'all' | 'open' | 'needs_reply' | 'waiting' | 'closed' | 'ignored'
export type UniboxFilterFolder = 'inbox' | 'archived' | 'starred'
