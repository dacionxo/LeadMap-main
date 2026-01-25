'use client'

import { useState, useEffect } from 'react'
import { X, Filter, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'

interface CreateListModalProps {
  type?: 'people' | 'properties'
  onClose: () => void
  onCreated: () => void
  supabase?: any // Kept for backward compatibility but not used
}

export default function CreateListModal({ type = 'properties', onClose, onCreated }: CreateListModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Trigger slide-in animation
    setTimeout(() => setIsOpen(true), 10)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('List name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/lists', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          type: type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create list')
      }

      onCreated()
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(onClose, 300) // Wait for animation to complete
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-50
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 w-full max-w-[480px] 
          bg-white dark:bg-boxdark shadow-2xl z-50
          flex flex-col overflow-hidden
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stroke dark:border-strokedark">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            New List
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-bodydark2 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Name Input */}
            <div>
              <Label htmlFor="list-name" className="mb-2 block">
                List Name
              </Label>
              <Input
                id="list-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                placeholder="Enter list name"
                autoFocus
                disabled={loading}
                className={error ? 'border-red-500' : ''}
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            {/* Separator */}
            <hr className="border-stroke dark:border-strokedark" />

            {/* Add record from section */}
            <div>
              <Label className="mb-4 block text-sm font-medium text-black dark:text-white">
                Add record from
              </Label>

              {/* Filter Option */}
              <div className="mb-4 p-4 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark">
                <Label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Filter
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    // TODO: Implement filter selection
                    alert('Filter selection coming soon')
                  }}
                  disabled={loading}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Select filter
                </Button>
              </div>

              {/* CSV Option */}
              <div className="p-4 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark">
                <Label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  CSV
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    // TODO: Implement CSV upload
                    alert('CSV upload coming soon')
                  }}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-stroke dark:border-strokedark flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
