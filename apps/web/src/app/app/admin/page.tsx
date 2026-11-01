"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  ShieldAlert,
  Building2,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface VerificationCandidate {
  orgId: string;
  name: string;
  regNumber: string;
  category: string;
  status: "SUBMITTED" | "VERIFIED" | "SUSPENDED";
  submittedAt: string;
}

const SAMPLE_ORGS: VerificationCandidate[] = [
  {
    orgId: "NGO-DELHI-004",
    name: "Asha Elder Care & Medical Relief",
    regNumber: "DL/2021/8871",
    category: "elderly_care",
    status: "SUBMITTED",
    submittedAt: "2026-10-28",
  },
  {
    orgId: "NGO-DELHI-001",
    name: "Jan Seva Animal Emergency Ambulance",
    regNumber: "DL/2024/0981",
    category: "injured_animal",
    status: "VERIFIED",
    submittedAt: "2026-03-15",
  },
  {
    orgId: "NGO-DELHI-008",
    name: "Delhi Discredited Relief Network",
    regNumber: "DL/2019/0011",
    category: "injured_animal",
    status: "SUSPENDED",
    submittedAt: "2026-01-10",
  },
];

export default function PlatformAdminPage() {
  const { context } = useAuth();
  const [orgs, setOrgs] = useState<VerificationCandidate[]>(SAMPLE_ORGS);
  const [selectedOrg, setSelectedOrg] = useState<VerificationCandidate>(SAMPLE_ORGS[0]);

  const handleVerify = (orgId: string) => {
    setOrgs(orgs.map((o) => (o.orgId === orgId ? { ...o, status: "VERIFIED" } : o)));
    if (selectedOrg.orgId === orgId) {
      setSelectedOrg({ ...selectedOrg, status: "VERIFIED" });
    }
  };

  const handleSuspend = (orgId: string) => {
    setOrgs(orgs.map((o) => (o.orgId === orgId ? { ...o, status: "SUSPENDED" } : o)));
    if (selectedOrg.orgId === orgId) {
      setSelectedOrg({ ...selectedOrg, status: "SUSPENDED" });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-warm-grey-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-forest-950">
              Platform Administration & Verification Portal
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-forest-950 text-white">
              PLATFORM ADMIN
            </span>
          </div>
          <p className="text-xs text-forest-600 mt-1">
            Logged in as <strong className="text-forest-900">{context?.user.name || "Platform Operations Lead"}</strong> &bull; Non-negotiable human verification for incoming NGOs and compliance enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/api/health"
            target="_blank"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-paper hover:bg-warm-grey-100 text-forest-800 border border-warm-grey-200 transition-colors"
          >
            Sanitized Health Diagnostic &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* NGO Application List */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-warm-grey-200 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-forest-950 pb-3 border-b border-warm-grey-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-forest-700" />
            NGO Verification Queue ({orgs.length})
          </h2>

          <div className="space-y-2">
            {orgs.map((org) => (
              <button
                key={org.orgId}
                type="button"
                onClick={() => setSelectedOrg(org)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedOrg.orgId === org.orgId
                    ? "bg-forest-900 text-white border-forest-900 shadow-xs"
                    : "bg-paper hover:bg-warm-grey-100 border-warm-grey-200 text-forest-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold">{org.orgId}</span>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                      selectedOrg.orgId === org.orgId
                        ? "bg-white/20 text-white"
                        : org.status === "VERIFIED"
                        ? "bg-sage-100 text-forest-800"
                        : org.status === "SUSPENDED"
                        ? "bg-coral-100 text-coral-800"
                        : "bg-warm-grey-100 text-forest-800"
                    }`}
                  >
                    {org.status}
                  </span>
                </div>
                <div
                  className={`text-xs font-semibold ${
                    selectedOrg.orgId === org.orgId ? "text-white/90" : "text-forest-900"
                  }`}
                >
                  {org.name}
                </div>
                <div
                  className={`text-[11px] mt-1 font-mono ${
                    selectedOrg.orgId === org.orgId ? "text-white/70" : "text-forest-500"
                  }`}
                >
                  {org.regNumber}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Verification Review Workspace */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-warm-grey-100">
            <div>
              <span className="text-[10px] font-mono font-bold text-forest-500 uppercase">
                NGO Verification Candidate
              </span>
              <h2 className="text-xl font-bold text-forest-950">{selectedOrg.name}</h2>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                selectedOrg.status === "VERIFIED"
                  ? "bg-sage-100 text-forest-800 border border-sage-300"
                  : selectedOrg.status === "SUSPENDED"
                  ? "bg-coral-100 text-coral-800 border border-coral-300"
                  : "bg-warm-grey-100 text-forest-800"
              }`}
            >
              {selectedOrg.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-paper border border-warm-grey-200">
              <div className="text-[11px] text-forest-500 mb-0.5">Registration Number</div>
              <div className="text-xs font-mono font-bold text-forest-900">{selectedOrg.regNumber}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-paper border border-warm-grey-200">
              <div className="text-[11px] text-forest-500 mb-0.5">Application Submitted Date</div>
              <div className="text-xs font-mono text-forest-900">{selectedOrg.submittedAt}</div>
            </div>
          </div>

          {/* Action Box */}
          <div className="p-5 rounded-2xl bg-paper border border-warm-grey-200 space-y-3">
            <h3 className="text-xs font-bold text-forest-900">
              Administrative Decision & Sanctions Control
            </h3>
            <p className="text-xs text-forest-600 leading-relaxed">
              Verifying this organization authorizes it to receive automatic geospatial wave matching offers. Suspending it immediately revokes all pending offers and blocks all staff access.
            </p>

            <div className="flex items-center gap-3 pt-2">
              {selectedOrg.status !== "VERIFIED" && (
                <button
                  type="button"
                  onClick={() => handleVerify(selectedOrg.orgId)}
                  className="px-4 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Grant Platform Verification
                </button>
              )}

              {selectedOrg.status !== "SUSPENDED" && (
                <button
                  type="button"
                  onClick={() => handleSuspend(selectedOrg.orgId)}
                  className="px-4 py-2 rounded-xl bg-coral-600 text-white text-xs font-semibold hover:bg-coral-700 flex items-center gap-1.5"
                >
                  <XCircle className="h-4 w-4" />
                  Suspend Organization
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

