'use client'

import { useState, Suspense } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import AppNavSidebar from '../../components/AppNavSidebar'
import DealsNavbar from '../../crm/deals/components/DealsNavbar'
import ABTestingDashboard from '../components/ABTestingDashboard'
import CampaignPerformanceDashboard from '../components/CampaignPerformanceDashboard'
import TemplatePerformanceDashboard from '../components/TemplatePerformanceDashboard'
import ComparativeAnalyticsDashboard from '../components/ComparativeAnalyticsDashboard'

type SubTab = 'overview' | 'ab-testing' | 'campaign-performance' | 'template-performance' | 'comparative'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Placeholder activity level 0–4 for heatmap (no API change). Deterministic: weekend mornings low; workdays 9–5 higher. */
function getActivityLevel(dayIndex: number, hourIndex: number): number {
  const seed = dayIndex * 24 + hourIndex
  if ((dayIndex === 0 || dayIndex === 6) && hourIndex < 10) return 0
  if (dayIndex > 0 && dayIndex < 6 && hourIndex >= 9 && hourIndex <= 17) return seed % 3 === 0 ? 4 : 3
  if (hourIndex > 18) return seed % 3
  return seed % 5
}

const HEATMAP_COLORS = [
  'bg-slate-50 border border-slate-100',
  'bg-blue-100 hover:bg-blue-200',
  'bg-blue-300 hover:bg-blue-400',
  'bg-blue-500 hover:bg-blue-600 shadow-sm',
  'bg-blue-700 hover:bg-blue-800 shadow-md',
] as const

