'use client'

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

const PRIMARY = '#137fec'

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
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

function getInitial(name: string | null, email: string): string {
  if (name && name.length >= 1) return name.slice(0, 1).toUpperCase()
  if (email && email.length >= 1) return email.slice(0, 1).toUpperCase()
  return '?'
}

export default function ThreadView({
  thread,
  loading,
  onReply,
  onReplyAll,
  onForward,
  onDeleteDraft,
  onMoveToTrash,
  onArchive,
  onStar,
  onRestore,
  onPermanentDelete,
}: ThreadViewProps) {
  const isDraft = thread?.status === 'draft'
  const isRecyclingBin = !!onRestore || !!onPermanentDelete

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-slate-400 animate-spin">
          refresh
        </span>
        <span className="sr-only">Loading thread</span>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <span className="material-symbols-outlined text-6xl opacity-30 block mb-4">mail</span>
          <p className="text-lg font-medium mb-1">No email selected</p>
          <p className="text-sm text-slate-400">Select an email to read it here</p>
        </div>
      </div>
    )
  }

  const messages = Array.isArray(thread.messages) ? thread.messages : []
  const firstMessage = messages[0]
  const fromParticipant = getFromParticipant(firstMessage)
  const displayName = fromParticipant?.name || fromParticipant?.email || 'Unknown'
  const toParticipants = getToParticipants(firstMessage)
  const toNames = toParticipants.map((p) => p?.name || p?.email || '').filter(Boolean).join(', ')
  const dateStr = firstMessage ? formatDate(firstMessage.received_at || firstMessage.sent_at) : ''
  const initial = getInitial(fromParticipant?.name ?? null, fromParticipant?.email ?? '')

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Toolbar — matches HTML header h-20 */}
      <header className="h-20 flex items-center justify-between px-10 border-b border-white/20 flex-shrink-0">
        {isDraft ? (
          /* Draft toolbar */
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-full uppercase tracking-wide">
              Draft
            </span>
          </div>
        ) : isRecyclingBin ? (
          /* Recycling bin toolbar */
          <div className="flex items-center gap-3">
            {onRestore && (
              <button
                type="button"
                onClick={() => onRestore?.()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-100 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">restore</span>
                Restore
              </button>
            )}
            {onPermanentDelete && (
              <button
                type="button"
                onClick={() => onPermanentDelete?.()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-100 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                Delete permanently
              </button>
            )}
          </div>
        ) : (
          /* Normal inbox toolbar — left action icons */
          <div className="flex items-center gap-4">
            {onArchive && (
              <button
                type="button"
                onClick={() => onArchive?.()}
                className="text-slate-500 hover:text-[#137fec] transition-colors"
                aria-label={thread.archived ? 'Unarchive' : 'Archive'}
              >
                <span className="material-symbols-outlined">archive</span>
              </button>
            )}
            <button
              type="button"
              className="text-slate-500 hover:text-[#137fec] transition-colors"
              aria-label="Report spam"
            >
              <span className="material-symbols-outlined">report</span>
            </button>
            {onMoveToTrash && (
              <button
                type="button"
                onClick={() => onMoveToTrash?.()}
                className="text-slate-500 hover:text-[#137fec] transition-colors"
                aria-label="Move to Trash"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
            <div className="h-4 w-px bg-slate-200 mx-2" aria-hidden />
            <button
              type="button"
              className="text-slate-500 hover:text-[#137fec] transition-colors"
              aria-label="Mark as unread"
            >
              <span className="material-symbols-outlined">mark_as_unread</span>
            </button>
            {onStar && (
              <button
                type="button"
                onClick={() => onStar?.()}
                className="text-slate-500 hover:text-[#137fec] transition-colors"
                aria-label={thread.starred ? 'Unstar' : 'Star'}
              >
                <span className="material-symbols-outlined">{thread.starred ? 'star' : 'schedule'}</span>
              </button>
            )}
            {!onStar && (
              <button
                type="button"
                className="text-slate-500 hover:text-[#137fec] transition-colors"
                aria-label="Snooze"
              >
                <span className="material-symbols-outlined">schedule</span>
              </button>
            )}
          </div>
        )}

        {/* Right side — Reply + more */}
        <div className="flex items-center gap-3">
          {isDraft && onDeleteDraft ? (
            <button
              type="button"
              onClick={() => onDeleteDraft?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-100 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete draft
            </button>
          ) : !isRecyclingBin ? (
            <button
              type="button"
              onClick={onReply}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-100 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">reply</span>
              Reply
            </button>
          ) : null}
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white transition-all"
            aria-label="More options"
          >
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>
      </header>

      {/* Email content area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-10">
        <div className="max-w-[800px] mx-auto">
          {/* Email meta header */}
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-slate-900 mb-6 tracking-tight">
              {thread.subject || '(No Subject)'}
            </h1>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden flex-shrink-0"
                  style={{ background: 'rgba(19,127,236,0.10)', color: PRIMARY }}
                >
                  {initial}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{displayName}</p>
                    {fromParticipant?.email && (
                      <span className="text-xs text-slate-400">
                        &lt;{fromParticipant.email}&gt;
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {toNames ? `to ${toNames}` : 'to me'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium flex-shrink-0">{dateStr}</p>
            </div>
          </div>

          {/* Email content card */}
          <div className="bg-white rounded-lg p-1 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            {(Array.isArray(thread.messages) ? thread.messages : [])
              .filter((m): m is Message => !!m && !!m.id)
              .map((message) => (
                <div key={message.id}>
                  {message.body_html ? (
                    <div className="overflow-x-auto max-w-full min-w-0">
                      <EmailBodySandbox
                        html={message.body_html}
                        className="text-slate-900"
                      />
                    </div>
                  ) : (
                    <div className="p-8">
                      <p className="whitespace-pre-wrap text-slate-900 text-sm leading-relaxed">
                        {message.body_plain || message.snippet || ''}
                      </p>
                    </div>
                  )}
                  {Array.isArray(message.email_attachments) &&
                    message.email_attachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 px-8 pb-6">
                        <div className="text-sm font-medium text-slate-700 mb-2">
                          Attachments
                        </div>
                        <div className="space-y-2">
                          {message.email_attachments
                            .filter((att) => att?.id)
                            .map((att) => (
                              <a
                                key={att.id}
                                href={att.storage_path || '#'}
                                className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-slate-400 text-lg">
                                  attach_file
                                </span>
                                <span className="text-sm text-slate-700">{att.filename}</span>
                                {(att.size_bytes ?? 0) > 0 && (
                                  <span className="text-xs text-slate-500 ml-auto">
                                    {((att.size_bytes ?? 0) / 1024).toFixed(1)} KB
                                  </span>
                                )}
                              </a>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
          </div>

          {/* Reply actions at bottom */}
          {!isDraft && !isRecyclingBin && (
            <div className="mt-10 flex items-center gap-3">
              <button
                type="button"
                onClick={onReply}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white border border-slate-100 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">reply</span>
                Reply
              </button>
              <button
                type="button"
                onClick={onReplyAll}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white border border-slate-100 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">reply_all</span>
                Reply All
              </button>
              <button
                type="button"
                onClick={onForward}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white border border-slate-100 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">forward</span>
                Forward
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
