/**
 * Postiz Integration Entry Point
 * 
 * Phase 5: UI Embedding - Main page for Postiz social media planner
 * This page mounts Postiz's native UI components inside NextDeal's DashboardLayout.
 * 
 * Routes:
 * - /dashboard/postiz - Main dashboard (launches/posts overview)
 * - /dashboard/postiz/launches - Post scheduling and management (default)
 * - /dashboard/postiz/analytics - Analytics dashboard
 * - /dashboard/postiz/media - Media library
 * - /dashboard/postiz/settings - Postiz settings
 */

'use client'

import { Suspense } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { PostizProvider } from './providers/PostizProvider'
import { PostizWrapper } from './components/PostizWrapper'
import { PostizLaunches } from './components/PostizLaunches'

export default function PostizPage() {
  return (
    <DashboardLayout>
      <PostizProvider>
        <PostizWrapper>
          <PostizLaunches />
        </PostizWrapper>
      </PostizProvider>
    </DashboardLayout>
  )
}
