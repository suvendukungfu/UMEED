"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import { useToast } from "@/components/ui/Toast";
import {
  Bell,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  Lock,
  ChevronRight,
  Flame,
} from "lucide-react";

interface IncomingOffer {
  attemptId: string;
  requirementId: string;
  publicCaseRef: string;
  serviceType: string;
  urgency: "critical" | "high" | "medium";
  district: string;
  ward: string;
  description: string;
  expiresInMinutes: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
}

const SAMPLE_OFFERS: IncomingOffer[] = [
  {
    attemptId: "att_live_001",
    requirementId: "req_delhi_8819",
    publicCaseRef: "CASE-DELHI-0912",
    serviceType: "injured_animal",
    urgency: "critical",
    district: "North West Delhi",
    ward: "Ward 55 Pitampura",
    description: "Stray canine with severe deep paw laceration and acute dehydration near metro station.",
    expiresInMinutes: 12,
    status: "PENDING",
  },
  {
    attemptId: "att_live_002",
    requirementId: "req_delhi_8820",
    publicCaseRef: "CASE-DELHI-0914",
    serviceType: "veterinary_care",
    urgency: "high",
    district: "North Delhi",
    ward: "Ward 12 Civil Lines",
    description: "Injured avian rescue required, wing fracture stabilization needed on site.",
    expiresInMinutes: 28,
    status: "PENDING",
  },
];

