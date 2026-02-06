"use client";

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
            <PipelineValueCard value={pipelineValue} />
            <ConversionRateCard
              value={conversionRate}
              change={conversionChange}
              progress={85}
            />
            <ActiveDealsCard value={activeDeals} change={activeDealsChange} />
            <DealSizeCard value={avgDealSize} change={avgDealSizeChange} />
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
            <div className="p-6 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-50/50 dark:bg-indigo-900/20 blur-[80px] rounded-full pointer-events-none z-0" aria-hidden />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Notifications
                  </h2>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors"
                    aria-label="Notification actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col flex-grow space-y-0 relative">
                  <div className="absolute left-[7px] top-6 bottom-16 w-0.5 bg-slate-100 dark:bg-slate-700/50 z-0" aria-hidden />
                  {(
                    notifications.length >= 5
                      ? notifications.slice(0, 5)
                      : [
                          { id: "1", title: "New contact added", description: "Contact added to CRM", time: "1/27/2026" },
                          { id: "2", title: "New contact added", description: "Contact added to CRM", time: "12/4/2025" },
                          { id: "3", title: "Deal updated", description: "Deal moved to new stage", time: "12/2/2025" },
                          { id: "4", title: "New Lead Assigned", description: "Automatic assignment via round-robin", time: "11/28/2025" },
                          { id: "5", title: "Meeting Scheduled", description: "Demo call with Acme Corp", time: "11/20/2025" },
                        ]
                  ).map((n, idx) => {
                    const dotBorder =
                      ["border-blue-500", "border-emerald-500", "border-slate-400 dark:border-slate-500", "border-blue-500", "border-emerald-500"][idx] ?? "border-blue-500";
                    const date = "time" in n && typeof n.time === "string" ? n.time : "";
                    const title = "title" in n ? String(n.title) : "";
                    const description = "description" in n ? String(n.description) : "";
                    return (
                      <div key={"id" in n ? String(n.id) : idx} className="flex gap-4 relative pb-8 last:pb-0">
                        <div className="flex-shrink-0 relative z-10">
                          <div className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-[3px] ${dotBorder} shadow-sm`} aria-hidden />
                        </div>
                        <div className="flex-grow pt-0.5 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-0.5">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                              {title}
                            </h3>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {date}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal">
                            {description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 mt-auto">
                  <Link
                    href="/dashboard/notifications"
                    className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    View all notifications
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-6 relative flex flex-col min-h-[400px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-50/50 dark:bg-indigo-900/20 blur-[80px] rounded-full pointer-events-none z-0" aria-hidden />
              <div className="relative z-10 flex flex-col flex-grow">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Pending Tasks
                    </h2>
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
                      {pendingTasksCount} Left
                    </span>
                  </div>
                  <Link
                    href="/dashboard/tasks"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors"
                    aria-label="Add new task"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </Link>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Daily Goal
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      {taskCompletionPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${taskCompletionPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-grow space-y-6">
                  {displayTasks.map((t) => {
                    const completed = !!(t as { completed?: boolean }).completed;
                    return (
                      <label
                        key={t.id}
                        className="group flex items-center gap-4 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={completed}
                          className="peer sr-only"
                        />
                        <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 rounded flex items-center justify-center flex-shrink-0 transition-colors bg-white dark:bg-slate-800 group-hover:border-slate-400 dark:group-hover:border-slate-500 peer-checked:bg-blue-500 peer-checked:border-blue-500">
                          <svg className="w-4 h-4 text-white hidden group-has-[:checked]:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span
                          className={`text-base font-medium transition-colors ${
                            completed
                              ? "text-gray-400 dark:text-gray-500 line-through"
                              : "text-slate-800 dark:text-white group-hover:text-slate-900 dark:group-hover:text-white"
                          }`}
                        >
                          {t.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-auto pt-6">
                  <div className="w-full h-4 bg-slate-200/50 dark:bg-slate-700/50 rounded-full" aria-hidden />
                </div>
              </div>
            </div>

            {/* Active Campaigns – 1:1 with reference (glass-panel, metric-bg, success badges, Activity Volume bar chart) */}
            <div className="p-6 relative flex flex-col min-h-[400px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-50/50 dark:bg-indigo-900/20 blur-[80px] rounded-full pointer-events-none z-0" aria-hidden />
              <div className="relative z-10 flex flex-col flex-grow gap-8 backdrop-blur-[8px] bg-white dark:bg-white rounded-[2rem] border border-white/60 dark:border-gray-700 shadow-xl p-6 md:p-8 min-h-0 overflow-hidden">
                <div className="flex items-start justify-between flex-shrink-0">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Active Campaigns
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      Email performance summary
                    </p>
                  </div>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-500 dark:text-slate-400 transition-colors"
                    aria-label="Campaign options"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-gray-600 shadow-sm flex flex-col justify-between h-32 transition-all hover:shadow-md">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Total Sent
                      </p>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter">
                        {campaignMetrics.totalSent.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 self-start px-2 py-1 rounded-full">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{campaignMetrics.sentChange}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-gray-600 shadow-sm flex flex-col justify-between h-32 transition-all hover:shadow-md">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Open Rate
                      </p>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter">
                        {campaignMetrics.openRate}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 self-start px-2 py-1 rounded-full">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{campaignMetrics.openChange}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-grow flex flex-col pt-2 min-h-0">
                  <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Activity Volume
                    </h3>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary bg-blue-100/50 hover:bg-blue-100 dark:bg-primary/20 dark:hover:bg-primary/30 transition-colors px-3 py-1.5 rounded-full flex items-center gap-1"
                      aria-label="Select period"
                    >
                      Last 7 Days
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="relative w-full h-40 flex items-end justify-between px-2 gap-2 flex-shrink-0">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0">
                      <div className="border-t border-dashed border-slate-100 dark:border-slate-600 w-full h-px" />
                      <div className="border-t border-dashed border-slate-100 dark:border-slate-600 w-full h-px" />
                      <div className="border-t border-dashed border-slate-100 dark:border-slate-600 w-full h-px" />
                      <div className="border-t border-dashed border-slate-100 dark:border-slate-600 w-full h-px" />
                    </div>
                    {[
                      { height: 30, muted: true },
                      { height: 45, muted: true },
                      { height: 35, muted: true },
                      { height: 55, muted: false, fill: "bg-blue-100", hoverFill: "group-hover:bg-blue-200" },
                      { height: 75, highlight: true, value: campaignMetrics.highlight },
                      { height: 60, muted: false, fill: "bg-blue-200", hoverFill: "group-hover:bg-blue-300" },
                      { height: 40, muted: true },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        className="group relative w-full h-full flex items-end flex-1 min-w-0"
                      >
                        {bar.highlight ? (
                          <div
                            className="w-full bar-gradient rounded-t-md shadow-lg shadow-blue-500/20 relative z-10 transition-transform hover:scale-y-105 origin-bottom"
                            style={{ height: `${bar.height}%` }}
                          >
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded flex flex-col items-center whitespace-nowrap z-20">
                              {bar.value}
                              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 absolute -bottom-0.5" aria-hidden />
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`w-full rounded-t-md transition-all ${bar.muted ? "bg-slate-200 opacity-50 group-hover:bg-primary/30 dark:bg-slate-600 dark:group-hover:bg-primary/30" : `${bar.fill ?? ""} ${bar.hoverFill ?? "group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"}`}`}
                            style={{ height: `${bar.height}%` }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between px-2 mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">
                    <span className="w-full text-center">Mon</span>
                    <span className="w-full text-center">Tue</span>
                    <span className="w-full text-center">Wed</span>
                    <span className="w-full text-center">Thu</span>
                    <span className="w-full text-center text-primary font-bold">Fri</span>
                    <span className="w-full text-center">Sat</span>
                    <span className="w-full text-center">Sun</span>
                  </div>
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

interface PipelineValueCardProps {
  value: string;
}

function PipelineValueCard({ value }: PipelineValueCardProps) {
  return (
    <div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/60 p-5 rounded-2xl border border-slate-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Pipeline Health
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Pipeline Value
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Pipeline value options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="relative flex-1 flex items-center justify-center py-4">
          <div className="absolute w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 blur-[50px] rounded-full pointer-events-none" aria-hidden />
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90 drop-shadow-lg" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth="12"
                className="dark:stroke-slate-700/50"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="#3B82F6"
                strokeDasharray="160 600"
                strokeDashoffset="0"
                strokeLinecap="round"
                strokeWidth="12"
                className="transition-all duration-500"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="#8B5CF6"
                strokeDasharray="110 600"
                strokeDashoffset="-175"
                strokeLinecap="round"
                strokeWidth="12"
                className="transition-all duration-500"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="#EC4899"
                strokeDasharray="90 600"
                strokeDashoffset="-300"
                strokeLinecap="round"
                strokeWidth="12"
                className="transition-all duration-500"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="#F97316"
                strokeDasharray="60 600"
                strokeDashoffset="-405"
                strokeLinecap="round"
                strokeWidth="12"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {value}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1 opacity-80">
                Total Value
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="mb-4 px-0.5">
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm ring-2 ring-white dark:ring-slate-800" aria-hidden />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Discovery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-sm ring-2 ring-white dark:ring-slate-800" aria-hidden />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Proposal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm ring-2 ring-white dark:ring-slate-800" aria-hidden />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Negotiation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm ring-2 ring-white dark:ring-slate-800" aria-hidden />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Closing</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex -space-x-2">
              {["AM", "JK", "BL"].map((initials) => (
                <div
                  key={initials}
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm"
                >
                  {initials}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm">
                +4
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-hover bg-indigo-50 dark:bg-primary/20 px-3 py-2 rounded-full hover:bg-indigo-100 dark:hover:bg-primary/30 transition-colors"
              aria-label="Open full pipeline report"
            >
              Full Report
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActiveDealsCardProps {
  value: number;
  change: string;
}

function ActiveDealsCard({ value, change }: ActiveDealsCardProps) {
  return (
    <div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/60 p-5 rounded-2xl border border-slate-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Pipeline Health
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Active Deals
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Active deals options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center py-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 blur-[60px] rounded-full pointer-events-none" aria-hidden />
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <span className="text-6xl font-bold text-slate-900 dark:text-white tracking-tight">
              {value}
            </span>
            <div className="flex items-center gap-1 mt-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{change} vs last month</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-2">
          <div className="flex -space-x-2">
            {["AM", "JK", "BL"].map((initials) => (
              <div
                key={initials}
                className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm"
              >
                {initials}
              </div>
            ))}
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm">
              +4
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-hover bg-indigo-50 dark:bg-primary/20 px-3 py-2 rounded-full hover:bg-indigo-100 dark:hover:bg-primary/30 transition-colors"
            aria-label="Open full active deals report"
          >
            Full Report
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface DealSizeCardProps {
  value: string;
  change: string;
}

function DealSizeCard({ value, change }: DealSizeCardProps) {
  return (
    <div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/60 p-5 rounded-2xl border border-slate-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="absolute right-[-2rem] top-[-1rem] text-slate-200 dark:text-slate-700 opacity-30 select-none pointer-events-none transform rotate-12 z-0" aria-hidden>
        <DollarSign className="w-[180px] h-[180px]" strokeWidth={1.5} />
      </div>
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Pipeline Health
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Deal Size
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Deal size options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center py-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 blur-[60px] rounded-full pointer-events-none" aria-hidden />
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
              {value}
            </span>
            <div className="flex items-center gap-1 mt-3 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{change} vs last month</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-2">
          <div className="flex -space-x-2">
            {["AM", "JK", "BL"].map((initials) => (
              <div
                key={initials}
                className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm"
              >
                {initials}
              </div>
            ))}
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm">
              +4
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-hover bg-indigo-50 dark:bg-primary/20 px-3 py-2 rounded-full hover:bg-indigo-100 dark:hover:bg-primary/30 transition-colors"
            aria-label="Open full deal size report"
          >
            Full Report
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConversionRateCardProps {
  value: string;
  change: string;
  progress: number;
}

function ConversionRateCard({ value, change, progress }: ConversionRateCardProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const progressOffset = 100 - clampedProgress;
  return (
    <div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/60 p-5 rounded-2xl border border-slate-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(93,135,255,0.08)_0%,transparent_50%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.06)_0%,transparent_50%),radial-gradient(circle_at_0%_80%,rgba(245,158,11,0.06)_0%,transparent_50%)] opacity-70 pointer-events-none" aria-hidden />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Pipeline Health
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Conversion Funnel
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-400 dark:text-slate-500 transition-colors"
            aria-label="Conversion funnel options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="relative flex-1 flex items-center justify-center py-4">
          <div className="absolute w-24 h-24 bg-primary/10 blur-[40px] rounded-full pointer-events-none" aria-hidden />
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="rgba(203, 213, 225, 0.35)"
                strokeWidth="14"
                className="dark:stroke-slate-800/60"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="#6366F1"
                strokeDasharray="280 550"
                strokeDashoffset="0"
                strokeLinecap="round"
                strokeWidth="16"
                className="transition-all duration-500"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="#EC4899"
                strokeDasharray="90 550"
                strokeDashoffset="-295"
                strokeLinecap="round"
                strokeWidth="14"
                className="transition-all duration-500"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke="#F59E0B"
                strokeDasharray="50 550"
                strokeDashoffset="-400"
                strokeLinecap="round"
                strokeWidth="14"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
                {value}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                Conversion Rate
              </span>
              <span className="mt-1 text-[10px] font-semibold text-emerald-500 dark:text-emerald-400">
                {change}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold">Monthly Target</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {clampedProgress}%
            </span>
          </div>
          <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-pink-500 to-amber-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              style={{ width: `${clampedProgress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 bg-white border-2 border-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)]"
              style={{ left: `${clampedProgress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex -space-x-2">
              {["AM", "JK", "BL"].map((initials) => (
                <div
                  key={initials}
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm"
                >
                  {initials}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm">
                +4
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-hover bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
              aria-label="Open full conversion report"
            >
              Full Report
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
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
