"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GitPullRequest,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Send,
  Building2,
  FileCheck,
} from "lucide-react";

interface CaseItem {
  case_id: string;
  incident_id: string;
  incident_reference: string;
  public_case_reference: string;
  case_status: string;
  assistance_requirements: string[];
  unresolved_requirements: string[];
  assignments: Array<{
    assignment_id: string;
    organisation_name: string;
    requirement: string;
    status: string;
    assigned_at: string;
  }>;
  interventions: Array<{
    intervention_id: string;
    intervention_type: string;
    description: string;
    assistance_provided: string[];
    additional_needs: string[];
    performed_at: string;
  }>;
  current_matching_cycle: number;
  max_matching_cycles: number;
  approved_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export default function CoordinatorCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Resolution modal state
  const [selectedCaseForResolve, setSelectedCaseForResolve] = useState<CaseItem | null>(null);
  const [resolutionRationale, setResolutionRationale] = useState("");
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState("");
  const [overrideUnresolved, setOverrideUnresolved] = useState(false);

  // New Case Creation Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIncidentRef, setNewIncidentRef] = useState("");
  const [newRequirements, setNewRequirements] = useState("");

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/api/cases";
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { "x-coordinator-key": "umeed-coordinator-dev-key" },
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.cases) {
        setCases(data.data.cases);
      }
    } catch (err) {
      console.error("Failed to load cases:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentRef.trim()) return;

    try {
      setActionLoading(true);
      const reqList = newRequirements
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          incident_public_reference: newIncidentRef.trim(),
          assistance_requirements: reqList.length > 0 ? reqList : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Case ${data.data.public_case_reference} created successfully!`);
        setShowCreateModal(false);
        setNewIncidentRef("");
        setNewRequirements("");
        fetchCases();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to create case"}`);
      }
    } catch (err) {
      setActionMessage("Network error creating case.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerFollowUp = async (caseRef: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/cases/${caseRef}/follow-up`, {
        method: "POST",
        headers: { "x-coordinator-key": "umeed-coordinator-dev-key" },
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "Follow-up cycle initiated!");
        fetchCases();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to trigger follow-up"}`);
      }
    } catch (err) {
      setActionMessage("Network error initiating follow-up.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForResolve || !resolutionRationale.trim()) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/cases/${selectedCaseForResolve.public_case_reference}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          decision: "RESOLVED",
          rationale: resolutionRationale.trim(),
          evidence_urls: resolutionEvidenceUrl ? [resolutionEvidenceUrl.trim()] : [],
          override_unresolved: overrideUnresolved,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Case ${selectedCaseForResolve.public_case_reference} formally resolved.`);
        setSelectedCaseForResolve(null);
        setResolutionRationale("");
        setResolutionEvidenceUrl("");
        fetchCases();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to resolve case"}`);
      }
    } catch (err) {
      setActionMessage("Network error resolving case.");
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

  // Compute metrics
  const activeCasesCount = cases.filter((c) => !["RESOLVED", "CANCELLED"].includes(c.case_status)).length;
  const followUpCount = cases.filter((c) => c.case_status === "FOLLOW_UP_REQUIRED").length;
  const resolvedCount = cases.filter((c) => c.case_status === "RESOLVED").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Coordinator Case Workspace</h1>
              <p className="text-xs text-slate-500">
                Closed-Loop Response Tracking & Recursive Assistance Engine (Phase 5)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/responder"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            <span>NGO Responder Workspace</span>
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Open Case</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Active Cases</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{activeCasesCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-orange-600">Follow-Up Required</div>
          <div className="text-2xl font-bold text-orange-700 mt-1">{followUpCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Resolved Cases</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{resolvedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Tracked</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{cases.length}</div>
        </div>
      </div>

      {/* Action Notification Banner */}
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 mr-1" />
          {[
            { id: "ALL", label: "All Statuses" },
            { id: "APPROVED", label: "Approved" },
            { id: "MATCHING", label: "Matching" },
            { id: "RESPONDERS_CONTACTED", label: "Contacted" },
            { id: "ACCEPTED", label: "Accepted" },
            { id: "RESPONDER_ARRIVED", label: "On Scene" },
            { id: "FOLLOW_UP_REQUIRED", label: "Follow-Up Needed" },
            { id: "RESOLVED", label: "Resolved" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference or requirement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Loading coordination cases...
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <GitPullRequest className="h-8 w-8 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-700">No Cases Found</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No assistance cases match your current filter. Convert an approved incident from the review queue
            or click &ldquo;Open Case&rdquo; above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <div
              key={c.case_id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {c.public_case_reference}
                  </span>
                  <span className="text-xs text-slate-400">Linked to: {c.incident_reference}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(
                      c.case_status
                    )}`}
                  >
                    {c.case_status}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    Cycle {c.current_matching_cycle}/{c.max_matching_cycles}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/cases/${c.public_case_reference}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition"
                  >
                    <span>View Case Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Requirements & Unresolved Needs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-medium text-slate-500 mb-1">Assistance Requirements:</div>
                  <div className="flex flex-wrap gap-1">
                    {c.assistance_requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px]"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-slate-500 mb-1">Unresolved Needs:</div>
                  {c.unresolved_requirements.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      All requirements addressed
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {c.unresolved_requirements.map((req, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-semibold"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignments Snapshot */}
              {c.assignments.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-xs">
                  <div className="font-medium text-slate-600">Assigned Organisations ({c.assignments.length}):</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {c.assignments.map((asg) => (
                      <div
                        key={asg.assignment_id}
                        className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{asg.organisation_name}</div>
                          <div className="text-[11px] text-slate-500">Need: {asg.requirement}</div>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(
                            asg.status
                          )}`}
                        >
                          {asg.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interventions Recorded */}
              {c.interventions.length > 0 && (
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-xs space-y-1">
                  <div className="font-medium text-emerald-900 flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Recorded Interventions ({c.interventions.length}):</span>
                  </div>
                  {c.interventions.map((intv) => (
                    <div key={intv.intervention_id} className="text-slate-600 pl-5">
                      • <strong className="text-slate-800">{intv.intervention_type}</strong>: {intv.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Coordination Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] text-slate-400">
                  Last updated: {new Date(c.updated_at).toLocaleString()}
                </div>

                <div className="flex items-center gap-2">
                  {c.case_status === "FOLLOW_UP_REQUIRED" && (
                    <button
                      onClick={() => handleTriggerFollowUp(c.public_case_reference)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-orange-600 text-white hover:bg-orange-700 transition"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Start Follow-Up Cycle</span>
                    </button>
                  )}

                  {c.case_status !== "RESOLVED" && (
                    <button
                      onClick={() => setSelectedCaseForResolve(c)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 transition"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Resolve Case</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedCaseForResolve && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">
                Resolve Case: {selectedCaseForResolve.public_case_reference}
              </h3>
              <button
                onClick={() => setSelectedCaseForResolve(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveCaseSubmit} className="space-y-4 text-xs">
              {selectedCaseForResolve.unresolved_requirements.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Unresolved Requirements Detected</span>
                  </div>
                  <p className="text-amber-700">
                    Remaining needs: {selectedCaseForResolve.unresolved_requirements.join(", ")}.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-amber-900">
                    <input
                      type="checkbox"
                      checked={overrideUnresolved}
                      onChange={(e) => setOverrideUnresolved(e.target.checked)}
                      className="rounded"
                    />
                    <span>Explicit Coordinator Override (Authorize resolution with documented rationale)</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resolution Rationale (Mandatory, min 5 chars):
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionRationale}
                  onChange={(e) => setResolutionRationale(e.target.value)}
                  placeholder="Detail final outcome, hospital admission, shelter intake, or verified resolution..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resolution Evidence URL / Documentation (Optional):
                </label>
                <input
                  type="text"
                  value={resolutionEvidenceUrl}
                  onChange={(e) => setResolutionEvidenceUrl(e.target.value)}
                  placeholder="https://storage.umeed.internal/evidence/admission_slip.pdf"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedCaseForResolve(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || (!overrideUnresolved && selectedCaseForResolve.unresolved_requirements.length > 0)}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {actionLoading ? "Resolving..." : "Confirm Final Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Open Assistance Case</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Incident Reference (e.g. UMD-7B29-4K12):
                </label>
                <input
                  type="text"
                  required
                  placeholder="UMD-..."
                  value={newIncidentRef}
                  onChange={(e) => setNewIncidentRef(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Incident must be in APPROVED status.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assistance Requirements (Optional, comma-separated):
                </label>
                <input
                  type="text"
                  placeholder="animal_ambulance, veterinary_first_aid"
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Create Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
