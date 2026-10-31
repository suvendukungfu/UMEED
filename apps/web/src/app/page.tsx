"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Building2,
  GitBranch,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Truck,
  HeartHandshake,
  ShieldCheck,
  Lock,
  Layers,
  Activity,
  ChevronRight,
  Compass,
  ArrowUpRight,
  Radar,
  Globe,
} from "lucide-react";
import { ContinuityLine } from "@/components/common/ContinuityLine";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { A1ExperimentModal } from "@/components/context-inspector/A1ExperimentModal";
import { HeroIllustration, DiscoveryRadarVisual } from "@/components/illustrations/VisualIllustrations";

export default function HomePage() {
  const [a1ModalOpen, setA1ModalOpen] = useState(false);

  return (
    <div className="w-full space-y-20 md:space-y-28 pb-20">
      {/* =========================================================================
          SECTION 1: HERO
          ========================================================================= */}
      <section className="relative pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Masthead Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-200/80 border border-sage-300 text-forest-900 text-xs font-semibold tracking-wide shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-forest-800" />
            <span>HackCBS 9.0 — Meko Track A Innovation Platform</span>
          </div>

          {/* Editorial Display Headline */}
          <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-forest-800 leading-[1.08]">
            Help shouldn&apos;t stop <br className="hidden sm:inline" />
            <span className="italic text-coral-500">halfway.</span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-xl text-forest-700/90 max-w-2xl mx-auto leading-relaxed">
            UMEED coordinates humanitarian assistance for vulnerable people and animals —
            ensuring every report is followed through from initial discovery to verified clinical
            or shelter handoff.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-bold text-sm shadow-card hover:shadow-elevated transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            >
              <FileText className="h-4 w-4" />
              <span>Submit Citizen Report</span>
            </Link>

            <Link
              href="/cases"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-subtle hover:shadow transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Launch Mission Control</span>
            </Link>

            <Link
              href="/discovery"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-sage-200 hover:bg-sage-300 text-forest-900 border border-sage-300 font-bold text-sm shadow-2xs transition-all"
            >
              <Radar className="h-4 w-4 text-coral-600" />
              <span>Explore Discovery Radar</span>
            </Link>

            <button
              type="button"
              onClick={() => setA1ModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-paper-surface text-forest-800 border border-warm-grey-300 font-semibold text-sm shadow-2xs hover:border-forest-700 transition-all"
            >
              <Brain className="h-4 w-4 text-coral-500" />
              <span>Run A1 Live Meko Experiment</span>
            </button>
          </div>

          {/* UMEED Architecture Network Visual */}
          <div className="mt-12 max-w-4xl mx-auto rounded-3xl overflow-hidden border border-warm-grey-300 shadow-card bg-paper-surface">
            <HeroIllustration />
          </div>
        </div>

        {/* Signature Concept: The Continuity Line Hero Visualizer */}
        <div id="continuity-line" className="mt-16 md:mt-20 pt-8 border-t border-warm-grey-200">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-coral-600">
                  Signature Concept
                </span>
                <h3 className="text-lg md:text-xl font-bold text-forest-800">
                  The Continuity Line: Zero Dropped Handoffs
                </h3>
              </div>
              <p className="text-xs text-forest-700/80 max-w-sm">
                Each assistance journey maintains continuous operational state until downstream
                reception is cryptographically or staff-verified.
              </p>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-white border border-warm-grey-200 shadow-card">
              <ContinuityLine currentStage="HANDOFF" variant="timeline" />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 1.5: PUBLIC SIGNAL DISCOVERY & GEOSPATIAL RADAR
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-10 rounded-3xl bg-forest-950 text-white relative overflow-hidden shadow-elevated border border-forest-900">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-900 text-coral-400 text-xs font-mono font-bold">
                <Radar className="h-3.5 w-3.5 text-coral-400 animate-pulse" />
                <span>Phase 11: Public Signal Discovery Radar</span>
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl font-bold leading-tight">
                Find the signal. Verify the need. <br />
                <span className="italic text-coral-400">Coordinate the response.</span>
              </h2>
              <p className="text-sm text-sage-200/90 leading-relaxed">
                Before distress turns into tragedy, reports appear on public bulletin boards, NGO notices,
                and open datasets. UMEED&apos;s compliant discovery engine scans approved public feeds, extracts
                actionable distress signals, and maps them across Delhi revenue districts — requiring human
                coordinator verification before active dispatch.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs text-sage-300 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral-400" />
                  RFC 9309 Robots Compliant
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sage-300" />
                  SSRF Protected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sage-300" />
                  Coarsened Privacy Map
                </span>
              </div>
              <div className="pt-4 flex items-center gap-3">
                <Link
                  href="/discovery"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <Radar className="h-4 w-4" />
                  <span>Launch Discovery Radar</span>
                </Link>
                <Link
                  href="/discovery/sources"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-sage-200 font-semibold text-xs border border-forest-800 transition-all"
                >
                  <Globe className="h-4 w-4" />
                  <span>View Source Registry</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-lg rounded-2xl overflow-hidden border border-forest-800 shadow-card">
                <DiscoveryRadarVisual />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: THE COORDINATION GAP
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-forest-900 text-white relative overflow-hidden shadow-elevated">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-800 text-coral-400 text-xs font-mono font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-coral-400" />
                <span>The Humanitarian Coordination Gap</span>
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                Where emergency response fails: <br />
                <span className="italic text-sage-200">The Unverified Drop-off.</span>
              </h2>
              <p className="text-sm sm:text-base text-forest-200/90 leading-relaxed">
                Conventional dispatch platforms celebrate when a volunteer or ambulance arrives
                on scene. But for street animals with compound fractures or abandoned elders in
                hypothermia, <strong>physical pickup without clinical admission is catastrophic</strong>.
                If the trauma hospital is full or the night shelter lacks medical staff, the victim
                is abandoned at the gate.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs text-sage-200 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral-400" />
                  No Unverified Drop-offs
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral-400" />
                  Receiving Facility Gate Enforced
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral-400" />
                  Decoupled Transit & Care
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-3">
              <div className="p-5 rounded-2xl bg-forest-800/90 border border-forest-700 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-coral-400">
                  <span>UNPROTECTED BASELINE</span>
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold">FAILURE POINT</span>
                </div>
                <p className="text-xs text-forest-200">
                  Citizen Reports → Van Dispatched → Patient Picked Up → <strong>Dropped at gate without surgeon on duty</strong>. Case prematurely marked &quot;Completed&quot;.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-forest-800/90 border border-sage-400/50 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-sage-300">
                  <span>UMEED WITH MEKO MEMORY</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">VERIFIED</span>
                </div>
                <p className="text-xs text-forest-100">
                  Meko recalls previous surgical bottleneck → Injects <strong>Receiving Hospital Handoff Checkpoint</strong> → Case remains open until receiving doctor signs intake.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: HOW UMEED WORKS
          ========================================================================= */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-coral-600">
            System Architecture
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-forest-800">
            Closed-Loop Coordination Architecture
          </h2>
          <p className="text-sm sm:text-base text-forest-700/80">
            Three interconnected pillars transform unstructured community cries for help into
            verifiable, multi-stage assistance completions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <Card elevation="card" padding="lg" className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-coral-50 border border-coral-200 flex items-center justify-center text-coral-600">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase text-forest-600 font-bold">Pillar 01</span>
                <h3 className="text-lg font-bold text-forest-800">
                  Multimodal Intake & Triage
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-forest-700/80 leading-relaxed">
                Accepts citizen mobile submissions and crawler discoveries. Google Gemini multimodal
                models extract condition severity, subject type, and coordinates without hallucinating
                medical diagnoses.
              </p>
            </div>
            <div className="pt-4 border-t border-warm-grey-100 text-xs font-mono text-forest-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-600" />
              <span>Zero-drift Zod contracts</span>
            </div>
          </Card>

          {/* Pillar 2 */}
          <Card elevation="card" padding="lg" className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-forest-50 border border-forest-200 flex items-center justify-center text-forest-800">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase text-forest-600 font-bold">Pillar 02</span>
                <h3 className="text-lg font-bold text-forest-800">
                  Capability-Aware Matching
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-forest-700/80 leading-relaxed">
                Replaces naive nearest-distance sorting with a 5-factor scoring model: Capability (30%),
                Geographic Authority (25%), Distance (20%), Live Availability (15%), and Bed/Vehicle Capacity (10%).
              </p>
            </div>
            <div className="pt-4 border-t border-warm-grey-100 text-xs font-mono text-forest-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-600" />
              <span>3-tier NGO verification</span>
            </div>
          </Card>

          {/* Pillar 3 */}
          <Card elevation="card" padding="lg" className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-sage-100 border border-sage-300 flex items-center justify-center text-forest-900">
                <GitBranch className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase text-forest-600 font-bold">Pillar 03</span>
                <h3 className="text-lg font-bold text-forest-800">
                  Recursive Coordination & Follow-Up
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-forest-700/80 leading-relaxed">
                If emergency first aid is completed but animal surgery or elder shelter remains unresolved,
                UMEED automatically triggers secondary coordination cycles until every requirement is met.
              </p>
            </div>
            <div className="pt-4 border-t border-warm-grey-100 text-xs font-mono text-forest-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-600" />
              <span>Recursive state machine</span>
            </div>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: CITIZEN REPORTING & PRIVACY
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-warm-grey-200 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper-muted text-forest-900 text-xs font-mono font-bold">
                <Lock className="h-3.5 w-3.5 text-forest-800" />
                <span>Zero-Trust Citizen Privacy</span>
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-forest-800 leading-tight">
                Report safely. <br />
                Track transparently.
              </h2>
              <p className="text-sm sm:text-base text-forest-700/85 leading-relaxed">
                Citizens in distress or reporting emergencies need safety. UMEED never exposes
                plaintext tracking tokens, never passes secrets in URLs, and hashes citizen tokens
                with SHA-256 immediately upon arrival.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-forest-800">Cryptographic Token Lookup</h4>
                    <p className="text-xs text-forest-700/80">Only the citizen possessing the 128-bit secret can view their case tracking timeline.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-forest-800">Fail-Closed PII Redactor</h4>
                    <p className="text-xs text-forest-700/80">Phone numbers, Aadhaar, PAN, and exact residential addresses are stripped before Meko memory ingestion.</p>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/report"
                  className="inline-flex items-center gap-2 text-sm font-bold text-coral-600 hover:text-coral-700 transition"
                >
                  <span>Experience the citizen reporting flow</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-paper-surface border border-warm-grey-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
                <span className="text-xs font-mono font-bold text-forest-700">LIVE CITIZEN RECEIPT PREVIEW</span>
                <Badge variant="success">HASH PROTECTED</Badge>
              </div>
              <div className="space-y-2 font-mono text-xs text-forest-800">
                <div className="flex justify-between py-1 border-b border-warm-grey-100">
                  <span className="text-forest-600">Public Reference:</span>
                  <span className="font-bold">UMD-82F1-94A0</span>
                </div>
                <div className="flex justify-between py-1 border-b border-warm-grey-100">
                  <span className="text-forest-600">Database Storage:</span>
                  <span className="text-emerald-700 font-bold">SHA-256 HASH ONLY</span>
                </div>
                <div className="flex justify-between py-1 border-b border-warm-grey-100">
                  <span className="text-forest-600">Geolocation:</span>
                  <span>Rohini Sector 11 (Coarse District)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-forest-600">Status:</span>
                  <span className="text-coral-600 font-bold">ASSIGNED TO AMBULANCE</span>
                </div>
              </div>
              <p className="text-[11px] text-forest-600/80 italic">
                Citizen receives a private offline token to query real-time assistance progress without account creation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: INTELLIGENT NGO COORDINATION & REGISTRY
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-coral-600">
              Provider Network
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-forest-800">
              Capability-Aware NGO Network
            </h2>
            <p className="text-sm text-forest-700/80">
              8 seeded synthetic humanitarian organizations across Delhi NCR, verified across ambulance,
              trauma care, night shelter, and elderly rehabilitation capabilities.
            </p>
          </div>
          <div>
            <Link
              href="/ngos"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 hover:text-coral-600 transition"
            >
              <span>Explore full NGO directory</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: "ngo_del_001",
              name: "Delhi Animal Welfare Society",
              category: "Injured Animals",
              district: "North West Delhi",
              verified: "Verified",
              capacity: "Ambulance Ready",
            },
            {
              id: "ngo_del_002",
              name: "South Delhi Homeless Welfare",
              category: "Night Shelter",
              district: "South Delhi",
              verified: "Checked",
              capacity: "18 Beds Free",
            },
            {
              id: "ngo_del_003",
              name: "Prerna Senior Rehabilitation",
              category: "Abandoned Elderly",
              district: "West Delhi",
              verified: "Verified",
              capacity: "Medical Staff On",
            },
            {
              id: "ngo_del_004",
              name: "Sanjivani Mobile Health Clinic",
              category: "Medical Triage",
              district: "Central Delhi",
              verified: "Verified",
              capacity: "Mobile Clinic Live",
            },
          ].map((ngo) => (
            <Card key={ngo.id} elevation="subtle" padding="sm" className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="demo">DEMO DATA</Badge>
                <span className="text-[11px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {ngo.verified}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-forest-800 line-clamp-1">{ngo.name}</h4>
                <p className="text-xs text-forest-600">{ngo.category} • {ngo.district}</p>
              </div>
              <div className="pt-2 border-t border-warm-grey-100 flex items-center justify-between text-xs text-forest-700">
                <span className="font-mono text-[11px]">{ngo.capacity}</span>
                <Link href="/ngos" className="text-coral-600 hover:underline text-[11px] font-semibold">
                  Profile →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: MEKO OPERATIONAL LEARNING & A1 EXPERIMENT
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-warm-grey-200 shadow-card space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral-50 border border-coral-200 text-coral-800 text-xs font-mono font-bold">
              <Brain className="h-3.5 w-3.5 text-coral-600" />
              <span>Meko Challenge Track A Core Feature</span>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-forest-800">
              Persistent Institutional Memory via Meko MCP
            </h2>
            <p className="text-sm sm:text-base text-forest-700/85 leading-relaxed">
              When relief coordinators resolve crises, crucial lessons are often lost to organizational
              amnesia. UMEED connects to the remote Meko Model Context Protocol (Streamable HTTP 2024-11-05)
              to store, recall, and promote operational conventions across coordinator sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-paper-surface border border-warm-grey-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-forest-700">LIVE RETRIEVED MEMORY (REMOTE)</span>
                <span className="text-xs font-mono font-bold text-emerald-700">SCORE: 0.6289</span>
              </div>
              <div className="font-mono text-xs text-forest-800 bg-white p-4 rounded-xl border border-warm-grey-200 space-y-2">
                <div className="text-[11px] text-forest-500">Memory ID: dcf042be-0b29-4afc-a5e2-cb3c87d071b0</div>
                <p className="text-forest-900 font-sans leading-relaxed">
                  &quot;Always verify veterinary hospital admission before marking injured animal rescue completed;
                  transport alone is insufficient for severe trauma cases.&quot;
                </p>
                <div className="text-[10px] text-forest-500">Agent: umeed_curator • Scope: umeed-product-context</div>
              </div>
              <p className="text-xs text-forest-600 leading-relaxed">
                Before reasoning about animal trauma cases, the Matching Agent queries Meko for prior coordinator
                lessons. This recalled memory automatically injects the surgical handoff requirement.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-forest-900 text-white flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-coral-400 font-bold">CONTROLLED A1 EXPERIMENT</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-800 text-sage-200">REPEATABLE</span>
                </div>
                <h3 className="font-editorial text-2xl font-bold leading-tight">
                  Witness the Meko Difference Live
                </h3>
                <p className="text-xs sm:text-sm text-forest-200/90 leading-relaxed">
                  Execute the side-by-side A1 experiment. Watch how UMEED with Meko OFF produces only a
                  single-stage transport match, while Meko ON injects veterinary hospital requirements
                  and creates a mandatory receiving-provider gate.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setA1ModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-bold text-sm shadow-card transition-all"
              >
                <Brain className="h-4 w-4" />
                <span>Open A1 Interactive Comparison Modal</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: CLOSING CALL TO ACTION
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center p-10 sm:p-16 rounded-3xl bg-forest-950 text-white space-y-6 shadow-elevated">
          <div className="h-12 w-12 rounded-2xl bg-coral-500 flex items-center justify-center mx-auto text-white shadow-card">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold max-w-2xl mx-auto leading-tight">
            Ready to coordinate assistance that truly finishes the journey?
          </h2>
          <p className="text-sm sm:text-base text-forest-200/90 max-w-xl mx-auto">
            From the initial citizen report to verified surgical and shelter admission, UMEED
            closes the loop on humanitarian relief.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-bold text-sm shadow-card transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>Submit Distress Report</span>
            </Link>
            <Link
              href="/cases"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm transition-all border border-forest-700"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Launch Mission Control</span>
            </Link>
          </div>
        </div>
      </section>

      {/* A1 Experiment Modal */}
      <A1ExperimentModal
        isOpen={a1ModalOpen}
        onClose={() => setA1ModalOpen(false)}
      />
    </div>
  );
}
