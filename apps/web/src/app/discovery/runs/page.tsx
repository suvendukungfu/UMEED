"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, MetricCard } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { CrawlRun } from "@umeed/contracts";

export default function CrawlRunsPage() {
  const [runs, setRuns] = useState<CrawlRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<CrawlRun | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/discovery/crawl/runs?limit=30");
      const data = await res.json();
      if (data.status === "success") {
        setRuns(data.data);
      }
    } catch (err) {
      console.error("Failed to load crawl runs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-warm-grey-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/discovery"
                className="text-xs font-semibold text-forest-600 hover:text-coral-500 flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Discovery Radar
              </Link>
            </div>
            <h1 className="text-3xl font-editorial font-bold text-forest-800 tracking-tight">
              Crawler Activity & Execution Runs
            </h1>
            <p className="text-sm text-forest-600 max-w-2xl mt-1">
              Audit log of all crawl executions, discovery metrics, robots.txt evaluations, and error tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={RefreshCw}
              onClick={() => fetchRuns()}
            >
              Refresh Logs
            </Button>
          </div>
        </div>

        {/* Runs Table */}
        <div className="rounded-2xl border border-warm-grey-200 bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b border-warm-grey-200 bg-paper-surface/50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-forest-800">
              Recent Crawl Executions ({runs.length})
            </h3>
            <span className="text-[11px] font-mono text-forest-600">
              Bounded batch execution logs
            </span>
          </div>

          {runs.length === 0 ? (
            <div className="p-12 text-center text-forest-600 space-y-2">
              <Activity className="h-8 w-8 text-forest-400 mx-auto" />
              <div className="font-bold text-sm text-forest-800">No crawl runs recorded yet</div>
              <p className="text-xs max-w-sm mx-auto">
                Trigger a crawl run from the Source Registry or wait for the scheduled background crawler.
              </p>
              <div className="pt-2">
                <Link href="/discovery/sources">
                  <Button variant="secondary" size="sm">
                    Go to Source Registry
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-warm-grey-200 bg-paper-surface text-[11px] font-bold uppercase font-mono text-forest-700">
                    <th className="py-3 px-4">Run ID</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Discovered</th>
                    <th className="py-3 px-4 text-center">Fetched</th>
                    <th className="py-3 px-4 text-center">Candidates</th>
                    <th className="py-3 px-4 text-center">Duplicates</th>
                    <th className="py-3 px-4">Started At</th>
                    <th className="py-3 px-4 text-right">Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-grey-100">
                  {runs.map((r) => {
                    const isSelected = selectedRun?.runId === r.runId;
                    return (
                      <tr
                        key={r.runId}
                        onClick={() => setSelectedRun(r)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-coral-50/60 font-medium" : "hover:bg-paper-surface/60"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-forest-700 font-bold whitespace-nowrap">
                          {r.runId}
                        </td>
                        <td className="py-3 px-4 font-bold text-forest-800 whitespace-nowrap">
                          {r.sourceName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={r.status.toUpperCase()} />
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{r.pagesDiscovered}</td>
                        <td className="py-3 px-4 text-center font-mono">{r.pagesFetched}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-coral-600">
                          {r.candidatesExtracted}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-forest-500">
                          {r.duplicatesFound}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-forest-600">
                          {new Date(r.startedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRun(r);
                            }}
                          >
                            Inspect Logs
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LOG DRAWER MODAL */}
        {selectedRun && (
          <div className="fixed inset-0 z-50 bg-forest-950/40 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-warm-grey-200 animate-in slide-in-from-right duration-200">
              <div className="p-6 border-b border-warm-grey-200 bg-paper-surface flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={selectedRun.status.toUpperCase()} />
                    <span className="text-[10px] font-mono text-forest-600">
                      Run ID: {selectedRun.runId}
                    </span>
                  </div>
                  <h3 className="font-editorial text-lg font-bold text-forest-800">
                    {selectedRun.sourceName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRun(null)}
                  className="p-1.5 rounded-lg text-forest-600 hover:bg-warm-grey-200 focus:outline-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 font-mono text-xs">
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] p-3 rounded-xl bg-paper-surface border border-warm-grey-200">
                  <div>
                    <div className="text-forest-500">Discovered</div>
                    <div className="font-bold text-sm text-forest-800">{selectedRun.pagesDiscovered}</div>
                  </div>
                  <div>
                    <div className="text-forest-500">Fetched</div>
                    <div className="font-bold text-sm text-forest-800">{selectedRun.pagesFetched}</div>
                  </div>
                  <div>
                    <div className="text-forest-500">Extracted</div>
                    <div className="font-bold text-sm text-coral-600">{selectedRun.candidatesExtracted}</div>
                  </div>
                  <div>
                    <div className="text-forest-500">Duplicates</div>
                    <div className="font-bold text-sm text-forest-700">{selectedRun.duplicatesFound}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-forest-700 uppercase">
                    Execution Log Messages ({selectedRun.logs.length})
                  </div>
                  <div className="p-4 rounded-xl bg-forest-950 text-sage-200 space-y-2 max-h-[400px] overflow-y-auto">
                    {selectedRun.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                        <span className="text-sage-400 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span
                          className={`font-bold shrink-0 uppercase text-[10px] ${
                            log.level === "error"
                              ? "text-coral-400"
                              : log.level === "warn"
                              ? "text-amber-400"
                              : "text-sage-300"
                          }`}
                        >
                          [{log.level}]
                        </span>
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-warm-grey-200 bg-paper-surface flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setSelectedRun(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
