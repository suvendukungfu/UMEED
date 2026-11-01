"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  Truck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  MapPin,
  FileText,
  UploadCloud,
  Send,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface CaseItem {
  caseId: string;
  publicCaseRef: string;
  incidentRef: string;
  serviceType: string;
  status: "ACCEPTED" | "WORK_STARTED" | "IN_PROGRESS" | "RESOLVED";
  assignedResponder: string;
  location: string;
  district: string;
  timeline: Array<{ timestamp: string; note: string; author: string }>;
}

const SAMPLE_CASES: CaseItem[] = [
  {
    caseId: "case_01",
    publicCaseRef: "CASE-DELHI-0912",
    incidentRef: "UMD-99BF-400A",
    serviceType: "injured_animal",
    status: "IN_PROGRESS",
    assignedResponder: "Amit Kumar (Paramedic Driver)",
    location: "Plot 14, Community Centre, Pitampura",
    district: "North West Delhi",
    timeline: [
      {
        timestamp: "2026-10-31T20:15:00.000Z",
        note: "Assignment accepted by Jan Seva dispatch desk.",
        author: "Pooja Verma (Operator)",
      },
      {
        timestamp: "2026-10-31T20:25:00.000Z",
        note: "Ambulance Van #3 dispatched with surgical kit.",
        author: "Vikram Malhotra (Admin)",
      },
      {
        timestamp: "2026-10-31T20:42:00.000Z",
        note: "Arrived on scene, canine stabilized with antiseptic dressing.",
        author: "Amit Kumar (Responder)",
      },
    ],
  },
  {
    caseId: "case_02",
    publicCaseRef: "CASE-DELHI-0850",
    incidentRef: "UMD-33C1-9988",
    serviceType: "animal_ambulance",
    status: "RESOLVED",
    assignedResponder: "Amit Kumar",
    location: "Sector 9, Rohini",
    district: "North West Delhi",
    timeline: [
      {
        timestamp: "2026-10-30T14:00:00.000Z",
        note: "Injured stray puppy admitted to inpatient surgical shelter.",
        author: "Dr. Rajesh Sharma (Owner)",
      },
      {
        timestamp: "2026-10-30T17:30:00.000Z",
        note: "Surgical intervention successful, wound stitched and vaccinated.",
        author: "Dr. Rajesh Sharma",
      },
    ],
  },
];

export default function NGOCasesPage() {
  const { context } = useAuth();
  const [cases, setCases] = useState<CaseItem[]>(SAMPLE_CASES);
  const [selectedCase, setSelectedCase] = useState<CaseItem>(SAMPLE_CASES[0]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const updatedTimeline = [
      ...selectedCase.timeline,
      {
        timestamp: new Date().toISOString(),
        note: newNote.trim(),
        author: `${context?.user.name || "Operator"} (${context?.session.activeRole || "Staff"})`,
      },
    ];

    const updatedCase = {
      ...selectedCase,
      timeline: updatedTimeline,
      status: selectedCase.status === "ACCEPTED" ? ("IN_PROGRESS" as const) : selectedCase.status,
    };

    setSelectedCase(updatedCase);
    setCases((prev) => prev.map((c) => (c.caseId === updatedCase.caseId ? updatedCase : c)));
    setNewNote("");
  };

  const handleMarkResolved = () => {
    if (selectedCase.status === "RESOLVED") return;
    const resolvedCase: CaseItem = {
      ...selectedCase,
      status: "RESOLVED",
      timeline: [
        ...selectedCase.timeline,
        {
          timestamp: new Date().toISOString(),
          note: "Assistance completed successfully. Formal resolution verified by organization head.",
          author: context?.user.name || "Dr. Rajesh Sharma",
        },
      ],
    };
    setSelectedCase(resolvedCase);
    setCases((prev) => prev.map((c) => (c.caseId === resolvedCase.caseId ? resolvedCase : c)));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/app/ngo"
          className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to NGO Dashboard
        </Link>
        <span className="text-xs font-mono font-semibold text-forest-600">
          Tenant: <strong className="text-forest-900">{context?.activeOrganization?.name || "Jan Seva"}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cases Sidebar List */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-warm-grey-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-warm-grey-100">
            <h2 className="font-bold text-sm text-forest-950 flex items-center gap-2">
              <Truck className="h-4 w-4 text-forest-700" />
              Active Field Assignments ({cases.length})
            </h2>
          </div>

          <div className="space-y-2">
            {cases.map((c) => (
              <button
                key={c.caseId}
                type="button"
                onClick={() => setSelectedCase(c)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedCase.caseId === c.caseId
                    ? "bg-forest-900 text-white border-forest-900 shadow-xs"
                    : "bg-paper hover:bg-warm-grey-100 border-warm-grey-200 text-forest-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold">{c.publicCaseRef}</span>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                      selectedCase.caseId === c.caseId
                        ? "bg-white/20 text-white"
                        : c.status === "RESOLVED"
                        ? "bg-sage-100 text-forest-800"
                        : "bg-coral-100 text-coral-800"
                    }`}
                  >
                    {c.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div
                  className={`text-xs font-semibold capitalize ${
                    selectedCase.caseId === c.caseId ? "text-white/90" : "text-forest-800"
                  }`}
                >
                  {c.serviceType.replace(/_/g, " ")}
                </div>
                <div
                  className={`text-[11px] mt-1 flex items-center gap-1 ${
                    selectedCase.caseId === c.caseId ? "text-white/70" : "text-forest-500"
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  <span>{c.district}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Case Workspace */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-warm-grey-100">
            <div>
              <span className="text-[10px] font-mono font-bold text-forest-500 uppercase">
                Active Operational Case
              </span>
              <h2 className="text-xl font-bold font-mono text-forest-950">
                {selectedCase.publicCaseRef}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                  selectedCase.status === "RESOLVED"
                    ? "bg-sage-100 text-forest-800 border border-sage-300"
                    : "bg-coral-100 text-coral-800 border border-coral-200"
                }`}
              >
                {selectedCase.status.replace(/_/g, " ")}
              </span>

              {selectedCase.status !== "RESOLVED" && (
                <button
                  type="button"
                  onClick={handleMarkResolved}
                  className="px-3.5 py-1.5 rounded-xl bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete & Resolve
                </button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-paper border border-warm-grey-200">
              <div className="text-[11px] text-forest-500 mb-0.5">Assigned Responder</div>
              <div className="text-xs font-semibold text-forest-900">{selectedCase.assignedResponder}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-paper border border-warm-grey-200">
              <div className="text-[11px] text-forest-500 mb-0.5">Field Address (Authorized Precision)</div>
              <div className="text-xs font-semibold text-forest-900">{selectedCase.location}</div>
            </div>
          </div>

          {/* Timeline Feed */}
          <div>
            <h3 className="text-xs font-bold text-forest-700 uppercase tracking-wider mb-3 font-mono">
              Operational Case Timeline
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {selectedCase.timeline.map((event, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-paper border border-warm-grey-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-forest-900">{event.author}</span>
                    <span className="font-mono text-[10px] text-forest-500">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-forest-700 leading-relaxed">{event.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Add Note Form */}
          {selectedCase.status !== "RESOLVED" ? (
            <form onSubmit={handleAddNote} className="space-y-3 pt-2 border-t border-warm-grey-100">
              <label className="block text-xs font-semibold text-forest-800">
                Record Verified Field Progress Note
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Paramedic arrived at shelter depot, patient resting comfortably..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-coral-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  Post Note
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-sage-50 border border-sage-200 text-forest-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-forest-700 shrink-0" />
              <span>This case is permanently resolved. Modifications require explicit coordinator reopening.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

