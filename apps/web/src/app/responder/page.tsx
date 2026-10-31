"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Truck,
  MapPin,
  FileCheck,
  UserCheck,
  HelpCircle,
  XCircle,
  ShieldCheck,
  Radio,
  ArrowRight,
  RefreshCw,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { ContinuityLine, ContinuityStage } from "@/components/common/ContinuityLine";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card, MetricCard } from "@/components/ui/Card";

interface AssignmentView {
  assignment_id: string;
  case_id: string;
  case_reference: string;
  requirement: string;
  matching_cycle: number;
  status: string;
  assigned_at: string;
  response_deadline: string;
  accepted_at?: string;
  en_route_at?: string;
  arrived_at?: string;
  completed_at?: string;
  unresolved_requirements: string[];
}

const DEMO_NGO_PERSONAS = [
  { id: "ngo_del_001", name: "Delhi Animal Welfare Society Trust", category: "Trauma Ambulance & First Aid" },
  { id: "ngo_del_002", name: "South Delhi Homeless Welfare Trust", category: "Night Shelter & Cold Relief" },
  { id: "ngo_del_003", name: "Prerna Senior Care & Rehabilitation", category: "Abandoned Elderly Welfare" },
  { id: "ngo_del_004", name: "Sanjivani Community Mobile Health", category: "Acute Medical Triage" },
  { id: "ngo_del_005", name: "Delhi Emergency Relief Ambulance Network", category: "Critical Medical Transport" },
  { id: "ngo_del_006", name: "Apna Aashray Emergency Shelter", category: "Emergency Winter Shelter" },
];

