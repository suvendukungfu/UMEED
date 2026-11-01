import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { CaseLifecycleService } from "@/features/assistance-engine/services/case-lifecycle.service";
import { verifyResponderAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
): Promise<NextResponse> {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const auth = verifyResponderAuth(request);
  if (!auth.authorized || !auth.actor) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: auth.reason || "Provider authorization required",
          status: 401,
        },
      },
      { status: 401 }
    );
  }

  const { assignmentId } = await params;
  const lifecycleService = new CaseLifecycleService();

  try {
    const updated = await lifecycleService.startWork(
      assignmentId,
      auth.actor.responderId
    );

    return NextResponse.json({
      status: "success",
      message: "Work started on scene",
      data: updated,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to start work";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

