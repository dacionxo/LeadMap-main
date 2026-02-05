"use client";

import { useApp } from "@/app/providers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";

export default function BillingPage() {
  const { profile } = useApp();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !profile) {
      router.push("/");
    }
  }, [mounted, profile, router]);

  if (!mounted || !profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Billing & Plans
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your subscription and billing. Content will be added here
            later.
          </p>
        </div>
        <div className="bg-neutral-light dark:bg-neutral-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This page is under construction.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
