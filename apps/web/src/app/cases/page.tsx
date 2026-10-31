"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
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
  RefreshCw,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { ContinuityLine, ContinuityStage } from "@/components/common/ContinuityLine";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card, MetricCard } from "@/components/ui/Card";

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
      if (data.status === "success") {
        setCases(data.data?.cases || []);
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

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentRef.trim()) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const requirements = newRequirements
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          incident_reference: newIncidentRef.trim().toUpperCase(),
          assistance_requirements:
            requirements.length > 0 ? requirements : ["emergency_first_aid"],
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setShowCreateModal(false);
        setNewIncidentRef("");
        setNewRequirements("");
        fetchCases();
        setActionMessage(`Case ${data.data.case.public_case_reference} created successfully.`);
      } else {
        setActionMessage(data.error?.message || "Failed to create case");
      }
    } catch (err) {
      setActionMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForResolve || !resolutionRationale.trim()) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(
        `/api/cases/${selectedCaseForResolve.public_case_reference}/resolve`,
        {
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
        }
      );

      const data = await res.json();
      if (data.status === "success") {
        setSelectedCaseForResolve(null);
        setResolutionRationale("");
        setResolutionEvidenceUrl("");
        setOverrideUnresolved(false);
        fetchCases();
        setActionMessage(
          `Case ${selectedCaseForResolve.public_case_reference} resolved with verified review.`
        );
      } else {
        setActionMessage(data.error?.message || "Resolution rejected: verify receiving handoff.");
      }
    } catch (err) {
      setActionMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenCase = async (caseRef: string) => {
    const reason = prompt("Enter rationale for reopening this case:");
    if (!reason) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseRef}/reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (data.status === "success") {
        fetchCases();
        setActionMessage(`Case ${caseRef} reopened for follow-up coordination.`);
      } else {
        setActionMessage(data.error?.message || "Failed to reopen case");
      }
    } catch (err) {
      setActionMessage((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Map case status to Continuity Line stage
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

  // Metrics
  const totalCases = cases.length;
  const activeCases = cases.filter((c) => c.case_status !== "RESOLVED").length;
  const pendingHandoffs = cases.filter(
    (c) => c.case_status === "FOLLOW_UP_REQUIRED" || c.case_status === "INTERVENTION_PROVIDED"
  ).length;
  const verifiedCompletions = cases.filter((c) => c.case_status === "RESOLVED").length;

  return (
    <div className="space-y-8">
      {/* Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-grey-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-editorial text-2xl font-bold text-forest-800">
              Coordinator Mission Control
            </span>
            <Badge variant="coral">Operational Assistance Cases</Badge>
          </div>
          <p className="text-xs text-forest-700/80">
            Multi-NGO case lifecycle management, capability dispatch, and receiving provider handoff verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchCases}
            loading={loading}
            icon={RefreshCw}
          >
            Refresh Cases
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
          >
            Create Case
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-300 text-forest-900 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-forest-600 hover:text-forest-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Managed Cases"
          value={totalCases}
          subtext="Closed-loop lifecycle"
          badge="Live Register"
          icon={GitPullRequest}
        />
        <MetricCard
          label="Active In-Progress"
          value={activeCases}
          subtext="Awaiting full resolution"
          badge="Active Field"
          icon={Clock}
        />
        <MetricCard
          label="Pending Handoff Gates"
          value={pendingHandoffs}
          subtext="Receiving provider gate"
          badge="Critical Checkpoint"
          icon={ShieldAlert}
        />
        <MetricCard
          label="Verified Completions"
          value={verifiedCompletions}
          subtext="Staff review confirmed"
          badge="Closed Loop"
          icon={CheckCircle2}
        />
      </div>

      {/* Search & Filter Bar */}
      <Card elevation="subtle" padding="sm" className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-forest-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by case reference (CASE-XXXX-YYYY), linked incident, or requirement..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs text-forest-800 placeholder:text-forest-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold text-forest-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            >
              <option value="ALL">All Case Statuses</option>
              <option value="APPROVED">APPROVED</option>
              <option value="MATCHING">MATCHING</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="RESPONDER_ARRIVED">RESPONDER_ARRIVED</option>
              <option value="INTERVENTION_PROVIDED">INTERVENTION_PROVIDED</option>
              <option value="FOLLOW_UP_REQUIRED">FOLLOW_UP_REQUIRED (Handoff Pending)</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="REOPENED">REOPENED</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Cases Table */}
      <Card elevation="card" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-forest-800">
            <thead className="bg-paper-surface border-b border-warm-grey-200 text-forest-700 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Case Reference</th>
                <th className="py-3 px-4">Linked Incident</th>
                <th className="py-3 px-4">Requirements & Cycle</th>
                <th className="py-3 px-4">Assigned Providers</th>
                <th className="py-3 px-4">Lifecycle Stage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-grey-100">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-forest-600">
                    <p className="font-semibold">No assistance cases found matching filters.</p>
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-paper-surface/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/cases/${c.public_case_reference}`}
                        className="font-mono font-bold text-coral-600 hover:text-coral-700 flex items-center gap-1 group"
                      >
                        <span>{c.public_case_reference}</span>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="mt-1">
                        <StatusBadge status={c.case_status} />
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-forest-800">
                      <Link
                        href="/incidents"
                        className="hover:underline text-forest-700"
                      >
                        {c.incident_reference}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {c.assistance_requirements.map((req) => (
                          <span
                            key={req}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              c.unresolved_requirements.includes(req)
                                ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                                : "bg-forest-100 text-forest-800 font-medium"
                            }`}
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-forest-600">
                        Cycle {c.current_matching_cycle}/{c.max_matching_cycles}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {c.assignments.length === 0 ? (
                        <span className="text-forest-500 italic text-[11px]">Unassigned</span>
                      ) : (
                        <div className="space-y-1">
                          {c.assignments.map((a) => (
                            <div key={a.assignment_id} className="text-[11px]">
                              <span className="font-semibold text-forest-800">
                                {a.organisation_name}
                              </span>{" "}
                              <span className="text-[10px] font-mono px-1 rounded bg-paper-surface border border-warm-grey-200">
                                {a.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <ContinuityLine
                        currentStage={mapCaseStatusToStage(c.case_status)}
                        variant="compact"
                      />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/cases/${c.public_case_reference}`}>
                          <Button variant="outline" size="sm">
                            Workspace
                          </Button>
                        </Link>

                        {c.case_status !== "RESOLVED" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedCaseForResolve(c)}
                          >
                            Resolve
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReopenCase(c.public_case_reference)}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resolve Case Modal */}
      {selectedCaseForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <div>
                <span className="text-[11px] font-mono uppercase text-forest-600 font-bold block">
                  Verify Closed-Loop Case Resolution
                </span>
                <h3 className="text-base font-bold text-forest-800 font-mono">
                  {selectedCaseForResolve.public_case_reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseForResolve(null)}
                className="text-forest-600 hover:text-forest-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveCase} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-paper-surface border border-warm-grey-200 text-xs space-y-1.5 font-mono">
                <div>Linked Incident: {selectedCaseForResolve.incident_reference}</div>
                <div>
                  Unresolved Needs:{" "}
                  {selectedCaseForResolve.unresolved_requirements.length > 0 ? (
                    <span className="text-amber-800 font-bold">
                      {selectedCaseForResolve.unresolved_requirements.join(", ")}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">All Requirements Satisfied</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Resolution Rationale (Mandatory)
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionRationale}
                  onChange={(e) => setResolutionRationale(e.target.value)}
                  placeholder="e.g. Verified receiving hospital admission slip and veterinary surgery admission on record..."
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Evidence / Discharge Slip URL (Optional)
                </label>
                <input
                  type="url"
                  value={resolutionEvidenceUrl}
                  onChange={(e) => setResolutionEvidenceUrl(e.target.value)}
                  placeholder="https://example.com/admission_slip.jpg"
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              {selectedCaseForResolve.unresolved_requirements.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <input
                    type="checkbox"
                    id="override-check"
                    checked={overrideUnresolved}
                    onChange={(e) => setOverrideUnresolved(e.target.checked)}
                    className="h-4 w-4 rounded text-forest-800"
                  />
                  <label htmlFor="override-check" className="font-semibold cursor-pointer">
                    Override remaining needs (Coordinator assumes explicit responsibility)
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-grey-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCaseForResolve(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                >
                  Confirm Resolution
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <h3 className="text-base font-bold text-forest-800">
                Create Operational Assistance Case
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-forest-600 hover:text-forest-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Incident Reference Code (e.g. UMD-XXXX-YYYY)
                </label>
                <input
                  type="text"
                  required
                  value={newIncidentRef}
                  onChange={(e) => setNewIncidentRef(e.target.value)}
                  placeholder="UMD-82F1-94A0"
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-warm-grey-300 uppercase focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Assistance Requirements (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  placeholder="emergency_first_aid, veterinary_care, night_shelter"
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-grey-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>
                  Create Case
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
