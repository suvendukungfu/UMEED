"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, MetricCard } from "@/components/ui/Card";

const DISTRICT_METRICS = [
  { district: "North West Delhi", incidents: 42, avgResponseMin: 14.2, completionRate: "92%", handoffRate: "100%", status: "OPTIMAL" },
  { district: "South Delhi", incidents: 38, avgResponseMin: 16.8, completionRate: "89%", handoffRate: "95%", status: "OPTIMAL" },
  { district: "West Delhi", incidents: 31, avgResponseMin: 19.5, completionRate: "85%", handoffRate: "90%", status: "NORMAL" },
  { district: "Central Delhi", incidents: 27, avgResponseMin: 12.1, completionRate: "96%", handoffRate: "100%", status: "OPTIMAL" },
  { district: "North Delhi", incidents: 25, avgResponseMin: 21.0, completionRate: "81%", handoffRate: "88%", status: "NORMAL" },
  { district: "East Delhi", incidents: 22, avgResponseMin: 24.5, completionRate: "78%", handoffRate: "85%", status: "PARTIAL_COVERAGE" },
  { district: "South East Delhi", incidents: 19, avgResponseMin: 18.0, completionRate: "87%", handoffRate: "94%", status: "NORMAL" },
  { district: "South West Delhi", incidents: 18, avgResponseMin: 26.2, completionRate: "74%", handoffRate: "82%", status: "PARTIAL_COVERAGE" },
  { district: "New Delhi", incidents: 15, avgResponseMin: 11.4, completionRate: "98%", handoffRate: "100%", status: "OPTIMAL" },
  { district: "North East Delhi", incidents: 14, avgResponseMin: 28.1, completionRate: "71%", handoffRate: "80%", status: "PARTIAL_COVERAGE" },
  { district: "Shahdara", incidents: 12, avgResponseMin: 25.0, completionRate: "75%", handoffRate: "83%", status: "PARTIAL_COVERAGE" },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  return (
    <div className="space-y-8">
      {/* Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-grey-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-editorial text-2xl font-bold text-forest-800">
              Historical Impact & Handoff Analytics
            </span>
            <Badge variant="demo">DEMO DATA MODE</Badge>
          </div>
          <p className="text-xs text-forest-700/80">
            Closed-loop humanitarian performance tracking, district response latencies, and receiving hospital admission rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-paper-surface border border-warm-grey-300 text-xs font-semibold">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === r
                    ? "bg-forest-800 text-white shadow-xs"
                    : "text-forest-700 hover:text-forest-900"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Honest Disclosure Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>Operational Analytics Transparency Notice:</strong> Metrics displayed reflect seeded historical simulation data for HackCBS 9.0 demonstration purposes (<code>DEMO_DATA_ONLY</code>). Aggregations are calculated from internal assistance events and case telemetry.
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Mean Response Latency"
          value="18.4 min"
          subtext="From intake to on-scene arrival"
          badge="DEMO DATA"
          icon={Clock}
        />
        <MetricCard
          label="NGO Acceptance Ratio"
          value="91.2%"
          subtext="First-cycle provider matching"
          badge="DEMO DATA"
          icon={Building2}
        />
        <MetricCard
          label="Closed-Loop Resolution"
          value="88.5%"
          subtext="Multistage verified completions"
          badge="DEMO DATA"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Clinical Handoff Gate"
          value="100%"
          subtext="Zero unverified gate drop-offs"
          badge="POLICY ENFORCED"
          icon={ShieldCheck}
        />
      </div>

      {/* Visual Chart Bars (Light Surface) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Assistance by Category */}
        <Card elevation="card" padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase font-bold text-forest-800">
              Assistance Distribution by Subject
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper-surface border border-warm-grey-200 text-forest-600">
              7-Day Window
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: "Injured Animals (Trauma & First Aid)", percentage: 46, count: 122, color: "bg-coral-500" },
              { label: "Night Shelter (Hypothermia / Homeless)", percentage: 24, count: 64, color: "bg-forest-800" },
              { label: "Abandoned Elderly Rehabilitation", percentage: 18, count: 48, color: "bg-sage-400" },
              { label: "Child Welfare in Distress", percentage: 12, count: 32, color: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs text-forest-800">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-mono font-bold">{item.count} cases ({item.percentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-warm-grey-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-forest-600/80 pt-2 border-t border-warm-grey-100 italic">
            Animal trauma and homeless winter shelter represent the majority of seasonal distress reports in Delhi NCR.
          </p>
        </Card>

        {/* Chart 2: Handoff Verification Pipeline */}
        <Card elevation="card" padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase font-bold text-forest-800">
              Closed-Loop Resolution Funnel
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-100 text-forest-800 font-bold">
              Zero Drops
            </span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            {[
              { stage: "Citizen Reports Logged", count: 266, pct: "100%", width: "100%", color: "bg-forest-800 text-white" },
              { stage: "Multimodal AI Triaged", count: 258, pct: "97%", width: "97%", color: "bg-forest-700 text-white" },
              { stage: "Accredited NGO Dispatched", count: 242, pct: "91%", width: "91%", color: "bg-coral-500 text-white" },
              { stage: "On-Scene Intervention Verified", count: 228, pct: "86%", width: "86%", color: "bg-coral-600 text-white" },
              { stage: "Receiving Clinical Handoff Confirmed", count: 220, pct: "83%", width: "83%", color: "bg-emerald-700 text-white" },
            ].map((funnel) => (
              <div key={funnel.stage} className="space-y-1">
                <div className="flex justify-between text-forest-800 font-mono text-[11px]">
                  <span>{funnel.stage}</span>
                  <span className="font-bold">{funnel.count} ({funnel.pct})</span>
                </div>
                <div className="w-full h-5 bg-warm-grey-100 rounded-lg overflow-hidden flex">
                  <div
                    className={`h-full ${funnel.color} rounded-lg flex items-center px-2 text-[10px] font-bold font-mono transition-all`}
                    style={{ width: funnel.width }}
                  >
                    {funnel.count}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-forest-600/80 pt-2 border-t border-warm-grey-100 italic">
            Handoff confirmation ensures no beneficiary is left without receiving provider admission.
          </p>
        </Card>
      </div>

      {/* District-by-District Coverage Table */}
      <Card elevation="card" padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-warm-grey-200 bg-paper-surface flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-forest-800">
              Delhi NCR District Response Index
            </h3>
            <p className="text-[11px] text-forest-600 mt-0.5">
              11 Administrative Districts monitored for response latency and receiving facility admission rates.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-forest-700">11 / 11 Covered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-forest-800">
            <thead className="bg-paper-surface border-b border-warm-grey-200 text-forest-700 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Incidents</th>
                <th className="py-3 px-4">Avg Transit</th>
                <th className="py-3 px-4">Completion</th>
                <th className="py-3 px-4">Handoff Gate</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-grey-100">
              {DISTRICT_METRICS.map((row) => (
                <tr key={row.district} className="hover:bg-paper-surface/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-forest-900">{row.district}</td>
                  <td className="py-3 px-4 font-mono">{row.incidents}</td>
                  <td className="py-3 px-4 font-mono">{row.avgResponseMin} min</td>
                  <td className="py-3 px-4 font-mono font-bold text-forest-800">{row.completionRate}</td>
                  <td className="py-3 px-4 font-mono text-emerald-700 font-bold">{row.handoffRate}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        row.status === "OPTIMAL"
                          ? "bg-forest-100 text-forest-800"
                          : row.status === "NORMAL"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
