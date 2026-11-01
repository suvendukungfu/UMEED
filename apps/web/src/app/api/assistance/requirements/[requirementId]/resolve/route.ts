import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { CaseLifecycleService } from "@/features/assistance-engine/services/case-lifecycle.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { AssignmentOutcome } from "@/features/assistance-engine/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> }
): Promise<NextResponse> {
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

  const { requirementId } = await params;
  const body = await request.json();

  if (!body.outcomeStatus) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "outcomeStatus (SUCCESSFUL | PARTIAL | FAILED | REFERRED) is required.",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  const outcome: AssignmentOutcome = {
    outcomeStatus: body.outcomeStatus,
    notes: body.notes,
    evidenceUrls: body.evidenceUrls || [],
  };

  const lifecycleService = new CaseLifecycleService();

  try {
    const result = await lifecycleService.resolveRequirement(
      requirementId,
      outcome,
      auth.coordinatorId || "coordinator"
    );

    return NextResponse.json({
      status: "success",
      message: "Assistance requirement formally resolved",
      data: result,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Resolution failed";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

