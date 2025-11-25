import DashboardLayout from '../../components/DashboardLayout'
import { TrendingUp, Plus } from 'lucide-react'

export default function PipelinePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sales Pipeline</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Visualize and manage your property deal pipeline
            </p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200">
            <Plus className="w-4 h-4" />
            <span>New Deal</span>
          </button>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">Pipeline visualization coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

