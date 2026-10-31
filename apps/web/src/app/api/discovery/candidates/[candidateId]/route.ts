import { NextRequest, NextResponse } from "next/server";
import { getCandidateRepository } from "@/features/discovery/extraction/candidate.repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const repo = getCandidateRepository();
    const candidate = await repo.getById(candidateId);

    if (!candidate) {
      return NextResponse.json(
        { error: { message: `Discovery candidate '${candidateId}' not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      data: candidate,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}
