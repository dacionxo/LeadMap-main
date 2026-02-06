"use client";

// #region agent log
const ACTIVE_DEALS_DEBUG_SOURCE = "LeadMap-main/app/dashboard/components/DashboardOverviewModern.tsx";
if (typeof fetch !== "undefined") {
  fetch("http://127.0.0.1:7242/ingest/a7565911-e087-4f8e-bc4b-5620fd981055", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "DashboardOverviewModern.tsx:module",
      message: "Module evaluated (which file is bundled)",
      data: { filePath: ACTIVE_DEALS_DEBUG_SOURCE, deployTarget: "vercel" },
      timestamp: Date.now(),
      sessionId: "debug-session",
      hypothesisId: "A",
    }),
  }).catch(() => {});
}
// #endregion

import { useApp } from "@/app/providers";
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  Briefcase,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  History,
  Home,
  Mail,
  Minus,
  MoreHorizontal,
  PieChart,
  PlusCircle,
  RefreshCw,
  Search,
  Settings2,
  Timer,
  TimerOff,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface WidgetData {
  "total-prospects"?: { value: number; change?: string; trend?: "up" | "down" | "neutral" };
  "active-listings"?: { value: number; change?: string; trend?: "up" | "down" | "neutral" };
  "avg-property-value"?: { value: string; change?: string; trend?: "up" | "down" | "neutral" };
  "expired-listings"?: { value: number; change?: string; trend?: "up" | "down" | "neutral" };
  "pipeline-value"?: { value: string; change?: string; trend?: "up" | "down" | "neutral" };
  "conversion-rate"?: { value: string; change?: string; trend?: "up" | "down" | "neutral" };
  "pipeline-funnel"?: {
    stages: {
      name: string;
      value: number;
      percentage: number;
      dealValue?: string;
      avgDaysInStage?: number;
    }[];
  };
  "deal-stage-distribution"?: {
    stages: { name: string; value: number; percentage: number }[];
  };
  "active-deals"?: { value: number; change?: string; trend?: "up" | "down" | "neutral" };
  "avg-deal-size"?: { value: string; change?: string; trend?: "up" | "down" | "neutral" };
  "recent-activity"?: Array<{
    id: string;
    title: string;
    description?: string;
    time?: string;
    type?: string;
  }>;
  "upcoming-tasks"?: Array<{
    id: string;
    title: string;
    due?: string;
    priority?: string;
    completed?: boolean;
  }>;
  "campaign-performance"?: {
    totalSent?: number;
    sentChange?: string;
    openRate?: string;
    openChange?: string;
    volume?: number[];
    highlight?: number;
  };
}

interface DashboardOverviewModernProps {
  widgetData: Record<string, unknown>;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
}

