'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Link as LinkIcon, X, Edit, Trash2, Copy, Check } from 'lucide-react'

interface TriggerLink {
  id: string
  name: string
  link_url: string
  link_key: string
  description?: string
  click_count: number
  created_at: string
  updated_at: string
}

export default function TriggerLinksContent() {
  const [links, setLinks] = useState<TriggerLink[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLink, setSelectedLink] = useState<TriggerLink | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    fetchLinks()
  }, [])

  const fetchLinks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/trigger-links', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setLinks(data.links || [])
      }
    } catch (error) {
      console.error('Error fetching links:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLinks = links.filter(link =>
    link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.link_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.link_url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this trigger link?')) return

    try {
      const response = await fetch(`/api/trigger-links/${linkId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        fetchLinks()
      } else {
        alert('Failed to delete link')
      }
    } catch (error) {
      console.error('Error deleting link:', error)
      alert('Failed to delete link')
    }
  }

  const handleCopyLink = (linkKey: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const triggerUrl = `${baseUrl}/t/${linkKey}`
    navigator.clipboard.writeText(triggerUrl)
    setCopiedKey(linkKey)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Link
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Trigger links allow you to put links inside SMS messages and emails, which allow you to track specific customer actions and trigger events based on when the link is clicked.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Link
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Trigger Link"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table Headers */}
        {filteredLinks.length > 0 && (
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
            <div className="col-span-3">Name</div>
            <div className="col-span-4">Link URL</div>
            <div className="col-span-3">Link Key</div>
            <div className="col-span-2">Actions</div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredLinks.length > 0 ? (
          /* Links List */
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              >
                <div className="col-span-3 text-sm font-medium text-gray-900 dark:text-white">
                  {link.name}
                </div>
                <div className="col-span-4 text-sm text-gray-600 dark:text-gray-400 break-all">
                  <a
                    href={link.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    {link.link_url.length > 50 ? `${link.link_url.substring(0, 50)}...` : link.link_url}
                  </a>
                </div>
                <div className="col-span-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                      {link.link_key}
                    </code>
                    <button
                      onClick={() => handleCopyLink(link.link_key)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Copy trigger URL"
                    >
                      {copiedKey === link.link_key ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedLink(link)
                      setShowEditModal(true)
                    }}
                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
              <LinkIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No trigger links yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Create your first trigger link to start tracking customer actions in your SMS and email campaigns.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Link
            </button>
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {showCreateModal && (
        <CreateLinkModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchLinks()
            setShowCreateModal(false)
          }}
        />
      )}

      {/* Edit Link Modal */}
      {showEditModal && selectedLink && (
        <EditLinkModal
          link={selectedLink}
          onClose={() => {
            setShowEditModal(false)
            setSelectedLink(null)
          }}
          onSuccess={() => {
            fetchLinks()
            setShowEditModal(false)
            setSelectedLink(null)
          }}
        />
      )}
    </div>
  )
}

// Create Link Modal
function CreateLinkModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    link_url: '',
    link_key: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  const generateLinkKey = () => {
    const randomKey = Math.random().toString(36).substring(2, 10)
    setFormData({ ...formData, link_key: randomKey })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.link_url || !formData.link_key) {
      alert('Please fill in all required fields')
      return
    }

    // Validate URL
    try {
      new URL(formData.link_url)
    } catch {
      alert('Please enter a valid URL')
      return
    }

    // Validate link_key format (alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-]+$/.test(formData.link_key)) {
      alert('Link key can only contain letters, numbers, and hyphens')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/trigger-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create link')
      }
    } catch (error) {
      console.error('Error creating link:', error)
      alert('Failed to create link')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Trigger Link</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                placeholder="e.g., Special Offer Link"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link URL *
              </label>
              <input
                type="url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                placeholder="https://example.com/offer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link Key *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.link_key}
                  onChange={(e) => setFormData({ ...formData, link_key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 font-mono text-sm"
                  placeholder="offer-2024"
                />
                <button
                  onClick={generateLinkKey}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Unique identifier for tracking (letters, numbers, and hyphens only)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                placeholder="Optional description for this trigger link"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit Link Modal
function EditLinkModal({
  link,
  onClose,
  onSuccess,
}: {
  link: TriggerLink
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: link.name,
    link_url: link.link_url,
    link_key: link.link_key,
    description: link.description || '',
  })
  const [saving, setSaving] = useState(false)

  const handleUpdate = async () => {
    if (!formData.name || !formData.link_url || !formData.link_key) {
      alert('Please fill in all required fields')
      return
    }

    // Validate URL
    try {
      new URL(formData.link_url)
    } catch {
      alert('Please enter a valid URL')
      return
    }

    // Validate link_key format
    if (!/^[a-zA-Z0-9-]+$/.test(formData.link_key)) {
      alert('Link key can only contain letters, numbers, and hyphens')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/trigger-links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update link')
      }
    } catch (error) {
      console.error('Error updating link:', error)
      alert('Failed to update link')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Trigger Link</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                placeholder="e.g., Special Offer Link"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link URL *
              </label>
              <input
                type="url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                placeholder="https://example.com/offer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link Key *
              </label>
              <input
                type="text"
                value={formData.link_key}
                onChange={(e) => setFormData({ ...formData, link_key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 font-mono text-sm"
                placeholder="offer-2024"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Unique identifier for tracking (letters, numbers, and hyphens only)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                placeholder="Optional description for this trigger link"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