export default function NGORequestsPage() {
  const { context } = useAuth();
  const { success, warning, info } = useToast();
  const [offers, setOffers] = useState<IncomingOffer[]>(SAMPLE_OFFERS);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declineModalOffer, setDeclineModalOffer] = useState<IncomingOffer | null>(null);
  const [declineReason, setDeclineReason] = useState("AT_CAPACITY");

  const handleAccept = async (attemptId: string, caseRef: string) => {
    setActionLoading(attemptId);
    try {
      // Simulate real atomic lock roundtrip
      await new Promise((r) => setTimeout(r, 600));
      setOffers((prev) =>
        prev.map((o) => (o.attemptId === attemptId ? { ...o, status: "ACCEPTED" } : o))
      );
      success("Assignment Claimed", `${caseRef} locked to your NGO response queue.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineConfirm = async () => {
    if (!declineModalOffer) return;
    const caseRef = declineModalOffer.publicCaseRef;
    setActionLoading(declineModalOffer.attemptId);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setOffers((prev) =>
        prev.map((o) =>
          o.attemptId === declineModalOffer.attemptId ? { ...o, status: "DECLINED" } : o
        )
      );
      setDeclineModalOffer(null);
      warning("Offer Declined", `${caseRef} escalated to next-tier wave response.`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/app/ngo"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 rounded p-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to NGO Dashboard
        </Link>
        <div className="text-xs font-mono font-semibold text-forest-600 bg-paper-surface px-3 py-1 rounded-full border border-warm-grey-200">
          Organization: <strong className="text-forest-900">{context?.activeOrganization?.name || "Jan Seva Relief"}</strong>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-warm-grey-200 pb-5 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-coral-50 text-coral-600 flex items-center justify-center font-bold">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-forest-950">
                Incoming Assistance Offers Queue
              </h1>
              <p className="text-xs text-forest-600">
                Time-bound matching waves dispatched by coordinator algorithm based on capability and proximity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-coral-50 text-coral-800 border border-coral-200">
              {offers.filter((o) => o.status === "PENDING").length} Active Wave Offers
            </span>
          </div>
        </div>

        {/* Offers List */}
        <div className="space-y-4">
          {offers.map((offer) => {
            const isCritical = offer.urgency === "critical";
            return (
              <div
                key={offer.attemptId}
                className={`p-5 rounded-2xl border transition-all card-hover ${
                  offer.status === "ACCEPTED"
                    ? "bg-sage-50/60 border-sage-300"
                    : offer.status === "DECLINED"
                    ? "bg-warm-grey-50 border-warm-grey-200 opacity-60"
                    : isCritical
                    ? "bg-white border-coral-200 hover:border-coral-400 ring-1 ring-coral-100"
                    : "bg-white border-warm-grey-200 hover:border-warm-grey-400"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-forest-900 text-white">
                      {offer.publicCaseRef}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isCritical
                          ? "bg-coral-100 text-coral-800 border border-coral-200"
                          : "bg-sage-100 text-forest-800"
                      }`}
                    >
                      {isCritical && <Flame className="h-3 w-3 text-coral-600" />}
                      <span>{offer.urgency} Urgency</span>
                    </span>
                    <span className="text-xs text-forest-700 font-semibold capitalize">
                      {offer.serviceType.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-coral-700 bg-coral-50 px-2.5 py-1 rounded-lg border border-coral-200">
                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                    <span>SLA: {offer.expiresInMinutes}m countdown</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-forest-600 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-coral-500" />
                  <span>
                    {offer.district} &bull; {offer.ward}{" "}
                    <span className="text-forest-400">(Precise address unlocked upon assignment lock)</span>
                  </span>
                </div>

                <p className="text-xs text-forest-800 bg-paper p-3.5 rounded-xl border border-warm-grey-200 mb-4 leading-relaxed font-sans">
                  {offer.description}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-warm-grey-100">
                  <div className="text-[11px] text-forest-500 font-mono flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-forest-600" />
                    <span>Atomic Lock: Acceptance claims case and closes competing waves.</span>
                  </div>

                  {offer.status === "PENDING" && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setDeclineModalOffer(offer)}
                        disabled={actionLoading === offer.attemptId}
                        className="px-3.5 py-2 rounded-xl border border-warm-grey-300 text-xs font-semibold text-forest-700 hover:bg-warm-grey-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccept(offer.attemptId, offer.publicCaseRef)}
                        disabled={actionLoading === offer.attemptId}
                        className="px-4 py-2 rounded-xl bg-forest-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-forest-800 transition-colors flex items-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800 shadow-xs"
                      >
                        {actionLoading === offer.attemptId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        Accept & Lock
                      </button>
                    </div>
                  )}

                  {offer.status === "ACCEPTED" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-forest-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Assignment Accepted & Locked
                      </span>
                      <Link
                        href="/app/ngo/cases"
                        className="px-3 py-1.5 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 flex items-center gap-1"
                      >
                        <span>Open Workspace</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}

                  {offer.status === "DECLINED" && (
                    <span className="text-xs font-semibold text-forest-500 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Declined & Escalated to Alternate NGO
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decline Reason Modal */}
      {declineModalOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs overscroll-contain">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-warm-grey-200 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-coral-50 text-coral-700 flex items-center justify-center font-bold">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-forest-950">Decline Assistance Offer</h3>
                <p className="text-xs text-forest-600 font-mono">{declineModalOffer.publicCaseRef}</p>
              </div>
            </div>

            <p className="text-xs text-forest-700 leading-relaxed">
              Please specify a structured reason for declining this request. This ensures transparent audit logging and triggers immediate automatic wave escalation to alternate providers.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-800 mb-1.5 font-mono">
                Structured Operational Reason
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-warm-grey-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 text-forest-900 bg-white"
              >
                <option value="AT_CAPACITY">At Current Emergency Capacity</option>
                <option value="OUTSIDE_SERVICE_RADIUS">Incident Outside Active Service Radius</option>
                <option value="SPECIALIZED_EQUIPMENT_UNAVAILABLE">Specialized Veterinary/Surgical Unit Deployed</option>
                <option value="STAFF_UNAVAILABLE">Qualified Responders Currently on Higher Urgency Call</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-grey-100">
              <button
                type="button"
                onClick={() => setDeclineModalOffer(null)}
                className="px-3.5 py-2 rounded-xl border border-warm-grey-300 text-xs font-semibold text-forest-700 hover:bg-warm-grey-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineConfirm}
                className="px-4 py-2 rounded-xl bg-coral-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-coral-700 shadow-xs"
              >
                Confirm Decline & Escalate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
