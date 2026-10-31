"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertCircle,
  FilePlus,
  Building2,
  GitPullRequest,
  BrainCircuit,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

const navigationItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Submit Report", href: "/report", icon: FilePlus },
  { name: "Incident Intake", href: "/incidents", icon: AlertCircle },
  { name: "NGO Registry", href: "/ngos", icon: Building2 },
  { name: "Case Coordination", href: "/cases", icon: GitPullRequest },
  { name: "Coordination Memory", href: "/agent", icon: BrainCircuit },
  { name: "Impact Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
          U
        </div>
        <div>
          <span className="font-bold tracking-tight text-lg text-white">UMEED</span>
          <span className="block text-[11px] text-slate-400 font-medium -mt-1">
            Social Assistance OS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Platform Operations
        </div>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>HackCBS 9.0 Candidate</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          Version 1.0.0 (Phase 1)
        </div>
      </div>
    </aside>
  );
}

