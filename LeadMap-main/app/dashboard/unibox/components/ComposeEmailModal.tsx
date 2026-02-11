'use client'

import { useState, useEffect, useCallback } from 'react'

interface Mailbox {
  id: string
  email: string
  display_name: string | null
  provider: string
  active?: boolean
}

interface ComposeEmailModalProps {
  onClose: () => void
  onSent?: () => void
  /** Pre-fill mailbox when opened from a thread (optional) */
  defaultMailboxId?: string | null
}

/**
 * Elite CRM Advanced Compose Modal
 * 1:1 design with reference HTML: Inter, Material Symbols, slate/primary tokens.
 * Uses existing APIs: /api/mailboxes, /api/emails/send (no route changes).
 * Same size as ReplyComposer: max-w-3xl, max-h-[90vh].
 */
export default function ComposeEmailModal({
  onClose,
  onSent,
  defaultMailboxId = null,
}: ComposeEmailModalProps) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [mailboxId, setMailboxId] = useState<string>(defaultMailboxId || '')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [showReplyTo, setShowReplyTo] = useState(false)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [sending, setSending] = useState(false)
  const [sendLaterOpen, setSendLaterOpen] = useState(false)

  const fetchMailboxes = useCallback(async () => {
    try {
      const response = await fetch('/api/mailboxes', { credentials: 'include' })
      if (!response.ok) return
      const data = await response.json()
      const list: Mailbox[] = (data.mailboxes || []).filter(
        (m: Mailbox) => m.active !== false
      )
      setMailboxes(list)
      if (list.length > 0 && !mailboxId) {
        const defaultId = defaultMailboxId && list.some((m) => m.id === defaultMailboxId)
          ? defaultMailboxId
          : list[0].id
        setMailboxId(defaultId)
      }
    } catch (e) {
      console.error('Error fetching mailboxes:', e)
    }
  }, [defaultMailboxId, mailboxId])

  useEffect(() => {
    fetchMailboxes()
  }, [fetchMailboxes])

  const handleDiscard = () => {
    if (to || subject || body) {
      if (window.confirm('Discard this email?')) onClose()
    } else {
      onClose()
    }
  }

  const handleSendNow = async () => {
    const toList = to
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    if (!mailboxId || toList.length === 0 || !subject.trim()) {
      alert('Please fill in Sender, To, and Subject.')
      return
    }

    setSending(true)
    try {
      const payload: Record<string, unknown> = {
        mailboxId,
        to: toList,
        subject: subject.trim(),
        html: body.trim() || '<p></p>',
      }
      if (showCc && cc.trim()) {
        payload.cc = cc.split(',').map((e) => e.trim()).filter(Boolean)
      }
      if (showBcc && bcc.trim()) {
        payload.bcc = bcc.split(',').map((e) => e.trim()).filter(Boolean)
      }
      if (showReplyTo && replyTo.trim()) {
        payload.replyTo = replyTo.trim()
      }

      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }
      onSent?.()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="compose-modal-mesh fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 font-sans"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-email-title"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-modal-depth relative flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
          <h2
            id="compose-email-title"
            className="text-xl font-bold text-[#1E293B] tracking-tight"
          >
            Compose Email
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 flex-grow flex flex-col gap-5 bg-white overflow-y-auto min-h-0">
          {/* Sender */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <label
              htmlFor="compose-sender"
              className="md:col-span-2 text-sm font-medium text-slate-500"
            >
              Sender
            </label>
            <div className="md:col-span-10 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">
                  account_circle
                </span>
              </div>
              <select
                id="compose-sender"
                value={mailboxId}
                onChange={(e) => setMailboxId(e.target.value)}
                className="w-full pl-10 bg-slate-50 border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer hover:bg-white"
                aria-label="Sender mailbox"
              >
                {mailboxes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.email} &lt;{m.email}&gt;
                  </option>
                ))}
                {mailboxes.length === 0 && (
                  <option value="">No mailbox available</option>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* To + Cc/Bcc/Reply-to toggles */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <label
              htmlFor="compose-to"
              className="md:col-span-2 text-sm font-medium text-slate-500 pt-3"
            >
              To
            </label>
            <div className="md:col-span-10">
              <input
                id="compose-to"
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Separate recipients with commas..."
                className="w-full bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                aria-label="To recipients"
              />
              <div className="flex items-center gap-4 mt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showCc}
                    onChange={(e) => setShowCc(e.target.checked)}
                    className="rounded text-blue-500 border-slate-300 focus:ring-blue-500/20 w-4 h-4"
                    aria-label="Show Cc"
                  />
                  <span className="text-xs font-medium text-slate-500 group-hover:text-blue-500 transition-colors">
                    Cc
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showBcc}
                    onChange={(e) => setShowBcc(e.target.checked)}
                    className="rounded text-blue-500 border-slate-300 focus:ring-blue-500/20 w-4 h-4"
                    aria-label="Show Bcc"
                  />
                  <span className="text-xs font-medium text-slate-500 group-hover:text-blue-500 transition-colors">
                    Bcc
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showReplyTo}
                    onChange={(e) => setShowReplyTo(e.target.checked)}
                    className="rounded text-blue-500 border-slate-300 focus:ring-blue-500/20 w-4 h-4"
                    aria-label="Show Reply-to"
                  />
                  <span className="text-xs font-medium text-slate-500 group-hover:text-blue-500 transition-colors">
                    Reply-to
                  </span>
                </label>
              </div>
              {showCc && (
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Cc..."
                  className="mt-2 w-full bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  aria-label="Cc"
                />
              )}
              {showBcc && (
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Bcc..."
                  className="mt-2 w-full bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  aria-label="Bcc"
                />
              )}
              {showReplyTo && (
                <input
                  type="text"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="Reply-to..."
                  className="mt-2 w-full bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  aria-label="Reply-to"
                />
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <label
              htmlFor="compose-subject"
              className="md:col-span-2 text-sm font-medium text-slate-500"
            >
              Subject
            </label>
            <div className="md:col-span-10">
              <input
                id="compose-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject line"
                className="w-full bg-white border border-[#E2E8F0] text-[#1E293B] font-semibold rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                aria-label="Subject"
              />
            </div>
          </div>

          {/* Preview Text */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <label
              htmlFor="compose-preview"
              className="md:col-span-2 text-sm font-medium text-slate-500"
            >
              Preview Text
            </label>
            <div className="md:col-span-10">
              <input
                id="compose-preview"
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Optional text shown in inbox list view..."
                className="w-full bg-slate-50 border border-transparent hover:border-[#E2E8F0] focus:bg-white text-[#64748B] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-400"
                aria-label="Preview text"
              />
            </div>
          </div>

          {/* Body editor */}
          <div className="flex-grow flex flex-col pt-2 border-t border-dashed border-slate-200 mt-1 min-h-0">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Bold"
                aria-label="Bold"
              >
                <span className="material-symbols-outlined text-[18px]">
                  format_bold
                </span>
              </button>
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Italic"
                aria-label="Italic"
              >
                <span className="material-symbols-outlined text-[18px]">
                  format_italic
                </span>
              </button>
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Link"
                aria-label="Insert link"
              >
                <span className="material-symbols-outlined text-[18px]">link</span>
              </button>
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="List"
                aria-label="Insert list"
              >
                <span className="material-symbols-outlined text-[18px]">
                  format_list_bulleted
                </span>
              </button>
              <div className="h-4 w-px bg-slate-200 mx-1" aria-hidden />
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                aria-label="Trigger Links"
              >
                <span className="material-symbols-outlined text-[16px]">
                  smart_button
                </span>
                Trigger Links
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email content here..."
              className="w-full flex-grow min-h-[200px] bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-y placeholder-slate-400 leading-relaxed"
              aria-label="Email body"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors"
            aria-label="Discard"
          >
            Discard
          </button>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button
                type="button"
                onClick={() => setSendLaterOpen(!sendLaterOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all"
                aria-label="Send later options"
              >
                <span className="material-symbols-outlined text-[18px]">
                  schedule
                </span>
                <span>Send Later</span>
                <span className="material-symbols-outlined text-[16px]">
                  expand_more
                </span>
              </button>
            </div>
            <div className="flex rounded-full shadow-lg shadow-blue-500/30 transition-transform active:scale-95">
              <button
                type="button"
                onClick={handleSendNow}
                disabled={sending}
                className="pl-6 pr-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-l-full border-r border-blue-400 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send now"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                Send Now
              </button>
              <button
                type="button"
                className="pl-2 pr-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-r-full transition-colors flex items-center justify-center disabled:opacity-50"
                aria-label="Send options"
                disabled={sending}
              >
                <span className="material-symbols-outlined text-[18px]">
                  expand_more
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
