"use client";

import React from "react";
import { BookOpen, Sparkles, CheckCircle } from "lucide-react";
import { MemoryInfluenceCitation } from "@/features/context-learning/types";

export interface CitationViewProps {
  citation: MemoryInfluenceCitation;
}

export function CitationView({ citation }: CitationViewProps) {
  const scorePercent = Math.round(citation.relevance_score * 100);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <span>Cited Memory:</span>
          <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-600">
            {citation.memory_id}
          </code>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          <span>{scorePercent}% Relevance</span>
        </div>
      </div>

      <blockquote className="text-xs italic text-slate-700 border-l-2 border-indigo-400 pl-2.5 py-0.5 bg-white/60 rounded-r">
        &ldquo;{citation.source_quote}&rdquo;
      </blockquote>

      <div className="text-xs text-slate-600">
        <span className="font-medium text-slate-700">Operational Reasoning: </span>
        {citation.reasoning}
      </div>

      {citation.injected_requirements && citation.injected_requirements.length > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            Injected Requirements:
          </span>
          <div className="flex flex-wrap gap-1">
            {citation.injected_requirements.map((req: string) => (
              <span
                key={req}
                className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-mono font-medium"
              >
                +{req}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
