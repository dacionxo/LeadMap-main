'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface List {
  id: string
  name: string
  type: 'people' | 'properties'
  created_at?: string
  updated_at?: string
}

interface AddToListModalProps {
  supabase: SupabaseClient
  profileId?: string
  selectedCount: number
  onAddToList: (listId: string) => Promise<void>
  onClose: () => void
  isDark?: boolean
}

export default function AddToListModal({
  supabase,
  profileId,
  selectedCount,
  onAddToList,
  onClose,
  isDark = false
}: AddToListModalProps) {
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchLists()
  }, [])

  async function fetchLists() {
    if (!profileId) {
      setLists([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLists([])
        return
      }

      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'properties')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading lists:', error)
        setLists([])
      } else {
        setLists(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
      setLists([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateList() {
    if (!newListName.trim() || !profileId) return

    try {
      setCreating(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('lists')
        .insert([{
          name: newListName.trim(),
          type: 'properties',
          user_id: user.id
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating list:', error)
        alert('Failed to create list')
        return
      }

      if (data) {
        setLists([...lists, data])
        setSelectedListId(data.id)
        setNewListName('')
        setShowCreateInput(false)
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to create list')
    } finally {
      setCreating(false)
    }
  }

  async function handleAdd() {
    if (!selectedListId) {
      alert('Please select a list')
      return
    }

    try {
      setAdding(true)
      await onAddToList(selectedListId)
      // Note: The parent component will handle closing the modal and showing success message
    } catch (error) {
      console.error('Error adding to list:', error)
      alert('Failed to add prospects to list')
    } finally {
      setAdding(false)
    }
  }

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
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: isDark ? '#e2e8f0' : '#111827',
            margin: 0,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            Add to Lists
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#6b7280',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{
          fontSize: '14px',
          color: isDark ? '#94a3b8' : '#6b7280',
          marginBottom: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          Add {selectedCount} selected prospect{selectedCount > 1 ? 's' : ''} to a list
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: isDark ? '#94a3b8' : '#6b7280' }} />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              {lists.length === 0 && !showCreateInput ? (
                <div style={{
                  padding: '16px',
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#f3f4f6',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: isDark ? '#94a3b8' : '#6b7280',
                  fontSize: '14px'
                }}>
                  No lists found. Create your first list below.
                </div>
              ) : (
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: isDark ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}>
                  {lists.map((list) => (
                    <label
                      key={list.id}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: isDark ? '1px solid rgba(99, 102, 241, 0.1)' : '1px solid #f3f4f6',
                        backgroundColor: selectedListId === list.id
                          ? (isDark ? 'rgba(99, 102, 241, 0.2)' : '#f3f4f6')
                          : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedListId !== list.id) {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(99, 102, 241, 0.1)' : '#f9fafb'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedListId !== list.id) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name="list"
                        value={list.id}
                        checked={selectedListId === list.id}
                        onChange={(e) => setSelectedListId(e.target.value)}
                        style={{
                          marginRight: '12px',
                          accentColor: '#6366f1'
                        }}
                      />
                      <span style={{
                        color: isDark ? '#e2e8f0' : '#111827',
                        fontSize: '14px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>
                        {list.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {showCreateInput ? (
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateList()
                    } else if (e.key === 'Escape') {
                      setShowCreateInput(false)
                      setNewListName('')
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    color: isDark ? '#e2e8f0' : '#111827',
                    fontSize: '14px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    marginBottom: '8px'
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCreateList}
                    disabled={!newListName.trim() || creating}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: creating || !newListName.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      opacity: creating || !newListName.trim() ? 0.5 : 1
                    }}
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateInput(false)
                      setNewListName('')
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      color: isDark ? '#94a3b8' : '#6b7280',
                      border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateInput(true)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'transparent',
                  color: isDark ? '#6366f1' : '#6366f1',
                  border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #6366f1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={16} />
                Create New List
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: isDark ? '#94a3b8' : '#6b7280',
                  border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!selectedListId || adding}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !selectedListId || adding ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  opacity: !selectedListId || adding ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {adding ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add to List'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

