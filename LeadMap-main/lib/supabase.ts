import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createClient = () => {
  return createClientComponentClient()
}

export const createServerClient = async () => {
  const cookieStore = await cookies()
  // @ts-expect-error - Supabase types expect Promise but runtime needs sync function
  return createServerComponentClient({ cookies: () => cookieStore })
}
