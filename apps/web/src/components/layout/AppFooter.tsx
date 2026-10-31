"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Heart, Github, ExternalLink, Sparkles, Brain } from "lucide-react";
import { HealthIndicator } from "@/components/common/HealthIndicator";

export function AppFooter() {
  return (
    <footer className="w-full bg-forest-900 text-white border-t border-forest-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Manifesto */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-coral-500 text-white flex items-center justify-center font-bold text-lg">
                U
              </div>
              <span className="font-editorial text-2xl font-bold tracking-tight text-white">
                UMEED
              </span>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-forest-800 text-sage-200 border border-forest-700">
                HackCBS 9.0
              </span>
            </div>
            <p className="text-sm text-forest-200/90 max-w-md leading-relaxed">
              Every report deserves a response. Every response deserves a verified handoff. UMEED
              coordinates humanitarian assistance from citizen discovery to verified clinical and
              shelter intake, backed by Meko persistent memory.
            </p>
            <div className="pt-2">
              <HealthIndicator />
            </div>
          </div>

          {/* Navigation Column 1 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sage-300 font-mono">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-sm text-forest-200/80">
              <li>
                <Link href="/report" className="hover:text-coral-400 transition-colors">
                  Citizen Distress Report
                </Link>
              </li>
              <li>
                <Link href="/incidents" className="hover:text-coral-400 transition-colors">
                  Incident Intake & Triage
                </Link>
              </li>
              <li>
                <Link href="/cases" className="hover:text-coral-400 transition-colors">
                  Coordinator Mission Control
                </Link>
              </li>
              <li>
                <Link href="/responder" className="hover:text-coral-400 transition-colors">
                  Field Responder Cockpit
                </Link>
              </li>
              <li>
                <Link href="/ngos" className="hover:text-coral-400 transition-colors">
                  Capability NGO Registry
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-coral-400 transition-colors">
                  Impact Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 2 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sage-300 font-mono">
              Challenge & Technology
            </h4>
            <ul className="space-y-2 text-sm text-forest-200/80">
              <li>
                <Link href="/agent" className="hover:text-coral-400 transition-colors flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-coral-400" />
                  <span>Meko Context Inspector</span>
                </Link>
              </li>
              <li className="text-xs text-forest-300">
                <span>Model: Gemini Multimodal Triage</span>
              </li>
              <li className="text-xs text-forest-300">
                <span>Context: Meko MCP Server (2024-11-05)</span>
              </li>
              <li className="text-xs text-forest-300">
                <span>Framework: Next.js 15 App Router</span>
              </li>
              <li className="text-xs text-forest-300">
                <span>Persistence: Atlas / In-Memory Fail-Safe</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-forest-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-forest-300">
          <div className="flex items-center gap-2">
            <span>Built with care for HackCBS 9.0 — Meko Challenge Track A.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>DATA INTEGRITY: ZERO-FABRICATION CERTIFIED</span>
            <span>WCAG 2.2 AA READY</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
