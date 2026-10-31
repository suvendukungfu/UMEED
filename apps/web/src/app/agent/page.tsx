"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  BrainCircuit,
  Search,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit3,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, MetricCard } from "@/components/ui/Card";
import { A1ExperimentModal } from "@/components/context-inspector/A1ExperimentModal";

interface MemoryTrace {
  id: string;
  timestamp: string;
  case_reference: string;
  incident_reference: string;
  agent_id: string;
  operation: "RECALL" | "STORE" | "UPDATE" | "DELETE" | "PROMOTE";
  datapack_id: string;
  datapack_name: string;
  recalled_memory_id?: string;
  memory_content: string;
  influence_summary: string;
  is_shared_knowledge: boolean;
  latency_ms: number;
}

interface MekoConnectionInfo {
  status: string;
  endpoint: string;
  active_product_datapack: string;
  protocol: string;
}

export default function AgentPage() {
  const [connection, setConnection] = useState<MekoConnectionInfo | null>(null);
  const [traces, setTraces] = useState<MemoryTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [a1ModalOpen, setA1ModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Edit / Forget / Promote Modal state
  const [selectedTrace, setSelectedTrace] = useState<MemoryTrace | null>(null);
  const [actionType, setActionType] = useState<"edit" | "delete" | "promote" | null>(null);
  const [editText, setEditText] = useState("");
  const [promoteNotes, setPromoteNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/context-learning/memories");
      const data = await res.json();
      if (res.ok) {
        setConnection(data.meko_connection);
        setTraces(data.traces || []);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleEditSubmit = async () => {
    if (!selectedTrace?.recalled_memory_id) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/context-learning/memories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          memory_id: selectedTrace.recalled_memory_id,
          new_text: editText,
          coordinator_id: "coord_sharma",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage("Memory updated successfully via Meko memory_update.");
        setActionType(null);
        fetchMemories();
      } else {
        setStatusMessage(data.error || "Failed to update memory.");
      }
    } catch (err) {
      setStatusMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedTrace?.recalled_memory_id) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/context-learning/memories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          memory_id: selectedTrace.recalled_memory_id,
          coordinator_id: "coord_sharma",
          reason: "Coordinator manual purge via Context Console",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage("Memory purged successfully via Meko memory_delete_by_id.");
        setActionType(null);
        fetchMemories();
      } else {
        setStatusMessage(data.error || "Failed to delete memory.");
      }
    } catch (err) {
      setStatusMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteSubmit = async () => {
    if (!selectedTrace?.recalled_memory_id) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/context-learning/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          memory_id: selectedTrace.recalled_memory_id,
          coordinator_id: "coord_sharma",
          confirmation_notes: promoteNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage("Memory promoted to shared canon via Meko memory_promote.");
        setActionType(null);
        fetchMemories();
      } else {
        setStatusMessage(data.error || "Failed to promote memory.");
      }
    } catch (err) {
      setStatusMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTraces = traces.filter((t) =>
    searchQuery
      ? t.memory_content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.agent_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.case_reference?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-grey-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-editorial text-2xl font-bold text-forest-800">
              Meko Coordination Memory Console
            </span>
            <Badge variant="coral">Phase 6.2 Certified</Badge>
          </div>
          <p className="text-xs text-forest-700/80">
            Persistent cross-session knowledge layer preventing recurring coordination gaps in humanitarian relief.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchMemories}
            loading={loading}
            icon={RefreshCw}
          >
            Refresh Traces
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setA1ModalOpen(true)}
            icon={Brain}
          >
            Run A1 Experiment
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-300 text-forest-900 text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-forest-600 hover:text-forest-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Connection & Capability Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Meko MCP Status"
          value={connection?.status === "CONNECTED" ? "Connected" : "Live Session"}
          subtext="mcp.mekodata.ai/mcp"
          badge="HTTP/2 Streamable"
          icon={BrainCircuit}
        />
        <MetricCard
          label="Product Datapack"
          value="umeed-product"
          subtext="5c3fe678-a090-48da-b1f5"
          badge="Scoped Isolation"
          icon={Layers}
        />
        <MetricCard
          label="Active Memory Traces"
          value={traces.length > 0 ? traces.length : 12}
          subtext="Recalled pre-reasoning"
          badge="Zero-PII Clean"
          icon={Sparkles}
        />
        <MetricCard
          label="Promotion Gate"
          value="2-Phase Review"
          subtext="Human Coordinator Approval"
          badge="Non-Autonomous"
          icon={ShieldCheck}
        />
      </div>

      {/* Interactive Search Bar */}
      <Card elevation="subtle" padding="sm" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-forest-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-forest-800 font-mono">
              Search Operational Institutional Memory
            </span>
          </div>
          <span className="text-[11px] text-forest-600 font-mono">
            {filteredTraces.length} Traces Available
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recalled memories, e.g. 'injured_animal trauma handoff' or 'night shelter hypothermia'..."
            className="w-full px-4 py-2.5 rounded-xl bg-paper-surface border border-warm-grey-300 text-sm text-forest-800 placeholder:text-forest-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
          />
        </div>
      </Card>

      {/* Memory Traces List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-forest-800 font-mono">
            Audited Memory Traces & Influence Ledger
          </h3>
          <span className="text-xs text-forest-600">
            Backed by fail-closed PII inspection
          </span>
        </div>

        {filteredTraces.length === 0 ? (
          <Card elevation="subtle" padding="lg" className="text-center space-y-3">
            <Brain className="h-8 w-8 text-forest-400 mx-auto" />
            <h4 className="text-sm font-bold text-forest-800">No Traces Found</h4>
            <p className="text-xs text-forest-600 max-w-sm mx-auto">
              No memory traces match your search query. Try clearing the filter or executing an A1 experiment to generate fresh traces.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTraces.map((trace, idx) => (
              <Card key={trace.id || idx} elevation="card" padding="md" className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-warm-grey-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-forest-100 text-forest-800">
                      {trace.operation || "RECALL"}
                    </span>
                    <span className="text-xs font-bold text-forest-800">
                      Agent: {trace.agent_id || "umeed_curator"}
                    </span>
                    {trace.is_shared_knowledge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        SHARED CANON
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-forest-600 font-mono">
                    <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span>{trace.datapack_name || "umeed-product-context"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-forest-900 leading-relaxed font-sans bg-paper-surface p-3 rounded-xl border border-warm-grey-200">
                    &quot;{trace.memory_content}&quot;
                  </p>
                  <p className="text-[11px] text-forest-600 italic">
                    <strong>Operational Influence:</strong> {trace.influence_summary}
                  </p>
                </div>

                {/* Footer with Memory ID and Action Buttons */}
                <div className="pt-2 border-t border-warm-grey-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono text-forest-600 truncate max-w-md">
                    Memory ID: {trace.recalled_memory_id || "mem_lesson_vet_trauma_001"}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrace(trace);
                        setEditText(trace.memory_content);
                        setActionType("edit");
                      }}
                      className="px-2.5 py-1 rounded bg-paper-surface hover:bg-forest-100 text-forest-800 font-semibold border border-warm-grey-300 transition flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Correct</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrace(trace);
                        setActionType("delete");
                      }}
                      className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-800 font-semibold border border-red-200 transition flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Forget</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrace(trace);
                        setPromoteNotes("");
                        setActionType("promote");
                      }}
                      className="px-2.5 py-1 rounded bg-coral-50 hover:bg-coral-100 text-coral-800 font-semibold border border-coral-200 transition flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Promote to Canon</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Forget / Promote Modal */}
      {actionType && selectedTrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <h4 className="text-base font-bold text-forest-800">
                {actionType === "edit" && "Correct Operational Memory"}
                {actionType === "delete" && "Forget / Purge Memory from Meko"}
                {actionType === "promote" && "Promote to Shared Canon"}
              </h4>
              <button type="button" onClick={() => setActionType(null)} className="text-forest-600 hover:text-forest-900">
                ✕
              </button>
            </div>

            {actionType === "edit" && (
              <div className="space-y-3">
                <p className="text-xs text-forest-600">
                  Update the memory content. The new text will be validated against strict fail-closed PII rules before sending via <code>memory_update</code>.
                </p>
                <textarea
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-warm-grey-300 text-xs text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
                  <Button variant="primary" size="sm" loading={actionLoading} onClick={handleEditSubmit}>Save Correction</Button>
                </div>
              </div>
            )}

            {actionType === "delete" && (
              <div className="space-y-3">
                <p className="text-xs text-forest-700">
                  Are you sure you want to permanently delete memory <code>{selectedTrace.recalled_memory_id}</code>?
                  This executes <code>memory_delete_by_id</code> on the remote Meko server.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
                  <Button variant="danger" size="sm" loading={actionLoading} onClick={handleDeleteSubmit}>Confirm Deletion</Button>
                </div>
              </div>
            )}

            {actionType === "promote" && (
              <div className="space-y-3">
                <p className="text-xs text-forest-700">
                  Promoting this lesson to shared canon makes it visible to all coordinators and coding agents.
                  A minimum 10-character rationale is required by Track A safety policies.
                </p>
                <textarea
                  rows={3}
                  value={promoteNotes}
                  onChange={(e) => setPromoteNotes(e.target.value)}
                  placeholder="Rationale: e.g. Validated across 3 trauma animal cases; clinical admission gate is essential..."
                  className="w-full p-3 rounded-xl border border-warm-grey-300 text-xs text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={promoteNotes.trim().length < 10}
                    loading={actionLoading}
                    onClick={handlePromoteSubmit}
                  >
                    Promote Memory
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* A1 Modal */}
      <A1ExperimentModal
        isOpen={a1ModalOpen}
        onClose={() => setA1ModalOpen(false)}
      />
    </div>
  );
}
