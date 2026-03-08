"use client";

import { Suspense } from "react";
import AppNavSidebar from "../components/AppNavSidebar";
import DashboardLayout from "../components/DashboardLayout";
import DealsNavbar from "../crm/deals/components/DealsNavbar";
import UniboxContent from "./components/UniboxContent";

function UniboxPageContent() {
  return (
    <div className="-mt-[30px]">
      <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
        <DealsNavbar />
        <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
          <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
            <AppNavSidebar />
            <div className="flex-1 unibox-bg-gradient rounded-r-[20px] rounded-l-[0] flex flex-col h-full min-h-0 overflow-hidden relative">
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
                <Suspense
                  fallback={
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                      Loading Unibox...
                    </div>
                  }
                >
                  <UniboxContent embedded />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UniboxPage() {
  return (
    <DashboardLayout fullBleed hideHeader>
      <UniboxPageContent />
    </DashboardLayout>
  );
}
