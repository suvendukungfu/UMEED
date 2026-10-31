import { NextRequest, NextResponse } from "next/server";
import { getRunRepository } from "@/features/discovery/crawler/repositories/run.repository";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 25;

    const repo = getRunRepository();
    const runs = await repo.listRuns(limit);

    return NextResponse.json({
      status: "success",
      count: runs.length,
      data: runs,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}

