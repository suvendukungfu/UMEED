import { NextRequest, NextResponse } from "next/server";
import { getAssistanceRequirementRepository } from "@/features/assistance-engine/repositories";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  const reqRepo = getAssistanceRequirementRepository();
  const humanReviewReqs = await reqRepo.list({ status: "HUMAN_REVIEW" });

  return NextResponse.json({
    status: "success",
    data: {
      total: humanReviewReqs.length,
      requirements: humanReviewReqs,
    },
  });
}

