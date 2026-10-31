import { NextRequest, NextResponse } from "next/server";
import { CaseLifecycleService } from "@/features/assistance-engine/services/case-lifecycle.service";
import { verifyResponderAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
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

  const { assignmentId } = await params;
  let body: { notes?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const notes = body.notes || "Field progress recorded";
  const lifecycleService = new CaseLifecycleService();

  try {
    const updated = await lifecycleService.recordProgress(
      assignmentId,
      notes,
      auth.actor.responderId
    );

    return NextResponse.json({
      status: "success",
      message: "Progress update recorded",
      data: updated,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to record progress";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

