import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import {
  getAssistanceRequirementRepository,
  getOutreachAttemptRepository,
} from "@/features/assistance-engine/repositories";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const auth = verifyCoordinatorAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: auth.reason || "Coordinator authorization required",
          status: 401,
        },
      },
      { status: 401 }
    );
  }

  const nowIso = new Date().toISOString();
  const reqRepo = getAssistanceRequirementRepository();
  const attemptRepo = getOutreachAttemptRepository();

  const overdueRequirements = await reqRepo.findPendingWatchdog(nowIso);
  const overdueAttempts = await attemptRepo.findOverdueAwaitingResponses(nowIso);

  return NextResponse.json({
    status: "success",
    data: {
      now: nowIso,
      overdueRequirementsCount: overdueRequirements.length,
      overdueAttemptsCount: overdueAttempts.length,
      overdueRequirements,
      overdueAttempts,
    },
  });
}

