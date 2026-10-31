import { NextRequest, NextResponse } from "next/server";
import { getCandidateRepository } from "@/features/discovery/extraction/candidate.repository";
import { CandidateReviewStatus, IncidentType } from "@umeed/contracts";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CandidateReviewStatus | null;
    const category = searchParams.get("category") as IncidentType | null;
    const district = searchParams.get("district");
    const synthetic = searchParams.get("isSynthetic");

    const repo = getCandidateRepository();
    const candidates = await repo.listCandidates({
      status: status || undefined,
      category: category || undefined,
      district: district || undefined,
      isSynthetic: synthetic !== null ? synthetic === "true" : undefined,
    });

    const counts = await repo.countByStatus();

    return NextResponse.json({
      status: "success",
      count: candidates.length,
      metrics: counts,
      data: candidates,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}

