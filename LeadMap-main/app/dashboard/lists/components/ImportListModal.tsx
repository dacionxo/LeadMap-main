'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportListModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (count: number) => void
}

export default function ImportListModal({
  isOpen,
  onClose,
  onImportComplete
}: ImportListModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [listId, setListId] = useState<string>('')
  const [lists, setLists] = useState<Array<{ id: string; name: string; type: string }>>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [importCount, setImportCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch lists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLists()
    }
  }, [isOpen])

  async function fetchLists() {
    try {
      setLoading(true)
      const response = await fetch('/api/lists?includeCount=true')
      const data = await response.json()

      if (response.ok) {
        setLists(data.lists || [])
      } else {
        console.error('Error fetching lists:', data.error)
        setLists([])
      }
    } catch (error) {
      console.error('Error:', error)
      setLists([])
    } finally {
      setLoading(false)
    }
  }

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

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first')
      setUploadStatus('error')
      return
    }

    if (!listId) {
      setMessage('Please select a list to import into')
      setUploadStatus('error')
      return
    }

    setUploading(true)
    setUploadStatus('idle')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('listId', listId)

      const response = await fetch('/api/lists/import-csv', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import CSV')
      }

      setImportCount(result.added || 0)
      setUploadStatus('success')
      setMessage(`Successfully imported ${result.added || 0} item${result.added !== 1 ? 's' : ''} into the list!`)
      
      // Call completion callback
      if (onImportComplete) {
        setTimeout(() => {
          onImportComplete(result.added || 0)
        }, 1500)
      }

      // Reset file after successful upload
      setTimeout(() => {
        setFile(null)
        setListId('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 2000)
    } catch (error: any) {
      console.error('Import error:', error)
      setUploadStatus('error')
      setMessage(error.message || 'Failed to import CSV. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFile(null)
      setListId('')
      setUploadStatus('idle')
      setMessage('')
      setImportCount(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
          backdropFilter: 'blur(4px)'
        }}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '20px',
            fontWeight: 600,
            color: '#1e293b',
            margin: 0
          }}>
            Import CSV to List
          </h2>
          <button
            onClick={handleClose}
            style={{
              padding: '8px',
              border: 'none',
              background: 'transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {/* List Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Select List
            </label>
            {loading ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                Loading lists...
              </div>
            ) : (
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <option value="">-- Select a list --</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: file ? '#f0f9ff' : '#fafafa',
              borderColor: file ? '#6366f1' : '#d1d5db'
            }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={(e) => {
              if (!file) {
                e.currentTarget.style.borderColor = '#6366f1'
                e.currentTarget.style.background = '#f9fafb'
              }
            }}
            onMouseLeave={(e) => {
              if (!file) {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.background = '#fafafa'
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {file ? (
              <div>
                <FileText size={48} color="#6366f1" style={{ marginBottom: '12px' }} />
                <div style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#1e293b',
                  marginBottom: '4px'
                }}>
                  {file.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {(file.size / 1024).toFixed(2)} KB
                </div>
              </div>
            ) : (
              <div>
                <Upload size={48} color="#9ca3af" style={{ marginBottom: '12px' }} />
                <div style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Drop CSV file here or click to browse
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Supports .csv files
                </div>
              </div>
            )}
          </div>

          {/* Status Message */}
          {message && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: uploadStatus === 'success' 
                ? '#f0fdf4' 
                : uploadStatus === 'error'
                ? '#fef2f2'
                : '#f9fafb',
              color: uploadStatus === 'success'
                ? '#166534'
                : uploadStatus === 'error'
                ? '#991b1b'
                : '#374151',
              border: `1px solid ${
                uploadStatus === 'success'
                  ? '#86efac'
                  : uploadStatus === 'error'
                  ? '#fca5a5'
                  : '#e5e7eb'
              }`
            }}>
              {uploadStatus === 'success' ? (
                <CheckCircle size={20} />
              ) : uploadStatus === 'error' ? (
                <AlertCircle size={20} />
              ) : null}
              {message}
            </div>
          )}

          {/* CSV Format Info */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#6b7280',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
              CSV Format Requirements:
            </div>
            <div style={{ lineHeight: '1.6' }}>
              <strong>For Properties Lists:</strong> Must include <code>listing_id</code> or <code>property_url</code> column.
              <br />
              <strong>For People Lists:</strong> Must include <code>email</code> or <code>phone</code> column.
              <br />
              <br />
              Other columns will be mapped automatically if they match the database schema.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleClose}
            disabled={uploading}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#374151',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              opacity: uploading ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !listId}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: uploading || !file || !listId
                ? '#9ca3af'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              cursor: uploading || !file || !listId ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: uploading || !file || !listId ? 0.6 : 1
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Importing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Import CSV
              </>
            )}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />
    </>
  )
}

