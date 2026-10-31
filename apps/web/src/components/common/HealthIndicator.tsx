"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface HealthData {
  status: string;
  uptime_seconds: number;
  services: {
    core_engine: { status: string };
    database: { status: string; message?: string };
  };
}

export function HealthIndicator() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
        <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
        <span>Checking system status...</span>
      </div>
    );
  }

  const isHealthy = data?.status === "healthy";
  const dbStatus = data?.services.database.status;

  return (
    <div className="flex items-center gap-3">
      {/* Core status badge */}
      <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
        {isHealthy ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        )}
        <span>Core Engine: {isHealthy ? "Operational" : "Degraded"}</span>
      </div>

      {/* Database status badge */}
      <div
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
          dbStatus === "connected"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            dbStatus === "connected" ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
        <span>
          DB: {dbStatus === "connected" ? "Atlas Online" : "Atlas Standby"}
        </span>
      </div>
    </div>
  );
}

