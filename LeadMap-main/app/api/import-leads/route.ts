import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { parse } from 'csv-parse/sync'

/**
 * Import Leads API
 * POST: Import leads from CSV file into the 'imports' table
 * All imported leads automatically go to the imports category
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
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
      trim: true
    })

    if (records.length === 0) {
      return NextResponse.json({ error: 'No data found in CSV file' }, { status: 400 })
    }

    // Validate required columns
    const requiredColumns = ['listing_id', 'property_url']
    const missingColumns = requiredColumns.filter(col => !records[0].hasOwnProperty(col))
    
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}`,
        details: 'Required columns: listing_id, property_url. Optional: street, city, state, zip_code, list_price, beds, full_baths, sqft, year_built, status, mls, agent_name, agent_email, agent_phone, etc.'
      }, { status: 400 })
    }

    // Generate a unique batch ID for this import
    const importBatchId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Transform records for database insertion into 'imports' table
    const imports = records.map((record: any) => {
      // Generate listing_id from property_url if not provided
      const listingId = record.listing_id || record.property_url?.split('/').pop() || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      return {
        listing_id: listingId,
        property_url: record.property_url,
        permalink: record.permalink || null,
        scrape_date: record.scrape_date ? new Date(record.scrape_date).toISOString().split('T')[0] : null,
        active: record.active !== undefined ? record.active === 'true' || record.active === true : true,
        street: record.street || record.address || null,
        unit: record.unit || null,
        city: record.city || null,
        state: record.state || null,
        zip_code: record.zip_code || record.zip || null,
        beds: record.beds ? parseInt(record.beds) : null,
        full_baths: record.full_baths ? parseInt(record.full_baths) : null,
        half_baths: record.half_baths ? parseInt(record.half_baths) : null,
        sqft: record.sqft ? parseInt(record.sqft) : null,
        year_built: record.year_built ? parseInt(record.year_built) : null,
        list_price: record.list_price ? BigInt(parseInt(record.list_price)) : null,
        list_price_min: record.list_price_min ? BigInt(parseInt(record.list_price_min)) : null,
        list_price_max: record.list_price_max ? BigInt(parseInt(record.list_price_max)) : null,
        status: record.status || null,
        mls: record.mls || null,
        agent_name: record.agent_name || null,
        agent_email: record.agent_email || null,
        agent_phone: record.agent_phone || null,
        agent_phone_2: record.agent_phone_2 || null,
        listing_agent_phone_2: record.listing_agent_phone_2 || null,
        listing_agent_phone_5: record.listing_agent_phone_5 || null,
        text: record.text || record.description || null,
        last_sale_price: record.last_sale_price ? BigInt(parseInt(record.last_sale_price)) : null,
        last_sale_date: record.last_sale_date ? new Date(record.last_sale_date).toISOString().split('T')[0] : null,
        photos: record.photos || null,
        photos_json: record.photos_json ? (typeof record.photos_json === 'string' ? JSON.parse(record.photos_json) : record.photos_json) : null,
        other: record.other ? (typeof record.other === 'string' ? JSON.parse(record.other) : record.other) : null,
        price_per_sqft: record.price_per_sqft ? parseFloat(record.price_per_sqft) : null,
        listing_source_name: record.listing_source_name || null,
        listing_source_id: record.listing_source_id || null,
        monthly_payment_estimate: record.monthly_payment_estimate || null,
        ai_investment_score: record.ai_investment_score ? parseFloat(record.ai_investment_score) : null,
        time_listed: record.time_listed ? new Date(record.time_listed).toISOString() : null,
        // Import-specific fields
        import_source: 'csv', // Can be 'csv', 'api', 'manual', etc.
        import_batch_id: importBatchId,
        import_date: new Date().toISOString(),
        // Optional location data
        lat: record.lat ? parseFloat(record.lat) : null,
        lng: record.lng ? parseFloat(record.lng) : null,
        // Default pipeline status for imports
        pipeline_status: 'new',
        // User-specific: Associate import with the user who imported it
        user_id: user.id
      }
    })

    // Insert into 'imports' table (not 'listings' table)
    const { data, error } = await supabase
      .from('imports')
      .upsert(imports, {
        onConflict: 'listing_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Error inserting imports:', error)
      
      // If the imports table doesn't exist, provide helpful error message
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Imports table does not exist',
          details: 'Please run the SQL schema file (supabase/lead_category_tables.sql) to create the imports table first.'
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to import leads',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Leads imported successfully',
      count: data?.length || 0,
      batchId: importBatchId
    })

  } catch (error: any) {
    console.error('Error processing import:', error)
    return NextResponse.json({ 
      error: 'Failed to process import file',
      details: error.message
    }, { status: 500 })
  }
}


