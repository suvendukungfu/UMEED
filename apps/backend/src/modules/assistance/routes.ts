import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { requireAuth, requireCoordinator } from "../../plugins/auth.js";
import crypto from "crypto";

export async function assistanceRoutes(fastify: FastifyInstance) {
  // Operational Metrics
  fastify.get("/v1/assistance/metrics", { preHandler: requireCoordinator }, async (_request, reply) => {
    const db = await getDatabase();
    const [totalCases, resolvedCases, totalIncidents, totalNGOs] = await Promise.all([
      db.collection("cases").countDocuments(),
      db.collection("cases").countDocuments({ status: "RESOLVED" }),
      db.collection("incidents").countDocuments(),
      db.collection("ngos").countDocuments(),
    ]);

    return reply.status(200).send({
      total_cases: totalCases,
      resolved_cases: resolvedCases,
      active_cases: totalCases - resolvedCases,
      total_incidents: totalIncidents,
      total_ngos: totalNGOs,
      timestamp: new Date().toISOString(),
    });
  });

  // Watchdog Scan (SLA & Escalation checks)
  fastify.post("/v1/assistance/watchdog/scan", { preHandler: requireCoordinator }, async (_request, reply) => {
    const db = await getDatabase();
    const overdueThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const overdueCases = await db.collection("cases").find({
      status: "OPEN",
      createdAt: { $lt: overdueThreshold },
    }).toArray();

    return reply.status(200).send({
      scanned_at: new Date().toISOString(),
      overdue_count: overdueCases.length,
      overdue_case_ids: overdueCases.map(c => c.caseReference || c.id || c.case_id),
    });
  });

  // Match requirement
  fastify.post("/v1/assistance/requirements/:requirementId/match", { preHandler: requireCoordinator }, async (request, reply) => {
    const { requirementId } = request.params as { requirementId: string };
    const db = await getDatabase();
    const matches = await db.collection("ngos").find({}).limit(5).toArray();

    return reply.status(200).send({
      success: true,
      requirementId,
      matches: matches.map(m => ({
        ngoId: (m as any).ngo_id || (m as any).id,
        name: m.name,
        suitabilityScore: 0.92,
      })),
    });
  });

  // First-wave outreach
  fastify.post("/v1/assistance/requirements/:requirementId/outreach/first-wave", { preHandler: requireCoordinator }, async (request, reply) => {
    const { requirementId } = request.params as { requirementId: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const attemptId = `att_${crypto.randomUUID()}`;

    const attempt = {
      id: attemptId,
      requirementId,
      wave: 1,
      dispatchedCount: 3,
      status: "DISPATCHED",
      dispatchedAt: nowIso,
    };
    await db.collection("outreach_attempts").insertOne(attempt);

    return reply.status(200).send({ success: true, attempt });
  });

  // Escalate requirement
  fastify.post("/v1/assistance/requirements/:requirementId/escalate", { preHandler: requireCoordinator }, async (request, reply) => {
    const { requirementId } = request.params as { requirementId: string };
    const body = request.body as { reason?: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    await db.collection("requirements").updateOne(
      { id: requirementId },
      { $set: { escalated: true, escalatedAt: nowIso, escalationReason: body?.reason || "Manual escalation" } },
      { upsert: true }
    );

    return reply.status(200).send({ success: true, requirementId, status: "ESCALATED" });
  });

  // Resolve requirement
  fastify.post("/v1/assistance/requirements/:requirementId/resolve", { preHandler: requireCoordinator }, async (request, reply) => {
    const { requirementId } = request.params as { requirementId: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    await db.collection("requirements").updateOne(
      { id: requirementId },
      { $set: { status: "RESOLVED", resolvedAt: nowIso } },
      { upsert: true }
    );

    return reply.status(200).send({ success: true, requirementId, status: "RESOLVED" });
  });

  // Outreach Acknowledge
  fastify.post("/v1/assistance/outreach/:attemptId/acknowledge", { preHandler: requireAuth }, async (request, reply) => {
    const { attemptId } = request.params as { attemptId: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    await db.collection("outreach_attempts").updateOne(
      { id: attemptId },
      { $set: { acknowledgedAt: nowIso, acknowledgedBy: request.user?.userId || "responder" } },
      { upsert: true }
    );

    return reply.status(200).send({ success: true, attemptId, status: "ACKNOWLEDGED" });
  });

  // Outreach Accept
  fastify.post("/v1/assistance/outreach/:attemptId/accept", { preHandler: requireAuth }, async (request, reply) => {
    const { attemptId } = request.params as { attemptId: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    await db.collection("outreach_attempts").updateOne(
      { id: attemptId },
      { $set: { acceptedAt: nowIso, acceptedBy: request.user?.userId || "responder", status: "ACCEPTED" } },
      { upsert: true }
    );

    return reply.status(200).send({ success: true, attemptId, status: "ACCEPTED" });
  });

  // Outreach Reject
  fastify.post("/v1/assistance/outreach/:attemptId/reject", { preHandler: requireAuth }, async (request, reply) => {
    const { attemptId } = request.params as { attemptId: string };
    const body = request.body as { reason?: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    await db.collection("outreach_attempts").updateOne(
      { id: attemptId },
      { $set: { declinedAt: nowIso, declinedBy: request.user?.userId || "responder", status: "DECLINED", reason: body?.reason } },
      { upsert: true }
    );

    return reply.status(200).send({ success: true, attemptId, status: "DECLINED" });
  });

  // Start work on assignment
  fastify.post("/v1/assistance/assignments/:assignmentId/start-work", { preHandler: requireAuth }, async (request, reply) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("assignments").findOneAndUpdate(
      { $or: [{ id: assignmentId }, { _id: assignmentId }] } as any,
      { $set: { status: "IN_PROGRESS", startedAt: nowIso, updatedAt: nowIso } },
      { returnDocument: "after" }
    );

    return reply.status(200).send({ success: true, assignment: result });
  });

  // Progress on assignment
  fastify.post("/v1/assistance/assignments/:assignmentId/progress", { preHandler: requireAuth }, async (request, reply) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const body = request.body as { progressPercentage: number; notes?: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("assignments").findOneAndUpdate(
      { $or: [{ id: assignmentId }, { _id: assignmentId }] } as any,
      {
        $set: {
          progressPercentage: body?.progressPercentage || 0,
          progressNotes: body?.notes || "",
          updatedAt: nowIso,
        }
      },
      { returnDocument: "after" }
    );

    return reply.status(200).send({ success: true, assignment: result });
  });

  // Close assistance case
  fastify.post("/v1/assistance/cases/:caseId/close", { preHandler: requireCoordinator }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("cases").findOneAndUpdate(
      { $or: [{ public_case_reference: caseId }, { case_id: caseId }, { id: caseId }] },
      { $set: { case_status: "CLOSED", closed_at: nowIso, updated_at: nowIso } },
      { returnDocument: "after" }
    );

    return reply.status(200).send({ success: true, case: result });
  });

  // Supplemental assistance requirement
  fastify.post("/v1/assistance/cases/:caseId/supplemental", { preHandler: requireAuth }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = request.body as { requirement: string; description?: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("cases").findOneAndUpdate(
      { $or: [{ public_case_reference: caseId }, { case_id: caseId }, { id: caseId }] },
      {
        $push: { assistance_requirements: body?.requirement || "Supplemental Aid" as any },
        $set: { updated_at: nowIso }
      },
      { returnDocument: "after" }
    );

    return reply.status(200).send({ success: true, case: result });
  });

  // Case events timeline
  fastify.get("/v1/assistance/cases/:caseId/events", { preHandler: requireAuth }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = await getDatabase();

    const events = await db.collection("audit_events").find({
      $or: [{ entityId: caseId }, { caseReference: caseId }, { publicReference: caseId }]
    }).sort({ timestamp: -1 }).toArray();

    return reply.status(200).send({ success: true, events, total: events.length });
  });

  // Nearby providers
  fastify.get("/v1/assistance/providers/nearby", async (request, reply) => {
    const db = await getDatabase();
    const query = request.query as { lat?: string; lng?: string; radiusKm?: string };

    const ngos = await db.collection("ngos").find({}).limit(10).toArray();
    return reply.status(200).send({
      providers: ngos.map(n => ({
        id: (n as any).ngo_id || (n as any).id,
        name: n.name,
        contact: (n as any).contact_phone || (n as any).phone,
      })),
      total: ngos.length
    });
  });

  // Overdue queue
  fastify.get("/v1/assistance/queue/overdue", { preHandler: requireCoordinator }, async (_request, reply) => {
    const db = await getDatabase();
    const overdueCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const cases = await db.collection("cases").find({
      case_status: { $in: ["APPROVED", "OPEN", "IN_PROGRESS"] },
      created_at: { $lt: overdueCutoff }
    }).toArray();

    return reply.status(200).send({ cases, total: cases.length });
  });

  // Human review queue
  fastify.get("/v1/assistance/queue/human-review", { preHandler: requireCoordinator }, async (_request, reply) => {
    const db = await getDatabase();
    const incidents = await db.collection("incidents").find({
      requires_human_review: true,
      status: "REPORTED"
    }).toArray();

    return reply.status(200).send({ incidents, total: incidents.length });
  });
}
