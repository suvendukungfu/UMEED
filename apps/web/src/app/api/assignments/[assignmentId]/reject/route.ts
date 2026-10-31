import { NextRequest, NextResponse } from "next/server";
import { ResponderService } from "@/features/cases";
import { verifyResponderAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
): Promise<NextResponse> {
  const responderService = new ResponderService();
  try {
    const auth = verifyResponderAuth(request);
    if (!auth.authorized || !auth.actor) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.reason || "Responder authorization required", status: 401 } },
        { status: 401 }
      );
    }

    const { assignmentId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Unable to service request at this time";

    const updatedCase = await responderService.rejectAssignment(assignmentId, {
      ngoId: auth.actor.ngoId,
      responderId: auth.actor.responderId,
      reason,
    });

    return NextResponse.json({
      status: "success",
      message: "Assignment rejected",
      data: updatedCase,
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
