import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import LandingPage from '@/components/LandingPage'

// Force dynamic rendering to prevent static generation issues with cookies
export const dynamic = 'force-dynamic'

export default async function Home() {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not configured. Showing landing page without auth check.')
    return <LandingPage />
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Use getSession instead of getUser to reduce API calls
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // If there's a session, redirect immediately (this will throw NEXT_REDIRECT which is expected)
    if (session?.user) {
      redirect('/dashboard')
    }
    
    // Handle session errors gracefully
    if (sessionError) {
      if (sessionError.message?.includes('rate limit') || sessionError.message?.includes('Request rate limit')) {
        console.warn('Supabase rate limit hit on home page, showing landing page')
      } else if (sessionError.message?.includes('Invalid API key') || sessionError.message?.includes('supabaseUrl')) {
        console.warn('Supabase configuration error, showing landing page:', sessionError.message)
      } else {
        console.warn('Auth error on home page:', sessionError.message)
      }
    }
  } catch (error: any) {
    // NEXT_REDIRECT is expected and should not be caught - rethrow it
    if (error?.digest === 'NEXT_REDIRECT' || error?.message?.includes('NEXT_REDIRECT')) {
      throw error
    }
    
    // If cookies() fails or any other error, just show landing page
    if (error.message?.includes('cookies') || error.message?.includes('CookieStore')) {
      console.warn('Cookie handling error, showing landing page:', error.message)
    } else {
      console.warn('Error in Home component:', error.message)
    }
  }

  return <LandingPage />
}
