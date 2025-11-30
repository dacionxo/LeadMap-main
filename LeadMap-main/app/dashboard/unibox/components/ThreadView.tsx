'use client'

import { 
  Reply, 
  ReplyAll, 
  Forward, 
  Archive, 
  Star, 
  MoreVertical,
  RefreshCw,
  Mail,
  Clock,
  User,
  FileText,
  Tag
} from 'lucide-react'
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
    contacts?: any
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
  contact?: any
  listing?: any
  campaign?: any
}

interface Props {
  thread: Thread | null
  loading: boolean
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
}

export default function ThreadView({ thread, loading, onReply, onReplyAll, onForward }: Props) {
  const [isStarred, setIsStarred] = useState(thread?.starred || false)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No thread selected</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getFromParticipant = (message: Message) => {
    return message.email_participants.find(p => p.type === 'from')
  }

  const getToParticipants = (message: Message) => {
    return message.email_participants.filter(p => p.type === 'to')
  }

  const getCcParticipants = (message: Message) => {
    return message.email_participants.filter(p => p.type === 'cc')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Thread Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {thread.subject || '(No Subject)'}
              </h2>
              {thread.status !== 'open' && (
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  thread.status === 'needs_reply'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    : thread.status === 'closed'
                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {thread.status.replace('_', ' ')}
                </span>
              )}
            </div>
            
            {/* CRM Links */}
            {(thread.contact || thread.listing || thread.campaign) && (
              <div className="flex items-center gap-4 mb-2 text-sm">
                {thread.contact && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span>Contact: {thread.contact.first_name} {thread.contact.last_name}</span>
                  </div>
                )}
                {thread.listing && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <FileText className="w-4 h-4" />
                    <span>Listing: {thread.listing.address}</span>
                  </div>
                )}
                {thread.campaign && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Tag className="w-4 h-4" />
                    <span>Campaign: {thread.campaign.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStarred(!isStarred)}
              className={`p-2 rounded-lg transition-colors ${
                isStarred
                  ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={isStarred ? 'Unstar' : 'Star'}
            >
              <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReply}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Reply className="w-4 h-4" />
            Reply
          </button>
          <button
            onClick={onReplyAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ReplyAll className="w-4 h-4" />
            Reply All
          </button>
          <button
            onClick={onForward}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Forward className="w-4 h-4" />
            Forward
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {thread.messages.map((message, index) => {
          const from = getFromParticipant(message)
          const to = getToParticipants(message)
          const cc = getCcParticipants(message)
          const isInbound = message.direction === 'inbound'
          const date = message.received_at || message.sent_at

          return (
            <div
              key={message.id}
              className={`border rounded-lg p-4 ${
                isInbound
                  ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {from?.name || from?.email || 'Unknown'}
                    </span>
                    {from?.email && from?.name && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        &lt;{from.email}&gt;
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {to.length > 0 && (
                      <div>
                        <span className="font-medium">to:</span>{' '}
                        {to.map(p => p.name || p.email).join(', ')}
                      </div>
                    )}
                    {cc.length > 0 && (
                      <div>
                        <span className="font-medium">cc:</span>{' '}
                        {cc.map(p => p.name || p.email).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                {date && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(date)}
                  </div>
                )}
              </div>

              {/* Message Body */}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {message.body_html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: message.body_html }}
                    className="text-gray-900 dark:text-gray-100"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                    {message.body_plain || message.snippet}
                  </p>
                )}
              </div>

              {/* Attachments */}
              {message.email_attachments && message.email_attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attachments:
                  </div>
                  <div className="space-y-2">
                    {message.email_attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.storage_path || '#'}
                        className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {attachment.filename}
                        </span>
                        {attachment.size_bytes && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                            {(attachment.size_bytes / 1024).toFixed(1)} KB
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
  )
}


