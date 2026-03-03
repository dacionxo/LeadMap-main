/**
 * Export listings to CSV with prospect table, property details, and ownership (residents).
 */

import type { Listing } from '../hooks/useProspectData'

function escapeCsvCell(val: unknown): string {
  if (val == null || val === undefined) return ''
  const s = String(val).replace(/"/g, '""')
  return `"${s}"`
}

type ResidentRow = {
  resident_type?: string | null
  resident_name?: string | null
  resident_age?: string | null
  resident_phone_numbers?: string | null
  resident_previous_address?: string | null
}

/** Format resident info (excluding phone) for display */
function formatResidentInfo(r: ResidentRow): string {
  return [r.resident_type, r.resident_name, r.resident_age, r.resident_previous_address]
    .filter(Boolean)
    .map(String)
    .join(' | ')
}

/** Get up to 10 resident pairs: [info, phoneNumbers][] - padded to 10 slots */
function getResidentColumns(residents: ResidentRow[] | undefined, maxSlots = 10): [string, string][] {
  const list = residents ?? []
  const pairs: [string, string][] = list.slice(0, maxSlots).map((r) => [
    formatResidentInfo(r),
    (r.resident_phone_numbers ?? '').toString().trim(),
  ])
  while (pairs.length < maxSlots) {
    pairs.push(['', ''])
  }
  return pairs
}

/** Get baths value for display */
function getBaths(listing: Listing): string {
  if (listing.bathrooms != null && listing.bathrooms !== '') return String(listing.bathrooms)
  return listing.full_baths != null ? String(listing.full_baths) : ''
}

/** Get description from listing */
function getDescription(listing: Listing): string {
  if (listing.text) return listing.text
  const o = listing.other
  if (o && typeof o === 'object') {
    if (o.description) return String(o.description)
    if (o.text) return String(o.text)
  }
  return ''
}

export function exportListingsToCsv(listings: Listing[], filenamePrefix = 'prospects'): void {
  const headers = [
    // Prospect hover table
    'Listing ID',
    'Address',
    'Street',
    'Unit',
    'City',
    'State',
    'Zip Code',
    'List Price',
    'Status',
    'AI Score',
    'Beds',
    'Baths',
    'Sqft',
    'Description',
    'Agent Name',
    'Agent Email',
    'Agent Phone',
    'Agent Phone 2',
    'Agent Phone 3',
    'Agent Phone 4',
    'Year Built',
    'Last Sale Price',
    'Last Sale Date',
    // Property details
    'Living Area Sqft',
    'Year Built (Pagination)',
    'Bedrooms',
    'Property Type',
    'Construction Type',
    'Building Style',
    'Stories',
    'Garage',
    'Heating Gas',
    'Air Conditioning',
    'Basement',
    'Deck',
    'Fireplaces',
    'Pool',
    'Patio',
    'Roof',
    'Sewer',
    'Water',
    'APN',
    'Lot Size',
    'County Name',
    'Elementary School District',
    'High School District',
    'Zoning',
    'Flood Zone',
    'Tax Year',
    'Tax Amount',
    // Ownership: 10 current resident slots (info + phone per resident, interleaved)
    ...Array.from({ length: 10 }, (_, i) => [
      `Current Resident ${i + 1}`,
      `Current Resident ${i + 1} Phone Numbers`,
    ]).flat(),
    // Ownership: 10 previous resident slots
    ...Array.from({ length: 10 }, (_, i) => [
      `Previous Resident ${i + 1}`,
      `Previous Resident ${i + 1} Phone Numbers`,
    ]).flat(),
  ]

  const rows = listings.map((l) => {
    const addressParts = [l.street, l.unit, l.city, l.state, l.zip_code].filter(Boolean).map(String)
    const address = addressParts.join(', ')
    return [
      l.listing_id ?? '',
      address,
      l.street ?? '',
      (l as { unit?: string }).unit ?? '',
      l.city ?? '',
      l.state ?? '',
      l.zip_code ?? '',
      (l.list_price ?? '').toString(),
      l.status ?? '',
      (l.ai_investment_score ?? '').toString(),
      (l.beds ?? '').toString(),
      getBaths(l),
      (l.sqft ?? '').toString(),
      getDescription(l),
      l.agent_name ?? '',
      l.agent_email ?? '',
      l.agent_phone ?? '',
      l.agent_phone_2 ?? '',
      l.listing_agent_phone_2 ?? '',
      l.listing_agent_phone_5 ?? '',
      (l.year_built ?? '').toString(),
      (l.last_sale_price ?? '').toString(),
      l.last_sale_date ?? '',
      // Property details
      (l as { living_area?: string }).living_area ?? '',
      (l as { year_built_pagination?: string }).year_built_pagination ?? '',
      (l as { bedrooms?: string }).bedrooms ?? '',
      (l as { property_type?: string }).property_type ?? '',
      (l as { construction_type?: string }).construction_type ?? '',
      (l as { building_style?: string }).building_style ?? '',
      (l as { stories?: string }).stories ?? '',
      (l as { garage?: string }).garage ?? '',
      (l as { heating_gas?: string }).heating_gas ?? '',
      (l as { air_conditioning?: string }).air_conditioning ?? '',
      (l as { basement?: string }).basement ?? '',
      (l as { deck?: string }).deck ?? '',
      (l as { fireplaces?: string }).fireplaces ?? '',
      (l as { pool?: string }).pool ?? '',
      (l as { patio?: string }).patio ?? '',
      (l as { roof?: string }).roof ?? '',
      (l as { sewer?: string }).sewer ?? '',
      (l as { water?: string }).water ?? '',
      (l as { apn?: string }).apn ?? '',
      (l as { lot_size?: string }).lot_size ?? '',
      (l as { county_name?: string }).county_name ?? '',
      (l as { elementary_school_district?: string }).elementary_school_district ?? '',
      (l as { high_school_district?: string }).high_school_district ?? '',
      (l as { zoning?: string }).zoning ?? '',
      (l as { flood_zone?: string }).flood_zone ?? '',
      (l as { tax_year?: string }).tax_year ?? '',
      (l as { tax_amount?: string }).tax_amount ?? '',
      // Ownership: current residents 1-10 (each: info, then phone numbers)
      ...getResidentColumns(l.current_residents).flat(),
      // Ownership: previous residents 1-10
      ...getResidentColumns(l.previous_residents).flat(),
    ]
  })

  const csv = [headers.map(escapeCsvCell).join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19)
  a.download = `${filenamePrefix}-${ts}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
