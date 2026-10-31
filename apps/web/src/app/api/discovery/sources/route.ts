import { NextRequest, NextResponse } from "next/server";
import { getSourceRepository } from "@/features/discovery/crawler/repositories/source.repository";
import { DiscoverySourceSchema } from "@umeed/contracts";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approvedOnly = searchParams.get("approvedOnly") === "true";

    const repo = getSourceRepository();
    const sources = await repo.listSources({ approvedOnly });

    return NextResponse.json({
      status: "success",
      count: sources.length,
      data: sources,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const coordAuth = verifyCoordinatorAuth(request);
    if (!coordAuth.authorized) {
      return NextResponse.json(
        { error: { message: "Coordinator authorization required to register discovery sources." } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = DiscoverySourceSchema.parse({
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const repo = getSourceRepository();
    const created = await repo.create(validated);

    return NextResponse.json({
      status: "success",
      data: created,
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 400 }
    );
  }
}

