'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface ImportLeadsModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: (count: number) => void
}

export default function ImportLeadsModal({
  isOpen,
  onClose,
  onImportComplete
}: ImportLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [importCount, setImportCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      const response = await fetch('/api/import-leads', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import leads')
      }

      setImportCount(result.count || 0)
      setUploadStatus('success')
      setMessage(`Successfully imported ${result.count || 0} leads! They will appear in the "Imports" category.`)
      
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
      setMessage(error.message || 'Failed to import leads. Please try again.')
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
              margin: 0
            }}
          >
            Import Leads
          </h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: uploading ? 'not-allowed' : 'pointer',
              padding: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              transition: 'all 0.15s ease',
              opacity: uploading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!uploading) {
                e.currentTarget.style.background = '#f3f4f6'
                e.currentTarget.style.color = '#374151'
              }
            }}
            onMouseLeave={(e) => {
              if (!uploading) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Instructions */}
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              background: '#f0f9ff',
              borderRadius: '6px',
              border: '1px solid #bae6fd'
            }}
          >
            <h3
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0369a1',
                margin: '0 0 8px 0'
              }}
            >
              Import Instructions
            </h3>
            <ul
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '13px',
                color: '#0c4a6e',
                margin: 0,
                paddingLeft: '20px',
                lineHeight: '1.6'
              }}
            >
              <li>Upload a CSV file with your leads</li>
              <li>Required columns: <code style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: '3px' }}>listing_id</code>, <code style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: '3px' }}>property_url</code></li>
              <li>Optional columns: street, city, state, zip_code, list_price, beds, full_baths, sqft, status, agent_name, agent_email, agent_phone, etc.</li>
              <li>Imported leads will automatically appear in the "Imports" category</li>
            </ul>
          </div>

          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              padding: '40px 20px',
              textAlign: 'center',
              background: file ? '#f0fdf4' : '#f9fafb',
              borderColor: file ? '#86efac' : '#d1d5db',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            
            {uploading ? (
              <>
                <Loader
                  size={48}
                  style={{
                    color: '#6366f1',
                    margin: '0 auto 16px',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <p
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}
                >
                  Uploading and processing leads...
                </p>
              </>
            ) : file ? (
              <>
                <CheckCircle
                  size={48}
                  style={{
                    color: '#10b981',
                    margin: '0 auto 16px'
                  }}
                />
                <p
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#059669',
                    margin: '0 0 8px 0'
                  }}
                >
                  {file.name}
                </p>
                <p
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: 0
                  }}
                >
                  Click to select a different file
                </p>
              </>
            ) : (
              <>
                <Upload
                  size={48}
                  style={{
                    color: '#9ca3af',
                    margin: '0 auto 16px'
                  }}
                />
                <p
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    margin: '0 0 8px 0'
                  }}
                >
                  Click to upload or drag and drop
                </p>
                <p
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: 0
                  }}
                >
                  CSV file only
                </p>
              </>
            )}
          </div>

          {/* Status Message */}
          {message && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '6px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: uploadStatus === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${uploadStatus === 'success' ? '#86efac' : '#fecaca'}`,
                color: uploadStatus === 'success' ? '#059669' : '#dc2626'
              }}
            >
              {uploadStatus === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: '14px',
                  flex: 1
                }}
              >
                {message}
              </span>
            </div>
          )}

          {/* CSV Format Example */}
          <details
            style={{
              marginTop: '20px',
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}
          >
            <summary
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              View CSV Format Example
            </summary>
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: '#ffffff',
                borderRadius: '4px',
                border: '1px solid #e5e7eb',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#374151',
                overflowX: 'auto'
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`listing_id,property_url,street,city,state,zip_code,list_price,beds,full_baths,sqft,status,agent_name,agent_email,agent_phone
listing-1,https://example.com/property/1,123 Main St,Los Angeles,CA,90001,500000,3,2,1500,active,John Doe,john@example.com,555-0100
listing-2,https://example.com/property/2,456 Oak Ave,San Francisco,CA,94102,750000,4,3,2000,active,Jane Smith,jane@example.com,555-0200`}
              </pre>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={handleClose}
            disabled={uploading}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#374151',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
              opacity: uploading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!uploading) {
                e.currentTarget.style.background = '#f9fafb'
                e.currentTarget.style.borderColor = '#9ca3af'
              }
            }}
            onMouseLeave={(e) => {
              if (!uploading) {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.borderColor = '#d1d5db'
              }
            }}
          >
            {uploadStatus === 'success' ? 'Close' : 'Cancel'}
          </button>
          {file && uploadStatus !== 'success' && (
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: uploading ? '#9ca3af' : '#6366f1',
                color: '#ffffff',
                cursor: uploading || !file ? 'not-allowed' : 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!uploading && file) {
                  e.currentTarget.style.background = '#4f46e5'
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading && file) {
                  e.currentTarget.style.background = '#6366f1'
                }
              }}
            >
              {uploading ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import Leads
                </>
              )}
            </button>
          )}
        </div>

        {/* CSS for spinner animation */}
        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  )
}


