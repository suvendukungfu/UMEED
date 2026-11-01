import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { getSourceRepository } from "@/features/discovery/crawler/repositories/source.repository";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const coordAuth = verifyCoordinatorAuth(request);
    if (!coordAuth.authorized) {
      return NextResponse.json(
        { error: { message: "Coordinator authorization required to approve discovery sources." } },
        { status: 401 }
      );
    }

    const { sourceId } = await params;
    const body = await request.json().catch(() => ({}));
    const approved = body.approved !== false;
    const approvedBy = coordAuth.coordinatorId || "coordinator_manual";

    const repo = getSourceRepository();
    const updated = await repo.setApproval(sourceId, approved, approvedBy);

    if (!updated) {
      return NextResponse.json(
        { error: { message: `Source '${sourceId}' not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: `Source '${updated.name}' approval updated to ${approved}.`,
      data: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}

