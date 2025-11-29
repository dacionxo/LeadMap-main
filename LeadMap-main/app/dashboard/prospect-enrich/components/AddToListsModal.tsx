'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Search, Check, Loader2 } from 'lucide-react'

interface List {
  id: string
  name: string
  type: 'people' | 'properties'
  item_count?: number
}

interface AddToListsModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemType: 'listing' | 'contact' | 'company'
  onSuccess?: () => void
}

export default function AddToListsModal({
  isOpen,
  onClose,
  itemId,
  itemType,
  onSuccess
}: AddToListsModalProps) {
  const [lists, setLists] = useState<List[]>([])
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [showCreateInput, setShowCreateInput] = useState(false)

  // Determine which list type to show based on itemType
  const listType: 'people' | 'properties' = itemType === 'listing' ? 'properties' : 'people'

  useEffect(() => {
    if (isOpen) {
      fetchLists()
      fetchCurrentMemberships()
    }
  }, [isOpen, itemId, itemType])

  async function fetchLists() {
    try {
      setLoading(true)
      const response = await fetch(`/api/lists?type=${listType}&includeCount=true`)
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

  async function fetchCurrentMemberships() {
    try {
      const response = await fetch(`/api/leads/${itemId}/lists?itemType=${itemType}`)
      const data = await response.json()

      if (response.ok) {
        const membershipIds = new Set<string>((data.lists || []).map((l: List) => l.id))
        setSelectedListIds(membershipIds)
      }
    } catch (error) {
      console.error('Error fetching memberships:', error)
    }
  }

  async function toggleList(listId: string) {
    const isSelected = selectedListIds.has(listId)

    // Optimistic update
    setSelectedListIds(prev => {
      const next = new Set(prev)
      if (isSelected) {
        next.delete(listId)
      } else {
        next.add(listId)
      }
      return next
    })

    try {
      if (isSelected) {
        // Remove from list
        const response = await fetch(`/api/lists/${listId}/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, itemType }),
        })

        if (!response.ok) {
          // Revert on error
          setSelectedListIds(prev => {
            const next = new Set(prev)
            next.add(listId)
            return next
          })
          throw new Error('Failed to remove from list')
        }
      } else {
        // Add to list
        const response = await fetch(`/api/lists/${listId}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, itemType }),
        })

        const data = await response.json()

        if (!response.ok) {
          // Revert on error
          setSelectedListIds(prev => {
            const next = new Set(prev)
            next.delete(listId)
            return next
          })
          // Show specific error message for duplicates
          if (response.status === 409 || data.error?.includes('already')) {
            alert(data.error || data.message || 'This item is already in the list')
          } else {
            throw new Error(data.error || 'Failed to add to list')
          }
        } else if (data.isNew === false) {
          // Item was already in list - show info message
          alert(data.message || 'This item is already in the list')
        }
      }
    } catch (error) {
      console.error('Error toggling list:', error)
      alert('Failed to update list. Please try again.')
    }
  }

  async function handleCreateList() {
    if (!newListName.trim()) return

    try {
      setCreating(true)
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName.trim(),
          type: listType,
        }),
      })

      const data = await response.json()

      if (response.ok && data.list) {
        // Add new list to state
        setLists(prev => [data.list, ...prev])
        // Select it
        setSelectedListIds(prev => {
          const next = new Set(prev)
          next.add(data.list.id)
          return next
        })
        // Add item to new list
        await toggleList(data.list.id)
        // Reset form
        setNewListName('')
        setShowCreateInput(false)
      } else {
        throw new Error(data.error || 'Failed to create list')
      }
    } catch (error: any) {
      console.error('Error creating list:', error)
      alert(error.message || 'Failed to create list')
    } finally {
      setCreating(false)
    }
  }

  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists
    const query = searchQuery.toLowerCase()
    return lists.filter(list => list.name.toLowerCase().includes(query))
  }, [lists, searchQuery])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            margin: 0,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            Add to Lists
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Search */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ position: 'relative' }}>
            <Search style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: '#9ca3af',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lists"
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#6366f1'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
        </div>

        {/* Create New List */}
        {!showCreateInput ? (
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setShowCreateInput(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                border: '1px dashed #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f1'
                e.currentTarget.style.color = '#6366f1'
                e.currentTarget.style.backgroundColor = '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.color = '#6b7280'
                e.currentTarget.style.backgroundColor = '#ffffff'
              }}
            >
              <Plus size={16} />
              Create New List
            </button>
          </div>
        ) : (
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creating) {
                  handleCreateList()
                } else if (e.key === 'Escape') {
                  setShowCreateInput(false)
                  setNewListName('')
                }
              }}
            />
            <button
              onClick={handleCreateList}
              disabled={!newListName.trim() || creating}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: creating ? '#9ca3af' : '#6366f1',
                color: '#ffffff',
                cursor: creating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {creating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
            <button
              onClick={() => {
                setShowCreateInput(false)
                setNewListName('')
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Lists */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {loading ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              Loading lists...
            </div>
          ) : filteredLists.length === 0 ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              {searchQuery ? 'No lists found matching your search' : 'No lists yet. Create one to get started!'}
            </div>
          ) : (
            filteredLists.map((list) => {
              const isSelected = selectedListIds.has(list.id)
              return (
                <div
                  key={list.id}
                  style={{
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                  }}
                  onClick={() => toggleList(list.id)}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`,
                    borderRadius: '4px',
                    backgroundColor: isSelected ? '#6366f1' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s'
                  }}>
                    {isSelected && <Check size={14} color="#ffffff" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#111827',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      marginBottom: '2px'
                    }}>
                      {list.name}
                    </div>
                    {list.item_count !== undefined && (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>
                        {list.item_count} {list.item_count === 1 ? 'record' : 'records'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6366f1'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

