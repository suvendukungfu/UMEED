import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { getCandidateRepository } from "@/features/discovery/extraction/candidate.repository";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { CandidateReviewStatus } from "@umeed/contracts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const coordAuth = verifyCoordinatorAuth(request);
    if (!coordAuth.authorized) {
      return NextResponse.json(
        { error: { message: "Coordinator authorization required to review discovery candidates." } },
        { status: 401 }
      );
    }

    const { candidateId } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const validStatuses: CandidateReviewStatus[] = [
      "new",
      "under_review",
      "verified",
      "rejected",
      "duplicate",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: { message: `Invalid review status. Expected one of: ${validStatuses.join(", ")}` } },
        { status: 400 }
      );
    }

    const repo = getCandidateRepository();
    const updated = await repo.updateReview(candidateId, {
      status,
      reviewedBy: coordAuth.coordinatorId || "coordinator_manual",
      notes: notes || undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { error: { message: `Discovery candidate '${candidateId}' not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: `Candidate '${candidateId}' marked as '${status}'.`,
      data: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}

