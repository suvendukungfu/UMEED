"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import { HeartHandshake, PlusCircle, Search, Clock, ArrowRight, ShieldCheck } from "lucide-react";

export default function CitizenWorkspacePage() {
  const { context } = useAuth();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-forest-950">
              Welcome, {context?.user.name || "Citizen"}
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-paper border border-warm-grey-200 text-forest-700">
              CITIZEN ACCOUNT
            </span>
          </div>
          <p className="text-xs text-forest-600 mt-1">
            Track your humanitarian assistance submissions and verified community handoffs.
          </p>
        </div>

        <Link
          href="/report"
          className="px-4 py-2.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <PlusCircle className="h-4 w-4" />
          Report New Distress
        </Link>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warm-grey-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-forest-950 flex items-center gap-2">
          <Clock className="h-4 w-4 text-forest-700" />
          Your Recent Assistance Requests
        </h2>

        <div className="p-5 rounded-2xl border border-warm-grey-200 bg-paper/50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-forest-950">
                UMD-99BF-400A
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-coral-100 text-coral-800">
                IN PROGRESS
              </span>
            </div>
            <p className="text-xs text-forest-700">
              Injured canine rescue in Connaught Place &bull; Handed off to Jan Seva Emergency Ambulance
            </p>
          </div>

          <Link
            href="/track"
            className="px-3.5 py-1.5 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 transition-colors flex items-center gap-1"
          >
            Track Status &rarr;
          </Link>
        </div>

        <div className="pt-4 border-t border-warm-grey-100 flex items-center justify-between text-xs text-forest-600">
          <span>Need to look up a report submitted from a different device?</span>
          <Link href="/track" className="font-semibold text-coral-600 hover:underline">
            Use Confidential Tracking Token &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

