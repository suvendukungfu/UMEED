import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/features/auth/services/auth.service";
import { authorize } from "@/features/auth/services/rbac.service";
import { getOrganizationEntityRepository } from "@/features/facilities/repositories";
import { getNGORepository } from "@/features/ngos/repositories";
import { getEngineCaseEventRepository } from "@/features/assistance-engine/repositories";
import { OperationalVerificationState } from "@umeed/contracts";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
): Promise<NextResponse> {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const token =
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
    request.cookies.get("umeed_session_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required", status: 401 } },
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

  const actor = {
    userId: context.user.userId,
    role: context.session.activeRole,
    accountState: context.user.accountState,
    organizationId: context.session.activeOrganizationId,
  };

  const authCheck = authorize(actor, "ngo:verify");
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: authCheck.reason || "Forbidden: ngo:verify required", status: 403 } },
      { status: 403 }
    );
  }

  const { orgId } = await params;
  const body = await request.json().catch(() => ({}));
  const targetState: OperationalVerificationState = body.verificationState || "PARTNER_ONBOARDED";
  const reason = body.reason || "Administrative verification completed following document audit";

  const orgRepo = getOrganizationEntityRepository();
  const existingOrg = await orgRepo.findById(orgId);

  const nowIso = new Date().toISOString();

  if (existingOrg) {
    const isPartner = targetState === "PARTNER_ONBOARDED" || targetState === "CAPACITY_CONFIRMED";
    await orgRepo.update(orgId, {
      verificationState: targetState,
      isUmeedPartner: isPartner,
      partnerOnboardedAt: isPartner ? nowIso : existingOrg.partnerOnboardedAt,
      updatedAt: nowIso,
    });
  }

  // Also sync with NGO repository if present
  const ngoRepo = getNGORepository();
  const existingNgo = await ngoRepo.findById(orgId);
  if (existingNgo) {
    await ngoRepo.update(orgId, {
      verification_status: targetState === "PARTNER_ONBOARDED" ? "VERIFIED" : (targetState as any),
    });
  }

  // Append audit event
  try {
    const eventRepo = getEngineCaseEventRepository();
    await eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: "PLATFORM_GOVERNANCE",
      requirementId: null,
      attemptId: null,
      assignmentId: null,
      eventType: "ORGANIZATION_UPDATED",
      previousState: existingOrg?.verificationState || "DISCOVERED",
      newState: targetState,
      actorType: "COORDINATOR",
      actorId: context.user.userId,
      metadata: {
        organizationId: orgId,
        reason,
        verifiedBy: context.user.email,
      },
      timestamp: nowIso,
    });
  } catch {
    // Non-fatal if event repo is in memory or uninitialized
  }

  return NextResponse.json({
    status: "success",
    message: `Organization '${orgId}' verification updated to '${targetState}'.`,
    data: {
      organizationId: orgId,
      verificationState: targetState,
      verifiedBy: context.user.userId,
      updatedAt: nowIso,
    },
  });
}
