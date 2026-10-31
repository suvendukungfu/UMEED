"use client";

import React, { useState } from "react";
import { X, AlertTriangle, ShieldCheck, Trash2, Edit3, ArrowUpRight } from "lucide-react";

export type MemoryModalAction = "UPDATE" | "DELETE" | "PROMOTE";

export interface MemoryActionModalProps {
  isOpen: boolean;
  action: MemoryModalAction;
  memoryId: string;
  initialText?: string;
  caseReference?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function MemoryActionModal({
  isOpen,
  action,
  memoryId,
  initialText = "",
  caseReference,
  onClose,
  onSuccess,
}: MemoryActionModalProps) {
  const [editText, setEditText] = useState(initialText);
  const [notes, setNotes] = useState("");
  const [coordinatorKey, setCoordinatorKey] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("coord_session");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (coordinatorKey) {
      headers["X-Coordinator-Key"] = coordinatorKey;
    }

    try {
      if (action === "UPDATE") {
        const res = await fetch("/api/context-learning/memories", {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            memory_id: memoryId,
            new_text: editText,
            case_reference: caseReference,
            coordinator_id: coordinatorId,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.reason || "Failed to update memory");
        onSuccess(json.message || "Memory updated successfully.");
        onClose();
      } else if (action === "DELETE") {
        const res = await fetch("/api/context-learning/memories", {
          method: "DELETE",
          headers,
          body: JSON.stringify({
            memory_id: memoryId,
            case_reference: caseReference,
            coordinator_id: coordinatorId,
            reason: notes || "Coordinator deletion request",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.reason || "Failed to delete memory");
        onSuccess(json.message || "Memory deleted successfully.");
        onClose();
      } else if (action === "PROMOTE") {
        const res = await fetch("/api/context-learning/promote", {
          method: "POST",
          headers,
          body: JSON.stringify({
            memory_id: memoryId,
            coordinator_id: coordinatorId,
            confirmation_notes: notes,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.reason || "Failed to promote memory");
        onSuccess(json.message || "Memory promoted to shared knowledge.");
        onClose();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (action) {
      case "UPDATE":
        return "Correct Operational Memory";
      case "DELETE":
        return "Purge Memory from Datapack";
      case "PROMOTE":
        return "Promote to Shared Knowledge";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            {action === "UPDATE" && <Edit3 className="h-5 w-5 text-indigo-600" />}
            {action === "DELETE" && <Trash2 className="h-5 w-5 text-red-600" />}
            {action === "PROMOTE" && <ArrowUpRight className="h-5 w-5 text-emerald-600" />}
            <h3 id="modal-title" className="text-base font-semibold text-slate-900">
              {getTitle()}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-semibold">Action Failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Target Memory ID</label>
            <input
              type="text"
              readOnly
              value={memoryId}
              className="w-full text-xs font-mono bg-slate-100 border border-slate-200 rounded px-3 py-2 text-slate-600 cursor-not-allowed"
            />
          </div>

          {action === "UPDATE" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                De-identified Memory Content (Max 2000 chars)
              </label>
              <textarea
                rows={4}
                required
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Enter verified de-identified operational lesson..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Zero PII policy: Phone numbers, emails, citizen names, and exact GPS coordinates are strictly rejected.
              </p>
            </div>
          )}

          {action === "DELETE" && (
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Destructive Action: Permanent Forget
              </p>
              <p>
                This operation invokes Meko <code>memory_delete_by_id</code>. Once deleted, this memory cannot be recalled by future matching cycles.
              </p>
            </div>
          )}

          {action === "PROMOTE" && (
            <div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1 mb-3">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Elevate from Private Memory to Shared Knowledge
                </p>
                <p>
                  Promoting invokes Meko <code>memory_promote</code>. The memory becomes permanently visible across all authorized coordinators and partner organisations.
                </p>
              </div>

              <label className="block text-xs font-medium text-slate-700 mb-1">
                Coordinator Confirmation Notes (Min 10 characters)
              </label>
              <textarea
                rows={3}
                required
                minLength={10}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe why this operational lesson is verified for shared multi-agency use..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Coordinator ID</label>
              <input
                type="text"
                required
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                placeholder="coord_yourname"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Coordinator Key</label>
              <input
                type="password"
                value={coordinatorKey}
                onChange={(e) => setCoordinatorKey(e.target.value)}
                placeholder="X-Coordinator-Key header"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition disabled:opacity-50 ${
                action === "DELETE"
                  ? "bg-red-600 hover:bg-red-700"
                  : action === "PROMOTE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading ? "Executing..." : action === "DELETE" ? "Confirm Delete" : action === "PROMOTE" ? "Confirm Promotion" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

