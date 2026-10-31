"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Building2,
  FileCheck,
  Send,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  History,
  Info,
  ShieldCheck,
  Truck,
  Sparkles,
  Heart,
  Plus,
  RefreshCw,
  AlertOctagon,
} from "lucide-react";
import { ContinuityLine, ContinuityStage } from "@/components/common/ContinuityLine";
import { ContextInspector } from "@/components/context-inspector";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card, MetricCard } from "@/components/ui/Card";

interface CaseDetail {
  case_id: string;
  incident_id: string;
  incident_reference: string;
  public_case_reference: string;
  case_status: string;
  assistance_requirements: string[];
  unresolved_requirements: string[];
  assignments: Array<{
    assignment_id: string;
    organisation_id: string;
    organisation_name: string;
    requirement: string;
    matching_cycle: number;
    status: string;
    assigned_by: string;
    assigned_at: string;
    response_deadline: string;
    accepted_at?: string;
    rejected_at?: string;
    rejection_reason?: string;
    info_requested?: string;
    en_route_at?: string;
    arrived_at?: string;
    completed_at?: string;
    contact_attempts: Array<{
      attempt_id: string;
      channel: string;
      status: string;
      details: string;
      initiated_at: string;
    }>;
  }>;
  interventions: Array<{
    intervention_id: string;
    assignment_id: string;
    organisation_id: string;
    intervention_type: string;
    description: string;
    assistance_provided: string[];
    evidence_references: Array<{ type: string; url: string; notes?: string }>;
    additional_needs: string[];
    performed_at: string;
    submitted_by: string;
  }>;
  current_matching_cycle: number;
  max_matching_cycles: number;
  approved_at: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_evidence: string[];
  resolution_decision?: {
    decision: string;
    rationale: string;
    resolved_by: string;
    timestamp: string;
  } | null;
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseReference = params?.caseReference as string;

