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
} from "lucide-react";

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
    fetchMatches();
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !targetRequirement) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/cases/${caseReference}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          assignments: [
            {
              organisation_id: selectedOrgId,
              requirement: targetRequirement,
              response_deadline_hours: 2,
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage("Organisation assigned and notified successfully!");
        setShowAssignModal(false);
        fetchCaseDetail();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to assign organisation"}`);
      }
    } catch (err) {
      setActionMessage("Network error assigning organisation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFollowUpCycle = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/cases/${caseReference}/follow-up`, {
        method: "POST",
        headers: { "x-coordinator-key": "umeed-coordinator-dev-key" },
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "New recursive cycle started!");
        fetchCaseDetail();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to start follow-up"}`);
      }
    } catch (err) {
      setActionMessage("Network error initiating follow-up.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "MATCHING":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "RESPONDERS_CONTACTED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ACCEPTED":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "RESPONDER_ARRIVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "INTERVENTION_PROVIDED":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "FOLLOW_UP_REQUIRED":
        return "bg-orange-50 text-orange-700 border-orange-200 animate-pulse";
      case "RESOLVED":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "ESCALATED":
        return "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-slate-400 text-sm">
        Loading case details...
      </div>
    );
  }

  if (!caseRecord) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <div className="text-sm font-semibold text-slate-900">Case Not Found</div>
        <Link href="/cases" className="text-xs text-indigo-600 hover:underline">
          Return to cases workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Case Workspace</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{caseRecord.public_case_reference}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusBadge(
                    caseRecord.case_status
                  )}`}
                >
                  {caseRecord.case_status}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
                  Cycle {caseRecord.current_matching_cycle}/{caseRecord.max_matching_cycles}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Linked Incident:{" "}
                <Link
                  href={`/incidents`}
                  className="font-mono text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  {caseRecord.incident_reference}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {caseRecord.case_status === "FOLLOW_UP_REQUIRED" && (
              <button
                onClick={handleFollowUpCycle}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Start Follow-Up Cycle</span>
              </button>
            )}

            {caseRecord.case_status !== "RESOLVED" && (
              <button
                onClick={handleOpenAssignModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
              >
                <Send className="h-4 w-4" />
                <span>Assign Organisation</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification banner */}
      {actionMessage && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-lg text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-indigo-600 hover:text-indigo-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requirements & Status */}
        <div className="space-y-6 lg:col-span-1">
          {/* Unresolved Assistance Needs */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Assistance Needs</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-medium">All Requirements:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {caseRecord.assistance_requirements.map((req, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px]"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Outstanding Unresolved:</span>
                {caseRecord.unresolved_requirements.length === 0 ? (
                  <div className="mt-1 flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>All needs fully addressed</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {caseRecord.unresolved_requirements.map((req, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-bold"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Final Resolution Details (if resolved) */}
          {caseRecord.resolution_decision && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-300 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Resolution Audit Record</span>
              </h2>
              <div className="text-xs space-y-1 text-slate-600">
                <div>
                  <strong>Decision:</strong> {caseRecord.resolution_decision.decision}
                </div>
                <div>
                  <strong>Resolved By:</strong> {caseRecord.resolution_decision.resolved_by}
                </div>
                <div>
                  <strong>Timestamp:</strong>{" "}
                  {new Date(caseRecord.resolution_decision.timestamp).toLocaleString()}
                </div>
                <div>
                  <strong>Rationale:</strong> {caseRecord.resolution_decision.rationale}
                </div>
                {caseRecord.resolution_evidence.length > 0 && (
                  <div className="pt-2">
                    <strong>Evidence URLs:</strong>
                    <ul className="list-disc pl-4 text-indigo-600 mt-1">
                      {caseRecord.resolution_evidence.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noreferrer" className="underline">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Assignments, Interventions & Timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Assignments */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>Organisation Assignments ({caseRecord.assignments.length})</span>
              </h2>
            </div>

            {caseRecord.assignments.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No organisations assigned yet. Click &ldquo;Assign Organisation&rdquo; to select candidates.
              </div>
            ) : (
              <div className="space-y-3">
                {caseRecord.assignments.map((asg) => (
                  <div
                    key={asg.assignment_id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{asg.organisation_name}</div>
                        <div className="text-slate-500 text-[11px]">
                          Requirement: <strong className="text-slate-800">{asg.requirement}</strong> | Cycle: {asg.matching_cycle}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border self-start ${getStatusBadge(
                          asg.status
                        )}`}
                      >
                        {asg.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-500 text-[11px]">
                      <div>Assigned: {new Date(asg.assigned_at).toLocaleTimeString()}</div>
                      <div>Deadline: {new Date(asg.response_deadline).toLocaleTimeString()}</div>
                      {asg.accepted_at && <div className="text-teal-700">Accepted: {new Date(asg.accepted_at).toLocaleTimeString()}</div>}
                      {asg.arrived_at && <div className="text-emerald-700">Arrived: {new Date(asg.arrived_at).toLocaleTimeString()}</div>}
                      {asg.rejected_at && <div className="text-rose-700">Rejected: {asg.rejection_reason}</div>}
                    </div>

                    {/* Contact Attempts Audit */}
                    {asg.contact_attempts.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                        <span className="font-medium text-slate-700">Notification Provenance:</span>
                        {asg.contact_attempts.map((att) => (
                          <div key={att.attempt_id} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200">
                            <span>Channel: {att.channel}</span>
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                              {att.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interventions Recorded */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <span>Interventions Recorded ({caseRecord.interventions.length})</span>
            </h2>

            {caseRecord.interventions.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No field interventions recorded yet. Awaiting responder action.
              </div>
            ) : (
              <div className="space-y-3">
                {caseRecord.interventions.map((intv) => (
                  <div
                    key={intv.intervention_id}
                    className="p-4 rounded-lg border border-emerald-100 bg-emerald-50/30 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                      <span className="font-bold text-emerald-950 text-sm">
                        {intv.intervention_type.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(intv.performed_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-700">{intv.description}</p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-slate-500 font-medium">Provided:</span>
                      {intv.assistance_provided.map((p, idx) => (
                        <span key={idx} className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>

                    {intv.additional_needs.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 text-orange-800">
                        <span className="font-medium">Additional Needs Reported:</span>
                        {intv.additional_needs.map((need, idx) => (
                          <span key={idx} className="bg-orange-100 text-orange-900 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">
                            {need}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Organisation Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Assign Organisation to Requirement</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Assistance Requirement:
                </label>
                <select
                  value={targetRequirement}
                  onChange={(e) => setTargetRequirement(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {caseRecord.unresolved_requirements.map((req, i) => (
                    <option key={i} value={req}>
                      {req}
                    </option>
                  ))}
                  {caseRecord.assistance_requirements.map((req, i) => (
                    <option key={`all-${i}`} value={req}>
                      {req} (General)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Eligible Candidate Organisation:
                </label>
                {candidates.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                    Loading recommendation matches...
                  </div>
                ) : (
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">-- Choose Vetted Organisation --</option>
                    {candidates.map((cand) => (
                      <option key={cand.ngo_id} value={cand.ngo_id}>
                        {cand.organisation_name} (Score: {Math.round(cand.total_score * 100)}%)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedOrgId}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {actionLoading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
