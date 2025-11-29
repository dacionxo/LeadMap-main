import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { parse } from 'csv-parse/sync'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/lists/import-csv
 * 
 * Imports CSV file and adds items to a specific list
 * Supports both properties (listings) and people (contacts) lists
 * 
 * Body (FormData):
 * - file: CSV file
 * - listId: string (required) - ID of the list to import into
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

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const listId = formData.get('listId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 }
      )
    }

    // Verify list exists and belongs to user
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, user_id, name, type')
      .eq('id', listId)
      .single()

    if (listError || !list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      )
    }

    if (list.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Read and parse CSV file
    const csvText = await file.text()
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No data found in CSV file' },
        { status: 400 }
      )
    }

    const isPropertiesList = list.type === 'properties'
    let addedCount = 0
    const errors: string[] = []

    if (isPropertiesList) {
      // Import as listings
      // Required: listing_id or property_url
      const requiredColumns = ['listing_id', 'property_url']
      const hasRequired = records.some((record: any) => 
        requiredColumns.some(col => record[col])
      )

      if (!hasRequired) {
        return NextResponse.json(
          { error: 'CSV must include listing_id or property_url column for properties lists' },
          { status: 400 }
        )
      }

      // Process each record
      for (const record of records) {
        try {
          const itemId = record.listing_id || record.property_url
          if (!itemId) {
            errors.push(`Row missing listing_id or property_url: ${JSON.stringify(record)}`)
            continue
          }

          // Check if listing exists in database, if not create it
          let listingId = record.listing_id
          if (!listingId && record.property_url) {
            // Try to find existing listing by property_url
            const { data: existing } = await supabase
              .from('listings')
              .select('listing_id')
              .eq('property_url', record.property_url)
              .single()

            if (existing) {
              listingId = existing.listing_id
            } else {
              // Create new listing from CSV data
              const newListing = {
                listing_id: record.listing_id || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                property_url: record.property_url,
                street: record.street || null,
                city: record.city || null,
                state: record.state || null,
                zip_code: record.zip_code || null,
                list_price: record.list_price ? parseFloat(record.list_price) : null,
                beds: record.beds ? parseInt(record.beds) : null,
                full_baths: record.full_baths ? parseFloat(record.full_baths) : null,
                sqft: record.sqft ? parseInt(record.sqft) : null,
                status: record.status || 'Active',
                agent_name: record.agent_name || null,
                agent_email: record.agent_email || null,
                agent_phone: record.agent_phone || null,
                year_built: record.year_built ? parseInt(record.year_built) : null,
                last_sale_price: record.last_sale_price ? BigInt(parseInt(record.last_sale_price)) : null,
                active: true,
                listing_source_name: 'csv_import',
                user_id: user.id
              }

              const { data: created, error: createError } = await supabase
                .from('listings')
                .insert(newListing)
                .select('listing_id')
                .single()

              if (createError) {
                errors.push(`Failed to create listing: ${createError.message}`)
                continue
              }

              listingId = created.listing_id
            }
          }

          // Add to list_memberships
          const { error: membershipError } = await supabase
            .from('list_memberships')
            .insert({
              list_id: listId,
              item_type: 'listing',
              item_id: listingId
            })

          if (membershipError) {
            // Ignore duplicate errors
            if (membershipError.code !== '23505') {
              errors.push(`Failed to add listing ${listingId}: ${membershipError.message}`)
            }
          } else {
            addedCount++
          }
        } catch (error: any) {
          errors.push(`Error processing row: ${error.message}`)
        }
      }
    } else {
      // Import as contacts
      // Required: email or phone
      const requiredColumns = ['email', 'phone']
      const hasRequired = records.some((record: any) => 
        requiredColumns.some(col => record[col])
      )

      if (!hasRequired) {
        return NextResponse.json(
          { error: 'CSV must include email or phone column for people lists' },
          { status: 400 }
        )
      }

      // Process each record
      for (const record of records) {
        try {
          const email = record.email
          const phone = record.phone

          if (!email && !phone) {
            errors.push(`Row missing email or phone: ${JSON.stringify(record)}`)
            continue
          }

          // Check if contact exists, if not create it
          let contactId: string | null = null

          if (email) {
            const { data: existing } = await supabase
              .from('contacts')
              .select('id')
              .eq('email', email)
              .eq('user_id', user.id)
              .single()

            if (existing) {
              contactId = existing.id
            }
          }

          if (!contactId && phone) {
            const { data: existing } = await supabase
              .from('contacts')
              .select('id')
              .eq('phone', phone)
              .eq('user_id', user.id)
              .single()

            if (existing) {
              contactId = existing.id
            }
          }

          if (!contactId) {
            // Create new contact
            const newContact = {
              first_name: record.first_name || record.name?.split(' ')[0] || null,
              last_name: record.last_name || record.name?.split(' ').slice(1).join(' ') || null,
              email: email || null,
              phone: phone || null,
              company: record.company || null,
              job_title: record.job_title || null,
              address: record.address || record.street || null,
              city: record.city || null,
              state: record.state || null,
              zip_code: record.zip_code || null,
              user_id: user.id
            }

            const { data: created, error: createError } = await supabase
              .from('contacts')
              .insert(newContact)
              .select('id')
              .single()

            if (createError) {
              errors.push(`Failed to create contact: ${createError.message}`)
              continue
            }

            contactId = created.id
          }

          // Add to list_memberships
          const { error: membershipError } = await supabase
            .from('list_memberships')
            .insert({
              list_id: listId,
              item_type: 'contact',
              item_id: contactId
            })

          if (membershipError) {
            // Ignore duplicate errors
            if (membershipError.code !== '23505') {
              errors.push(`Failed to add contact ${contactId}: ${membershipError.message}`)
            }
          } else {
            addedCount++
          }
        } catch (error: any) {
          errors.push(`Error processing row: ${error.message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${addedCount} item${addedCount !== 1 ? 's' : ''} to list "${list.name}"`,
      added: addedCount,
      total: records.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('API Error importing CSV:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

