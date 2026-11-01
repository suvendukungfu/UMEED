import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { requireCoordinator } from "../../plugins/auth.js";
import crypto from "crypto";

export async function discoveryRoutes(fastify: FastifyInstance) {
  // List Sources
  fastify.get("/v1/discovery/sources", { preHandler: requireCoordinator }, async (_request, reply) => {
    const db = await getDatabase();
    const sources = await db.collection("discovery_sources").find({}).toArray();
    return reply.status(200).send({ sources, total: sources.length });
  });

  // Register Source
  fastify.post("/v1/discovery/sources", { preHandler: requireCoordinator }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const db = await getDatabase();

    const newSource = {
      id: `src_${crypto.randomUUID()}`,
      ...body,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    await db.collection("discovery_sources").insertOne(newSource);
    return reply.status(201).send(newSource);
  });

  // Approve Source
  fastify.post("/v1/discovery/sources/:sourceId/approve", { preHandler: requireCoordinator }, async (request, reply) => {
    const { sourceId } = request.params as { sourceId: string };
    const db = await getDatabase();
    const result = await db.collection("discovery_sources").findOneAndUpdate(
      { id: sourceId },
      { $set: { status: "ACTIVE", approvedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: `Source ${sourceId} not found.` } });
    }
    return reply.status(200).send({ success: true, source: result });
  });

  // Pause Source
  fastify.post("/v1/discovery/sources/:sourceId/pause", { preHandler: requireCoordinator }, async (request, reply) => {
    const { sourceId } = request.params as { sourceId: string };
    const db = await getDatabase();
    const result = await db.collection("discovery_sources").findOneAndUpdate(
      { id: sourceId },
      { $set: { status: "PAUSED", pausedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: `Source ${sourceId} not found.` } });
    }
    return reply.status(200).send({ success: true, source: result });
  });

  // List Candidates
  fastify.get("/v1/discovery/candidates", async (_request, reply) => {
    const db = await getDatabase();
    const candidates = await db.collection("discovery_candidates").find({}).sort({ detectedAt: -1 }).toArray();
    return reply.status(200).send({ candidates, total: candidates.length });
  });

  // Get Candidate by ID
  fastify.get("/v1/discovery/candidates/:candidateId", async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const db = await getDatabase();
    const candidate = await db.collection("discovery_candidates").findOne({
      $or: [{ id: candidateId }, { _id: candidateId }]
    } as any);
    if (!candidate) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: `Candidate ${candidateId} not found.` } });
    }
    return reply.status(200).send(candidate);
  });

  // Review Candidate
  fastify.post("/v1/discovery/candidates/:candidateId/review", { preHandler: requireCoordinator }, async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const body = request.body as { decision: "APPROVE" | "REJECT" | "DISCARD"; notes?: string };
    const db = await getDatabase();

    const result = await db.collection("discovery_candidates").findOneAndUpdate(
      { $or: [{ id: candidateId }, { _id: candidateId }] } as any,
      {
        $set: {
          reviewDecision: body?.decision || "APPROVE",
          reviewedAt: new Date().toISOString(),
          reviewerNotes: body?.notes || "",
        }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: `Candidate ${candidateId} not found.` } });
    }
    return reply.status(200).send({ success: true, candidate: result });
  });

  // Convert Candidate to Incident
  fastify.post("/v1/discovery/candidates/:candidateId/convert-to-incident", { preHandler: requireCoordinator }, async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const db = await getDatabase();

    const candidate = await db.collection("discovery_candidates").findOne({
      $or: [{ id: candidateId }, { _id: candidateId }]
    } as any);

    if (!candidate) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: `Candidate ${candidateId} not found.` } });
    }

    const publicReference = `UMD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const incident = {
      _id: `inc_${crypto.randomUUID()}`,
      schema_version: "1.0.0",
      source_type: "CRAWLER",
      source_reference: candidate.id || candidateId,
      reported_at: nowIso,
      incident_type: candidate.category || "OTHER",
      subject_type: "INDIVIDUAL",
      description: candidate.title || candidate.snippet || "Discovered from news/social feed",
      location: candidate.location || { district: "Central Delhi", confidence: 0.8 },
      severity: { level: candidate.urgency || "HIGH", confidence: 0.85 },
      freshness: { is_stale: false, confidence: 0.9 },
      missing_information: [],
      requires_human_review: false,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: publicReference,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await db.collection("incidents").insertOne(incident as any);
    await db.collection("discovery_candidates").updateOne(
      { $or: [{ id: candidateId }, { _id: candidateId }] } as any,
      { $set: { convertedIncidentReference: publicReference, convertedAt: nowIso } }
    );

    return reply.status(200).send({
      success: true,
      incidentReference: publicReference,
      incident,
    });
  });

  // Trigger Crawl Run
  fastify.post("/v1/discovery/crawl/run", { preHandler: requireCoordinator }, async (request, reply) => {
    const db = await getDatabase();
    const runId = `run_${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    const summary = {
      runId,
      startedAt: nowIso,
      completedAt: nowIso,
      candidatesFound: 0,
      candidatesIngested: 0,
      status: "COMPLETED",
    };

    await db.collection("discovery_runs").insertOne(summary);
    return reply.status(200).send(summary);
  });

  // List Crawl Runs
  fastify.get("/v1/discovery/crawl/runs", { preHandler: requireCoordinator }, async (_request, reply) => {
    const db = await getDatabase();
    const runs = await db.collection("discovery_runs").find({}).sort({ startedAt: -1 }).toArray();
    return reply.status(200).send({ runs, total: runs.length });
  });

  // Discovery Map Points
  fastify.get("/v1/discovery/map", async (_request, reply) => {
    const db = await getDatabase();
    const candidates = await db.collection("discovery_candidates").find({ "location.coordinates": { $exists: true } }).toArray();

    const geoJson = {
      type: "FeatureCollection",
      features: candidates.map(c => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [c.location?.coordinates?.lng, c.location?.coordinates?.lat],
        },
        properties: {
          id: c.id,
          category: c.category,
          urgency: c.urgency,
          district: c.location?.district,
          detectedAt: c.detectedAt,
        },
      })),
    };

    return reply.status(200).send(geoJson);
  });
}
