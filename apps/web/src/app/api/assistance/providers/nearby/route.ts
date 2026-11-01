import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { GeospatialDiscoveryService } from "@/features/assistance-engine/services/geospatial-discovery.service";
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

  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const service = searchParams.get("service") || "injured_animal";
  const district = searchParams.get("district") || undefined;
  const ward = searchParams.get("ward") || undefined;
  const urgency =
    (searchParams.get("urgency") as
      | "low"
      | "medium"
      | "high"
      | "critical"
      | "unconfirmed") || "medium";

  if (!latStr || !lngStr) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Latitude (lat) and longitude (lng) query parameters are required.",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lngStr);

  const discoveryService = new GeospatialDiscoveryService();
  const result = await discoveryService.discoverProviders(
    "adhoc_query",
    "adhoc_req",
    {
      serviceType: service,
      location: { latitude, longitude, district, ward },
      urgency,
    }
  );

  return NextResponse.json({
    status: "success",
    data: result,
  });
}

