import Link from "next/link";
import { ArrowLeft, BrainCircuit } from "lucide-react";

export default function AgentPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Overview</span>
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Meko Coordination Memory Agent</h2>
            <p className="text-xs text-slate-500">Coordinator preferences & cross-session recall — Phase 6</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Remembers approved coordinator preferences, dispatch policies, and operational learnings across sessions with transparent provenance and human override controls.
        </p>
      </div>
    </div>
  );
}

