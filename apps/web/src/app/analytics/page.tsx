import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Overview</span>
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Historical Impact Analytics</h2>
            <p className="text-xs text-slate-500">IOMETE Iceberg Event Stream telemetry — Phase 7</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Provides insights on response times by district, unmet assistance categories, NGO acceptance ratios, and case resolution journeys powered by a resilient integration outbox.
        </p>
      </div>
    </div>
  );
}

