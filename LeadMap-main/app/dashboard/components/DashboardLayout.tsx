"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import { SidebarProvider } from "./SidebarContext";
import ProspectNavSidebar from "../prospect-enrich/components/ProspectNavSidebar";

/** Routes that show the Prospect & Enrich–style sidebar (Lists, Deals, Calendar, Unibox, Prospect-enrich). Dashboard and Maps do not. */
function useShowProspectSidebar(): boolean {
  const pathname = usePathname() ?? "";
  if (pathname === "/dashboard" || pathname === "/dashboard/") return false;
  if (pathname.startsWith("/dashboard/map")) return false;
  if (pathname.startsWith("/dashboard/prospect-enrich")) return true;
  if (pathname.startsWith("/dashboard/lists")) return true;
  if (pathname.startsWith("/dashboard/crm/deals")) return true;
  if (pathname.startsWith("/dashboard/crm/calendar")) return true;
  if (pathname.startsWith("/dashboard/unibox")) return true;
  return false;
}

interface DashboardLayoutProps {
  children: ReactNode;
  /** When true, hide the top nav bar (header). Sidebar remains visible. */
  hideHeader?: boolean;
  /** When true, content is full-bleed (no container/padding) and fills the main area. */
  fullBleed?: boolean;
}

function DashboardLayoutContent({
  children,
  hideHeader,
  fullBleed,
}: DashboardLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const showSidebar = useShowProspectSidebar();

  useEffect(() => {
    setMounted(true);
    // #region agent log
    if (mainRef.current) {
      const mainEl = mainRef.current;
      const computedStyle = window.getComputedStyle(mainEl);
      const overflow = computedStyle.overflow;
      const overflowY = computedStyle.overflowY;
      const parentEl = mainEl.parentElement;
      const parentComputed = parentEl
        ? window.getComputedStyle(parentEl)
        : null;
      const parentOverflow = parentComputed?.overflow || "N/A";
      fetch(
        "http://127.0.0.1:7242/ingest/27ffd39f-e797-4d31-a671-175bf76a4f27",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "DashboardLayout.tsx:18",
            message: "Main container overflow check",
            data: {
              mainOverflow: overflow,
              mainOverflowY: overflowY,
              parentOverflow,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A,B",
          }),
        }
      ).catch(() => {});
    }
    // #endregion
  }, []);

  return (
    <div className="flex h-screen relative overflow-x-hidden">
      <main
        ref={mainRef as any}
        className="flex-1 overflow-y-auto relative z-10 bg-[#F8FAFC] dark:bg-dark h-full flex flex-col min-w-0"
      >
        {!hideHeader && <Header scrollContainerRef={mainRef} />}
        {showSidebar ? (
          /* Nav sidebar + content card (Dashboard border/shadow) on Lists, Deals, Calendar, Unibox, Prospect-enrich only */
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <ProspectNavSidebar />
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-dark/90">
              {fullBleed ? (
                <div className="flex-1 min-h-0 overflow-hidden">{mounted && children}</div>
              ) : (
                <div className="container relative z-10 py-[30px] flex-1">{mounted && children}</div>
              )}
            </div>
          </div>
        ) : (
          /* Dashboard and Maps: no sidebar, content only */
          fullBleed ? (
            <div className="flex-1 min-h-0 overflow-hidden">{mounted && children}</div>
          ) : (
            <div className="container relative z-10 py-[30px] flex-1">{mounted && children}</div>
          )
        )}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
  hideHeader,
  fullBleed,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent hideHeader={hideHeader} fullBleed={fullBleed}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}
