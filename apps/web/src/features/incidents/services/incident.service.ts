import crypto from "crypto";
import {
  CanonicalIncident,
  CanonicalIncidentSchema,
} from "@umeed/contracts";
import {
  IncidentDocument,
  IngestionResult,
  IncidentFilterOptions,
  DuplicateCandidate,
  IncidentTriageAnalysis,
  ReviewActionDocument,
  ReviewDecision,
} from "../types";
import { IIncidentRepository, getIncidentRepository } from "../repositories";
import {
  generatePublicReference,
  generateTrackingToken,
  hashTrackingToken,
  verifyTrackingToken,
} from "./tracking.service";
import {
  evaluateDuplicateCandidate,
} from "./duplicate.service";
import { validateCrawlerAuthorization } from "./auth.service";
import { GeminiTriageService, TriageOptions, isGeminiConfigured } from "@/lib/ai/gemini";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

/**
 * Principal Incident Ingestion & Coordination Service
 *
 * Enforces Architectural Invariants:
 * 1. INCIDENT IS NOT A CASE: An ingested report is stored strictly as an Incident in "REPORTED" state.
 * 2. DUPLICATE DETECTION IS NOT DELETION: Suspected duplicates are flagged; never deleted or auto-merged.
 * 3. TRACKING CREDENTIAL SECURITY: Plaintext token generated with >128-bit entropy, returned only once,
 *    stored exclusively as SHA-256 hash. Database ObjectIds are never exposed as credentials.
 * 4. SECURE EVIDENCE PROVENANCE: Original submitted descriptions and media references are preserved intact.
 */
export class IncidentService {
  private repo: IIncidentRepository;

  constructor(repo?: IIncidentRepository) {
    this.repo = repo || getIncidentRepository();
  }

  /**
   * Core Incident Ingestion Workflow.
   */
  async ingestIncident(
    rawPayload: unknown,
    headers?: Headers | Record<string, string | string[] | undefined>
  ): Promise<IngestionResult> {
    // 1. Validate Schema against Canonical v1.0.0
    const parseResult = CanonicalIncidentSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      const summaryMsg = details.map((d) => `${d.field ? d.field + ": " : ""}${d.message}`).join("; ");
      throw ApiError.badRequest(`Invalid canonical incident schema payload: ${summaryMsg}`, details);
    }

    const payload: CanonicalIncident = parseResult.data;

    // 2. Crawler Authentication & Guardrails
    if (payload.source_type === "social_media_discovery") {
      if (!headers) {
        throw ApiError.unauthorized("Authentication required for crawler ingestion");
      }
      const auth = validateCrawlerAuthorization(headers);
      if (!auth.authorized) {
        throw ApiError.unauthorized(auth.reason || "Unauthorized crawler request");
      }
      // Mandatory ethical non-negotiable: crawler discoveries always require human review
      payload.requires_human_review = true;
    }

    // 3. Check Idempotency via Unique Compound Index key { source_type, source_reference }
    const existing = await this.repo.findBySource(
      payload.source_type,
      payload.source_reference
    );

    if (existing) {
      logger.info("Idempotent replay detected for incident submission", "INGESTION", {
        source_type: payload.source_type,
        source_reference: payload.source_reference,
        public_reference: existing.public_reference,
      });

      return {
        incident: existing,
        public_reference: existing.public_reference,
        // Notice: Plaintext tracking token is NOT returned on replay for security
        is_duplicate: true,
        is_suspected_duplicate: existing.is_suspected_duplicate,
        duplicate_candidates: [],
        requires_human_review: existing.requires_human_review,
      };
    }

    // 4. Generate Public Reference & Confidential Tracking Token
    const publicReference = generatePublicReference();
    const trackingToken = generateTrackingToken();
    const trackingTokenHash = hashTrackingToken(trackingToken);

    // 5. Evaluate Potential Duplicate Candidates (Non-destructive)
    const duplicateCandidates: DuplicateCandidate[] = [];
    let isSuspectedDuplicate = false;

