import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { getCandidateRepository } from "@/features/discovery/extraction/candidate.repository";
import { IncidentService } from "@/features/incidents/services/incident.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { getServerEnv, getEffectiveCrawlerKey } from "@/lib/config/env";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    // 1. Mandatory Coordinator Authorization
    const coordAuth = verifyCoordinatorAuth(request);
    if (!coordAuth.authorized) {
      return NextResponse.json(
        { error: { message: "Coordinator authorization required to convert discovery candidate into an incident." } },
        { status: 401 }
      );
    }

    const { candidateId } = await params;
    const candidateRepo = getCandidateRepository();
    const candidate = await candidateRepo.getById(candidateId);

    if (!candidate) {
      return NextResponse.json(
        { error: { message: `Discovery candidate '${candidateId}' not found.` } },
        { status: 404 }
      );
    }

    // 2. Idempotency Check
    if (candidate.reviewStatus === "converted_to_incident" && candidate.incidentReference) {
      return NextResponse.json({
        status: "success",
        message: `Candidate already converted to incident '${candidate.incidentReference}'.`,
        data: {
          candidateId: candidate.candidateId,
          public_reference: candidate.incidentReference,
          idempotent: true,
        },
      });
    }

    // 3. Prepare Ingestion Payload for Canonical Incident Service
    const isAnimal = candidate.candidateCategory.includes("animal");
    const now = new Date().toISOString();

    const incidentPayload = {
      schema_version: "1.0.0",
      source_type: "social_media_discovery",
      source_reference: candidate.candidateId,
      source_url: candidate.sourceUrl,
      reported_at: candidate.sourcePublishedAt || candidate.discoveredAt,
      incident_type: candidate.candidateCategory,
      subject_type: isAnimal ? "animal" : "person",
      description: `[Discovered from ${candidate.sourceName}] ${candidate.sourceTitle}. ${candidate.excerpt}`,
      evidence: [
        {
          type: "text",
          url: candidate.sourceUrl,
          timestamp: candidate.discoveredAt,
          metadata: {
            source_id: candidate.sourceId,
            source_name: candidate.sourceName,
            signal_score: candidate.signalScore,
            content_hash: candidate.contentHash,
          },
        },
      ],
      location: {
        latitude: candidate.approximateLocation.latitude,
        longitude: candidate.approximateLocation.longitude,
        address: candidate.extractedLocationText,
        district: candidate.approximateLocation.district,
        confidence: candidate.locationConfidence,
      },
      severity: {
        level: candidate.signalScore >= 80 ? "high" : "medium",
        confidence: candidate.signalScore / 100,
        reasoning: candidate.classificationReasons,
      },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true, // Ethical invariant: all crawler discoveries require coordinator verification
    };

    // 4. Authenticate Crawler Ingestion
    const env = getServerEnv();
    const crawlerKey = getEffectiveCrawlerKey(env);
    const headers = new Headers();
    if (crawlerKey) {
      headers.set("x-crawler-api-key", crawlerKey);
    }

    const incidentService = new IncidentService();
    const ingestResult = await incidentService.ingestIncident(incidentPayload, headers);

    const publicRef = ingestResult.incident.public_reference;

    // 5. Update Candidate Record
    const updatedCandidate = await candidateRepo.updateReview(candidateId, {
      status: "converted_to_incident",
      reviewedBy: coordAuth.coordinatorId || "coordinator_manual",
      notes: `Converted to active incident ${publicRef} with verified human coordinator approval.`,
      incidentReference: publicRef,
    });

    return NextResponse.json({
      status: "success",
      message: `Discovery candidate successfully converted to incident ${publicRef}.`,
      data: {
        candidate: updatedCandidate,
        incident: ingestResult.incident,
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message } },
      { status: 500 }
    );
  }
}

