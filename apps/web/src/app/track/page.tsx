"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  HeartHandshake,
  PhoneCall,
  Copy,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function CitizenTrackingPage() {
  const { success, error: toastError } = useToast();
  const [reference, setReference] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [incident, setIncident] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success("Copied to Clipboard", `${label} copied successfully.`);
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim() || !token.trim()) {
      setError("Both public reference and confidential tracking token are required.");
      toastError("Missing Fields", "Please enter both public reference code and tracking token.");
      return;
    }

    setLoading(true);
    setError(null);
    setIncident(null);

    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(reference.trim())}`, {
        headers: {
          "x-tracking-token": token.trim(),
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Invalid tracking token. Please check the confidential token provided upon report intake.");
          toastError("Unauthorized", "Invalid tracking token. Check the code saved upon intake.");
        } else if (res.status === 404) {
          setError("No incident found matching this public reference code.");
          toastError("Not Found", "No case matching this reference code was found.");
        } else {
          setError("Failed to retrieve incident status. Please try again.");
          toastError("Lookup Failed", "Unable to load case records. Please try again.");
        }
        return;
      }

      const body = await res.json();
      setIncident(body.data);
      success("Case Verified", `Retrieved records for ${body.data.public_reference}`);
    } catch {
      setError("Network connection error. Please check connectivity.");
      toastError("Network Error", "Unable to reach the server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-paper">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 rounded p-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-mono text-forest-600 bg-paper-surface px-2.5 py-1 rounded-full border border-warm-grey-200">
            <Shield className="h-3 w-3 text-forest-700" />
            <span>Zero-Knowledge Proof Protected</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-coral-50 border border-coral-200 text-coral-600 shadow-xs">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-editorial text-forest-900 tracking-tight">
            Track Citizen Assistance Request
          </h1>
          <p className="text-xs sm:text-sm text-forest-600 max-w-lg mx-auto">
            Check the verified progress of your distress report from intake through coordinator triage, NGO dispatch, and facility handoff.
          </p>
        </div>

        {/* Tracking Lookup Box */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-sm card-hover">
          <form onSubmit={handleTrack} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-forest-800 mb-1.5 font-mono">
                  Public Reference Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UMD-7A08-FE78"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-warm-grey-300 font-mono text-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-forest-800 mb-1.5 font-mono">
                  Confidential Tracking Token
                </label>
                <input
                  type="password"
                  required
                  placeholder="trk_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-warm-grey-300 font-mono text-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-coral-50 border border-coral-200 text-coral-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-coral-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-forest-900 text-white font-bold text-xs uppercase tracking-wider hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Searching Verified Records...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Verify & Track Assistance Case</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Incident Result View */}
        {incident && (
          <div className="bg-white rounded-2xl border border-warm-grey-200 shadow-sm overflow-hidden animate-fade-in card-hover">
            <div className="p-6 border-b border-warm-grey-200 flex flex-wrap items-center justify-between gap-4 bg-paper/60">
              <div>
                <span className="text-[10px] font-mono font-bold text-forest-600 uppercase tracking-wider">
                  Verified Case Reference
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-bold font-mono text-forest-950">
                    {incident.public_reference}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(incident.public_reference, "Case Reference")}
                    className="p-1 rounded text-forest-600 hover:text-forest-900 hover:bg-forest-100 transition-colors"
                    title="Copy Case Reference"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-forest-600 font-medium">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase font-mono ${
                    incident.status === "RESOLVED"
                      ? "bg-sage-100 text-forest-800 border border-sage-300"
                      : incident.status === "APPROVED" || incident.status === "ASSIGNED"
                      ? "bg-coral-100 text-coral-800 border border-coral-300"
                      : "bg-warm-grey-100 text-forest-800"
                  }`}
                >
                  {incident.status}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-paper border border-warm-grey-200">
                  <div className="flex items-center gap-1.5 text-xs text-forest-600 mb-1">
                    <Layers className="h-3.5 w-3.5 text-forest-500" />
                    <span>Assistance Category</span>
                  </div>
                  <div className="font-bold text-sm text-forest-900 capitalize">
                    {incident.incident_type?.replace(/_/g, " ") || "General Aid"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-paper border border-warm-grey-200">
                  <div className="flex items-center gap-1.5 text-xs text-forest-600 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-forest-500" />
                    <span>Reported District</span>
                  </div>
                  <div className="font-bold text-sm text-forest-900">
                    {incident.location?.district || "Delhi NCR"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-paper border border-warm-grey-200">
                  <div className="flex items-center gap-1.5 text-xs text-forest-600 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-forest-500" />
                    <span>Intake Timestamp</span>
                  </div>
                  <div className="font-semibold text-xs text-forest-900 font-mono">
                    {new Date(incident.reported_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-forest-700 uppercase tracking-wider mb-2 font-mono">
                  Distress Description
                </h3>
                <p className="text-xs sm:text-sm text-forest-800 p-4 rounded-xl bg-paper border border-warm-grey-200 leading-relaxed font-sans">
                  {incident.description}
                </p>
              </div>

              {/* Lifecycle Progress Bar */}
              <div>
                <h3 className="text-xs font-bold text-forest-700 uppercase tracking-wider mb-3 font-mono flex items-center gap-2">
                  <span>Operational Continuity Stages</span>
                  <span className="text-[10px] text-coral-600 font-normal">Closed-Loop Handshake</span>
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl bg-forest-900 text-white font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>1. Reported</span>
                  </div>
                  <div
                    className={`p-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 ${
                      ["APPROVED", "ASSIGNED", "RESOLVED"].includes(incident.status)
                        ? "bg-forest-900 text-white"
                        : "bg-paper text-forest-500 border border-warm-grey-200"
                    }`}
                  >
                    {["APPROVED", "ASSIGNED", "RESOLVED"].includes(incident.status) && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>2. Verified</span>
                  </div>
                  <div
                    className={`p-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 ${
                      ["ASSIGNED", "RESOLVED"].includes(incident.status)
                        ? "bg-forest-900 text-white"
                        : "bg-paper text-forest-500 border border-warm-grey-200"
                    }`}
                  >
                    {["ASSIGNED", "RESOLVED"].includes(incident.status) && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>3. Dispatched</span>
                  </div>
                  <div
                    className={`p-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 ${
                      incident.status === "RESOLVED"
                        ? "bg-sage-700 text-white"
                        : "bg-paper text-forest-500 border border-warm-grey-200"
                    }`}
                  >
                    {incident.status === "RESOLVED" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                    )}
                    <span>4. Completed</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-coral-50/70 border border-coral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PhoneCall className="h-5 w-5 text-coral-600 shrink-0" />
                  <span className="text-xs text-coral-900 font-medium">
                    Immediate life or clinical emergency? Contact government emergency response dispatch.
                  </span>
                </div>
                <span className="font-bold font-mono text-xs text-coral-800 bg-white px-3 py-1.5 rounded-lg border border-coral-300 shrink-0 text-center">
                  National Helpline: 112
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
