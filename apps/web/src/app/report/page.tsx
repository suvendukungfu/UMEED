import Link from "next/link";
import { ArrowLeft, FilePlus } from "lucide-react";

export default function ReportPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Overview</span>
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <FilePlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Submit Distress Report</h2>
            <p className="text-xs text-slate-500">Citizen reporting flow — Phase 3</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          The citizen report interface will collect photos/videos, geolocation coordinates, descriptions, and observed assistance requirements with zero medical diagnosis burden on the reporter.
        </p>
      </div>
    </div>
  );
}

