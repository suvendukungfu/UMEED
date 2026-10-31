"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
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
} from "lucide-react";

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
  { id: "ngo_del_001", name: "Delhi Animal Welfare Society Trust Regd", category: "Animals / Trauma Ambulance" },
  { id: "ngo_del_002", name: "South Delhi Homeless Welfare Trust", category: "Homeless / Night Shelter" },
  { id: "ngo_del_003", name: "Prerna Senior Care & Elder Rehabilitation", category: "Abandoned Elderly" },
  { id: "ngo_del_004", name: "Sanjivani Community Mobile Health Foundation", category: "Medical Triage" },
  { id: "ngo_del_005", name: "Delhi Emergency Relief Ambulance Network", category: "Critical Medical Transport" },
  { id: "ngo_del_006", name: "Apna Aashray Emergency Shelter Collective", category: "Emergency Winter Shelter" },
];

export default function NGOResponderPage() {
  const [selectedNgoId, setSelectedNgoId] = useState<string>("ngo_del_001");
  const [responderId, setResponderId] = useState<string>("resp_field_01");
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
      const res = await fetch(`/api/assignments/${assignmentId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({ notes: "Accepted by on-duty responder" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Assignment accepted! Dispatch initialized.");
        fetchAssignments();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to accept"}`);
      }
    } catch (err) {
      setActionMessage("Network error accepting assignment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAssignmentId) return;

    try {
      setActionLoading(true);
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
        setActionMessage("Assignment rejected. Coordinator notified.");
        setRejectingAssignmentId(null);
        setRejectionReason("");
        fetchAssignments();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to reject"}`);
      }
    } catch (err) {
      setActionMessage("Network error rejecting assignment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoAssignmentId) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/assignments/${infoAssignmentId}/request-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({ info_text: infoText }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Information request logged for coordinator.");
        setInfoAssignmentId(null);
        setInfoText("");
        fetchAssignments();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to request info"}`);
      }
    } catch (err) {
      setActionMessage("Network error requesting information.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnRoute = async (assignmentId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/assignments/${assignmentId}/en-route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({ notes: "Response unit deployed" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Status updated: En Route to location.");
        fetchAssignments();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to mark en route"}`);
      }
    } catch (err) {
      setActionMessage("Network error updating en route.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrived = async (assignmentId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/assignments/${assignmentId}/arrived`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({ notes: "Arrived at scene" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Arrival confirmed on scene.");
        fetchAssignments();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to confirm arrival"}`);
      }
    } catch (err) {
      setActionMessage("Network error confirming arrival.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterventionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interventionAssignmentId || !interventionDesc.trim()) return;

    try {
      setActionLoading(true);
      const providedList = assistanceProvidedText
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const additionalList = additionalNeedsText
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/assignments/${interventionAssignmentId}/interventions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": selectedNgoId,
          "x-responder-id": responderId,
        },
        body: JSON.stringify({
          intervention_type: interventionType,
          description: interventionDesc.trim(),
          assistance_provided: providedList.length > 0 ? providedList : ["general_intervention"],
          additional_needs: additionalList,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage("Field intervention recorded successfully!");
        setInterventionAssignmentId(null);
        setInterventionDesc("");
        setAssistanceProvidedText("");
        setAdditionalNeedsText("");
        fetchAssignments();
      } else {
        setActionMessage(`Error: ${data.error?.message || "Failed to record intervention"}`);
      }
    } catch (err) {
      setActionMessage("Network error recording intervention.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONTACTED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ACCEPTED":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "EN_ROUTE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ARRIVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
      case "INTERVENTION_RECORDED":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const currentPersona = DEMO_NGO_PERSONAS.find((p) => p.id === selectedNgoId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Switch to Coordinator View</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">NGO Responder Workspace</h1>
              <p className="text-xs text-slate-500">
                Live Field Dispatch & Response Terminal (Phase 5)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Persona Switcher Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-teal-600" />
          <span className="text-xs font-semibold text-slate-700">Operating Persona (Demo Simulation):</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedNgoId}
            onChange={(e) => setSelectedNgoId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            {DEMO_NGO_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id})
              </option>
            ))}
          </select>

          <span className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded border border-teal-200 font-mono">
            {responderId}
          </span>
        </div>
      </div>

      {/* Notification banner */}
      {actionMessage && (
        <div className="bg-teal-50 border border-teal-200 text-teal-900 px-4 py-3 rounded-lg text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-teal-600 hover:text-teal-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Incoming Assignments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Assigned Tasks for {currentPersona?.name} ({assignments.length})
          </h2>
          <button
            onClick={fetchAssignments}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            Refresh Inbox
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            Checking assignment inbox...
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-teal-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">Inbox Clear</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No pending dispatch requests assigned to {currentPersona?.name}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((asg) => (
              <div
                key={asg.assignment_id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {asg.case_reference}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">Cycle {asg.matching_cycle}</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border self-start ${getStatusBadge(
                      asg.status
                    )}`}
                  >
                    {asg.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Assigned Requirement:</span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">{asg.requirement}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Assigned: {new Date(asg.assigned_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium">Response Deadline:</span>
                    <div className="font-semibold text-rose-600 mt-0.5">
                      {new Date(asg.response_deadline).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Privacy Safeguard Note */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    Location details are restricted for beneficiary privacy. Full dispatch navigation unredacts upon
                    acceptance.
                  </span>
                </div>

                {/* Action Buttons based on status */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {asg.status === "CONTACTED" && (
                    <>
                      <button
                        onClick={() => {
                          setRejectingAssignmentId(asg.assignment_id);
                          setRejectionReason("");
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setInfoAssignmentId(asg.assignment_id);
                          setInfoText("");
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition"
                      >
                        Request Info
                      </button>
                      <button
                        onClick={() => handleAccept(asg.assignment_id)}
                        disabled={actionLoading}
                        className="px-4 py-1.5 text-xs font-semibold rounded bg-teal-600 text-white hover:bg-teal-700 transition"
                      >
                        Accept Assignment
                      </button>
                    </>
                  )}

                  {asg.status === "ACCEPTED" && (
                    <>
                      <button
                        onClick={() => handleEnRoute(asg.assignment_id)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>Mark En Route</span>
                      </button>
                      <button
                        onClick={() => handleArrived(asg.assignment_id)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Confirm Arrival</span>
                      </button>
                    </>
                  )}

                  {asg.status === "EN_ROUTE" && (
                    <button
                      onClick={() => handleArrived(asg.assignment_id)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Confirm Arrival on Scene</span>
                    </button>
                  )}

                  {asg.status === "ARRIVED" && (
                    <button
                      onClick={() => {
                        setInterventionAssignmentId(asg.assignment_id);
                        setInterventionDesc("");
                        setAssistanceProvidedText(asg.requirement);
                        setAdditionalNeedsText("");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>Record Intervention</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Intervention Modal */}
      {interventionAssignmentId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Record Field Intervention</h3>
              <button
                onClick={() => setInterventionAssignmentId(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInterventionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intervention Type:</label>
                <select
                  value={interventionType}
                  onChange={(e) => setInterventionType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="first_aid_provided">First Aid Provided</option>
                  <option value="veterinary_assessment">Veterinary Assessment</option>
                  <option value="medical_assistance">Medical Assistance</option>
                  <option value="transport_arranged">Transport Arranged</option>
                  <option value="shelter_provided">Shelter Provided</option>
                  <option value="food_provided">Food Provided</option>
                  <option value="other">Other Field Action</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Intervention Description (Observations & actions):
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail condition found, immediate care provided, patient stabilization..."
                  value={interventionDesc}
                  onChange={(e) => setInterventionDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assistance Items Provided (comma-separated):
                </label>
                <input
                  type="text"
                  required
                  placeholder="wound_dressing, oral_hydration, pain_relief"
                  value={assistanceProvidedText}
                  onChange={(e) => setAssistanceProvidedText(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-1">
                <label className="block font-semibold text-orange-900">
                  Additional Needs Discovered (Triggers Recursive Follow-Up):
                </label>
                <p className="text-[11px] text-orange-700">
                  If the beneficiary requires follow-up care that your organisation cannot provide, list them here:
                </p>
                <input
                  type="text"
                  placeholder="orthopedic_surgery, long_term_shelter, inpatient_ward"
                  value={additionalNeedsText}
                  onChange={(e) => setAdditionalNeedsText(e.target.value)}
                  className="w-full p-2 bg-white border border-orange-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setInterventionAssignmentId(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Submit Intervention"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingAssignmentId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Reject Assignment</h3>
            <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Rejection:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Resource constraints, vehicle maintenance, outside active hours..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setRejectingAssignmentId(null)}
                  className="px-3 py-1 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Request Modal */}
      {infoAssignmentId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Request More Information</h3>
            <form onSubmit={handleInfoSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Information Required:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Need details regarding access restrictions, landmark, or current condition..."
                  value={infoText}
                  onChange={(e) => setInfoText(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setInfoAssignmentId(null)}
                  className="px-3 py-1 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
