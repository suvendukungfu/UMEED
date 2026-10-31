import { NextRequest, NextResponse } from "next/server";
import { NGOService } from "@/features/ngos/services/ngo.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: auth.reason || "Coordinator authorization required to import organisation data.",
            status: 401,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let csvContent = "";
    let isDemoOnly = false;

    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      csvContent = await request.text();
    } else if (contentType.includes("application/json")) {
      const json = await request.json().catch(() => ({}));
      csvContent = json.csv || "";
      isDemoOnly = Boolean(json.is_demo);
    } else {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Content-Type must be text/csv, text/plain, or application/json with { csv: '...' }",
            status: 415,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 415 }
      );
    }

    if (!csvContent.trim()) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Empty CSV content provided",
            status: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const service = new NGOService();
    const report = await service.importFromCsv(csvContent, { isDemoOnly });

    return NextResponse.json({
      status: "success",
      data: report,
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
          message: err instanceof Error ? err.message : "Failed to process CSV import",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

