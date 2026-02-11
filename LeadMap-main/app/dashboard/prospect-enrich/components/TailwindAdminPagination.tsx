'use client'

/**
 * TailwindAdminPagination — Elite Property Prospecting Dashboard footer design
 * 1:1 match: Showing 1-30 of N, page numbers with chevrons, Next Page button.
 */

import { cn } from '@/app/lib/utils'

interface TailwindAdminPaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  isDark?: boolean
}

export default function TailwindAdminPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
}: TailwindAdminPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages)

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems)

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = []
    if (safeTotalPages <= 8) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i)
      return pages
    }
    if (safeCurrentPage <= 3) {
      return [1, 2, 3, 4, 5, '...', safeTotalPages]
    }
    if (safeCurrentPage >= safeTotalPages - 2) {
      return [1, '...', safeTotalPages - 4, safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages]
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', safeTotalPages]
  }

  return (
    <footer className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between flex-wrap gap-4">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startItem.toLocaleString()} - {endItem.toLocaleString()}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalItems.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>

        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="text-slate-400 dark:text-slate-500 text-sm px-1">
                ...
              </span>
            )
          }
          const isActive = page === safeCurrentPage
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages}
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => onPageChange(safeCurrentPage + 1)}
        disabled={safeCurrentPage === safeTotalPages}
        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 rounded-lg px-4 py-2 flex items-center gap-2 transition-transform hover:-translate-y-0.5 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        Next Page
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>
    </footer>
  )
}
