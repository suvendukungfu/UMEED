import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { OutreachService } from "@/features/assistance-engine/services/outreach.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

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
  const outreachService = new OutreachService();

  try {
    const result = await outreachService.initiateFirstWave(
      requirementId,
      auth.coordinatorId || "coordinator"
    );

    return NextResponse.json({
      status: "success",
      message: `First-round outreach wave initiated with ${result.attempts.length} providers`,
      data: result,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Outreach failed";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

