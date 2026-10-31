"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
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
} from "lucide-react";
import { IncidentDocument, ReviewDecision } from "@/features/incidents/types";
import { IncidentType, TriageUrgencyLevel, MatchResult } from "@umeed/contracts";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
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
  const [selectedMatchNgo, setSelectedMatchNgo] = useState<string | null>(null);

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
        setActionMessage({ type: "success", text: "AI Triage generated successfully." });
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
        setSelectedIncident(json.data);
        fetchIncidents();
        setReviewReason("");
        setActionMessage({ type: "success", text: `Review action '${reviewDecision}' recorded.` });
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

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case "emergency_review":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "urgent":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "elevated":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "routine":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Overview</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Incident Triage Queue</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="h-3 w-3 text-blue-600" />
              <span>Gemini AI Assisted</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time intake feed with multimodal Gemini distress triage and human coordinator verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchIncidents}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
          >
            <span>+ New Report</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mr-2">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All Statuses</option>
          <option value="REPORTED">REPORTED (New)</option>
          <option value="TRIAGED">TRIAGED</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="INVESTIGATING">INVESTIGATING</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All Sources</option>
          <option value="citizen_report">Citizen Reports</option>
          <option value="social_media_discovery">Social Media Discovery</option>
        </select>

        {/* Duplicates Toggle */}
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={duplicatesOnly}
            onChange={(e) => setDuplicatesOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Suspected Duplicates Only</span>
        </label>
      </div>

      {/* Incident List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            Loading intake queue...
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-2">
            <Clock className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No Incidents Found</p>
            <p className="text-xs text-slate-500">
              There are currently no incidents matching the selected filter criteria.
            </p>
          </div>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc._id}
              onClick={() => {
                setSelectedIncident(inc);
                setActionMessage(null);
                setReviewDecision("CONFIRM");
                setReviewReason("");
              }}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {inc.public_reference}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    {inc.status}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                    {inc.incident_type.replace(/_/g, " ")}
                  </span>
                  {inc.triage_analysis && (
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getUrgencyBadge(
                        inc.triage_analysis.urgency.level
                      )}`}
                    >
                      AI: {inc.triage_analysis.urgency.level.toUpperCase()}
                    </span>
                  )}
                  {inc.source_type === "social_media_discovery" && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      Discovery Crawler
                    </span>
                  )}
                  {inc.is_suspected_duplicate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                      <span>Suspected Duplicate ({inc.suspected_duplicate_ids.length})</span>
                    </span>
                  )}
                  {inc.requires_human_review && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      <UserCheck className="h-3 w-3" />
                      <span>Review Required</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-800 line-clamp-2">
                  {inc.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                  {inc.location.district && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{inc.location.address || inc.location.district}</span>
                    </span>
                  )}
                  <span>
                    Reported: {new Date(inc.reported_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center text-slate-400">
                <span className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Review & Triage
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Split Coordinator Review Workspace Modal */}
      {selectedIncident && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-slate-900">
                  {selectedIncident.public_reference}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedIncident.status}
                </span>
                {selectedIncident.triage_analysis && (
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getUrgencyBadge(
                      selectedIncident.triage_analysis.urgency.level
                    )}`}
                  >
                    AI Urgency: {selectedIncident.triage_analysis.urgency.level.toUpperCase()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md hover:bg-slate-100"
              >
                Close (ESC)
              </button>
            </div>

            {/* Invariant Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Human Coordinator Authority Safeguard</p>
                <p className="text-[11px] text-blue-800">
                  AI suggestions provide triage assistance only. AI never performs medical/legal diagnoses,
                  never infers identity, and cannot dispatch responders without explicit coordinator confirmation.
                </p>
              </div>
            </div>

            {actionMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  actionMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {actionMessage.text}
              </div>
            )}

            {/* Split Review Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN: Original Citizen Submission */}
              <div className="space-y-4 border-r-0 lg:border-r border-slate-100 lg:pr-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-slate-600" />
                    <span>Original Citizen Submission</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Source: {selectedIncident.source_type}
                  </span>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">
                      Subject & Category
                    </span>
                    <p className="text-slate-800 font-medium pt-0.5">
                      {selectedIncident.subject_type.toUpperCase()} &bull;{" "}
                      {selectedIncident.incident_type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">
                      Reported At
                    </span>
                    <p className="text-slate-800 font-medium pt-0.5">
                      {new Date(selectedIncident.reported_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">
                      Location
                    </span>
                    <p className="text-slate-800 font-medium pt-0.5">
                      {selectedIncident.location.address || "Unspecified"} &bull;{" "}
                      {selectedIncident.location.district || "Delhi NCR"}
                    </p>
                    {selectedIncident.location.latitude && (
                      <p className="font-mono text-[11px] text-slate-500">
                        GPS: {selectedIncident.location.latitude}, {selectedIncident.location.longitude}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Full Description
                  </span>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    {selectedIncident.description}
                  </div>
                </div>

                {/* Evidence & Photo Previews */}
                {selectedIncident.evidence.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Submitted Evidence ({selectedIncident.evidence.length})
                    </span>
                    <div className="space-y-2">
                      {selectedIncident.evidence.map((ev, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-semibold uppercase text-[10px]">Type: {ev.type}</span>
                            <span className="text-[10px] text-slate-400">
                              {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ""}
                            </span>
                          </div>
                          {ev.type === "image" && ev.url && (
                            <div className="rounded-lg overflow-hidden border border-slate-200 max-h-48 bg-slate-100 flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  ev.url.startsWith("data:")
                                    ? ev.url
                                    : `/api/evidence/preview/${selectedIncident.public_reference}/${idx}`
                                }
                                alt={`Evidence ${idx + 1}`}
                                className="object-contain max-h-48 w-full"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suspected Duplicates Notice */}
                {selectedIncident.is_suspected_duplicate && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Suspected Duplicate Incident Flagged</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Matches references: {selectedIncident.suspected_duplicate_ids.join(", ")}. Never auto-deleted.
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: AI Triage Assistance & Human Decision */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span>Gemini AI Triage Assessment</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleRunTriage(selectedIncident.public_reference)}
                    disabled={triageLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${triageLoading ? "animate-spin" : ""}`} />
                    <span>{selectedIncident.triage_analysis ? "Re-run Triage" : "Generate Triage"}</span>
                  </button>
                </div>

                {selectedIncident.triage_analysis ? (
                  <div className="space-y-3.5">
                    {/* Triage Status & Urgency Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Recommended Category
                        </span>
                        <span className="font-semibold text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {selectedIncident.triage_analysis.category_recommendation.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Urgency & Reasoning
                        </span>
                        <div className="space-y-1">
                          {selectedIncident.triage_analysis.urgency.reasoning.map((r, i) => (
                            <p key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                              <span className="text-blue-500 font-bold">&bull;</span>
                              <span>{r}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Observable Facts */}
                    {selectedIncident.triage_analysis.observable_evidence.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                          Directly Observable Facts
                        </span>
                        <div className="space-y-1">
                          {selectedIncident.triage_analysis.observable_evidence.map((obs, i) => (
                            <div
                              key={i}
                              className="text-xs p-2 rounded bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                            >
                              <span className="text-slate-800">{obs.observation}</span>
                              <span className="shrink-0 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                                {Math.round(obs.confidence * 100)}% conf
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Possible Assistance Pathways */}
                    {selectedIncident.triage_analysis.possible_assistance.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                          Suggested Assistance Pathways
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedIncident.triage_analysis.possible_assistance.map((ast, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                            >
                              {ast.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Information & Limitations */}
                    {selectedIncident.triage_analysis.missing_information.length > 0 && (
                      <div className="space-y-1 text-xs text-slate-600">
                        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                          Missing Information Needed
                        </span>
                        <ul className="list-disc list-inside text-[11px] space-y-0.5 text-slate-500">
                          {selectedIncident.triage_analysis.missing_information.map((info, i) => (
                            <li key={i}>{info}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Model Limitations Notice */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500">
                      <strong>AI Guardrail:</strong> {selectedIncident.triage_analysis.limitations.join(" ")}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                    <Sparkles className="h-8 w-8 text-blue-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No AI Triage Analysis Generated</p>
                    <p className="text-[11px] text-slate-500">
                      Click below to execute multimodal Gemini analysis on this report.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRunTriage(selectedIncident.public_reference)}
                      disabled={triageLoading}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                      {triageLoading ? "Analyzing..." : "Run Multimodal AI Triage"}
                    </button>
                  </div>
                )}

                {/* Coordinator Review Action Form */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-slate-700" />
                    <span>Coordinator Review Action</span>
                  </h4>

                  {/* Decision Selector */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                    {[
                      { id: "CONFIRM" as ReviewDecision, label: "Confirm", icon: CheckCircle2 },
                      { id: "OVERRIDE" as ReviewDecision, label: "Override", icon: ArrowUpRight },
                      { id: "REJECT" as ReviewDecision, label: "Reject", icon: XCircle },
                      { id: "REQUEST_INFO" as ReviewDecision, label: "Need Info", icon: HelpCircle },
                      { id: "ESCALATE" as ReviewDecision, label: "Escalate", icon: AlertOctagon },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      const isSelected = reviewDecision === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setReviewDecision(btn.id)}
                          className={`p-2 rounded-lg border text-center font-medium transition flex flex-col items-center gap-1 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-[10px]">{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Override Options (visible if OVERRIDE selected) */}
                  {reviewDecision === "OVERRIDE" && (
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                          Correct Category
                        </label>
                        <select
                          value={overrideCategory}
                          onChange={(e) => setOverrideCategory(e.target.value as IncidentType)}
                          className="w-full text-xs rounded border border-slate-300 p-1.5 bg-white text-slate-800"
                        >
                          <option value="">(Keep current category)</option>
                          <option value="injured_animal">Injured Animal</option>
                          <option value="abandoned_animal">Abandoned Animal</option>
                          <option value="homeless_person">Homeless Person</option>
                          <option value="abandoned_elderly_person">Abandoned Elderly Person</option>
                          <option value="medical_assistance">Medical Assistance</option>
                          <option value="food_assistance">Food Assistance</option>
                          <option value="shelter_assistance">Shelter Assistance</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                          Correct Urgency
                        </label>
                        <select
                          value={overrideUrgency}
                          onChange={(e) => setOverrideUrgency(e.target.value as TriageUrgencyLevel)}
                          className="w-full text-xs rounded border border-slate-300 p-1.5 bg-white text-slate-800"
                        >
                          <option value="">(Keep current urgency)</option>
                          <option value="routine">Routine</option>
                          <option value="elevated">Elevated</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency_review">Emergency Review</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Review Rationale Input */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                      Review Rationale / Notes (Mandatory for audit trail)
                    </label>
                    <textarea
                      rows={2}
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="e.g. Verified photo shows genuine distress. Confirmed high urgency for coordinator dispatch."
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={reviewLoading || !reviewReason.trim()}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                  >
                    {reviewLoading ? "Saving Decision..." : `Submit Decision (${reviewDecision})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Explainable NGO Matching Panel (Phase 4) */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    <span>Explainable NGO Responder Matching (Phase 4)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Capability-filtered ranking: Service Match (40%), District Coverage (25%), Proximity (15%), Availability (10%), Capacity (10%)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchMatches(selectedIncident.public_reference)}
                  disabled={matchLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 self-start sm:self-auto"
                >
                  <RefreshCw className={`h-3 w-3 ${matchLoading ? "animate-spin" : ""}`} />
                  <span>{matchResult ? "Re-evaluate Matches" : "Find Matching NGOs"}</span>
                </button>
              </div>

              {matchResult && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                    <p className="font-semibold">{matchResult.explanation_summary}</p>
                    <p className="text-[10px] text-emerald-800">
                      Evaluated {matchResult.total_candidates_evaluated} organisations &bull; {matchResult.eligible_candidates_count} eligible candidates passed hard capability filter.
                    </p>
                  </div>

                  {/* Candidates List */}
                  <div className="space-y-2">
                    {matchResult.candidates
                      .filter((c) => c.eligible)
                      .slice(0, 5)
                      .map((cand, idx) => (
                        <div
                          key={cand.ngo_id}
                          className={`p-3.5 rounded-xl border text-xs transition ${
                            selectedMatchNgo === cand.ngo_id
                              ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                  #{idx + 1}
                                </span>
                                <span className="font-bold text-slate-900 text-xs">
                                  {cand.organisation_name}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  {cand.verification_status}
                                </span>
                                {cand.is_demo && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    DEMO_ONLY
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-600">{cand.explanation}</p>

                              {/* Component Breakdown Pills */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                  Capability: {Math.round(cand.component_scores.capability_score * 100)}%
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                  Coverage: {Math.round(cand.component_scores.coverage_score * 100)}%
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                  Distance: {Math.round(cand.component_scores.distance_score * 100)}%
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                  Availability: {Math.round(cand.component_scores.availability_score * 100)}%
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                  Capacity: {Math.round(cand.component_scores.capacity_score * 100)}%
                                </span>
                              </div>

                              {cand.missing_information.length > 0 && (
                                <div className="text-[10px] text-slate-500 pt-0.5">
                                  <strong>Notice:</strong> {cand.missing_information.join("; ")}
                                </div>
                              )}
                            </div>

                            <div className="sm:text-right shrink-0 space-y-1.5">
                              <div className="text-base font-bold text-emerald-700 font-mono">
                                {Math.round(cand.total_score * 100)}%
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMatchNgo(cand.ngo_id);
                                  setActionMessage({
                                    type: "success",
                                    text: `Selected '${cand.organisation_name}' for coordinator outreach.`,
                                  });
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                              >
                                {selectedMatchNgo === cand.ngo_id ? "Selected ✓" : "Select NGO"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
