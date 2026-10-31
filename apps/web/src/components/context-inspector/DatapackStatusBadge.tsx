"use client";

import React from "react";
import { Database, ShieldCheck, AlertCircle, Copy, Check } from "lucide-react";

export interface DatapackStatusBadgeProps {
  status: "CONNECTED" | "UNCONFIGURED" | "DEGRADED";
  datapackId: string;
  datapackName?: string;
  protocol?: string;
}

export function DatapackStatusBadge({
  status,
  datapackId,
  datapackName = "umeed-product-context",
  protocol = "MCP Streamable HTTP / 2024-11-05",
}: DatapackStatusBadgeProps) {
  const [copied, setCopied] = React.useState(false);

  const copyId = () => {
    if (datapackId && datapackId !== "unconfigured") {
      navigator.clipboard.writeText(datapackId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isConnected = status === "CONNECTED";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-md ${
            isConnected ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          <Database className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{datapackName}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isConnected ? (
                <>
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  Meko Live
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  Awaiting Key
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{protocol}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <code className="text-xs font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-slate-600">
          {datapackId && datapackId !== "unconfigured"
            ? `${datapackId.slice(0, 12)}...`
            : "ID: unconfigured"}
        </code>
        {datapackId && datapackId !== "unconfigured" && (
          <button
            onClick={copyId}
            title="Copy Datapack ID"
            aria-label="Copy Datapack ID"
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
