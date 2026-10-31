import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { IncidentTypeSchema } from "@umeed/contracts";
import { IncidentService } from "@/features/incidents/services/incident.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { sanitizeIncidentForCoordinator } from "@/features/incidents/services/privacy.service";
import { ApiError } from "@/lib/errors";

const HumanReviewRequestSchema = z.object({
  decision: z.enum([
    "APPROVE",
    "REJECT",
    "MARK_DUPLICATE",
    "REQUEST_INFO",
    "CONFIRM",
    "OVERRIDE",
    "ESCALATE",
  ]),
  reason: z.string().min(3, "Review rationale must be at least 3 characters long"),
  reviewer_id: z.string().min(1).default("coordinator_staff"),
  override_category: IncidentTypeSchema.optional(),
  override_urgency: z
    .enum(["unconfirmed", "routine", "elevated", "urgent", "emergency_review"])
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicReference: string }> }
) {
  try {
    // 1. Enforce Coordinator Privileges
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: auth.reason || "Coordinator authorization required to submit human review.",
            status: 401,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    const { publicReference } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Missing JSON request body",
            status: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const parseResult = HumanReviewRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Invalid review decision payload",
            details: parseResult.error.issues,
            status: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const { decision, reason, reviewer_id, override_category, override_urgency } = parseResult.data;

    const service = new IncidentService();
    const updatedIncident = await service.recordReviewDecision(
      publicReference,
      reviewer_id,
      {
        decision,
        reason,
        override_category,
        override_urgency,
      }
    );

    return NextResponse.json({
      status: "success",
      data: sanitizeIncidentForCoordinator(updatedIncident),
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
          message: err instanceof Error ? err.message : "Failed to record human review decision",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
