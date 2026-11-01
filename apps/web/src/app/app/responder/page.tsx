"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Phone,
} from "lucide-react";

interface ResponderTask {
  assignmentId: string;
  publicCaseRef: string;
  category: string;
  status: "ASSIGNED" | "ACKNOWLEDGED" | "EN_ROUTE" | "ON_SITE" | "IN_PROGRESS" | "RESOLVED";
  address: string;
  district: string;
  notes: string;
  lat: number;
  lng: number;
}

const SAMPLE_TASKS: ResponderTask[] = [
  {
    assignmentId: "asgn_resp_001",
    publicCaseRef: "CASE-DELHI-0912",
    category: "injured_animal",
    status: "EN_ROUTE",
    address: "Netaji Subhash Place, Pitampura, Delhi",
    district: "North West Delhi",
    notes: "Canine with severe paw laceration. Emergency trauma kit and antibiotics loaded in Van #3.",
    lat: 28.6972,
    lng: 77.135,
  },
];

export default function FieldResponderPage() {
  const { context } = useAuth();
  const [tasks, setTasks] = useState<ResponderTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ResponderTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fieldNote, setFieldNote] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("umeed_session_token");
      const res = await fetch("/api/assignments", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        const asgns = json.data?.assignments || [];
        setTasks(asgns);
        if (asgns.length > 0) {
          setSelectedTask(asgns[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load assigned tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [context?.session.activeOrganizationId]);

  const advanceStatus = async (nextStatus: "ACKNOWLEDGED" | "EN_ROUTE" | "ON_SITE" | "IN_PROGRESS" | "RESOLVED") => {
    if (!selectedTask) return;
    try {
      setActionLoading(true);
      setStatusMessage(null);
      const token = localStorage.getItem("umeed_session_token");
      const endpoint =
        nextStatus === "EN_ROUTE"
          ? `/api/assignments/${selectedTask.assignmentId}/en-route`
          : nextStatus === "ON_SITE"
          ? `/api/assignments/${selectedTask.assignmentId}/arrived`
          : `/api/assignments/${selectedTask.assignmentId}/interventions`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          notes: fieldNote || `Field responder updated status to ${nextStatus}`,
          interventionType: "EMERGENCY_FIELD_CARE",
        }),
      });

      if (res.ok) {
        setStatusMessage(`Status advanced to ${nextStatus}.`);
        setFieldNote("");
        await fetchTasks();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setStatusMessage(`Update failed: ${errJson.error?.message || "Check network"}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Mobile-first Responder Header */}
      <div className="bg-forest-950 text-white p-5 sm:p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-coral-500 text-white">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-bold">Field Responder Cockpit</h1>
              <p className="text-xs text-sage-300">
                Logged in as <strong className="text-white">{context?.user.name || "Amit Kumar (Paramedic)"}</strong>
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-forest-800 text-sage-200 border border-forest-700">
            VAN #3 ON DUTY
          </span>
        </div>
        <p className="text-xs text-sage-300 leading-relaxed">
          Tenancy-isolated responder console. You can only view and update assignments allocated explicitly to your vehicle.
        </p>
      </div>

      {/* Empty State */}
      {!loading && !selectedTask && (
        <div className="bg-white rounded-2xl border border-warm-grey-200 shadow-sm p-12 text-center text-forest-600 space-y-3">
          <CheckCircle2 className="h-10 w-10 text-sage-600 mx-auto" />
          <h2 className="text-base font-bold text-forest-950">No Active Field Assignments</h2>
          <p className="text-xs max-w-sm mx-auto">
            You currently have no emergency dispatch assignments. Your mobile terminal is registered and on standby for coordinated dispatch.
          </p>
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-800 font-medium">
          {statusMessage}
        </div>
      )}

      {/* Task Card */}
      {selectedTask && (
        <div className="bg-white rounded-2xl border border-warm-grey-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-warm-grey-100">
            <div>
              <span className="text-[10px] font-mono font-bold text-forest-500 uppercase">
                Active Assignment
              </span>
              <h2 className="text-lg font-bold font-mono text-forest-950">
                {selectedTask.publicCaseRef}
              </h2>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                selectedTask.status === "RESOLVED"
                  ? "bg-sage-100 text-forest-800 border border-sage-300"
                  : "bg-coral-100 text-coral-800 border border-coral-200"
              }`}
            >
              {selectedTask.status.replace(/_/g, " ")}
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-forest-500 mb-1">Target Location</div>
            <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-paper border border-warm-grey-200">
              <div className="flex items-start gap-2 text-xs text-forest-800">
                <MapPin className="h-4 w-4 text-coral-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{selectedTask.address}</div>
                  <div className="text-forest-500">{selectedTask.district}</div>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedTask.lat},${selectedTask.lng}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 flex items-center gap-1 shrink-0"
              >
                <Navigation className="h-3 w-3" />
                Navigate
              </a>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-forest-500 mb-1">Distress Details</div>
            <p className="text-xs text-forest-800 p-3.5 rounded-xl bg-paper border border-warm-grey-200 leading-relaxed">
              {selectedTask.notes}
            </p>
          </div>

          {/* Large Touch Target Status Action Bar */}
          <div className="pt-2 border-t border-warm-grey-100 space-y-2">
            <div className="text-xs font-bold text-forest-700 font-mono uppercase">
              Field Action Update
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                disabled={selectedTask.status !== "ASSIGNED"}
                onClick={() => advanceStatus("ACKNOWLEDGED")}
                className="py-3 px-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 bg-paper hover:bg-warm-grey-100 text-forest-900"
              >
                1. Acknowledge
              </button>
              <button
                type="button"
                disabled={selectedTask.status !== "ACKNOWLEDGED"}
                onClick={() => advanceStatus("EN_ROUTE")}
                className="py-3 px-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 bg-coral-50 hover:bg-coral-100 text-coral-900 border-coral-200"
              >
                2. En Route
              </button>
              <button
                type="button"
                disabled={selectedTask.status !== "EN_ROUTE"}
                onClick={() => advanceStatus("ON_SITE")}
                className="py-3 px-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 bg-forest-50 hover:bg-forest-100 text-forest-900 border-forest-200"
              >
                3. On Site
              </button>
              <button
                type="button"
                disabled={selectedTask.status !== "ON_SITE" && selectedTask.status !== "IN_PROGRESS"}
                onClick={() => advanceStatus("RESOLVED")}
                className="py-3 px-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 bg-forest-900 hover:bg-forest-800 text-white"
              >
                4. Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

