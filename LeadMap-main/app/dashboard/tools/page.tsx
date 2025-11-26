'use client'

import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { 
  Plus, 
  ChevronDown, 
  Sparkles, 
  FileText, 
  ArrowUpRight,
  Filter,
  Search,
  ArrowUpDown,
  Settings,
  HelpCircle
} from 'lucide-react'

interface WorkflowTemplate {
  id: string
  title: string
  description: string
  tags: Array<{ label: string; color: string; icon?: string }>
}

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: '1',
    title: 'Convert ideal customers with AI sequences',
    description: 'When a contact aligns with your ICP, enroll them in a list and send an...',
    tags: [
      { label: 'Linear', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      { label: 'AI', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' }
    ]
  },
  {
    id: '2',
    title: 'Target Website Visitors',
    description: 'This template will automatically identify companies that are actively...',
    tags: [
      { label: 'Multi-branch', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' }
    ]
  },
  {
    id: '3',
    title: 'Engage companies researching your category with AI outreach',
    description: 'Add interested companies to a list, then trigger an AI-drafted sequenc...',
    tags: [
      { label: 'Generate pipeline', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' },
      { label: 'AI', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' }
    ]
  },
  {
    id: '4',
    title: 'Target new hires with AI-drafted outreach in first 90 days',
    description: 'When a contact enters a new role, add them to a list, then enroll them...',
    tags: [
      { label: 'Generate pipeline', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' },
      { label: 'AI', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' }
    ]
  },
  {
    id: '5',
    title: 'Target customer pain points using AI sequences',
    description: 'Identify contacts fitting your target persona, add them to a list, and...',
    tags: [
      { label: 'Generate pipeline', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' },
      { label: 'AI', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' }
    ]
  }
]

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates'>('workflows')
  const [showFilters, setShowFilters] = useState(false)

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] bg-white dark:bg-gray-900">
        {/* Top Navigation Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Left: Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workflows</h1>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2">
                  Learn more
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Outbound Copilot
              </button>
              <button className="px-4 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create workflow
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'workflows'
                  ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Workflows
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Templates
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-6">
            {/* Workflow Templates Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Start with workflow templates
                </h2>
                <a
                  href="#"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View all templates
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>

              {/* Template Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {workflowTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      {template.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {template.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 text-xs font-medium rounded ${tag.color}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Show Filters
              </button>

              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search workflows"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort
                </button>
                <button className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-4">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                  <div className="relative">
                    <Search className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    <HelpCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 absolute -bottom-1 -right-1" />
                  </div>
                </div>
                {/* Radiating lines effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 border-2 border-orange-200 dark:border-orange-800 rounded-full animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No workflows match your criteria
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
                Try adjusting your search filters to find what you're looking for.
              </p>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
