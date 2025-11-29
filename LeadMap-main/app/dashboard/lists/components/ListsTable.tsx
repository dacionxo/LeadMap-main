'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Trash2, Edit2, Download, ArrowRight } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface List {
  id: string
  name: string
  type?: 'people' | 'properties' // Optional for backward compatibility
  count?: number
  created_at?: string
  updated_at?: string
  user_id?: string
}

interface ListsTableProps {
  lists: List[]
  onRefresh: () => void
  supabase: SupabaseClient
}

export default function ListsTable({ lists, onRefresh, supabase }: ListsTableProps) {
  const router = useRouter()
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const handleDelete = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return
    
    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId)

      if (error) {
        console.error('Error deleting list:', error)
        alert('Failed to delete list')
      } else {
        onRefresh()
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete list')
    }
    setMenuOpen(null)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const handleExportCSV = async (listId: string, listName: string) => {
    try {
      // Fetch list items first from list_memberships table
      const { data: listItems, error: itemsError } = await supabase
        .from('list_memberships')
        .select('*')
        .eq('list_id', listId)

      if (itemsError) {
        console.error('Error fetching list items:', itemsError)
        alert('Failed to export list')
        return
      }

      if (!listItems || listItems.length === 0) {
        alert('No items to export')
        return
      }

      // Fetch actual listing data
      const listingItems = listItems.filter(item => item.item_type === 'listing')
      const contactItems = listItems.filter(item => item.item_type === 'contact')
      
      const allListings: any[] = []

      // Fetch listings
      if (listingItems.length > 0) {
        const itemIds = listingItems.map(item => item.item_id).filter(Boolean)
        
        // Try listing_id first
        const { data: listingsById } = await supabase
          .from('listings')
          .select('*')
          .in('listing_id', itemIds)

        if (listingsById) {
          allListings.push(...listingsById)
        }

        // Try property_url for missing ones
        const foundIds = new Set(listingsById?.map(l => l.listing_id) || [])
        const missingIds = itemIds.filter(id => !foundIds.has(id))
        
        if (missingIds.length > 0) {
          const { data: listingsByUrl } = await supabase
            .from('listings')
            .select('*')
            .in('property_url', missingIds)

          if (listingsByUrl) {
            const existingIds = new Set(allListings.map(l => l.listing_id))
            const newListings = listingsByUrl.filter(l => !existingIds.has(l.listing_id))
            allListings.push(...newListings)
          }
        }
      }

      // Fetch contacts
      if (contactItems.length > 0) {
        const contactIds = contactItems.map(item => item.item_id)
        const { data: contacts } = await supabase
          .from('contacts')
          .select('*')
          .in('id', contactIds)

        if (contacts) {
          // Convert contacts to listing-like format
          contacts.forEach(contact => {
            allListings.push({
              listing_id: contact.id,
              street: contact.address,
              city: contact.city,
              state: contact.state,
              zip_code: contact.zip_code,
              agent_name: contact.first_name && contact.last_name 
                ? `${contact.first_name} ${contact.last_name}` 
                : contact.first_name || contact.last_name,
              agent_email: contact.email,
              agent_phone: contact.phone
            })
          })
        }
      }

      // Convert to CSV with proper headers
      const headers = [
        'Listing ID', 'Address', 'City', 'State', 'Zip Code', 'Price', 
        'Beds', 'Baths', 'Sqft', 'Status', 'Agent Name', 'Agent Email', 
        'Agent Phone', 'Score', 'Year Built', 'Last Sale Price', 'Last Sale Date'
      ]
      
      const rows = allListings.map(listing => [
        listing.listing_id || '',
        listing.street || '',
        listing.city || '',
        listing.state || '',
        listing.zip_code || '',
        listing.list_price?.toString() || '',
        listing.beds?.toString() || '',
        listing.full_baths?.toString() || '',
        listing.sqft?.toString() || '',
        listing.status || '',
        listing.agent_name || '',
        listing.agent_email || '',
        listing.agent_phone || '',
        listing.ai_investment_score?.toString() || '',
        listing.year_built?.toString() || '',
        listing.last_sale_price?.toString() || '',
        listing.last_sale_date || ''
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${listName.replace(/[^a-z0-9]/gi, '_')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting CSV:', err)
      alert('Failed to export list')
    }
  }

  const handleAddToPipeline = (listId: string) => {
    // TODO: Implement add to pipeline functionality
    console.log('Add to pipeline:', listId)
    alert('Add to pipeline functionality coming soon')
  }

  if (lists.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.95) 100%)',
        borderRadius: '12px',
        padding: '64px',
        textAlign: 'center',
        boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          color: '#000000',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '16px',
          fontWeight: 500,
          marginBottom: '8px'
        }}>
          No lists found
        </div>
        <div style={{
          color: '#000000',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          opacity: 0.7
        }}>
          Create your first list to get started
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
      overflow: 'hidden'
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        position: 'relative'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          tableLayout: 'fixed'
        }}>
        <thead style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          <tr style={{
            background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.95) 100%)',
            borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
          }}>
            <th style={{
              padding: '16px 24px',
              textAlign: 'left',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              List Name
            </th>
            <th style={{
              padding: '16px 24px',
              textAlign: 'right',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              # Of Records
            </th>
            <th style={{
              padding: '16px 24px',
              textAlign: 'left',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Last Modified
            </th>
            <th style={{
              padding: '16px 24px',
              textAlign: 'center',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              width: '120px'
            }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {lists.map((list) => (
            <tr
              key={list.id}
              style={{
                borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: hoveredRow === list.id 
                  ? 'rgba(0, 0, 0, 0.02)' 
                  : 'transparent',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={() => setHoveredRow(list.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td 
                onClick={() => router.push(`/dashboard/lists/${list.id}`)}
                style={{
                  padding: '16px 24px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: '14px',
                  color: '#6366f1',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#4f46e5'
                  e.currentTarget.style.textDecoration = 'underline'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6366f1'
                  e.currentTarget.style.textDecoration = 'none'
                }}
              >
                {list.name}
              </td>
              <td style={{
                padding: '16px 24px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '14px',
                color: '#000000',
                fontWeight: 500,
                textAlign: 'right'
              }}>
                {list.count || 0}
              </td>
              <td style={{
                padding: '16px 24px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '14px',
                color: '#000000'
              }}>
                {formatDate(list.updated_at || list.created_at)}
              </td>
              <td style={{
                padding: '16px 24px',
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                {/* Export CSV Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExportCSV(list.id, list.name)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#000000',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  title="Export as CSV"
                >
                  <Download size={18} />
                </button>

                {/* Add to Pipeline Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddToPipeline(list.id)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#000000',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  title="Add to Pipeline"
                >
                  <ArrowRight size={18} />
                </button>

                {/* Three Dots Menu */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(menuOpen === list.id ? null : list.id)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#000000',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  title="More options"
                >
                  <MoreVertical size={18} />
                </button>
                
                {menuOpen === list.id && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99
                      }}
                      onClick={() => setMenuOpen(null)}
                    />
                    <div style={{
                      position: 'absolute',
                      right: '24px',
                      top: '100%',
                      marginTop: '4px',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.95) 100%)',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.1)',
                      zIndex: 100,
                      minWidth: '180px',
                      overflow: 'hidden',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(null)
                          // TODO: Implement edit
                          alert('Edit functionality coming soon')
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontSize: '14px',
                          color: '#000000',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <Edit2 size={16} />
                        Edit List
                      </button>
                      <div style={{
                        height: '1px',
                        background: 'rgba(0, 0, 0, 0.1)',
                        margin: '4px 0'
                      }} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(list.id)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontSize: '14px',
                          color: '#ef4444',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <Trash2 size={16} />
                        Delete List
                      </button>
                    </div>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
