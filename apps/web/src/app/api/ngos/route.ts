import { NextRequest, NextResponse } from "next/server";
import { NGOService } from "@/features/ngos/services/ngo.service";
import { sanitizeNGOForPublic } from "@/features/ngos/services/privacy.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";
import { IncidentType, IncidentSubjectType, VerificationStatus } from "@umeed/contracts";

export async function GET(request: NextRequest) {
  try {
    const service = new NGOService();
    // Seed demo organizations if database is empty on first query
    await service.seedDemoNGOsIfEmpty();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as IncidentType | null;
    const subject = searchParams.get("subject") as IncidentSubjectType | null;
    const district = searchParams.get("district") || undefined;
    const status = searchParams.get("status") as VerificationStatus | null;
    const search = searchParams.get("q") || undefined;
    const isDemoParam = searchParams.get("is_demo");
    const isDemo = isDemoParam !== null ? isDemoParam === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const { ngos, total } = await service.listNGOs({
      service_category: category || undefined,
      supported_subject_type: subject || undefined,
      operational_district: district,
      verification_status: status || undefined,
      search_query: search,
      is_demo: isDemo,
      limit,
      offset,
    });

    const isCoordinator = verifyCoordinatorAuth(request).authorized;

    const outputNgos = isCoordinator
      ? ngos
      : ngos.map(sanitizeNGOForPublic);

    return NextResponse.json({
      status: "success",
      data: {
        total,
        count: outputNgos.length,
        is_coordinator_view: isCoordinator,
        ngos: outputNgos,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            status: err.statusCode,
            details: err.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to query NGO registry",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: auth.reason || "Coordinator authorization required to register organisations.",
            status: 401,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Missing JSON request body",
            status: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const service = new NGOService();
    const created = await service.createNGO(body);

    return NextResponse.json(
      {
        status: "success",
        data: created,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            status: err.statusCode,
            details: err.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to register organisation",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

