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
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { IncidentDocument } from "@/features/incidents/types";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDocument | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (sourceFilter !== "ALL") params.append("source_type", sourceFilter);
      if (duplicatesOnly) params.append("is_suspected_duplicate", "true");

      const res = await fetch(`/api/incidents?${params.toString()}`);
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
          <h1 className="text-2xl font-bold text-slate-900">Incident Triage Queue</h1>
          <p className="text-xs text-slate-500">
            Real-time intake feed from citizen reports and discovery crawlers awaiting coordinator review
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
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="DUPLICATE">DUPLICATE</option>
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
              onClick={() => setSelectedIncident(inc)}
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
                  Inspect Details
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-slate-900">
                  {selectedIncident.public_reference}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedIncident.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md hover:bg-slate-100"
              >
                Close (ESC)
              </button>
            </div>

            {/* Non-diagnostic Alert Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Human Coordinator Verification Gate</p>
                <p className="text-[11px] text-blue-800">
                  Per UMEED safety non-negotiables, this incident is in <strong>{selectedIncident.status}</strong> status. No assistance case or responder dispatch will occur without explicit coordinator approval.
                </p>
              </div>
            </div>

            {/* Suspected Duplicate Notice */}
            {selectedIncident.is_suspected_duplicate && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Suspected Duplicate Candidates Detected</span>
                </div>
                <p className="text-xs text-amber-800">
                  Candidate reference IDs: {selectedIncident.suspected_duplicate_ids.join(", ")}. Invariant: Incidents are never automatically deleted or merged.
                </p>
              </div>
            )}

            {/* Core Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Subject & Category
                </span>
                <p className="text-slate-800 font-medium">
                  {selectedIncident.subject_type.toUpperCase()} &bull; {selectedIncident.incident_type.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Source Provenance
                </span>
                <p className="text-slate-800 font-medium">
                  {selectedIncident.source_type} ({selectedIncident.source_reference})
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Location
                </span>
                <p className="text-slate-800 font-medium">
                  {selectedIncident.location.address || "Unspecified"} &bull; {selectedIncident.location.district || "Delhi NCR"}
                </p>
                {selectedIncident.location.latitude && (
                  <p className="font-mono text-[11px] text-slate-500 pt-0.5">
                    Lat: {selectedIncident.location.latitude}, Lon: {selectedIncident.location.longitude}
                  </p>
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Reported At
                </span>
                <p className="text-slate-800 font-medium">
                  {new Date(selectedIncident.reported_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Full Description
              </span>
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                {selectedIncident.description}
              </div>
            </div>

            {/* Evidence items */}
            {selectedIncident.evidence.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Submitted Evidence ({selectedIncident.evidence.length})
                </span>
                <div className="space-y-1">
                  {selectedIncident.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between"
                    >
                      <span>Type: {ev.type}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {ev.url}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