  const [caseRecord, setCaseRecord] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [targetRequirement, setTargetRequirement] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);

  // Resolution Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionRationale, setResolutionRationale] = useState("");
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState("");
  const [overrideUnresolved, setOverrideUnresolved] = useState(false);

  const fetchCaseDetail = useCallback(async () => {
    if (!caseReference) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/cases/${caseReference}`, {
        headers: { "x-coordinator-key": "umeed-coordinator-dev-key" },
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.case) {
        setCaseRecord(data.data.case);
        if (data.data.case.unresolved_requirements.length > 0) {
          setTargetRequirement(data.data.case.unresolved_requirements[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load case detail:", err);
    } finally {
      setLoading(false);
    }
  }, [caseReference]);

  const fetchMatches = async () => {
    if (!caseReference) return;
    try {
      const res = await fetch(`/api/cases/${caseReference}/match`, {
        method: "POST",
        headers: { "x-coordinator-key": "umeed-coordinator-dev-key" },
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.match_result?.candidates) {
        setCandidates(data.data.match_result.candidates.filter((c: any) => c.eligible));
      }
    } catch (err) {
      console.error("Failed to fetch matches:", err);
    }
  };

  useEffect(() => {
    fetchCaseDetail();
  }, [fetchCaseDetail]);

  const handleOpenAssignModal = () => {
    setShowAssignModal(true);
    fetchMatches();
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !targetRequirement) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseReference}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          organisation_id: selectedOrgId,
          requirement: targetRequirement,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setShowAssignModal(false);
        fetchCaseDetail();
        setActionMessage("Provider assigned successfully with 30-minute response SLA.");
      } else {
        setActionMessage(data.error?.message || "Failed to assign organisation");
      }
    } catch (err) {
      setActionMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFollowUpCycle = async () => {
    if (!caseRecord) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseReference}/follow-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchCaseDetail();
        setActionMessage(
          `Cycle incremented to ${data.data.matching_cycle}. Secondary matching initialized.`
        );
      } else {
        setActionMessage(data.error?.message || "Failed to initiate follow-up cycle");
      }
    } catch (err) {
      setActionMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionRationale.trim()) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseReference}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          rationale: resolutionRationale.trim(),
          evidence_url: resolutionEvidenceUrl.trim() || undefined,
          override_unresolved: overrideUnresolved,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setShowResolveModal(false);
        fetchCaseDetail();
        setActionMessage("Case formally resolved with verified coordinator sign-off.");
      } else {
        setActionMessage(
          data.error?.message || "Resolution rejected: verify receiving provider handoff."
        );
      }
    } catch (err) {
      setActionMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenCase = async () => {
    const reason = prompt("Enter rationale for reopening this case:");
    if (!reason) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseReference}/reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchCaseDetail();
        setActionMessage("Case successfully reopened for follow-up coordination.");
      } else {
        setActionMessage(data.error?.message || "Failed to reopen case");
      }
    } catch (err) {
      setActionMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const mapCaseStatusToStage = (status: string): ContinuityStage => {
    switch (status) {
      case "APPROVED":
        return "REPORT";
      case "MATCHING":
        return "COORDINATION";
      case "RESPONDERS_CONTACTED":
      case "ACCEPTED":
      case "RESPONDER_ARRIVED":
      case "INTERVENTION_PROVIDED":
        return "RESCUE";
      case "FOLLOW_UP_REQUIRED":
        return "HANDOFF";
      case "RESOLVED":
        return "VERIFIED_COMPLETION";
      default:
        return "COORDINATION";
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-forest-600 text-sm">
        Loading case workspace...
      </div>
    );
  }

  if (!caseRecord) {
    return (
      <Card elevation="subtle" padding="lg" className="max-w-lg mx-auto text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-coral-500 mx-auto" />
        <h3 className="text-base font-bold text-forest-800">Case Record Not Found</h3>
        <p className="text-xs text-forest-600">
          The requested case reference does not exist or has been archived.
        </p>
        <Link href="/cases">
          <Button variant="outline" size="sm">
            Back to Case Workspace
          </Button>
        </Link>
      </Card>
    );
  }

  // Detect whether downstream receiving handoff is needed
  const requiresReceivingHandoff =
    caseRecord.assistance_requirements.some((r) =>
      ["veterinary_care", "medical_triage", "night_shelter", "hospital_intake"].includes(r)
    ) || caseRecord.case_status === "FOLLOW_UP_REQUIRED";

  const isHandoffVerified = caseRecord.case_status === "RESOLVED";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="space-y-4 pb-4 border-b border-warm-grey-200">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-600 hover:text-forest-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Case Workspace</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-forest-800 text-white flex items-center justify-center font-bold text-sm shadow-subtle">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-mono text-xl md:text-2xl font-bold text-forest-800">
                  {caseRecord.public_case_reference}
                </h1>
                <StatusBadge status={caseRecord.case_status} />
                <span className="text-xs bg-paper-surface text-forest-800 px-2 py-0.5 rounded-md border border-warm-grey-300 font-mono">
                  Cycle {caseRecord.current_matching_cycle}/{caseRecord.max_matching_cycles}
                </span>
              </div>
              <p className="text-xs text-forest-600 font-mono mt-0.5">
                Linked Incident:{" "}
                <Link href="/incidents" className="text-coral-600 font-bold hover:underline">
                  {caseRecord.incident_reference}
                </Link>{" "}
                • Approved {new Date(caseRecord.approved_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 flex-wrap">
            {caseRecord.case_status === "FOLLOW_UP_REQUIRED" && (
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading}
                onClick={handleFollowUpCycle}
                icon={RotateCcw}
              >
                Trigger Secondary Match
              </Button>
            )}

            {caseRecord.case_status !== "RESOLVED" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAssignModal}
                  icon={Send}
                >
                  Assign Provider
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowResolveModal(true)}
                  icon={CheckCircle2}
                >
                  Resolve Case
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopenCase}
                icon={RotateCcw}
              >
                Reopen Case
              </Button>
            )}
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-300 text-forest-900 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-forest-600 hover:text-forest-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Continuity Line Stage Progress */}
      <Card elevation="card" padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-coral-600">
            Assistance Continuity Journey
          </span>
          <span className="text-[11px] font-mono text-forest-600">
            Current Stage: {caseRecord.case_status}
          </span>
        </div>
        <ContinuityLine
          currentStage={mapCaseStatusToStage(caseRecord.case_status)}
          variant="timeline"
        />
      </Card>

      {/* Prominent Handoff Checkpoint Card */}
      {requiresReceivingHandoff && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isHandoffVerified
              ? "bg-forest-50 border-forest-300"
              : "bg-amber-50/70 border-amber-300 shadow-card"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isHandoffVerified
                    ? "bg-forest-800 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-forest-900">
                    Downstream Receiving Provider Handoff Gate
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isHandoffVerified
                        ? "bg-forest-200 text-forest-900"
                        : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {isHandoffVerified ? "GATE VERIFIED" : "GATE ACTIVE — ADMISSION REQUIRED"}
                  </span>
                </div>
                <p className="text-xs text-forest-700 max-w-2xl leading-relaxed">
                  {isHandoffVerified
                    ? "Receiving facility clinical/shelter admission has been verified with coordinator evidence sign-off."
                    : "Physical transport has arrived. Case resolution is BLOCKED until receiving clinical hospital or shelter admission is formally verified to prevent patient abandonment at gate."}
                </p>
              </div>
            </div>

            {!isHandoffVerified && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowResolveModal(true)}
              >
                Verify Admission
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requirements & Context Inspector */}
        <div className="space-y-6 lg:col-span-1">
          {/* Requirements Card */}
          <Card elevation="subtle" padding="md" className="space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold text-forest-800 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-coral-500" />
              <span>Assistance Requirements</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-forest-600 block mb-1">Identified Requirements:</span>
                <div className="flex flex-wrap gap-1">
                  {caseRecord.assistance_requirements.map((req, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-paper-surface text-forest-800 border border-warm-grey-300 font-mono text-[11px]"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-warm-grey-100">
                <span className="text-forest-600 block mb-1">Unresolved Outstanding:</span>
                {caseRecord.unresolved_requirements.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-forest-800 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>All needs fully addressed</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {caseRecord.unresolved_requirements.map((req, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Context Inspector Drawer */}
          <Card elevation="subtle" padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-warm-grey-200 bg-paper-surface flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-forest-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-coral-500" />
                <span>Meko Context Inspector</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-forest-100 text-forest-800">
                Active Memory
              </span>
            </div>
            <div className="p-4">
              <ContextInspector caseReference={caseRecord.public_case_reference} />
            </div>
          </Card>
        </div>

        {/* Right Column: Assignments & Interventions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Provider Assignments */}
          <Card elevation="subtle" padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase font-bold text-forest-800 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-forest-700" />
                <span>Assigned Providers & Response Stages</span>
              </h3>
              <span className="text-xs text-forest-600 font-mono">
                {caseRecord.assignments.length} Providers Assigned
              </span>
            </div>

            {caseRecord.assignments.length === 0 ? (
              <div className="p-6 text-center text-forest-500 text-xs italic bg-paper-surface rounded-xl border border-warm-grey-200">
                No organisations assigned yet. Click &quot;Assign Provider&quot; to match an accredited NGO.
              </div>
            ) : (
              <div className="space-y-3">
                {caseRecord.assignments.map((a) => (
                  <div
                    key={a.assignment_id}
                    className="p-4 rounded-xl border border-warm-grey-200 bg-paper-surface space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-forest-900 text-sm">
                        {a.organisation_name}
                      </span>
                      <StatusBadge status={a.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-forest-700 font-mono text-[11px]">
                      <div>Requirement: {a.requirement}</div>
                      <div>Cycle: {a.matching_cycle}</div>
                      <div>Assigned: {new Date(a.assigned_at).toLocaleTimeString()}</div>
                      <div>Deadline: {new Date(a.response_deadline).toLocaleTimeString()}</div>
                    </div>

                    {/* Stage Milestones */}
                    <div className="pt-2 border-t border-warm-grey-100 flex flex-wrap gap-2 text-[10px] font-mono">
                      {a.accepted_at && (
                        <span className="text-forest-800 bg-white px-2 py-0.5 rounded border border-warm-grey-200">
                          Accepted: {new Date(a.accepted_at).toLocaleTimeString()}
                        </span>
                      )}
                      {a.en_route_at && (
                        <span className="text-forest-800 bg-white px-2 py-0.5 rounded border border-warm-grey-200">
                          En Route: {new Date(a.en_route_at).toLocaleTimeString()}
                        </span>
                      )}
                      {a.arrived_at && (
                        <span className="text-forest-800 bg-white px-2 py-0.5 rounded border border-warm-grey-200">
                          Arrived: {new Date(a.arrived_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Interventions & Field Evidence */}
          <Card elevation="subtle" padding="md" className="space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold text-forest-800 flex items-center gap-1.5">
              <FileCheck className="h-4 w-4 text-forest-700" />
              <span>Field Interventions & Evidence Log</span>
            </h3>

            {caseRecord.interventions.length === 0 ? (
              <div className="p-6 text-center text-forest-500 text-xs italic bg-paper-surface rounded-xl border border-warm-grey-200">
                No field interventions recorded yet. Field responders submit updates via the Responder Cockpit.
              </div>
            ) : (
              <div className="space-y-3">
                {caseRecord.interventions.map((inv) => (
                  <div
                    key={inv.intervention_id}
                    className="p-4 rounded-xl border border-warm-grey-200 bg-white space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-forest-900 capitalize">
                        {inv.intervention_type.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-[11px] text-forest-600">
                        {new Date(inv.performed_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-forest-800 bg-paper-surface p-2.5 rounded-lg border border-warm-grey-100">
                      {inv.description}
                    </p>

                    {inv.assistance_provided.length > 0 && (
                      <div className="text-[11px] font-mono text-forest-700">
                        Provided: {inv.assistance_provided.join(", ")}
                      </div>
                    )}

                    {inv.additional_needs.length > 0 && (
                      <div className="text-[11px] font-mono text-amber-800 font-bold">
                        Secondary Needs Reported: {inv.additional_needs.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Assign Provider Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <h3 className="text-base font-bold text-forest-800">
                Assign Accredited NGO Provider
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-forest-600 hover:text-forest-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Target Assistance Requirement
                </label>
                <select
                  value={targetRequirement}
                  onChange={(e) => setTargetRequirement(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 bg-white"
                >
                  {caseRecord.assistance_requirements.map((req) => (
                    <option key={req} value={req}>
                      {req}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Select Accredited NGO Candidate
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 bg-white"
                >
                  <option value="">Select Candidate Provider...</option>
                  {candidates.map((c) => (
                    <option key={c.ngo_id} value={c.ngo_id}>
                      {c.organisation_name} (Score: {(c.composite_score * 100).toFixed(0)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-grey-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!selectedOrgId || !targetRequirement}
                  loading={actionLoading}
                >
                  Dispatch Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <h3 className="text-base font-bold text-forest-800">
                Verify Closed-Loop Case Resolution
              </h3>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="text-forest-600 hover:text-forest-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveCase} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-paper-surface border border-warm-grey-200 text-xs space-y-1 font-mono">
                <div>Case Reference: {caseRecord.public_case_reference}</div>
                <div>
                  Unresolved Needs:{" "}
                  {caseRecord.unresolved_requirements.length > 0 ? (
                    <span className="text-amber-800 font-bold">
                      {caseRecord.unresolved_requirements.join(", ")}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">All Needs Satisfied</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Resolution Rationale & Handoff Sign-off (Mandatory)
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionRationale}
                  onChange={(e) => setResolutionRationale(e.target.value)}
                  placeholder="e.g. Verified receiving hospital admission slip and surgical registration signed by Dr. Sharma..."
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Admission Evidence / Document URL (Optional)
                </label>
                <input
                  type="url"
                  value={resolutionEvidenceUrl}
                  onChange={(e) => setResolutionEvidenceUrl(e.target.value)}
                  placeholder="https://example.com/admission_slip.jpg"
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              {caseRecord.unresolved_requirements.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <input
                    type="checkbox"
                    id="override-check-case"
                    checked={overrideUnresolved}
                    onChange={(e) => setOverrideUnresolved(e.target.checked)}
                    className="h-4 w-4 rounded text-forest-800"
                  />
                  <label htmlFor="override-check-case" className="font-semibold cursor-pointer">
                    Override remaining needs (Coordinator assumes explicit responsibility)
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-grey-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResolveModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>
                  Confirm Resolution
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
