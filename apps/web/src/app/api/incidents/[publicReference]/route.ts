import { NextRequest, NextResponse } from "next/server";
import { IncidentService } from "@/features/incidents/services/incident.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicReference: string }> }
) {
  try {
    const { publicReference } = await params;
    const service = new IncidentService();
    const incident = await service.getByPublicReference(publicReference);

    if (!incident) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Incident with reference ${publicReference} not found`,
            status: 404,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Public Redaction: Remove secret tracking_token_hash and exact raw coordinates
    const { tracking_token_hash: _, ...safeDoc } = incident;

    return NextResponse.json({
      status: "success",
      data: safeDoc,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: (err as Error).message || "Failed to retrieve incident",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
