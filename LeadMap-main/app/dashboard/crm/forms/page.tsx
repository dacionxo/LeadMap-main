'use client'

import DashboardLayout from '../../components/DashboardLayout'
import { ChevronDown } from 'lucide-react'

export default function FormsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f5f5f0] dark:bg-gray-900">
        {/* Header */}
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forms</h1>
        </div>

        {/* Form Examples Section */}
        <div className="px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Form Autofill */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Form autofill
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    hello inc.
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value="alex@comp"
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Name"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Job title"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Company"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Industry"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Company size"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                  
                  <button className="w-full mt-6 px-4 py-2 bg-[#f5f5f0] dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium">
                    Submit
                  </button>
                </div>
              </div>
            </div>

            {/* Form Shortening */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Form shortening
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    hello inc.
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value="alex@comp"
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Name"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Job title"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Company"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Industry"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <div className="relative">
                      <select className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none">
                        <option>Purpose of the demo</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div>
                      <textarea
                        placeholder="Any specific features you'd like to focus?"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                      />
                    </div>
                  </div>
                  
                  <button className="w-full mt-6 px-4 py-2 bg-[#f5f5f0] dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium">
                    Request a demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Promotional Section */}
        <div className="px-6 pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Capture more qualified leads with form enrichment
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Shorten your existing website forms, autofill known fields, and enrich every form submission with LeadMap data.
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <button className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
                Learn more
              </button>
              <button className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg transition-colors font-medium shadow-sm">
                Create form
              </button>
            </div>
          </div>
        </div>

        {/* Scroll to top button */}
        <button className="fixed bottom-6 right-6 w-10 h-10 bg-black dark:bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors z-50">
          <ChevronDown className="w-5 h-5 transform rotate-180" />
        </button>
      </div>
    </DashboardLayout>
  )
}
