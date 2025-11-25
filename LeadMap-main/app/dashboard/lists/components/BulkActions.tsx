'use client'

import { useState } from 'react'
import { Mail, Download, Trash2, X } from 'lucide-react'

interface BulkActionsProps {
  selectedCount: number
  onEmailOwners?: () => void
  onExportCSV?: () => void
  onRemoveFromList?: () => void
  isDark?: boolean
}

export default function BulkActions({
  selectedCount,
  onEmailOwners,
  onExportCSV,
  onRemoveFromList,
  isDark = false
}: BulkActionsProps) {
  const [showMenu, setShowMenu] = useState(false)

  if (selectedCount === 0) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.95) 100%)',
      border: '2px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '12px',
      padding: '12px 20px',
      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '400px'
    }}>
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        fontWeight: 600,
        color: '#374151',
        marginRight: '8px'
      }}>
        {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {onEmailOwners && (
          <button
            onClick={() => {
              onEmailOwners()
              setShowMenu(false)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              color: '#374151',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6366f1'
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)'
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <Mail size={14} />
            Email Owners
          </button>
        )}

        {onExportCSV && (
          <button
            onClick={() => {
              onExportCSV()
              setShowMenu(false)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              color: '#374151',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6366f1'
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)'
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        )}

        {onRemoveFromList && (
          <button
            onClick={() => {
              onRemoveFromList()
              setShowMenu(false)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              color: '#dc2626',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#dc2626'
              e.currentTarget.style.background = '#fef2f2'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.2)'
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

