'use client'

import { X, Send, Mail } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Thread {
  id: string
  subject: string
  messages: Array<{
    id: string
    body_html: string
    body_plain: string
    email_participants: Array<{
      type: 'from' | 'to' | 'cc' | 'bcc'
      email: string
      name: string | null
    }>
  }>
}

interface Mailbox {
  id: string
  email: string
  display_name: string | null
}

interface Props {
  thread: Thread
  mode: 'reply' | 'reply-all' | 'forward' | null
  onClose: () => void
  onSend: (data: {
    to?: string
    cc?: string[]
    bcc?: string[]
    subject?: string
    bodyHtml: string
    bodyText: string
  }) => void
  mailbox: Mailbox
}

export default function ReplyComposer({ thread, mode, onClose, onSend, mailbox }: Props) {
  const [bodyHtml, setBodyHtml] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!thread || !mode) return

    const lastMessage = thread.messages[thread.messages.length - 1]
    if (!lastMessage) return

    if (mode === 'reply' || mode === 'reply-all') {
      // Set recipients
      const fromParticipant = lastMessage.email_participants.find(p => p.type === 'from')
      if (fromParticipant) {
        setTo(fromParticipant.name 
          ? `${fromParticipant.name} <${fromParticipant.email}>`
          : fromParticipant.email
        )
      }

      if (mode === 'reply-all') {
        const toParticipants = lastMessage.email_participants.filter(p => p.type === 'to')
        const ccParticipants = lastMessage.email_participants.filter(p => p.type === 'cc')
        
        const allRecipients = [
          ...toParticipants.map(p => p.email),
          ...ccParticipants.map(p => p.email)
        ].filter(email => email !== mailbox.email)
        
        setCc(allRecipients)
      }

      // Set subject
      const originalSubject = thread.subject || '(No Subject)'
      setSubject(originalSubject.toLowerCase().startsWith('re:') 
        ? originalSubject 
        : `Re: ${originalSubject}`
      )

      // Set quoted body
      const quotedHtml = `<blockquote style="border-left: 3px solid #ccc; margin: 0; padding-left: 1em; color: #666;">${lastMessage.body_html || lastMessage.body_plain.replace(/\n/g, '<br>')}</blockquote>`
      setBodyHtml(`<p><br></p>${quotedHtml}`)
      setBodyText(`\n\n${lastMessage.body_plain || lastMessage.body_html.replace(/<[^>]*>/g, '')}`)
    } else if (mode === 'forward') {
      // Forward setup
      setSubject(thread.subject?.toLowerCase().startsWith('fwd:') 
        ? thread.subject 
        : `Fwd: ${thread.subject || '(No Subject)'}`
      )

      const forwardedContent = thread.messages.map(msg => {
        const from = msg.email_participants.find(p => p.type === 'from')
        const date = new Date().toLocaleString()
        return `
          <div style="border-left: 3px solid #ccc; margin: 1em 0; padding-left: 1em;">
            <p><strong>From:</strong> ${from?.name || from?.email || 'Unknown'}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Subject:</strong> ${thread.subject || '(No Subject)'}</p>
            <div>${msg.body_html || msg.body_plain.replace(/\n/g, '<br>')}</div>
          </div>
        `
      }).join('<hr>')

      setBodyHtml(`<p><br></p>---------- Forwarded message ----------<br>${forwardedContent}`)
    }
  }, [thread, mode, mailbox])

  const handleEditorInput = () => {
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
      setBodyText(editorRef.current.innerText)
    }
  }

  const handleSend = () => {
    if (!bodyHtml.trim() && !bodyText.trim()) {
      alert('Please enter a message')
      return
    }

    if (mode === 'forward' && !to.trim()) {
      alert('Please enter a recipient')
      return
    }

    onSend({
      to: mode === 'forward' ? to : undefined,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      subject: mode === 'forward' ? subject : undefined,
      bodyHtml,
      bodyText
    })
  }

  const title = mode === 'reply' 
    ? 'Reply' 
    : mode === 'reply-all' 
    ? 'Reply All' 
    : 'Forward'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* To */}
          {mode === 'forward' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="recipient@example.com"
              />
            </div>
          )}

          {/* From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From
            </label>
            <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              {mailbox.display_name || mailbox.email}
            </div>
          </div>

          {/* CC/BCC Toggle */}
          {(mode === 'reply-all' || mode === 'forward') && (
            <div>
              <button
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showCcBcc ? 'Hide' : 'Show'} CC / BCC
              </button>
            </div>
          )}

          {/* CC */}
          {showCcBcc && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CC
              </label>
              <input
                type="text"
                value={cc.join(', ')}
                onChange={(e) => setCc(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="cc@example.com"
              />
            </div>
          )}

          {/* BCC */}
          {showCcBcc && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                BCC
              </label>
              <input
                type="text"
                value={bcc.join(', ')}
                onChange={(e) => setBcc(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="bcc@example.com"
              />
            </div>
          )}

          {/* Subject (only for forward) */}
          {mode === 'forward' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Message Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
              className="w-full min-h-[300px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ whiteSpace: 'pre-wrap' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

