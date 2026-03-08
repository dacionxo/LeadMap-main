'use client'

import { useState } from 'react'
import { EmailBodySandbox } from './EmailBodySandbox'

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  subject: string
  snippet: string
  body_html: string
  body_plain: string
  received_at: string | null
  sent_at: string | null
  read: boolean
  email_participants: Array<{
    type: 'from' | 'to' | 'cc' | 'bcc'
    email: string
    name: string | null
    contacts?: unknown
  }>
  email_attachments?: Array<{
    id: string
    filename: string
    mime_type: string
    size_bytes: number
    storage_path: string | null
  }>
}

interface Thread {
  id: string
  subject: string
  status: string
  unread: boolean
  starred: boolean
  archived: boolean
  mailbox: {
    id: string
    email: string
    display_name: string | null
    provider: string
  }
  messages: Message[]
  lastMessageAt: string
  contact?: { first_name?: string; last_name?: string }
  listing?: { address?: string }
  campaign?: { name?: string }
}

interface ThreadViewProps {
  thread: Thread | null
  loading: boolean
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
  onDeleteDraft?: () => void
  onMoveToTrash?: () => void
  onArchive?: () => void
  onStar?: () => void
  onRestore?: () => void
  onPermanentDelete?: () => void
}

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getFromParticipant(message: Message | null | undefined) {
  if (!message) return undefined
  const participants = message.email_participants
  if (!Array.isArray(participants)) return undefined
  return participants.find((p) => p?.type === 'from')
}

function getToParticipants(message: Message | null | undefined) {
  if (!message) return []
  const participants = message.email_participants
  if (!Array.isArray(participants)) return []
  return participants.filter((p) => p?.type === 'to')
}

function getCcParticipants(message: Message | null | undefined) {
  if (!message) return []
  const participants = message.email_participants
  if (!Array.isArray(participants)) return []
  return participants.filter((p) => p?.type === 'cc')
}

function getInitial(name: string | null, email: string): string {
  if (name && name.length >= 1) return name.slice(0, 1).toUpperCase()
  if (email && email.length >= 1) return email.slice(0, 1).toUpperCase()
  return '?'
}

export default function ThreadView({ thread, loading, onReply, onReplyAll, onForward, onDeleteDraft, onMoveToTrash, onArchive, onStar, onRestore, onPermanentDelete }: ThreadViewProps) {
  const [isStarred, setIsStarred] = useState(thread?.starred ?? false)
  const isDraft = thread?.status === 'draft'

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-slate-400 animate-spin" aria-hidden>refresh</span>
        <span className="sr-only">Loading thread</span>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <span className="material-symbols-outlined text-6xl opacity-50 block mb-4" aria-hidden>mail</span>
          <p className="text-lg font-medium mb-2">No thread selected</p>
        </div>
      </div>
    )
  }

  const messages = Array.isArray(thread.messages) ? thread.messages : []
  const firstMessage = messages[0]
  const fromParticipant = getFromParticipant(firstMessage)
  const displayName = fromParticipant?.name || fromParticipant?.email || 'Unknown'
  const toNames = firstMessage ? getToParticipants(firstMessage).map((p) => (p?.name || p?.email || '')).filter(Boolean).join(', ') : ''
  const dateStr = firstMessage ? formatDate(firstMessage.received_at || firstMessage.sent_at) : ''

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 isolate">
      {/* Reading Header - design 1:1 */}
      <header className="h-20 flex items-center justify-between px-10 border-b border-[#F3F4F6] flex-shrink-0">
        <div className="flex items-center gap-4">
          {onArchive && !onPermanentDelete && (
            <button type="button" onClick={() => onArchive?.()} className="text-slate-500 hover:text-[#137fec] transition-colors" aria-label="Archive">
              <span className="material-symbols-outlined" aria-hidden>archive</span>
            </button>
          )}
          <button type="button" className="text-slate-500 hover:text-[#137fec] transition-colors" aria-label="Report">
            <span className="material-symbols-outlined" aria-hidden>report</span>
          </button>
          {(onMoveToTrash || onPermanentDelete) && (
            <button type="button" onClick={() => (onPermanentDelete ? onPermanentDelete() : onMoveToTrash?.())} className="text-slate-500 hover:text-[#137fec] transition-colors" aria-label="Delete">
              <span className="material-symbols-outlined" aria-hidden>delete</span>
            </button>
          )}
          <div className="h-4 w-[1px] bg-slate-200 mx-2" aria-hidden />
          <button type="button" className="text-slate-500 hover:text-[#137fec] transition-colors" aria-label="Mark as unread">
            <span className="material-symbols-outlined" aria-hidden>mark_as_unread</span>
          </button>
          <button type="button" className="text-slate-500 hover:text-[#137fec] transition-colors" aria-label="Schedule">
            <span className="material-symbols-outlined" aria-hidden>schedule</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {!isDraft && (
            <button type="button" onClick={onReply} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-100 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors" aria-label="Reply">
              <span className="material-symbols-outlined text-[18px]" aria-hidden>reply</span> Reply
            </button>
          )}
          <button type="button" className="size-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white transition-all" aria-label="More options">
            <span className="material-symbols-outlined" aria-hidden>more_horiz</span>
          </button>
        </div>
      </header>

      {/* Email Content - design 1:1 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden unibox-no-scrollbar p-10 min-w-0">
        <div className="max-w-[800px] mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-slate-900 pb-6 mb-6 border-b border-[#F3F4F6] tracking-tight">{thread.subject || '(No Subject)'}</h1>
            <div className="flex items-center justify-between pb-6 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-[#137fec]/10 flex items-center justify-center text-[#137fec] font-bold overflow-hidden">
                  {getInitial(fromParticipant?.name ?? null, fromParticipant?.email ?? '')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{displayName}</p>
                    {fromParticipant?.email && (
                      <span className="text-xs text-slate-400">&lt;{fromParticipant.email}&gt;</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">to me</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium">{dateStr}</p>
            </div>
          </div>
          <div className="space-y-6">
            {(Array.isArray(thread.messages) ? thread.messages : [])
              .filter((m): m is Message => !!m && !!m.id)
              .map((message) => {
              const from = getFromParticipant(message)
              return (
                <div key={message.id} className="space-y-4">
                  {message.body_html ? (
                    <div className="overflow-x-auto max-w-full min-w-0">
                      <EmailBodySandbox
                        html={message.body_html}
                        className="text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                        {message.body_plain || message.snippet || ''}
                      </p>
                    </div>
                  )}
                  {Array.isArray(message.email_attachments) && message.email_attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Attachments:
                      </div>
                      <div className="space-y-2">
                        {message.email_attachments.filter((att) => att?.id).map((att) => (
                          <a
                            key={att.id}
                            href={att.storage_path || '#'}
                            className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-slate-400 text-lg" aria-hidden>attach_file</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{att.filename}</span>
                            {(att.size_bytes ?? 0) > 0 && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                                {((att.size_bytes ?? 0) / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
