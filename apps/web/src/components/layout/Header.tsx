"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HealthIndicator } from "@/components/common/HealthIndicator";
import { Shield, Brain, Sparkles, FileText, Menu } from "lucide-react";
import { A1ExperimentModal } from "@/components/context-inspector/A1ExperimentModal";

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const pathname = usePathname();
  const [a1ModalOpen, setA1ModalOpen] = useState(false);

  // Dynamic route titles
  const getRouteTitle = () => {
    if (pathname.startsWith("/cases/")) return "Case Detail Workspace";
    if (pathname === "/cases") return "Coordinator Mission Control";
    if (pathname === "/incidents") return "Incident Intake & Multimodal Triage";
    if (pathname === "/responder") return "Field Operations Cockpit";
    if (pathname === "/ngos") return "Capability-Aware NGO Registry";
    if (pathname === "/agent") return "Meko Coordination Memory";
    if (pathname === "/analytics") return "Historical Impact Analytics";
    return "Assistance Coordination Hub";
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-warm-grey-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded-lg text-forest-800 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div>
            <h1 className="text-sm md:text-base font-bold text-forest-800 tracking-tight">
              {getRouteTitle()}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <HealthIndicator />
          </div>

          <button
            type="button"
            onClick={() => setA1ModalOpen(true)}
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-coral-50 text-coral-800 border border-coral-200 hover:bg-coral-100 transition-colors"
          >
            <Brain className="h-3.5 w-3.5 text-coral-600" />
            <span>A1 Meko Demo</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-forest-800 bg-paper-surface border border-warm-grey-200 px-2.5 py-1.5 rounded-lg">
            <Shield className="h-3.5 w-3.5 text-forest-700" />
            <span>Coordinator View</span>
          </div>
        </div>
      </header>

      <A1ExperimentModal
        isOpen={a1ModalOpen}
        onClose={() => setA1ModalOpen(false)}
      />
    </>
  );
}
