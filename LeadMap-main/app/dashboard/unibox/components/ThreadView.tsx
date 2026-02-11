'use client'

import { useState } from 'react'

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

function getFromParticipant(message: Message) {
  return message.email_participants.find((p) => p.type === 'from')
}

function getToParticipants(message: Message) {
  return message.email_participants.filter((p) => p.type === 'to')
}

function getCcParticipants(message: Message) {
  return message.email_participants.filter((p) => p.type === 'cc')
}

function getInitial(name: string | null, email: string): string {
  if (name && name.length >= 1) return name.slice(0, 1).toUpperCase()
  if (email && email.length >= 1) return email.slice(0, 1).toUpperCase()
  return '?'
}

export default function ThreadView({ thread, loading, onReply, onReplyAll, onForward }: ThreadViewProps) {
  const [isStarred, setIsStarred] = useState(thread?.starred ?? false)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="material-icons-round text-4xl text-slate-400 animate-spin" aria-hidden>refresh</span>
        <span className="sr-only">Loading thread</span>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <span className="material-icons-outlined text-6xl opacity-50 block mb-4" aria-hidden>mail_outline</span>
          <p className="text-lg font-medium mb-2">No thread selected</p>
        </div>
      </div>
    )
  }

  const firstMessage = thread.messages?.[0]
  const fromParticipant = firstMessage ? getFromParticipant(firstMessage) : null
  const displayName = fromParticipant?.name || fromParticipant?.email || 'Unknown'
  const toNames = firstMessage ? getToParticipants(firstMessage).map((p) => p.name || p.email).join(', ') : ''
  const dateStr = firstMessage ? formatDate(firstMessage.received_at || firstMessage.sent_at) : ''

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Elite toolbar */}
      <div className="h-20 flex items-center justify-between px-8 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-full uppercase tracking-wide">
            Leads
          </span>
          <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full uppercase tracking-wide">
            Inbox
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReply}
            className="w-9 h-9 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center justify-center"
            aria-label="Reply"
          >
            <span className="material-icons-round text-[20px] transform -scale-x-100" aria-hidden>reply</span>
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center justify-center"
            aria-label="Archive"
          >
            <span className="material-icons-outlined text-[20px]" aria-hidden>archive</span>
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center justify-center"
            aria-label="Delete"
          >
            <span className="material-icons-outlined text-[20px]" aria-hidden>delete</span>
          </button>
          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-2" aria-hidden />
          <button
            type="button"
            className="w-9 h-9 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center justify-center"
            aria-label="More options"
          >
            <span className="material-icons-outlined text-[20px]" aria-hidden>more_vert</span>
          </button>
        </div>
      </div>

      {/* Message content - Elite card */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-8 mb-24">
          {/* Card header: from, to, date */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                {getInitial(fromParticipant?.name ?? null, fromParticipant?.email ?? '')}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white text-base">{displayName}</span>
                  {fromParticipant?.email && (
                    <span className="text-slate-400 dark:text-slate-500 text-xs">
                      &lt;{fromParticipant.email}&gt;
                    </span>
                  )}
                </div>
                {toNames && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    to: <span className="text-slate-700 dark:text-slate-300 font-medium">{toNames}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">{dateStr}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              {thread.subject || '(No Subject)'}
            </h1>

            {thread.messages?.map((message) => {
              const from = getFromParticipant(message)
              return (
                <div key={message.id} className="space-y-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {message.body_html ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: message.body_html }}
                        className="text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                        {message.body_plain || message.snippet}
                      </p>
                    )}
                  </div>
                  {message.email_attachments && message.email_attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Attachments:
                      </div>
                      <div className="space-y-2">
                        {message.email_attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.storage_path || '#'}
                            className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                          >
                            <span className="material-icons-outlined text-slate-400 text-lg" aria-hidden>attach_file</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{att.filename}</span>
                            {att.size_bytes > 0 && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                                {(att.size_bytes / 1024).toFixed(1)} KB
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
