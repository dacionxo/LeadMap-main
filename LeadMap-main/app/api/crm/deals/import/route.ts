import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { parse } from 'csv-parse/sync'
import { REQUIRED_COLUMNS, DEALS_IMPORT_COLUMNS, REQUIRED_COLUMNS_DISPLAY } from './config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Valid stages according to database constraint
 */
const VALID_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const

/**
 * Normalize a stage name to match database constraint
 */
function normalizeStage(stage: string | null | undefined): string {
  if (!stage) return 'new'
  
  const normalized = stage.toLowerCase().trim()
  
  // Direct match
  if (VALID_STAGES.includes(normalized as any)) {
    return normalized
  }
  
  // Map common variations to valid stages
  const stageMap: Record<string, string> = {
    'new lead': 'new',
    'new leads': 'new',
    'lead': 'new',
    'leads': 'new',
    'contact': 'contacted',
    'initial contact': 'contacted',
    'qualify': 'qualified',
    'qualified lead': 'qualified',
    'proposal sent': 'proposal',
    'in negotiation': 'negotiation',
    'negotiating': 'negotiation',
    'under contract': 'negotiation',
    'closed': 'closed_won',
    'won': 'closed_won',
    'closed won': 'closed_won',
    'closed-won': 'closed_won',
    'lost': 'closed_lost',
    'closed lost': 'closed_lost',
    'closed-lost': 'closed_lost',
  }
  
  const mapped = stageMap[normalized]
  if (mapped) {
    return mapped
  }
  
  // Check for partial matches
  if (normalized.includes('closed') && normalized.includes('won')) return 'closed_won'
  if (normalized.includes('closed') && normalized.includes('lost')) return 'closed_lost'
  if (normalized.includes('won') && !normalized.includes('lost')) return 'closed_won'
  if (normalized.includes('lost')) return 'closed_lost'
  if (normalized.includes('negotiat')) return 'negotiation'
  if (normalized.includes('proposal')) return 'proposal'
  if (normalized.includes('qualif')) return 'qualified'
  if (normalized.includes('contact')) return 'contacted'
  if (normalized.includes('new')) return 'new'
  
  return 'new'
}

/**
 * POST /api/crm/deals/import
 * Import deals from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read and parse CSV file
    const csvText = await file.text()
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    if (records.length === 0) {
      return NextResponse.json({ error: 'No data found in CSV file' }, { status: 400 })
    }

    // Validate required columns
    const columnMapping: Record<string, string[]> = {
      'title': ['title', 'deal_name', 'deal name', 'name'],
      'value': ['value', 'amount', 'deal_value', 'deal value'],
      'stage': ['stage', 'deal_stage', 'deal stage', 'status'],
      'expected_close_date': ['expected_close_date', 'expected close date', 'close_date', 'close date', 'closed_date', 'closed date'],
    }

    // Check if required columns exist (with flexible naming)
    const missingColumns: string[] = []
    const foundColumns: Record<string, string> = {} // Map from required name to actual CSV column name

    for (const requiredCol of REQUIRED_COLUMNS) {
      const possibleNames = columnMapping[requiredCol] || [requiredCol]
      const found = possibleNames.find(name => records[0].hasOwnProperty(name))
      
      if (!found) {
        missingColumns.push(requiredCol)
      } else {
        foundColumns[requiredCol] = found
      }
    }
    
    if (missingColumns.length > 0) {
      // Get display names for missing columns
      const missingDisplayNames = missingColumns.map(col => {
        const colDef = DEALS_IMPORT_COLUMNS.find(c => c.name === col)
        return colDef?.displayName || col
      })
      
      return NextResponse.json({ 
        error: `Missing required columns: ${missingDisplayNames.join(', ')}`,
        details: `Required columns: ${REQUIRED_COLUMNS_DISPLAY.join(', ')}. Optional: description, probability, source, notes, tags`
      }, { status: 400 })
    }

    // Use service role for queries
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Transform records for database insertion
    const deals = records.map((record: any, index: number) => {
      // Map column names flexibly
      const title = record[foundColumns.title] || record.title || record.deal_name || record['deal name']
      const valueStr = record[foundColumns.value] || record.value || record.amount || record.deal_value || record['deal value']
      const stageStr = record[foundColumns.stage] || record.stage || record.deal_stage || record['deal stage'] || record.status
      const expectedCloseDateStr = record[foundColumns.expected_close_date] || record.expected_close_date || record['expected close date'] || record.close_date || record['close date'] || record.closed_date || record['closed date']
      // Parse tags if provided (comma-separated string)
      let tags: string[] | null = null
      if (record.tags) {
        if (typeof record.tags === 'string') {
          tags = record.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
        } else if (Array.isArray(record.tags)) {
          tags = record.tags
        }
      }

      // Parse value (numeric) - required field
      let value: number | null = null
      if (valueStr) {
        const parsed = parseFloat(valueStr.toString().replace(/[,$]/g, ''))
        if (!isNaN(parsed)) {
          value = parsed
        }
      }

      // Parse probability (0-100 integer)
      let probability: number | null = null
      if (record.probability) {
        const parsed = parseInt(record.probability.toString())
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          probability = parsed
        }
      }

      // Parse dates
      let expectedCloseDate: string | null = null
      if (expectedCloseDateStr) {
        try {
          const date = new Date(expectedCloseDateStr)
          if (!isNaN(date.getTime())) {
            expectedCloseDate = date.toISOString()
          }
        } catch (e) {
          // Invalid date, ignore
        }
      }

      // Validate required fields have values
      if (!title || !title.toString().trim()) {
        throw new Error(`Row ${index + 2}: Deal name is required but is empty`)
      }
      
      if (!valueStr || valueStr.toString().trim() === '' || value === null) {
        throw new Error(`Row ${index + 2}: Amount is required but is empty or invalid`)
      }

      if (!stageStr || !stageStr.toString().trim()) {
        throw new Error(`Row ${index + 2}: Stage is required but is empty`)
      }

      if (!expectedCloseDateStr || !expectedCloseDateStr.toString().trim() || !expectedCloseDate) {
        throw new Error(`Row ${index + 2}: Expected close date is required but is empty or invalid`)
      }

      return {
        user_id: user.id,
        title: title.toString().trim(),
        description: record.description ? record.description.toString().trim() : null,
        value: value,
        stage: normalizeStage(stageStr),
        probability: probability ?? 0,
        expected_close_date: expectedCloseDate,
        source: record.source ? record.source.toString().trim() : null,
        source_id: record.source_id ? record.source_id.toString().trim() : null,
        notes: record.notes ? record.notes.toString().trim() : null,
        tags: tags,
      }
    })

    // Insert deals into database
    const { data: insertedDeals, error: insertError } = await supabase
      .from('deals')
      .insert(deals)
      .select()

    if (insertError) {
      console.error('Error inserting deals:', insertError)
      return NextResponse.json({ 
        error: 'Failed to import deals',
        details: insertError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Deals imported successfully',
      count: insertedDeals?.length || 0,
    })

  } catch (error: any) {
    console.error('Error processing CSV import:', error)
    return NextResponse.json({ 
      error: 'Failed to process CSV file',
      details: error.message
    }, { status: 500 })
  }
}

