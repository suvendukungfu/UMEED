import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/features/auth/services/auth.service";
import { getEngineAssignmentRepository, getAssistanceRequirementRepository } from "@/features/assistance-engine/repositories";
import { getCaseRepository } from "@/features/cases/repositories";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const token =
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
    request.cookies.get("umeed_session_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Session token required", status: 401 } },
      { status: 401 }
    );
  }

  const authService = new AuthService();
  const context = await authService.authenticateToken(token);
  if (!context) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or expired session", status: 401 } },
      { status: 401 }
    );
  }

  const orgId = context.session.activeOrganizationId;
  const userId = context.user.userId;
  const role = context.session.activeRole;

  const assignRepo = getEngineAssignmentRepository();
  const reqRepo = getAssistanceRequirementRepository();
  const caseRepo = getCaseRepository();

  let assignments = orgId ? await assignRepo.findByProviderId(orgId) : [];

  // Map enriched assignment data
  const enriched = await Promise.all(
    assignments.map(async (asgn) => {
      const req = await reqRepo.findById(asgn.requirementId);
      const c = await caseRepo.findById(asgn.caseId);
      return {
        assignmentId: asgn.assignmentId,
        caseId: asgn.caseId,
        publicCaseRef: c?.public_case_reference || asgn.caseId,
        category: req?.serviceType || "Assistance",
        status: asgn.status,
        address: req?.location?.address || req?.location?.district || "Delhi NCR",
        district: req?.location?.district || "Delhi",
        // Precise coordinates unlocked only if assigned to this provider and active
        lat: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(asgn.status)
          ? req?.location?.latitude ?? 28.6139
          : null,
        lng: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(asgn.status)
          ? req?.location?.longitude ?? 77.209
          : null,
        expectedUpdateAt: asgn.expectedUpdateAt,
        notes: asgn.outcome?.notes || "Assigned by humanitarian coordinator",
      };
    })
  );

  return NextResponse.json({
    status: "success",
    data: {
      total: enriched.length,
      assignments: enriched,
    },
  });
}
