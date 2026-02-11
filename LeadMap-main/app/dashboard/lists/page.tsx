'use client'

import { cn } from '@/app/lib/utils'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import CreateListModal from './components/CreateListModal'
import ImportListModal from './components/ImportListModal'
import ListsTable from './components/ListsTable'

interface List {
  id: string
  name: string
  type: 'people' | 'properties'
  description?: string
  created_at?: string
  updated_at?: string
  item_count?: number
}

type SortBy = 'lastModified' | 'name' | 'created'

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('lastModified')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newListType, setNewListType] = useState<'people' | 'properties'>('properties')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/lists?includeCount=true', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
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
  }, [])

  const handleCreateList = useCallback((type: 'people' | 'properties') => {
    setNewListType(type)
    setShowCreateModal(true)
  }, [])

  const handleListCreated = useCallback(() => {
    setShowCreateModal(false)
    fetchLists()
  }, [fetchLists])

  const handleImportComplete = useCallback(() => {
    setShowImportModal(false)
    fetchLists()
  }, [fetchLists])

  const filteredAndSortedLists = useMemo(() => {
    let result = [...lists]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((l) => l.name.toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'created') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      }
      return (
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
      )
    })
    return result
  }, [lists, searchQuery, sortBy])

  const sortLabel =
    sortBy === 'lastModified' ? 'Modified' : sortBy === 'name' ? 'Name' : 'Created'

  return (
    <DashboardLayout fullBleed>
      <div className="lists-page flex flex-col h-full min-h-0 bg-mesh font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-700 overflow-hidden">
        <div className="flex-1 px-4 pb-4 overflow-hidden flex flex-col min-h-0">
          <div className="lists-glass-panel bg-white/40 backdrop-blur-2xl border border-white/60 shadow-glass rounded-2xl flex flex-col h-full overflow-hidden relative flex-1 min-h-0">
            {/* Decorative blur */}
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/4 -translate-y-1/4 mix-blend-multiply"
              aria-hidden
            />

            <header className="shrink-0 z-20 px-8 pt-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                    My{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                      Lists
                    </span>
                  </h1>
                  <p className="text-slate-500 mt-1 text-sm font-medium">
                    Manage and organize your property portfolio efficiently.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 rounded-lg bg-white/60 border border-white shadow-sm-soft text-slate-600 text-xs font-semibold hover:bg-white hover:shadow-md transition-all flex items-center gap-1.5 backdrop-blur-sm"
                    aria-label="Import list"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateList('properties')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center gap-1.5"
                    aria-label="Create list"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Create List
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-auto custom-scrollbar px-8 pb-8 flex flex-col min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
                  <span className="ml-3 text-slate-500 font-medium">Loading lists...</span>
                </div>
              ) : lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-32 h-32 mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-5xl">
                    📋
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-3">
                    Welcome to your lists
                  </h2>
                  <p className="text-slate-500 mb-8 max-w-md">
                    Lists help you organize your prospects and start targeted campaigns. Pick a
                    template below to get started.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      type="button"
                      onClick={() => handleCreateList('people')}
                      className="px-4 py-2 rounded-lg bg-white/60 border border-white shadow-sm-soft text-slate-600 text-sm font-semibold hover:bg-white transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">group</span>
                      Create a prospects list
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateList('properties')}
                      className="px-4 py-2 rounded-lg bg-white/60 border border-white shadow-sm-soft text-slate-600 text-sm font-semibold hover:bg-white transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">apartment</span>
                      Create a property list
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Search and filters toolbar */}
                  <div className="flex items-center justify-between gap-4 mb-4 bg-white/50 backdrop-blur-md p-1.5 rounded-xl border border-white/50 shadow-sm-soft">
                    <div className="flex-1 flex items-center relative group max-w-md">
                      <span
                        className="absolute left-3 material-symbols-outlined text-slate-400 group-focus-within:text-blue-600 transition-colors z-10 text-[18px]"
                        aria-hidden
                      >
                        search
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search lists..."
                        className="w-full pl-10 pr-4 py-1.5 bg-transparent border-0 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 rounded-md"
                        aria-label="Search lists"
                      />
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2" aria-hidden />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white rounded-lg text-xs font-medium text-slate-600 transition-colors"
                        aria-label="View options"
                      >
                        <span className="material-symbols-outlined text-[16px] text-slate-400">
                          grid_view
                        </span>
                        View
                        <span className="material-symbols-outlined text-[16px] text-slate-400">
                          expand_more
                        </span>
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSortDropdown(!showSortDropdown)}
                          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white rounded-lg text-xs font-medium text-slate-600 transition-colors"
                          aria-haspopup="true"
                          aria-label="Sort options"
                        >
                          Sort: {sortLabel}
                          <span className="material-symbols-outlined text-[16px] text-slate-400">
                            expand_more
                          </span>
                        </button>
                        {showSortDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowSortDropdown(false)}
                              aria-hidden
                            />
                            <div
                              className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border border-slate-200 shadow-lg z-50 py-1"
                              role="menu"
                            >
                              {(['lastModified', 'name', 'created'] as const).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    setSortBy(opt)
                                    setShowSortDropdown(false)
                                  }}
                                  className={cn(
                                    'w-full px-3 py-2 text-left text-xs font-medium hover:bg-slate-50 transition-colors',
                                    sortBy === opt ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'
                                  )}
                                  role="menuitem"
                                >
                                  {opt === 'lastModified' ? 'Modified' : opt === 'name' ? 'Name' : 'Created'}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 transition-colors hover:text-slate-800"
                        aria-label="Filter options"
                      >
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                      </button>
                    </div>
                  </div>

                  <ListsTable
                    lists={filteredAndSortedLists}
                    onRefresh={fetchLists}
                  />
                </>
              )}
            </main>
          </div>
        </div>

        {showCreateModal && (
          <CreateListModal
            type={newListType}
            onClose={() => setShowCreateModal(false)}
            onCreated={handleListCreated}
            supabase={null as any}
          />
        )}

        <ImportListModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      </div>
    </DashboardLayout>
  )
}
