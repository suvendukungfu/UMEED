import { NextRequest, NextResponse } from "next/server";
import { FacilityService } from "@/features/facilities/services/facility.service";

export async function GET(request: NextRequest) {
  if (process.env.UMEED_BACKEND_URL) {
    const { forwardToBackend } = await import("@/lib/proxy/backend-proxy");
    return forwardToBackend(request, "/v1/facilities");
  }

  try {
    const service = new FacilityService();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "organizations" | "facilities" | "relationships"
    const district = searchParams.get("district") || undefined;
    const facilityType = searchParams.get("facilityType") || undefined;

    if (type === "organizations") {
      const orgs = await service.listOrganizations({ district });
      return NextResponse.json({
        status: "success",
        data: {
          total: orgs.length,
          organizations: orgs,
        },
      });
    }

    const { facilities, total } = await service.listFacilities({
      district,
      facilityType,
    });

    return NextResponse.json({
      status: "success",
      data: {
        total,
        facilities,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load public service facilities", details: (err as Error).message },
      { status: 500 }
    );
  }
}
