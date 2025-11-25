import DashboardLayout from '../components/DashboardLayout'
import { Target, Mail, TrendingUp } from 'lucide-react'

export default function EngagePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Engage</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage outreach campaigns to engage your prospects
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Target className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Campaigns</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create and manage email campaigns to reach your prospects
            </p>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Create Campaign →
            </button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Mail className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Sequences</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Set up automated email sequences for follow-ups
            </p>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Create Sequence →
            </button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Performance</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Track campaign performance and engagement metrics
            </p>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View Analytics →
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

