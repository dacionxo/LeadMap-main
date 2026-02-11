'use client'

import { Suspense } from 'react'
import UniboxContent from './components/UniboxContent'

export default function UniboxPage() {
  return (
    <Suspense
      fallback={
        <div className="unibox-page unibox-mesh min-h-screen flex items-center justify-center">
          <div className="text-slate-500 dark:text-slate-400 font-display">Loading Unibox...</div>
        </div>
      }
    >
      <UniboxContent />
    </Suspense>
  )
}
