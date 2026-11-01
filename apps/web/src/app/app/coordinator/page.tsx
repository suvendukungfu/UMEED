"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Search,
} from "lucide-react";

interface IncidentItem {
  reference: string;
  type: string;
  location: string;
  urgency: "critical" | "high" | "medium";
  triageClassification: string;
  status: "REPORTED" | "APPROVED" | "REJECTED";
  description: string;
  requiresReview: boolean;
}

const SAMPLE_INCIDENTS: IncidentItem[] = [
  {
    reference: "UMD-99BF-400A",
    type: "injured_animal",
    location: "Block B, Connaught Place, New Delhi",
    urgency: "high",
    triageClassification: "LIVE_AI_SUCCESS",
    status: "REPORTED",
    description: "Injured canine with deep paw laceration, unable to bear weight.",
    requiresReview: true,
  },
  {
    reference: "UMD-7A08-FE78",
    type: "homeless_person",
    location: "Kashmere Gate ISBT, North Delhi",
    urgency: "critical",
    triageClassification: "MANUAL_FALLBACK",
    status: "REPORTED",
    description: "Elderly person in acute distress, shivering with severe fever.",
    requiresReview: true,
  },
  {
    reference: "UMD-22E4-1188",
    type: "medical_assistance",
    location: "District Centre, Pitampura, North West Delhi",
    urgency: "medium",
    triageClassification: "LIVE_AI_SUCCESS",
    status: "APPROVED",
    description: "Mobility assistance requested for disabled senior.",
    requiresReview: false,
  },
];

