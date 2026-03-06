'use client'

import { useEffect } from 'react'

interface CalendarHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CalendarHelpModal({ isOpen, onClose }: CalendarHelpModalProps) {
  if (!isOpen) return null

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >

      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-help-title"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 id="calendar-help-title" className="text-2xl font-bold text-slate-800 dark:text-white">
            Calendar Help &amp; Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <section>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Getting Started</h3>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <p className="font-bold text-slate-800 dark:text-slate-100 mb-4 text-base">
                Welcome to the Elite CRM Calendar. To get started quickly:
              </p>
              <ul className="space-y-3 text-slate-700 dark:text-slate-300 text-sm list-disc pl-5">
                <li>Sync your external calendars via the Settings &gt; Integrations menu.</li>
                <li>Use the view toggles (Day, Week, Month) in the header to manage your schedule.</li>
                <li>Click and drag anywhere on the calendar grid or press 'C' to create a new event.</li>
                <li>Share your calendar with team members for seamless collaboration.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-icons text-slate-400">keyboard</span>
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Today view</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quickly jump to the current day</div>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm">T</kbd>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Month view</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Switch to a full monthly overview</div>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm">M</kbd>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Week view</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Switch to the standard 7-day week</div>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm">W</kbd>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Day view</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Focus on a single day's schedule</div>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm">D</kbd>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Create new event</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Open the new event dialog</div>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm">C</kbd>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Search events</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Focus the calendar search bar</div>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm">/</kbd>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-icons text-slate-400">help_outline</span>
              Common Questions
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">How do I sync my Google Calendar?</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Go to Settings &gt; Integrations &gt; Calendar and click 'Connect Google Calendar'. Follow the authentication steps to sync your events bidirectionally.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Can I share my calendar with team members?</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Yes, click the 'Share' button in the top right corner of the main calendar view to manage permissions for your team members.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">How do I set up recurring events?</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  When creating or editing an event, look for the 'Repeat' dropdown option to set daily, weekly, monthly, or custom recurring rules.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="px-8 py-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <a
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
            href="#"
          >
            <span className="material-icons text-[18px]">launch</span>
            View Full Documentation
          </a>
          <button
            type="button"
            className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-slate-900 w-full sm:w-auto justify-center"
          >
            <span className="material-icons text-[20px]">chat</span>
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}

