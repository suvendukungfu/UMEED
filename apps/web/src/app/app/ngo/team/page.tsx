"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Clock,
} from "lucide-react";

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: "NGO_OWNER" | "NGO_ADMIN" | "NGO_OPERATOR" | "RESPONDER";
  status: "ACTIVE" | "INVITED";
  joinedAt: string;
}

const INITIAL_TEAM: TeamMember[] = [
  {
    userId: "usr_ngo_owner_01",
    name: "Dr. Rajesh Sharma",
    email: "owner@janseva-delhi.org",
    role: "NGO_OWNER",
    status: "ACTIVE",
    joinedAt: "2026-01-15",
  },
  {
    userId: "usr_ngo_admin_01",
    name: "Vikram Malhotra",
    email: "admin@janseva-delhi.org",
    role: "NGO_ADMIN",
    status: "ACTIVE",
    joinedAt: "2026-03-20",
  },
  {
    userId: "usr_ngo_operator_01",
    name: "Pooja Verma",
    email: "operator@janseva-delhi.org",
    role: "NGO_OPERATOR",
    status: "ACTIVE",
    joinedAt: "2026-06-10",
  },
  {
    userId: "usr_responder_01",
    name: "Amit Kumar",
    email: "responder@janseva-delhi.org",
    role: "RESPONDER",
    status: "ACTIVE",
    joinedAt: "2026-08-01",
  },
];

export default function NGOTeamPage() {
  const { context } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"NGO_ADMIN" | "NGO_OPERATOR" | "RESPONDER">("NGO_OPERATOR");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    const newMember: TeamMember = {
      userId: `usr_inv_${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: "INVITED",
      joinedAt: new Date().toISOString().split("T")[0],
    };

    setTeam([...team, newMember]);
    setInviteEmail("");
    setInviteName("");
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setInviteModalOpen(false);
    }, 1500);
  };

  const handleRemove = (userId: string) => {
    setTeam(team.filter((m) => m.userId !== userId));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/app/ngo"
          className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to NGO Dashboard
        </Link>
        <span className="text-xs font-mono font-semibold text-forest-600">
          Tenant: <strong className="text-forest-900">{context?.activeOrganization?.name || "Jan Seva"}</strong>
        </span>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-warm-grey-100 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warm-grey-100 text-forest-800 flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-forest-950">
                Staff & Responder Management
              </h1>
              <p className="text-xs text-forest-600">
                Manage organization members, dispatch operators, and field responder assignments.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-forest-900 text-white font-semibold text-xs hover:bg-forest-800 transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Invite Staff Member
          </button>
        </div>

        {/* Team Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-warm-grey-200 text-forest-500 font-mono">
                <th className="pb-3 font-semibold">Staff Member</th>
                <th className="pb-3 font-semibold">Organizational Role</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Joined / Invited</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-grey-100">
              {team.map((member) => (
                <tr key={member.userId} className="hover:bg-paper/50">
                  <td className="py-3.5">
                    <div className="font-bold text-forest-950">{member.name}</div>
                    <div className="text-[11px] text-forest-500 font-mono">{member.email}</div>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        member.role === "NGO_OWNER"
                          ? "bg-coral-100 text-coral-800 border border-coral-200"
                          : member.role === "NGO_ADMIN"
                          ? "bg-forest-100 text-forest-800 border border-forest-200"
                          : "bg-sage-100 text-forest-800"
                      }`}
                    >
                      {member.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        member.status === "ACTIVE"
                          ? "bg-sage-100 text-forest-800"
                          : "bg-warm-grey-100 text-forest-600"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-[11px] text-forest-500">
                    {member.joinedAt}
                  </td>
                  <td className="py-3.5 text-right">
                    {member.role !== "NGO_OWNER" ? (
                      <button
                        type="button"
                        onClick={() => handleRemove(member.userId)}
                        className="p-1 rounded text-coral-600 hover:bg-coral-50 transition-colors"
                        title="Remove Member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-forest-400 font-mono">Owner</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-warm-grey-200 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-forest-950">Invite Organization Staff Member</h3>
            <p className="text-xs text-forest-600">
              Invitations expire in 7 days. The invited user will receive an email to establish credentials.
            </p>

            {inviteSuccess && (
              <div className="p-3 rounded-xl bg-sage-50 text-forest-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-forest-700" />
                <span>Invitation created and dispatched successfully.</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-forest-800 mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-coral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-800 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@janseva-delhi.org"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-coral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-800 mb-1">
                  Assigned Delegated Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-coral-500"
                >
                  <option value="NGO_OPERATOR">NGO Operator (Review offers & progress)</option>
                  <option value="RESPONDER">Field Responder (Mobile ambulance / medic)</option>
                  <option value="NGO_ADMIN">NGO Admin (Manage staff & capacity)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-grey-100">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-warm-grey-300 text-xs font-semibold text-forest-700 hover:bg-warm-grey-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

