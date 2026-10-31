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
    const updatedAttempt = await outreachService.recordAcknowledgement(
      attemptId,
      auth.actor.responderId
    );

    return NextResponse.json({
      status: "success",
      message: "Outreach acknowledged successfully",
      data: updatedAttempt,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Acknowledgement failed";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

