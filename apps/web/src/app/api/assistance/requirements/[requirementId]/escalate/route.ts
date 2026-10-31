import { NextRequest, NextResponse } from "next/server";
import { EscalationService } from "@/features/assistance-engine/services/escalation.service";
import { getOutreachAttemptRepository } from "@/features/assistance-engine/repositories";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> }
): Promise<NextResponse> {
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
  let body: { attemptId?: string; reason?: "TIMEOUT" | "DELIVERY_FAILURE" } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const attemptRepo = getOutreachAttemptRepository();
  let attemptId = body.attemptId;

  if (!attemptId) {
    const attempts = await attemptRepo.findByRequirementId(requirementId);
    const active = attempts.find((a) =>
      ["SENT", "DELIVERED", "QUEUED", "CREATED"].includes(a.status)
    );
    attemptId = active ? active.attemptId : attempts[0]?.attemptId;
  }

  if (!attemptId) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "No outreach attempt found to escalate from.",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  const escalationService = new EscalationService();

  try {
    const result = await escalationService.escalateOnProviderFailure(
      requirementId,
      attemptId,
      body.reason || "TIMEOUT",
      auth.coordinatorId || "coordinator"
    );

    return NextResponse.json({
      status: "success",
      message: result.escalatedToHumanReview
        ? "Zero remaining providers; escalated to HUMAN_REVIEW"
        : `Round 2 escalation wave created with ${result.newAttempts.length} providers`,
      data: result,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Escalation failed";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

