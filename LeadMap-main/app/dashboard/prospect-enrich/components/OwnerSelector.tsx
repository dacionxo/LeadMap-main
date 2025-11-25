'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface OwnerSelectorProps {
  supabase: SupabaseClient
  value: string | null
  onChange: (ownerId: string | null) => void
}

interface User {
  id: string
  name?: string | null
  email?: string | null
  avatar_url?: string | null
}

export default function OwnerSelector({ supabase, value, onChange }: OwnerSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      // Try to get users from auth.users or a users table
      // Adjust the table name based on your schema
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading users:', error)
        // Fallback: try to get from auth.users via a function or view
        setUsers([])
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find(u => u.id === value)

  return (
    <div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          color: '#374151',
          background: loading ? '#f9fafb' : '#ffffff',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.borderColor = '#9ca3af'
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.borderColor = '#d1d5db'
          }
        }}
      >
        <option value="">Unassigned</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name || user.email || `User ${user.id.slice(0, 8)}`}
          </option>
        ))}
      </select>
      {selectedUser && (
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '13px',
            color: '#6b7280'
          }}
        >
          <User size={14} />
          <span>{selectedUser.name || selectedUser.email}</span>
        </div>
      )}
    </div>
  )
}


