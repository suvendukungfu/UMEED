import { NextRequest, NextResponse } from "next/server";
import { crawlEngine } from "@/features/discovery/crawler/crawl-engine";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function POST(request: NextRequest) {
  try {
    const coordAuth = verifyCoordinatorAuth(request);
    if (!coordAuth.authorized) {
      return NextResponse.json(
        { error: { message: "Coordinator authorization required to trigger crawl jobs." } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sourceId, isDryRun, maxPagesOverride } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: { message: "sourceId is required." } },
        { status: 400 }
      );
    }

    const run = await crawlEngine.executeRun({
      sourceId,
      isDryRun: Boolean(isDryRun),
      triggeredBy: coordAuth.coordinatorId || "coordinator_manual",
      maxPagesOverride: maxPagesOverride ? Number(maxPagesOverride) : undefined,
    });

    return NextResponse.json({
      status: "success",
      message: `Crawl run completed for '${run.sourceName}'. Discovered: ${run.pagesDiscovered}, Fetched: ${run.pagesFetched}, Extracted: ${run.candidatesExtracted}.`,
      data: run,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}
