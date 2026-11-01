"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  Building2,
  ShieldCheck,
  Bell,
  Clock,
  ArrowRight,
  Truck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
} from "lucide-react";

export default function NGODashboardPage() {
  const { context } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeOffers: 0,
    activeAssignments: 0,
    availableCapacity: 0,
    totalCapacity: 0,
    teamMembersCount: 0,
    verificationStatus: "VERIFIED",
  });

  useEffect(() => {
    async function fetchOrgMetrics() {
      try {
        const token = localStorage.getItem("umeed_session_token");
        const res = await fetch("/api/ngo/metrics", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setMetrics({
              activeOffers: json.data.activeOffers,
              activeAssignments: json.data.activeAssignments,
              availableCapacity: json.data.availableCapacity,
              totalCapacity: json.data.totalCapacity,
              teamMembersCount: json.data.teamMembersCount,
              verificationStatus: json.data.verificationStatus,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load organization metrics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrgMetrics();
  }, [context?.session.activeOrganizationId]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Org Identity */}
      <div className="bg-white p-6 rounded-2xl border border-warm-grey-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-forest-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            <Building2 className="h-7 w-7 text-coral-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-forest-950">
                {context?.activeOrganization?.name || "Jan Seva Animal Emergency Ambulance"}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-sage-100 text-forest-800 border border-sage-300">
                <ShieldCheck className="h-3.5 w-3.5 text-forest-700" />
                OPERATIONALLY VERIFIED
              </span>
            </div>
            <p className="text-xs text-forest-600 mt-1">
              Organization Tenancy: <code className="font-mono bg-paper px-1 rounded">{context?.activeOrganization?.organizationId || "NGO-DELHI-001"}</code> &bull; Active Role: <span className="font-semibold text-coral-700">{context?.session.activeRole || "NGO_OWNER"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/ngo/onboarding"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-paper hover:bg-warm-grey-100 text-forest-800 border border-warm-grey-200 transition-colors"
          >
            Verification Profile
          </Link>
          <Link
            href="/app/ngo/capacity"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-forest-900 hover:bg-forest-800 text-white transition-colors"
          >
            Update Capacity
          </Link>
        </div>
      </div>

      {/* Operational KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Incoming Offers */}
        <Link
          href="/app/ngo/requests"
          className="p-5 rounded-2xl bg-white border border-warm-grey-200 hover:border-coral-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-forest-600">Incoming Wave Offers</span>
            <span className="p-2 rounded-xl bg-coral-50 text-coral-600">
              <Bell className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-forest-950 mb-1">
            {metrics.activeOffers}
          </div>
          <div className="text-xs text-coral-600 font-medium flex items-center gap-1">
            <span>SLA Response Window Active</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Active Cases */}
        <Link
          href="/app/ngo/cases"
          className="p-5 rounded-2xl bg-white border border-warm-grey-200 hover:border-forest-600 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-forest-600">Active Field Cases</span>
            <span className="p-2 rounded-xl bg-forest-50 text-forest-800">
              <Truck className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-forest-950 mb-1">
            {metrics.activeAssignments}
          </div>
          <div className="text-xs text-forest-600 flex items-center gap-1">
            <span>Dispatched in Delhi NCR</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Available Capacity */}
        <Link
          href="/app/ngo/capacity"
          className="p-5 rounded-2xl bg-white border border-warm-grey-200 hover:border-sage-500 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-forest-600">Confirmed Capacity</span>
            <span className="p-2 rounded-xl bg-sage-50 text-forest-800">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-forest-950 mb-1">
            {metrics.availableCapacity} / {metrics.totalCapacity}
          </div>
          <div className="text-xs text-forest-600 flex items-center gap-1">
            <span>Ambulances & Surge Slots</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Organization Team */}
        <Link
          href="/app/ngo/team"
          className="p-5 rounded-2xl bg-white border border-warm-grey-200 hover:border-forest-600 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-forest-600">Organization Staff</span>
            <span className="p-2 rounded-xl bg-warm-grey-100 text-forest-800">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-forest-950 mb-1">
            {metrics.teamMembersCount}
          </div>
          <div className="text-xs text-forest-600 flex items-center gap-1">
            <span>Owners, Admins, Responders</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Main Modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-warm-grey-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 rounded-xl bg-coral-50 text-coral-700 flex items-center justify-center font-bold mb-3">
              <Bell className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-forest-950 mb-1">Incoming Wave Offers</h3>
            <p className="text-xs text-forest-600 leading-relaxed mb-4">
              Review exclusive, time-bound assistance requests dispatched by humanitarian coordinators. Atomically accept or decline offers with structured reasons.
            </p>
          </div>
          <Link
            href="/app/ngo/requests"
            className="w-full py-2.5 rounded-xl bg-forest-900 text-white font-semibold text-xs text-center hover:bg-forest-800 transition-colors"
          >
            Open Requests Queue &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-warm-grey-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 rounded-xl bg-forest-50 text-forest-900 flex items-center justify-center font-bold mb-3">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-forest-950 mb-1">Active Case Workspace</h3>
            <p className="text-xs text-forest-600 leading-relaxed mb-4">
              Track accepted assignments, assign paramedics, log field progress notes, upload clinical or shelter rescue evidence, and submit completed resolutions.
            </p>
          </div>
          <Link
            href="/app/ngo/cases"
            className="w-full py-2.5 rounded-xl bg-forest-900 text-white font-semibold text-xs text-center hover:bg-forest-800 transition-colors"
          >
            Manage Active Cases &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-warm-grey-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 rounded-xl bg-sage-50 text-forest-900 flex items-center justify-center font-bold mb-3">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-forest-950 mb-1">Capacity & Availability</h3>
            <p className="text-xs text-forest-600 leading-relaxed mb-4">
              Declare active ambulance availability, update shelter capacity, adjust covered wards in Delhi NCR, and ensure your organization remains eligible for matching.
            </p>
          </div>
          <Link
            href="/app/ngo/capacity"
            className="w-full py-2.5 rounded-xl bg-forest-900 text-white font-semibold text-xs text-center hover:bg-forest-800 transition-colors"
          >
            Configure Capacity &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

