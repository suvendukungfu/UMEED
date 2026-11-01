"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  ArrowLeft,
  Lock,
} from "lucide-react";

const LIFECYCLE_STEPS = [
  { step: 1, name: "Identity & Contacts", status: "completed" },
  { step: 2, name: "Registration Proof", status: "completed" },
  { step: 3, name: "Service Capabilities", status: "completed" },
  { step: 4, name: "Geographic Coverage", status: "completed" },
  { step: 5, name: "Depot GPS Coordinates", status: "completed" },
  { step: 6, name: "Capacity Declaration", status: "completed" },
  { step: 7, name: "Document Upload", status: "completed" },
  { step: 8, name: "Application Submission", status: "completed" },
  { step: 9, name: "Sanctions & Background", status: "completed" },
  { step: 10, name: "Coordinator Verification", status: "completed" },
  { step: 11, name: "Platform Admin Sign-Off", status: "completed" },
  { step: 12, name: "Active Matching Eligibility", status: "completed" },
];

export default function NGOOnboardingPage() {
  const { context } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link
          href="/app/ngo"
          className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to NGO Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-warm-grey-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-forest-900 text-white flex items-center justify-center font-bold text-lg">
              <Building2 className="h-6 w-6 text-coral-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-forest-950">
                Organization Verification & Onboarding
              </h1>
              <p className="text-xs text-forest-600 mt-0.5">
                Statutory registration, operational capabilities, and compliance audit profile.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-sage-100 text-forest-800 border border-sage-300">
              <ShieldCheck className="h-4 w-4 text-forest-700" />
              STATUS: VERIFIED
            </span>
          </div>
        </div>

        {/* 12-Step Lifecycle Indicator */}
        <div className="py-6 border-b border-warm-grey-100">
          <h2 className="text-xs font-bold text-forest-700 uppercase tracking-wider mb-3 font-mono">
            12-Step Verification Lifecycle & Compliance Status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {LIFECYCLE_STEPS.map((s) => (
              <div
                key={s.step}
                className="p-3 rounded-xl bg-sage-50/50 border border-sage-200 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-forest-500">
                    Step {s.step}
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-forest-700" />
                </div>
                <div className="text-[11px] font-semibold text-forest-950 leading-tight">
                  {s.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Organization Information Form */}
        <div className="py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-forest-800 mb-1">
                Official Registered NGO Name
              </label>
              <input
                type="text"
                readOnly
                value="Jan Seva Animal Emergency Ambulance"
                className="w-full px-3 py-2 text-sm rounded-xl border border-warm-grey-300 bg-paper text-forest-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-800 mb-1">
                Legal Entity Type
              </label>
              <input
                type="text"
                readOnly
                value="Registered Public Charitable Trust"
                className="w-full px-3 py-2 text-sm rounded-xl border border-warm-grey-300 bg-paper text-forest-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-800 mb-1">
                Registration Authority & Number
              </label>
              <input
                type="text"
                readOnly
                value="Delhi Registrar of Societies (DL/2024/0981)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-warm-grey-300 bg-paper text-forest-900 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest-800 mb-1">
                24x7 Emergency Contact Channel
              </label>
              <input
                type="text"
                readOnly
                value="+91-98765-01101 (Verified Mobile Voice & SMS)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-warm-grey-300 bg-paper text-forest-900 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forest-800 mb-2">
              Verified Service Capabilities
            </label>
            <div className="flex flex-wrap gap-2">
              {["injured_animal", "veterinary_care", "animal_ambulance", "fracture_stabilization", "avian_rescue"].map((cap) => (
                <span
                  key={cap}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-forest-50 text-forest-900 border border-forest-200"
                >
                  ✓ {cap.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forest-800 mb-2">
              Verified Covered Districts in Delhi NCR
            </label>
            <div className="flex flex-wrap gap-2">
              {["North West Delhi", "North Delhi", "West Delhi", "Pitampura", "Rohini"].map((area) => (
                <span
                  key={area}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-paper text-forest-800 border border-warm-grey-300"
                >
                  📍 {area}
                </span>
              ))}
            </div>
          </div>

          {/* Strict Integrity Warning */}
          <div className="p-4 rounded-xl bg-warm-grey-50 border border-warm-grey-200 flex items-start gap-3">
            <Lock className="h-5 w-5 text-forest-700 shrink-0 mt-0.5" />
            <div className="text-xs text-forest-700 leading-relaxed">
              <strong className="text-forest-900">Platform Non-Negotiable Invariant:</strong> An organization cannot self-verify its own legal status. Verification approvals and status suspensions are strictly reserved for platform administrators under audited humanitarian compliance checks.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

