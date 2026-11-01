"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import { Shield, Lock, Mail, ArrowRight, UserCheck, CheckCircle2, AlertCircle } from "lucide-react";

const DEMO_PERSONAS = [
  {
    role: "COORDINATOR",
    name: "Dr. Ananya Roy",
    email: "coordinator@umeed.org",
    desc: "Neutral humanitarian triage and case dispatch authority",
    color: "bg-coral-50 border-coral-200 text-coral-900",
  },
  {
    role: "NGO_OWNER",
    name: "Dr. Rajesh Sharma",
    email: "owner@janseva-delhi.org",
    desc: "Executive head of Jan Seva Animal Emergency Ambulance",
    color: "bg-forest-50 border-forest-200 text-forest-900",
  },
  {
    role: "NGO_ADMIN",
    name: "Vikram Malhotra",
    email: "admin@janseva-delhi.org",
    desc: "Operational capacity and staff manager at Jan Seva",
    color: "bg-forest-50 border-forest-200 text-forest-900",
  },
  {
    role: "NGO_OPERATOR",
    name: "Pooja Verma",
    email: "operator@janseva-delhi.org",
    desc: "Incoming distress offer reviewer and dispatch operator",
    color: "bg-forest-50 border-forest-200 text-forest-900",
  },
  {
    role: "RESPONDER",
    name: "Amit Kumar",
    email: "responder@janseva-delhi.org",
    desc: "Mobile ambulance paramedic driver on scene in Delhi NCR",
    color: "bg-sage-50 border-sage-200 text-forest-900",
  },
  {
    role: "PLATFORM_ADMIN",
    name: "Platform Ops Lead",
    email: "admin@umeed.org",
    desc: "Platform administration and NGO verification approvals",
    color: "bg-warm-grey-100 border-warm-grey-300 text-forest-950",
  },
  {
    role: "AUDITOR",
    name: "Meera Sen",
    email: "auditor@humanitarianaudit.org",
    desc: "Independent compliance oversight and redacted audit logs",
    color: "bg-warm-grey-100 border-warm-grey-300 text-forest-950",
  },
  {
    role: "CITIZEN",
    name: "Rahul Sharma",
    email: "citizen@example.com",
    desc: "Citizen tracking previous humanitarian assistance requests",
    color: "bg-paper border-warm-grey-200 text-forest-900",
  },
];

export default function SignInPage() {
  const router = useRouter();
  const { signIn, context } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("UmeedSecurePassword2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const success = await signIn(email, password);
      if (success) {
        router.push("/app");
      } else {
        setError("Invalid email or password. Please verify credentials.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePersonaSelect = async (personaEmail: string) => {
    setEmail(personaEmail);
    setError(null);
    setLoading(true);
    try {
      const success = await signIn(personaEmail, "UmeedSecurePassword2026!");
      if (success) {
        router.push("/app");
      } else {
        setError("Persona authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-paper flex flex-col justify-center">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-coral-500 flex items-center justify-center font-bold text-white text-xl shadow-sm">
              U
            </div>
            <span className="font-editorial text-2xl font-bold tracking-tight text-forest-900">
              UMEED
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 tracking-tight">
            Unified Humanitarian Operations Sign-In
          </h1>
          <p className="mt-2 text-sm text-forest-600 max-w-md mx-auto">
            Secure, server-enforced access to coordinated emergency response, verified NGO workspaces, and field operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Main Sign-In Form */}
          <div className="md:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-sm">
            <h2 className="text-lg font-bold text-forest-900 mb-1">Sign In to Your Workspace</h2>
            <p className="text-xs text-forest-600 mb-6">
              Enter your organizational credentials to enter your role-specific dashboard.
            </p>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-coral-50 border border-coral-200 text-coral-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-coral-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-forest-800 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="coordinator@umeed.org"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-800 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  />
                </div>
                <div className="mt-1 text-[11px] text-forest-500">
                  Default test password: <code className="bg-paper px-1 py-0.5 rounded font-mono">UmeedSecurePassword2026!</code>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-forest-900 text-white font-semibold text-sm hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-warm-grey-100 flex items-center justify-between text-xs text-forest-600">
              <Link href="/track" className="hover:text-forest-900 hover:underline">
                Track a citizen distress report &rarr;
              </Link>
              <Link href="/report" className="hover:text-coral-600 hover:underline font-semibold">
                Submit emergency request
              </Link>
            </div>
          </div>

          {/* Persona Switcher for Evaluation */}
          <div className="md:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-forest-900 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-coral-600" />
                Quick-Login Personas
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sage-100 text-forest-800">
                DEV / AUDIT READY
              </span>
            </div>
            <p className="text-xs text-forest-600 mb-4">
              Select any pre-configured humanitarian actor persona below to sign in instantly:
            </p>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handlePersonaSelect(p.email)}
                  disabled={loading}
                  className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-xs flex items-center justify-between group ${p.color}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{p.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/5 font-semibold">
                        {p.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-forest-600 line-clamp-1 mt-0.5">
                      {p.desc}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-forest-800" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

