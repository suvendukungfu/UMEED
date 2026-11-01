import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { getAssistanceRequirementRepository } from "@/features/assistance-engine/repositories";
import { GeospatialDiscoveryService } from "@/features/assistance-engine/services/geospatial-discovery.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> }
): Promise<NextResponse> {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

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

  const { requirementId } = await params;
  const reqRepo = getAssistanceRequirementRepository();
  const req = await reqRepo.findById(requirementId);

  if (!req) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: `Requirement '${requirementId}' not found.`,
          status: 404,
        },
      },
      { status: 404 }
    );
  }

  const discoveryService = new GeospatialDiscoveryService();
  const matchResult = await discoveryService.discoverProviders(
    req.caseId,
    req.requirementId,
    {
      serviceType: req.serviceType,
      location: req.location,
      urgency: req.urgency,
    }
  );

  return NextResponse.json({
    status: "success",
    data: matchResult,
  });
}

