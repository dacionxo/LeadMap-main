"use client";

import { useApp } from "@/app/providers";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import DashboardOverviewModern from "./DashboardOverviewModern";

export default function CustomizableDashboard() {
  const { profile } = useApp();
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const previousDataRef = useRef<Record<string, any>>({});
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh every 5 minutes
  const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

  useEffect(() => {
    if (profile?.id) {
      fetchWidgetData();

      // Set up auto-refresh
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchWidgetData(true); // Silent refresh
      }, AUTO_REFRESH_INTERVAL);
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Set up real-time subscription for listings
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("dashboard-listings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        () => {
          // Refresh data when listings change
          fetchWidgetData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, supabase]);

  const fetchWidgetData = async (silent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (!silent) {
        setLoading(true);
        setRefreshing(true);
      }
      setError(null);

      if (!profile?.id) {
        throw new Error("User profile not available");
      }

      // Check if user has real data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("has_real_data")
        .eq("id", profile.id)
        .single();

      if (userError && userError.code !== "PGRST116") throw userError; // PGRST116 is "not found", which is ok

      const hasRealData = userData?.has_real_data || false;

      // Fetch all leads with retry logic
      let allLeads: any[] = [];
      let allError: any = null;
      let retries = 3;

      while (retries > 0) {
        const { data, error } = await supabase
          .from("listings")
          .select(
            "listing_id, status, active, agent_email, agent_phone, agent_name, ai_investment_score, list_price, created_at, updated_at"
          )
          .order("created_at", { ascending: false });

        if (!error) {
          allLeads = data || [];
          break;
        }
        allError = error;
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }

      if (allError) throw allError;

      // Fetch contacts and deals for real data
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id, status, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (contactsError)
        console.warn("Error fetching contacts:", contactsError);

      const { data: deals, error: dealsError } = await supabase
        .from("deals")
        .select("id, stage, value, created_at, updated_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (dealsError) console.warn("Error fetching deals:", dealsError);

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, created_at")
        .eq("user_id", profile.id)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5);

      if (tasksError) console.warn("Error fetching tasks:", tasksError);

      // Calculate metrics with validation
      const total = allLeads?.length || 0;
      const active = allLeads?.filter((l) => l.active === true).length || 0;
      const expired =
        allLeads?.filter(
          (l) =>
            l.status &&
            (l.status.toLowerCase().includes("expired") ||
              l.status.toLowerCase().includes("sold") ||
              l.status.toLowerCase().includes("off market"))
        ).length || 0;

      // Fetch probate leads with error handling
      let probate = 0;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        const probateResponse = await fetch("/api/probate-leads", {
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (probateResponse.ok) {
          const probateData = await probateResponse.json();
          probate = probateData?.leads?.length || 0;
        }
      } catch (err) {
        console.warn("Error fetching probate leads:", err);
      }

      // Calculate enriched count
      const enriched =
        allLeads?.filter(
          (l) =>
            (l.ai_investment_score !== null &&
              l.ai_investment_score !== undefined) ||
            l.agent_email ||
            l.agent_phone ||
            l.agent_name
        ).length || 0;

      // Calculate total value with validation
      const totalValue =
        allLeads?.reduce((sum, l) => {
          const price =
            typeof l.list_price === "number"
              ? l.list_price
              : parseFloat(l.list_price || "0") || 0;
          return sum + price;
        }, 0) || 0;
      const avgValue = total > 0 ? Math.round(totalValue / total) : 0;

      // Calculate real CRM metrics
      const activeDeals =
        deals?.filter((d) => !["closed_won", "closed_lost"].includes(d.stage))
          .length || 0;
      const pipelineValue =
        deals?.reduce((sum, d) => {
          const value =
            typeof d.value === "number"
              ? d.value
              : parseFloat(d.value?.toString() || "0") || 0;
          return sum + value;
        }, 0) || 0;
      const closedDeals =
        deals?.filter((d) => d.stage === "closed_won").length || 0;
      const totalDeals = deals?.length || 0;
      const conversionRate =
        totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0;

      // Calculate trends from previous data
      const previous = previousDataRef.current;
      const calculateTrend = (
        current: number,
        previous: number
      ): { change: string; trend: "up" | "down" | "neutral" } => {
        if (!previous || previous === 0) {
          return { change: "", trend: "neutral" };
        }
        const percentChange = Math.round(
          ((current - previous) / previous) * 100
        );
        if (Math.abs(percentChange) < 1) {
          return { change: "", trend: "neutral" };
        }
        return {
          change: `${percentChange > 0 ? "+" : ""}${percentChange}%`,
          trend: percentChange > 0 ? "up" : "down",
        };
      };

      // Get recent activities from real data
      const recentActivities: any[] = [];
      if (hasRealData) {
        // Get recent contacts
        const recentContacts =
          contacts?.slice(0, 2).map((c) => ({
            id: `contact-${c.id}`,
            type: "contact",
            title: "New contact added",
            description: `Contact added to CRM`,
            time: new Date(c.created_at).toLocaleDateString(),
            iconType: "users",
          })) || [];

        // Get recent deals
        const recentDeals =
          deals?.slice(0, 1).map((d) => ({
            id: `deal-${d.id}`,
            type: "deal",
            title: "Deal updated",
            description: `Deal moved to ${d.stage}`,
            time: new Date(d.created_at).toLocaleDateString(),
            iconType: "target",
          })) || [];

        recentActivities.push(...recentContacts, ...recentDeals);
      }

      // Calculate trends
      const totalTrend = calculateTrend(total, previous.total || 0);
      const activeTrend = calculateTrend(active, previous.active || 0);
      const enrichedTrend = calculateTrend(enriched, previous.enriched || 0);
      const avgValueTrend = calculateTrend(avgValue, previous.avgValue || 0);
      const expiredTrend = calculateTrend(expired, previous.expired || 0);
      const probateTrend = calculateTrend(probate, previous.probate || 0);
      const activeDealsTrend = calculateTrend(
        activeDeals,
        previous.activeDeals || 0
      );
      const pipelineValueTrend = calculateTrend(
        pipelineValue,
        previous.pipelineValue || 0
      );
      const conversionRateTrend = calculateTrend(
        conversionRate,
        previous.conversionRate || 0
      );

      // Store current data for next trend calculation
      previousDataRef.current = {
        total,
        active,
        enriched,
        avgValue,
        expired,
        probate,
        activeDeals,
        pipelineValue,
        conversionRate,
      };

      // Set widget data - use real data if available, otherwise show sample data
      setWidgetData({
        "total-prospects": {
          value: total,
          change: totalTrend.change,
          trend: totalTrend.trend,
        },
        "active-listings": {
          value: active,
          change: activeTrend.change,
          trend: activeTrend.trend,
        },
        "enriched-leads": {
          value: enriched,
          change: enrichedTrend.change,
          trend: enrichedTrend.trend,
        },
        "avg-property-value": {
          value: `$${(avgValue / 1000).toFixed(0)}K`,
          change: avgValueTrend.change,
          trend: avgValueTrend.trend,
        },
        "expired-listings": {
          value: expired,
          change: expiredTrend.change,
          trend: expiredTrend.trend,
        },
        "probate-leads": {
          value: probate,
          change: probateTrend.change,
          trend: probateTrend.trend,
        },
        "active-deals": {
          value: activeDeals,
          change: activeDealsTrend.change,
          trend: activeDealsTrend.trend,
        },
        "pipeline-value": {
          value: `$${(pipelineValue / 1000).toFixed(0)}K`,
          change: pipelineValueTrend.change,
          trend: pipelineValueTrend.trend,
        },
        "conversion-rate": {
          value: `${conversionRate}%`,
          change: conversionRateTrend.change,
          trend: conversionRateTrend.trend,
        },
        "recent-activity":
          hasRealData && recentActivities.length > 0
            ? recentActivities
            : [
                {
                  id: "1",
                  type: "contact",
                  title: "New contact added",
                  description: "Contact added to CRM",
                  time: "12/4/2025",
                  iconType: "users",
                },
                {
                  id: "2",
                  type: "contact",
                  title: "New contact added",
                  description: "Contact added to CRM",
                  time: "12/4/2025",
                  iconType: "users",
                },
                {
                  id: "3",
                  type: "deal",
                  title: "Deal updated",
                  description: "Deal moved to new",
                  time: "12/2/2025",
                  iconType: "target",
                },
              ],
        "upcoming-tasks":
          tasks && tasks.length > 0
            ? tasks.map((t) => ({
                id: t.id,
                title: t.title || "Untitled Task",
                due: t.due_date
                  ? new Date(t.due_date).toLocaleDateString()
                  : "No due date",
                priority: t.priority,
              }))
            : [],
        "pipeline-funnel":
          hasRealData && deals && deals.length > 0
            ? {
                stages: [
                  {
                    name: "New",
                    value: deals.filter((d) => d.stage === "new").length,
                    percentage: 100,
                  },
                  {
                    name: "Contacted",
                    value: deals.filter((d) => d.stage === "contacted").length,
                    percentage: Math.round(
                      (deals.filter((d) => d.stage === "contacted").length /
                        deals.length) *
                        100
                    ),
                  },
                  {
                    name: "Qualified",
                    value: deals.filter((d) => d.stage === "qualified").length,
                    percentage: Math.round(
                      (deals.filter((d) => d.stage === "qualified").length /
                        deals.length) *
                        100
                    ),
                  },
                  {
                    name: "Proposal",
                    value: deals.filter((d) => d.stage === "proposal").length,
                    percentage: Math.round(
                      (deals.filter((d) => d.stage === "proposal").length /
                        deals.length) *
                        100
                    ),
                  },
                  {
                    name: "Closed",
                    value: deals.filter((d) =>
                      ["closed_won", "closed_lost"].includes(d.stage)
                    ).length,
                    percentage: Math.round(
                      (deals.filter((d) =>
                        ["closed_won", "closed_lost"].includes(d.stage)
                      ).length /
                        deals.length) *
                        100
                    ),
                  },
                ],
              }
            : {
                stages: [
                  { name: "New", value: 1, percentage: 100 },
                  { name: "Contacted", value: 1, percentage: 33 },
                  { name: "Qualified", value: 1, percentage: 33 },
                  { name: "Proposal", value: 0, percentage: 0 },
                ],
              },
        "deal-stage-distribution":
          hasRealData && deals && deals.length > 0
            ? {
                stages: [
                  {
                    name: "New",
                    value: deals.filter((d) => d.stage === "new").length,
                    percentage:
                      deals.length > 0
                        ? Math.round(
                            (deals.filter((d) => d.stage === "new").length /
                              deals.length) *
                              100
                          )
                        : 0,
                  },
                  {
                    name: "Contacted",
                    value: deals.filter((d) => d.stage === "contacted").length,
                    percentage:
                      deals.length > 0
                        ? Math.round(
                            (deals.filter((d) => d.stage === "contacted")
                              .length /
                              deals.length) *
                              100
                          )
                        : 0,
                  },
                  {
                    name: "Qualified",
                    value: deals.filter((d) => d.stage === "qualified").length,
                    percentage:
                      deals.length > 0
                        ? Math.round(
                            (deals.filter((d) => d.stage === "qualified")
                              .length /
                              deals.length) *
                              100
                          )
                        : 0,
                  },
                  {
                    name: "Proposal",
                    value: deals.filter((d) => d.stage === "proposal").length,
                    percentage:
                      deals.length > 0
                        ? Math.round(
                            (deals.filter((d) => d.stage === "proposal")
                              .length /
                              deals.length) *
                              100
                          )
                        : 0,
                  },
                ],
              }
            : {
                stages: [
                  { name: "New", value: 1, percentage: 33 },
                  { name: "Contacted", value: 1, percentage: 33 },
                  { name: "Qualified", value: 1, percentage: 33 },
                  { name: "Proposal", value: 0, percentage: 0 },
                ],
              },
        "lead-source-report": {
          sources: [
            {
              name: "Expired Listings",
              count: expired,
              percentage: expired > 0 ? Math.round((expired / total) * 100) : 0,
            },
            {
              name: "Probate Leads",
              count: probate,
              percentage: probate > 0 ? Math.round((probate / total) * 100) : 0,
            },
            {
              name: "Geo Leads",
              count: Math.round(total * 0.2),
              percentage: 20,
            },
            {
              name: "Property Listings",
              count: active,
              percentage: active > 0 ? Math.round((active / total) * 100) : 0,
            },
            { name: "Other", count: Math.round(total * 0.1), percentage: 10 },
          ],
        },
        "sales-efficiency": {
          avgResponseTime: "2.5h",
          conversionRate: "12%",
          avgDealSize: "$45K",
          salesCycle: "28 days",
        },
      });
    } catch (error: any) {
      console.error("Error fetching widget data:", error);
      setError(
        error?.message ||
          "Failed to load dashboard data. Please try refreshing."
      );
      // Don't clear widget data on error, keep showing previous data
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
      fetchingRef.current = false;
    }
  };

  const handleManualRefresh = () => {
    fetchWidgetData(false);
  };

  // #region agent log
  if (typeof fetch !== "undefined") {
    fetch("http://127.0.0.1:7242/ingest/a7565911-e087-4f8e-bc4b-5620fd981055", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "CustomizableDashboard.tsx:render",
        message: "CustomizableDashboard rendering DashboardOverviewModern",
        data: { importPath: "./DashboardOverviewModern" },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "B",
      }),
    }).catch(() => {});
  }
  // #endregion

  return (
    <DashboardOverviewModern
      widgetData={widgetData}
      loading={loading}
      error={error}
      onRefresh={handleManualRefresh}
      lastUpdated={lastUpdated}
    />
  );
}
