import { NextRequest, NextResponse } from "next/server";
import { OutreachService } from "@/features/assistance-engine/services/outreach.service";
import { verifyResponderAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
): Promise<NextResponse> {
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
  const outreachService = new OutreachService();

  try {
    const result = await outreachService.recordAcceptance(
      attemptId,
      auth.actor.responderId
    );

    return NextResponse.json({
      status: "success",
      message: "Outreach accepted, exclusive assignment locked, competing offers superseded",
      data: result,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Acceptance failed";
    const statusCode = errMsg.includes("Conflict") ? 409 : 400;
    return NextResponse.json(
      { error: { code: statusCode === 409 ? "CONFLICT" : "BAD_REQUEST", message: errMsg, status: statusCode } },
      { status: statusCode }
    );
  }
}

