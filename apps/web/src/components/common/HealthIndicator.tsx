"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface HealthData {
  status?: string;
  uptime_seconds?: number;
  database?: string;
  services?: {
    core_engine?: { status?: string };
    database?: { status?: string; message?: string };
  };
}

export function HealthIndicator() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        // Even when 503, parse the returned JSON if available
        try {
          const errJson = await res.json();
          setData(errJson);
        } catch {
          setData({ status: "unhealthy", database: "disconnected" });
        }
      }
    } catch {
      setData({ status: "unhealthy", database: "disconnected" });
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

  const isHealthy = data?.status === "healthy" || data?.status === "healthy_demo_mode";
  const dbStatus = data?.database || data?.services?.database?.status || "disconnected";
  const isDbConnected = dbStatus === "connected" || dbStatus === "operational";
  const isDemo = data?.status === "healthy_demo_mode" || data?.environment?.storage_type === "in_memory_ephemeral" || dbStatus === "demo_fallback";

  let dbLabel = "Atlas Standby";
  if (isDbConnected) {
    dbLabel = "Atlas Online";
  } else if (isDemo) {
    dbLabel = "Demo Storage";
  }

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
          isDbConnected
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : isDemo
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isDbConnected ? "bg-emerald-500" : isDemo ? "bg-blue-400" : "bg-slate-400"
          }`}
        />
        <span>
          DB: {dbLabel}
        </span>
      </div>
    </div>
  );
}