    if (
      payload.location.latitude !== null &&
      payload.location.longitude !== null
    ) {
      const nearbyDocs = await this.repo.findNearbyCandidates(
        {
          latitude: payload.location.latitude,
          longitude: payload.location.longitude,
        },
        500, // 500 meters
        24, // 24 hours
        payload.subject_type
      );

      for (const nearby of nearbyDocs) {
        const candidateMatch = evaluateDuplicateCandidate(
          {
            subject_type: payload.subject_type,
            incident_type: payload.incident_type,
            reported_at: payload.reported_at,
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
          },
          nearby
        );

        if (candidateMatch) {
          duplicateCandidates.push(candidateMatch);
        }
      }

      if (duplicateCandidates.length > 0) {
        isSuspectedDuplicate = true;
      }
    }

    // 6. Construct Operational Incident Document
    const nowIso = new Date().toISOString();
    const incidentDoc: IncidentDocument = {
      _id: crypto.randomUUID(),
      schema_version: "1.0.0",
      source_type: payload.source_type,
      source_reference: payload.source_reference,
      source_url: payload.source_url,
      reported_at: payload.reported_at,
      incident_type: payload.incident_type,
      subject_type: payload.subject_type,
      description: payload.description,
      evidence: payload.evidence,
      location: {
        ...payload.location,
        geo:
          payload.location.latitude !== null && payload.location.longitude !== null
            ? {
                type: "Point",
                coordinates: [payload.location.longitude, payload.location.latitude],
              }
            : null,
      },
      severity: payload.severity,
      freshness: payload.freshness,
      missing_information: payload.missing_information,
      requires_human_review: payload.requires_human_review,
      status: "REPORTED", // Invariant: Incident status is initially REPORTED
      is_suspected_duplicate: isSuspectedDuplicate,
      suspected_duplicate_ids: duplicateCandidates.map((c) => c.public_reference),
      public_reference: publicReference,
      tracking_token_hash: trackingTokenHash,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 7. Optional Automated Multimodal AI Triage (Fail-soft, non-blocking)
    if (isGeminiConfigured()) {
      try {
        const triageService = new GeminiTriageService();
        const analysis = await triageService.triageIncident(incidentDoc);
        incidentDoc.triage_analysis = analysis;
      } catch (err) {
        logger.warn("Automated triage during ingestion failed non-fatally", "INGESTION", {
          public_reference: publicReference,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 8. Atomic Persistence with Race-Condition Fallback
    try {
      const saved = await this.repo.create(incidentDoc);

      logger.info("New incident ingested successfully", "INGESTION", {
        public_reference: saved.public_reference,
        source_type: saved.source_type,
        status: saved.status,
        is_suspected_duplicate: saved.is_suspected_duplicate,
      });

      return {
        incident: saved,
        public_reference: saved.public_reference,
        tracking_token: trackingToken, // Plaintext returned ONLY ONCE at creation
        is_duplicate: false,
        is_suspected_duplicate: saved.is_suspected_duplicate,
        duplicate_candidates: duplicateCandidates,
        requires_human_review: saved.requires_human_review,
      };
    } catch (err) {
      // Handle concurrent race condition (E11000 duplicate key error)
      if ((err as { code?: number }).code === 11000) {
        logger.warn(
          "Concurrent duplicate detected during insertion; resolving idempotently",
          "INGESTION"
        );
        const concurrentExisting = await this.repo.findBySource(
          payload.source_type,
          payload.source_reference
        );
        if (concurrentExisting) {
          return {
            incident: concurrentExisting,
            public_reference: concurrentExisting.public_reference,
            is_duplicate: true,
            is_suspected_duplicate: concurrentExisting.is_suspected_duplicate,
            duplicate_candidates: [],
            requires_human_review: concurrentExisting.requires_human_review,
          };
        }
      }
      throw err;
    }
  }

  /**
   * Retrieve incident by public reference with private fields redacted.
   */
  async getByPublicReference(publicReference: string): Promise<IncidentDocument | null> {
    return this.repo.findByPublicReference(publicReference);
  }

  /**
   * Authenticate a citizen requester using their public reference and secret tracking token.
   */
  async authenticateTrackingAccess(
    publicReference: string,
    trackingToken: string
  ): Promise<IncidentDocument | null> {
    const incident = await this.repo.findByPublicReference(publicReference);
    if (!incident || !incident.tracking_token_hash) {
      return null;
    }

    const isValid = verifyTrackingToken(trackingToken, incident.tracking_token_hash);
    return isValid ? incident : null;
  }

  /**
   * List incidents with filters and pagination.
   */
  async listIncidents(
    filter?: IncidentFilterOptions
  ): Promise<{ incidents: IncidentDocument[]; total: number }> {
    return this.repo.list(filter);
  }

  /**
   * Run or re-run multimodal AI triage for an incident and persist the result.
   */
  async triageIncident(
    publicReference: string,
    options?: TriageOptions
  ): Promise<IncidentTriageAnalysis> {
    const incident = await this.repo.findByPublicReference(publicReference);
    if (!incident) {
      throw ApiError.notFound(`Incident ${publicReference} not found`);
    }

    const triageService = new GeminiTriageService(options?.client);
    const analysis = await triageService.triageIncident(incident, options);

    await this.repo.update(publicReference, {
      triage_analysis: analysis,
      updated_at: new Date().toISOString(),
    });

    return analysis;
  }

  /**
   * Record a human review decision and audit trail for an incident.
   */
  async recordReviewDecision(
    publicReference: string,
    reviewerId: string,
    action: {
      decision: ReviewDecision;
      reason: string;
      override_category?: import("@umeed/contracts").IncidentType;
      override_urgency?: import("@umeed/contracts").TriageUrgencyLevel;
    }
  ): Promise<IncidentDocument> {
    const incident = await this.repo.findByPublicReference(publicReference);
    if (!incident) {
      throw ApiError.notFound(`Incident ${publicReference} not found`);
    }

    const nowIso = new Date().toISOString();
    const reviewAction: ReviewActionDocument = {
      _id: crypto.randomUUID(),
      incident_id: incident._id,
      reviewer_id: reviewerId,
      decision: action.decision,
      reason: action.reason,
      override_category: action.override_category,
      override_urgency: action.override_urgency,
      timestamp: nowIso,
    };

    await this.repo.recordReviewAction(reviewAction);

    const updates: Partial<IncidentDocument> = {
      updated_at: nowIso,
    };

    if (incident.triage_analysis) {
      const triageReviewStatus =
        action.decision === "CONFIRM"
          ? "CONFIRMED"
          : action.decision === "OVERRIDE"
          ? "OVERRIDDEN"
          : action.decision === "REJECT"
          ? "REJECTED"
          : action.decision === "ESCALATE"
          ? "ESCALATED"
          : "PENDING";

      updates.triage_analysis = {
        ...incident.triage_analysis,
        human_review_status: triageReviewStatus,
        human_reviewer_id: reviewerId,
        human_reviewer_notes: action.reason,
        human_reviewed_at: nowIso,
      };
    }

    if (action.decision === "CONFIRM" || action.decision === "OVERRIDE" || action.decision === "APPROVE") {
      updates.status = "APPROVED";
    } else if (action.decision === "REJECT") {
      updates.status = "REJECTED";
    } else if (action.decision === "ESCALATE" || action.decision === "REQUEST_INFO") {
      updates.status = "UNDER_REVIEW";
    }

    if (action.override_category) {
      updates.incident_type = action.override_category;
    }

    const updatedDoc = await this.repo.update(publicReference, updates);
    if (!updatedDoc) {
      throw ApiError.internal("Failed to update incident with review decision");
    }

    return updatedDoc;
  }
}
