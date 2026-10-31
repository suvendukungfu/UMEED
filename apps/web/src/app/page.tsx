import Link from "next/link";
import {
  FileText,
  Building,
  GitBranch,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Database,
  CheckCircle,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <Sparkles className="h-3 w-3" />
              <span>HackCBS 9.0 Social Innovation Platform</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              UMEED Assistance Coordination Platform
            </h2>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl">
              From distress to real assistance. Transforming passive citizen and social media reports
              into verified, capability-matched NGO response cycles with verified outcomes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/report"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <FileText className="h-4 w-4" />
              <span>Submit Distress Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Core Workflow Pillars */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">
            Closed-Loop Coordination Architecture
          </h3>
          <p className="text-xs text-slate-500">
            Each incident follows an auditable, multi-stage lifecycle to prevent dropped cases.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1: Intake & Triage */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">
              1. Multi-Channel Intake & Triage
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Accepts citizen mobile reports and authorized social media distress discoveries. Gemini multimodal extraction extracts structured condition and location candidates without autonomous diagnosis.
            </p>
            <div className="pt-2 text-[11px] font-medium text-slate-500 border-t border-slate-100 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>Canonical Ingestion Contract (v1.0.0)</span>
            </div>
          </div>

          {/* Pillar 2: Capability Matching */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">
              2. Capability-Aware Matching
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Replaces naive nearest-distance sorting with multi-dimensional scoring: capability alignment, geographic scope, real-time availability, and verified historical track record.
            </p>
            <div className="pt-2 text-[11px] font-medium text-slate-500 border-t border-slate-100 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>3-Tier Verification (Listed, Checked, Verified)</span>
            </div>
          </div>

          {/* Pillar 3: Recursive Coordination */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <GitBranch className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">
              3. Recursive Response & Follow-up
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              If initial first aid or shelter does not fully resolve the crisis, UMEED automatically initiates secondary matching cycles while preserving complete provenance and evidence history.
            </p>
            <div className="pt-2 text-[11px] font-medium text-slate-500 border-t border-slate-100 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>Formal State Machine (REPORTED → RESOLVED)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Modules Quick Access */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Operational Workspaces
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Core navigation to platform features being activated across milestones.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/incidents"
            className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600">Phase 2-3</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                Incident Triage Review
              </h4>
              <p className="text-xs text-slate-500">
                Coordinator review queue for citizen & crawler discoveries.
              </p>
            </div>
          </Link>

          <Link
            href="/ngos"
            className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600">Phase 4</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                NGO Intelligence
              </h4>
              <p className="text-xs text-slate-500">
                Directory and capability mapping for verified responder organizations.
              </p>
            </div>
          </Link>

          <Link
            href="/cases"
            className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600">Phase 5</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                Case Coordination
              </h4>
              <p className="text-xs text-slate-500">
                Active responder dispatch, arrival check-in, and intervention logging.
              </p>
            </div>
          </Link>

          <Link
            href="/analytics"
            className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600">Phase 7</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                Impact Analytics
              </h4>
              <p className="text-xs text-slate-500">
                Historical response latency, district coverage, and unmet needs.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Non-Negotiable Operational Principles */}
      <div className="bg-slate-100 rounded-lg border border-slate-200 p-5 text-xs text-slate-600 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-900 block">
            Operational Safety & Ethical Standard
          </span>
          <p>
            AI outputs are recommendations and never independent medical diagnoses or autonomous dispatches. High-risk reports require human coordinator confirmation before responders are notified. Beneficiary PII is sanitized before external telemetry.
          </p>
        </div>
      </div>
    </div>
  );
}

