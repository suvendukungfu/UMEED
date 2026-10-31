import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/features/cases";
import { verifyCoordinatorAuth, verifyResponderAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseReference: string }> }
): Promise<NextResponse> {
  const caseService = new CaseService();
  try {
    const { caseReference } = await context.params;
    const caseRecord = await caseService.getCaseByReference(caseReference);

    if (!caseRecord) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Case '${caseReference}' not found`, status: 404 } },
        { status: 404 }
      );
    }

    const coordAuth = verifyCoordinatorAuth(request);
    const respAuth = verifyResponderAuth(request);

    // If Coordinator: Full unredacted view
    if (coordAuth.authorized) {
      return NextResponse.json({
        status: "success",
        data: {
          case: caseRecord,
          view_mode: "coordinator",
        },
      });
    }

    // If Assigned Responder: Access authorized
    if (respAuth.authorized && respAuth.actor) {
      const isAssigned = caseRecord.assignments.some(
        (a) => a.organisation_id === respAuth.actor!.ngoId
      );
      if (isAssigned) {
        return NextResponse.json({
          status: "success",
          data: {
            case: caseRecord,
            view_mode: "responder",
          },
        });
      }
    }

    // Public sanitized view: omit sensitive audit data
    const sanitized = {
      ...caseRecord,
      created_by: undefined,
      is_sanitized: true,
    };

    return NextResponse.json({
      status: "success",
      data: {
        case: sanitized,
        view_mode: "public",
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
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch case", status: 500 } },
      { status: 500 }
    );
  }
}
