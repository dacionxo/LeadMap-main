'use client'

import { WidgetComponentProps } from '../types'
import { ArrowRight, Search as SearchIcon, Sparkles, Target, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

const actions = [
  { id: 'prospect', title: 'Find Prospects', description: 'Discover new property leads', icon: SearchIcon, href: '/dashboard/prospect-enrich', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'enrich', title: 'Enrich Leads', description: 'Add contact information', icon: Sparkles, href: '/dashboard/enrichment', gradient: 'from-purple-500 to-indigo-500' },
  { id: 'campaign', title: 'Start Campaign', description: 'Launch outreach campaign', icon: Target, href: '/dashboard/crm/sequences', gradient: 'from-green-500 to-emerald-500' },
  { id: 'import', title: 'Import Data', description: 'Upload CSV files', icon: Upload, href: '/admin', gradient: 'from-orange-500 to-red-500' }
]

export function QuickActionsWidget({ widget }: WidgetComponentProps) {
  const router = useRouter()
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            onClick={() => router.push(action.href)}
            className="p-3 text-left bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${action.gradient} shadow-md group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-200" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{action.title}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">{action.description}</p>
          </button>
        )
      })}
    </div>
  )
}
