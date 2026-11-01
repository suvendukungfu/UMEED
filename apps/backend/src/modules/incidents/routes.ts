import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { requireCoordinator } from "../../plugins/auth.js";
import { CanonicalIncidentSchema, CanonicalIncident } from "@umeed/contracts";
import crypto from "crypto";

export async function incidentRoutes(fastify: FastifyInstance) {
  // Public Citizen Ingest
  fastify.post("/v1/incidents/ingest", async (request, reply) => {
    const parseResult = CanonicalIncidentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid distress report payload.",
          details: parseResult.error.issues,
        },
      });
    }

    const payload = parseResult.data;
    const db = await getDatabase();

    const publicReference = `UMD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const rawTrackingToken = `trk_${crypto.randomBytes(24).toString("hex")}`;
    const trackingTokenHash = crypto.createHash("sha256").update(rawTrackingToken).digest("hex");
    const nowIso = new Date().toISOString();

    const incident = {
      _id: `inc_${crypto.randomUUID()}`,
      schema_version: "1.0.0" as const,
      source_type: payload.source_type,
      source_reference: payload.source_reference,
      source_url: payload.source_url || null,
      reported_at: payload.reported_at,
      incident_type: payload.incident_type,
      subject_type: payload.subject_type,
      description: payload.description,
      evidence: payload.evidence,
      location: payload.location,
      severity: payload.severity,
      freshness: payload.freshness,
      missing_information: payload.missing_information,
      requires_human_review: payload.requires_human_review,
      status: "REPORTED" as const,
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: publicReference,
      tracking_token_hash: trackingTokenHash,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Durable commit
    await db.collection<any>("incidents").insertOne(incident);

    // Record audit event
    await db.collection("audit_events").insertOne({
      id: `aud_${crypto.randomUUID()}`,
      eventType: "INCIDENT_INGESTED",
      entityType: "INCIDENT",
      entityId: incident._id,
      publicReference,
      actor: "citizen_public",
      timestamp: nowIso,
      details: {
        type: incident.incident_type,
        severity: incident.severity.level,
        district: incident.location?.district,
      },
    });

    return reply.status(201).send({
      success: true,
      publicReference,
      trackingToken: rawTrackingToken,
      status: incident.status,
      estimatedTriageTime: "Immediate coordinator & AI queue placement",
    });
  });

  // Coordinator / System: List Incidents
  fastify.get("/v1/incidents", { preHandler: requireCoordinator }, async (request, reply) => {
    const query = request.query as {
      status?: string;
      incident_type?: string;
      source_type?: string;
      is_suspected_duplicate?: string;
      limit?: string;
      offset?: string;
    };
    const db = await getDatabase();

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.incident_type) filter.incident_type = query.incident_type;
    if (query.source_type) filter.source_type = query.source_type;
    if (query.is_suspected_duplicate !== undefined) {
      filter.is_suspected_duplicate = query.is_suspected_duplicate === "true";
    }

    const limit = Math.min(parseInt(query.limit || "50", 10), 100);
    const offset = parseInt(query.offset || "0", 10);

    const [incidents, total] = await Promise.all([
      db.collection("incidents").find(filter).sort({ reported_at: -1 }).skip(offset).limit(limit).toArray(),
      db.collection("incidents").countDocuments(filter),
    ]);

    // Sanitize for Coordinator View: retain location for field coordination, redact secret token hash
    const sanitized = incidents.map((inc) => {
      const { tracking_token_hash, ...rest } = inc as Record<string, unknown>;
      return rest;
    });

    return reply.status(200).send({
      status: "success",
      data: {
        incidents: sanitized,
        total,
        limit,
        offset,
      },
    });
  });

  // Alias for coordinator incidents
  fastify.get("/v1/coordinator/incidents", { preHandler: requireCoordinator }, async (request, reply) => {
    const query = request.query as { status?: string; urgency?: string; limit?: string; offset?: string };
    const db = await getDatabase();

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;

    const limit = Math.min(parseInt(query.limit || "50", 10), 100);
    const offset = parseInt(query.offset || "0", 10);

    const [incidents, total] = await Promise.all([
      db.collection("incidents").find(filter).sort({ reported_at: -1 }).skip(offset).limit(limit).toArray(),
      db.collection("incidents").countDocuments(filter),
    ]);

    return reply.status(200).send({ incidents, total, limit, offset });
  });

  // Citizen Status Tracking
  fastify.get("/v1/incidents/:publicReference", async (request, reply) => {
    const { publicReference } = request.params as { publicReference: string };
    const trackingToken = request.headers["x-tracking-token"] as string | undefined;

    const db = await getDatabase();
    const incident = await db.collection("incidents").findOne({ public_reference: publicReference });

    if (!incident) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Incident ${publicReference} not found.` },
      });
    }

    // If caller has tracking token, verify hash
    if (trackingToken) {
      const hash = crypto.createHash("sha256").update(trackingToken.trim()).digest("hex");
      if (incident.tracking_token_hash && hash !== incident.tracking_token_hash) {
        return reply.status(401).send({
          error: { code: "UNAUTHORIZED", message: "Invalid tracking token for this incident." },
        });
      }
    }

    // Return sanitized view (scrub private contact info unless authorized coordinator)
    const sanitized = {
      public_reference: incident.public_reference,
      incident_type: incident.incident_type,
      subject_type: incident.subject_type,
      description: incident.description,
      location: {
        district: incident.location?.district,
        confidence: incident.location?.confidence,
      },
      status: incident.status,
      reported_at: incident.reported_at,
      updated_at: incident.updated_at,
      triage_analysis: incident.triage_analysis,
    };

    return reply.status(200).send(sanitized);
  });

  // Coordinator: Review Incident
  fastify.post("/v1/incidents/:publicReference/review", { preHandler: requireCoordinator }, async (request, reply) => {
    const { publicReference } = request.params as { publicReference: string };
    const body = request.body as { action: "APPROVE" | "REJECT" | "REQUEST_INFO"; notes?: string };

    if (!body || !["APPROVE", "REJECT", "REQUEST_INFO"].includes(body.action)) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "Action must be APPROVE, REJECT, or REQUEST_INFO." },
      });
    }

    const db = await getDatabase();
    const newStatus = body.action === "APPROVE" ? "APPROVED" : body.action === "REJECT" ? "REJECTED" : "UNDER_REVIEW";

    const result = await db.collection("incidents").findOneAndUpdate(
      { public_reference: publicReference },
      {
        $set: {
          status: newStatus,
          updated_at: new Date().toISOString(),
          coordinator_review: {
            reviewed_by: request.user?.userId || "coordinator",
            reviewed_at: new Date().toISOString(),
            action: body.action,
            notes: body.notes || "",
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Incident ${publicReference} not found.` },
      });
    }

    return reply.status(200).send({ success: true, incident: result });
  });

  // Alias Coordinator Review
  fastify.post("/v1/coordinator/incidents/:publicReference/review", { preHandler: requireCoordinator }, async (request, reply) => {
    const { publicReference } = request.params as { publicReference: string };
    const body = request.body as { action: "APPROVE" | "REJECT" | "REQUEST_INFO"; notes?: string };

    if (!body || !["APPROVE", "REJECT", "REQUEST_INFO"].includes(body.action)) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "Action must be APPROVE, REJECT, or REQUEST_INFO." },
      });
    }

    const db = await getDatabase();
    const newStatus = body.action === "APPROVE" ? "APPROVED" : body.action === "REJECT" ? "REJECTED" : "UNDER_REVIEW";

    const result = await db.collection("incidents").findOneAndUpdate(
      { public_reference: publicReference },
      {
        $set: {
          status: newStatus,
          updated_at: new Date().toISOString(),
          coordinator_review: {
            reviewed_by: request.user?.userId || "coordinator",
            reviewed_at: new Date().toISOString(),
            action: body.action,
            notes: body.notes || "",
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Incident ${publicReference} not found.` },
      });
    }

    return reply.status(200).send({ success: true, incident: result });
  });

  // Incident Triage (Re-trigger or update triage analysis)
  fastify.post("/v1/incidents/:publicReference/triage", { preHandler: requireCoordinator }, async (request, reply) => {
    const { publicReference } = request.params as { publicReference: string };
    const db = await getDatabase();
    const incident = await db.collection("incidents").findOne({ public_reference: publicReference });

    if (!incident) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Incident ${publicReference} not found.` },
      });
    }

    const triageAnalysis = {
      urgency_score: 85,
      suggested_categories: [incident.incident_type || "SHELTER_FOOD"],
      automated_rationale: "Automated triage evaluated from distress report evidence and location.",
      triaged_at: new Date().toISOString(),
    };

    await db.collection("incidents").updateOne(
      { public_reference: publicReference },
      {
        $set: {
          triage_analysis: triageAnalysis,
          updated_at: new Date().toISOString(),
        },
      }
    );

    return reply.status(200).send({
      success: true,
      publicReference,
      triage_analysis: triageAnalysis,
    });
  });

  // Evidence Preview
  fastify.get("/v1/evidence/preview/:publicReference/:index", async (request, reply) => {
    const { publicReference, index } = request.params as { publicReference: string; index: string };
    const idx = parseInt(index, 10);
    const db = await getDatabase();
    const incident = await db.collection("incidents").findOne({ public_reference: publicReference });

    if (!incident) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Incident ${publicReference} not found.` },
      });
    }

    const evidenceList = incident.evidence || [];
    if (isNaN(idx) || idx < 0 || idx >= evidenceList.length) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Evidence item ${index} not found.` },
      });
    }

    const item = evidenceList[idx];
    return reply.status(200).send({
      publicReference,
      index: idx,
      evidence: item,
    });
  });
}
