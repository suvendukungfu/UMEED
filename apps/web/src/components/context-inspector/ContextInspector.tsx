"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  RefreshCw,
  AlertCircle,
  Database,
  History,
  CheckCircle2,
  Play,
} from "lucide-react";
import { DatapackStatusBadge } from "./DatapackStatusBadge";
import { MemoryCard } from "./MemoryCard";
import { MemoryActionModal, MemoryModalAction } from "./MemoryActionModal";
import { A1ExperimentModal } from "./A1ExperimentModal";
import { ContextTraceRecord } from "@/features/context-learning/types";

export interface ContextInspectorProps {
  caseReference?: string;
  incidentReference?: string;
  className?: string;
}

interface ApiResponse {
  meko_connection: {
    status: "CONNECTED" | "UNCONFIGURED" | "DEGRADED";
    endpoint: string;
    active_product_datapack: string;
    protocol: string;
  };
  traces: ContextTraceRecord[];
  total_traces: number;
}

export function ContextInspector({
  caseReference,
  incidentReference,
  className = "",
}: ContextInspectorProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "READS" | "PRIVATE" | "SHARED">("ALL");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showA1Modal, setShowA1Modal] = useState(false);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: MemoryModalAction;
    memoryId: string;
    initialText?: string;
  }>({
    isOpen: false,
    action: "UPDATE",
    memoryId: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/context-learning/memories", window.location.origin);
      if (caseReference) url.searchParams.set("caseReference", caseReference);
      if (incidentReference) url.searchParams.set("incidentReference", incidentReference);

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as ApiResponse;
        setData(json);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [caseReference, incidentReference]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActionSuccess = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
    fetchData();
  };

  const traces = data?.traces || [];
  const connection = data?.meko_connection || {
    status: "UNCONFIGURED" as const,
    endpoint: "https://mcp.mekodata.ai/mcp",
    active_product_datapack: "unconfigured",
    protocol: "MCP Streamable HTTP / 2024-11-05",
  };

  const filteredTraces = traces.filter((t) => {
    if (activeTab === "READS") return t.operation === "READ";
    if (activeTab === "PRIVATE") return !t.is_shared_knowledge;
    if (activeTab === "SHARED") return t.is_shared_knowledge;
    return true;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Meko Context Inspector
            </h2>
            <p className="text-xs text-slate-500">
              Auditable operational memory & grounded reasoning trace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowA1Modal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Run A1 Experiment (OFF vs ON)</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh Trace</span>
          </button>
        </div>
      </div>

      {/* Datapack Badge */}
      <DatapackStatusBadge
        status={connection.status}
        datapackId={connection.active_product_datapack}
        protocol={connection.protocol}
      />

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-lg shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Unconfigured / Unavailable Warning Banner */}
      {connection.status !== "CONNECTED" && (
        <div className="flex items-start gap-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Meko Remote Connection Awaiting Configuration</p>
            <p className="text-amber-800">
              `MEKO_API_KEY` is currently unconfigured or pending entry in <code>.env.local</code>. UMEED operates reliably using its deterministic baseline matching rules and offline memory fixtures.
            </p>
          </div>
        </div>
      )}

      {/* Tab Filter */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-2 font-medium border-b-2 transition ${
            activeTab === "ALL"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          All Operations ({traces.length})
        </button>
        <button
          onClick={() => setActiveTab("READS")}
          className={`px-3 py-2 font-medium border-b-2 transition ${
            activeTab === "READS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Context Recalls ({traces.filter((t) => t.operation === "READ").length})
        </button>
        <button
          onClick={() => setActiveTab("SHARED")}
          className={`px-3 py-2 font-medium border-b-2 transition ${
            activeTab === "SHARED"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Shared Knowledge ({traces.filter((t) => t.is_shared_knowledge).length})
        </button>
        <button
          onClick={() => setActiveTab("PRIVATE")}
          className={`px-3 py-2 font-medium border-b-2 transition ${
            activeTab === "PRIVATE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Private Memory ({traces.filter((t) => !t.is_shared_knowledge).length})
        </button>
      </div>

      {/* Trace List or Empty State */}
      {filteredTraces.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-2">
          <History className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-xs font-medium text-slate-600">No context learning traces recorded for this scope</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Traces are recorded automatically when the Matching Agent, Follow-Up Agent, or Knowledge Curator interacts with Meko.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTraces.map((trace) => (
            <MemoryCard
              key={trace.trace_id}
              trace={trace}
              onEdit={(memId, curText) =>
                setModalState({
                  isOpen: true,
                  action: "UPDATE",
                  memoryId: memId,
                  initialText: curText,
                })
              }
              onDelete={(memId) =>
                setModalState({
                  isOpen: true,
                  action: "DELETE",
                  memoryId: memId,
                })
              }
              onPromote={(memId) =>
                setModalState({
                  isOpen: true,
                  action: "PROMOTE",
                  memoryId: memId,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Action Modal */}
      <MemoryActionModal
        isOpen={modalState.isOpen}
        action={modalState.action}
        memoryId={modalState.memoryId}
        initialText={modalState.initialText}
        caseReference={caseReference}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={handleActionSuccess}
      />

      {/* A1 Experiment Modal */}
      <A1ExperimentModal
        isOpen={showA1Modal}
        onClose={() => setShowA1Modal(false)}
      />
    </div>
  );
}

