import { NextRequest, NextResponse } from "next/server";
import { IncidentService } from "@/features/incidents/services/incident.service";
import { IncidentStatus, IncidentType, IncidentSourceType } from "@umeed/contracts";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status") as IncidentStatus | undefined;
    const incidentType = searchParams.get("incident_type") as IncidentType | undefined;
    const sourceType = searchParams.get("source_type") as IncidentSourceType | undefined;
    const isSuspectedDuplicate = searchParams.has("is_suspected_duplicate")
      ? searchParams.get("is_suspected_duplicate") === "true"
      : undefined;
    const limit = searchParams.has("limit")
      ? Math.min(parseInt(searchParams.get("limit")!, 10), 100)
      : 50;
    const offset = searchParams.has("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : 0;

    const service = new IncidentService();
    const result = await service.listIncidents({
      status,
      incident_type: incidentType,
      source_type: sourceType,
      is_suspected_duplicate: isSuspectedDuplicate,
      limit,
      offset,
    });

    // Sanitize response: never expose tracking_token_hash or raw internal IDs
    const sanitizedIncidents = result.incidents.map((inc) => {
      const { tracking_token_hash: _, ...safeDoc } = inc;
      return safeDoc;
    });

    return NextResponse.json({
      status: "success",
      data: {
        incidents: sanitizedIncidents,
        total: result.total,
        limit,
        offset,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: (err as Error).message || "Failed to list incidents",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
