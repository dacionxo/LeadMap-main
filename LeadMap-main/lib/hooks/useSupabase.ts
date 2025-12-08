/**
 * Shared Supabase Client Hook
 * 
 * Use this hook instead of creating new Supabase clients in components.
 * This prevents multiple client instances and reduces token refresh calls,
 * which helps avoid rate limiting errors.
 * 
 * Usage:
 *   const supabase = useSupabase()
 *   const { data } = await supabase.from('table').select()
 */
'use client'

import { useApp } from '@/app/providers'

export function useSupabase() {
  const { supabase } = useApp()
  return supabase
}


