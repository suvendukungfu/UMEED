import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { OutreachService } from "@/features/assistance-engine/services/outreach.service";
import { EscalationService } from "@/features/assistance-engine/services/escalation.service";
import { verifyResponderAuth } from "@/lib/security/authorization";
import { RejectionReason } from "@/features/assistance-engine/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
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

  const { attemptId } = await params;
  let body: { reason?: RejectionReason } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const reason: RejectionReason = body.reason || "UNAVAILABLE_NOW";
  const outreachService = new OutreachService();
  const escalationService = new EscalationService();

  try {
    const updatedAttempt = await outreachService.recordRejection(
      attemptId,
      reason,
      auth.actor.responderId
    );

    // Trigger escalation check for next wave
    const escalationResult =
      await escalationService.escalateOnProviderFailure(
        updatedAttempt.requirementId,
        attemptId,
        reason,
        auth.actor.responderId
      );

    return NextResponse.json({
      status: "success",
      message: "Outreach rejected and escalation processed",
      data: {
        attempt: updatedAttempt,
        escalation: escalationResult,
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Rejection failed";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

