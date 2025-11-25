'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ApolloPaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  isDark?: boolean
}

const DARK_THEME_COLORS = {
  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(3, 7, 18, 0.95) 100%)',
  border: 'rgba(99, 102, 241, 0.25)',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  buttonBg: 'rgba(30, 41, 59, 0.8)',
  buttonHoverBg: 'rgba(99, 102, 241, 0.15)',
  buttonDisabledBg: 'rgba(15, 23, 42, 0.5)',
  accent: '#818cf8',
  activeBg: '#6366f1'
}

export default function ApolloPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  isDark = false
}: ApolloPaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderTop: isDark ? `1px solid ${DARK_THEME_COLORS.border}` : '1px solid #e5e7eb',
      background: isDark ? DARK_THEME_COLORS.background : '#ffffff',
      minHeight: '64px'
    }}>
      {/* Left: Page Info */}
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        color: isDark ? DARK_THEME_COLORS.textSecondary : '#6b7280',
        fontWeight: 400
      }}>
        Showing {startItem.toLocaleString()} - {endItem.toLocaleString()} of {totalItems.toLocaleString()}
      </div>

      {/* Center: Page Numbers */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)'
      }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '6px 10px',
            border: isDark ? `1px solid ${DARK_THEME_COLORS.border}` : '1px solid #d1d5db',
            borderRadius: '6px',
            background: currentPage === 1 
              ? (isDark ? DARK_THEME_COLORS.buttonDisabledBg : '#f9fafb')
              : (isDark ? DARK_THEME_COLORS.buttonBg : '#ffffff'),
            color: currentPage === 1 
              ? (isDark ? DARK_THEME_COLORS.textSecondary : '#9ca3af')
              : (isDark ? DARK_THEME_COLORS.textPrimary : '#374151'),
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            transition: 'all 0.15s ease',
            minWidth: '36px',
            height: '36px'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.background = isDark ? DARK_THEME_COLORS.buttonHoverBg : '#f3f4f6'
              e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.accent : '#9ca3af'
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.background = isDark ? DARK_THEME_COLORS.buttonBg : '#ffffff'
              e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.border : '#d1d5db'
            }
          }}
        >
          <ChevronLeft style={{ width: '18px', height: '18px' }} />
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                style={{
                  padding: '6px 8px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: '14px',
                  color: isDark ? DARK_THEME_COLORS.textSecondary : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '36px',
                  height: '36px'
                }}
              >
                ...
              </span>
            )
          }

          const pageNum = page as number
          const isActive = pageNum === currentPage

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              style={{
                padding: '6px 12px',
                minWidth: '36px',
                height: '36px',
                border: isDark ? `1px solid ${DARK_THEME_COLORS.border}` : '1px solid #d1d5db',
                borderRadius: '6px',
                background: isActive 
                  ? DARK_THEME_COLORS.activeBg 
                  : (isDark ? DARK_THEME_COLORS.buttonBg : '#ffffff'),
                color: isActive 
                  ? '#ffffff' 
                  : (isDark ? DARK_THEME_COLORS.textPrimary : '#374151'),
                cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '14px',
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = isDark ? DARK_THEME_COLORS.buttonHoverBg : '#f3f4f6'
                  e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.accent : '#9ca3af'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = isDark ? DARK_THEME_COLORS.buttonBg : '#ffffff'
                  e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.border : '#d1d5db'
                }
              }}
            >
              {pageNum}
            </button>
          )
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 10px',
            border: isDark ? `1px solid ${DARK_THEME_COLORS.border}` : '1px solid #d1d5db',
            borderRadius: '6px',
            background: currentPage === totalPages 
              ? (isDark ? DARK_THEME_COLORS.buttonDisabledBg : '#f9fafb')
              : (isDark ? DARK_THEME_COLORS.buttonBg : '#ffffff'),
            color: currentPage === totalPages 
              ? (isDark ? DARK_THEME_COLORS.textSecondary : '#9ca3af')
              : (isDark ? DARK_THEME_COLORS.textPrimary : '#374151'),
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            transition: 'all 0.15s ease',
            minWidth: '36px',
            height: '36px'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.background = isDark ? DARK_THEME_COLORS.buttonHoverBg : '#f3f4f6'
              e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.accent : '#9ca3af'
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.background = isDark ? DARK_THEME_COLORS.buttonBg : '#ffffff'
              e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.border : '#d1d5db'
            }
          }}
        >
          <ChevronRight style={{ width: '18px', height: '18px' }} />
        </button>
      </div>

      {/* Right: Page Size Selector */}
      <div style={{ position: 'relative' }}>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: '6px 28px 6px 12px',
            border: isDark ? `1px solid ${DARK_THEME_COLORS.border}` : '1px solid #d1d5db',
            borderRadius: '6px',
            background: isDark ? DARK_THEME_COLORS.buttonBg : '#ffffff',
            color: isDark ? DARK_THEME_COLORS.textPrimary : '#374151',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.accent : '#6366f1'
            e.currentTarget.style.boxShadow = isDark 
              ? '0 0 0 3px rgba(129, 140, 248, 0.2)' 
              : '0 0 0 3px rgba(99, 102, 241, 0.1)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = isDark ? DARK_THEME_COLORS.border : '#d1d5db'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
        <ChevronRight style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%) rotate(90deg)',
          width: '16px',
          height: '16px',
          color: isDark ? DARK_THEME_COLORS.textSecondary : '#6b7280',
          pointerEvents: 'none'
        }} />
      </div>
    </div>
  )
}

