/**
 * Configuration for CSV import requirements
 * This file defines what columns are required and optional for importing deals
 */

export interface ColumnRequirement {
  name: string
  displayName: string
  required: boolean
  description?: string
}

export const DEALS_IMPORT_COLUMNS: ColumnRequirement[] = [
  {
    name: 'title',
    displayName: 'Deal name',
    required: true,
    description: 'The name or title of the deal',
  },
  {
    name: 'value',
    displayName: 'Amount',
    required: true,
    description: 'The monetary value of the deal (numeric)',
  },
  {
    name: 'stage',
    displayName: 'Stage',
    required: true,
    description: 'The current stage of the deal',
  },
  {
    name: 'expected_close_date',
    displayName: 'Expected close date',
    required: true,
    description: 'Expected date when the deal will close (YYYY-MM-DD)',
  },
  {
    name: 'description',
    displayName: 'Description',
    required: false,
    description: 'Additional details about the deal',
  },
  {
    name: 'probability',
    displayName: 'Probability',
    required: false,
    description: 'Probability of closing (0-100)',
  },
  {
    name: 'source',
    displayName: 'Source',
    required: false,
    description: 'Where the deal originated from',
  },
  {
    name: 'notes',
    displayName: 'Notes',
    required: false,
    description: 'Additional notes about the deal',
  },
  {
    name: 'tags',
    displayName: 'Tags',
    required: false,
    description: 'Comma-separated tags',
  },
]

export const REQUIRED_COLUMNS = DEALS_IMPORT_COLUMNS.filter((col) => col.required).map((col) => col.name)

export const REQUIRED_COLUMNS_DISPLAY = DEALS_IMPORT_COLUMNS.filter((col) => col.required).map((col) => col.displayName)

