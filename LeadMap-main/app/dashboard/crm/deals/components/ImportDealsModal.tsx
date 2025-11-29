'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader, Download, DollarSign, ArrowUp, ChevronRight } from 'lucide-react'

interface ImportDealsModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: (count: number) => void
}

export default function ImportDealsModal({
  isOpen,
  onClose,
  onImportComplete
}: ImportDealsModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [importCount, setImportCount] = useState(0)
  const [requiredColumns, setRequiredColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [loadingRequirements, setLoadingRequirements] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch required columns dynamically
  useEffect(() => {
    if (isOpen && requiredColumns.length === 0 && !loadingRequirements) {
      fetchRequiredColumns()
    }
  }, [isOpen])

  const fetchRequiredColumns = async () => {
    setLoadingRequirements(true)
    try {
      const response = await fetch('/api/crm/deals/import/requirements', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setRequiredColumns(data.requiredDisplayNames || [])
        setColumnMapping(data.columnMapping || {})
      } else {
        // Fallback to default if API fails
        setRequiredColumns(['Deal name'])
        setColumnMapping({ 'Deal name': 'title' })
      }
    } catch (error) {
      console.error('Error fetching required columns:', error)
      // Fallback to default
      setRequiredColumns(['Deal name'])
      setColumnMapping({ 'Deal name': 'title' })
    } finally {
      setLoadingRequirements(false)
    }
  }

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile)
        setUploadStatus('idle')
        setMessage('')
      } else {
        setMessage('Please select a CSV file')
        setUploadStatus('error')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first')
      setUploadStatus('error')
      return
    }

    setUploading(true)
    setUploadStatus('idle')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/crm/deals/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import deals')
      }

      setImportCount(result.count || 0)
      setUploadStatus('success')
      setMessage(`Successfully imported ${result.count || 0} deal${result.count !== 1 ? 's' : ''}!`)
      
      // Call the completion callback
      if (onImportComplete) {
        onImportComplete(result.count || 0)
      }

      // Reset file after successful upload
      setTimeout(() => {
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 2000)
    } catch (error: any) {
      console.error('Import error:', error)
      setUploadStatus('error')
      setMessage(error.message || 'Failed to import deals. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFile(null)
      setUploadStatus('idle')
      setMessage('')
      setImportCount(0)
      setRequiredColumns([]) // Reset to fetch fresh on next open
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onClose()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
        setUploadStatus('idle')
        setMessage('')
      } else {
        setMessage('Please select a CSV file')
        setUploadStatus('error')
      }
    }
  }

  const downloadTemplate = () => {
    // Map display names to CSV column names using the mapping from API
    const requiredHeaders = requiredColumns.length > 0 
      ? requiredColumns.map(displayName => columnMapping[displayName] || displayName.toLowerCase().replace(/\s+/g, '_'))
      : ['title', 'value', 'stage', 'expected_close_date']
    
    // Add optional columns
    const optionalHeaders = ['description', 'probability', 'source', 'notes', 'tags']
    const allHeaders = [...requiredHeaders, ...optionalHeaders]
    
    // Build CSV content with example data
    // Order matches: title, value, stage, expected_close_date, description, probability, source, notes, tags
    const csvContent = `${allHeaders.join(',')}
"Acme Corp Deal",50000,new,2024-12-31,"Deal with Acme Corporation",25,website,"Follow up next week","real-estate,office"
"Smith Property Deal",250000,qualified,2024-11-30,"Residential property deal",75,referral,"Client is interested","residential,high-value"`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'deals_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Deals</span>
              <ChevronRight className="w-4 h-4" />
              <span>Import Deals</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Bulk import from CSV
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Main Import Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            {/* Icon */}
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center">
                <DollarSign className="w-10 h-10 text-gray-900" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800">
                <ArrowUp className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Import deals
            </h3>

            {/* Subtitle */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              You can import up to 10,000 records at a time
            </p>

            {/* Required Columns */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                When importing deals, your file must include the following columns:
              </p>
              {loadingRequirements ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Loading requirements...</span>
                </div>
              ) : requiredColumns.length > 0 ? (
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                  {requiredColumns.map((column, index) => (
                    <li key={index}>{column}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Unable to load column requirements
                </p>
              )}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              By clicking 'Select CSV file' below, I acknowledge that business deals data submitted from my CSV file may be used to provide and improve services as further described in our{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a>.
              {' '}<a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Learn more about data sharing</a>.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Sample template
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Select CSV file'
                )}
              </label>
            </div>

            {/* File Selected Display */}
            {file && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-200">
                        {file.name}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Status Message */}
            {message && (
              <div
                className={`mt-6 flex items-center gap-3 p-4 rounded-lg ${
                  uploadStatus === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : uploadStatus === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {uploadStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : uploadStatus === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                ) : (
                  <Loader className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin flex-shrink-0" />
                )}
                <p
                  className={`text-sm ${
                    uploadStatus === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : uploadStatus === 'error'
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {message}
                </p>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Need help getting started?
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Visit our help center
              </a>
              <span className="text-gray-400">•</span>
              <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View FAQs
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

