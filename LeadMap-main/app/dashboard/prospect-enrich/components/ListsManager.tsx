'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface Listing {
  listing_id: string
  lists?: string[] | null
  [key: string]: any
}

interface ListsManagerProps {
  supabase: SupabaseClient
  listing: Listing | null
  onChange: (lists: string[]) => void
}

interface List {
  id: string
  name: string
  created_at?: string
  user_id?: string
}

export default function ListsManager({ supabase, listing, onChange }: ListsManagerProps) {
  const [lists, setLists] = useState<List[]>([])
  const [selected, setSelected] = useState<string[]>(listing?.lists || [])
  const [newListName, setNewListName] = useState('')
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLists()
  }, [])

  useEffect(() => {
    setSelected(listing?.lists || [])
  }, [listing])

  async function fetchLists() {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLists([])
        return
      }
      
      // Fetch lists for the current user, filtering by user_id
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
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

  function toggle(listId: string) {
    const next = selected.includes(listId)
      ? selected.filter(id => id !== listId)
      : [...selected, listId]
    setSelected(next)
    onChange(next)
  }

  async function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!newListName.trim()) return

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('User not authenticated')
        return
      }

      // Create list with user_id and type (properties since this is used in prospect-enrich)
      const { data, error } = await supabase
        .from('lists')
        .insert([
          {
            name: newListName.trim(),
            type: 'properties',
            user_id: user.id
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating list:', error)
        return
      }

      if (data) {
        // Refresh lists to ensure we have the latest data from Supabase
        await fetchLists()
        const next = [data.id, ...selected]
        setSelected(next)
        setNewListName('')
        setShowCreateInput(false)
        onChange(next)
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  return (
    <div>
      <div
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '12px'
        }}
      >
        {loading ? (
          <div
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '14px',
              color: '#6b7280',
              padding: '8px'
            }}
          >
            Loading lists...
          </div>
        ) : lists.length === 0 ? (
          <div
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '14px',
              color: '#6b7280',
              padding: '8px'
            }}
          >
            No lists available. Create one below.
          </div>
        ) : (
          lists.map((list) => (
            <label
              key={list.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '14px',
                color: '#374151'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(list.id)}
                onChange={() => toggle(list.id)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#6366f1'
                }}
              />
              <span style={{ flex: 1 }}>{list.name}</span>
            </label>
          ))
        )}
      </div>

      {showCreateInput ? (
        <form onSubmit={createList} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="List name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '14px',
              color: '#374151'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 12px',
              background: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4f46e5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#6366f1'
            }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateInput(false)
              setNewListName('')
            }}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '14px',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowCreateInput(true)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px dashed #d1d5db',
            borderRadius: '6px',
            background: 'transparent',
            color: '#6366f1',
            cursor: 'pointer',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366f1'
            e.currentTarget.style.background = '#eef2ff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Plus size={16} />
          Create New List
        </button>
      )}
    </div>
  )
}


