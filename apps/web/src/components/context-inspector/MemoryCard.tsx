"use client";

import React from "react";
import {
  Clock,
  Bot,
  Globe,
  Lock,
  Edit2,
  Trash2,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { ContextTraceRecord } from "@/features/context-learning/types";

export interface MemoryCardProps {
  trace: ContextTraceRecord;
  onEdit?: (memoryId: string, currentText: string) => void;
  onDelete?: (memoryId: string) => void;
  onPromote?: (memoryId: string) => void;
}

export function MemoryCard({ trace, onEdit, onDelete, onPromote }: MemoryCardProps) {
  const getOpBadge = (op: ContextTraceRecord["operation"]) => {
    switch (op) {
      case "READ":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "WRITE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DELETE":
        return "bg-red-50 text-red-700 border-red-200";
      case "PROMOTE":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getAgentLabel = (agent: string) => {
    switch (agent) {
      case "umeed_matching_agent":
        return "Matching Agent (B1)";
      case "umeed_followup_agent":
        return "Follow-Up Agent (B2)";
      case "umeed_knowledge_curator":
        return "Knowledge Curator (B3)";
      default:
        return agent;
    }
  };

  const memoryId = trace.recalled_memory_id || "unspecified";

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow transition space-y-3">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide border ${getOpBadge(
              trace.operation
            )}`}
          >
            {trace.operation}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
            <Bot className="h-3.5 w-3.5 text-indigo-500" />
            <span>{getAgentLabel(trace.agent_id)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {trace.is_shared_knowledge ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
              <Globe className="h-3 w-3 text-purple-500" />
              Shared Knowledge
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
              <Lock className="h-3 w-3 text-slate-500" />
              Private Memory
            </span>
          )}

          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <Clock className="h-3 w-3" />
            <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Memory Content */}
      <div className="bg-slate-50 border border-slate-100 rounded-md p-3 text-xs text-slate-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <code className="text-[11px] font-mono text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded">
            {memoryId}
          </code>
          {trace.relevance_score !== undefined && (
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" />
              {Math.round(trace.relevance_score * 100)}% match
            </span>
          )}
        </div>
        <p className="italic text-slate-700">
          &ldquo;{trace.memory_content || "Memory content unavailable or deleted"}&rdquo;
        </p>
      </div>

      {/* Influence Summary */}
      <div className="text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Decision Influence: </span>
        <span>{trace.influence_summary}</span>
      </div>

      {/* Action Footer */}
      {memoryId !== "unspecified" && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
          {!trace.is_shared_knowledge && onPromote && (
            <button
              onClick={() => onPromote(memoryId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded transition font-medium"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Request Promotion
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(memoryId, trace.memory_content || "")}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
              Correct
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(memoryId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 rounded transition"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              Forget
            </button>
          )}
        </div>
      )}
    </div>
  );
}

