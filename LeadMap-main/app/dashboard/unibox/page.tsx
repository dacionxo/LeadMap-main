"use client";

import { Suspense } from "react";
import DashboardLayout from "../components/DashboardLayout";
import UniboxContent from "./components/UniboxContent";
import "./unibox-styles.css";

function UniboxPageContent() {
  return (
    <div className="unibox-page bg-unibox-background-light text-slate-900 min-h-screen flex items-center justify-center p-6 lg:p-12">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <div className="unibox-glass w-full max-w-[1400px] h-[850px] rounded-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] flex overflow-hidden border border-white/40">
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
  );
}

export default function UniboxPage() {
  return (
    <DashboardLayout fullBleed hideHeader>
      <UniboxPageContent />
    </DashboardLayout>
  );
}
