"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Menu,
  X,
  FileText,
  Activity,
  Building2,
  Brain,
  Truck,
  Radar,
} from "lucide-react";
import { HealthIndicator } from "@/components/common/HealthIndicator";
import { Button } from "@/components/ui/Button";

interface AppNavbarProps {
  onOpenA1Modal?: () => void;
}

export function AppNavbar({ onOpenA1Modal }: AppNavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-paper/95 backdrop-blur-md border-b border-warm-grey-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800 rounded-lg p-1">
          <div className="h-10 w-10 rounded-xl bg-forest-800 text-white flex items-center justify-center font-bold text-xl shadow-subtle group-hover:bg-forest-900 transition-colors">
            U
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-editorial text-2xl font-bold tracking-tight text-forest-800">
                UMEED
              </span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-sage-200 text-forest-900">
                Meko Track A
              </span>
            </div>
            <p className="text-[11px] text-forest-700 font-medium -mt-1 hidden sm:block">
              Every report deserves a verified handoff
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          <Link
            href="/#how-it-works"
            className="text-sm font-semibold text-forest-800 hover:text-coral-500 transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/#continuity-line"
            className="text-sm font-semibold text-forest-800 hover:text-coral-500 transition-colors"
          >
            Continuity Line
          </Link>
          <Link
            href="/discovery"
            className="text-sm font-semibold text-forest-800 hover:text-coral-500 transition-colors flex items-center gap-1.5"
          >
            <Radar className="h-4 w-4 text-coral-500" />
            <span>Discovery Radar</span>
          </Link>
          <Link
            href="/ngos"
            className="text-sm font-semibold text-forest-800 hover:text-coral-500 transition-colors"
          >
            NGO Registry
          </Link>
          <button
            type="button"
            onClick={onOpenA1Modal}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-800 hover:text-coral-500 transition-colors"
          >
            <Brain className="h-4 w-4 text-forest-800" />
            <span>A1 Live Meko</span>
          </button>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/cases"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-forest-800 hover:bg-forest-100/60 transition-colors border border-warm-grey-300"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-forest-700" />
            <span>Mission Control</span>
          </Link>

          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Report Distress</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href="/report"
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-coral-500 shadow-sm"
          >
            Report
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-forest-800 hover:bg-forest-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-warm-grey-200 bg-paper-surface px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-forest-800 hover:bg-forest-100"
            >
              Overview
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-forest-800 hover:bg-forest-100"
            >
              How It Works
            </Link>
            <Link
              href="/#continuity-line"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-forest-800 hover:bg-forest-100"
            >
              Continuity Line
            </Link>
            <Link
              href="/report"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-bold text-coral-600 hover:bg-coral-50"
            >
              Submit Citizen Report
            </Link>
            <Link
              href="/discovery"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-coral-600 hover:bg-coral-50 flex items-center gap-1.5"
            >
              <Radar className="h-4 w-4" />
              <span>Discovery Radar</span>
            </Link>
            <Link
              href="/cases"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-forest-800 hover:bg-forest-100"
            >
              Coordinator Mission Control
            </Link>
            <Link
              href="/responder"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-forest-800 hover:bg-forest-100"
            >
              Field Responder Cockpit
            </Link>
            <Link
              href="/ngos"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-forest-800 hover:bg-forest-100"
            >
              NGO Registry
            </Link>
            <Link
              href="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-forest-800 hover:bg-forest-100"
            >
              Impact Analytics
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
