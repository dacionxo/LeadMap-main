'use client'

import { cn } from '@/app/lib/utils'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import DealsNavbar from '../crm/deals/components/DealsNavbar'
import { useSidebar } from '../components/SidebarContext'
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

/** Must be inside DashboardLayout (useSidebar). */
function ListsPageContent() {
  const { isOpen: isSidebarOpen } = useSidebar()
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
    <div className="-mt-[30px]">
      <div
        className="fixed top-0 bottom-0 flex flex-col bg-mesh dark:bg-dark transition-all duration-300 overflow-hidden"
        style={{ left: isSidebarOpen ? '274px' : '79px', right: 0 }}
      >
        <DealsNavbar />
        <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
          <div className="bg-white/80 dark:bg-dark/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] rounded-[2rem] flex flex-col h-full min-h-0 overflow-hidden relative">
            {/* Decorative blur */}
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
              aria-hidden
            />

            <header className="shrink-0 z-20 px-8 py-6">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    My <span className="text-blue-500">Lists</span>
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-base">
                    Manage and organize your property portfolio efficiently.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-label="Import list"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">upload_file</span>
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateList('properties')}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    aria-label="Create list"
                  >
                    Create List
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                    Welcome to your lists
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
                    Lists help you organize your prospects and start targeted campaigns. Pick a
                    template below to get started.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      type="button"
                      onClick={() => handleCreateList('people')}
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">group</span>
                      Create a prospects list
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateList('properties')}
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">apartment</span>
                      Create a property list
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Search and filters toolbar */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
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
                          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          aria-label="Search lists"
                        />
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        aria-label="View options"
                      >
                        <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">grid_view</span>
                        View
                        <span className="material-symbols-outlined text-[18px] text-gray-300 dark:text-slate-500">expand_more</span>
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSortDropdown(!showSortDropdown)}
                          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                          aria-haspopup="true"
                          aria-label="Sort options"
                        >
                          Sort: {sortLabel}
                          <span className="material-symbols-outlined text-[18px] text-gray-300 dark:text-slate-500">expand_more</span>
                        </button>
                        {showSortDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowSortDropdown(false)}
                              aria-hidden
                            />
                            <div
                              className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 shadow-lg z-50 py-1"
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
                                    'w-full px-3 py-2 text-left text-sm font-medium transition-colors',
                                    sortBy === opt
                                      ? 'text-primary bg-primary/10 dark:bg-primary/20'
                                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
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
                        className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        aria-label="Filter options"
                      >
                        <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">filter_list</span>
                        Filter
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
    </div>
  )
}

export default function ListsPage() {
  return (
    <DashboardLayout fullBleed hideHeader>
      <ListsPageContent />
    </DashboardLayout>
  )
}
