import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { CaseLifecycleService } from "@/features/assistance-engine/services/case-lifecycle.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
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

  const { caseId } = await params;
  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const lifecycleService = new CaseLifecycleService();

  try {
    await lifecycleService.cancelCase(
      caseId,
      body.reason || "Coordinator closed case",
      auth.coordinatorId || "coordinator"
    );

    return NextResponse.json({
      status: "success",
      message: `Case '${caseId}' closed and all active response timers cancelled`,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to close case";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