export default function CoordinatorWorkspacePage() {
  const { context } = useAuth();
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("umeed_session_token");
      const res = await fetch("/api/incidents", {
        headers: token ? { Authorization: `Bearer ${token}` } : { "x-coordinator-id": "coord_primary" },
      });
      if (res.ok) {
        const json = await res.json();
        const rawIncidents = json.data?.incidents || [];
        const mapped: IncidentItem[] = rawIncidents.map((inc: any) => ({
          reference: inc.public_reference,
          type: inc.incident_type || inc.category,
          location: inc.location?.address || inc.location?.district || "Delhi NCR",
          urgency: inc.severity?.level === "urgent" ? "critical" : inc.severity?.level === "elevated" ? "high" : "medium",
          triageClassification: inc.triage_result?.execution_state || "LIVE_AI_SUCCESS",
          status: inc.status,
          description: inc.description,
          requiresReview: inc.status === "REPORTED" || inc.requires_human_review,
        }));
        setIncidents(mapped);
        if (mapped.length > 0) {
          setSelectedIncident(mapped[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load incidents queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleReviewAction = async (decision: "APPROVE" | "REJECT") => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const token = localStorage.getItem("umeed_session_token");
      const res = await fetch(`/api/incidents/${selectedIncident.reference}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : { "x-coordinator-id": "coord_primary" }),
        },
        body: JSON.stringify({
          decision,
          reason: reviewNote || (decision === "APPROVE" ? "Verified by humanitarian coordinator" : "Rejected after review"),
          reviewer_id: context?.user.userId || "coord_primary",
        }),
      });

      if (res.ok) {
        setActionMessage(`Incident ${selectedIncident.reference} ${decision === "APPROVE" ? "Approved" : "Rejected"} successfully.`);
        setReviewNote("");
        await fetchIncidents();
      } else {
        const errJson = await res.json();
        setActionMessage(`Action failed: ${errJson.error?.message || "Unknown error"}`);
      }
    } catch (err: any) {
      setActionMessage(`Network error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-warm-grey-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-forest-950">
              Humanitarian Coordinator Mission Control
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-coral-100 text-coral-800 border border-coral-200">
              COORDINATOR DISPATCH
            </span>
          </div>
          <p className="text-xs text-forest-600 mt-1">
            Logged in as <strong className="text-forest-900">{context?.user.name || "Dr. Ananya Roy"}</strong> &bull; Human-in-the-loop triage oversight and multi-organization dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cases"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-forest-900 hover:bg-forest-800 text-white transition-colors"
          >
            Open Full Case Explorer &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Incident Queue */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-warm-grey-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-warm-grey-100">
            <h2 className="font-bold text-sm text-forest-950 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-coral-600" />
              Triage & Review Queue ({incidents.length})
            </h2>
          </div>

          <div className="space-y-2">
            {incidents.length === 0 ? (
              <p className="text-xs text-forest-600 p-6 text-center bg-paper rounded-xl border border-warm-grey-200">
                No citizen reports currently in triage queue.
              </p>
            ) : (
              incidents.map((item) => (
                <button
                  key={item.reference}
                  type="button"
                  onClick={() => setSelectedIncident(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedIncident?.reference === item.reference
                      ? "bg-forest-900 text-white border-forest-900 shadow-xs"
                      : "bg-paper hover:bg-warm-grey-100 border-warm-grey-200 text-forest-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold">{item.reference}</span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                        selectedIncident?.reference === item.reference
                          ? "bg-white/20 text-white"
                          : item.status === "APPROVED"
                          ? "bg-sage-100 text-forest-800"
                          : item.status === "REJECTED"
                          ? "bg-coral-100 text-coral-800"
                          : "bg-warm-grey-100 text-forest-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div
                    className={`text-xs font-semibold capitalize ${
                      selectedIncident?.reference === item.reference ? "text-white/90" : "text-forest-800"
                    }`}
                  >
                    {item.type.replace(/_/g, " ")}
                  </div>
                  <div
                    className={`text-[11px] mt-1 ${
                      selectedIncident?.reference === item.reference ? "text-white/70" : "text-forest-500"
                    }`}
                  >
                    {item.location}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detailed Review Workspace */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs space-y-6">
          {!selectedIncident ? (
            <div className="py-16 text-center text-forest-600 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-sage-600 mx-auto" />
              <h3 className="font-bold text-forest-900">Review Queue is Clear</h3>
              <p className="text-xs">No pending citizen reports currently requiring coordinator triage review.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-warm-grey-100">
            <div>
              <span className="text-[10px] font-mono font-bold text-forest-500 uppercase">
                Citizen Distress Intake Review
              </span>
              <h2 className="text-xl font-bold font-mono text-forest-950">
                {selectedIncident.reference}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                  selectedIncident.status === "APPROVED"
                    ? "bg-sage-100 text-forest-800 border border-sage-300"
                    : selectedIncident.status === "REJECTED"
                    ? "bg-coral-100 text-coral-800 border border-coral-300"
                    : "bg-warm-grey-100 text-forest-800"
                }`}
              >
                {selectedIncident.status}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-forest-50/50 border border-forest-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-forest-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-coral-500" />
                Gemini 2.5 Flash Triage Classification
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-forest-800 border border-forest-200">
                {selectedIncident.triageClassification}
              </span>
            </div>
            <p className="text-forest-700">
              Urgency Level: <strong className="uppercase font-mono">{selectedIncident.urgency}</strong> &bull; Zero-Harm Guardrails Applied. Human coordinator authorization mandatory for dispatch.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-forest-700 uppercase tracking-wider mb-2 font-mono">
              Reported Situation
            </h3>
            <p className="text-xs text-forest-800 p-4 rounded-xl bg-paper border border-warm-grey-200 leading-relaxed">
              {selectedIncident.description}
            </p>
          </div>

          {selectedIncident.status === "REPORTED" ? (
            <div className="p-5 rounded-2xl bg-paper border border-warm-grey-200 space-y-4">
              <h3 className="text-xs font-bold text-forest-900">
                Coordinator Action: Authorize Case Conversion & NGO Matching
              </h3>
              <p className="text-xs text-forest-600">
                Consequential non-negotiable rule: Distress reports cannot be dispatched to NGOs until explicitly approved by an authorized coordinator.
              </p>
              {actionMessage && (
                <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-800 font-medium">
                  {actionMessage}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleReviewAction("REJECT")}
                  className="px-4 py-2 rounded-xl border border-warm-grey-300 text-xs font-semibold text-coral-700 hover:bg-coral-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {actionLoading ? "Processing..." : "Reject Report"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleReviewAction("APPROVE")}
                  className="px-5 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {actionLoading ? "Processing..." : "Approve & Create Operational Case"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-sage-50 border border-sage-200 text-xs text-forest-800 flex items-center justify-between">
              <span className="font-medium">
                Decision recorded: Incident is {selectedIncident.status}. Associated with operational case.
              </span>
              <Link
                href="/cases"
                className="font-bold text-coral-700 hover:underline"
              >
                View Dispatches &rarr;
              </Link>
            </div>
          )}
        </>
      )}
    </div>
      </div>
    </div>
  );
}

