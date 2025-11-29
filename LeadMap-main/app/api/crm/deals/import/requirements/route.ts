import { NextResponse } from 'next/server'
import { DEALS_IMPORT_COLUMNS, REQUIRED_COLUMNS_DISPLAY } from '../config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/crm/deals/import/requirements
 * Returns the required and optional columns for CSV import
 */
export async function GET() {
  try {
    const requiredColumns = DEALS_IMPORT_COLUMNS.filter((col) => col.required)
    const optionalColumns = DEALS_IMPORT_COLUMNS.filter((col) => !col.required)

    return NextResponse.json({
      required: requiredColumns.map((col) => ({
        name: col.name,
        displayName: col.displayName,
        description: col.description,
        csvName: col.name, // The actual CSV column name to use
      })),
      optional: optionalColumns.map((col) => ({
        name: col.name,
        displayName: col.displayName,
        description: col.description,
        csvName: col.name,
      })),
      requiredDisplayNames: REQUIRED_COLUMNS_DISPLAY,
      columnMapping: requiredColumns.reduce((acc, col) => {
        acc[col.displayName] = col.name
        return acc
      }, {} as Record<string, string>),
    })
  } catch (error: any) {
    console.error('Error fetching import requirements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch import requirements' },
      { status: 500 }
    )
  }
}

