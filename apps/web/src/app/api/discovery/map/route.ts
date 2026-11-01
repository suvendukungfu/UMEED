import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { getCandidateRepository } from "@/features/discovery/extraction/candidate.repository";

export async function GET(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const repo = getCandidateRepository();
    const candidates = await repo.listCandidates({
      category: category as any || undefined,
      status: status as any || undefined,
    });

    const features = candidates
      .filter(
        (c) =>
          c.approximateLocation.latitude !== null &&
          c.approximateLocation.longitude !== null
      )
      .map((c) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [
            c.approximateLocation.longitude as number,
            c.approximateLocation.latitude as number,
          ],
        },
        properties: {
          candidateId: c.candidateId,
          sourceName: c.sourceName,
          title: c.sourceTitle,
          category: c.candidateCategory,
          district: c.approximateLocation.district,
          signalScore: c.signalScore,
          signalRelevance: c.signalRelevance,
          reviewStatus: c.reviewStatus,
          isSynthetic: c.isSynthetic,
          discoveredAt: c.discoveredAt,
        },
      }));

    const geoJson = {
      type: "FeatureCollection",
      features,
    };

    return NextResponse.json({
      status: "success",
      count: features.length,
      data: geoJson,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}

