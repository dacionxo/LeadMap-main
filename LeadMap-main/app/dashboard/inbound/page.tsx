import DashboardLayout from '../components/DashboardLayout'
import { Inbox, FileText, Zap, Plus } from 'lucide-react'

export default function InboundPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Inbound</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage incoming leads from forms, webhooks, and integrations
            </p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200">
            <Plus className="w-4 h-4" />
            <span>Create Form</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Inbox className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Inbound Leads</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              View and manage leads that come in through your forms and integrations
            </p>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">0</div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Total leads</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Forms</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create and manage lead capture forms for your website
            </p>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Create Form →
            </button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Zap className="w-8 h-8 text-green-600 dark:text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Webhooks</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Set up webhooks to receive leads from external systems
            </p>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Configure Webhook →
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

