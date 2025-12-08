/**
 * Supabase Client Cache
 * DEPRECATED: Use supabase-singleton.ts instead
 * This file is kept for backward compatibility but redirects to the singleton
 */

import { getClientComponentClient as getSingletonClient } from './supabase-singleton'
import { getServerComponentClient as getSingletonServer } from './supabase-singleton'
import { getRouteHandlerClient as getSingletonRoute } from './supabase-singleton'

/**
 * @deprecated Use getClientComponentClient() from '@/lib/supabase-singleton' instead
 */
export function getClientComponentClient() {
  return getSingletonClient()
}

/**
 * @deprecated Use getServerComponentClient() from '@/lib/supabase-singleton' instead
 */
export async function getServerComponentClient() {
  return getSingletonServer()
}

/**
 * @deprecated Use getRouteHandlerClient() from '@/lib/supabase-singleton' instead
 */
export async function createRouteHandlerClientOptimized() {
  return getSingletonRoute()
}

/**
 * Clear caches (useful for testing or when needed)
 */
export function clearClientCaches() {
  // Delegate to singleton
  const { clearClientCaches: clearSingleton } = require('./supabase-singleton')
  clearSingleton()
}

