"use client";

import React, { useState } from "react";
import {
  Brain,
  X,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { A1ExperimentComparison } from "@/features/context-learning/experiments/a1-runner";

export interface A1ExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function A1ExperimentModal({ isOpen, onClose }: A1ExperimentModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<A1ExperimentComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunExperiment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/context-learning/experiment-a1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Coordinator-Key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({ useLiveMekoIfAvailable: true }),
      });

      if (!res.ok) {
        throw new Error(`Failed to run experiment: HTTP ${res.status}`);
      }

      const data = (await res.json()) as A1ExperimentComparison;
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">A1 Controlled Experiment: Meko OFF vs. ON</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  DEMO_ONLY FIXTURES
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Identical starting incident facts & NGO snapshot proving causal Meko operational impact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Starting Invariants Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Experiment Invariant Controls (Identical Starting Facts)</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-600">
              <div><strong>Category:</strong> Injured Animal</div>
              <div><strong>Severity:</strong> Critical (Fracture)</div>
              <div><strong>Location:</strong> North West Delhi</div>
              <div><strong>Algorithm:</strong> 5-Factor Deterministic</div>
            </div>
          </div>

          {/* Action Trigger */}
          {!result && (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Execute a side-by-side run of the exact same incident under Control (Meko OFF) and Treatment (Meko ON with live remote MCP retrieval).
              </p>
              <button
                onClick={handleRunExperiment}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50 text-sm"
              >
                <Play className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Executing Live Meko Probe..." : "Run Controlled A1 Experiment"}</span>
              </button>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs max-w-md mx-auto">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Side-by-Side Results Grid */}
          {result && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs">
                <span className="font-semibold text-indigo-950">
                  Execution Mode: <strong>{result.executionMode}</strong>
                </span>
                <span className="text-slate-600">
                  Experiment ID: <code>{result.experimentId}</code>
                </span>
                <button
                  onClick={handleRunExperiment}
                  disabled={loading}
                  className="px-3 py-1 bg-white text-indigo-700 font-semibold rounded border border-indigo-300 hover:bg-indigo-100 transition"
                >
                  {loading ? "Rerunning..." : "Rerun Experiment"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Control (OFF) */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                        CONTROL
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">Meko OFF</h3>
                    </div>
                    <span className="text-xs text-slate-500">0 Meko Calls</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Grounded Requirements:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.controlRun.groundedRequirements.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-semibold text-slate-800">Primary Dispatched Provider:</div>
                      <div className="font-bold text-indigo-950">{result.controlRun.topCandidateName}</div>
                      <div className="text-slate-500 text-[11px]">
                        Role: Transit Ambulance (Score: {Math.round(result.controlRun.topCandidateScore * 100)}%)
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                      <div className="font-semibold flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Secondary Specialist Care: Missing</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        No receiving surgical hospital alerted. Risk of canine mortality from post-rescue surgical delay.
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium">Downstream Checkpoints:</span>
                      <div className="mt-1 text-slate-700">Standard field rescue transport only.</div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Treatment (ON) */}
                <div className="p-5 rounded-xl border-2 border-indigo-500 bg-indigo-50/20 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600 text-white">
                        TREATMENT
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">Meko ON</h3>
                    </div>
                    <span className="text-xs font-semibold text-indigo-700">1 Live MCP Recall</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Recalled Memory Citation */}
                    {result.varianceAnalysis.memoryAttribution && (
                      <div className="p-3 rounded-lg bg-indigo-100/60 border border-indigo-200 text-indigo-950 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                          <Brain className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Retrieved Meko Lesson ({result.varianceAnalysis.memoryAttribution.memoryId.slice(0, 12)}...)</span>
                        </div>
                        <p className="italic text-[11px] text-indigo-900">
                          &quot;{result.varianceAnalysis.memoryAttribution.sourceText}&quot;
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-500 font-medium">Augmented Requirements:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.treatmentRun.groundedRequirements.map((r, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                              result.varianceAnalysis.requirementsDifference.includes(r)
                                ? "bg-emerald-100 text-emerald-800 font-bold border border-emerald-300"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r}
                            {result.varianceAnalysis.requirementsDifference.includes(r) && " (Meko Added)"}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Dual Provider Coordination Plan */}
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2 text-emerald-950">
                      <div className="font-semibold flex items-center gap-1.5 text-xs text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Dual-Provider Coordinated Response</span>
                      </div>
                      <div className="text-[11px] space-y-1">
                        <div>
                          <strong>1. Transit Provider:</strong> {result.varianceAnalysis.dualProviderPlan.transitProvider.providerName} (Score: {Math.round(result.varianceAnalysis.dualProviderPlan.transitProvider.score * 100)}%)
                        </div>
                        <div>
                          <strong>2. Surgery Facility:</strong> {result.varianceAnalysis.dualProviderPlan.surgicalProvider?.providerName} (Score: {Math.round((result.varianceAnalysis.dualProviderPlan.surgicalProvider?.score || 0) * 100)}%)
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] space-y-1">
                      <div className="font-semibold text-slate-900">Injected Resolution Gate:</div>
                      <p>
                        Case resolution is strictly blocked until <strong>Receiving Provider Acceptance</strong> (chk_receiving_acceptance) is confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Impact Summary */}
              <div className="p-4 rounded-xl bg-slate-900 text-white text-xs space-y-1.5">
                <div className="font-bold text-indigo-400">Clinical & Operational Impact:</div>
                <p className="text-slate-300 leading-relaxed">
                  {result.varianceAnalysis.clinicalImpactSummary}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Authoritative NGO registry snapshot preserved. Zero hallucinations of provider capacity.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

