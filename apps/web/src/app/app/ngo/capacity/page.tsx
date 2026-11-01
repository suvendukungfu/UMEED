"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Shield,
  Save,
} from "lucide-react";

export default function NGOCapacityPage() {
  const { context } = useAuth();
  const [availability, setAvailability] = useState("CONFIRMED_AVAILABLE");
  const [ambulances, setAmbulances] = useState(6);
  const [surgeSlots, setSurgeSlots] = useState(4);
  const [operatingHours, setOperatingHours] = useState("24x7 Emergency Ambulance");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
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

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs">
        <div className="flex items-center gap-3 border-b border-warm-grey-100 pb-5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-sage-50 text-forest-800 flex items-center justify-center font-bold">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-forest-950">
              Capacity & Availability Management
            </h1>
            <p className="text-xs text-forest-600">
              Update real-time fleet, surge slots, and emergency status for automated matching.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-6 p-3.5 rounded-xl bg-sage-50 border border-sage-200 text-forest-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-forest-700" />
            <span>Operational capacity and availability updated successfully. Timestamp logged to audit record.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Availability Status */}
          <div>
            <label className="block text-xs font-semibold text-forest-800 mb-2">
              Current Service Availability Status
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "CONFIRMED_AVAILABLE", label: "Confirmed Available", desc: "Ready for immediate wave outreach" },
                { id: "LIMITED_CAPACITY", label: "Limited Capacity", desc: "Accepting high-urgency only" },
                { id: "AT_CAPACITY", label: "At Capacity / Suspended", desc: "Excludes from automated dispatch" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAvailability(opt.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    availability === opt.id
                      ? "bg-forest-900 text-white border-forest-900 shadow-xs"
                      : "bg-paper hover:bg-warm-grey-100 border-warm-grey-200 text-forest-900"
                  }`}
                >
                  <div className="font-bold text-xs mb-1">{opt.label}</div>
                  <div
                    className={`text-[11px] ${
                      availability === opt.id ? "text-white/70" : "text-forest-500"
                    }`}
                  >
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-forest-800 mb-1">
                Active Operational Vehicles / Ambulances
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={ambulances}
                onChange={(e) => setAmbulances(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-warm-grey-300 font-mono focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
              <span className="text-[11px] text-forest-500 mt-1 block">
                Number of ambulances staffed with drivers and first-aid equipment.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-800 mb-1">
                Available Inpatient / Surge Bed Slots
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={surgeSlots}
                onChange={(e) => setSurgeSlots(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-warm-grey-300 font-mono focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
              <span className="text-[11px] text-forest-500 mt-1 block">
                Bed capacity at Jan Seva Netaji Subhash Place depot.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forest-800 mb-1">
              Operating Hours Specification
            </label>
            <input
              type="text"
              value={operatingHours}
              onChange={(e) => setOperatingHours(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>

          <div className="pt-4 border-t border-warm-grey-100 flex items-center justify-between">
            <div className="text-xs text-forest-500 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Last confirmed: Just now by Dr. Rajesh Sharma</span>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-forest-900 text-white font-semibold text-xs hover:bg-forest-800 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Capacity Snapshot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

