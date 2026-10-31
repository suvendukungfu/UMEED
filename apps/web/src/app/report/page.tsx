"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FilePlus,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Copy,
  Lock,
  Loader2,
} from "lucide-react";

export default function ReportPage() {
  const [subjectType, setSubjectType] = useState<"animal" | "person">("animal");
  const [incidentType, setIncidentType] = useState("injured_animal");
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
        setErrorMsg(`Unable to retrieve GPS coordinates: ${err.message}. Please enter address manually.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-950">
                Distress Report Received
              </h2>
              <p className="text-xs text-emerald-700">
                Your report has been safely logged in the UMEED coordination network.
              </p>
            </div>
          </div>

          {/* Reference Code Box */}
          <div className="bg-white rounded-lg border border-emerald-200 p-4 space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Public Reference Code
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold text-slate-900">
                {successData.public_reference}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(successData.public_reference)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedCode ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Use this reference to track assistance milestones. No personal data is linked.
            </p>
          </div>

          {/* Confidential Tracking Token */}
          {successData.tracking_token && (
            <div className="bg-amber-50 rounded-lg border border-amber-300 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wider">
                <Lock className="h-4 w-4" />
                <span>Confidential Citizen Access Token</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-amber-200 font-mono text-xs text-slate-800 break-all select-all">
                {successData.tracking_token}
              </div>
              <p className="text-xs text-amber-800 font-medium">
                Important: Save this token now. For your security, this credential is never stored in plaintext and cannot be retrieved again.
              </p>
            </div>
          )}

          {successData.is_suspected_duplicate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Note: A similar distress observation was recently reported nearby. A human coordinator will review both reports to ensure comprehensive coverage without double dispatch.
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                setDescription("");
                setEvidenceUrl("");
                setLatitude(null);
                setLongitude(null);
              }}
              className="px-4 py-2 text-xs font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition"
            >
              Submit Another Report
            </button>
            <Link
              href="/incidents"
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 rounded-lg transition"
            >
              View Coordinator Queue &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Overview</span>
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <FilePlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Submit Distress Report</h1>
            <p className="text-xs text-slate-500">
              Closed-loop assistance coordination for vulnerable people and animals
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subject Type Radio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Who needs assistance? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubjectType("animal");
                  setIncidentType("injured_animal");
                }}
                className={`py-3 px-4 rounded-lg border text-left transition flex items-center justify-between ${
                  subjectType === "animal"
                    ? "border-blue-600 bg-blue-50/50 text-blue-900 font-semibold"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span>Animal in Distress</span>
                {subjectType === "animal" && <span className="text-blue-600 text-xs">Selected</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubjectType("person");
                  setIncidentType("homeless_person");
                }}
                className={`py-3 px-4 rounded-lg border text-left transition flex items-center justify-between ${
                  subjectType === "person"
                    ? "border-blue-600 bg-blue-50/50 text-blue-900 font-semibold"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span>Vulnerable Person</span>
                {subjectType === "person" && <span className="text-blue-600 text-xs">Selected</span>}
              </button>
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="incident-type"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Assistance Category *
            </label>
            <select
              id="incident-type"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {subjectType === "animal" ? (
                <>
                  <option value="injured_animal">Injured Animal (Medical / Trauma)</option>
                  <option value="abandoned_animal">Abandoned Animal (Shelter / Food)</option>
                  <option value="other">Other Animal Welfare</option>
                </>
              ) : (
                <>
                  <option value="abandoned_elderly_person">Abandoned Elderly Person</option>
                  <option value="homeless_person">Homeless Person Needing Welfare</option>
                  <option value="medical_assistance">Acute Medical Assistance</option>
                  <option value="food_assistance">Food & Nutrition Relief</option>
                  <option value="shelter_assistance">Emergency Shelter</option>
                  <option value="other">Other Social Distress</option>
                </>
              )}
            </select>
          </div>

          {/* Location Section */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-blue-600" />
                Location Information
              </span>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
              >
                {isLocating && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{isLocating ? "Resolving GPS..." : "Detect My Location"}</span>
              </button>
            </div>

            {latitude && longitude && (
              <div className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200">
                GPS Lat: {latitude}, Lon: {longitude} (Recorded)
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="street-address"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Landmark / Street Address
                </label>
                <input
                  id="street-address"
                  type="text"
                  placeholder="e.g. Near Madhuban Chowk Pillar 342"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label
                  htmlFor="district"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Delhi NCR District
                </label>
                <select
                  id="district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="North West Delhi">North West Delhi</option>
                  <option value="North Delhi">North Delhi</option>
                  <option value="Central Delhi">Central Delhi</option>
                  <option value="West Delhi">West Delhi</option>
                  <option value="South Delhi">South Delhi</option>
                  <option value="South West Delhi">South West Delhi</option>
                  <option value="East Delhi">East Delhi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Description of Observed Distress *
            </label>
            <textarea
              id="description"
              rows={4}
              required
              placeholder="Describe visible condition, exact position, and immediate safety hazards (e.g. animal bleeding, subject exposed to rain)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
            />
          </div>

          {/* Evidence URL */}
          <div>
            <label
              htmlFor="evidence-url"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Photo Evidence URL (Optional)
            </label>
            <input
              id="evidence-url"
              type="url"
              placeholder="https://storage.umeed.local/photo.jpg"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
            />
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="anonymous-toggle"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="anonymous-toggle" className="text-xs text-slate-600">
              Submit anonymously (no contact details stored or shared)
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isSubmitting ? "Submitting to UMEED Engine..." : "Submit Distress Report"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
