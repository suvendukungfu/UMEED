import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { ExplainableMatchingService } from "@/features/matching/services/matching.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { ApiError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ incidentReference: string }> }
) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: auth.reason || "Coordinator authorization required to access NGO matching.",
            status: 401,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    const { incidentReference } = await params;
    const { searchParams } = new URL(request.url);

    // Optional weight overrides from query parameters
    const customWeights: Record<string, number> = {};
    if (searchParams.get("w_capability")) customWeights.capability = parseFloat(searchParams.get("w_capability")!);
    if (searchParams.get("w_coverage")) customWeights.geographic_coverage = parseFloat(searchParams.get("w_coverage")!);
    if (searchParams.get("w_distance")) customWeights.distance = parseFloat(searchParams.get("w_distance")!);
    if (searchParams.get("w_availability")) customWeights.availability = parseFloat(searchParams.get("w_availability")!);
    if (searchParams.get("w_capacity")) customWeights.capacity = parseFloat(searchParams.get("w_capacity")!);

    const matchingService = new ExplainableMatchingService();
    const result = await matchingService.matchIncident(
      incidentReference,
      Object.keys(customWeights).length > 0 ? customWeights : undefined
    );

    return NextResponse.json({
      status: "success",
      data: result,
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
          message: err instanceof Error ? err.message : "Failed to compute NGO matches",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

