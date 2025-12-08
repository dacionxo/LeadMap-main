/**
 * Script to help identify API routes that need to be updated to use singleton clients
 * 
 * This script scans API routes and identifies patterns that should be updated:
 * 1. createClient() with service role key -> getServiceRoleClient()
 * 2. createRouteHandlerClient() -> getRouteHandlerClient()
 * 3. createServerComponentClient() -> getServerComponentClient()
 * 
 * Run with: npx tsx scripts/update-api-routes-to-singleton.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const API_ROUTES_DIR = join(process.cwd(), 'app', 'api')

interface FileUpdate {
  file: string
  changes: string[]
}

const updates: FileUpdate[] = []

function scanDirectory(dir: string, relativePath: string = '') {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      scanDirectory(fullPath, join(relativePath, entry))
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      const filePath = join(relativePath, entry)
      const content = readFileSync(fullPath, 'utf-8')
      const fileUpdates: string[] = []

      // Pattern 1: createClient with service role
      if (content.includes('createClient') && 
          (content.includes('SERVICE_ROLE_KEY') || content.includes('service_role'))) {
        if (!content.includes('getServiceRoleClient')) {
          fileUpdates.push('Should use getServiceRoleClient() instead of createClient() with service role')
        }
      }

      // Pattern 2: createRouteHandlerClient
      if (content.includes('createRouteHandlerClient') && !content.includes('getRouteHandlerClient')) {
        fileUpdates.push('Should use getRouteHandlerClient() instead of createRouteHandlerClient()')
      }

      // Pattern 3: createServerComponentClient in API routes (shouldn't happen, but check)
      if (content.includes('createServerComponentClient') && fullPath.includes('api')) {
        fileUpdates.push('Should use getRouteHandlerClient() instead of createServerComponentClient() in API routes')
      }

      // Pattern 4: Missing autoRefreshToken: false
      if (content.includes('createClient') && 
          content.includes('SERVICE_ROLE_KEY') &&
          !content.includes('autoRefreshToken: false')) {
        fileUpdates.push('Missing autoRefreshToken: false in service role client config')
      }

      if (fileUpdates.length > 0) {
        updates.push({
          file: filePath,
          changes: fileUpdates
        })
      }
    }
  }
}

console.log('🔍 Scanning API routes for Supabase client patterns...\n')
scanDirectory(API_ROUTES_DIR)

if (updates.length === 0) {
  console.log('✅ All API routes appear to be using singleton clients!')
} else {
  console.log(`📋 Found ${updates.length} files that may need updates:\n`)
  
  updates.forEach(({ file, changes }) => {
    console.log(`📄 ${file}`)
    changes.forEach(change => {
      console.log(`   ⚠️  ${change}`)
    })
    console.log()
  })

  console.log('\n💡 Recommended updates:')
  console.log('   1. Replace createClient(..., SERVICE_ROLE_KEY) with getServiceRoleClient()')
  console.log('   2. Replace createRouteHandlerClient() with getRouteHandlerClient()')
  console.log('   3. Ensure all service role clients have autoRefreshToken: false')
  console.log('\n📝 Import statement to add:')
  console.log('   import { getServiceRoleClient, getRouteHandlerClient } from \'@/lib/supabase-singleton\'')
}

