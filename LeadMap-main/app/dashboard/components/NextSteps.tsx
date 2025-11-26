'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface NextStep {
  id: string
  title: string
  description: string
  href: string
  completed: boolean
}

const defaultSteps: NextStep[] = [
  {
    id: 'connect-data',
    title: 'Connect your first data source',
    description: 'Import leads from CSV or connect an external data provider',
    href: '/dashboard/leads',
    completed: false
  },
  {
    id: 'explore-map',
    title: 'Explore properties on the map',
    description: 'Visualize your leads geographically to identify hot markets',
    href: '/dashboard/leads?view=map',
    completed: false
  }
]

export default function NextSteps() {
  const [steps, setSteps] = useState<NextStep[]>(defaultSteps)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const router = useRouter()

  // Load progress from localStorage (in production, this would come from Supabase)
  useEffect(() => {
    const saved = localStorage.getItem('next_steps_progress')
    if (saved) {
      try {
        const savedSteps = JSON.parse(saved)
        setSteps(savedSteps)
      } catch (e) {
        console.error('Failed to load next steps progress:', e)
      }
    }
  }, [])

  // Save progress to localStorage
  const saveProgress = (updatedSteps: NextStep[]) => {
    localStorage.setItem('next_steps_progress', JSON.stringify(updatedSteps))
    // In production, also save to Supabase:
    // await supabase.from('users').update({ next_steps_progress: updatedSteps }).eq('id', userId)
  }

  const toggleStep = (id: string) => {
    const updatedSteps = steps.map(step =>
      step.id === id ? { ...step, completed: !step.completed } : step
    )
    setSteps(updatedSteps)
    saveProgress(updatedSteps)
  }

  const handleStart = (href: string) => {
    router.push(href)
  }

  const visibleSteps = hideCompleted ? steps.filter(s => !s.completed) : steps
  const completedCount = steps.filter(s => s.completed).length

  if (visibleSteps.length === 0) {
    return null
  }

  return (
    <div className="mb-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Your next actions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Explore recommended actions to build on your setup and unlock more value
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Hide completed</span>
          </label>
        </div>
      </div>

      {/* Progress Indicator */}
      {completedCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Account Setup</span>
            <span>{completedCount} of {steps.length} completed</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-3">
        {visibleSteps.map((step) => (
          <div
            key={step.id}
            className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-opacity duration-300"
            style={{ opacity: step.completed ? 0.6 : 1 }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                      step.completed
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    {step.completed && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-medium mb-1 ${step.completed ? 'text-gray-500 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleStart(step.href)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 ${
                      step.completed
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {step.completed ? 'Completed' : 'Start'}
                  </button>
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                  >
                    {expandedStep === step.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