export default function DashboardOverviewModern({
  widgetData,
  loading = false,
  error = null,
  onRefresh,
  lastUpdated,
}: DashboardOverviewModernProps) {
  const { profile } = useApp();
  const data = widgetData as WidgetData;

  // #region agent log
  if (typeof fetch !== "undefined") {
    fetch("http://127.0.0.1:7242/ingest/a7565911-e087-4f8e-bc4b-5620fd981055", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "DashboardOverviewModern.tsx:mount",
        message: "DashboardOverviewModern mounted",
data: { filePath: ACTIVE_DEALS_DEBUG_SOURCE, deployTarget: "vercel" },
      timestamp: Date.now(),
      sessionId: "debug-session",
      hypothesisId: "B",
      }),
    }).catch(() => {});
  }
  // #endregion

  const totalProspects = data["total-prospects"]?.value ?? 1482;
  const activeListings = data["active-listings"]?.value ?? 56;
  const avgPropertyValue = data["avg-property-value"]?.value ?? "$845k";
  const expiredListings = data["expired-listings"]?.value ?? 3;

  const totalProspectsTrend = data["total-prospects"]?.trend ?? "up";
  const totalProspectsChange = data["total-prospects"]?.change ?? "+12%";
  const activeListingsChange = data["active-listings"]?.change ?? "+4%";
  const avgValueChange = data["avg-property-value"]?.change ?? "+2.1%";
  const expiredChange = data["expired-listings"]?.change ?? "-18%";
  const expiredTrend = data["expired-listings"]?.trend ?? "down";

  const pipelineValue = data["pipeline-value"]?.value ?? "$4.2M";
  const pipelineChange = data["pipeline-value"]?.change ?? "+12.5%";
  const conversionRate = data["conversion-rate"]?.value ?? "67%";
  const conversionChange = data["conversion-rate"]?.change ?? "+2.4%";
  const activeDeals = data["active-deals"]?.value ?? 142;
  const activeDealsChange = data["active-deals"]?.change ?? "0%";
  const activeDealsTrend = data["active-deals"]?.trend ?? "neutral";
  const avgDealSize = data["avg-deal-size"]?.value ?? "$32.5k";
  const avgDealSizeChange = data["avg-deal-size"]?.change ?? "+5.1%";

  const dealFunnelStages = data["pipeline-funnel"]?.stages ?? [
    { name: "New", value: 124, percentage: 100, avgDaysInStage: 1 },
    { name: "Contacted", value: 86, percentage: 69, avgDaysInStage: 3 },
    { name: "Qualified", value: 52, percentage: 42, avgDaysInStage: 5 },
    { name: "Proposal", value: 28, percentage: 22, avgDaysInStage: 7 },
    { name: "Negotiation", value: 15, percentage: 12, avgDaysInStage: 4 },
    { name: "Closed", value: 9, percentage: 7, avgDaysInStage: 12 },
  ];

  const funnelBarWidths = ["100%", "90%", "80%", "70%", "60%", "50%"];
  const funnelStageStyles = [
    {
      bar: "bg-blue-500/20 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800 hover:bg-blue-500/30 dark:hover:bg-blue-500/20",
      fill: "bg-blue-500/40 dark:bg-blue-500/30",
      text: "text-blue-600 dark:text-blue-400",
      legend: "bg-blue-500/40",
    },
    {
      bar: "bg-indigo-500/20 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-500/30 dark:hover:bg-indigo-500/20",
      fill: "bg-indigo-500/40 dark:bg-indigo-500/30",
      text: "text-indigo-600 dark:text-indigo-400",
      legend: "bg-indigo-500/40",
    },
    {
      bar: "bg-purple-500/20 dark:bg-purple-500/10 border-purple-200 dark:border-purple-800 hover:bg-purple-500/30 dark:hover:bg-purple-500/20",
      fill: "bg-purple-500/40 dark:bg-purple-500/30",
      text: "text-purple-600 dark:text-purple-400",
      legend: "bg-purple-500/40",
    },
    {
      bar: "bg-amber-500/20 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800 hover:bg-amber-500/30 dark:hover:bg-amber-500/20",
      fill: "bg-amber-500/40 dark:bg-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      legend: "bg-amber-500/40",
    },
    {
      bar: "bg-orange-500/20 dark:bg-orange-500/10 border-orange-200 dark:border-orange-800 hover:bg-orange-500/30 dark:hover:bg-orange-500/20",
      fill: "bg-orange-500/40 dark:bg-orange-500/30",
      text: "text-orange-600 dark:text-orange-400",
      legend: "bg-orange-500/40",
    },
    {
      bar: "bg-emerald-500/20 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/30 dark:hover:bg-emerald-500/20",
      fill: "bg-emerald-500/40 dark:bg-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      legend: "bg-emerald-500/40",
    },
  ];

  const stageDist = data["deal-stage-distribution"]?.stages ?? [
    { name: "New", value: 245, percentage: 100 },
    { name: "Contacted", value: 180, percentage: 73 },
    { name: "Qualified", value: 98, percentage: 40 },
    { name: "Proposal", value: 45, percentage: 18 },
    { name: "Closed", value: 28, percentage: 11 },
  ];


  const notifications = (data["recent-activity"] ?? []) as Array<{
    id: string;
    title: string;
    description?: string;
    time?: string;
  }>;
  const defaultNotifications = [
    { id: "1", title: "New lead added", description: "Sarah Jenkins was assigned to you.", time: "10 min ago" },
    { id: "2", title: "Meeting confirmed", description: "Product demo with TechCorp.", time: "1 hour ago" },
    { id: "3", title: "Task overdue", description: "Follow up with Mike regarding contract.", time: "2 hours ago" },
  ];
  const displayNotifications =
    notifications.length >= 3 ? notifications.slice(0, 3) : defaultNotifications;

  const tasks = (data["upcoming-tasks"] ?? []) as Array<{
    id: string;
    title: string;
    due?: string;
    completed?: boolean;
  }>;
  const defaultTasks = [
    { id: "t1", title: "Call John Doe", completed: false },
    { id: "t2", title: "Send contract draft", completed: true },
    { id: "t3", title: "Update listing photos", completed: false },
    { id: "t4", title: "Weekly team sync", completed: false },
  ];
  const displayTasks = tasks.length > 0 ? tasks : defaultTasks;

  const pendingTasksCount = displayTasks.filter(
    (t) => !(t as { completed?: boolean }).completed
  ).length;
  const taskCompletionPercent = displayTasks.length
    ? Math.min(
        100,
        Math.round(
          ((displayTasks.length - pendingTasksCount) / displayTasks.length) * 100
        )
      )
    : 0;

  const campaignPerformance = data["campaign-performance"] ?? {};
  const campaignMetrics = {
    totalSent:
      typeof campaignPerformance.totalSent === "number"
        ? campaignPerformance.totalSent
        : Number(campaignPerformance.totalSent) || 1245,
    sentChange: campaignPerformance.sentChange ?? "+12%",
    openRate: campaignPerformance.openRate ?? "68.4%",
    openChange: campaignPerformance.openChange ?? "+5%",
    volume: campaignPerformance.volume ?? [30, 25, 40, 20, 35, 10, 5],
    highlight: campaignPerformance.highlight ?? 94,
  };

  const lastUpdatedLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`
    : "UPDATED JUST NOW";

  const userName = profile?.name ?? "Alex Rivera";
  const activeListingsCount = activeListings;
  const prospectInteractions = totalProspects;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner - SaaS style */}
      <div className="dashboard-welcome-card relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] p-10 sm:p-14 lg:p-16 transition-all duration-500">
        <div className="organic-wave" aria-hidden="true" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-100/30 dark:bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-start gap-10">
          <div className="space-y-6 max-w-3xl">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-[1.1]">
              <span
                className="welcome-typing"
                style={
                  {
                    "--welcome-chars": `${"Welcome Back, ".length + userName.length}ch`,
                    "--welcome-steps": String("Welcome Back, ".length + userName.length),
                  } as React.CSSProperties
                }
              >
                Welcome Back, <span className="text-primary">{userName}</span>
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 font-normal leading-relaxed">
              Here&apos;s what&apos;s happening with your projects today. You
              have{" "}
              <span className="font-semibold text-gray-900 dark:text-white border-b-2 border-primary/20">
                {activeListingsCount} Active Listings
              </span>
              ,{" "}
              <span className="font-semibold text-gray-900 dark:text-white border-b-2 border-primary/20">
                {prospectInteractions} prospect interactions
              </span>
              , and{" "}
              <span className="font-semibold text-gray-900 dark:text-white border-b-2 border-primary/20">
                {avgPropertyValue} in Average Deal Value
              </span>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/prospect-enrich"
              className="group inline-flex items-center justify-center px-10 py-4 bg-primary hover:bg-primary-hover text-white text-base font-semibold rounded-full shadow-lg shadow-primary/25 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl focus:ring-4 focus:ring-primary/20"
            >
              View Listings
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="hidden sm:flex items-center px-4 py-2 bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
              Live Update
            </div>
          </div>
        </div>
        <div
          className="absolute top-1/2 -right-4 translate-y-[-50%] opacity-[0.04] dark:opacity-[0.06] pointer-events-none select-none"
          aria-hidden="true"
        >
          <svg
            height="400"
            viewBox="0 0 200 200"
            width="400"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C86.9,14.5,81.2,29,72.4,41.9C63.6,54.8,51.7,66.1,38,72.9C24.3,79.7,8.7,82,-5.8,82.1C-20.3,82.2,-33.7,80.1,-46.8,73.1C-59.9,66.1,-72.7,54.3,-79.7,40.1C-86.7,25.9,-87.9,9.4,-85.4,-6.2C-82.9,-21.8,-76.6,-36.5,-67.1,-48.8C-57.5,-61.2,-44.6,-71.2,-31,-78.6C-17.4,-86,17.4,-83.6,44.7,-76.4Z"
              fill="currentColor"
              className="text-primary"
              transform="translate(100 100)"
            />
          </svg>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Prospecting Overview - same border/shadow as welcome card */}
      <div>
        <div className="dashboard-welcome-card relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] p-5 sm:p-6 lg:p-7 transition-all duration-500">
          <div className="organic-wave" aria-hidden="true" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Prospecting Overview
                </h2>
                <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Your high-level pipeline metrics for today.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  href="/dashboard/prospect-enrich"
                  className="text-xs sm:text-sm text-primary font-medium hover:underline"
                >
                  View All
                </Link>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                  Updated Just Now
                </span>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary transition-all shadow-sm hover:shadow-md active:scale-95"
                  aria-label="Filter prospecting metrics"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SavedProspectsCard
                value={totalProspects.toLocaleString()}
                change={totalProspectsChange}
                trend={totalProspectsTrend}
              />
              <ActiveListingsCard
                value={String(activeListings)}
                change={activeListingsChange}
                trend="up"
              />
              <AvgPropertyValueCard
                value={avgPropertyValue}
                change={avgValueChange}
              />
              <ExpiredListingsCard
                value={String(expiredListings)}
                change={expiredChange}
                trend={expiredTrend}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Health: Pipeline Value only (Conversion Rate, Active Deals, Deal Size moved into Deal Analytics) */}
      <div className="grid grid-cols-1 gap-6 max-w-7xl mx-auto items-start">
        <PipelineValueCard totalValue={pipelineValue} />
      </div>

      {/* Stage Distribution - wide horizontal bar (1:1 with reference design) */}
      <StageDistributionCard stages={stageDist} />

      {/* Deal Analytics - Sleek Single-Card */}
      <div className="dashboard-welcome-card relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] p-6 md:p-10 transition-all duration-500">
        <div className="organic-wave" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Deal Analytics
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Real-time pipeline performance and forecasts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-full shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide uppercase">
                  Live Update
                </span>
              </div>
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 dark:border-gray-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 shadow-sm"
                aria-label="Filter analytics"
              >
                <Settings2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <DealMetricCard
              icon={DollarSign}
              iconBg="bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              value={pipelineValue}
              label="Pipeline Value"
              change={pipelineChange}
              trend="up"
            />
            {/* Conversion Rate: new component design in same-sized metric slot (replaces old DealMetricCard) */}
            <ConversionRateMetricCard
              conversionRate={conversionRate}
              change={conversionChange}
              trend="up"
            />
            {/* Active Deals: new component design in same-sized metric slot (replaces old DealMetricCard) */}
            <ActiveDealsMetricCard
              count={activeDeals}
              changeLabel={`${activeDealsChange} vs last month`}
              trend={activeDealsTrend}
            />
            {/* Deal Size: new component design in same-sized metric slot (replaces old DealMetricCard) */}
            <DealSizeMetricCard
              value={avgDealSize}
              changeLabel={`${avgDealSizeChange} vs last month`}
            />
          </div>
          <div className="py-2.5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pipeline Funnel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sales performance overview
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex items-center px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export
                </button>
                <button
                  type="button"
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-2.5 w-full">
              {dealFunnelStages.map((stage, i) => {
                const style = funnelStageStyles[i] || funnelStageStyles[0];
                const barWidth = funnelBarWidths[i] || "100%";
                const avgDays =
                  "avgDaysInStage" in stage && typeof (stage as { avgDaysInStage?: number }).avgDaysInStage === "number"
                    ? (stage as { avgDaysInStage: number }).avgDaysInStage
                    : i + 1;
                return (
                  <div
                    key={stage.name}
                    className="w-full flex flex-col items-center group cursor-pointer"
                  >
                    <div
                      className="w-full flex justify-between items-end mb-0.5 px-4"
                      style={{ maxWidth: barWidth }}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {stage.name} ({stage.value})
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Avg. {avgDays}d in stage
                        </span>
                      </div>
                      <span
                        className={`text-xs font-medium ${style.text} opacity-0 group-hover:opacity-100 transition-opacity`}
                      >
                        {stage.percentage}%
                      </span>
                    </div>
                    <div
                      className={`relative w-full h-10 rounded-lg funnel-bar-welcome ${style.bar} transition-all duration-300`}
                      style={{ width: barWidth }}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 ${style.fill} rounded-l-lg`}
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-gray-800 pt-4">
              {funnelStageStyles.map((s, i) => (
                <div key={dealFunnelStages[i]?.name ?? i} className="flex items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${s.legend} mr-1.5`}
                    aria-hidden
                  />
                  {dealFunnelStages[i]?.name ?? "Stage"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="dashboard-welcome-card relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] transition-all duration-500">
          <div className="organic-wave" aria-hidden="true" />
          <div className="relative z-10">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Activity
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Your high-level metrics and updates for today.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <Link
                href="/dashboard/activity"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View All
              </Link>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
                <span className="text-[11px] text-gray-600 dark:text-gray-300 font-semibold mr-2 tracking-wide">
                  {lastUpdatedLabel.toUpperCase()}
                </span>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="text-gray-500 dark:text-gray-300 hover:text-primary transition-colors disabled:opacity-50"
                    title="Refresh activity"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                )}
              </div>
              <button
                className="p-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-300 transition-colors"
                aria-label="Customize activity preferences"
                title="Customize activity preferences"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-800">
            {/* Notifications - 1:1 with Modern CRM Notifications (timeline, dot colors, min-height) */}
            <div className="relative overflow-hidden p-8 flex flex-col justify-between min-h-[580px] lg:min-h-[520px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-50/50 dark:bg-indigo-900/20 blur-[80px] rounded-full pointer-events-none z-0" aria-hidden />
              <div className="flex items-center justify-between mb-8 z-10 relative">
                <h2 className="text-xl font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Notifications
                </h2>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 text-slate-500 dark:text-slate-400 transition-colors"
                  aria-label="Notification actions"
                  title="Notification actions"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="notifications-timeline flex flex-col flex-grow relative z-10 space-y-0">
                {displayNotifications.map((n, idx) => {
                  const dotBorder =
                    ["border-blue-500", "border-green-500", "border-slate-400 dark:border-slate-500", "border-blue-500", "border-green-500"][idx % 5] ??
                    "border-blue-500";
                  const isLast = idx === displayNotifications.length - 1;
                  return (
                    <div
                      key={n.id ?? idx}
                      className={`notifications-timeline-item flex gap-4 relative ${isLast ? "" : "pb-8"}`}
                    >
                      <div className="notifications-timeline-line relative flex-shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-[3px] ${dotBorder} shadow-sm z-10 relative`}
                        />
                      </div>
                      <div className="flex-grow pt-0.5 min-w-0">
                        <div className="flex justify-between items-start mb-0.5 gap-2">
                          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {n.title}
                          </h3>
                          {n.time && (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap flex-shrink-0">
                              {n.time}
                            </span>
                          )}
                        </div>
                        {n.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal">
                            {n.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center pt-6 border-t border-gray-100 dark:border-gray-800 mt-auto">
                <Link
                  href="/dashboard/notifications"
                  className="group flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  View all notifications
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="p-6 bg-gray-50/60 dark:bg-gray-800/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pending Tasks
                </h3>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingTasksCount} Left
                  </span>
                  <Link
                    href="/dashboard/tasks"
                    className="text-gray-500 dark:text-gray-400 hover:text-primary transition"
                    aria-label="Add new task"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="mb-5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Daily Goal
                  </span>
                  <span className="text-gray-900 dark:text-white font-bold">
                    {taskCompletionPercent}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${taskCompletionPercent}%` }}
                  />
                </div>
              </div>
              <div className="space-y-3 dashboard-overview-scrollbar max-h-[260px] overflow-y-auto pr-1">
                {displayTasks.map((t) => {
                  const completed = !!(t as { completed?: boolean }).completed;
                  const meta =
                    (t as { due?: string; priority?: string }).due ||
                    (t as { priority?: string }).priority;
                  const isOverdue = meta?.toLowerCase() === "overdue";
                  return (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 group cursor-pointer p-2 -mx-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors ${
                        completed ? "opacity-70" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        defaultChecked={completed}
                        className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-primary focus:ring-primary mt-0.5"
                      />
                      <div className="flex-1">
                        <span
                          className={`text-sm font-medium block ${
                            completed
                              ? "text-gray-400 dark:text-gray-500 line-through"
                              : "text-gray-900 dark:text-white group-hover:text-primary transition-colors"
                          }`}
                        >
                          {t.title}
                        </span>
                        {meta ? (
                          <span
                            className={`text-xs ${
                              isOverdue
                                ? "text-red-500 font-semibold"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {isOverdue ? "Overdue" : meta}
                          </span>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Active Campaigns - 1:1 with reference (metric cards, Activity Volume bar chart, min-height 520px) */}
            <div className="p-8 flex flex-col gap-8 min-h-[520px] relative overflow-hidden">
              <div className="flex items-start justify-between z-10 relative">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Active Campaigns</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Email performance summary</p>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                  aria-label="Campaign options"
                  title="Campaign options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 z-10 relative">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 transition-all hover:shadow-md">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Sent</p>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter">
                      {campaignMetrics.totalSent.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 self-start px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{campaignMetrics.sentChange}</span>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 transition-all hover:shadow-md">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Open Rate</p>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter">
                      {campaignMetrics.openRate}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 self-start px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{campaignMetrics.openChange}</span>
                  </div>
                </div>
              </div>

              <div className="flex-grow flex flex-col pt-2 z-10 relative">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Activity Volume</h3>
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-colors px-3 py-1.5 rounded-full flex items-center gap-1"
                  >
                    Last 7 Days
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="relative w-full h-40 flex items-end justify-between px-2 gap-2">
                  {/* Dashed horizontal grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0">
                    <div className="border-t border-dashed border-slate-100 dark:border-slate-700 w-full h-px" />
                    <div className="border-t border-dashed border-slate-100 dark:border-slate-700 w-full h-px" />
                    <div className="border-t border-dashed border-slate-100 dark:border-slate-700 w-full h-px" />
                    <div className="border-t border-dashed border-slate-100 dark:border-slate-700 w-full h-px" />
                  </div>
                  {(() => {
                    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                    const vol = campaignMetrics.volume?.length === 7
                      ? campaignMetrics.volume
                      : [30, 45, 35, 55, 75, 60, 40];
                    const highlightIdx = 4;
                    return days.map((day, i) => {
                      const pct = Math.min(100, Math.max(0, vol[i] ?? 0));
                      const isHighlight = i === highlightIdx;
                      return (
                        <div key={day} className="group relative w-full h-full flex items-end flex-1 min-w-0">
                          <div
                            className={`w-full rounded-t-md transition-all origin-bottom flex-shrink-0 ${
                              isHighlight
                                ? "bar-gradient shadow-lg shadow-blue-500/20 hover:scale-y-105"
                                : i === 3
                                  ? "bg-blue-100 dark:bg-blue-900/40 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60"
                                  : i === 5
                                    ? "bg-blue-200 dark:bg-blue-800/50 group-hover:bg-blue-300 dark:group-hover:bg-blue-700/50"
                                    : "bg-slate-200 dark:bg-slate-600 opacity-50 group-hover:bg-blue-500/30 group-hover:opacity-70"
                            }`}
                            style={{ height: `${pct}%` }}
                          >
                            {isHighlight && (
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded flex flex-col items-center whitespace-nowrap z-20">
                                {campaignMetrics.highlight}
                                <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-800 rotate-45 absolute -bottom-0.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between px-2 mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="w-full text-center">Mon</span>
                  <span className="w-full text-center">Tue</span>
                  <span className="w-full text-center">Wed</span>
                  <span className="w-full text-center">Thu</span>
                  <span className="w-full text-center text-blue-600 dark:text-blue-400 font-bold">Fri</span>
                  <span className="w-full text-center">Sat</span>
                  <span className="w-full text-center">Sun</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-300 flex items-center justify-center text-xs text-white font-medium">
                  JD
                </div>
                <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-purple-400 flex items-center justify-center text-xs text-white font-medium">
                  AK
                </div>
                <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-blue-400 flex items-center justify-center text-xs text-white font-medium">
                  MR
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">3 users active now</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/dashboard/map"
                className="flex-1 sm:flex-none text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2"
              >
                Manage Listings
              </Link>
              <Link
                href="/dashboard/engage"
                className="flex-1 sm:flex-none text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                Review All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

interface DealMetricCardProps {
  icon: React.ElementType;
  iconBg: string;
  value: string;
  label: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

function DealMetricCard({
  icon: Icon,
  iconBg,
  value,
  label,
  change,
  trend,
}: DealMetricCardProps) {
  const isNeutral = trend === "neutral";
  return (
    <div className="group bg-white dark:bg-gray-700/40 p-5 rounded-2xl border border-slate-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <div
          className={
            isNeutral
              ? "flex items-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-100 dark:border-slate-600"
              : "flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-100 dark:border-emerald-500/20"
          }
        >
          {isNeutral ? (
            <Minus className="w-3.5 h-3.5 mr-0.5" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
          )}
          {change}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </h3>
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}

/* Conversion Rate metric card - same size as DealMetricCard, new Conversion Funnel design (replaces old in Deal Analytics grid) */
interface ConversionRateMetricCardProps {
  conversionRate: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

function ConversionRateMetricCard({
  conversionRate,
  change,
  trend,
}: ConversionRateMetricCardProps) {
  const displayRate = conversionRate?.replace(/%/g, "").trim() || "67";
  const isUp = trend === "up";
  const isDown = trend === "down";
  const isNeutral = trend === "neutral";
  const trendPillClass = isDown
    ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20"
    : isUp
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
      : "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600";

  return (
    <div className="group bg-white dark:bg-gray-700/40 p-5 rounded-2xl border border-slate-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Zap className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className={`flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${trendPillClass}`}>
          {isDown && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
          {isUp && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
          {isNeutral && <Minus className="w-3.5 h-3.5 mr-0.5" />}
          {change}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
        {displayRate}%
      </h3>
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
        Conversion Rate
      </p>
    </div>
  );
}

/* Active Deals metric card - same size as DealMetricCard, new Active Deals design (replaces old in Deal Analytics grid) */
interface ActiveDealsMetricCardProps {
  count: number;
  changeLabel: string;
  trend: "up" | "down" | "neutral";
}

function ActiveDealsMetricCard({
  count,
  changeLabel,
  trend,
}: ActiveDealsMetricCardProps) {
  const isUp = trend === "up";
  const isDown = trend === "down";
  const trendPillClass = isDown
    ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20"
    : isUp
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
      : "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600";

  return (
    <div className="group bg-white dark:bg-gray-700/40 p-5 rounded-2xl border border-slate-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
          <Briefcase className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className={`flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${trendPillClass}`}>
          {isDown ? (
            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
          ) : isUp ? (
            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
          ) : (
            <Minus className="w-3.5 h-3.5 mr-0.5" />
          )}
          {changeLabel}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
        {count}
      </h3>
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
        Active Deals
      </p>
    </div>
  );
}

/* Deal Size (Avg Deal Size) metric card - same size as DealMetricCard, new Deal Size design (replaces old in Deal Analytics grid) */
interface DealSizeMetricCardProps {
  value: string;
  changeLabel: string;
}

function DealSizeMetricCard({ value, changeLabel }: DealSizeMetricCardProps) {
  const isUp = changeLabel.startsWith("+");
  const isDown = changeLabel.startsWith("-");
  const trendPillClass = isDown
    ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20"
    : isUp
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
      : "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600";

  return (
    <div className="group bg-white dark:bg-gray-700/40 p-5 rounded-2xl border border-slate-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
          <DollarSign className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className={`flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${trendPillClass}`}>
          {isDown && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
          {isUp && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
          {!isUp && !isDown && <Minus className="w-3.5 h-3.5 mr-0.5" />}
          {changeLabel}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
        {value?.trim() || "$32.5k"}
      </h3>
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
        Avg Deal Size
      </p>
    </div>
  );
}

interface SavedProspectsCardProps {
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

function SavedProspectsCard({ value, change, trend }: SavedProspectsCardProps) {
  const isDown = trend === "down";
  const monthlyGoalPercent = 81;
  return (
    <div
      className="group relative overflow-hidden bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      role="article"
      aria-label={`Saved Prospects: ${value}`}
    >
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary opacity-[0.03] dark:opacity-[0.05] rounded-full blur-3xl pointer-events-none" aria-hidden />
      <div className="relative z-10 p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg">
              <UserPlus className="h-4 w-4 text-primary" strokeWidth={2} />
            </span>
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Saved Prospects
            </h2>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-end justify-between gap-2 py-1">
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">
              {value}
            </div>
            <div className="flex items-center text-[10px] font-medium">
              {isDown ? (
                <span className="text-rose-500 dark:text-rose-400 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  {change}
                </span>
              ) : (
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  {change}
                </span>
              )}
              <span className="ml-1 text-slate-500 dark:text-slate-400 font-normal">
                vs last month
              </span>
            </div>
          </div>
          <div className="h-8 w-14 flex-shrink-0 text-primary">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50">
              <defs>
                <linearGradient id="saved-prospects-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path
                className="opacity-50 dark:opacity-30 text-primary"
                d="M0 45 L10 40 L25 42 L40 25 L55 30 L70 15 L85 20 L100 5 V50 H0 Z"
                fill="url(#saved-prospects-gradient)"
              />
              <path
                className="sparkline-draw"
                d="M0 45 L10 40 L25 42 L40 25 L55 30 L70 15 L85 20 L100 5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[9px] mb-0.5 text-slate-500 dark:text-slate-400">
            <span>Monthly Goal</span>
            <span>{monthlyGoalPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-500"
              style={{ width: `${monthlyGoalPercent}%` }}
            />
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 -mx-4 -mb-4 px-4 pb-3 rounded-b-2xl flex justify-between items-center">
          <div className="flex -space-x-1.5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-50 dark:ring-slate-900 bg-indigo-200 dark:bg-indigo-800"
                aria-hidden
              />
            ))}
            <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-slate-50 dark:ring-slate-900 bg-gray-200 dark:bg-gray-600 text-[8px] font-medium text-gray-500 dark:text-gray-400">
              +5
            </div>
          </div>
          <Link
            href="/dashboard/prospect-enrich"
            className="inline-flex items-center text-[10px] font-medium text-primary hover:text-primary-hover dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            View All
            <ArrowRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface ActiveListingsCardProps {
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

function ActiveListingsCard({ value, change, trend }: ActiveListingsCardProps) {
  const isDown = trend === "down";
  const listingCapacityPercent = 85;
  return (
    <div
      className="group relative overflow-hidden bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      role="article"
      aria-label={`Active Listings: ${value}`}
    >
      {/* Credit card in background - retained per user request */}
      <div
        className="absolute -right-3 -bottom-3 opacity-[0.025] group-hover:opacity-[0.04] transition-opacity duration-700 pointer-events-none"
        aria-hidden
      >
        <CreditCard className="h-28 w-28 text-slate-900 dark:text-white" strokeWidth={1} />
      </div>
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary opacity-[0.03] dark:opacity-[0.05] rounded-full blur-3xl pointer-events-none" aria-hidden />
      <div className="relative z-10 p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg">
              <Home className="h-4 w-4 text-primary" strokeWidth={2} />
            </span>
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Listings
            </h2>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-end justify-between gap-2 py-1">
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">
              {value}
            </div>
            <div className="flex items-center text-[10px] font-medium">
              {isDown ? (
                <span className="text-rose-500 dark:text-rose-400 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  {change}
                </span>
              ) : (
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  {change}
                </span>
              )}
              <span className="ml-1 text-slate-500 dark:text-slate-400 font-normal">
                vs last week
              </span>
            </div>
          </div>
          <div className="h-8 w-14 flex-shrink-0 text-blue-500">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50">
              <defs>
                <linearGradient id="active-listings-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path
                className="opacity-50 dark:opacity-30"
                d="M0 35 L15 38 L30 25 L45 32 L60 20 L75 25 L90 10 L100 15 V50 H0 Z"
                fill="url(#active-listings-gradient)"
              />
              <path
                className="sparkline-draw"
                d="M0 35 L15 38 L30 25 L45 32 L60 20 L75 25 L90 10 L100 15"
                fill="none"
                stroke="#3b82f6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[9px] mb-0.5 text-slate-500 dark:text-slate-400">
            <span>Listing Capacity</span>
            <span>{listingCapacityPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-500"
              style={{ width: `${listingCapacityPercent}%` }}
            />
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 -mx-4 -mb-4 px-4 pb-3 rounded-b-2xl flex justify-between items-center">
          <div className="flex -space-x-1.5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-50 dark:ring-slate-900 bg-indigo-200 dark:bg-indigo-800"
                aria-hidden
              />
            ))}
            <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-slate-50 dark:ring-slate-900 bg-gray-200 dark:bg-gray-600 text-[8px] font-medium text-gray-500 dark:text-gray-400">
              +5
            </div>
          </div>
          <Link
            href="/dashboard/prospect-enrich"
            className="inline-flex items-center text-[10px] font-medium text-primary hover:text-primary-hover dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            Manage Listings
            <ArrowRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface AvgPropertyValueCardProps {
  value: string;
  change?: string;
}

function AvgPropertyValueCard({ value }: AvgPropertyValueCardProps) {
  const avgDaysOnMarket = 12;
  return (
    <div
      className="group relative overflow-hidden bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      role="article"
      aria-label={`Avg Property Value: ${value}`}
    >
      {/* Credit card icon in background - retained per user request */}
      <div
        className="absolute -right-3 -bottom-3 opacity-[0.025] group-hover:opacity-[0.04] transition-opacity duration-700 pointer-events-none"
        aria-hidden
      >
        <CreditCard className="h-28 w-28 text-slate-900 dark:text-white" strokeWidth={1} />
      </div>
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary opacity-[0.03] dark:opacity-[0.05] rounded-full blur-3xl pointer-events-none" aria-hidden />
      <div className="relative z-10 p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg">
              <Home className="h-4 w-4 text-primary" strokeWidth={2} />
            </span>
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Average Listing Price
            </h2>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-end justify-between gap-2 py-1">
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {value}
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
              Avg. Days on Market: {avgDaysOnMarket}
            </span>
          </div>
          <div className="h-10 w-14 flex items-end justify-between gap-0.5 flex-shrink-0 pb-0.5">
            <div className="relative w-1/3 h-full flex items-end group/bar">
              <div className="w-full bg-indigo-300 dark:bg-indigo-700/60 rounded-t-sm h-[60%] transition-all duration-300 hover:bg-indigo-400 dark:hover:bg-indigo-600" />
            </div>
            <div className="relative w-1/3 h-full flex items-end group/bar">
              <div className="w-full bg-primary dark:bg-primary-hover rounded-t-sm h-full shadow-sm transition-all duration-300 hover:opacity-90" />
            </div>
            <div className="relative w-1/3 h-full flex items-end group/bar">
              <div className="w-full bg-indigo-400 dark:bg-indigo-600 rounded-t-sm h-[80%] transition-all duration-300 hover:bg-indigo-500 dark:hover:bg-indigo-500" />
            </div>
          </div>
        </div>
        {/* Footer - same as Saved Prospects card */}
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 -mx-4 -mb-4 px-4 pb-3 rounded-b-2xl flex justify-between items-center">
          <div className="flex -space-x-1.5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-50 dark:ring-slate-900 bg-indigo-200 dark:bg-indigo-800"
                aria-hidden
              />
            ))}
            <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-slate-50 dark:ring-slate-900 bg-gray-200 dark:bg-gray-600 text-[8px] font-medium text-gray-500 dark:text-gray-400">
              +5
            </div>
          </div>
          <Link
            href="/dashboard/prospect-enrich"
            className="inline-flex items-center text-[10px] font-medium text-primary hover:text-primary-hover dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            View Listings
            <ArrowRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface ExpiredListingsCardProps {
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

function ExpiredListingsCard({ value, change, trend }: ExpiredListingsCardProps) {
  const isDown = trend === "down";
  const relistRatePercent = 45;
  return (
    <div
      className="group relative overflow-hidden bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      role="article"
      aria-label={`Expired Listings: ${value}`}
    >
      {/* Credit card in background - retained per user request */}
      <div
        className="absolute -right-3 -bottom-3 opacity-[0.025] group-hover:opacity-[0.04] transition-opacity duration-700 pointer-events-none"
        aria-hidden
      >
        <CreditCard className="h-28 w-28 text-slate-900 dark:text-white" strokeWidth={1} />
      </div>
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-rose-500 opacity-[0.03] dark:opacity-[0.05] rounded-full blur-3xl pointer-events-none" aria-hidden />
      <div className="relative z-10 p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <span className="bg-rose-100 dark:bg-rose-900/30 p-1.5 rounded-lg">
              <AlertCircle className="h-4 w-4 text-rose-500" strokeWidth={2} />
            </span>
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Expired Listings
            </h2>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-end justify-between gap-2 py-1">
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">
              {value}
            </div>
            <div className="flex items-center text-[10px] font-medium">
              {isDown ? (
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  {change}
                </span>
              ) : (
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  {change}
                </span>
              )}
              <span className="ml-1 text-slate-500 dark:text-slate-400 font-normal">
                vs last month
              </span>
            </div>
          </div>
          <div className="h-8 w-14 flex-shrink-0">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50">
              <defs>
                <linearGradient id="expired-listings-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path
                className="opacity-50 dark:opacity-30"
                d="M0 25 L15 30 L30 15 L45 20 L60 10 L75 18 L90 5 L100 12 V50 H0 Z"
                fill="url(#expired-listings-gradient)"
              />
              <path
                className="sparkline-draw"
                d="M0 25 L15 30 L30 15 L45 20 L60 10 L75 18 L90 5 L100 12"
                fill="none"
                stroke="#f43f5e"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[9px] mb-0.5 text-slate-500 dark:text-slate-400">
            <span>Re-list Rate</span>
            <span>{relistRatePercent}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
            <div
              className="bg-rose-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${relistRatePercent}%` }}
            />
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 -mx-4 -mb-4 px-4 pb-3 rounded-b-2xl flex justify-between items-center">
          <div className="flex -space-x-1.5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-50 dark:ring-slate-900 bg-rose-200 dark:bg-rose-800"
                aria-hidden
              />
            ))}
            <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-slate-50 dark:ring-slate-900 bg-gray-200 dark:bg-gray-600 text-[8px] font-medium text-gray-500 dark:text-gray-400">
              +2
            </div>
          </div>
          <Link
            href="/dashboard/prospect-enrich"
            className="inline-flex items-center text-[10px] font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
          >
            Review All
            <ArrowRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface ProspectMetricCardProps {
  icon: React.ElementType;
  value: string;
  label: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

function ProspectMetricCard({
  icon: Icon,
  value,
  label,
  change,
  trend,
}: ProspectMetricCardProps) {
  const isDown = trend === "down";
  return (
    <div
      className="group relative overflow-hidden bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      role="article"
      aria-label={`${label}: ${value}`}
    >
      {/* Faint background icon */}
      <div
        className="absolute -right-3 -bottom-3 opacity-[0.025] group-hover:opacity-[0.04] transition-opacity duration-700 pointer-events-none"
        aria-hidden
      >
        <Icon className="h-28 w-28 text-slate-900 dark:text-white" strokeWidth={1} />
      </div>
      <div className="relative z-10 flex flex-col justify-between min-h-[117px]">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
        <div className="mt-2">
          <div className="pb-1.5 mb-1.5 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center mb-0.5">
              <span
                className={`inline-flex items-center text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isDown
                    ? "text-rose-500 bg-rose-100/60 dark:bg-rose-900/20"
                    : "text-emerald-600 bg-emerald-100/60 dark:bg-emerald-900/20 dark:text-emerald-400"
                }`}
              >
                {isDown ? (
                  <TrendingDown className="h-2.5 w-2.5 mr-0.5 font-bold" />
                ) : (
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5 font-bold" />
                )}
                {change}
              </span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
              {value}
            </h3>
          </div>
          <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Conversion Funnel card - Pipeline Health (1:1 with reference design, retains min-height 520px, max-w-md) */
interface ConversionFunnelCardProps {
  conversionRate: string;
  monthlyTargetPercent: number;
}

function ConversionFunnelCard({
  conversionRate,
  monthlyTargetPercent,
}: ConversionFunnelCardProps) {
  const displayRate =
    conversionRate?.replace(/%/g, "").trim() || "3.4";
  return (
    <div
      className="glass-panel w-full max-w-md bg-white dark:bg-slate-900/60 rounded-[2rem] shadow-card-pop border border-gray-100 dark:border-slate-700/40 p-10 transition-all duration-300 relative overflow-hidden z-10 flex flex-col justify-between min-h-[520px]"
      style={{ minHeight: "520px" }}
    >
      <div
        className="absolute inset-0 bg-mesh-gradient dark:bg-mesh-dark pointer-events-none opacity-40"
        aria-hidden
      />
      <div className="flex items-center justify-between mb-8 z-10 relative">
        <div>
          <h3 className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-1">
            Pipeline Health
          </h3>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-50">
            Conversion Funnel
          </h2>
        </div>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col justify-center items-center flex-grow py-8 relative">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none"
          aria-hidden
        />
        <div className="relative w-72 h-72">
          <svg
            className="w-full h-full transform -rotate-90 drop-shadow-xl"
            viewBox="0 0 200 200"
            aria-hidden
          >
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="rgba(203, 213, 225, 0.3)"
              strokeWidth="14"
              className="dark:stroke-slate-800/50"
            />
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="#6366F1"
              strokeDasharray="280 550"
              strokeDashoffset="0"
              strokeLinecap="round"
              strokeWidth="16"
              className="filter drop-shadow-md transition-all duration-500 cursor-pointer"
            />
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="#EC4899"
              strokeDasharray="90 550"
              strokeDashoffset="-295"
              strokeLinecap="round"
              strokeWidth="14"
              className="filter drop-shadow-md transition-all duration-500 cursor-pointer"
            />
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="#F59E0B"
              strokeDasharray="50 550"
              strokeDashoffset="-400"
              strokeLinecap="round"
              strokeWidth="14"
              className="filter drop-shadow-md transition-all duration-500 cursor-pointer"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
            <span className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
              {displayRate}%
            </span>
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-2 opacity-80">
              Conversion Rate
            </span>
          </div>
        </div>
      </div>
      <div className="z-10 relative">
        <div className="mb-6 z-10 relative px-1">
          <div className="flex justify-between items-end mb-3">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Monthly Target Progress
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-50">
                {monthlyTargetPercent}%
              </span>
            </div>
          </div>
          <div className="relative w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#6366F1] via-[#EC4899] to-[#F59E0B] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              style={{ width: `${monthlyTargetPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full shadow-glow-amber z-20"
              style={{ left: `${monthlyTargetPercent}%` }}
            />
            <div
              className="absolute -top-10 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity cursor-help border-4 border-transparent border-t-slate-800 dark:border-t-slate-700 pointer-events-none"
              style={{ left: `${monthlyTargetPercent}%` }}
            >
              On Track
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 z-10 relative border-t border-white/20 dark:border-slate-600/40">
          <div className="flex -space-x-3 hover:space-x-1 transition-all duration-300">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300"
                aria-hidden
              >
                {i}
              </div>
            ))}
            <div className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm">
              +4
            </div>
          </div>
          <Link
            href="/dashboard/crm/analytics"
            className="group flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-500/10 px-4 py-2 rounded-full hover:bg-indigo-500/20"
          >
            Full Report
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Pipeline Value card - Pipeline Health (1:1 with reference design, retains min-height 580px, max-w-md) */
interface PipelineValueCardProps {
  totalValue: string;
}

const PIPELINE_LEGEND = [
  { label: "Discovery", color: "bg-blue-500" },
  { label: "Proposal", color: "bg-violet-500" },
  { label: "Negotiation", color: "bg-pink-500" },
  { label: "Closing", color: "bg-orange-500" },
] as const;

function PipelineValueCard({ totalValue }: PipelineValueCardProps) {
  const displayValue = totalValue?.trim() || "$1.2M";
  return (
    <div
      className="glass-panel w-full max-w-md bg-white dark:bg-slate-900/60 rounded-[2rem] shadow-card-soft border border-gray-100 dark:border-slate-700/40 p-10 relative overflow-hidden flex flex-col justify-between min-h-[580px]"
      style={{ minHeight: "580px" }}
    >
      <div className="flex items-center justify-between mb-2 z-10 relative">
        <div>
          <h3 className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-1">
            Pipeline Health
          </h3>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-50">
            Pipeline Value
          </h2>
        </div>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col justify-center items-center flex-grow py-6 relative z-10">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-50 dark:bg-indigo-900/20 blur-[50px] rounded-full pointer-events-none"
          aria-hidden
        />
        <div className="relative w-72 h-72">
          <svg
            className="w-full h-full transform -rotate-90 drop-shadow-lg"
            viewBox="0 0 200 200"
            aria-hidden
          >
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="#F1F5F9"
              strokeWidth="12"
              className="dark:stroke-slate-700/50"
            />
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="#3B82F6"
              strokeDasharray="160 600"
              strokeDashoffset="0"
              strokeLinecap="round"
              strokeWidth="12"
              className="transition-all duration-500 cursor-pointer"
            />
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="#8B5CF6"
              strokeDasharray="110 600"
              strokeDashoffset="-175"
              strokeLinecap="round"
              strokeWidth="12"
              className="transition-all duration-500 cursor-pointer"
            />
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="#EC4899"
              strokeDasharray="90 600"
              strokeDashoffset="-300"
              strokeLinecap="round"
              strokeWidth="12"
              className="transition-all duration-500 cursor-pointer"
            />
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r="80"
              stroke="#F97316"
              strokeDasharray="60 600"
              strokeDashoffset="-405"
              strokeLinecap="round"
              strokeWidth="12"
              className="transition-all duration-500 cursor-pointer"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
            <span className="text-5xl font-bold text-slate-800 dark:text-slate-50 tracking-tight">
              {displayValue}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-2 opacity-80">
              Total Value
            </span>
          </div>
        </div>
      </div>
      <div className="z-10 relative">
        <div className="mb-8 px-1">
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            {PIPELINE_LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm ring-2 ring-white dark:ring-slate-800`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-slate-700/50">
          <div className="flex -space-x-3 hover:space-x-1 transition-all duration-300">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 object-cover"
                aria-hidden
              >
                {i}
              </div>
            ))}
            <div className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm">
              +4
            </div>
          </div>
          <Link
            href="/dashboard/crm/deals"
            className="group flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
          >
            Full Report
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Deal Size (Avg Deal Size) card - Pipeline Health (1:1 with reference design, retains min-height 480px, max-w-md) */
interface DealSizeCardProps {
  value: string;
  changeLabel: string;
}

function DealSizeCard({ value, changeLabel }: DealSizeCardProps) {
  const isUp = changeLabel.startsWith("+");
  const isDown = changeLabel.startsWith("-");
  const trendPillClass = isDown
    ? "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 border-rose-100 dark:border-rose-500/20"
    : isUp
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
      : "text-slate-600 bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400 border-slate-100 dark:border-slate-600";

  return (
    <div
      className="glass-panel w-full max-w-md bg-white dark:bg-slate-900/60 rounded-[2rem] shadow-card-soft border border-gray-100 dark:border-slate-700/40 p-10 relative overflow-hidden flex flex-col justify-between min-h-[480px]"
      style={{ minHeight: "480px" }}
    >
      {/* Decorative dollar icon - top right, faded */}
      <div
        className="absolute right-[-2rem] top-[-1rem] text-gray-200 dark:text-slate-600 opacity-30 select-none pointer-events-none transform rotate-12 z-0"
        aria-hidden
      >
        <DollarSign className="w-[300px] h-[300px]" strokeWidth={1.5} />
      </div>
      <div className="flex items-center justify-between mb-2 z-10 relative">
        <div>
          <h3 className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-1">
            Pipeline Health
          </h3>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-50">
            Deal Size
          </h2>
        </div>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col justify-center items-center flex-grow py-6 relative z-10">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-50 dark:bg-emerald-900/20 blur-[60px] rounded-full pointer-events-none"
          aria-hidden
        />
        <div className="relative flex flex-col items-center justify-center text-center z-10">
          <span className="text-7xl font-bold text-slate-800 dark:text-slate-50 tracking-tight">
            {value?.trim() || "$15,420"}
          </span>
          <div
            className={`flex items-center gap-1 mt-4 px-3 py-1.5 rounded-full border shadow-sm ${trendPillClass}`}
          >
            {isDown ? (
              <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
            ) : isUp ? (
              <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span className="text-xs font-bold">{changeLabel}</span>
          </div>
        </div>
      </div>
      <div className="z-10 relative">
        <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-slate-700/50 mt-4">
          <div className="flex -space-x-3 hover:space-x-1 transition-all duration-300">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300"
                aria-hidden
              >
                {i}
              </div>
            ))}
            <div className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm">
              +4
            </div>
          </div>
          <Link
            href="/dashboard/crm/deals"
            className="group flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
          >
            Full Report
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Stage Distribution - wide horizontal bar (1:1 with reference: glass panel, 4 segments, tooltips) */
const STAGE_DIST_SEGMENTS = [
  { width: 35, color: "bg-emerald-500", label: "New" },
  { width: 25, color: "bg-violet-500", label: "Contacted" },
  { width: 20, color: "bg-indigo-500", label: "Qualified" },
  { width: 20, color: "bg-rose-500", label: "Proposal" },
] as const;

interface StageDistributionCardProps {
  stages: { name: string; value: number; percentage: number }[];
}

function StageDistributionCard({ stages }: StageDistributionCardProps) {
  const four = stages.slice(0, 4);
  const segments = STAGE_DIST_SEGMENTS.map((seg, i) => ({
    ...seg,
    stage: four[i] ?? { name: seg.label, value: 0, percentage: seg.width },
  }));

  return (
    <div className="glass-panel w-full max-w-5xl mx-auto bg-white dark:bg-slate-900/60 rounded-2xl shadow-card-soft border border-gray-100 dark:border-slate-700/40 p-8 sm:p-10 relative overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-8 sm:mb-12 relative z-10">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight uppercase">
          Stage Distribution
        </h2>
        <Link
          href="/dashboard/engage"
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 group"
        >
          View Full Report
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="flex flex-col flex-grow relative z-10 w-full">
        <div className="relative w-full h-10 flex items-center gap-0">
          {segments.map((seg, i) => (
            <div
              key={seg.label}
              className={`h-full shadow-sm hover:brightness-110 transition-all cursor-pointer relative group ${i === 0 ? "rounded-l-md" : ""} ${i === segments.length - 1 ? "rounded-r-md" : ""} ${seg.color}`}
              style={{ width: `${seg.width}%` }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-gray-900 dark:bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg pointer-events-none">
                {seg.stage.name}: {seg.width}% ({seg.stage.value} Deals)
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-slate-800" />
              </div>
            </div>
          ))}
        </div>
        <div className="w-full flex text-sm text-slate-500 dark:text-slate-400 font-medium items-start mt-4">
          {segments.map((seg, i) => (
            <div
              key={seg.label}
              className="text-center"
              style={{ width: `${seg.width}%`, paddingLeft: i === 0 ? 0 : 4 }}
            >
              {seg.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
