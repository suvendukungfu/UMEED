"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  Filter,
  AlertTriangle,
  UserCheck,
  MapPin,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  Building2,
  Search,
  FileText,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { IncidentDocument, ReviewDecision } from "@/features/incidents/types";
import { IncidentType, TriageUrgencyLevel, MatchResult } from "@umeed/contracts";
import { ContinuityLine, ContinuityStage } from "@/components/common/ContinuityLine";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card, MetricCard } from "@/components/ui/Card";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<IncidentDocument | null>(null);

  // Review & Triage action state
  const [triageLoading, setTriageLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>("CONFIRM");
  const [reviewReason, setReviewReason] = useState("");
  const [overrideCategory, setOverrideCategory] = useState<IncidentType | "">("");
  const [overrideUrgency, setOverrideUrgency] = useState<TriageUrgencyLevel | "">("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // NGO Matching state
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchingOpen, setMatchingOpen] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (sourceFilter !== "ALL") params.append("source_type", sourceFilter);
      if (duplicatesOnly) params.append("is_suspected_duplicate", "true");

      const res = await fetch(`/api/incidents?${params.toString()}`, {
        headers: {
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
      });
      const json = await res.json();
      if (json.status === "success") {
        setIncidents(json.data.incidents || []);
      }
    } catch {
      // Graceful error fallback
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, duplicatesOnly]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleFetchMatches = async (publicRef: string) => {
    setMatchLoading(true);
    try {
      const res = await fetch(`/api/ngos/matches/${publicRef}`, {
        headers: {
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
      });
      const json = await res.json();
      if (json.status === "success") {
        setMatchResult(json.data);
        setMatchingOpen(true);
      }
    } catch {
      // Graceful error handling
    } finally {
      setMatchLoading(false);
    }
  };

  const handleRunTriage = async (publicReference: string) => {
    setTriageLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/incidents/${publicReference}/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.status === "success") {
        setSelectedIncident((prev) =>
          prev ? { ...prev, triage_analysis: json.data.triage_analysis } : null
        );
        fetchIncidents();
        setActionMessage({ type: "success", text: "AI Triage generated successfully via Gemini." });
      } else {
        setActionMessage({
          type: "error",
          text: json.error?.message || "Failed to trigger triage.",
        });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Triage network request failed.",
      });
    } finally {
      setTriageLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedIncident) return;
    if (!reviewReason.trim()) {
      setActionMessage({ type: "error", text: "Please provide a reviewer rationale." });
      return;
    }

    setReviewLoading(true);
    setActionMessage(null);
    try {
      const payload: {
        decision: ReviewDecision;
        reason: string;
        override_category?: IncidentType;
        override_urgency?: TriageUrgencyLevel;
      } = {
        decision: reviewDecision,
        reason: reviewReason,
      };

      if (reviewDecision === "OVERRIDE") {
        if (overrideCategory) payload.override_category = overrideCategory;
        if (overrideUrgency) payload.override_urgency = overrideUrgency;
      }

      const res = await fetch(`/api/incidents/${selectedIncident.public_reference}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.status === "success") {
        setSelectedIncident(null);
        setReviewReason("");
        setOverrideCategory("");
        setOverrideUrgency("");
        fetchIncidents();
        setActionMessage({
          type: "success",
          text: `Review submitted: Decision ${reviewDecision} recorded.`,
        });
      } else {
        setActionMessage({
          type: "error",
          text: json.error?.message || "Failed to submit review.",
        });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Review submission failed.",
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.public_reference.toLowerCase().includes(q) ||
      inc.description.toLowerCase().includes(q) ||
      inc.location?.district?.toLowerCase().includes(q) ||
      inc.incident_type.toLowerCase().includes(q)
    );
  });

  // Calculate metrics
  const totalCount = incidents.length;
  const awaitingTriage = incidents.filter((i) => i.status === "REPORTED").length;
  const humanReviewCount = incidents.filter((i) => i.requires_human_review).length;
  const duplicateCount = incidents.filter((i) => i.is_suspected_duplicate).length;

  return (
    <div className="space-y-8">
      {/* Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-grey-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-editorial text-2xl font-bold text-forest-800">
              Incident Intake & Multimodal Triage Queue
            </span>
            <Badge variant="coral">Live Coordinator Queue</Badge>
          </div>
          <p className="text-xs text-forest-700/80">
            Intake gateway accepting citizen reports and social discoveries with Gemini multimodal severity assessment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchIncidents}
            loading={loading}
            icon={RefreshCw}
          >
            Refresh Queue
          </Button>
          <Link href="/report">
            <Button type="button" variant="primary" size="sm" icon={FileText}>
              New Report
            </Button>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{actionMessage.text}</span>
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
          label="Total Incidents"
          value={totalCount}
          subtext="In coordinator queue"
          badge="In-Memory / Atlas"
          icon={FileText}
        />
        <MetricCard
          label="Awaiting Triage"
          value={awaitingTriage}
          subtext="Requires Gemini run"
          badge="Intake Stage"
          icon={Sparkles}
        />
        <MetricCard
          label="Human Review Queue"
          value={humanReviewCount}
          subtext="Coordinator sign-off gate"
          badge="Non-Autonomous"
          icon={UserCheck}
        />
        <MetricCard
          label="Suspected Duplicates"
          value={duplicateCount}
          subtext="Spatial-temporal cluster"
          badge="Cluster Guard"
          icon={AlertTriangle}
        />
      </div>

      {/* Search & Filter Bar */}
      <Card elevation="subtle" padding="sm" className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-forest-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reference (UMD-XXXX-YYYY), district, or incident details..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs text-forest-800 placeholder:text-forest-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold text-forest-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">REPORTED</option>
              <option value="TRIAGED">TRIAGED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold text-forest-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            >
              <option value="ALL">All Sources</option>
              <option value="citizen_report">Citizen Mobile</option>
              <option value="crawler_distress">Social Discovery</option>
            </select>

            <button
              type="button"
              onClick={() => setDuplicatesOnly(!duplicatesOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                duplicatesOnly
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-paper-surface text-forest-700 border-warm-grey-300 hover:bg-forest-50"
              }`}
            >
              Duplicates Only
            </button>
          </div>
        </div>
      </Card>

      {/* Incidents Table */}
      <Card elevation="card" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-forest-800">
            <thead className="bg-paper-surface border-b border-warm-grey-200 text-forest-700 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Subject & Nature</th>
                <th className="py-3 px-4">District / Location</th>
                <th className="py-3 px-4">Status & Urgency</th>
                <th className="py-3 px-4">Lifecycle Stage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-grey-100">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-forest-600">
                    <div className="space-y-1">
                      <p className="font-semibold">No incidents found in this queue.</p>
                      <p className="text-[11px] text-forest-500">
                        Adjust your filters or submit a new citizen report to test the intake pipeline.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => {
                  const urgency = incident.triage_analysis?.urgency?.level;
                  return (
                    <tr
                      key={incident._id}
                      className="hover:bg-paper-surface/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-forest-900">
                        {incident.public_reference}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-forest-900 capitalize">
                          {incident.incident_type.replace(/_/g, " ")}
                        </div>
                        <div className="text-[11px] text-forest-600 truncate max-w-xs">
                          {incident.description}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-medium text-forest-800">
                          <MapPin className="h-3 w-3 text-forest-500" />
                          <span>{incident.location?.district || "Delhi NCR"}</span>
                        </div>
                        {incident.location?.address && (
                          <div className="text-[10px] text-forest-500 truncate max-w-xs">
                            {incident.location.address}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={incident.status} />
                          {urgency && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                urgency === "emergency_review" || urgency === "urgent"
                                  ? "bg-red-100 text-red-800"
                                  : urgency === "elevated"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {urgency.replace("_", " ")}
                            </span>
                          )}
                          {incident.is_suspected_duplicate && (
                            <Badge variant="warning" size="sm">Duplicate</Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <ContinuityLine
                          currentStage={
                            incident.status === "REPORTED"
                              ? "REPORT"
                              : incident.status === "UNDER_REVIEW"
                              ? "TRIAGE"
                              : "COORDINATION"
                          }
                          variant="compact"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIncident(incident)}
                          >
                            Review
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleFetchMatches(incident.public_reference)}
                          >
                            Matches
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Drawer / Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <div>
                <span className="text-[11px] font-mono uppercase text-forest-600 font-bold block">
                  Coordinator Review Workspace
                </span>
                <h3 className="text-lg font-bold text-forest-800 font-mono">
                  {selectedIncident.public_reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-forest-600 hover:text-forest-900 p-1"
              >
                ✕
              </button>
            </div>

            {/* Current Facts Panel */}
            <div className="p-4 rounded-xl bg-paper-surface border border-warm-grey-200 space-y-2 text-xs">
              <span className="text-[11px] font-mono uppercase text-forest-700 font-bold block">
                Current Operational Facts
              </span>
              <div className="grid grid-cols-2 gap-2 text-forest-800 font-mono">
                <div>Source: {selectedIncident.source_type}</div>
                <div>Category: {selectedIncident.incident_type}</div>
                <div>District: {selectedIncident.location?.district || "N/A"}</div>
                <div>Status: {selectedIncident.status}</div>
              </div>
              <p className="font-sans text-forest-900 pt-2 border-t border-warm-grey-100 leading-relaxed">
                {selectedIncident.description}
              </p>
            </div>

            {/* Gemini Triage Section */}
            <div className="p-4 rounded-xl bg-forest-50/80 border border-forest-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-forest-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-forest-700" />
                  Gemini Multimodal Triage Assessment
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={triageLoading}
                  onClick={() => handleRunTriage(selectedIncident.public_reference)}
                >
                  {selectedIncident.triage_analysis ? "Re-run Triage" : "Execute Gemini Triage"}
                </Button>
              </div>

              {selectedIncident.triage_analysis ? (
                <div className="space-y-2 text-xs font-mono text-forest-800">
                  <div className="flex justify-between">
                    <span>Severity Level:</span>
                    <span className="font-bold text-forest-900">
                      {selectedIncident.triage_analysis.urgency?.level || "P2_HIGH"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence Score:</span>
                    <span>
                      {(
                        (selectedIncident.triage_analysis.confidence || 0.85) * 100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                  <div className="pt-2 text-forest-700 font-sans text-[11px] italic">
                    Reasoning: {selectedIncident.triage_analysis.urgency?.reasoning?.join("; ") || "Extracted from citizen photo and description."}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-forest-600">
                  No automated triage on record. Click &quot;Execute Gemini Triage&quot; to extract structured urgency and conditions.
                </p>
              )}
            </div>

            {/* Human Decision Form */}
            <div className="space-y-4 pt-2">
              <span className="text-xs font-mono uppercase text-forest-800 font-bold block">
                Human Review Gate (Mandatory)
              </span>

              <div className="grid grid-cols-3 gap-2">
                {(["CONFIRM", "OVERRIDE", "REJECT"] as ReviewDecision[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setReviewDecision(d)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      reviewDecision === d
                        ? "bg-forest-800 text-white border-forest-800"
                        : "bg-paper-surface text-forest-700 border-warm-grey-300 hover:bg-forest-50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {reviewDecision === "OVERRIDE" && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-paper-surface border border-warm-grey-200">
                  <div>
                    <label className="block text-[11px] font-bold text-forest-700 mb-1">Override Category</label>
                    <select
                      value={overrideCategory}
                      onChange={(e) => setOverrideCategory(e.target.value as IncidentType)}
                      className="w-full text-xs p-2 rounded-lg border border-warm-grey-300 bg-white"
                    >
                      <option value="">Keep Existing</option>
                      <option value="injured_animal">injured_animal</option>
                      <option value="abandoned_animal">abandoned_animal</option>
                      <option value="homeless_person">homeless_person</option>
                      <option value="abandoned_elderly_person">abandoned_elderly_person</option>
                      <option value="shelter_assistance">shelter_assistance</option>
                      <option value="medical_assistance">medical_assistance</option>
                      <option value="food_assistance">food_assistance</option>
                      <option value="other">other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-forest-700 mb-1">Override Urgency</label>
                    <select
                      value={overrideUrgency}
                      onChange={(e) => setOverrideUrgency(e.target.value as TriageUrgencyLevel)}
                      className="w-full text-xs p-2 rounded-lg border border-warm-grey-300 bg-white"
                    >
                      <option value="">Keep Existing</option>
                      <option value="routine">routine</option>
                      <option value="elevated">elevated</option>
                      <option value="urgent">urgent</option>
                      <option value="emergency_review">emergency_review</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-forest-700 mb-1">Reviewer Rationale (Required)</label>
                <textarea
                  rows={3}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="e.g. Verified street animal injury with visible hemorrhage in Rohini; immediate ambulance triage required..."
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 bg-white focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-grey-200">
                <Button variant="outline" size="sm" onClick={() => setSelectedIncident(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={reviewLoading}
                  onClick={handleSubmitReview}
                >
                  Record Review Decision
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NGO Matches Modal */}
      {matchingOpen && matchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <div>
                <span className="text-[11px] font-mono uppercase text-forest-600 font-bold block">
                  Capability Match Scoring Breakdown
                </span>
                <h3 className="text-base font-bold text-forest-800">
                  Accredited NGO Match Candidates
                </h3>
              </div>
              <button type="button" onClick={() => setMatchingOpen(false)} className="text-forest-600 hover:text-forest-900">
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {matchResult.candidates.map((cand, idx) => (
                <div key={cand.ngo_id || idx} className="p-3.5 rounded-xl border border-warm-grey-200 bg-paper-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-forest-900">{cand.organisation_name}</span>
                    <span className="font-mono text-xs font-bold text-coral-600">
                      Score: {(cand.total_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-forest-600">
                    <div>Capability: {(cand.component_scores.capability_score * 100).toFixed(0)}%</div>
                    <div>Distance: {(cand.component_scores.distance_score * 100).toFixed(0)}%</div>
                    <div>Availability: {(cand.component_scores.availability_score * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-warm-grey-200">
              <Button variant="primary" size="sm" onClick={() => setMatchingOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
