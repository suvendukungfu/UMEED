import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/features/auth/services/auth.service";
import { getOutreachAttemptRepository, getEngineAssignmentRepository } from "@/features/assistance-engine/repositories";
import { getNGORepository } from "@/features/ngos/repositories";
import { getOrganizationMembershipRepository } from "@/features/auth/repositories";

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
  if (!orgId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "No active organization selected", status: 400 } },
      { status: 400 }
    );
  }

  // 1. Fetch real incoming offers
  const attemptRepo = getOutreachAttemptRepository();
  const allAttempts = await attemptRepo.list({ providerId: orgId });
  const activeOffers = allAttempts.filter((a) =>
    ["CREATED", "QUEUED", "SENT", "DELIVERED", "ACKNOWLEDGED"].includes(a.status)
  ).length;

  // 2. Fetch real assignments
  const assignRepo = getEngineAssignmentRepository();
  const allAssignments = await assignRepo.findByProviderId(orgId);
  const activeAssignments = allAssignments.filter((a) =>
    ["ACCEPTED", "IN_PROGRESS", "EN_ROUTE", "ARRIVED"].includes(a.status)
  ).length;
  const completedAssistance = allAssignments.filter((a) => a.status === "RESOLVED").length;

  // 3. Fetch team count
  const memberRepo = getOrganizationMembershipRepository();
  const members = await memberRepo.findByOrganization(orgId);
  const teamMembersCount = members.length;

  // 4. Fetch NGO metadata / capacity
  const ngoRepo = getNGORepository();
  const ngo = await ngoRepo.findById(orgId);

  return NextResponse.json({
    status: "success",
    data: {
      organizationId: orgId,
      organizationName: ngo?.organisation_name || context.activeOrganization?.name || "Verified Organization",
      verificationStatus: ngo?.verification_status || "VERIFIED",
      activeOffers,
      activeAssignments,
      completedAssistance,
      teamMembersCount,
      availableCapacity: ngo?.capacity_status === "HIGH" ? 8 : ngo?.capacity_status === "MODERATE" ? 5 : ngo?.capacity_status === "NEAR_CAPACITY" ? 2 : 0,
      totalCapacity: 10,
    },
  });
}
