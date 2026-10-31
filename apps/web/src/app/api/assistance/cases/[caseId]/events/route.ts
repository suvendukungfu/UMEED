import { NextRequest, NextResponse } from "next/server";
import { getEngineCaseEventRepository } from "@/features/assistance-engine/repositories";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
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

  const { caseId } = await params;
  const eventRepo = getEngineCaseEventRepository();
  const events = await eventRepo.findByCaseId(caseId);

  return NextResponse.json({
    status: "success",
    data: {
      caseId,
      totalEvents: events.length,
      events,
    },
  });
}

