"use client";

import { HealthIndicator } from "@/components/common/HealthIndicator";
import { Shield } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-900 tracking-tight">
          Assistance Coordination Hub
        </h1>
        <span className="hidden sm:inline-block text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          HackCBS 9.0 MVP
        </span>
      </div>

      <div className="flex items-center gap-4">
        <HealthIndicator />
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          <span>Coordinator View</span>
        </div>
      </div>
    </header>
  );
}

