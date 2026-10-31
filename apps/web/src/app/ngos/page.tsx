import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

export default function NGOsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Overview</span>
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">NGO Intelligence Registry</h2>
            <p className="text-xs text-slate-500">Verified Delhi responder directory — Phase 4</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Maintains normalized NGO DARPAN and verified operational records distinguishing publicly listed, registration checked, and operationally verified organizations.
        </p>
      </div>
    </div>
  );
}

