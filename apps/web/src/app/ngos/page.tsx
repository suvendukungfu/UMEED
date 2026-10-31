"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
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
  Plus,
  Phone,
  Mail,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { NGODocument, VerificationStatus } from "@/features/ngos/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, MetricCard } from "@/components/ui/Card";

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
          `Import complete: ${report.successful} imported, ${report.failed} failed, ${report.duplicates} duplicates.`
        );
        fetchNGOs();
        setCsvText("");
      } else {
        setImportResult(`Error: ${json.error?.message || "Import failed"}`);
      }
    } catch {
      setImportResult("Network error during CSV import.");
    } finally {
      setImportLoading(false);
    }
  };

  // Metrics
  const totalNgos = ngos.length;
  const verifiedCount = ngos.filter((n) => n.verification_status === "OPERATIONALLY_VERIFIED").length;
  const ambulanceReadyCount = ngos.filter(
    (n) => n.assistance_capabilities?.some((c: string) => c.toLowerCase().includes("ambulance") || c.toLowerCase().includes("transit") || c.toLowerCase().includes("first_aid"))
  ).length;

  return (
    <div className="space-y-8">
      {/* Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-grey-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-editorial text-2xl font-bold text-forest-800">
              Capability-Aware NGO Registry
            </span>
            <Badge variant="coral">Verified Humanitarian Network</Badge>
          </div>
          <p className="text-xs text-forest-700/80">
            Delhi NCR accredited emergency assistance network scored across capability, district coverage, real-time availability, and verified capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchNGOs}
            loading={loading}
            icon={RefreshCw}
          >
            Refresh Registry
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            icon={Upload}
          >
            Import CSV
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Registered NGOs"
          value={totalNgos}
          subtext="Delhi NCR Network"
          badge="In-Memory / Atlas"
          icon={Building2}
        />
        <MetricCard
          label="Verified Providers"
          value={verifiedCount}
          subtext="Document & field audited"
          badge="Tier 1 Status"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Ambulance Fleet"
          value={ambulanceReadyCount}
          subtext="Trauma / Mobile Units"
          badge="Rapid Dispatch"
          icon={Truck}
        />
        <MetricCard
          label="District Coverage"
          value="11 / 11"
          subtext="Delhi Administrative Districts"
          badge="Full NCR Range"
          icon={MapPin}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card elevation="subtle" padding="sm" className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-forest-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by organisation name, district, or capability..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs text-forest-800 placeholder:text-forest-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold text-forest-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            >
              <option value="ALL">All Categories</option>
              <option value="injured_animal">Injured Animal</option>
              <option value="abandoned_animal">Abandoned Animal</option>
              <option value="homeless_person">Homeless Person</option>
              <option value="abandoned_elderly_person">Abandoned Elderly</option>
              <option value="shelter_assistance">Shelter Assistance</option>
              <option value="medical_assistance">Medical Assistance</option>
              <option value="food_assistance">Food Assistance</option>
              <option value="other">Other</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold text-forest-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800"
            >
              <option value="ALL">All Verifications</option>
              <option value="VERIFIED">Verified</option>
              <option value="CHECKED">Checked</option>
              <option value="LISTED">Listed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* NGO Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ngos.map((ngo) => (
          <Card
            key={ngo.ngo_id}
            elevation="card"
            padding="md"
            className="flex flex-col justify-between space-y-4 hover:border-forest-700 transition-colors cursor-pointer"
            onClick={() => setSelectedNgo(ngo)}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="demo">DEMO DATA</Badge>
                <span
                  className={`text-xs font-mono font-bold flex items-center gap-1 ${
                    ngo.verification_status === "OPERATIONALLY_VERIFIED"
                      ? "text-emerald-700"
                      : ngo.verification_status === "REGISTRATION_CHECKED"
                      ? "text-sky-700"
                      : "text-forest-600"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {ngo.verification_status.replace(/_/g, " ")}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-forest-900 line-clamp-1">
                  {ngo.organisation_name}
                </h4>
                <p className="text-xs text-forest-600 font-mono flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-forest-400" />
                  <span>{ngo.operational_districts?.[0] || "Delhi NCR"}</span>
                </p>
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1">
                {ngo.assistance_capabilities?.slice(0, 3).map((cap: string, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-paper-surface border border-warm-grey-200 text-forest-800"
                  >
                    {cap}
                  </span>
                ))}
                {(ngo.assistance_capabilities?.length || 0) > 3 && (
                  <span className="text-[10px] font-mono text-forest-500">
                    +{(ngo.assistance_capabilities?.length || 0) - 3} more
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-warm-grey-100 flex items-center justify-between text-xs text-forest-600">
              <span className="font-mono text-[11px]">
                {ngo.operating_hours || "09:00 - 18:00"}
              </span>
              <button
                type="button"
                className="text-coral-600 hover:text-coral-700 font-bold flex items-center gap-0.5"
              >
                <span>View Details</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Details Drawer Modal */}
      {selectedNgo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <div>
                <Badge variant="demo" size="sm">DEMO DATA</Badge>
                <h3 className="text-base font-bold text-forest-800 mt-1">
                  {selectedNgo.organisation_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNgo(null)}
                className="text-forest-600 hover:text-forest-900"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-forest-800">
              <div className="p-3 rounded-xl bg-paper-surface border border-warm-grey-200 space-y-1 font-mono">
                <div>Registration: {selectedNgo.registration_number || "REG-DL-2024-001"}</div>
                <div>Primary Districts: {selectedNgo.operational_districts?.join(", ")}</div>
                <div>Verification Status: {selectedNgo.verification_status}</div>
                <div>
                  Operating Hours: {selectedNgo.operating_hours || "09:00 - 18:00"}
                </div>
              </div>

              <div>
                <span className="font-bold text-forest-700 block mb-1">Accredited Capabilities:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedNgo.assistance_capabilities?.map((c: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-forest-100 text-forest-800 font-mono text-[11px]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-warm-grey-100 space-y-1 font-mono text-[11px] text-forest-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />
                  <span>{selectedNgo.contact?.phone || "+91-11-2398-0000"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  <span>{selectedNgo.contact?.email || "helpdesk@ngo-network.org"}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-warm-grey-200">
              <Button variant="primary" size="sm" onClick={() => setSelectedNgo(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-modal border border-warm-grey-200">
            <div className="flex items-center justify-between pb-3 border-b border-warm-grey-200">
              <h3 className="text-base font-bold text-forest-800">
                Import NGOs via CSV
              </h3>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="text-forest-600 hover:text-forest-900"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-forest-600">
              Paste CSV text formatted with headers: <code>name, category, district, capabilities, phone, email</code>.
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Delhi Trauma Response Trust, injured_animal, North Delhi, ambulance;first_aid, +91-11-23980001, contact@ngo.org"
              className="w-full text-xs font-mono p-3 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
            />

            {importResult && (
              <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 text-xs font-mono text-forest-800">
                {importResult}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-warm-grey-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={importLoading}
                onClick={handleImportCsv}
              >
                Process CSV Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
