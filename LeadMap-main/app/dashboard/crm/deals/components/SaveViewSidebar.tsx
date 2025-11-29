'use client'

import { useState, useEffect } from 'react'
import { X, Table2, Kanban, Check, ChevronRight, Lock } from 'lucide-react'

interface SaveViewSidebarProps {
  isOpen: boolean
  onClose: () => void
  viewMode: 'kanban' | 'table'
  groupBy?: string | null
  visibleFieldsCount?: number
  appliedFiltersCount?: number
  currentViewName?: string
  onSave: (viewData: {
    id: string
    name: string
    type: 'table' | 'board'
    layout: 'table' | 'kanban'
    groupBy: string | null
    visibleFields: string[]
    filters: Record<string, any>
    visibility: 'restricted' | 'shared'
  }) => void
}

export default function SaveViewSidebar({
  isOpen,
  onClose,
  viewMode,
  groupBy = null,
  visibleFieldsCount = 8,
  appliedFiltersCount = 1,
  currentViewName = 'All deals',
  onSave,
}: SaveViewSidebarProps) {
  const [viewName, setViewName] = useState(currentViewName)
  const [selectedLayout, setSelectedLayout] = useState<'table' | 'kanban'>(viewMode)
  const [visibility, setVisibility] = useState<'restricted' | 'shared'>('restricted')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setViewName(currentViewName)
      setSelectedLayout(viewMode)
      setVisibility('restricted')
      setIsSaving(false)
    }
  }, [isOpen, currentViewName, viewMode])

  const handleSave = async () => {
    if (!viewName.trim() || isSaving) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/crm/deals/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: viewName.trim(),
          layout: selectedLayout,
          groupBy: groupBy,
          visibleFields: [], // TODO: Get actual visible fields from props
          filters: {}, // TODO: Get actual filters from props
          visibility: visibility,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save view')
      }

      const result = await response.json()
      onSave(result.data)
      onClose()
    } catch (error: any) {
      console.error('Error saving view:', error)
      alert(error.message || 'Failed to save view. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Save as new view
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* View Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              View name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter view name"
            />
          </div>

          {/* Layout */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Layout</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedLayout('table')}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  selectedLayout === 'table'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Table2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Table</span>
                </div>
                {selectedLayout === 'table' && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <button
                onClick={() => setSelectedLayout('kanban')}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  selectedLayout === 'kanban'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Kanban className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Kanban board</span>
                </div>
                {selectedLayout === 'kanban' && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            </div>
          </div>

          {/* Group by */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Group by</h3>
              <button className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <span>{groupBy || 'None'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Fields</h3>
              <button className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-medium">
                  {visibleFieldsCount}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Applied filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Applied filters</h3>
              <button className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-medium">
                  {appliedFiltersCount}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* More settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">More settings</h3>
          </div>

          {/* Visibility and sharing */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Visibility and sharing
                </h3>
              </div>
              <button
                onClick={() =>
                  setVisibility(visibility === 'restricted' ? 'shared' : 'restricted')
                }
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <span className="capitalize">{visibility}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!viewName.trim() || isSaving}
            className="px-4 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Creating...' : 'Create view'}
          </button>
        </div>
      </div>
    </>
  )
}

