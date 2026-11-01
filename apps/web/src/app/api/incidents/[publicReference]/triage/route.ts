import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { IncidentService } from "@/features/incidents/services/incident.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicReference: string }> }
) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    // 1. Enforce Coordinator Privileges
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: auth.reason || "Coordinator authorization required to trigger AI triage.",
            status: 401,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    const { publicReference } = await params;
    const body = await request.json().catch(() => ({}));
    const modelId = typeof body.modelId === "string" ? body.modelId : undefined;

    const service = new IncidentService();
    const triageAnalysis = await service.triageIncident(publicReference, { modelId });

    return NextResponse.json({
      status: "success",
      data: {
        public_reference: publicReference,
        triage_analysis: triageAnalysis,
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
          message: err instanceof Error ? err.message : "Failed to execute AI triage",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
