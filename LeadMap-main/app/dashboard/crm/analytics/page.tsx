import DashboardLayout from '../../components/DashboardLayout'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">CRM Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze your sales performance, conversion rates, and deal metrics
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">Analytics dashboard coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

