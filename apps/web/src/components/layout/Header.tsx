"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HealthIndicator } from "@/components/common/HealthIndicator";
import { Shield, Brain, Sparkles, FileText, Menu, Bell, User, LogOut, ChevronDown } from "lucide-react";
import { A1ExperimentModal } from "@/components/context-inspector/A1ExperimentModal";
import { useAuth } from "@/features/auth/context/auth-context";

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const { context, signOut } = useAuth();
  const [a1ModalOpen, setA1ModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Dynamic route titles
  const getRouteTitle = () => {
    if (pathname.startsWith("/app/ngo/onboarding")) return "NGO Verification Lifecycle";
    if (pathname.startsWith("/app/ngo/requests")) return "NGO Wave Offers Queue";
    if (pathname.startsWith("/app/ngo/cases")) return "NGO Active Cases Workspace";
    if (pathname.startsWith("/app/ngo/capacity")) return "NGO Capacity & Availability";
    if (pathname.startsWith("/app/ngo/team")) return "NGO Staff & Responder Roster";
    if (pathname.startsWith("/app/ngo")) return "NGO Operational Mission Control";
    if (pathname.startsWith("/app/coordinator")) return "Coordinator Triage Control";
    if (pathname.startsWith("/app/responder")) return "Field Responder Cockpit";
    if (pathname.startsWith("/app/admin")) return "Platform Administration Portal";
    if (pathname.startsWith("/app/audit")) return "Compliance & Audit Explorer";
    if (pathname.startsWith("/app/citizen")) return "Citizen Assistance Portal";
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
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-coral-50 text-coral-800 border border-coral-200 hover:bg-coral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
          >
            <Brain className="h-3.5 w-3.5 text-coral-600" />
            <span>A1 Meko Demo</span>
          </button>

          {context ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-warm-grey-200 hover:bg-paper-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                <div className="h-7 w-7 rounded-lg bg-forest-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {context.user.name.charAt(0)}
                </div>
                <div className="hidden md:block text-left pr-1">
                  <div className="text-xs font-bold text-forest-900 leading-tight">
                    {context.user.name}
                  </div>
                  <div className="text-[10px] text-coral-700 font-mono font-semibold">
                    {context.session.activeRole}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-forest-500" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-warm-grey-200 shadow-xl py-2 z-50 animate-scale-up">
                  <div className="px-4 py-2 border-b border-warm-grey-100">
                    <span className="text-[10px] uppercase font-mono font-bold text-forest-500 block">
                      Active Organization
                    </span>
                    <span className="text-xs font-bold text-forest-900 block truncate">
                      {context.activeOrganization?.name || "Platform Staff"}
                    </span>
                  </div>

                  <Link
                    href="/auth/sign-in"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-forest-800 hover:bg-paper transition-colors font-medium"
                  >
                    <User className="h-4 w-4 text-forest-600" />
                    <span>Switch Tenant / Role</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-coral-700 hover:bg-coral-50 transition-colors font-semibold border-t border-warm-grey-100 mt-1"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-forest-900 text-white hover:bg-forest-800 transition-colors shadow-xs"
            >
              <User className="h-3.5 w-3.5" />
              <span>Portal Login</span>
            </Link>
          )}
        </div>
      </header>

      <A1ExperimentModal
        isOpen={a1ModalOpen}
        onClose={() => setA1ModalOpen(false)}
      />
    </>
  );
}