export default function NGOResponderPage() {
  const [selectedNgoId, setSelectedNgoId] = useState<string>("ngo_del_001");
  const [responderId, setResponderId] = useState<string>("resp_field_01");
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reject modal state
  const [rejectingAssignmentId, setRejectingAssignmentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Info request state
  const [infoAssignmentId, setInfoAssignmentId] = useState<string | null>(null);
  const [infoText, setInfoText] = useState("");

  // Intervention modal state
  const [interventionAssignmentId, setInterventionAssignmentId] = useState<string | null>(null);
  const [interventionType, setInterventionType] = useState<string>("first_aid_provided");
  const [interventionDesc, setInterventionDesc] = useState("");
  const [assistanceProvidedText, setAssistanceProvidedText] = useState("");
  const [additionalNeedsText, setAdditionalNeedsText] = useState("");

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cases", {
        headers: {
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.cases) {
        const list: AssignmentView[] = [];
        for (const c of data.data.cases) {
          for (const a of c.assignments) {
            if (a.organisation_id === selectedNgoId) {
              list.push({
                ...a,
                case_reference: c.public_case_reference,
                unresolved_requirements: c.unresolved_requirements,
              });
            }
          }
        }
        setAssignments(list);
      }
    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedNgoId, responderId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleAccept = async (assignmentId: string) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await fetch(`/api/assignments/${assignmentId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({ notes: "Accepted by on-duty responder team" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "Assignment accepted! Field dispatch initialized." });
        fetchAssignments();
      } else {
        setActionMessage({ type: "error", text: data.error?.message || "Failed to accept assignment." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error accepting assignment." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnRoute = async (assignmentId: string) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await fetch(`/api/assignments/${assignmentId}/en-route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({
          eta_minutes: 15,
          vehicle_id: "DL-1V-8902",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "Status updated: En Route to incident location." });
        fetchAssignments();
      } else {
        setActionMessage({ type: "error", text: data.error?.message || "Failed to mark en route." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error marking en route." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrived = async (assignmentId: string) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await fetch(`/api/assignments/${assignmentId}/arrived`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({ notes: "Arrived at location. Initiating on-scene assessment." }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "Status updated: Responder arrived on scene." });
        fetchAssignments();
      } else {
        setActionMessage({ type: "error", text: data.error?.message || "Failed to mark arrived." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error marking arrived." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterventionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interventionAssignmentId || !interventionDesc.trim()) return;

    try {
      setActionLoading(true);
      setActionMessage(null);
      const assistanceProvided = assistanceProvidedText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const additionalNeeds = additionalNeedsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(
        `/api/assignments/${interventionAssignmentId}/interventions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ngo-id": selectedNgoId,
            "x-responder-id": responderId,
          },
          body: JSON.stringify({
            intervention_type: interventionType,
            description: interventionDesc.trim(),
            assistance_provided: assistanceProvided,
            additional_needs: additionalNeeds,
            evidence_references: [
              {
                type: "image",
                url: "https://example.com/field_intervention.jpg",
                notes: "On-scene field verification photo",
              },
            ],
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: "Intervention recorded! Receiving handoff checkpoint updated.",
        });
        setInterventionAssignmentId(null);
        setInterventionDesc("");
        setAssistanceProvidedText("");
        setAdditionalNeedsText("");
        fetchAssignments();
      } else {
        setActionMessage({
          type: "error",
          text: data.error?.message || "Failed to record intervention.",
        });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error recording intervention." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAssignmentId) return;

    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await fetch(`/api/assignments/${rejectingAssignmentId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "Assignment declined. Coordinator notified." });
        setRejectingAssignmentId(null);
        setRejectionReason("");
        fetchAssignments();
      } else {
        setActionMessage({ type: "error", text: data.error?.message || "Failed to decline assignment." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error declining assignment." });
    } finally {
      setActionLoading(false);
    }
  };

  const activePersona = DEMO_NGO_PERSONAS.find((p) => p.id === selectedNgoId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-grey-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-editorial text-2xl font-bold text-forest-800">
              Field Operations Cockpit
            </span>
            <Badge variant="coral">Mobile-First Responder View</Badge>
          </div>
          <p className="text-xs text-forest-700/80">
            Field responder dispatch, GPS arrival, on-scene medical intervention, and clinical handoff confirmation.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchAssignments}
          loading={loading}
          icon={RefreshCw}
        >
          Refresh Feed
        </Button>
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

      {/* Responder Persona Selector */}
      <Card elevation="subtle" padding="sm" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-coral-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-forest-800 uppercase tracking-wider">
              Field Responder Persona
            </span>
          </div>
          <span className="text-[11px] font-mono text-forest-600">
            Simulating NGO Staff Authentication
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEMO_NGO_PERSONAS.map((ngo) => (
            <button
              key={ngo.id}
              type="button"
              onClick={() => setSelectedNgoId(ngo.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedNgoId === ngo.id
                  ? "bg-forest-800 text-white border-forest-800 shadow-sm"
                  : "bg-paper-surface hover:bg-forest-50 text-forest-800 border-warm-grey-200"
              }`}
            >
              <div className="font-bold text-xs truncate">{ngo.name}</div>
              <div
                className={`text-[10px] ${
                  selectedNgoId === ngo.id ? "text-sage-200" : "text-forest-600"
                }`}
              >
                {ngo.category}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Assignments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase font-bold text-forest-800 tracking-wider">
            Active Assigned Field Tasks ({assignments.length})
          </h3>
          <span className="text-xs text-forest-600 font-mono">
            {activePersona?.name}
          </span>
        </div>

        {assignments.length === 0 ? (
          <Card elevation="subtle" padding="lg" className="text-center space-y-3">
            <Truck className="h-8 w-8 text-forest-400 mx-auto" />
            <h4 className="text-sm font-bold text-forest-800">No Pending Field Tasks</h4>
            <p className="text-xs text-forest-600 max-w-sm mx-auto">
              No active assignments currently dispatched to {activePersona?.name}. Use Mission Control to assign a case to this organisation.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => (
              <Card key={a.assignment_id} elevation="card" padding="md" className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-warm-grey-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase text-forest-500 font-bold">
                        Linked Case:
                      </span>
                      <Link
                        href={`/cases/${a.case_reference}`}
                        className="font-mono text-sm font-bold text-coral-600 hover:underline"
                      >
                        {a.case_reference}
                      </Link>
                    </div>
                    <div className="text-xs font-semibold text-forest-800 mt-0.5">
                      Requirement: <span className="font-mono text-forest-900">{a.requirement}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    <span className="text-[11px] font-mono text-forest-600">
                      Cycle {a.matching_cycle}
                    </span>
                  </div>
                </div>

                {/* Primary Touch-Friendly Mobile Action Buttons */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-forest-600 font-bold block">
                    Field Action Controls (Tap to Advance Stage)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {a.status === "ASSIGNED" && (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          loading={actionLoading}
                          onClick={() => handleAccept(a.assignment_id)}
                          icon={CheckCircle2}
                          className="w-full"
                        >
                          Accept Assignment
                        </Button>
                        <Button
                          variant="outline"
                          size="md"
                          onClick={() => setRejectingAssignmentId(a.assignment_id)}
                          className="w-full text-red-800 border-red-300 hover:bg-red-50"
                        >
                          Decline
                        </Button>
                      </>
                    )}

                    {a.status === "ACCEPTED" && (
                      <Button
                        variant="primary"
                        size="md"
                        loading={actionLoading}
                        onClick={() => handleEnRoute(a.assignment_id)}
                        icon={Truck}
                        className="w-full sm:col-span-3"
                      >
                        Mark En Route to Scene (ETA 15m)
                      </Button>
                    )}

                    {a.status === "EN_ROUTE" && (
                      <Button
                        variant="primary"
                        size="md"
                        loading={actionLoading}
                        onClick={() => handleArrived(a.assignment_id)}
                        icon={MapPin}
                        className="w-full sm:col-span-3"
                      >
                        Confirm On-Scene Arrival
                      </Button>
                    )}

                    {(a.status === "ARRIVED" || a.status === "INTERVENTION_PROVIDED") && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setInterventionAssignmentId(a.assignment_id)}
                        icon={FileCheck}
                        className="w-full sm:col-span-3"
                      >
                        Record Field Intervention & Evidence
                      </Button>
                    )}
                  </div>
                </div>

                {/* Deadline & SLA */}
                <div className="pt-2 border-t border-warm-grey-100 flex items-center justify-between text-[11px] font-mono text-forest-600">
                  <span>Assigned: {new Date(a.assigned_at).toLocaleTimeString()}</span>
                  <span>Response SLA Deadline: {new Date(a.response_deadline).toLocaleTimeString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Record Intervention Modal */}
      {interventionAssignmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <h3 className="text-base font-bold text-forest-800">
                Record Field Intervention & Care
              </h3>
              <button
                type="button"
                onClick={() => setInterventionAssignmentId(null)}
                className="text-forest-600 hover:text-forest-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInterventionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Intervention Category
                </label>
                <select
                  value={interventionType}
                  onChange={(e) => setInterventionType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 bg-white"
                >
                  <option value="first_aid_provided">Emergency First Aid Provided</option>
                  <option value="patient_transported">Patient Transported to Hospital</option>
                  <option value="temporary_shelter_arranged">Temporary Shelter Arranged</option>
                  <option value="food_and_hydration">Food & Hydration Provided</option>
                  <option value="veterinary_surgery_intake">Veterinary Surgical Intake Verified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Intervention Observations & Actions (Required)
                </label>
                <textarea
                  rows={3}
                  required
                  value={interventionDesc}
                  onChange={(e) => setInterventionDesc(e.target.value)}
                  placeholder="e.g. Bandaged severe laceration on hind paw, administered pain relief, transferred via animal ambulance to Delhi Animal Hospital..."
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Assistance Rendered (Comma-separated)
                </label>
                <input
                  type="text"
                  value={assistanceProvidedText}
                  onChange={(e) => setAssistanceProvidedText(e.target.value)}
                  placeholder="wound_dressing, antiseptic, ambulance_transit"
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  Additional Needs Discovered (Trigger Follow-Up Cycle)
                </label>
                <input
                  type="text"
                  value={additionalNeedsText}
                  onChange={(e) => setAdditionalNeedsText(e.target.value)}
                  placeholder="e.g. orthopedic_surgery, post_op_shelter"
                  className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-forest-600 block mt-1">
                  Specifying additional needs will automatically transition the case into <code>FOLLOW_UP_REQUIRED</code>.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-grey-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInterventionAssignmentId(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>
                  Submit Intervention
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Assignment Modal */}
      {rejectingAssignmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <h3 className="text-base font-bold text-forest-800">Decline Assignment</h3>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest-700 mb-1">
                  Decline Reason (Required)
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Ambulance currently en route to multi-vehicle accident; no available trauma staff for 45 minutes..."
                  className="w-full text-xs p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-grey-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingAssignmentId(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" size="sm" loading={actionLoading}>
                  Confirm Decline
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
