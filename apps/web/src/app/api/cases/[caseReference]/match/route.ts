import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/features/cases";
import { ExplainableMatchingService } from "@/features/matching/services/matching.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseReference: string }> }
): Promise<NextResponse> {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const caseService = new CaseService();
  const matchingService = new ExplainableMatchingService();
  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.reason || "Coordinator authorization required", status: 401 } },
        { status: 401 }
      );
    }

    const { caseReference } = await context.params;
    const caseRecord = await caseService.getCaseByReference(caseReference);
    if (!caseRecord) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Case '${caseReference}' not found`, status: 404 } },
        { status: 404 }
      );
    }

    const matchResult = await matchingService.matchIncident(caseRecord.incident_reference);

    return NextResponse.json({
      status: "success",
      data: {
        case_reference: caseReference,
        current_cycle: caseRecord.current_matching_cycle,
        unresolved_requirements: caseRecord.unresolved_requirements,
        match_result: matchResult,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, status: error.statusCode } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to run matching", status: 500 } },
      { status: 500 }
    );
  }
}
