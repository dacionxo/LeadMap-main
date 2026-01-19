/**
 * Widget Registry
 * Centralized widget definitions and metadata
 */

import {
  Activity,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  GitBranch,
  LineChart,
  Percent,
  PieChart,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react'
import { WidgetDefinition } from './types'
import { KPIMetricWidget } from './components/KPIMetricWidget'
import { RecentActivityWidget } from './components/RecentActivityWidget'
import { PipelineFunnelWidget } from './components/PipelineFunnelWidget'
import { DealStageDistributionWidget } from './components/DealStageDistributionWidget'
import { TasksWidget } from './components/TasksWidget'
import { QuickActionsWidget } from './components/QuickActionsWidget'
import { LeadSourceWidget } from './components/LeadSourceWidget'
import { SalesEfficiencyWidget } from './components/SalesEfficiencyWidget'

/**
 * Widget metadata registry
 * Maps widget IDs to their metadata (name, icon, size constraints)
 */
export const widgetMeta: Record<string, WidgetDefinition['meta']> = {
  'total-prospects': {
    name: 'Total Prospects',
    icon: Users,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'active-listings': {
    name: 'Active Listings',
    icon: Building2,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'enriched-leads': {
    name: 'Enriched Leads',
    icon: Sparkles,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'avg-property-value': {
    name: 'Avg Property Value',
    icon: DollarSign,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'expired-listings': {
    name: 'Expired Listings',
    icon: Clock,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'probate-leads': {
    name: 'Probate Leads',
    icon: FileText,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'active-deals': {
    name: 'Active Deals',
    icon: Briefcase,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'pipeline-value': {
    name: 'Pipeline Value',
    icon: DollarSign,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'conversion-rate': {
    name: 'Conversion Rate',
    icon: Percent,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    defaultSize: { w: 1, h: 1 }
  },
  'recent-activity': {
    name: 'Recent Activity',
    icon: Activity,
    minSize: { w: 2, h: 3 },
    maxSize: { w: 4, h: 6 },
    defaultSize: { w: 3, h: 4 }
  },
  'upcoming-tasks': {
    name: 'Upcoming Tasks',
    icon: Calendar,
    minSize: { w: 2, h: 3 },
    maxSize: { w: 4, h: 6 },
    defaultSize: { w: 3, h: 4 }
  },
  'pipeline-funnel': {
    name: 'Pipeline Funnel',
    icon: GitBranch,
    minSize: { w: 2, h: 3 },
    maxSize: { w: 4, h: 6 },
    defaultSize: { w: 3, h: 4 }
  },
  'deal-stage-distribution': {
    name: 'Deal Stage Distribution',
    icon: PieChart,
    minSize: { w: 2, h: 3 },
    maxSize: { w: 4, h: 6 },
    defaultSize: { w: 3, h: 4 }
  },
  'quick-actions': {
    name: 'Quick Actions',
    icon: Zap,
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 3 },
    defaultSize: { w: 3, h: 2 }
  }
}

/**
 * Widget Component mapping
 */
export const WidgetComponentMap: Record<string, WidgetDefinition['component']> = {
  'total-prospects': KPIMetricWidget,
  'active-listings': KPIMetricWidget,
  'enriched-leads': KPIMetricWidget,
  'avg-property-value': KPIMetricWidget,
  'expired-listings': KPIMetricWidget,
  'probate-leads': KPIMetricWidget,
  'active-deals': KPIMetricWidget,
  'pipeline-value': KPIMetricWidget,
  'conversion-rate': KPIMetricWidget,
  'recent-activity': RecentActivityWidget,
  'upcoming-tasks': TasksWidget,
  'pipeline-funnel': PipelineFunnelWidget,
  'deal-stage-distribution': DealStageDistributionWidget,
  'quick-actions': QuickActionsWidget,
  'lead-source-report': LeadSourceWidget,
  'sales-efficiency': SalesEfficiencyWidget
}

/**
 * Available widget definitions
 */
export const availableWidgets: WidgetDefinition[] = [
  // KPI Metrics
  {
    id: 'total-prospects',
    type: 'kpi_number',
    title: 'Total Prospects',
    icon: Users,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'prospects',
    display: {
      format: 'number',
      showTrend: true,
      showIcon: true,
      colorScheme: 'primary'
    },
    refreshPolicy: '5m'
  },
  {
    id: 'active-listings',
    type: 'kpi_number',
    title: 'Active Listings',
    icon: Building2,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'prospects',
    display: {
      format: 'number',
      showTrend: true,
      showIcon: true,
      colorScheme: 'success'
    },
    refreshPolicy: '5m'
  },
  {
    id: 'enriched-leads',
    type: 'kpi_number',
    title: 'Enriched Leads',
    icon: Sparkles,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'prospects',
    display: {
      format: 'number',
      showTrend: true,
      showIcon: true,
      colorScheme: 'secondary'
    },
    refreshPolicy: '5m'
  },
  {
    id: 'avg-property-value',
    type: 'kpi_currency',
    title: 'Avg Property Value',
    icon: DollarSign,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'metrics',
    display: {
      format: 'currency',
      unit: 'K',
      showTrend: true,
      showIcon: true,
      colorScheme: 'warning'
    },
    refreshPolicy: '5m'
  },
  {
    id: 'expired-listings',
    type: 'kpi_number',
    title: 'Expired Listings',
    icon: Clock,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'prospects',
    display: {
      format: 'number',
      showTrend: true,
      showIcon: true,
      colorScheme: 'error'
    },
    refreshPolicy: '5m'
  },
  {
    id: 'probate-leads',
    type: 'kpi_number',
    title: 'Probate Leads',
    icon: FileText,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'prospects',
    display: {
      format: 'number',
      showTrend: true,
      showIcon: true,
      colorScheme: 'info'
    },
    refreshPolicy: '5m'
  },
  // CRM Metrics
  {
    id: 'active-deals',
    type: 'kpi_number',
    title: 'Active Deals',
    icon: Briefcase,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'crm',
    display: {
      format: 'number',
      showTrend: true,
      showIcon: true,
      colorScheme: 'primary'
    },
    refreshPolicy: '5m'
  },
  {
    id: 'pipeline-value',
    type: 'kpi_currency',
    title: 'Pipeline Value',
    icon: DollarSign,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'crm',
    display: {
      format: 'currency',
      unit: 'K',
      showTrend: true,
      showIcon: true,
      colorScheme: 'success'
    },
    refreshPolicy: '5m'
  },
  {
    id: 'conversion-rate',
    type: 'kpi_percentage',
    title: 'Conversion Rate',
    icon: Percent,
    component: KPIMetricWidget,
    defaultEnabled: true,
    category: 'crm',
    display: {
      format: 'percentage',
      showTrend: true,
      showIcon: true,
      colorScheme: 'secondary'
    },
    refreshPolicy: '5m'
  },
  // Activity Widgets
  {
    id: 'recent-activity',
    type: 'activity_feed',
    title: 'Recent Activity',
    icon: Activity,
    component: RecentActivityWidget,
    defaultEnabled: true,
    category: 'activity',
    refreshPolicy: 'realtime'
  },
  {
    id: 'upcoming-tasks',
    type: 'activity_feed',
    title: 'Upcoming Tasks',
    icon: Calendar,
    component: TasksWidget,
    defaultEnabled: true,
    category: 'activity',
    refreshPolicy: '5m'
  },
  // Charts
  {
    id: 'pipeline-funnel',
    type: 'chart_bar',
    title: 'Pipeline Funnel',
    icon: GitBranch,
    component: PipelineFunnelWidget,
    defaultEnabled: true,
    category: 'charts',
    display: {
      chartType: 'bar',
      showLegend: true
    },
    refreshPolicy: '5m'
  },
  {
    id: 'deal-stage-distribution',
    type: 'chart_pie',
    title: 'Deal Stage Distribution',
    icon: PieChart,
    component: DealStageDistributionWidget,
    defaultEnabled: true,
    category: 'charts',
    display: {
      chartType: 'pie',
      showLegend: true
    },
    refreshPolicy: '5m'
  },
  // Actions
  {
    id: 'quick-actions',
    type: 'actions',
    title: 'Quick Actions',
    icon: Zap,
    component: QuickActionsWidget,
    defaultEnabled: true,
    category: 'actions',
    refreshPolicy: 'manual'
  }
]

/**
 * Get widget definition by ID
 */
export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  return availableWidgets.find(w => w.id === id)
}

/**
 * Get all widgets by category
 */
export function getWidgetsByCategory(category: WidgetDefinition['category']): WidgetDefinition[] {
  return availableWidgets.filter(w => w.category === category)
}
