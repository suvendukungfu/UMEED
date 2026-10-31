"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  AlertCircle,
  FilePlus,
  Building2,
  GitPullRequest,
  BrainCircuit,
  BarChart3,
  Truck,
  Sparkles,
  ShieldCheck,
  Brain,
} from "lucide-react";
import { A1ExperimentModal } from "@/components/context-inspector/A1ExperimentModal";

const navigationItems = [
  { name: "Public Overview", href: "/", icon: Home },
  { name: "Case Mission Control", href: "/cases", icon: GitPullRequest },
  { name: "Incident Intake", href: "/incidents", icon: AlertCircle },
  { name: "Field Responder", href: "/responder", icon: Truck },
  { name: "NGO Registry", href: "/ngos", icon: Building2 },
  { name: "Meko Context", href: "/agent", icon: BrainCircuit },
  { name: "Impact Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [a1ModalOpen, setA1ModalOpen] = useState(false);

  return (
    <>
      <aside className="w-64 bg-forest-950 text-white flex flex-col border-r border-forest-900 shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-forest-900 gap-3">
          <Link href="/" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 rounded p-1">
            <div className="h-9 w-9 rounded-xl bg-coral-500 flex items-center justify-center font-bold text-white shadow-sm">
              U
            </div>
            <div>
              <span className="font-editorial text-lg font-bold tracking-tight text-white">
                UMEED
              </span>
              <span className="block text-[10px] text-sage-300 font-mono -mt-1">
                Mission Control
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Sidebar Navigation">
          <div className="px-3 pb-2 text-[10px] font-semibold text-sage-400 uppercase font-mono tracking-wider">
            Operations
          </div>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 ${
                  isActive
                    ? "bg-forest-800 text-white shadow-sm border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-coral-400" : "text-forest-400"
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-semibold text-sage-400 uppercase font-mono tracking-wider">
            Citizen Actions
          </div>
          <Link
            href="/report"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-forest-200/90 hover:bg-forest-900 hover:text-white transition-all"
          >
            <FilePlus className="h-4 w-4 text-coral-400 shrink-0" />
            <span>Submit Report</span>
          </Link>
        </nav>

        {/* Live A1 Meko Launcher Banner */}
        <div className="p-3 border-t border-forest-900 bg-forest-900/50">
          <button
            type="button"
            onClick={() => setA1ModalOpen(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-forest-800/80 hover:bg-forest-800 border border-forest-700/60 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-coral-500/20 text-coral-400 flex items-center justify-center">
                <Brain className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-white group-hover:text-coral-300">
                  A1 Live Experiment
                </span>
                <span className="block text-[10px] text-sage-300">
                  Meko ON vs OFF
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-coral-500/30 text-coral-300">
              Run
            </span>
          </button>
        </div>
      </aside>

      <A1ExperimentModal
        isOpen={a1ModalOpen}
        onClose={() => setA1ModalOpen(false)}
      />
    </>
  );
}
