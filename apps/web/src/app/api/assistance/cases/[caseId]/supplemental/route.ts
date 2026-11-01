import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { EscalationService } from "@/features/assistance-engine/services/escalation.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
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

  const { caseId } = await params;
  const body = await request.json();

  if (!body.serviceType || !body.location || !body.location.latitude || !body.location.longitude) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "serviceType and location (with latitude and longitude) are required.",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  const escalationService = new EscalationService();

  try {
    const result = await escalationService.addSupplementalRequirement(
      caseId,
      {
        serviceType: body.serviceType,
        subcategory: body.subcategory,
        description: body.description || `Supplemental assistance for ${body.serviceType}`,
        urgency: body.urgency || "medium",
        location: body.location,
      },
      auth.coordinatorId || "coordinator"
    );

    return NextResponse.json({
      status: "success",
      message: "Supplemental assistance requirement created and matched independently",
      data: result,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Supplemental creation failed";
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: errMsg, status: 400 } },
      { status: 400 }
    );
  }
}

