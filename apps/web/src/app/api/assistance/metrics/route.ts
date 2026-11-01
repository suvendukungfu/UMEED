import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { AssistanceMetricsService } from "@/features/assistance-engine/services/assistance-metrics.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  const metricsService = new AssistanceMetricsService();
  const metrics = await metricsService.getEngineMetrics();

  return NextResponse.json({
    status: "success",
    data: metrics,
  });
}

