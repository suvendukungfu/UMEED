"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/auth-context";
import { Loader2 } from "lucide-react";

export default function AppPage() {
  const router = useRouter();
  const { context, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!context) {
      router.replace("/auth/sign-in");
      return;
    }

    const role = context.session.activeRole;

    switch (role) {
      case "COORDINATOR":
        router.replace("/app/coordinator");
        break;
      case "NGO_OWNER":
      case "NGO_ADMIN":
      case "NGO_OPERATOR":
        router.replace("/app/ngo");
        break;
      case "RESPONDER":
        router.replace("/app/responder");
        break;
      case "PLATFORM_ADMIN":
        router.replace("/app/admin");
        break;
      case "AUDITOR":
        router.replace("/app/audit");
        break;
      case "CITIZEN":
      default:
        router.replace("/app/citizen");
        break;
    }
  }, [context, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-coral-600" />
        <p className="text-sm font-semibold text-forest-700 font-mono">
          Routing to authorized workspace...
        </p>
      </div>
    </div>
  );
}

