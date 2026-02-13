"use client";

import { useApp } from "@/app/providers";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/app/lib/utils";

interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// 1:1 reference: Material Symbols icon names, same sections as reference HTML
const navSections: NavSection[] = [
  {
    title: "Home",
    items: [
      { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
      { label: "Maps", icon: "map", href: "/dashboard/map" },
    ],
  },
  {
    title: "Prospect & Enrich",
    items: [
      { label: "All Prospects", icon: "group", href: "/dashboard/prospect-enrich" },
      { label: "For Sale", icon: "sell", href: "/dashboard/prospect-enrich?filter=fsbo" },
      { label: "For Rent", icon: "key", href: "/dashboard/prospect-enrich?filter=frbo" },
      { label: "Foreclosures", icon: "gavel", href: "/dashboard/prospect-enrich?filter=foreclosure" },
      { label: "Probate", icon: "policy", href: "/dashboard/prospect-enrich?filter=probate" },
      { label: "Expired Listings", icon: "timer_off", href: "/dashboard/prospect-enrich?filter=expired" },
      { label: "Imports", icon: "cloud_upload", href: "/dashboard/prospect-enrich?filter=imports" },
    ],
  },
  {
    title: "Customer Relationship",
    items: [
      { label: "Lists", icon: "list_alt", href: "/dashboard/lists" },
      { label: "Deals", icon: "handshake", href: "/dashboard/crm/deals" },
      { label: "Calendar", icon: "calendar_month", href: "/dashboard/crm/calendar" },
    ],
  },
  {
    title: "Email Marketing",
    items: [
      { label: "Unibox", icon: "mail", href: "/dashboard/unibox" },
      { label: "Email Campaigns", icon: "send", href: "/dashboard/email/campaigns" },
      { label: "Email Analytics", icon: "analytics", href: "/dashboard/marketing/analytics" },
    ],
  },
  {
    title: "TOOLS & AUTOMATION",
    items: [{ label: "Analytics", icon: "monitoring", href: "/dashboard/crm/analytics" }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, signOut } = useApp();
  const { isOpen } = useSidebar();
  const initials =
    profile?.name
      ?.split(" ")
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "U";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/";
    }
    const hrefPath = href.split("?")[0];
    const hrefParams = new URLSearchParams(
      href.includes("?") ? href.split("?")[1] : ""
    );
    if (!pathname.startsWith(hrefPath)) return false;
    if (hrefPath === "/dashboard/prospect-enrich") {
      const currentFilter = searchParams.get("filter");
      const hrefFilter = hrefParams.get("filter");
      if (!hrefFilter) return !currentFilter;
      return currentFilter === hrefFilter;
    }
    return true;
  };

  // Collapsed: narrow icon strip (keep existing width behavior)
  if (!isOpen) {
    return (
      <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-[75px] flex-col border-r border-fd-border-light bg-fd-sidebar-lavender dark:bg-dark shadow-sm transition-[width] duration-200">
        <div className="flex flex-col py-4 px-2 overflow-y-auto no-scrollbar flex-1">
          {navSections.map((section) =>
            section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    active ? "bg-white text-fd-primary shadow-sm ring-1 ring-black/5" : "text-fd-text-secondary hover:bg-white/80 hover:text-fd-primary"
                  )}
                  aria-label={item.label}
                >
                  <span className={cn("material-symbols-outlined text-[20px]", active && "fill-1")}>{item.icon}</span>
                </Link>
              );
            })
          )}
        </div>
        <div className="p-2 border-t border-fd-border-light">
          <div className="h-10 w-10 rounded-full bg-fd-primary flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
        </div>
      </aside>
    );
  }

  // Expanded: 1:1 reference layout (lavender, gradient border, rounded-l-[24px], sections)
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col shrink-0 overflow-y-auto no-scrollbar py-4 px-3 bg-fd-sidebar-lavender dark:bg-[#0f172a] sidebar-gradient-border rounded-l-[24px] my-3 ml-3 mr-0 shadow-sm transition-[width] duration-200"
      aria-label="Main navigation"
    >
      {/* Brand - minimal to match reference */}
      <div className="px-3 mb-4 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-fd-text-secondary hover:bg-white/80 hover:text-fd-primary transition-colors">
          <div className="w-9 h-9 rounded-xl bg-fd-primary flex items-center justify-center text-white text-sm font-bold shadow-sm">
            N
          </div>
          <span className="text-sm font-semibold text-fd-text-primary">NextDeal</span>
        </Link>
      </div>

      {/* Nav sections - 1:1 reference structure */}
      <nav className="flex-1">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-fd-text-secondary uppercase tracking-wider">{section.title}</span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
                      active
                        ? "text-fd-primary bg-white shadow-sm ring-1 ring-black/5"
                        : "text-fd-text-secondary hover:bg-white/80 hover:text-fd-primary"
                    )}
                  >
                    <span className={cn("material-symbols-outlined text-[20px]", active && "fill-1")}>{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section - compact */}
      {profile && (
        <div className="mt-auto pt-4 border-t border-fd-sidebar-border dark:border-slate-700 px-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="h-10 w-10 rounded-full bg-fd-primary flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-fd-text-primary">{profile.name || "User"}</p>
              <p className="truncate text-[10px] font-bold text-fd-badge-text bg-fd-badge-bg px-1.5 py-0.5 rounded uppercase tracking-wide mt-0.5 inline-block">Free Plan</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-fd-text-secondary hover:text-fd-text-primary hover:bg-white/80 transition-colors"
              aria-label="Sign out"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
