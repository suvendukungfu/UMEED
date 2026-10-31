"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  MapPin,
  Clock,
  ChevronRight,
  Activity,
  Upload,
} from "lucide-react";
import { NGODocument, VerificationStatus } from "@/features/ngos/types";
import { IncidentType } from "@umeed/contracts";

export default function NGOsPage() {
  const [ngos, setNgos] = useState<NGODocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [verificationFilter, setVerificationFilter] = useState<string>("ALL");
  const [selectedNgo, setSelectedNgo] = useState<NGODocument | null>(null);

  // CSV Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [isDemoImport, setIsDemoImport] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchNGOs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (districtFilter !== "ALL") params.append("district", districtFilter);
      if (verificationFilter !== "ALL") params.append("status", verificationFilter);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/ngos?${params.toString()}`, {
        headers: {
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
      });
      const json = await res.json();
      if (json.status === "success") {
        setNgos(json.data.ngos || []);
      }
    } catch {
      // Graceful error fallback
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, districtFilter, verificationFilter, searchQuery]);

  useEffect(() => {
    fetchNGOs();
  }, [fetchNGOs]);

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setImportLoading(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/ngos/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          csv: csvText,
          is_demo: isDemoImport,
        }),
      });

      const json = await res.json();
      if (json.status === "success") {
        const report = json.data;
        setImportResult(
          `Import complete: ${report.imported_count} imported, ${report.skipped_duplicates_count} skipped duplicates, ${report.error_count} errors.`
        );
        fetchNGOs();
      } else {
        setImportResult(`Error: ${json.error?.message || "Import failed"}`);
      }
    } catch (err) {
      setImportResult(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImportLoading(false);
    }
  };

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case "OPERATIONALLY_VERIFIED":
        return {
          icon: ShieldCheck,
          label: "Operationally Verified",
          className: "bg-emerald-50 text-emerald-800 border-emerald-300",
        };
      case "REGISTRATION_CHECKED":
        return {
          icon: CheckCircle,
          label: "Registration Checked",
          className: "bg-blue-50 text-blue-800 border-blue-300",
        };
      case "PUBLICLY_LISTED":
        return {
          icon: Building2,
          label: "Publicly Listed",
          className: "bg-slate-100 text-slate-700 border-slate-300",
        };
      case "UNVERIFIED":
        return {
          icon: AlertTriangle,
          label: "Unverified",
          className: "bg-amber-50 text-amber-800 border-amber-300",
        };
      case "SUSPENDED":
      case "INACTIVE":
        return {
          icon: XCircle,
          label: status,
          className: "bg-rose-50 text-rose-800 border-rose-300",
        };
      default:
        return {
          icon: Building2,
          label: status,
          className: "bg-slate-100 text-slate-700 border-slate-300",
        };
    }
  };

  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LIMITED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "UNAVAILABLE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Overview</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">NGO Intelligence Registry</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Multi-Tier Verified</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audited responder registry with capability tags, district coverage, real-time capacity, and verification provenance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchNGOs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organisation name or registration..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All Categories</option>
          <option value="injured_animal">Injured Animal</option>
          <option value="abandoned_animal">Abandoned Animal</option>
          <option value="homeless_person">Homeless Person</option>
          <option value="abandoned_elderly_person">Abandoned Elderly Person</option>
          <option value="medical_assistance">Medical Assistance</option>
          <option value="food_assistance">Food Assistance</option>
          <option value="shelter_assistance">Shelter Assistance</option>
        </select>

        {/* District Filter */}
        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All Delhi Districts</option>
          <option value="North West Delhi">North West Delhi</option>
          <option value="North Delhi">North Delhi</option>
          <option value="Central Delhi">Central Delhi</option>
          <option value="New Delhi">New Delhi</option>
          <option value="South Delhi">South Delhi</option>
          <option value="South East Delhi">South East Delhi</option>
          <option value="South West Delhi">South West Delhi</option>
          <option value="West Delhi">West Delhi</option>
          <option value="East Delhi">East Delhi</option>
          <option value="North East Delhi">North East Delhi</option>
          <option value="Shahdara">Shahdara</option>
        </select>

        {/* Verification Status Filter */}
        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All Verification Statuses</option>
          <option value="OPERATIONALLY_VERIFIED">Operationally Verified</option>
          <option value="REGISTRATION_CHECKED">Registration Checked</option>
          <option value="PUBLICLY_LISTED">Publicly Listed</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Directory Cards Grid */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            Loading NGO intelligence registry...
          </div>
        ) : ngos.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-2">
            <Building2 className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No Organisations Found</p>
            <p className="text-xs text-slate-500">
              No registered organisations match the selected filter criteria.
            </p>
          </div>
        ) : (
          ngos.map((ngo) => {
            const vBadge = getVerificationBadge(ngo.verification_status);
            const VIcon = vBadge.icon;

            return (
              <div
                key={ngo._id}
                onClick={() => setSelectedNgo(ngo)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-sm transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {ngo.ngo_id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${vBadge.className}`}
                    >
                      <VIcon className="h-3 w-3" />
                      <span>{vBadge.label}</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getAvailabilityBadge(
                        ngo.availability_status
                      )}`}
                    >
                      {ngo.availability_status}
                    </span>
                    {ngo.is_demo && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        DEMO_ONLY
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{ngo.organisation_name}</h3>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-medium text-[11px]">Services:</span>
                    {ngo.service_categories.map((sc, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700"
                      >
                        {sc.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>
                        Districts: {ngo.operational_districts.slice(0, 3).join(", ")}
                        {ngo.operational_districts.length > 3 ? ` +${ngo.operational_districts.length - 3}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{ngo.operating_hours}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-slate-400" />
                      <span>
                        Caseload: {ngo.active_cases}/{ngo.max_concurrent_cases} active
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center text-slate-400">
                  <span className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                    View Audit Profile
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Organisation Profile Inspection Modal */}
      {selectedNgo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-bold text-slate-900">
                  {selectedNgo.ngo_id}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${
                    getVerificationBadge(selectedNgo.verification_status).className
                  }`}
                >
                  {selectedNgo.verification_status}
                </span>
                {selectedNgo.is_demo && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                    DEMO_ONLY
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedNgo(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md hover:bg-slate-100"
              >
                Close (ESC)
              </button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">{selectedNgo.organisation_name}</h2>
              {selectedNgo.alternate_names.length > 0 && (
                <p className="text-xs text-slate-500">
                  Also known as: {selectedNgo.alternate_names.join(", ")}
                </p>
              )}
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">
                  Registration
                </span>
                <p className="text-slate-800 font-medium pt-0.5">
                  {selectedNgo.registration_number || "Unregistered"} ({selectedNgo.organisation_type})
                </p>
                <p className="text-[10px] text-slate-500">{selectedNgo.registration_authority}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">
                  Hours & Radius
                </span>
                <p className="text-slate-800 font-medium pt-0.5">{selectedNgo.operating_hours}</p>
                <p className="text-[10px] text-slate-500">{selectedNgo.service_radius_km} km radius</p>
              </div>

              <div className="col-span-2">
                <span className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">
                  Headquarters & Coverage
                </span>
                <p className="text-slate-800 font-medium pt-0.5">
                  {selectedNgo.headquarters_location.address || "Unspecified HQ address"}
                </p>
                <p className="text-[11px] text-slate-600 pt-0.5">
                  Districts: {selectedNgo.operational_districts.join(", ")}
                </p>
              </div>
            </div>

            {/* Services & Capabilities */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assistance Capabilities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedNgo.assistance_capabilities.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    {c.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            {/* Verification Provenance Section */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Verification Provenance & Audit
              </span>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Source: {selectedNgo.verification_source || "Unspecified"}</span>
                  <span>
                    Audited:{" "}
                    {selectedNgo.last_verified_at
                      ? new Date(selectedNgo.last_verified_at).toLocaleDateString()
                      : "Pending"}
                  </span>
                </div>
                {selectedNgo.verification_evidence.length > 0 ? (
                  selectedNgo.verification_evidence.map((ev, i) => (
                    <div key={i} className="text-[11px] text-slate-700 border-t border-slate-200 pt-1.5">
                      <p className="font-semibold">{ev.source}</p>
                      <p className="text-slate-600 italic">&ldquo;{ev.verification_notes}&rdquo;</p>
                      <p className="text-[10px] text-slate-400">
                        Auditor: {ev.verifier_role || "Compliance Officer"} ({ev.verifier_id})
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    No physical on-site audit documents attached. Registration verified via external portal only.
                  </p>
                )}
              </div>
            </div>

            {/* Coordinator Contact Details (Private) */}
            {selectedNgo.contact && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Coordinator Contact Protocol (Restricted)
                </span>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Dispatch Phone</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {selectedNgo.contact.phone || "None listed"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Emergency Line</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {selectedNgo.contact.emergency_phone || "None listed"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 block">Coordinator on Duty</span>
                    <span className="text-slate-800">
                      {selectedNgo.contact.coordinator_name || "Unassigned"} &bull;{" "}
                      {selectedNgo.contact.email || "No email"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Import NGOs from CSV</h3>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
              >
                Close (ESC)
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Paste standard CSV rows with columns:{" "}
              <code>organisation_name,service_categories,operational_districts,registration_number,...</code>
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="organisation_name,service_categories,operational_districts,registration_number&#10;Vasant Kunj Animal Rescue,injured_animal,South Delhi,DL/2024/1122"
              className="w-full text-xs font-mono rounded-lg border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isDemoImport}
                onChange={(e) => setIsDemoImport(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Tag as DEMO_ONLY synthetic fixture</span>
            </label>

            {importResult && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs font-medium text-slate-800 border border-slate-200">
                {importResult}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={importLoading || !csvText.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importLoading ? "Importing..." : "Execute Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
