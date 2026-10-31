import { NextRequest, NextResponse } from "next/server";
import { getSourceRepository } from "@/features/discovery/crawler/repositories/source.repository";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const coordAuth = verifyCoordinatorAuth(request);
    if (!coordAuth.authorized) {
      return NextResponse.json(
        { error: { message: "Coordinator authorization required to pause discovery sources." } },
        { status: 401 }
      );
    }

    const { sourceId } = await params;
    const body = await request.json().catch(() => ({}));
    const paused = body.paused !== false;

    const repo = getSourceRepository();
    const source = await repo.getById(sourceId);
    if (!source) {
      return NextResponse.json(
        { error: { message: `Source '${sourceId}' not found.` } },
        { status: 404 }
      );
    }

    const newHealth = paused ? "paused" : "healthy";
    await repo.setHealth(sourceId, newHealth);
    const updated = await repo.getById(sourceId);

    return NextResponse.json({
      status: "success",
      message: `Source '${source.name}' health status set to '${newHealth}'.`,
      data: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}

