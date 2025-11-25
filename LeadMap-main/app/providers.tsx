'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import { PageStateProvider } from './contexts/PageStateContext'

interface UserProfile {
  id: string
  email: string
  name: string
  trial_end: string
  is_subscribed: boolean
  plan_tier: string
}

interface AppContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Memoize supabase client to prevent recreation on every render
  // Use a singleton pattern to prevent multiple instances
  const supabase = useMemo(() => {
    // Clear any existing client to prevent stale connections
    if (typeof window !== 'undefined') {
      // Only create one client instance per browser session
      if (!(window as any).__supabaseClient) {
        (window as any).__supabaseClient = createClientComponentClient()
      }
      return (window as any).__supabaseClient
    }
    return createClientComponentClient()
  }, [])
  
  // Track if profile refresh is in progress to prevent loops
  const refreshingProfile = useRef(false)

  const refreshProfile = useCallback(async () => {
    if (!user || refreshingProfile.current) return
    
    refreshingProfile.current = true
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // If profile doesn't exist, create it via API route (bypasses RLS)
        if (error.code === 'PGRST116' || error.message?.includes('No rows found') || error.message?.includes('not found')) {
          try {
            const response = await fetch('/api/users/create-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.id,
                email: user.email!,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              }),
            })

            const result = await response.json()

            if (response.ok && result.profile) {
              setProfile(result.profile)
              refreshingProfile.current = false
              return
            } else {
              console.error('Error creating profile:', result.error)
            }
          } catch (fetchError) {
            console.error('Error calling create-profile API:', fetchError)
          }
        }
        refreshingProfile.current = false
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error refreshing profile:', error)
    } finally {
      refreshingProfile.current = false
    }
  }, [user, supabase])

  useEffect(() => {
    let mounted = true
    let lastAuthCheck = 0
    const AUTH_CHECK_THROTTLE = 5000 // 5 seconds minimum between checks (more aggressive)
    let cachedSession: any = null

    const getUser = async () => {
      const now = Date.now()
      const timeSinceLastCheck = now - lastAuthCheck
      
      // Throttle auth checks aggressively to avoid rate limits
      if (timeSinceLastCheck < AUTH_CHECK_THROTTLE) {
        // Use cached session if available during throttle period
        if (cachedSession && mounted) {
          setUser(cachedSession?.user ?? null)
          setLoading(false)
          return
        }
        await new Promise(resolve => setTimeout(resolve, AUTH_CHECK_THROTTLE - timeSinceLastCheck))
      }
      
      if (!mounted) return
      
      try {
        // Use getSession instead of getUser to avoid extra API call (uses cached data)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          // Handle rate limit errors gracefully - use cached session if available
          if (error.message?.includes('rate limit') || error.message?.includes('Request rate limit')) {
            console.warn('Supabase rate limit hit, using cached session if available')
            if (mounted) {
              setUser(cachedSession?.user ?? null)
              setLoading(false)
            }
            return
          }
          console.error('Auth error:', error)
        }
        
        // Cache the session
        cachedSession = session
        lastAuthCheck = Date.now()
        
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error getting session:', err)
        // Use cached session on error if available
        if (mounted && cachedSession) {
          setUser(cachedSession?.user ?? null)
        }
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Initial check
    getUser()

    // Listen for auth changes (this doesn't make API calls, just listens to events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (mounted) {
          cachedSession = session // Update cache
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Remove refreshProfile dependency to avoid infinite loop

  // Separate useEffect to handle profile loading when user changes
  // Only depend on user.id to prevent loops
  useEffect(() => {
    if (user?.id && !refreshingProfile.current) {
      refreshProfile()
    } else if (!user) {
      setProfile(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // Only depend on user.id, not the whole user object or refreshProfile

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }


  return (
    <AppContext.Provider value={{
      user,
      profile,
      loading,
      signOut,
      refreshProfile
    }}>
      <PageStateProvider>
      {children}
      </PageStateProvider>
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within a Providers')
  }
  return context
}
