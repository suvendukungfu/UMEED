"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  ShieldCheck,
  Search,
  Filter,
  FileCheck2,
  Clock,
  User,
  ArrowLeft,
  Lock,
} from "lucide-react";

interface AuditLog {
  id: string;
  eventType: string;
  caseRef: string;
  actor: string;
  actorRole: string;
  timestamp: string;
  actionDetails: string;
  piiRedacted: boolean;
}

const SAMPLE_LOGS: AuditLog[] = [
  {
    id: "evt_aud_001",
    eventType: "INCIDENT_APPROVED",
    caseRef: "CASE-DELHI-0912",
    actor: "Dr. Ananya Roy",
    actorRole: "COORDINATOR",
    timestamp: "2026-10-31T20:05:12.000Z",
    actionDetails: "Approved citizen report after visual trauma verification via phone callback. Dispatched to wave 1.",
    piiRedacted: true,
  },
  {
    id: "evt_aud_002",
    eventType: "OUTREACH_WAVE_INITIATED",
    caseRef: "CASE-DELHI-0912",
    actor: "system_engine",
    actorRole: "SYSTEM",
    timestamp: "2026-10-31T20:06:00.000Z",
    actionDetails: "Wave 1 created for 2 eligible providers: NGO-DELHI-001 (score 0.94), NGO-DELHI-002 (score 0.81).",
    piiRedacted: true,
  },
  {
    id: "evt_aud_003",
    eventType: "ASSIGNMENT_ACCEPTED",
    caseRef: "CASE-DELHI-0912",
    actor: "Pooja Verma",
    actorRole: "NGO_OPERATOR",
    timestamp: "2026-10-31T20:15:22.000Z",
    actionDetails: "Atomic lock acquired by Jan Seva (NGO-DELHI-001). Competing wave attempt to NGO-DELHI-002 superseded.",
    piiRedacted: true,
  },
  {
    id: "evt_aud_004",
    eventType: "WORK_STARTED",
    caseRef: "CASE-DELHI-0912",
    actor: "Amit Kumar",
    actorRole: "RESPONDER",
    timestamp: "2026-10-31T20:25:00.000Z",
    actionDetails: "Ambulance Van #3 dispatched to Pitampura coordinates.",
    piiRedacted: true,
  },
  {
    id: "evt_aud_005",
    eventType: "REQUIREMENT_RESOLVED",
    caseRef: "CASE-DELHI-0850",
    actor: "Dr. Rajesh Sharma",
    actorRole: "NGO_OWNER",
    timestamp: "2026-10-30T17:35:10.000Z",
    actionDetails: "Surgical wound stabilization completed. Antibiotics and rabies prophylaxis verified.",
    piiRedacted: true,
  },
];

export default function AuditorWorkspacePage() {
  const { context } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>(SAMPLE_LOGS);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = logs.filter(
    (l) =>
      l.caseRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-warm-grey-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-forest-950">
              Independent Compliance & Audit Explorer
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-sage-100 text-forest-800 border border-sage-300">
              AUDITOR READ-ONLY
            </span>
          </div>
          <p className="text-xs text-forest-600 mt-1">
            Logged in as <strong className="text-forest-900">{context?.user.name || "Meera Sen (Compliance Auditor)"}</strong> &bull; Read-only immutable event ledger with beneficiary PII redaction.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-paper border border-warm-grey-200 text-xs text-forest-700 flex items-center gap-2">
          <Lock className="h-4 w-4 text-forest-500" />
          <span>ICRC Humanitarian Data Redaction Enforced</span>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
            <input
              type="text"
              placeholder="Search by case reference, actor, or event type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>
          <span className="text-xs font-mono font-semibold text-forest-500">
            {filteredLogs.length} Immutable Ledger Events
          </span>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-warm-grey-200 text-forest-500 font-mono">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Event Type</th>
                <th className="pb-3 font-semibold">Case Reference</th>
                <th className="pb-3 font-semibold">Actor</th>
                <th className="pb-3 font-semibold">Audit Action Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-grey-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-paper/50">
                  <td className="py-3.5 font-mono text-[11px] text-forest-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-paper border border-warm-grey-200 text-forest-800">
                      {log.eventType}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-forest-950 whitespace-nowrap">
                    {log.caseRef}
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    <div className="font-semibold text-forest-900">{log.actor}</div>
                    <div className="text-[10px] font-mono text-forest-500">{log.actorRole}</div>
                  </td>
                  <td className="py-3.5 text-forest-700 leading-relaxed max-w-md">
                    {log.actionDetails}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

