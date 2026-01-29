/**
 * Postiz Context Provider
 * 
 * Provides Postiz-specific context including:
 * - Workspace/organization context
 * - Feature flags based on user's subscription plan (from users.plan_tier)
 * - Postiz UI preferences
 * 
 * Phase 5: UI Embedding - Context bridge between NextDeal and Postiz
 */

'use client'

import { createContext, useContext, ReactNode, useMemo } from 'react'
import { useWorkspace, type Workspace } from '@/app/hooks/useWorkspace'
import { useApp } from '@/app/providers'

interface PostizFeatureFlags {
  canSchedule: boolean
  canUseEvergreen: boolean
  canUseRSS: boolean
  canUseAnalytics: boolean
  canUseAI: boolean
  maxSocialAccounts: number
  maxPostsPerMonth: number
}

interface PostizContextType {
  workspace: Workspace | null
  workspaceId: string | null
  loading: boolean
  features: PostizFeatureFlags
  refreshWorkspace: () => Promise<void>
}

export const PostizContext = createContext<PostizContextType | undefined>(undefined)

interface PostizProviderProps {
  children: ReactNode
}

export function PostizProvider({ children }: PostizProviderProps) {
  const { currentWorkspace, loading: workspaceLoading, refreshWorkspaces } = useWorkspace()
  const { profile } = useApp()
  
  // Get user's plan_tier from profile (users.plan_tier)
  // Use the user's plan instead of workspace plan
  const userPlanTier = useMemo(() => {
    if (!profile?.plan_tier) return 'free'
    return profile.plan_tier as 'free' | 'starter' | 'pro'
  }, [profile?.plan_tier])

  // Calculate features based on user's plan_tier
  const features = useMemo<PostizFeatureFlags>(() => {
    return getFeaturesForPlan(userPlanTier, {})
  }, [userPlanTier])

  const refreshWorkspace = async () => {
    await refreshWorkspaces()
  }

  const value: PostizContextType = {
    workspace: currentWorkspace,
    workspaceId: currentWorkspace?.workspace_id || null,
    loading: workspaceLoading,
    features,
    refreshWorkspace,
  }

  return <PostizContext.Provider value={value}>{children}</PostizContext.Provider>
}

export function usePostiz() {
  const context = useContext(PostizContext)
  if (context === undefined) {
    throw new Error('usePostiz must be used within a PostizProvider')
  }
  return context
}

/**
 * Map user plan tier to feature flags
 * Uses the user's plan_tier from the users table (NextDeal's subscription/plan logic)
 */
function getFeaturesForPlan(
  planTier: 'free' | 'starter' | 'pro' | 'enterprise',
  customFeatures: Record<string, any>
): PostizFeatureFlags {
  const baseFeatures: Record<string, PostizFeatureFlags> = {
    free: {
      canSchedule: true,
      canUseEvergreen: false,
      canUseRSS: false,
      canUseAnalytics: true,
      canUseAI: false,
      maxSocialAccounts: 3,
      maxPostsPerMonth: 50,
    },
    starter: {
      canSchedule: true,
      canUseEvergreen: true,
      canUseRSS: false,
      canUseAnalytics: true,
      canUseAI: false,
      maxSocialAccounts: 10,
      maxPostsPerMonth: 500,
    },
    pro: {
      canSchedule: true,
      canUseEvergreen: true,
      canUseRSS: true,
      canUseAnalytics: true,
      canUseAI: true,
      maxSocialAccounts: 50,
      maxPostsPerMonth: 5000,
    },
    enterprise: {
      canSchedule: true,
      canUseEvergreen: true,
      canUseRSS: true,
      canUseAnalytics: true,
      canUseAI: true,
      maxSocialAccounts: -1, // Unlimited
      maxPostsPerMonth: -1, // Unlimited
    },
  }

  const planFeatures = baseFeatures[planTier] || baseFeatures.free

  // Override with custom features from workspace.features JSONB
  if (customFeatures && typeof customFeatures === 'object') {
    return {
      ...planFeatures,
      ...(customFeatures.postiz?.features || {}),
    }
  }

  return planFeatures
}
