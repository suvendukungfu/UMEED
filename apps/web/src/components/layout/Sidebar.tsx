"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  AlertCircle,
  FilePlus,
  Building2,
  GitPullRequest,
  BrainCircuit,
  BarChart3,
  Truck,
  ShieldCheck,
  Brain,
  Radar,
  LogOut,
  LogIn,
  User,
  Search,
  Bell,
  Layers,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/auth-context";
import { A1ExperimentModal } from "@/components/context-inspector/A1ExperimentModal";

const baseNavigationItems = [
  { name: "Public Overview", href: "/", icon: Home },
  { name: "Track Distress", href: "/track", icon: Search },
  { name: "Signal Discovery", href: "/discovery", icon: Radar },
  { name: "Case Mission Control", href: "/cases", icon: GitPullRequest },
  { name: "Incident Intake", href: "/incidents", icon: AlertCircle },
  { name: "Field Responder", href: "/responder", icon: Truck },
  { name: "NGO Registry", href: "/ngos", icon: Building2 },
  { name: "Meko Context", href: "/agent", icon: BrainCircuit },
  { name: "Impact Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const { context, signOut } = useAuth();
  const [a1ModalOpen, setA1ModalOpen] = useState(false);

  const activeRole = context?.session.activeRole;
  const isNgoRole = activeRole && ["NGO_OWNER", "NGO_ADMIN", "NGO_OPERATOR"].includes(activeRole);

  return (
    <>
      <aside className="w-64 bg-forest-950 text-white flex flex-col border-r border-forest-900 shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-forest-900 gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 rounded p-1"
          >
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

        {/* User Identity / Session Bar */}
        <div className="px-4 py-3 border-b border-forest-900 bg-forest-900/40">
          {context ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                  {context.user.name}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-coral-500/20 text-coral-300 font-bold">
                  {context.session.activeRole}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-sage-300">
                <span className="truncate max-w-[150px]">
                  {context.activeOrganization?.name || "Platform Staff"}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-sage-400 hover:text-white p-0.5"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/auth/sign-in"
              className="flex items-center justify-between p-2 rounded-xl bg-forest-800 hover:bg-forest-700 text-xs font-semibold text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-coral-400" />
                <span>Portal Sign-In</span>
              </div>
              <LogIn className="h-3.5 w-3.5 text-sage-300" />
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Sidebar Navigation">
          {/* NGO Workspace Dedicated Section */}
          {isNgoRole && (
            <div className="mb-4 pb-3 border-b border-forest-900">
              <div className="px-3 pb-2 text-[10px] font-semibold text-coral-400 uppercase font-mono tracking-wider flex items-center justify-between">
                <span>NGO Portal</span>
                <span className="text-[9px] px-1 rounded bg-coral-500/20 text-coral-300">
                  TENANT
                </span>
              </div>
              <Link
                href="/app/ngo"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  pathname === "/app/ngo"
                    ? "bg-forest-800 text-white border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <Building2 className="h-4 w-4 text-coral-400" />
                <span>NGO Dashboard</span>
              </Link>
              <Link
                href="/app/ngo/requests"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith("/app/ngo/requests")
                    ? "bg-forest-800 text-white border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <Bell className="h-4 w-4 text-coral-400" />
                <span>Incoming Offers</span>
              </Link>
              <Link
                href="/app/ngo/cases"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith("/app/ngo/cases")
                    ? "bg-forest-800 text-white border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <Truck className="h-4 w-4 text-coral-400" />
                <span>Active Cases</span>
              </Link>
              <Link
                href="/app/ngo/capacity"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith("/app/ngo/capacity")
                    ? "bg-forest-800 text-white border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <Layers className="h-4 w-4 text-coral-400" />
                <span>Capacity Manager</span>
              </Link>
              <Link
                href="/app/ngo/team"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith("/app/ngo/team")
                    ? "bg-forest-800 text-white border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <Users className="h-4 w-4 text-coral-400" />
                <span>Staff & Responders</span>
              </Link>
            </div>
          )}

          {/* Role Workspaces Quick Access */}
          {activeRole === "COORDINATOR" && (
            <div className="mb-3 pb-2 border-b border-forest-900">
              <div className="px-3 pb-1.5 text-[10px] font-semibold text-coral-400 uppercase font-mono tracking-wider">
                Coordinator Tools
              </div>
              <Link
                href="/app/coordinator"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  pathname === "/app/coordinator"
                    ? "bg-forest-800 text-white border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <GitPullRequest className="h-4 w-4 text-coral-400" />
                <span>Triage Mission Control</span>
              </Link>
            </div>
          )}

          {activeRole === "PLATFORM_ADMIN" && (
            <div className="mb-3 pb-2 border-b border-forest-900">
              <div className="px-3 pb-1.5 text-[10px] font-semibold text-coral-400 uppercase font-mono tracking-wider">
                Administration
              </div>
              <Link
                href="/app/admin"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  pathname === "/app/admin"
                    ? "bg-forest-800 text-white border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-coral-400" />
                <span>Platform Admin</span>
              </Link>
            </div>
          )}

          {activeRole === "AUDITOR" && (
            <div className="mb-3 pb-2 border-b border-forest-900">
              <div className="px-3 pb-1.5 text-[10px] font-semibold text-coral-400 uppercase font-mono tracking-wider">
                Compliance Oversight
              </div>
              <Link
                href="/app/audit"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  pathname === "/app/audit"
                    ? "bg-forest-800 text-white border-l-2 border-coral-500"
                    : "text-forest-200/80 hover:bg-forest-900 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-coral-400" />
                <span>Audit Explorer</span>
              </Link>
            </div>
          )}

          <div className="px-3 pb-2 text-[10px] font-semibold text-sage-400 uppercase font-mono tracking-wider">
            Platform Modules
          </div>
          {baseNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 ${
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

          <div className="pt-3 px-3 pb-2 text-[10px] font-semibold text-sage-400 uppercase font-mono tracking-wider">
            Public Emergency
          </div>
          <Link
            href="/report"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-forest-200/90 hover:bg-forest-900 hover:text-white transition-all"
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
