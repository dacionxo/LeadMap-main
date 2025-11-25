'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface TagsInputProps {
  supabase: SupabaseClient
  initialTags?: string[]
  onChange: (tags: string[]) => void
}

export default function TagsInput({ supabase, initialTags = [], onChange }: TagsInputProps) {
  const [tags, setTags] = useState<string[]>(initialTags || [])
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    setTags(initialTags || [])
  }, [initialTags])

  useEffect(() => {
    loadSuggestions()
  }, [])

  async function loadSuggestions() {
    try {
      // Try to get tag suggestions from a tags table or from existing listings
      // Option 1: If you have a tags table
      const { data } = await supabase
        .from('tags')
        .select('name')
        .order('usage_count', { ascending: false })
        .limit(20)

      if (data) {
        setSuggestions(data.map(r => r.name))
        return
      }
    } catch (err) {
      // Option 2: Extract tags from existing listings
      try {
        const { data } = await supabase
          .from('listings')
          .select('tags')
          .not('tags', 'is', null)
          .limit(100)

        if (data) {
          const allTags = new Set<string>()
          data.forEach((listing: any) => {
            if (Array.isArray(listing.tags)) {
              listing.tags.forEach((tag: string) => allTags.add(tag))
            }
          })
          setSuggestions(Array.from(allTags).slice(0, 20))
        }
      } catch (err2) {
        console.error('Error loading tag suggestions:', err2)
      }
    }
  }

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase()
    if (!trimmed || tags.includes(trimmed)) {
      setInput('')
      return
    }
    const next = [...tags, trimmed]
    setTags(next)
    onChange(next)
    setInput('')
  }

  function removeTag(tag: string) {
    const next = tags.filter(t => t !== tag)
    setTags(next)
    onChange(next)
  }

  const filteredSuggestions = input
    ? suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s.toLowerCase()))
    : []

  return (
    <div>
      {/* Display existing tags */}
      {tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '12px'
          }}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: '#eef2ff',
                color: '#6366f1',
                borderRadius: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6366f1',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#4f46e5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6366f1'
                }}
                aria-label={`Remove ${tag} tag`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input field */}
      <input
        type="text"
        placeholder="Add tag and press Enter"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (input.trim()) {
              addTag(input)
            }
          }
          if (e.key === 'Escape') {
            setInput('')
          }
        }}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          color: '#374151',
          transition: 'border-color 0.15s ease'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#6366f1'
          e.currentTarget.style.outline = 'none'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />

      {/* Suggestions */}
      {input && filteredSuggestions.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            background: '#f9fafb',
            borderRadius: '6px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '13px',
            color: '#6b7280'
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 500 }}>Suggestions:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {filteredSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => addTag(suggestion)}
                style={{
                  padding: '4px 8px',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: '12px',
                  color: '#374151',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#9ca3af'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