/** Email analytics: same size and design as /dashboard/crm/calendar (full viewport, sidebar + main card). */
function EmailAnalyticsPageContent() {
  const [subTab, setSubTab] = useState<SubTab>('overview')
  const [mailboxFilter, setMailboxFilter] = useState('All Mailboxes')
  const [dateRange, setDateRange] = useState('Last 30 days')

  return (
    <div className="-mt-[30px]" data-email-analytics-wrapper>
      <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
        <DealsNavbar />
        <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
          <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
            <AppNavSidebar />
            <div
              className="flex-1 bg-white dark:bg-dark/90 rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden relative"
              data-email-analytics-card
            >
              <div
                className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
                aria-hidden
              />
              <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
                <main className="flex-1 min-h-0 overflow-y-auto p-8" data-email-analytics-main>
              <div
                className="flex flex-col xl:flex-row xl:items-end justify-between mb-10 gap-6"
                data-email-analytics-header
              >
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Email Analytics</h1>
                  <p className="text-slate-500 mt-2 text-sm sm:text-base">
                    Track email performance, engagement, and deliverability insights.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select
                      value={mailboxFilter}
                      onChange={(e) => setMailboxFilter(e.target.value)}
                      className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 px-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
                      aria-label="Mailbox filter"
                    >
                      <option>All Mailboxes</option>
                      <option>Marketing</option>
                      <option>Support</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <span className="material-icons-round text-base">expand_more</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    {dateRange}
                    <span className="material-icons-round text-base text-slate-400">calendar_today</span>
                  </button>
                  <div className="bg-white text-slate-600 py-2 px-4 rounded-lg text-sm font-medium flex items-center gap-2 border border-slate-200 shadow-sm">
                    <span className="w-2 h-2 rounded-full border border-slate-400 bg-transparent" aria-hidden />
                    Paused
                  </div>
                  <button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg text-sm shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                  >
                    <span className="material-icons-round text-sm">download</span>
                    Export CSV
                  </button>
                </div>
              </div>

              <div
                className="flex overflow-x-auto space-x-1 border-b border-slate-200 mb-10 pb-1 scrollbar-hide"
                data-email-analytics-subnav
                aria-label="Analytics views"
              >
                <button
                  type="button"
                  onClick={() => setSubTab('overview')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
                    subTab === 'overview'
                      ? 'text-blue-600 bg-blue-50/50 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                  }`}
                >
                  <span className="material-icons-round text-lg">dashboard</span>
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('ab-testing')}
                  className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg font-medium text-sm border-b-2 border-transparent transition-all whitespace-nowrap group"
                >
                  <span className="material-icons-round text-lg group-hover:text-slate-600 rotate-45">science</span>
                  A/B Testing
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('campaign-performance')}
                  className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg font-medium text-sm border-b-2 border-transparent transition-all whitespace-nowrap group"
                >
                  <span className="material-icons-round text-lg group-hover:text-slate-600">campaign</span>
                  Campaign Performance
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('template-performance')}
                  className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg font-medium text-sm border-b-2 border-transparent transition-all whitespace-nowrap group"
                >
                  <span className="material-icons-round text-lg group-hover:text-slate-600">web</span>
                  Template Performance
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('comparative')}
                  className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg font-medium text-sm border-b-2 border-transparent transition-all whitespace-nowrap group"
                >
                  <span className="material-icons-round text-lg group-hover:text-slate-600">bar_chart</span>
                  Comparative Analytics
                </button>
              </div>

              {subTab === 'overview' && (
                <>
                  <div
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8 relative"
                    data-email-health
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                      <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-blue-600 rounded-full" aria-hidden />
                        Email Health
                      </h2>
                      <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200 inline-flex items-center self-start sm:self-auto">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" aria-hidden />
                        Healthy
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
                      <div className="px-4 first:pl-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Last 24h Failures</p>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">0</p>
                      </div>
                      <div className="px-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Bounce Rate</p>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">0.00%</p>
                      </div>
                      <div className="px-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Complaint Rate</p>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">0.00%</p>
                      </div>
                      <div className="px-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Emails Sent</p>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">0</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
                    data-email-kpi-cards
                  >
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-4xl font-bold text-slate-900 tracking-tight mb-1">0</p>
                          <h3 className="text-sm font-medium text-slate-500">Delivered</h3>
                        </div>
                        <div className="p-2.5 bg-blue-50 rounded-full text-blue-600 flex-shrink-0">
                          <span className="material-icons-round text-xl">mark_email_read</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-1.5 py-0.5 rounded flex items-center">+0.0%</span>
                        <span className="text-xs text-slate-400">delivery rate</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-4xl font-bold text-slate-900 tracking-tight mb-1">0.0%</p>
                          <h3 className="text-sm font-medium text-slate-500">Open Rate</h3>
                        </div>
                        <div className="p-2.5 bg-green-50 rounded-full text-green-600 flex-shrink-0">
                          <span className="material-icons-round text-xl">drafts</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-1.5 py-0.5 rounded flex items-center">+0.0%</span>
                        <span className="text-xs text-slate-400">0 opens</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-4xl font-bold text-slate-900 tracking-tight mb-1">0.0%</p>
                          <h3 className="text-sm font-medium text-slate-500">Click Rate</h3>
                        </div>
                        <div className="p-2.5 bg-purple-50 rounded-full text-purple-600 flex-shrink-0">
                          <span className="material-icons-round text-xl">ads_click</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-1.5 py-0.5 rounded flex items-center">+0.0%</span>
                        <span className="text-xs text-slate-400">0 clicks</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-4xl font-bold text-slate-900 tracking-tight mb-1">0.0%</p>
                          <h3 className="text-sm font-medium text-slate-500">Reply Rate</h3>
                        </div>
                        <div className="p-2.5 bg-orange-50 rounded-full text-orange-600 flex-shrink-0">
                          <span className="material-icons-round text-xl">reply</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-1.5 py-0.5 rounded flex items-center">+0.0%</span>
                        <span className="text-xs text-slate-400">0 replies</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 lg:p-10 mb-10"
                    data-engagement-heatmap
                  >
                    <div
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
                      data-engagement-heatmap-header
                    >
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Engagement Heatmap</h2>
                        <p className="text-sm text-slate-500 mt-1">Activity distribution across days and hours</p>
                      </div>
                      <div
                        className="inline-flex rounded-lg bg-slate-100 p-1"
                        role="group"
                        data-engagement-heatmap-view-toggle
                      >
                        <button
                          type="button"
                          className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          Hour × Day
                        </button>
                        <button
                          type="button"
                          className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
                        >
                          Day × Month
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto pb-2" data-engagement-heatmap-scroll>
                      <div className="min-w-[700px]" data-engagement-heatmap-grid>
                        <div className="flex mb-3 pl-12 sm:pl-16">
                          <div className="flex-grow grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1.5 text-center">
                            {Array.from({ length: 24 }, (_, i) => {
                              const isKeyHour = i % 3 === 0
                              return (
                                <div
                                  key={i}
                                  className={`text-[10px] sm:text-xs uppercase tracking-wider flex flex-col justify-end h-6 ${isKeyHour ? 'text-slate-500 font-semibold' : 'text-slate-400 font-normal'}`}
                                >
                                  {isKeyHour ? i : <span className="opacity-0">.</span>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div className="space-y-1.5" aria-label="Engagement by hour and day">
                          {DAYS.map((day, dIndex) => (
                            <div key={day} className="flex items-center h-10 group">
                              <div className="w-12 sm:w-16 flex-shrink-0 text-[10px] sm:text-xs uppercase font-semibold text-slate-400 tracking-wider text-right pr-3 sm:pr-4">
                                {day}
                              </div>
                              <div className="flex-grow grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1.5 h-full">
                                {Array.from({ length: 24 }, (_, hIndex) => {
                                  const level = getActivityLevel(dIndex, hIndex)
                                  const colorClass = HEATMAP_COLORS[level]
                                  return (
                                    <div
                                      key={hIndex}
                                      className={`${colorClass} transition-all duration-200 rounded-sm h-full w-full relative group/cell hover:scale-110 hover:z-10 cursor-default`}
                                      title={`${day} ${hIndex}:00 • Score: ${level}`}
                                    >
                                      <div className="opacity-0 group-hover/cell:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20 transition-opacity">
                                        {day} {hIndex}:00 • Score: {level}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" aria-hidden />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div
                      className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4"
                      data-engagement-heatmap-legend
                    >
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-icons-round text-lg" aria-hidden>info</span>
                        <span className="text-xs font-medium">Data based on last 30 days of email activity</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Less</span>
                        <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="w-5 h-5 rounded-sm bg-slate-50 border border-slate-200" title="No activity" aria-hidden />
                          <div className="w-5 h-5 rounded-sm bg-blue-100" title="Low" aria-hidden />
                          <div className="w-5 h-5 rounded-sm bg-blue-300" title="Medium" aria-hidden />
                          <div className="w-5 h-5 rounded-sm bg-blue-500 shadow-sm" title="High" aria-hidden />
                          <div className="w-5 h-5 rounded-sm bg-blue-700 shadow-md" title="Very High" aria-hidden />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">More</span>
                      </div>
                    </div>
                  </div>

                  {/* Platform Distribution & Top Cities - deterministic data, no API */}
                  <div className="space-y-10" data-email-analytics-city-device-section>
                    <div
                      className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5"
                      data-platform-distribution
                    >
                      <div className="flex items-center justify-between mb-6" data-platform-distribution-header>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Platform Distribution</h3>
                        <button
                          type="button"
                          className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors cursor-pointer p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="More options"
                        >
                          <span className="material-icons-round text-[20px]">more_horiz</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">
                        <div className="flex items-center justify-between pr-0 md:pr-4" data-platform-distribution-device>
                          <div className="relative w-28 h-28 flex-shrink-0" data-platform-distribution-device-donut>
                            <div
                              className="w-full h-full rounded-full bg-transparent"
                              style={{
                                background: 'conic-gradient(#3B82F6 0% 55%, #10B981 55% 85%, #F59E0B 85% 100%)',
                                maskImage: 'radial-gradient(transparent 60%, black 61%)',
                                WebkitMaskImage: 'radial-gradient(transparent 60%, black 61%)',
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                              <span className="text-lg font-bold text-slate-900 dark:text-slate-50">82%</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mobile</span>
                            </div>
                          </div>
                          <div className="flex-1 ml-6 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-hidden />
                                <span className="text-slate-500 dark:text-slate-400">Mobile</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-50">55%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden />
                                <span className="text-slate-500 dark:text-slate-400">Desktop</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-50">30%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden />
                                <span className="text-slate-500 dark:text-slate-400">Tablet</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-50">15%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-6 md:pt-0 pl-0 md:pl-8" data-platform-distribution-browser>
                          <div className="relative w-28 h-28 flex-shrink-0" data-platform-distribution-browser-donut>
                            <div
                              className="w-full h-full rounded-full bg-transparent"
                              style={{
                                background: 'conic-gradient(#6366F1 0% 60%, #EC4899 60% 80%, #8B5CF6 80% 95%, #9CA3AF 95% 100%)',
                                maskImage: 'radial-gradient(transparent 60%, black 61%)',
                                WebkitMaskImage: 'radial-gradient(transparent 60%, black 61%)',
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                              <span className="text-lg font-bold text-slate-900 dark:text-slate-50">60%</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Chrome</span>
                            </div>
                          </div>
                          <div className="flex-1 ml-6 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" aria-hidden />
                                <span className="text-slate-500 dark:text-slate-400">Chrome</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-50">60%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-pink-500" aria-hidden />
                                <span className="text-slate-500 dark:text-slate-400">Safari</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-50">20%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-violet-500" aria-hidden />
                                <span className="text-slate-500 dark:text-slate-400">Firefox</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-50">15%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-slate-400" aria-hidden />
                                <span className="text-slate-500 dark:text-slate-400">Other</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-50">5%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                      data-top-cities
                    >
                      <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between" data-top-cities-header>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Top Cities</h2>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors cursor-pointer p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="More options"
                          >
                            <span className="material-icons-round text-[20px]">more_horiz</span>
                          </button>
                        </div>
                      </div>
                      <div className="p-5" data-top-cities-body>
                        <div className="space-y-6" data-top-cities-list>
                          {[
                            { city: 'New York', count: '12,402', widthPercent: 85, opacity: 100 },
                            { city: 'London', count: '8,140', widthPercent: 65, opacity: 80 },
                            { city: 'Berlin', count: '6,980', widthPercent: 50, opacity: 70 },
                            { city: 'Tokyo', count: '5,432', widthPercent: 40, opacity: 60 },
                            { city: 'Sydney', count: '2,120', widthPercent: 20, opacity: 50 },
                          ].map((row) => (
                            <div key={row.city} className="group" data-top-cities-row data-top-cities-city={row.city}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2.5">
                                  <span className="material-icons-round text-slate-500 dark:text-slate-400 text-[18px]" aria-hidden>location_on</span>
                                  <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{row.city}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{row.count}</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${row.widthPercent}%`, opacity: row.opacity / 100 }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email Health Monitoring + Performance by Mailbox - 1:1 reference, no API */}
                  <div className="space-y-10 mt-10" data-email-analytics-health-mailbox-section>
                    <div
                      className="relative w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/5 flex flex-col overflow-hidden"
                      data-email-health-monitoring
                    >
                      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50" data-email-health-monitoring-header>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight" data-email-health-monitoring-title>Email Health Monitoring</h3>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50" data-email-health-monitoring-badge>
                                <span className="material-icons-round text-[16px]">check_circle</span>
                                System Healthy
                              </span>
                              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" data-email-health-monitoring-live>
                                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                </span>
                                Live Updates
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" data-email-health-monitoring-subtitle>Real-time system diagnostics and core delivery metrics.</p>
                          </div>
                          <button type="button" className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 focus:outline-none transition-colors self-start sm:self-center p-1 rounded focus:ring-2 focus:ring-blue-500" aria-label="Close">
                            <span className="material-icons-round">close</span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50 px-6 pb-6" data-email-health-monitoring-metrics>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="flex flex-col gap-1" data-email-health-metric="failures">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">24h Failures</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">0</span>
                              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 rounded text-center h-fit">-</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 relative md:pl-6 md:border-l border-slate-100 dark:border-slate-800" data-email-health-metric="bounce">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bounce Rate</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">0.00%</span>
                              <span className="text-[10px] text-slate-400 font-medium">avg</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 relative md:pl-6 md:border-l border-slate-100 dark:border-slate-800" data-email-health-metric="complaint">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Complaint Rate</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">0.00%</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 relative md:pl-6 md:border-l border-slate-100 dark:border-slate-800" data-email-health-metric="sent">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Emails Sent</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">1,248</span>
                              <span className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 rounded h-fit">
                                <span className="material-icons-round text-[10px] mr-0.5">arrow_upward</span> 12%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/5 flex flex-col overflow-hidden" data-performance-by-mailbox>
                      <div className="h-px w-full bg-slate-100 dark:bg-slate-800" aria-hidden />
                      <div className="flex items-center justify-between px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30" data-performance-by-mailbox-header>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">Performance by Mailbox</h3>
                        <div className="flex items-center gap-3">
                          <button type="button" className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500" data-performance-by-mailbox-export>
                            <span className="material-icons-round text-[16px]">download</span>
                            Export
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto" data-performance-by-mailbox-table-wrap>
                        <table className="w-full text-left text-sm whitespace-nowrap" data-performance-by-mailbox-table>
                          <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-8 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]" scope="col">Mailbox Identity</th>
                              <th className="px-8 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] text-right" scope="col">Delivered</th>
                              <th className="px-8 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] w-1/4" scope="col">Open Rate</th>
                              <th className="px-8 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] w-1/4" scope="col">Click Rate</th>
                              <th className="px-8 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] text-right" scope="col">Bounce Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50" data-performance-by-mailbox-tbody>
                            {[
                              { initials: 'TW', email: 'tyquanwilkerson1118345@gmail.com', label: 'Primary Inbox', delivered: '842', openRate: 45.0, clickRate: 12.0, bounceRate: '0.0%', bounceVariant: 'emerald' as const },
                              { initials: 'SJ', email: 'sarah.j@corporate.co', label: 'Marketing', delivered: '1,029', openRate: 62.3, clickRate: 24.1, bounceRate: '0.2%', bounceVariant: 'slate' as const },
                              { initials: 'NS', email: 'noreply@service.io', label: 'Transactional', delivered: '4,500', openRate: 88.5, clickRate: 35.2, bounceRate: '0.1%', bounceVariant: 'slate' as const },
                              { initials: 'PD', email: 'product@updates.com', label: 'Newsletter', delivered: '892', openRate: 32.1, clickRate: 5.4, bounceRate: '1.2%', bounceVariant: 'amber' as const },
                            ].map((row, idx) => {
                              const avatarColors = ['from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30', 'from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30', 'from-orange-100 to-orange-50 dark:from-orange-900/40 dark:to-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30', 'from-pink-100 to-pink-50 dark:from-pink-900/40 dark:to-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900/30'][idx]
                              const bounceClasses = row.bounceVariant === 'emerald' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : row.bounceVariant === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              return (
                                <tr key={row.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer" data-performance-by-mailbox-row data-performance-by-mailbox-email={row.email}>
                                  <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${avatarColors} flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm border`} data-performance-by-mailbox-avatar>
                                        {row.initials}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-50 text-sm">{row.email}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.label}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-4 text-right">
                                    <span className="font-bold text-slate-900 dark:text-slate-50 font-display text-sm">{row.delivered}</span>
                                  </td>
                                  <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-medium text-slate-900 dark:text-slate-50 w-9 text-right">{row.openRate}%</span>
                                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden min-w-[80px]">
                                        <div className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]" style={{ width: `${row.openRate}%` }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-medium text-slate-900 dark:text-slate-50 w-9 text-right">{row.clickRate}%</span>
                                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden min-w-[80px]">
                                        <div className="h-full bg-indigo-400 rounded-full opacity-90" style={{ width: `${row.clickRate}%` }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-4 text-right">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${bounceClasses}`}>{row.bounceRate}</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between" data-performance-by-mailbox-footer>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4 flex-wrap">
                          <span data-performance-by-mailbox-summary>Showing <span className="font-bold text-slate-900 dark:text-slate-50">1-4</span> of <span className="font-bold text-slate-900 dark:text-slate-50">24</span> results</span>
                          <span className="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-1" aria-hidden />
                          <span data-performance-by-mailbox-node>Server Node: US-East-1a</span>
                        </div>
                        <div className="flex gap-2" data-performance-by-mailbox-pagination>
                          <button type="button" className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-white disabled:opacity-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            Previous
                          </button>
                          <button type="button" className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {subTab === 'ab-testing' && (
                <div data-email-analytics-ab-testing>
                  <ABTestingDashboard parentEmailId="" />
                </div>
              )}
              {subTab === 'campaign-performance' && (
                <div data-email-analytics-campaign-performance>
                  <CampaignPerformanceDashboard campaignId="" />
                </div>
              )}
              {subTab === 'template-performance' && (
                <div data-email-analytics-template-performance>
                  <TemplatePerformanceDashboard />
                </div>
              )}
              {subTab === 'comparative' && (
                <div data-email-analytics-comparative>
                  <ComparativeAnalyticsDashboard />
                </div>
              )}
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmailAnalyticsPage() {
  return (
    <DashboardLayout fullBleed hideHeader>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <EmailAnalyticsPageContent />
      </Suspense>
    </DashboardLayout>
  )
}
