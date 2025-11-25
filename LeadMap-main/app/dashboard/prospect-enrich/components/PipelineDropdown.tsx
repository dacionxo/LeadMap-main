'use client'

import { Workflow } from 'lucide-react'

interface PipelineDropdownProps {
  value: string
  onChange: (status: string) => void
}

const STATUSES = [
  { value: 'new', label: 'New', color: '#6b7280' },
  { value: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { value: 'qualified', label: 'Qualified', color: '#8b5cf6' },
  { value: 'in_offer', label: 'In Offer', color: '#f59e0b' },
  { value: 'won', label: 'Won', color: '#10b981' },
  { value: 'lost', label: 'Lost', color: '#ef4444' }
]

export default function PipelineDropdown({ value, onChange }: PipelineDropdownProps) {
  const selectedStatus = STATUSES.find(s => s.value === value) || STATUSES[0]

  return (
    <div>
      <select
        value={value || 'new'}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          color: '#374151',
          background: '#ffffff',
          cursor: 'pointer',
          transition: 'border-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#9ca3af'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#6366f1'
          e.currentTarget.style.outline = 'none'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      
      {/* Status badge */}
      <div
        style={{
          marginTop: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${selectedStatus.color}15`,
          color: selectedStatus.color,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '12px',
          fontWeight: 500
        }}
      >
        <Workflow size={12} />
        {selectedStatus.label}
      </div>
    </div>
  )
}


