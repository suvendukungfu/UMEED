"use client";

import React from "react";
import {
  FileText,
  Sparkles,
  Building2,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Clock,
  ArrowRight,
} from "lucide-react";

export type ContinuityStage =
  | "REPORT"
  | "TRIAGE"
  | "COORDINATION"
  | "RESCUE"
  | "HANDOFF"
  | "VERIFIED_COMPLETION";

export type StageState = "completed" | "active" | "pending" | "blocked";

export interface ContinuityStageInfo {
  id: ContinuityStage;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CONTINUITY_STAGES: ContinuityStageInfo[] = [
  {
    id: "REPORT",
    label: "Citizen Report",
    shortLabel: "Report",
    description: "Multichannel intake with SHA-256 token hashing",
    icon: FileText,
  },
  {
    id: "TRIAGE",
    label: "Multimodal Triage",
    shortLabel: "Triage",
    description: "Gemini severity & condition extraction",
    icon: Sparkles,
  },
  {
    id: "COORDINATION",
    label: "Capability Match",
    shortLabel: "Coordination",
    description: "Multi-dimensional matching across NGO capabilities",
    icon: Building2,
  },
  {
    id: "RESCUE",
    label: "Field Response",
    shortLabel: "Rescue",
    description: "Dispatch, transit, and on-scene intervention",
    icon: Truck,
  },
  {
    id: "HANDOFF",
    label: "Verified Handoff",
    shortLabel: "Handoff",
    description: "Receiving-provider clinical or shelter admission gate",
    icon: ShieldCheck,
  },
  {
    id: "VERIFIED_COMPLETION",
    label: "Closed Resolution",
    shortLabel: "Completion",
    description: "Outcome verified with human coordinator review",
    icon: CheckCircle2,
  },
];

interface ContinuityLineProps {
  currentStage?: ContinuityStage;
  stageStates?: Partial<Record<ContinuityStage, StageState>>;
  variant?: "hero" | "timeline" | "compact";
  interactive?: boolean;
  onStageSelect?: (stage: ContinuityStage) => void;
  className?: string;
}

export function ContinuityLine({
  currentStage = "COORDINATION",
  stageStates,
  variant = "timeline",
  interactive = false,
  onStageSelect,
  className = "",
}: ContinuityLineProps) {
  // Determine fallback stage states based on currentStage index
  const currentIndex = CONTINUITY_STAGES.findIndex((s) => s.id === currentStage);

  const getStageState = (stageId: ContinuityStage, index: number): StageState => {
    if (stageStates && stageStates[stageId]) {
      return stageStates[stageId]!;
    }
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "active";
    return "pending";
  };

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1 overflow-x-auto py-1 ${className}`} role="progressbar" aria-label="Assistance Continuity Progress">
        {CONTINUITY_STAGES.map((stage, idx) => {
          const state = getStageState(stage.id, idx);
          const Icon = stage.icon;
          return (
            <React.Fragment key={stage.id}>
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  state === "completed"
                    ? "bg-forest-100 text-forest-800 border border-forest-300"
                    : state === "active"
                    ? "bg-coral-500 text-white font-semibold shadow-sm"
                    : state === "blocked"
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : "bg-paper-muted text-forest-600/70 border border-warm-grey-200"
                }`}
                title={`${stage.label}: ${state}`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">{stage.shortLabel}</span>
              </div>
              {idx < CONTINUITY_STAGES.length - 1 && (
                <div
                  className={`h-0.5 w-2 shrink-0 ${
                    idx < currentIndex ? "bg-forest-500" : "bg-warm-grey-300"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop / Tablet Horizontal Flow */}
      <div className="relative">
        {/* Background track line */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-7 left-6 right-6 h-0.5 bg-warm-grey-200 z-0"
        />

        {/* Dynamic active track progress */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-7 left-6 h-0.5 bg-gradient-to-r from-forest-700 via-forest-600 to-coral-500 transition-all duration-500 z-0"
          style={{
            width: `${Math.max(0, Math.min(100, (currentIndex / (CONTINUITY_STAGES.length - 1)) * 100))}%`,
          }}
        />

        <ol className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-2 relative z-10 list-none p-0 m-0">
          {CONTINUITY_STAGES.map((stage, idx) => {
            const state = getStageState(stage.id, idx);
            const Icon = stage.icon;
            const isClickable = interactive && !!onStageSelect;

            return (
              <li
                key={stage.id}
                onClick={() => isClickable && onStageSelect(stage.id)}
                className={`group flex flex-col p-3 rounded-xl border transition-all ${
                  isClickable ? "cursor-pointer hover:border-forest-600 hover:shadow-card" : ""
                } ${
                  state === "completed"
                    ? "bg-white border-forest-200 shadow-subtle"
                    : state === "active"
                    ? "bg-white border-coral-500 shadow-card ring-1 ring-coral-500/30"
                    : state === "blocked"
                    ? "bg-red-50/70 border-red-300"
                    : "bg-paper-surface/60 border-warm-grey-200 text-forest-700/60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${
                      state === "completed"
                        ? "bg-forest-800 text-white"
                        : state === "active"
                        ? "bg-coral-500 text-white animate-continuity-glow"
                        : state === "blocked"
                        ? "bg-red-600 text-white"
                        : "bg-paper-muted text-forest-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      state === "completed"
                        ? "bg-forest-100 text-forest-800 font-semibold"
                        : state === "active"
                        ? "bg-coral-100 text-coral-800 font-bold"
                        : state === "blocked"
                        ? "bg-red-100 text-red-800 font-bold"
                        : "text-forest-600/70"
                    }`}
                  >
                    {state === "completed" ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Done
                      </span>
                    ) : state === "active" ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 animate-spin" />
                        Active
                      </span>
                    ) : state === "blocked" ? (
                      <span className="flex items-center gap-1">
                        <AlertOctagon className="h-2.5 w-2.5" />
                        Gate
                      </span>
                    ) : (
                      `Step 0${idx + 1}`
                    )}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4
                    className={`text-xs font-bold tracking-tight ${
                      state === "active"
                        ? "text-coral-600"
                        : state === "completed"
                        ? "text-forest-800"
                        : "text-forest-700"
                    }`}
                  >
                    {stage.label}
                  </h4>
                  <p className="text-[11px] text-forest-700/80 leading-snug line-clamp-2">
                    {stage.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
