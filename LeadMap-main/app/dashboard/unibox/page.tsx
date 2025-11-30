'use client'

import { Suspense } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import UniboxContent from './components/UniboxContent'

export default function UniboxPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading Unibox...</div>
        </div>
      }>
        <UniboxContent />
      </Suspense>
    </DashboardLayout>
  )
}

