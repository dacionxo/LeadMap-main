/**
 * @deprecated Use supabase-singleton.ts instead
 * This file is kept for backward compatibility
 */

import { getClientComponentClient, getServerComponentClient } from './supabase-singleton'

/**
 * @deprecated Use getClientComponentClient() from '@/lib/supabase-singleton' instead
 */
export const createClient = () => {
  return getClientComponentClient()
}

/**
 * @deprecated Use getServerComponentClient() from '@/lib/supabase-singleton' instead
 */
export const createServerClient = async () => {
  return getServerComponentClient()
}
