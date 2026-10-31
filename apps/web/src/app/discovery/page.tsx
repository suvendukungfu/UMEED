"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Radar,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Play,
  Layers,
  FileText,
  Activity,
  Globe,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, MetricCard } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { DiscoveryMap } from "@/components/discovery/DiscoveryMap";
import { DiscoveryCandidate, CandidateReviewStatus, IncidentType } from "@umeed/contracts";

export default function DiscoveryDashboardPage() {
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, number>>({
    total: 0,
    new: 0,
    under_review: 0,
    verified: 0,
    converted_to_incident: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected candidate drawer
  const [selectedCandidate, setSelectedCandidate] = useState<DiscoveryCandidate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (districtFilter !== "ALL") params.append("district", districtFilter);

      const res = await fetch(`/api/discovery/candidates?${params.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        setCandidates(data.data);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to load discovery candidates", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, districtFilter]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Handle Review Action (Verify or Reject)
  const handleReview = async (candidateId: string, status: CandidateReviewStatus) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/discovery/candidates/${candidateId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: `Reviewed by coordinator from Discovery Dashboard.` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to update review status");

      setActionMessage(`Candidate marked as ${status}.`);
      setSelectedCandidate(data.data);
      fetchCandidates();
    } catch (err) {
      setActionMessage(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Conversion to Active Verified Incident
  const handleConvertToIncident = async (candidateId: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/discovery/candidates/${candidateId}/convert-to-incident`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to convert candidate to incident");

      const incidentRef = data.data.incident.public_reference;
      setActionMessage(`Successfully converted to verified incident: ${incidentRef}`);
      setSelectedCandidate(data.data.candidate);
      fetchCandidates();
    } catch (err) {
      setActionMessage(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.sourceTitle.toLowerCase().includes(q) ||
      c.excerpt.toLowerCase().includes(q) ||
      c.sourceName.toLowerCase().includes(q) ||
      (c.approximateLocation.district && c.approximateLocation.district.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-warm-grey-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-sage-100 text-forest-800 border border-sage-200">
                <Radar className="h-3.5 w-3.5 text-coral-500 animate-pulse" />
                HUMANITARIAN DISCOVERY RADAR
              </span>
              <span className="text-xs text-forest-600 font-mono font-bold">RFC 9309 Compliant</span>
            </div>
            <h1 className="text-3xl font-editorial font-bold text-forest-800 tracking-tight">
              Discovery Intelligence & Distress Radar
            </h1>
            <p className="text-sm text-forest-600 max-w-2xl mt-1">
              Automated public web & open data signal discovery. Every candidate requires authorized human
              coordinator review before becoming an active UMEED incident.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/discovery/sources">
              <Button variant="secondary" size="sm" icon={Globe}>
                Source Registry
              </Button>
            </Link>
            <Link href="/discovery/runs">
              <Button variant="secondary" size="sm" icon={Activity}>
                Crawl Activity
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              icon={RefreshCw}
              onClick={() => fetchCandidates()}
            >
              Refresh Signals
            </Button>
          </div>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Signals Found"
            value={metrics.total || candidates.length}
            subtext="Public web & open data"
            elevation="subtle"
          />
          <MetricCard
            label="Awaiting Review"
            value={(metrics.new || 0) + (metrics.under_review || 0)}
            subtext="Human review required"
            badge="Review Gate"
            elevation="subtle"
          />
          <MetricCard
            label="Coordinator Verified"
            value={metrics.verified || 0}
            subtext="Signal evidence confirmed"
            elevation="subtle"
          />
          <MetricCard
            label="Ingested Incidents"
            value={metrics.converted_to_incident || 0}
            subtext="Dispatched to response network"
            badge="Live Cases"
            elevation="subtle"
          />
        </div>

        {/* GEOSPATIAL MAP SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-forest-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-coral-500" />
                Delhi NCR Distress Signal Map
              </h2>
              <p className="text-xs text-forest-600">
                Geographic distribution of public distress signals across 11 Delhi revenue districts.
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-forest-600">
              {filteredCandidates.length} Active Marker{filteredCandidates.length === 1 ? "" : "s"}
            </div>
          </div>

          <DiscoveryMap
            candidates={filteredCandidates}
            selectedCandidateId={selectedCandidate?.candidateId}
            onSelectCandidate={(cand) => setSelectedCandidate(cand)}
            className="h-[440px] w-full"
          />
        </div>

        {/* FILTER BAR & SEARCH */}
        <div className="p-4 rounded-2xl bg-white border border-warm-grey-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="text"
                placeholder="Search signals by keyword, title, district, or excerpt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-paper-surface border border-warm-grey-300 text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800"
              >
                <option value="ALL">All Review Statuses</option>
                <option value="new">New (Awaiting Review)</option>
                <option value="under_review">Under Review</option>
                <option value="verified">Verified</option>
                <option value="converted_to_incident">Converted to Incident</option>
                <option value="rejected">Rejected / False Positive</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800"
              >
                <option value="ALL">All Categories</option>
                <option value="injured_animal">Injured Animal</option>
                <option value="abandoned_animal">Abandoned Animal</option>
                <option value="homeless_person">Homeless Person</option>
                <option value="abandoned_elderly_person">Abandoned Elderly</option>
                <option value="shelter_assistance">Shelter Assistance</option>
                <option value="medical_assistance">Medical Assistance</option>
                <option value="food_assistance">Food Assistance</option>
              </select>

              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800"
              >
                <option value="ALL">All Districts</option>
                <option value="North West Delhi">North West Delhi</option>
                <option value="North Delhi">North Delhi</option>
                <option value="New Delhi">New Delhi</option>
                <option value="Central Delhi">Central Delhi</option>
                <option value="South Delhi">South Delhi</option>
                <option value="South East Delhi">South East Delhi</option>
                <option value="South West Delhi">South West Delhi</option>
                <option value="West Delhi">West Delhi</option>
                <option value="East Delhi">East Delhi</option>
                <option value="Shahdara">Shahdara</option>
                <option value="North East Delhi">North East Delhi</option>
              </select>
            </div>
          </div>
        </div>

        {/* CANDIDATES TABLE / LIST */}
        <div className="rounded-2xl border border-warm-grey-200 bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b border-warm-grey-200 bg-paper-surface/50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-forest-800">
              Discovered Signals ({filteredCandidates.length})
            </h3>
            <span className="text-[11px] font-mono text-forest-600">
              Coarsened for beneficiary privacy
            </span>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="p-12 text-center text-forest-600 space-y-2">
              <Radar className="h-8 w-8 text-forest-400 mx-auto" />
              <div className="font-bold text-sm text-forest-800">No signals match the selected criteria</div>
              <p className="text-xs max-w-sm mx-auto">
                Try widening your category or district filters, or trigger a new crawl job from the Crawl Activity screen.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-warm-grey-200 bg-paper-surface text-[11px] font-bold uppercase font-mono text-forest-700">
                    <th className="py-3 px-4">Signal / Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">District</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-grey-100 text-xs">
                  {filteredCandidates.map((cand) => {
                    const isSelected = selectedCandidate?.candidateId === cand.candidateId;
                    return (
                      <tr
                        key={cand.candidateId}
                        onClick={() => setSelectedCandidate(cand)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-coral-50/60 font-medium"
                            : "hover:bg-paper-surface/60"
                        }`}
                      >
                        <td className="py-3 px-4 max-w-xs sm:max-w-md">
                          <div className="font-bold text-forest-800 line-clamp-1">{cand.sourceTitle}</div>
                          <p className="text-[11px] text-forest-600 line-clamp-1">{cand.excerpt}</p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="neutral">
                            {cand.candidateCategory.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-forest-700 font-medium">
                          {cand.approximateLocation.district || "Delhi Regional"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-forest-600">
                          {cand.sourceName.split("—")[0].trim()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              cand.signalScore >= 80
                                ? "bg-coral-100 text-coral-800"
                                : cand.signalScore >= 50
                                ? "bg-amber-100 text-amber-800"
                                : "bg-warm-grey-100 text-warm-grey-700"
                            }`}
                          >
                            {cand.signalScore}/100
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={cand.reviewStatus.toUpperCase()} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidate(cand);
                            }}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CANDIDATE DETAIL DRAWER MODAL */}
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 bg-forest-950/40 backdrop-blur-sm flex justify-end transition-opacity">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-warm-grey-200 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-6 border-b border-warm-grey-200 bg-paper-surface flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge status={selectedCandidate.reviewStatus.toUpperCase()} />
                    <span className="text-[10px] font-mono text-forest-600">
                      ID: {selectedCandidate.candidateId}
                    </span>
                    {selectedCandidate.isSynthetic && (
                      <span className="px-1.5 py-0.5 rounded bg-sage-200 text-forest-900 text-[9px] font-mono font-bold">
                        DEMO DATA
                      </span>
                    )}
                  </div>
                  <h3 className="font-editorial text-xl font-bold text-forest-800 leading-snug">
                    {selectedCandidate.sourceTitle}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1.5 rounded-lg text-forest-600 hover:bg-warm-grey-200 focus:outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {actionMessage && (
                  <div className="p-3 rounded-xl bg-coral-50 border border-coral-200 text-xs font-bold text-coral-800">
                    {actionMessage}
                  </div>
                )}

                {/* Source & Provenance */}
                <div className="p-4 rounded-xl bg-paper-surface border border-warm-grey-200 space-y-2">
                  <div className="text-[11px] font-mono uppercase font-bold text-forest-700">
                    Source Provenance & Evidence Link
                  </div>
                  <div className="text-xs font-bold text-forest-800">{selectedCandidate.sourceName}</div>
                  <div className="flex items-center gap-2">
                    <a
                      href={selectedCandidate.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-coral-600 hover:underline font-semibold break-all"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {selectedCandidate.sourceUrl}
                    </a>
                  </div>
                  <div className="text-[10px] font-mono text-forest-600 pt-1">
                    SHA-256 Fingerprint: {selectedCandidate.contentHash.slice(0, 16)}...
                  </div>
                </div>

                {/* AI / Extracted Summary */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase font-bold text-forest-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-coral-500" />
                    Signal Intelligence Summary
                  </div>
                  <div className="p-4 rounded-xl bg-paper-surface border border-warm-grey-200 text-xs text-forest-800 leading-relaxed">
                    {selectedCandidate.summary}
                  </div>
                </div>

                {/* Extracted Excerpt */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase font-bold text-forest-700">
                    Extracted Public Excerpt
                  </div>
                  <div className="p-4 rounded-xl bg-warm-grey-50 border border-warm-grey-200 text-xs text-forest-700 italic">
                    &ldquo;{selectedCandidate.excerpt}&rdquo;
                  </div>
                </div>

                {/* Geographic & Severity Metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-paper-surface border border-warm-grey-200">
                    <div className="text-[10px] font-mono uppercase text-forest-600 font-bold">Category</div>
                    <div className="font-bold text-xs text-forest-800 mt-0.5">
                      {selectedCandidate.candidateCategory.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-paper-surface border border-warm-grey-200">
                    <div className="text-[10px] font-mono uppercase text-forest-600 font-bold">Approx. District</div>
                    <div className="font-bold text-xs text-forest-800 mt-0.5">
                      {selectedCandidate.approximateLocation.district || "Delhi NCR"}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-paper-surface border border-warm-grey-200">
                    <div className="text-[10px] font-mono uppercase text-forest-600 font-bold">Relevance Score</div>
                    <div className="font-bold text-xs text-coral-600 mt-0.5">
                      {selectedCandidate.signalScore}/100 ({selectedCandidate.signalRelevance})
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-paper-surface border border-warm-grey-200">
                    <div className="text-[10px] font-mono uppercase text-forest-600 font-bold">Discovered At</div>
                    <div className="font-bold text-xs text-forest-800 mt-0.5">
                      {new Date(selectedCandidate.discoveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>

                {/* Active Incident Link if already converted */}
                {selectedCandidate.incidentReference && (
                  <div className="p-4 rounded-xl bg-forest-50 border border-forest-300 space-y-1">
                    <div className="text-[10px] font-mono uppercase font-bold text-forest-800 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-forest-800" />
                      Active Ingested Incident
                    </div>
                    <p className="text-xs text-forest-700">
                      This signal has been verified and converted to operational incident{" "}
                      <span className="font-bold font-mono text-forest-900">
                        {selectedCandidate.incidentReference}
                      </span>
                      .
                    </p>
                    <div className="pt-2">
                      <Link href={`/incidents`}>
                        <Button variant="secondary" size="sm">
                          View in Incident Intake
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-warm-grey-200 bg-paper-surface flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCandidate(null)}
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  {selectedCandidate.reviewStatus !== "rejected" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleReview(selectedCandidate.candidateId, "rejected")}
                    >
                      Reject
                    </Button>
                  )}

                  {selectedCandidate.reviewStatus !== "verified" &&
                    selectedCandidate.reviewStatus !== "converted_to_incident" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleReview(selectedCandidate.candidateId, "verified")}
                      >
                        Verify Signal
                      </Button>
                    )}

                  {selectedCandidate.reviewStatus !== "converted_to_incident" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleConvertToIncident(selectedCandidate.candidateId)}
                    >
                      Convert to Incident
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
