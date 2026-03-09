'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Mailbox {
  id: string
  email: string
  display_name: string | null
  provider: string
  active?: boolean
}

interface ComposeEmailModalProps {
  onClose: () => void
  /** Called when email sent. If editing a draft, passes draftId to delete. */
  onSent?: (deletedDraftId?: string) => void
  /** Pre-fill mailbox when opened from a thread (optional) */
  defaultMailboxId?: string | null
  /** Initial draft data when editing a draft (optional) */
  initialDraft?: {
    draftId: string
    to: string | string[]
    subject: string
    html: string
    mailboxId?: string | null
    cc?: string | string[]
    bcc?: string | string[]
    replyTo?: string | null
    previewText?: string | null
  } | null
}

const getMinScheduleDateTimeLocal = () => {
  const now = new Date(Date.now() + 60000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1)
  const day = pad(now.getDate())
  const hours = pad(now.getHours())
  const minutes = pad(now.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
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
  initialDraft = null,
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
  const [savingDraft, setSavingDraft] = useState(false)
  const [sendLaterOpen, setSendLaterOpen] = useState(false)
  const [showCustomSchedule, setShowCustomSchedule] = useState(false)
  const [customScheduleAt, setCustomScheduleAt] = useState('')
  const sendLaterRef = useRef<HTMLDivElement>(null)
  const bodyEditorRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!sendLaterOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (sendLaterRef.current && !sendLaterRef.current.contains(e.target as Node)) {
        setSendLaterOpen(false)
        setShowCustomSchedule(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sendLaterOpen])

  useEffect(() => {
    if (initialDraft) {
      const toStr = Array.isArray(initialDraft.to)
        ? initialDraft.to.join(', ')
        : initialDraft.to
      setTo(toStr || '')
      setSubject(initialDraft.subject || '')
      setBody(initialDraft.html || '')
      if (initialDraft.mailboxId) setMailboxId(initialDraft.mailboxId)
      const ccStr = Array.isArray(initialDraft.cc)
        ? initialDraft.cc.join(', ')
        : (initialDraft.cc || '')
      const bccStr = Array.isArray(initialDraft.bcc)
        ? initialDraft.bcc.join(', ')
        : (initialDraft.bcc || '')
      setCc(ccStr)
      setBcc(bccStr)
      setReplyTo(initialDraft.replyTo || '')
      setPreviewText(initialDraft.previewText || '')
      if (ccStr.trim()) setShowCc(true)
      if (bccStr.trim()) setShowBcc(true)
      if (initialDraft.replyTo?.trim()) setShowReplyTo(true)
    }
  }, [initialDraft])

  // Hydrate contentEditable body editor when draft loads or new compose
  useEffect(() => {
    const el = bodyEditorRef.current
    if (!el) return
    const html = initialDraft?.html ?? ''
    el.innerHTML = html || ''
  }, [initialDraft])

  const hasContent = !!(to || subject || body)

  const handleSaveDraft = async (andClose = false) => {
    if (!subject && !body) return
    setSavingDraft(true)
    try {
      const m = mailboxes.find((mb) => mb.id === mailboxId)
      const toList = to
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
      const ccList = showCc && cc.trim()
        ? cc.split(',').map((e) => e.trim()).filter(Boolean)
        : []
      const bccList = showBcc && bcc.trim()
        ? bcc.split(',').map((e) => e.trim()).filter(Boolean)
        : []
      const payload = {
        subject: subject || '(No Subject)',
        htmlContent: body.trim() || '',
        to: toList,
        cc: ccList,
        bcc: bccList,
        mailboxId: mailboxId || null,
        fromName: m?.display_name || null,
        fromEmail: m?.email || null,
        replyTo: showReplyTo && replyTo.trim() ? replyTo.trim() : null,
        previewText: previewText.trim() || null,
      }
      const url = initialDraft?.draftId
        ? `/api/emails/drafts/${initialDraft.draftId}`
        : '/api/emails/drafts'
      const response = await fetch(url, {
        method: initialDraft?.draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save draft')
      }
      if (andClose) {
        onSent?.()
        onClose()
      }
    } catch (err) {
      if (andClose) onClose()
      else alert(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleCloseOrDiscard = () => {
    if (hasContent) {
      handleSaveDraft(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => handleCloseOrDiscard()

  const buildSendPayload = (): Record<string, unknown> | null => {
    const toList = to
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    if (!mailboxId || toList.length === 0 || !subject.trim()) {
      alert('Please fill in Sender, To, and Subject.')
      return null
    }
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
    if (previewText.trim()) {
      payload.previewText = previewText.trim()
    }
    return payload
  }

  const sendEmail = async (scheduleAt?: string) => {
    if (sending) return // Prevent double/triple submit (e.g. double-click or strict mode)
    const payload = buildSendPayload()
    if (!payload) return
    if (scheduleAt) payload.scheduleAt = scheduleAt

    setSending(true)
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send email')
      onSent?.(initialDraft?.draftId)
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleSendNow = () => sendEmail()

  const handleSendLater = (scheduleAt: string) => {
    setSendLaterOpen(false)
    setShowCustomSchedule(false)
    sendEmail(scheduleAt)
  }

  const handleCustomSchedule = () => {
    const dt = customScheduleAt ? new Date(customScheduleAt) : null
    if (!dt || dt <= new Date()) {
      alert('Please select a future date and time.')
      return
    }
    handleSendLater(dt.toISOString())
  }

  const getScheduleOptions = (): { label: string; value: string }[] => {
    const now = new Date()
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000)
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000)
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const today5pm = new Date(now)
    today5pm.setHours(17, 0, 0, 0)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const nextMonday = new Date(now)
    let daysUntilMonday = (8 - now.getDay()) % 7
    if (daysUntilMonday === 0) daysUntilMonday = 7
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
    nextMonday.setHours(9, 0, 0, 0)
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    nextWeek.setHours(9, 0, 0, 0)

    const options: { label: string; value: string }[] = [
      { label: 'In 30 minutes', value: in30Min.toISOString() },
      { label: 'In 1 hour', value: in1Hour.toISOString() },
      { label: 'In 2 hours', value: in2Hours.toISOString() },
    ]
    if (today5pm > now) {
      options.push({ label: 'Today at 5:00 PM', value: today5pm.toISOString() })
    }
    options.push(
      { label: 'Tomorrow at 9:00 AM', value: tomorrow.toISOString() },
      { label: 'Next Monday at 9:00 AM', value: nextMonday.toISOString() },
      { label: 'Next week', value: nextWeek.toISOString() },
    )
    return options
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCloseOrDiscard()
    }
  }

  const syncBodyFromEditor = () => {
    const el = bodyEditorRef.current
    if (el) setBody(el.innerHTML)
  }

  const handleBold = () => {
    bodyEditorRef.current?.focus()
    document.execCommand('bold', false)
    syncBodyFromEditor()
  }
  const handleItalic = () => {
    bodyEditorRef.current?.focus()
    document.execCommand('italic', false)
    syncBodyFromEditor()
  }
  const handleLink = () => {
    const el = bodyEditorRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null
    const selectedText = range ? range.toString() : ''
    const url = prompt('Enter URL:', selectedText.startsWith('http') ? selectedText : 'https://')
    if (url == null) return
    const href = url.trim() || 'https://'
    document.execCommand('createLink', false, href)
    syncBodyFromEditor()
  }
  const handleList = () => {
    bodyEditorRef.current?.focus()
    document.execCommand('insertUnorderedList', false)
    syncBodyFromEditor()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 font-sans bg-slate-900/40 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
      onClick={handleCloseOrDiscard}
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
            onClick={handleCloseOrDiscard}
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
                  placeholder="Separate recipients with commas..."
                  className="mt-2 w-full bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  aria-label="Cc"
                />
              )}
              {showBcc && (
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Separate recipients with commas..."
                  className="mt-2 w-full bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  aria-label="Bcc"
                />
              )}
              {showReplyTo && (
                <input
                  type="text"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="Email address for replies (e.g. support@example.com)"
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleBold}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleItalic}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleLink}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Link"
                aria-label="Insert link"
              >
                <span className="material-symbols-outlined text-[18px]">link</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleList}
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
            <div
              ref={bodyEditorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write your email content here..."
              onInput={syncBodyFromEditor}
              onBlur={syncBodyFromEditor}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault()
                  document.execCommand('insertText', false, '  ')
                  syncBodyFromEditor()
                }
              }}
              className="w-full flex-grow min-h-[200px] bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
              aria-label="Email body"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors"
              aria-label="Discard"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => handleSaveDraft(true)}
              disabled={savingDraft || (!subject && !body)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Save draft"
            >
              {savingDraft ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">drafts</span>
              )}
              Save Draft
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={sendLaterRef}>
              <button
                type="button"
                onClick={() => {
                  setSendLaterOpen(!sendLaterOpen)
                  if (sendLaterOpen) setShowCustomSchedule(false)
                }}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send later options"
                aria-haspopup="menu"
              >
                <span className="material-symbols-outlined text-[18px]">
                  schedule
                </span>
                <span>Send Later</span>
                <span className={`material-symbols-outlined text-[16px] transition-transform ${sendLaterOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {sendLaterOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500">Schedule send time</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {getScheduleOptions().map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSendLater(opt.value)}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-400">
                          schedule
                        </span>
                        {opt.label}
                      </button>
                    ))}
                    {!showCustomSchedule ? (
                      <button
                        type="button"
                        onClick={() => setShowCustomSchedule(true)}
                        className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          event
                        </span>
                        Pick date & time
                      </button>
                    ) : (
                      <div className="px-4 py-3 border-t border-slate-100 space-y-2">
                        <label htmlFor="send-later-datetime" className="block text-xs font-medium text-slate-500">Custom date & time</label>
                        <input
                          id="send-later-datetime"
                          type="datetime-local"
                          value={customScheduleAt}
                          onChange={(e) => setCustomScheduleAt(e.target.value)}
                          min={getMinScheduleDateTimeLocal()}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          aria-label="Custom date and time for scheduled send"
                        />
                        <button
                          type="button"
                          onClick={handleCustomSchedule}
                          disabled={!customScheduleAt || sending}
                          className="w-full py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Schedule
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
