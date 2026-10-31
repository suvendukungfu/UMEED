import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/features/cases";
import { AssignNGOsInputSchema } from "@umeed/contracts";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseReference: string }> }
): Promise<NextResponse> {
  const caseService = new CaseService();
  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.reason || "Coordinator authorization required", status: 401 } },
        { status: 401 }
      );
    }

    const { caseReference } = await context.params;
    const body = await request.json();
    const validated = AssignNGOsInputSchema.parse(body);

    const coordinatorId = request.headers.get("x-coordinator-id") || "coord_primary";
    const updatedCase = await caseService.assignOrganisations(
      caseReference,
      validated,
      coordinatorId
    );

    return NextResponse.json({
      status: "success",
      message: "Organisations assigned successfully",
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
