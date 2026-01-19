/**
 * Widget Container
 * Wrapper component for all widgets with menu, settings, and edit mode support
 */

'use client'

import { useState, useRef } from 'react'
import {
  MoreVertical,
  RefreshCw,
  Settings,
  X,
  Maximize2,
  Minimize2,
  GripVertical
} from 'lucide-react'
import { WidgetDefinition, WidgetComponentProps } from '../types'
import { motion, AnimatePresence } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface WidgetContainerProps {
  widget: WidgetDefinition
  data?: any
  loading?: boolean
  error?: string | null
  isEditable?: boolean
  isFullscreen?: boolean
  onRemove?: (id: string) => void
  onRefresh?: (id: string) => void
  onSettings?: (id: string) => void
  onFullscreen?: (id: string) => void
  onExitFullscreen?: () => void
}

export function WidgetContainer({
  widget,
  data,
  loading,
  error,
  isEditable = false,
  isFullscreen = false,
  onRemove,
  onRefresh,
  onSettings,
  onFullscreen,
  onExitFullscreen
}: WidgetContainerProps) {
  const [showSettings, setShowSettings] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const WidgetComponent = widget.component

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh(widget.id)
    }
  }

  const handleSettings = () => {
    if (onSettings) {
      onSettings(widget.id)
    } else {
      setShowSettings(true)
    }
  }

  const handleFullscreen = () => {
    if (isFullscreen && onExitFullscreen) {
      onExitFullscreen()
    } else if (onFullscreen) {
      onFullscreen(widget.id)
    }
  }

  const widgetProps: WidgetComponentProps = {
    widget,
    data,
    loading,
    error,
    onRefresh: handleRefresh,
    onSettings: handleSettings,
    isFullscreen
  }

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] overflow-auto relative"
          ref={containerRef}
        >
          {/* Fullscreen header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {widget.title}
            </h2>
            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Exit fullscreen"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Widget content */}
          <div className="p-6 h-[calc(100%-80px)] overflow-auto">
            <WidgetComponent {...widgetProps} />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-200 ${
        isEditable
          ? 'ring-2 ring-blue-500/20 hover:ring-blue-500/40 cursor-move'
          : 'hover:shadow-md'
      }`}
    >
      {/* Edit mode drag handle */}
      {isEditable && (
        <div className="drag-handle absolute top-2 left-2 z-20 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Widget menu */}
      <div className="absolute top-2 right-2 z-20">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Widget options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-50"
              align="end"
              sideOffset={5}
            >
              {onRefresh && (
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
                  onSelect={handleRefresh}
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </DropdownMenu.Item>
              )}

              {onSettings && (
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
                  onSelect={handleSettings}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenu.Item>
              )}

              {onFullscreen && (
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
                  onSelect={handleFullscreen}
                >
                  <Maximize2 className="w-4 h-4" />
                  Fullscreen
                </DropdownMenu.Item>
              )}

              {isEditable && onRemove && (
                <>
                  <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none"
                    onSelect={() => onRemove(widget.id)}
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Widget content */}
      <div className="h-full">
        <WidgetComponent {...widgetProps} />
      </div>
    </div>
  )
}
