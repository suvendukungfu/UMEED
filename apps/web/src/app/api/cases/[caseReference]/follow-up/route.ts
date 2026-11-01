import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { RecursiveAssistanceEngine } from "@/features/cases";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseReference: string }> }
): Promise<NextResponse> {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const recursiveEngine = new RecursiveAssistanceEngine();
  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.reason || "Coordinator authorization required", status: 401 } },
        { status: 401 }
      );
    }

    const { caseReference } = await context.params;
    const coordinatorId = request.headers.get("x-coordinator-id") || "coord_primary";

    const result = await recursiveEngine.triggerFollowUpCycle(caseReference, coordinatorId);

    return NextResponse.json({
      status: "success",
      message: result.escalated
        ? "Case escalated to coordinator (stopping condition reached)"
        : "Follow-up matching cycle initiated successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, status: error.statusCode } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid request", status: 400 } },
      { status: 400 }
    );
  }
}
