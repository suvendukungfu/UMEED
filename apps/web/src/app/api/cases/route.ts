import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/features/cases";
import { CreateCaseInputSchema } from "@umeed/contracts";
import { verifyCoordinatorAuth, verifyResponderAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.UMEED_BACKEND_URL) {
    const { forwardToBackend } = await import("@/lib/proxy/backend-proxy");
    return forwardToBackend(request, "/v1/cases");
  }

  const caseService = new CaseService();
  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.reason || "Coordinator authorization required", status: 401 } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = CreateCaseInputSchema.parse(body);

    const coordinatorId = request.headers.get("x-coordinator-id") || "coord_primary";
    const result = await caseService.createCaseFromApprovedIncident(validated, coordinatorId);

    const statusCode = result.is_new ? 201 : 200;
    return NextResponse.json(
      {
        status: "success",
        message: result.is_new ? "Case created successfully" : "Existing case returned (idempotent replay)",
        data: result.case,
      },
      {
        status: statusCode,
        headers: { Location: `/api/cases/${result.case.public_case_reference}` },
      }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, status: error.statusCode } },
        { status: error.statusCode }
      );
    }
    logger.error("Failed to process case creation", error, "CASES_API");
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid request", status: 400 } },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.UMEED_BACKEND_URL) {
    const { forwardToBackend } = await import("@/lib/proxy/backend-proxy");
    return forwardToBackend(request, "/v1/cases");
  }

  const caseService = new CaseService();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const incidentReference = searchParams.get("incident_reference") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const coordAuth = verifyCoordinatorAuth(request);
    const respAuth = verifyResponderAuth(request);

    let orgIdFilter: string | undefined = undefined;
    if (!coordAuth.authorized && respAuth.authorized && respAuth.actor) {
      // Scoped to this responder's organisation
      orgIdFilter = respAuth.actor.ngoId;
    }

    const { cases, total } = await caseService.listCases({
      status: status as any,
      incident_reference: incidentReference,
      organisation_id: orgIdFilter,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      status: "success",
      data: {
        cases,
        total,
        view_mode: coordAuth.authorized ? "coordinator" : respAuth.authorized ? "responder" : "public",
      },
    });
  } catch (error) {
    logger.error("Failed to list cases", error, "CASES_API");
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve cases", status: 500 } },
      { status: 500 }
    );
  }
}
