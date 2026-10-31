"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FilePlus,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Copy,
  Lock,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Search,
  Eye,
  Info,
  Clock,
  Heart,
  User,
  Shield,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { ContinuityLine, ContinuityStage } from "@/components/common/ContinuityLine";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { IncidentType } from "@umeed/contracts";

const DELHI_DISTRICTS = [
  "Central Delhi",
  "East Delhi",
  "New Delhi",
  "North Delhi",
  "North East Delhi",
  "North West Delhi",
  "Shahdara",
  "South Delhi",
  "South East Delhi",
  "South West Delhi",
  "West Delhi",
];

const INCIDENT_CATEGORIES: {
  id: IncidentType;
  label: string;
  subject: "animal" | "person";
  description: string;
  icon: string;
}[] = [
  {
    id: "injured_animal",
    label: "Injured Street Animal",
    subject: "animal",
    description: "Trauma, hit-and-run, fractures, open wounds, or severe distress.",
    icon: "🐾",
  },
  {
    id: "abandoned_animal",
    label: "Abandoned Domestic Animal",
    subject: "animal",
    description: "Abandoned pet, stray litter, or animal needing protective intake.",
    icon: "🐕",
  },
  {
    id: "homeless_person",
    label: "Homeless Person in Distress",
    subject: "person",
    description: "Vulnerable individuals or families exposed to hypothermia, rain, or heat.",
    icon: "⛺",
  },
  {
    id: "abandoned_elderly_person",
    label: "Abandoned Elderly Citizen",
    subject: "person",
    description: "Senior citizen in public spaces without shelter, medical attention, or family.",
    icon: "👴",
  },
  {
    id: "shelter_assistance",
    label: "Night Shelter / Emergency Safe Space",
    subject: "person",
    description: "Immediate night shelter intake or temporary emergency sanctuary required.",
    icon: "🏠",
  },
  {
    id: "medical_assistance",
    label: "Acute Medical Assistance",
    subject: "person",
    description: "Severe dehydration, unaddressed infection, trauma, or acute clinical distress.",
    icon: "🩺",
  },
  {
    id: "food_assistance",
    label: "Urgent Food Assistance",
    subject: "person",
    description: "Starving families, extreme malnourishment, or emergency nutrition support.",
    icon: "🍲",
  },
  {
    id: "other",
    label: "Other Humanitarian Relief",
    subject: "person",
    description: "Other acute humanitarian crisis requiring NGO coordination.",
    icon: "🤝",
  },
];

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<"submit" | "track">("submit");

  // Multi-step progression (1 to 5)
  const [step, setStep] = useState(1);

  // Form State
  const [subjectType, setSubjectType] = useState<"animal" | "person">("animal");
  const [incidentType, setIncidentType] = useState<IncidentType>("injured_animal");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("North West Delhi");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  // UI state
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Success result
  const [successData, setSuccessData] = useState<{
    public_reference: string;
    tracking_token?: string;
    status: string;
    is_suspected_duplicate: boolean;
    created_at: string;
  } | null>(null);

  // Track Mode State
  const [trackRef, setTrackRef] = useState("");
  const [trackToken, setTrackToken] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedIncident, setTrackedIncident] = useState<any | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg(`Unable to retrieve GPS coordinates: ${err.message}. Please select your district manually.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1 && !incidentType) {
      setErrorMsg("Please select an incident category.");
      return;
    }
    if (step === 2 && !district) {
      setErrorMsg("Please select a valid district.");
      return;
    }
    if (step === 3 && description.trim().length < 10) {
      setErrorMsg("Please provide at least 10 characters describing the situation.");
      return;
    }
    setStep((prev) => Math.min(5, prev + 1));
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (description.trim().length < 10) {
      setErrorMsg("Please provide a description of at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        schema_version: "1.0.0",
        source_type: "citizen_report",
        source_reference: `citizen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        source_url: null,
        reported_at: new Date().toISOString(),
        incident_type: incidentType,
        subject_type: subjectType,
        description: description.trim(),
        evidence: evidenceUrl.trim()
          ? [
              {
                type: "image",
                url: evidenceUrl.trim(),
                timestamp: new Date().toISOString(),
                metadata: { source: "citizen_web_report", is_anonymous: isAnonymous },
              },
            ]
          : [],
        location: {
          latitude,
          longitude,
          address: address.trim() || null,
          district: district.trim() || null,
          confidence: latitude && longitude ? 0.95 : 0.5,
        },
        severity: {
          level: "unconfirmed",
          confidence: 0.0,
          reasoning: [],
        },
        freshness: "current_confirmed_by_source",
        missing_information: [],
        requires_human_review: true,
      };

      const res = await fetch("/api/incidents/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit report");
      }

      setSuccessData(data.data);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackedIncident(null);

    const cleanRef = trackRef.trim().toUpperCase();
    const cleanToken = trackToken.trim();

    if (!cleanRef || !cleanToken) {
      setTrackError("Both public reference code (UMD-XXXX-YYYY) and tracking token are required.");
      return;
    }

    setTrackLoading(true);
    try {
      const res = await fetch(`/api/incidents/${cleanRef}`, {
        method: "GET",
        headers: {
          "X-Tracking-Token": cleanToken,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Incident not found or invalid tracking token.");
      }

      setTrackedIncident(json.data);
    } catch (err) {
      setTrackError((err as Error).message);
    } finally {
      setTrackLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Map incident status to Continuity Line stage
  const mapStatusToStage = (status: string): ContinuityStage => {
    switch (status) {
      case "REPORTED":
        return "REPORT";
      case "TRIAGED":
        return "TRIAGE";
      case "APPROVED":
      case "MATCHED":
        return "COORDINATION";
      case "ASSIGNED":
      case "IN_PROGRESS":
        return "RESCUE";
      case "HANDOFF_PENDING":
        return "HANDOFF";
      case "RESOLVED":
        return "VERIFIED_COMPLETION";
      default:
        return "REPORT";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header and Switcher */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-50 border border-coral-200 text-coral-800 text-xs font-mono font-bold">
          <ShieldCheck className="h-3.5 w-3.5 text-coral-600" />
          <span>Confidential Citizen Portal</span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-5xl font-bold text-forest-800 tracking-tight">
          {activeTab === "submit" ? "Report Distress" : "Track Assistance Progress"}
        </h1>
        <p className="text-xs sm:text-sm text-forest-700/80 max-w-lg mx-auto">
          Every submission is triaged by multimodal AI, matched to accredited NGOs, and verified
          at receiving medical or shelter facilities.
        </p>

        {/* Tab Switcher */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex p-1 rounded-xl bg-paper-surface border border-warm-grey-300 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab("submit");
                setSuccessData(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "submit"
                  ? "bg-forest-800 text-white shadow-xs"
                  : "text-forest-700 hover:text-forest-900"
              }`}
            >
              Submit New Distress Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("track")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "track"
                  ? "bg-forest-800 text-white shadow-xs"
                  : "text-forest-700 hover:text-forest-900"
              }`}
            >
              Track Existing Report
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: SUBMIT REPORT
          ========================================================================= */}
      {activeTab === "submit" && !successData && (
        <Card elevation="card" padding="lg" className="space-y-6">
          {/* Progress Indicator */}
          <div className="border-b border-warm-grey-200 pb-5">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-forest-700 mb-2">
              <span>STEP {step} OF 5</span>
              <span>
                {step === 1 && "NATURE OF DISTRESS"}
                {step === 2 && "GEOGRAPHIC LOCATION"}
                {step === 3 && "OBSERVATIONS & EVIDENCE"}
                {step === 4 && "CITIZEN PRIVACY & CONSENT"}
                {step === 5 && "REVIEW & SUBMIT"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-warm-grey-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-coral-500 transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: What happened? */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-forest-800">Who is in need of assistance?</h3>
                <p className="text-xs text-forest-600">Select whether the report concerns an animal or a human beneficiary.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSubjectType("animal");
                    setIncidentType("injured_animal");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    subjectType === "animal"
                      ? "bg-forest-50/60 border-forest-800 ring-2 ring-forest-800/20"
                      : "border-warm-grey-200 hover:border-warm-grey-400 bg-white"
                  }`}
                >
                  <span className="text-2xl block mb-2">🐾</span>
                  <div className="font-bold text-sm text-forest-800">Animal in Distress</div>
                  <div className="text-xs text-forest-600">Injured street dog, cat, cattle, bird trauma</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubjectType("person");
                    setIncidentType("homeless_person");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    subjectType === "person"
                      ? "bg-forest-50/60 border-forest-800 ring-2 ring-forest-800/20"
                      : "border-warm-grey-200 hover:border-warm-grey-400 bg-white"
                  }`}
                >
                  <span className="text-2xl block mb-2">🤝</span>
                  <div className="font-bold text-sm text-forest-800">Human Distress</div>
                  <div className="text-xs text-forest-600">Elderly abandoned, homeless, child welfare, acute illness</div>
                </button>
              </div>

              <div className="pt-2 space-y-3">
                <label className="block text-xs font-bold uppercase text-forest-700 font-mono">
                  Select Specific Incident Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INCIDENT_CATEGORIES.filter((cat) => cat.subject === subjectType).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setIncidentType(cat.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        incidentType === cat.id
                          ? "bg-coral-50/60 border-coral-500 ring-1 ring-coral-500"
                          : "border-warm-grey-200 hover:border-warm-grey-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="font-bold text-xs text-forest-800">{cat.label}</span>
                      </div>
                      <p className="text-[11px] text-forest-600 leading-snug">{cat.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Where did it happen? */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-forest-800">Where is the incident located?</h3>
                <p className="text-xs text-forest-600">
                  Accurate district location enables matching with authorized local NGOs.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-forest-700 font-mono mb-1.5">
                    Delhi Administrative District (Required)
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-warm-grey-300 text-forest-800 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
                  >
                    {DELHI_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-forest-700 font-mono mb-1.5">
                    Landmark or Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Metro Pillar 384, Rohini Sector 11"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-warm-grey-300 text-forest-800 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
                  />
                </div>

                <div className="p-4 rounded-xl bg-paper-surface border border-warm-grey-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-forest-800 block">Precise GPS Pin (Optional)</span>
                    <span className="text-[11px] text-forest-600 block">
                      {latitude && longitude
                        ? `Captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                        : "Detecting GPS coordinates helps ambulance drivers arrive faster."}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={isLocating}
                    onClick={handleDetectLocation}
                    icon={MapPin}
                  >
                    {latitude ? "Update GPS" : "Detect Current Location"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Observations & Evidence */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-forest-800">What are your observations?</h3>
                <p className="text-xs text-forest-600">
                  Describe what you see: visible injuries, consciousness, ability to walk, immediate hazards.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-forest-700 font-mono mb-1.5">
                    Distress Description (Min 10 characters)
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Medium-sized stray dog lying on roadside with injured hind leg, unable to walk, bleeding near paw, seems alert but scared..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-warm-grey-300 text-forest-800 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
                  />
                  <div className="flex justify-between items-center text-[11px] text-forest-600 mt-1">
                    <span>Be as descriptive as possible to assist Gemini AI triage.</span>
                    <span className={description.trim().length < 10 ? "text-amber-700 font-bold" : "text-emerald-700"}>
                      {description.trim().length} chars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-forest-700 font-mono mb-1.5">
                    Photo or Document URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg or cloud storage link"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-warm-grey-300 text-forest-800 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
                  />
                  <span className="text-[11px] text-forest-600 block mt-1">
                    Direct image URLs allow Gemini vision to extract condition severity before responder arrival.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Citizen Privacy & Consent */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-forest-800">Privacy & Cryptographic Security</h3>
                <p className="text-xs text-forest-600">
                  UMEED is architected to protect citizen reporters from surveillance, harassment, or retaliation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-forest-50/80 border border-forest-200 space-y-3">
                <div className="flex items-center gap-2 text-forest-900 font-bold text-xs">
                  <Lock className="h-4 w-4 text-forest-700" />
                  <span>SHA-256 Token Privacy Protection Enforced</span>
                </div>
                <ul className="text-xs text-forest-700/90 space-y-1.5 list-disc pl-4">
                  <li>No account or phone number registration required.</li>
                  <li>Upon submission, a private 128-bit tracking token is generated locally.</li>
                  <li>Only the SHA-256 hash is saved to the database; the plaintext token is never stored.</li>
                  <li>Strict fail-closed PII redactor removes personal identifying information before Meko memory archiving.</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-warm-grey-300 bg-white">
                <input
                  type="checkbox"
                  id="anonymous-toggle"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded text-forest-800 focus:ring-forest-800"
                />
                <label htmlFor="anonymous-toggle" className="text-xs font-semibold text-forest-800 cursor-pointer">
                  Submit this report anonymously (recommended for community whistleblowers)
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Submit */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-forest-800">Review & Confirm Submission</h3>
                <p className="text-xs text-forest-600">
                  Please review the details before dispatching to the UMEED coordination network.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-paper-surface border border-warm-grey-200 space-y-3 text-xs text-forest-800 font-mono">
                <div className="flex justify-between py-1 border-b border-warm-grey-200">
                  <span className="text-forest-600">Subject:</span>
                  <span className="font-bold uppercase">{subjectType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-warm-grey-200">
                  <span className="text-forest-600">Category:</span>
                  <span className="font-bold">{incidentType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-warm-grey-200">
                  <span className="text-forest-600">District:</span>
                  <span className="font-bold">{district}</span>
                </div>
                {address && (
                  <div className="flex justify-between py-1 border-b border-warm-grey-200">
                    <span className="text-forest-600">Address:</span>
                    <span>{address}</span>
                  </div>
                )}
                {latitude && longitude && (
                  <div className="flex justify-between py-1 border-b border-warm-grey-200">
                    <span className="text-forest-600">GPS Pin:</span>
                    <span>{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
                  </div>
                )}
                <div className="py-1">
                  <span className="text-forest-600 block mb-1">Description:</span>
                  <p className="font-sans text-forest-900 bg-white p-2.5 rounded-lg border border-warm-grey-200">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step Navigation Buttons */}
          <div className="pt-4 flex items-center justify-between border-t border-warm-grey-200">
            {step > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={handlePrevStep} icon={ArrowLeft}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <Button type="button" variant="primary" size="md" onClick={handleNextStep} icon={ArrowRight} iconPosition="right">
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                onClick={handleSubmit}
                icon={CheckCircle}
              >
                Submit Distress Report
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* =========================================================================
          SUCCESS RECEIPT STATE
          ========================================================================= */}
      {activeTab === "submit" && successData && (
        <Card elevation="elevated" padding="lg" className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-warm-grey-200">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-forest-800">
                Distress Report Received
              </h2>
              <p className="text-xs text-forest-600">
                Logged in the UMEED network and queued for Gemini multimodal triage.
              </p>
            </div>
          </div>

          {/* Reference & Token Box */}
          <div className="p-5 rounded-2xl bg-paper-surface border border-warm-grey-300 space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase text-forest-600 font-bold">Public Reference Code</span>
              <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-warm-grey-200">
                <span className="font-mono text-base font-bold text-forest-800">
                  {successData.public_reference}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(successData.public_reference)}
                  className="text-xs text-coral-600 hover:text-coral-700 font-semibold flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {successData.tracking_token && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase text-coral-600 font-bold flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Confidential Tracking Token (Save This Key)
                </span>
                <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-coral-200">
                  <span className="font-mono text-xs font-bold text-forest-800 truncate mr-2">
                    {successData.tracking_token}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(successData.tracking_token!)}
                    className="text-xs text-coral-600 hover:text-coral-700 font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Token</span>
                  </button>
                </div>
                <p className="text-[11px] text-forest-600">
                  Keep this token safe. UMEED only stores the SHA-256 hash; nobody else can view the private tracking timeline without this exact key.
                </p>
              </div>
            )}
          </div>

          {/* Continuity Line Progress Preview */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono uppercase font-bold text-forest-700 block">
              Case Journey Progression
            </span>
            <div className="p-4 rounded-xl bg-white border border-warm-grey-200">
              <ContinuityLine currentStage="REPORT" variant="compact" />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setTrackRef(successData.public_reference);
                setTrackToken(successData.tracking_token || "");
                setActiveTab("track");
              }}
              icon={Search}
            >
              Track This Case Now
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setSuccessData(null);
                setStep(1);
                setDescription("");
                setAddress("");
              }}
            >
              Submit Another Report
            </Button>
          </div>
        </Card>
      )}

      {/* =========================================================================
          TAB 2: TRACK EXISTING REPORT
          ========================================================================= */}
      {activeTab === "track" && (
        <Card elevation="card" padding="lg" className="space-y-6">
          <div className="space-y-1 pb-4 border-b border-warm-grey-200">
            <h3 className="text-lg font-bold text-forest-800">
              Look Up Incident Status
            </h3>
            <p className="text-xs text-forest-600">
              Enter the Public Reference and Confidential Tracking Token provided during submission.
            </p>
          </div>

          {trackError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{trackError}</span>
            </div>
          )}

          <form onSubmit={handleLookupIncident} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-forest-700 font-mono mb-1.5">
                  Public Reference (e.g. UMD-XXXX-YYYY)
                </label>
                <input
                  type="text"
                  value={trackRef}
                  onChange={(e) => setTrackRef(e.target.value)}
                  placeholder="UMD-82F1-94A0"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-warm-grey-300 text-forest-800 font-mono text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-forest-700 font-mono mb-1.5">
                  Confidential Tracking Token
                </label>
                <input
                  type="text"
                  value={trackToken}
                  onChange={(e) => setTrackToken(e.target.value)}
                  placeholder="trk_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-warm-grey-300 text-forest-800 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="md" loading={trackLoading} icon={Search}>
              Verify & Retrieve Status
            </Button>
          </form>

          {/* Tracked Result Display */}
          {trackedIncident && (
            <div className="mt-6 pt-6 border-t border-warm-grey-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-paper-surface border border-warm-grey-200">
                <div>
                  <span className="text-[11px] font-mono text-forest-600 block">INCIDENT CASE</span>
                  <span className="font-mono text-base font-bold text-forest-800">
                    {trackedIncident.public_reference}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={trackedIncident.status} />
                  <span className="text-xs text-forest-600 font-mono">
                    {trackedIncident.location?.district || "Delhi NCR"}
                  </span>
                </div>
              </div>

              {/* Continuity Line Progress */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase font-bold text-forest-700 block">
                  Assistance Lifecycle Stage
                </span>
                <div className="p-4 rounded-2xl bg-white border border-warm-grey-200 shadow-2xs">
                  <ContinuityLine
                    currentStage={mapStatusToStage(trackedIncident.status)}
                    variant="timeline"
                  />
                </div>
              </div>

              {/* Sanitized Public Information */}
              <div className="p-4 rounded-xl bg-white border border-warm-grey-200 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-warm-grey-100">
                  <span className="text-forest-600 font-medium">Category:</span>
                  <span className="font-bold text-forest-800">{trackedIncident.incident_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-warm-grey-100">
                  <span className="text-forest-600 font-medium">Reported At:</span>
                  <span className="font-mono text-forest-800">
                    {new Date(trackedIncident.reported_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-warm-grey-100">
                  <span className="text-forest-600 font-medium">District Coverage:</span>
                  <span className="text-forest-800">{trackedIncident.location?.district}</span>
                </div>
                <div className="py-1">
                  <span className="text-forest-600 font-medium block mb-1">Description:</span>
                  <p className="text-forest-900 leading-relaxed bg-paper-surface p-2.5 rounded-lg border border-warm-grey-100">
                    {trackedIncident.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
